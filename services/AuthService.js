/**
 * VIBEHUB AUTH SERVICE
 * Simplified Supabase-only Authentication
 */

function calculateUserBadges(userData) {
    if (!userData) return [];
    const badges = [];
    if (userData.verified) badges.push('Verified');
    
    const statsStr = userData.reaction_stats || '{"given": {}, "received": {}}';
    let stats = { given: {}, received: {} };
    try { 
        const parsed = typeof statsStr === 'string' ? JSON.parse(statsStr) : statsStr; 
        if (parsed) stats = parsed;
    } catch(e) { console.warn('Badge calculation stats parse failed', e); }
    
    let totalReceived = Object.values(stats?.received || {}).reduce((sum, val) => sum + (val || 0), 0);
    const vibeLikesCount = userData?.vibe_likes?.length || (userData?.vibe_likes_count || 0);
    const totalVibeScore = totalReceived + vibeLikesCount;

    if (totalVibeScore >= 1000) badges.push('Vibe Legend');
    else if (totalVibeScore >= 500) badges.push('Vibe Master');
    else if (vibeLikesCount >= 50) badges.push('Viber');
    
    if (userData.role === 'admin' || userData.is_admin) badges.push('Admin');
    
    return badges;
}

export class AuthService {
    constructor() {
        const savedUser = localStorage.getItem('vibehub_user') || sessionStorage.getItem('vibehub_user');
        this.user = savedUser ? JSON.parse(savedUser) : null;
        this.rememberMe = localStorage.getItem('vibehub_remember') === 'true';
        this.initialized = false;
    }

    async waitForSupabaseClient(timeoutMs = 5000) {
        if (window.supabaseClient) return true;
        let waited = 0;
        while (!window.supabaseClient && waited < timeoutMs) {
            // If window.supabase exists but client doesn't, try to initialize it
            if (window.supabase && !window.supabaseClient) {
                const supabaseUrl = window.VIBEHUB_SUPABASE_URL;
                const supabaseKey = window.VIBEHUB_SUPABASE_ANON_KEY;
                if (supabaseUrl && supabaseKey) {
                    window.supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
                    console.log('✅ Supabase client initialized via waiter');
                    return true;
                }
            }
            await new Promise(r => setTimeout(r, 100));
            waited += 100;
        }
        return !!window.supabaseClient;
    }

    async initAuth() {
        if (this.initialized) return;
        
        console.log('🔄 Initializing Auth Service...');
        const ready = await this.waitForSupabaseClient();
        
        if (!ready) {
            console.error('❌ Supabase initialization timed out');
            // We still proceed to allow local sessions, but most features will fail
        }

        // Check Supabase session
        if (window.supabaseClient) {
            const { data: { session } } = await window.supabaseClient.auth.getSession();
            if (session) {
                await this.syncUserSession(session.user);
            } else if (!this.user || !this.user.isSuperAdmin) {
                // If no session and not a manually entered admin session, clear user
                this.user = null;
                localStorage.removeItem('vibehub_user');
            }
            
            // Listen for auth changes
            window.supabaseClient.auth.onAuthStateChange(async (event, session) => {
                if (event === 'SIGNED_IN' && session) {
                    await this.syncUserSession(session.user);
                } else if (event === 'SIGNED_OUT') {
                    this.clearSession();
                }
            });
        }
        
        this.initialized = true;
        console.log('✅ Auth Service Initialized');
    }

    checkSession() {
        return this.user;
    }

    async syncUserSession(supabaseUser) {
        if (!supabaseUser) return null;
        
        try {
            const email = supabaseUser.email;
            let userData = null;

            if (window.supabaseClient) {
                const { data: existingUser } = await window.supabaseClient
                    .from('users')
                    .select('*')
                    .eq('email', email)
                    .single();

                if (existingUser) {
                    // Update user record if needed
                    const { data } = await window.supabaseClient
                        .from('users')
                        .update({ updated_at: new Date().toISOString() })
                        .eq('id', existingUser.id)
                        .select()
                        .single();
                    userData = data || existingUser;
                } else {
                    // Create new user record in 'users' table if it doesn't exist
                    const newUserPayload = {
                        id: supabaseUser.id, // Use Supabase Auth ID
                        username: supabaseUser.user_metadata?.username || email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '_'),
                        email: email,
                        name: supabaseUser.user_metadata?.full_name || email.split('@')[0],
                        avatar_url: supabaseUser.user_metadata?.avatar_url || `https://i.pravatar.cc/150?u=${supabaseUser.id}`,
                        created_at: new Date().toISOString(),
                        bio: 'New to VibeHub!',
                        vibe_score: 0,
                        role: 'user'
                    };
                    
                    const { data, error } = await window.supabaseClient
                        .from('users')
                        .insert([newUserPayload])
                        .select()
                        .single();
                    if (!error) userData = data;
                }
            }

            // Sync with local state
            const finalAvatarUrl = userData?.avatar_url || supabaseUser.user_metadata?.avatar_url || `https://i.pravatar.cc/150?u=${supabaseUser.id}`;
            // Get followers and following counts from the friends table
            let followersCount = 0;
            let followingCount = 0;
            if (window.supabaseClient) {
                try {
                    const { count: followersCountResult, error: followersError } = await window.supabaseClient
                        .from('friends')
                        .select('*', { count: 'exact', head: true })
                        .eq('friend_id', userData?.id || supabaseUser.id);
                    if (!followersError) followersCount = followersCountResult || 0;
                    const { count: followingCountResult, error: followingError } = await window.supabaseClient
                        .from('friends')
                        .select('*', { count: 'exact', head: true })
                        .eq('user_id', userData?.id || supabaseUser.id);
                    if (!followingError) followingCount = followingCountResult || 0;
                } catch (e) {
                    console.warn('Error fetching friends counts:', e);
                }
            }
            const finalUser = {
                id: userData?.id || supabaseUser.id,
                username: userData?.username || supabaseUser.user_metadata?.username || email.split('@')[0],
                displayName: userData?.name || supabaseUser.user_metadata?.full_name || email.split('@')[0],
                email: email,
                avatar: finalAvatarUrl,
                profilePhoto: finalAvatarUrl,
                bannerImage: userData?.banner_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200',
                bio: userData?.bio || 'New to VibeHub!',
                followersCount: followersCount,
                followingCount: followingCount,
                postCount: 0, 
                reactionScore: userData?.vibe_score || 0,
                badgeList: userData ? calculateUserBadges(userData) : [],
                isSuperAdmin: userData?.role === 'admin',
                songLink: userData?.song_link || null,
                createdAt: userData?.created_at || new Date().toISOString()
            };

            this.user = finalUser;
            this.persistSession(finalUser);
            
            window.dispatchEvent(new CustomEvent('user-logged-in', { detail: finalUser }));
            return finalUser;
        } catch (error) {
            console.error('Error syncing user session:', error);
            return null;
        }
    }

    persistSession(user) {
        const storage = this.rememberMe ? localStorage : sessionStorage;
        storage.setItem('vibehub_user', JSON.stringify(user));
        if (this.rememberMe) {
            localStorage.setItem('vibehub_remember', 'true');
        }
    }

    clearSession() {
        this.user = null;
        localStorage.removeItem('vibehub_user');
        sessionStorage.removeItem('vibehub_user');
        window.dispatchEvent(new CustomEvent('user-logged-out'));
    }

    async customSignIn(email, password, rememberMe = true) {
        this.rememberMe = rememberMe;
        const ready = await this.waitForSupabaseClient();
        if (!ready) return { error: 'Supabase not initialized' };
        
        try {
            const { data, error } = await window.supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });
            
            if (error) return { error: error.message };
            
            const user = await this.syncUserSession(data.user);
            return { success: true, user: user };
        } catch (e) {
            return { error: 'Authentication failed' };
        }
    }

    async customSignUp(email, password, name, rememberMe = true) {
        this.rememberMe = rememberMe;
        const ready = await this.waitForSupabaseClient();
        if (!ready) return { error: 'Supabase not initialized' };
        
        try {
            const { data, error } = await window.supabaseClient.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: { 
                        full_name: name, 
                        username: email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '_') 
                    }
                }
            });

            if (error) {
                if (error.message.includes('already registered')) {
                    return { error: 'This email is already registered. Try signing in!' };
                }
                return { error: error.message };
            }
            
            // If email confirmation is disabled in Supabase, the API immediately returns a session!
            if (data.session) {
                const user = await this.syncUserSession(data.user);
                return { success: true, user: user };
            }
            
            // Otherwise, we get a user but no session. We attempt an explicit sign in just in case.
            if (data.user) {
                const loginAttempt = await window.supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password
                });
                
                if (loginAttempt.error) {
                    if (loginAttempt.error.message.includes('Email not confirmed')) {
                        return { success: true, message: 'Signup successful! Please confirm your email address to sign in.' };
                    }
                    // If login completely failed right after signing up (very rare, usually due to security bans), return error
                    console.error('Post-signup login blocked:', loginAttempt.error.message);
                    return { error: loginAttempt.error.message };
                }
                
                // If login works, proceed with the session sync
                const user = await this.syncUserSession(loginAttempt.data.user);
                return { success: true, user: user };
            }
            
            // If we somehow reach here but there's no data.user, it's a fatal response
            return { error: 'Signup failed due to unknown system response.' };
        } catch (e) {
            console.error('Signup exception:', e);
            return { error: `Signup exception: ${e.message}` };
        }
    }

    async login(email, password, isAdmin = false, rememberMe = true) {
        this.rememberMe = rememberMe;
        const validAdminUser = window.VIBEHUB_ADMIN_USER || 'KingKool23';
        const adminPassword = window.VIBEHUB_ADMIN_PASS || 'citawoo789';
        const fallbackEmail = window.VIBEHUB_FALLBACK_ADMIN_USER || 'yamasseetechnology@gmail.com';
        const fallbackPass = window.VIBEHUB_FALLBACK_ADMIN_PASS || 'citawoo789';
        
        if ((email === validAdminUser && password === adminPassword) || (email === fallbackEmail && password === fallbackPass)) {
            // CRITICAL FIX: Ensure admin account is properly unified
            
            // Step 1: Authenticate with Supabase using fallback email
            let authData = null;
            if (window.supabaseClient) {
                try {
                    const result = await window.supabaseClient.auth.signInWithPassword({
                        email: fallbackEmail,
                        password: fallbackPass
                    });
                    if (result.error) {
                        console.warn('Admin Supabase auth failed, falling back to local session:', result.error.message);
                    } else {
                        console.log('✅ Admin Supabase auth session established');
                        authData = result.data;
                    }
                } catch(e) {
                    console.warn('Admin Supabase auth exception:', e);
                }
            }

            // Step 2: Find or create admin user record with consistent ID
            let supabaseUser = null;
            if (window.supabaseClient && authData?.user) {
                try {
                    // First try to find existing admin record by username
                    const { data: existingUser } = await window.supabaseClient
                        .from('users').select('*')
                        .eq('username', validAdminUser)
                        .limit(1).single();
                    
                    if (existingUser) {
                        // Update existing user to match auth ID if different
                        if (existingUser.id !== authData.user.id) {
                            console.log('🔄 Updating admin user ID to match auth session');
                            await window.supabaseClient
                                .from('users')
                                .update({ id: authData.user.id })
                                .eq('id', existingUser.id);
                            
                            // Re-fetch after update
                            const { data: updatedUser } = await window.supabaseClient
                                .from('users').select('*')
                                .eq('id', authData.user.id)
                                .limit(1).single();
                            supabaseUser = updatedUser;
                        } else {
                            supabaseUser = existingUser;
                        }
                    } else {
                        // Create admin user record with auth ID
                        console.log('🆕 Creating admin user record');
                        const adminUserData = {
                            id: authData.user.id,
                            username: validAdminUser,
                            name: 'King Kool',
                            email: fallbackEmail,
                            avatar_url: 'https://i.ibb.co/6P01wJvq/vibehubadmin.jpg',
                            banner_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200',
                            bio: 'Platform Administrator',
                            role: 'admin',
                            created_at: new Date().toISOString()
                        };
                        
                        const { data: createdUser } = await window.supabaseClient
                            .from('users')
                            .insert([adminUserData])
                            .select()
                            .single();
                        supabaseUser = createdUser;
                    }
                } catch(e) {
                    console.warn('Admin user setup error:', e);
                }
            }

            // Step 3: Create unified admin session
            const finalAdminAvatar = supabaseUser?.avatar_url || 'https://i.ibb.co/6P01wJvq/vibehubadmin.jpg';
            const user = {
                id: supabaseUser?.id || authData?.user?.id || `admin_${Date.now()}`,
                username: supabaseUser?.username || validAdminUser,
                displayName: supabaseUser?.name || 'King Kool',
                email: fallbackEmail,
                avatar: finalAdminAvatar,
                profilePhoto: finalAdminAvatar,
                bannerImage: supabaseUser?.banner_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200',
                bio: supabaseUser?.bio || 'Platform Administrator',
                badgeList: ['Admin'],
                isSuperAdmin: true,
                followersCount: supabaseUser?.followers?.length || 0,
                followingCount: supabaseUser?.following?.length || 0,
                songLink: supabaseUser?.song_link || null,
                createdAt: supabaseUser?.created_at || new Date().toISOString()
            };
            
            // CRITICAL FIX: Synchronize existing admin posts
            if (window.supabaseClient && supabaseUser?.id) {
                this.syncAdminPosts(supabaseUser.id, validAdminUser);
            }
            
            this.user = user;
            this.persistSession(user);
            window.dispatchEvent(new CustomEvent('user-logged-in', { detail: user }));
            return user;
        }
        
        return { error: 'Invalid admin credentials' };
    }

    async logout() {
        if (window.supabaseClient) {
            await window.supabaseClient.auth.signOut();
        }
        this.clearSession();
    }

    async syncAdminPosts(adminUserId, adminUsername) {
        if (!window.supabaseClient || !adminUserId) return;
        
        try {
            const fallbackEmail = window.VIBEHUB_FALLBACK_ADMIN_USER || 'yamasseetechnology@gmail.com';
            
            // Step 1: Find and update posts with mismatched user_id for KingKool23
            const { data: mismatchedPosts } = await window.supabaseClient
                .from('posts')
                .select('*')
                .or(`user_id.neq.${adminUserId},username.neq.${adminUsername}`)
                .eq('username', adminUsername);
            
            if (mismatchedPosts && mismatchedPosts.length > 0) {
                console.log(`🔄 Synchronizing ${mismatchedPosts.length} KingKool23 posts...`);
                
                const { error: updateError } = await window.supabaseClient
                    .from('posts')
                    .update({ 
                        user_id: adminUserId,
                        username: adminUsername
                    })
                    .eq('username', adminUsername);
                
                if (updateError) {
                    console.error('Error syncing KingKool23 posts:', updateError);
                } else {
                    console.log(`✅ Synchronized ${mismatchedPosts.length} KingKool23 posts`);
                }
            }
            
            // Step 2: Find posts from yamasseetechnology@gmail.com account and transfer to KingKool23
            const { data: emailPosts } = await window.supabaseClient
                .from('posts')
                .select('*')
                .eq('username', fallbackEmail);
            
            if (emailPosts && emailPosts.length > 0) {
                console.log(`🔄 Transferring ${emailPosts.length} posts from ${fallbackEmail} to ${adminUsername}...`);
                
                const { error: transferError } = await window.supabaseClient
                    .from('posts')
                    .update({ 
                        user_id: adminUserId,
                        username: adminUsername
                    })
                    .eq('username', fallbackEmail);
                
                if (transferError) {
                    console.error('Error transferring email account posts:', transferError);
                } else {
                    console.log(`✅ Transferred ${emailPosts.length} posts from ${fallbackEmail} to ${adminUsername}`);
                }
            }
            
            // Step 3: Also check for posts with null/incorrect user_id but matching admin patterns
            const { data: orphanedPosts } = await window.supabaseClient
                .from('posts')
                .select('*')
                .or(`user_id.is.null,user_id.eq.'',user_id.eq.'undefined'`)
                .or(`username.eq.${adminUsername},username.eq.${fallbackEmail}`);
            
            if (orphanedPosts && orphanedPosts.length > 0) {
                console.log(`🔄 Fixing ${orphanedPosts.length} orphaned admin posts...`);
                
                const { error: orphanError } = await window.supabaseClient
                    .from('posts')
                    .update({ 
                        user_id: adminUserId,
                        username: adminUsername
                    })
                    .or(`username.eq.${adminUsername},username.eq.${fallbackEmail}`);
                
                if (orphanError) {
                    console.error('Error fixing orphaned posts:', orphanError);
                } else {
                    console.log(`✅ Fixed ${orphanedPosts.length} orphaned posts`);
                }
            }
            
        } catch (error) {
            console.error('Error in syncAdminPosts:', error);
        }
    }

    async updateProfile(updates) {
        if (!this.user || !this.user.id) return null;

        const supabasePayload = {
            name: updates.displayName,
            username: updates.username,
            avatar_url: updates.profilePhoto,
            bio: updates.bio,
            banner_url: updates.bannerImage,
            song_link: updates.songLink,
            updated_at: new Date().toISOString()
        };

        // Add admin-specific fields if applicable
        if (this.user.isSuperAdmin) {
            if (updates.verified !== undefined) supabasePayload.verified = updates.verified;
            if (updates.role !== undefined) supabasePayload.role = updates.role;
        }

        if (window.supabaseClient) {
            try {
                const { data, error } = await window.supabaseClient
                    .from('users')
                    .update(supabasePayload)
                    .eq('id', this.user.id)
                    .select()
                    .single();

                if (error) throw error;
                if (data) {
                    // CRITICAL FIX: Update local session with fresh data
                    const updatedUser = {
                        ...this.user,
                        displayName: data.name || this.user.displayName,
                        username: data.username || this.user.username,
                        profilePhoto: data.avatar_url || this.user.profilePhoto,
                        bio: data.bio || this.user.bio,
                        bannerImage: data.banner_url || this.user.bannerImage,
                        songLink: data.song_link || this.user.songLink,
                        verified: data.verified !== undefined ? data.verified : this.user.verified,
                        role: data.role || this.user.role
                    };
                    
                    this.user = updatedUser;
                    
                    // PERSISTENCE FIX: Clear and re-save session to ensure it sticks
                    this.clearSession();
                    this.persistSession(this.user);
                    
                    // Update State object if available
                    if (typeof State !== 'undefined' && State.user) {
                        State.user = this.user;
                    }
                    
                    window.dispatchEvent(new CustomEvent('user-logged-in', { detail: this.user }));
                    
                    // Clear posts cache when profile updated
                    // This ensures timeline shows updated avatar immediately
                    if (window.App && window.App.services && window.App.services.data && window.App.services.data.cache) {
                        await window.App.services.data.cache.clearPostsCache();
                    }
                    
                    this.showToast('Profile updated successfully!', 'success');
                    return updatedUser;
                }
            } catch (e) {
                console.error('Profile update error:', e);
                this.showToast('Failed to update profile', 'error');
            }
        }
        return null;
    }
}
