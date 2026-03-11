/**
 * VIBEHUB AUTH SERVICE
 * Handles Clerk + Supabase Authentication
 */
import { Clerk } from '@clerk/clerk-js';

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Utility inside module
function calculateUserBadges(userData) {
    if (!userData) return [];
    const badges = [];
    if (userData.verified) badges.push('Verified');
    
    const statsStr = userData.reaction_stats || '{"given": {}, "received": {}}';
    let stats = { given: {}, received: {} };
    try { stats = typeof statsStr === 'string' ? JSON.parse(statsStr) : statsStr; } catch(e) {}
    
    let totalReceived = Object.values(stats.received || {}).reduce((sum, val) => sum + (val || 0), 0);
    const vibeLikesCount = userData.vibe_likes?.length || (userData.vibe_likes_count || 0);
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
        this.clerk = null;
        this.clerkInitialized = false;
        this.rememberMe = localStorage.getItem('vibehub_remember') === 'true';
    }

    async initClerk() {
        if (this.clerkInitialized) return;
        
        if (!this.clerk) {
            this.clerk = new Clerk(publishableKey);
        }

        try {
            await this.clerk.load();
            this.clerkInitialized = true;
            console.log('✅ Clerk initialized and ready');
            
            const signInDiv = document.getElementById('sign-in');
            if (signInDiv) this.clerk.mountSignIn(signInDiv);
            
            const signUpDiv = document.getElementById('sign-up');
            if (signUpDiv) this.clerk.mountSignUp(signUpDiv);
        } catch (e) {
            console.error('Clerk SDK failed to load:', e);
            this.clerkInitialized = false;
        }
        
        if (this.clerk) {
            this.clerk.addListener(({ session }) => {
                if (session) {
                    this.handleClerkSession();
                } else {
                    this.logout();
                }
            });
            
            if (this.clerk.session) {
                await this.handleClerkSession();
            }
        }
    }

    checkSession() {
        return this.user;
    }

    async syncUserSession(clerkUser = null, fallbackUser = null) {
        try {
            let userData = null;
            let clerkId = clerkUser?.id || null;
            let email = clerkUser?.primaryEmailAddress?.emailAddress || fallbackUser?.email || '';
            let displayName = clerkUser?.fullName || fallbackUser?.user_metadata?.full_name || email.split('@')[0];
            let username = clerkUser?.username || fallbackUser?.user_metadata?.username || email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '_');
            let avatar = clerkUser?.imageUrl || fallbackUser?.user_metadata?.avatar_url || `https://i.pravatar.cc/150?u=${clerkId || email}`;

            if (window.supabaseClient) {
                const query = clerkId ? 
                    window.supabaseClient.from('users').select('*').eq('clerk_id', clerkId) :
                    window.supabaseClient.from('users').select('*').eq('email', email);
                
                const { data: existingUser } = await query.single();

                if (existingUser) {
                    const updatePayload = {
                        clerk_id: clerkId,
                        email: email,
                        updated_at: new Date().toISOString()
                    };
                    const { data } = await window.supabaseClient
                        .from('users')
                        .update(updatePayload)
                        .eq('id', existingUser.id)
                        .select()
                        .single();
                    userData = data || existingUser;
                } else {
                    const newUserPayload = {
                        clerk_id: clerkId,
                        username: username,
                        email: email,
                        name: displayName,
                        avatar_url: avatar,
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

            let actualPostCount = userData?.post_count || 0;
            if (window.supabaseClient && (userData?.id || fallbackUser?.id)) {
                const { count } = await window.supabaseClient
                    .from('posts')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', userData?.id || fallbackUser.id);
                actualPostCount = count || 0;
            }

            const finalUser = {
                id: userData?.id || fallbackUser?.id || clerkId || 'guest',
                clerkId: clerkId,
                username: userData?.username || username,
                displayName: userData?.name || displayName,
                email: email,
                profilePhoto: userData?.avatar_url || avatar,
                bannerImage: userData?.banner_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200',
                bio: userData?.bio || 'New to VibeHub!',
                followersCount: userData?.followers?.length || 0,
                followingCount: userData?.following?.length || 0,
                postCount: actualPostCount,
                reactionScore: userData?.vibe_score || 0,
                vibeLikesCount: userData?.vibe_likes?.length || 0,
                badgeList: userData ? calculateUserBadges(userData) : [],
                isSuperAdmin: userData?.role === 'admin',
                songLink: userData?.song_link || null,
                createdAt: userData?.created_at || new Date().toISOString()
            };

            this.user = finalUser;
            
            const storage = this.rememberMe ? localStorage : sessionStorage;
            storage.setItem('vibehub_user', JSON.stringify(finalUser));
            if (this.rememberMe) {
                localStorage.setItem('vibehub_remember', 'true');
            } else {
                localStorage.removeItem('vibehub_remember');
                localStorage.removeItem('vibehub_user');
            }
            console.log(`📡 Session persisted in ${this.rememberMe ? 'localStorage' : 'sessionStorage'}`);

            console.log('User session synced:', finalUser);
            window.dispatchEvent(new CustomEvent('user-logged-in', { detail: finalUser }));
            
            return finalUser;
        } catch (error) {
            console.error('Error syncing user session:', error);
            return null;
        }
    }

    async handleClerkSession() {
        return this.syncUserSession(this.clerk?.user);
    }

    async customSignIn(email, password, rememberMe = true) {
        this.rememberMe = rememberMe;
        if (window.supabaseClient) {
            try {
                const { data, error } = await window.supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password
                });
                
                if (!error) {
                    const user = await this.syncUserSession(null, data.user);
                    return { success: true, user: user };
                }
                
                if (this.clerk) {
                     const signIn = await this.clerk.client.signIn.create({
                        identifier: email,
                        password: password,
                    });
                    await this.clerk.setActive({ session: signIn.createdSessionId });
                    return { success: true };
                }
                
                return { error: error.message };
            } catch (e) {
                console.error('Supabase sign in error:', e);
            }
        }

        if (!this.clerk) {
            return { error: 'Auth system not ready. Please refresh.' };
        }
        
        try {
            const signIn = await this.clerk.client.signIn.create({
                identifier: email,
                password: password,
            });
            await this.clerk.setActive({ session: signIn.createdSessionId });
            return { success: true };
        } catch (error) {
            console.error('Clerk sign in error:', error);
            const errorMessage = (error.errors && error.errors[0]?.longMessage) || error.message || 'Sign in failed';
            return { error: errorMessage };
        }
    }

    async customSignUp(email, password, name, rememberMe = true) {
        this.rememberMe = rememberMe;
        if (window.supabaseClient) {
            try {
                const { data, error } = await window.supabaseClient.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        data: { full_name: name, username: email.split('@')[0].toLowerCase() }
                    }
                });

                if (!error) {
                    const user = await this.syncUserSession(null, data.user);
                    return { success: true, user: user };
                }
                
                if (error.message.includes('already registered')) {
                    return { error: 'This email is already registered. Try signing in!' };
                }

                console.warn('Supabase signup failed, trying Clerk fallback...', error);
            } catch (e) {
                console.error('Supabase signup exception:', e);
            }
        }

        if (!this.clerk) {
            return { error: 'Auth system not ready.' };
        }
        
        try {
            const signUp = await this.clerk.client.signUp.create({
                emailAddress: email,
                password: password,
                firstName: name
            });
            
            if (signUp.status === 'complete') {
                await this.clerk.setActive({ session: signUp.createdSessionId });
                return { success: true };
            } else {
                return { error: `Clerk account requires ${signUp.status}. Use a stronger password or check your email.` };
            }
        } catch (error) {
            console.error('Clerk sign up error:', error);
            let errorMessage = 'Sign up failed';
            if (error.errors && error.errors[0]) {
                const err = error.errors[0];
                errorMessage = err.longMessage || err.message || errorMessage;
            }
            return { error: errorMessage };
        }
    }

    async login(email, password, isAdmin = false, rememberMe = true) {
        this.rememberMe = rememberMe;
        const validAdminEmail = import.meta.env.VITE_ADMIN_USER;
        const adminPassword = import.meta.env.VITE_ADMIN_PASS;
        const fallbackAdminEmail = import.meta.env.VITE_FALLBACK_ADMIN_USER;
        const fallbackAdminPassword = import.meta.env.VITE_FALLBACK_ADMIN_PASS;

        const isKingKool = email === validAdminEmail && password === adminPassword;
        const isFallbackAdmin = email === fallbackAdminEmail && password === fallbackAdminPassword;
        const isSuperAdmin = isKingKool || isFallbackAdmin;

        console.log(`🔐 Admin login attempt for: ${email}`);

        if (!isSuperAdmin) {
            console.warn(`🚫 Unauthorized admin login attempt blocked for: ${email}`);
            return { error: 'use_clerk', message: 'Unauthorized. Please use the standard login portal and Clerk.' };
        }

        return new Promise(async resolve => {
            let supabaseUser = null;
            if (window.supabaseClient) {
                try {
                    const { data } = await window.supabaseClient
                        .from('users')
                        .select('*')
                        .or(`email.eq.${email},username.eq.${email}`)
                        .single();
                    supabaseUser = data;
                } catch (e) {
                    console.log('User not found in Supabase');
                }
            }

            setTimeout(() => {
                const user = {
                    id: supabaseUser?.id || `admin_${Date.now()}`,
                    username: supabaseUser?.username || (email.includes('@') ? email.split('@')[0] : email),
                    displayName: supabaseUser?.name || (email === 'KingKool23' ? 'King Kool' : 'Vibe Admin'),
                    email: email.includes('@') ? email : (supabaseUser?.email || 'admin@vibehub.co'),
                    profilePhoto: supabaseUser?.avatar_url || 'https://i.pravatar.cc/150?u=admin',
                    bannerImage: supabaseUser?.banner_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200',
                    bio: supabaseUser?.bio || 'Platform Administrator',
                    followersCount: supabaseUser?.followers?.length || 0,
                    followingCount: supabaseUser?.following?.length || 0,
                    postCount: 0,
                    reactionScore: supabaseUser?.vibe_score || 0,
                    badgeList: ['Admin'],
                    isSuperAdmin: true,
                    createdAt: supabaseUser?.created_at || new Date().toISOString()
                };
                
                this.user = user;
                const storage = this.rememberMe ? localStorage : sessionStorage;
                storage.setItem('vibehub_user', JSON.stringify(user));
                if (this.rememberMe) {
                    localStorage.setItem('vibehub_remember', 'true');
                    sessionStorage.removeItem('vibehub_user');
                } else {
                    localStorage.removeItem('vibehub_remember');
                    localStorage.removeItem('vibehub_user');
                }
                
                console.log('Admin session established:', user);
                window.dispatchEvent(new CustomEvent('user-logged-in', { detail: user }));
                resolve(user);
            }, 500);
        });
    }

    async logout() {
        if (this.clerk) {
            try {
                await this.clerk.signOut();
            } catch (e) {
                console.log('Clerk sign out error:', e);
            }
        }
        
        this.user = null;
        localStorage.removeItem('vibehub_user');
        localStorage.removeItem('vibehub_remember');
        sessionStorage.removeItem('vibehub_user');
        window.dispatchEvent(new CustomEvent('user-logged-out'));
    }

    async updateProfile(updates) {
        console.log('--- Profile Sync Sequence Initiated ---', updates);
        
        if (!this.user || !this.user.id) {
            console.error('❌ Cannot update profile: No active user session');
            return null;
        }

        const supabasePayload = {
            name: updates.displayName,
            username: updates.username,
            avatar_url: updates.profilePhoto,
            bio: updates.bio,
            banner_url: updates.bannerImage,
            song_link: updates.songLink,
            updated_at: new Date().toISOString()
        };

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
                    this.user = {
                        ...this.user,
                        displayName: data.name,
                        username: data.username,
                        profilePhoto: data.avatar_url,
                        bio: data.bio,
                        bannerImage: data.banner_url,
                        songLink: data.song_link
                    };
                }
            } catch (e) {
                console.error('❌ Critical Supabase Error:', e);
                this.user = { ...this.user, ...updates };
            }
        } else {
            this.user = { ...this.user, ...updates };
        }
        
        if (this.clerk && this.clerk.user) {
            try {
                await this.clerk.user.update({
                    firstName: updates.displayName,
                    username: updates.username
                });
            } catch (e) {
                console.error('❌ Clerk profile update error:', e);
            }
        }

        localStorage.setItem('vibehub_user', JSON.stringify(this.user));
        localStorage.setItem('vibehub_remember', 'true');
        window.dispatchEvent(new CustomEvent('user-logged-in', { detail: this.user }));
        return this.user;
    }
}
