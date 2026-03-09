/**
 * VIBEHUB SERVICE LAYER
 * All cloud services integrated: Supabase, Cloudinary, ImageKit, Clerk, Redis, Firebase
 */
import { Clerk } from '@clerk/clerk-js';

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || 'pk_test_Z29yZ2VvdXMtb2NlbG90LTg1LmNsZXJrLmFjY291bnRzLmRldiQ';

// ============================================
// UTILITY FUNCTIONS
// ============================================
function calculateUserBadges(userData) {
    if (!userData) return [];
    const badges = [];
    if (userData.verified) badges.push('Verified');
    
    // Vibe Boost Badges
    const vibeLikesCount = userData.vibe_likes?.length || (userData.vibe_likes_count || 0);
    if (vibeLikesCount >= 200) badges.push('Vibe Legend');
    else if (vibeLikesCount >= 100) badges.push('Vibe Master');
    else if (vibeLikesCount >= 50) badges.push('Viber');
    
    // Administrative
    if (userData.role === 'admin' || userData.is_admin) badges.push('Admin');
    
    return badges;
}

// ============================================

// MEDIA SERVICE - Cloudinary (Videos) + ImageKit (Photos)
// ============================================
export class MediaService {
    constructor() {
        this.cloudinaryConfig = window.CLOUDINARY_CONFIG || { cloudName: 'dg35zlppj' };
        this.cloudinaryReady = !!window.cloudinary;
        this.init();
    }

    init() {
        if (!this.cloudinaryReady) {
            const checkCloudinary = setInterval(() => {
                if (window.cloudinary) {
                    this.cloudinaryReady = true;
                    clearInterval(checkCloudinary);
                }
            }, 500);
            setTimeout(() => clearInterval(checkCloudinary), 10000);
        }
    }

    async uploadImage(file) {
        if (!file) return null;
        console.log('Uploading image to Cloudinary...');
        
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', 'vibehub_images');
            formData.append('cloud_name', this.cloudinaryConfig.cloudName);
            
            const response = await fetch(`https://api.cloudinary.com/v1_1/${this.cloudinaryConfig.cloudName}/image/upload`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) throw new Error('Cloudinary image upload failed');
            
            const data = await response.json();
            console.log('Image uploaded to Cloudinary:', data);
            
            return {
                url: data.secure_url,
                thumbnailUrl: data.secure_url.replace('/upload/', '/upload/w_400,c_fill/'),
                fileId: data.public_id,
                type: 'image'
            };
        } catch (error) {
            console.error('Cloudinary image upload error:', error);
            return await this.createLocalPreview(file);
        }
    }

    async uploadVideo(file) {
        if (!file) return null;
        console.log('Uploading video to Cloudinary...');
        
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', 'vibehub_videos');
            formData.append('cloud_name', this.cloudinaryConfig.cloudName);
            
            const response = await fetch(`https://api.cloudinary.com/v1_1/${this.cloudinaryConfig.cloudName}/video/upload`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) throw new Error('Cloudinary video upload failed');
            
            const data = await response.json();
            console.log('Video uploaded to Cloudinary:', data);
            
            return {
                url: data.secure_url,
                thumbnailUrl: data.secure_url.replace('/video/', '/video/so_0,w_400,h_225,c_fill/'),
                fileId: data.public_id,
                duration: data.duration,
                type: 'video'
            };
        } catch (error) {
            console.error('Cloudinary video upload error:', error);
            return await this.createLocalPreview(file);
        }
    }

    createLocalPreview(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                resolve({
                    url: e.target.result,
                    thumbnailUrl: e.target.result,
                    fileId: null,
                    type: file.type.includes('video') ? 'video' : 'image',
                    isLocal: true
                });
            };
            reader.readAsDataURL(file);
        });
    }

    getOptimizedImageUrl(url, width = 800) {
        if (!url) return '';
        if (url.includes('cloudinary.com')) {
            return url.replace('/upload/', `/upload/w_${width},q_80,f_auto/`);
        }
        if (url.includes('ik.imagekit.io')) {
            return `${url}?tr=w-${width},q-80,f-auto`;
        }
        return url;
    }

    getVideoThumbnail(url) {
        if (!url) return '';
        if (url.includes('cloudinary.com')) {
            return url.replace('/video/', '/video/so_0,w_400,h_225,c_fill/').replace('.mp4', '.jpg');
        }
        return url;
    }
}

// ============================================
// CACHE SERVICE - Redis Rate Limiting
// ============================================
export class CacheService {
    constructor() {
        this.redisUrl = window.UPSTASH_CONFIG?.url;
        this.redisToken = window.UPSTASH_CONFIG?.token;
        this.enabled = !!(this.redisUrl && this.redisToken);
    }

    async get(key) {
        if (!this.enabled) return null;
        try {
            const response = await fetch(`${this.redisUrl}/get/${key}`, {
                headers: { 'Authorization': `Bearer ${this.redisToken}` }
            });
            const data = await response.json();
            return data.result;
        } catch (e) {
            console.warn('Redis get error:', e);
            return null;
        }
    }

    async set(key, value, ttl = 3600) {
        if (!this.enabled) return null;
        try {
            await fetch(`${this.redisUrl}/set/${key}/${value}`, {
                headers: { 'Authorization': `Bearer ${this.redisToken}` }
            });
        } catch (e) {
            console.warn('Redis set error:', e);
        }
    }

    async increment(key, ttl = 60) {
        if (!this.enabled) {
            return this.localIncrement(key, ttl);
        }
        try {
            const response = await fetch(`${this.redisUrl}/incr/${key}`, {
                headers: { 'Authorization': `Bearer ${this.redisToken}` }
            });
            const data = await response.json();
            return data.result;
        } catch (e) {
            console.warn('Redis incr error:', e);
            return this.localIncrement(key, ttl);
        }
    }

    localIncrement(key, ttl) {
        const storageKey = `rate_${key}`;
        const now = Date.now();
        const data = JSON.parse(localStorage.getItem(storageKey) || '{"count":0,"resetAt":0}');
        
        if (now > data.resetAt) {
            data.count = 1;
            data.resetAt = now + (ttl * 1000);
        } else {
            data.count++;
        }
        
        localStorage.setItem(storageKey, JSON.stringify(data));
        return data.count;
    }

    async checkRateLimit(userId, action, limits) {
        const key = `${userId}:${action}`;
        const current = await this.increment(key, 60);
        return current <= limits;
    }

    async cachePosts(key, posts, ttl = 30) {
        if (!this.enabled) return;
        try {
            await fetch(`${this.redisUrl}/setex/${key}/${ttl}`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${this.redisToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(posts)
            });
        } catch (e) {
            console.warn('Cache posts error:', e);
        }
    }

    async getCachedPosts(key) {
        if (!this.enabled) return null;
        try {
            const response = await fetch(`${this.redisUrl}/get/${key}`, {
                headers: { 'Authorization': `Bearer ${this.redisToken}` }
            });
            const data = await response.json();
            return data.result;
        } catch (e) {
            return null;
        }
    }
}

// ============================================
// NOTIFICATION SERVICE - Firebase Push
// ============================================
export class NotificationService {
    constructor() {
        this.token = null;
        this.enabled = !!(window.firebaseApp);
        this.messaging = null;
    }

    async initMessaging() {
        if (!this.enabled || this.messaging) return;
        
        try {
            // Firebase is loaded as ES module in index.html
            if (window.messaging) {
                this.messaging = window.messaging;
            } else if (window.firebaseApp) {
                // Dynamically import if not available
                const { getMessaging } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging.js');
                this.messaging = getMessaging(window.firebaseApp);
            }
        } catch (error) {
            console.warn('Firebase messaging init failed:', error);
        }
    }

    async requestPermission() {
        // Initialize messaging first
        await this.initMessaging();
        
        if (!this.enabled) {
            console.log('Firebase not available, using browser notifications');
            return await this.requestBrowserPermission();
        }

        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted' && this.messaging) {
                const { getToken } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging.js');
                this.token = await getToken(this.messaging, {
                    vapidKey: 'BHS3p1acoPbQ_Rt6x-Rjbrv4jiJgFiYhrXLU46xxJ080kjKWzwzTDE0IP_92QEJ2ySB3A2kg5t9tjJdaqjBgIig'
                });
                console.log('Firebase notification token:', this.token);
                return this.token;
            }
        } catch (error) {
            console.error('Firebase notification error:', error);
            return await this.requestBrowserPermission();
        }
    }

    async requestBrowserPermission() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }
        return false;
    }

    async sendLocalNotification(title, body, icon) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body,
                icon: icon || 'https://i.ibb.co/Fqnj3JKp/1000001392.png',
                badge: 'https://i.ibb.co/Fqnj3JKp/1000001392.png'
            });
        }
    }

    async notifyLike(postAuthor, likerName) {
        await this.sendLocalNotification(
            'New Like! ðŸ’œ',
            `${likerName} liked your vibe!`,
            'https://i.ibb.co/Fqnj3JKp/1000001392.png'
        );
    }

    async notifyComment(postAuthor, commenterName, comment) {
        await this.sendLocalNotification(
            'New Comment! ðŸ’¬',
            `${commenterName}: ${comment.substring(0, 50)}...`,
            'https://i.ibb.co/Fqnj3JKp/1000001392.png'
        );
    }

    async notifyFollow(followerName, userName) {
        await this.sendLocalNotification(
            'New Follower! âœ¨',
            `${followerName} is now following you!`,
            'https://i.ibb.co/Fqnj3JKp/1000001392.png'
        );
    }
}

// ============================================
// AUTH SERVICE - Clerk + Supabase
// ============================================
export class AuthService {
    constructor() {
        this.user = JSON.parse(localStorage.getItem('vibehub_user')) || 
                    JSON.parse(sessionStorage.getItem('vibehub_user')) || null;
        this.clerk = null;
        this.clerkInitialized = false;
        this.rememberMe = localStorage.getItem('vibehub_remember') === 'true';
    }

    async initClerk() {
        if (this.clerkInitialized) return;
        
        // Wait for Clerk to be ready
        if (!this.clerk) {
            this.clerk = new Clerk(publishableKey);
        }

        try {
            await this.clerk.load();
            this.clerkInitialized = true;
            console.log('âœ… Clerk initialized and ready');
            
            // Mount Clerk components
            const signInDiv = document.getElementById('sign-in');
            if (signInDiv) this.clerk.mountSignIn(signInDiv);
            
            const signUpDiv = document.getElementById('sign-up');
            if (signUpDiv) this.clerk.mountSignUp(signUpDiv);
        } catch (e) {
            console.error('Clerk SDK failed to load:', e);
            this.clerkInitialized = false;
        }
        
        // Listen for session changes (Clerk v6 API)
        if (this.clerk) {
            this.clerk.addListener(({ session }) => {
                if (session) {
                    this.handleClerkSession();
                } else {
                    this.logout();
                }
            });
            
            // Check existing session
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

            // 1. Sync/Fetch from Supabase
            if (window.supabaseClient) {
                // Try to find user by clerk_id or email
                const query = clerkId ? 
                    window.supabaseClient.from('users').select('*').eq('clerk_id', clerkId) :
                    window.supabaseClient.from('users').select('*').eq('email', email);
                
                const { data: existingUser } = await query.single();
                
                const payload = {
                    clerk_id: clerkId,
                    username: username,
                    email: email,
                    name: displayName,
                    avatar_url: avatar,
                    updated_at: new Date().toISOString()
                };

                if (existingUser) {
                    const { data } = await window.supabaseClient
                        .from('users')
                        .update(payload)
                        .eq('id', existingUser.id)
                        .select()
                        .single();
                    userData = data || existingUser;
                } else {
                    payload.created_at = new Date().toISOString();
                    payload.bio = 'New to VibeHub!';
                    payload.vibe_score = 0;
                    payload.role = 'user';
                    
                    const { data, error } = await window.supabaseClient
                        .from('users')
                        .insert([payload])
                        .select()
                        .single();
                    if (!error) userData = data;
                }
            }

            // 2. Prepare App User Object
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
                postCount: userData?.post_count || 0,
                reactionScore: userData?.vibe_score || 0,
                vibeLikesCount: userData?.vibe_likes?.length || 0,
                badgeList: userData ? calculateUserBadges(userData) : [],
                isSuperAdmin: userData?.role === 'admin',
                createdAt: userData?.created_at || new Date().toISOString()
            };

            this.user = finalUser;
            
            // 3. Persist Session
            const storage = this.rememberMe ? localStorage : sessionStorage;
            storage.setItem('vibehub_user', JSON.stringify(finalUser));
            if (this.rememberMe) localStorage.setItem('vibehub_remember', 'true');
            else localStorage.removeItem('vibehub_remember');

            // 4. Notify App
            console.log('User session synced:', finalUser);
            window.dispatchEvent(new CustomEvent('user-logged-in', { detail: finalUser }));
            
            return finalUser;
        } catch (error) {
            console.error('Error syncing user session:', error);
            return null;
        }
    }

    async customSignIn(email, password, rememberMe = true) {
        this.rememberMe = rememberMe;
        // Try Supabase first for simplicity, fallback to Clerk only if needed
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
                
                // If Supabase fails but we have Clerk, try Clerk as fallback
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
        
        // Try Supabase first for "Lite Auth" (less restrictive)
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
                    // Supabase signup success
                    const user = await this.syncUserSession(null, data.user);
                    return { success: true, user: user };
                }
                
                // If Supabase fails (e.g. user already exists or other error), we might still want to try Clerk 
                // but let's stick to Supabase if it worked. If error is "User already registered", 
                // we should probably just return that.
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
        // Admin credentials
        const validAdminEmail = 'yamasseetechnology@gmail.com';
        const adminPassword = 'citawoo789!';

        // Only allow admin login through this method
        const isSuperAdmin = isAdmin || 
                            (email.toLowerCase() === validAdminEmail && password === adminPassword);

        if (!isSuperAdmin) {
            // Redirect to Clerk for regular users
            return { error: 'use_clerk', message: 'Please use Clerk to sign in' };
        }

        // Admin login - check Supabase
        return new Promise(async resolve => {
            let supabaseUser = null;
            
            if (window.supabaseClient) {
                try {
                    const { data } = await window.supabaseClient
                        .from('users')
                        .select('*')
                        .eq('email', email)
                        .single();
                    supabaseUser = data;
                } catch (e) {
                    console.log('User not found');
                }
            }

            setTimeout(() => {
                const user = {
                    id: supabaseUser?.id || 'admin_' + Date.now(),
                    username: 'super_admin',
                    displayName: 'Super Admin',
                    email: email,
                    profilePhoto: 'https://i.pravatar.cc/150?u=admin',
                    bannerImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200',
                    bio: 'Platform Administrator',
                    followersCount: 0,
                    followingCount: 0,
                    postCount: 0,
                    reactionScore: 0,
                    badgeList: ['Admin'],
                    isSuperAdmin: true,
                    createdAt: new Date().toISOString()
                };
                
                this.user = user;
                if (this.rememberMe) {
                    localStorage.setItem('vibehub_user', JSON.stringify(user));
                    localStorage.setItem('vibehub_remember', 'true');
                } else {
                    sessionStorage.setItem('vibehub_user', JSON.stringify(user));
                    localStorage.removeItem('vibehub_remember');
                }
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
        this.user = { ...this.user, ...updates };
        if (this.rememberMe) {
            localStorage.setItem('vibehub_user', JSON.stringify(this.user));
        } else {
            sessionStorage.setItem('vibehub_user', JSON.stringify(this.user));
        }
        
        // Update in Supabase if available
        if (window.supabaseClient && this.user.id) {
            try {
                await window.supabaseClient
                    .from('users')
                    .update({
                        display_name: updates.displayName,
                        username: updates.username,
                        avatar_url: updates.profilePhoto,
                        bio: updates.bio,
                        banner_url: updates.bannerImage
                    })
                    .eq('id', this.user.id);
            } catch (e) {
                console.log('Profile update error:', e);
            }
        }
        
        // Update in Clerk if available
        if (this.clerk && this.clerk.user) {
            try {
                await this.clerk.user.update({
                    firstName: updates.displayName,
                    username: updates.username
                });
            } catch (e) {
                console.log('Clerk profile update error:', e);
            }
        }
        
        window.dispatchEvent(new CustomEvent('user-logged-in', { detail: this.user }));
        return this.user;
    }
}

// ============================================
// DATA SERVICE - Supabase Posts, Comments, etc
// ============================================
export class DataService {
    constructor() {
        this.media = new MediaService();
        this.cache = new CacheService();
        this.notifications = new NotificationService();
        this.supabase = window.supabaseClient;
        this.loadSampleDataIfEmpty();
    }

    isSupabaseReady() {
        return !!this.supabase;
    }

    async loadSampleDataIfEmpty() {
        if (!window.supabaseClient) return;
        
        try {
            const { count } = await window.supabaseClient
                .from('posts')
                .select('*', { count: 'exact', head: true });

            if (count === 0) {
                console.log('No posts found, loading sample data...');
                await this.loadSampleData();
            }
        } catch (e) {
            console.log('Could not check for sample data:', e);
        }
    }

    async loadSampleData() {
        if (!window.supabaseClient) return;

        const sampleUsers = [
            {
                id: 'u1',
                username: 'echo_mind',
                email: 'echo@vibehub.com',
                name: 'Echo Mind',
                bio: 'The geometry of thought is fascinating. #mindfulness',
                avatar_url: 'https://i.pravatar.cc/150?u=vibehub1',
                banner_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200',
                theme: 'purple',
                followers: ['u2', 'u3'],
                following: ['u2'],
                vibe_score: 1200,
                verified: true,
                role: 'user',
                created_at: new Date().toISOString()
            },
            {
                id: 'u2', 
                username: 'cyber_soul',
                email: 'cyber@vibehub.com',
                name: 'Cyber Soul',
                bio: 'Neon dreams in a digital world. ðŸ™ï¸âœ¨',
                avatar_url: 'https://i.pravatar.cc/150?u=vibehub2',
                banner_url: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=1200',
                theme: 'cyan',
                followers: ['u1', 'u3', 'u4'],
                following: ['u1'],
                vibe_score: 850,
                verified: true,
                role: 'user',
                created_at: new Date().toISOString()
            },
            {
                id: 'u3',
                username: 'future_ghost',
                email: 'ghost@vibehub.com', 
                name: 'Future Ghost',
                bio: 'Is anyone else vibing on the new Sync Room features? âš¡',
                avatar_url: 'https://i.pravatar.cc/150?u=vibehub3',
                banner_url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200',
                theme: 'pink',
                followers: ['u2'],
                following: ['u1', 'u2', 'u4'],
                vibe_score: 2100,
                verified: false,
                role: 'user',
                created_at: new Date().toISOString()
            }
        ];

        const samplePosts = [
            {
                user_id: 'u1',
                username: 'echo_mind',
                user_avatar: 'https://i.pravatar.cc/150?u=vibehub1',
                text: 'The geometry of thought is fascinating. When we link minds, we create something greater than ourselves. #mindfulness #vibes',
                media_url: 'https://images.unsplash.com/photo-1633167606207-d840b5070fc2?w=800',
                media_type: 'image',
                tags: ['mindfulness', 'vibes'],
                mood: 'ðŸ§ ',
                likes: ['u2', 'u3'],
                dislikes: [],
                reactions: { cap: ['u2'], relate: ['u3'], wild: ['u2'], facts: [] },
                comment_count: 1
            },
            {
                user_id: 'u2',
                username: 'cyber_soul', 
                user_avatar: 'https://i.pravatar.cc/150?u=vibehub2',
                text: 'Neon dreams in a digital world. The city never sleeps, and neither does the vibe. ðŸ™ï¸âœ¨ #neon',
                media_url: '',
                media_type: 'none',
                tags: ['neon'],
                mood: 'ðŸŒƒ',
                likes: ['u1'],
                dislikes: [],
                reactions: { cap: [], relate: ['u1'], wild: [], facts: [] },
                comment_count: 0
            },
            {
                user_id: 'u3',
                username: 'future_ghost',
                user_avatar: 'https://i.pravatar.cc/150?u=vibehub3', 
                text: "Is anyone else vibing on the new Sync Room features? The energy in there is unreal! âš¡ðŸ’¬",
                media_url: '',
                media_type: 'none',
                tags: ['syncrooms'],
                mood: 'âš¡',
                likes: ['u1', 'u2'],
                dislikes: [],
                reactions: { cap: ['u1'], relate: [], wild: ['u1', 'u2'], facts: ['u2'] },
                comment_count: 0
            }
        ];

        try {
            await window.supabaseClient.from('users').insert(sampleUsers);
            await window.supabaseClient.from('posts').insert(samplePosts);

            const sampleChannels = [
                {
                    owner_id: 'u1',
                    name: 'Synthwave Lovers',
                    description: 'Retrofuturistic vibes only. Neon lights and dark horizons.',
                    category: 'ðŸŽµ Music',
                    emoji_banner: 'ðŸŒƒ',
                    subscribers: ['u1', 'u2', 'u3']
                },
                {
                    owner_id: 'u2', 
                    name: 'Deep Psychology',
                    description: 'Exploring the linked mind and consciousness.',
                    category: 'ðŸ§  Science',
                    emoji_banner: 'ðŸ”®',
                    subscribers: ['u1', 'u3']
                }
            ];

            await window.supabaseClient.from('channels').insert(sampleChannels);
            console.log('âœ… Sample data loaded!');
        } catch (error) {
            console.error('Error loading sample data:', error);
        }
    }

    calculateVibeScore(post) {
        const likes = post.likes || [];
        const dislikes = post.dislikes || [];
        const reactions = post.reactions || { cap: [], relate: [], wild: [], facts: [] };
        
        return (likes.length * 1) + 
               (dislikes.length * -1) + 
               ((reactions.cap?.length || 0) * 1) +
               ((reactions.relate?.length || 0) * 1.5) +
               ((reactions.wild?.length || 0) * 3) +
               ((reactions.facts?.length || 0) * 2);
    }

    async checkRateLimit(userId, action) {
        const limits = {
            post: 2,
            like: 5,
            comment: 2
        };
        return await this.cache.checkRateLimit(userId, action, limits[action] || 5);
    }

    async addPost(postObj) {
        if (!postObj.userId) {
            console.error('No userId for post');
            return null;
        }

        const allowed = await this.checkRateLimit(postObj.userId, 'post');
        if (!allowed) {
            console.warn('Rate limit exceeded for posts');
            return { error: 'rate_limit', message: 'You can only post 2 times per minute' };
        }

        if (!window.supabaseClient) {
            console.warn('Supabase not available');
            return null;
        }

        try {
            let mediaUrl = postObj.mediaUrl || '';
            let mediaType = postObj.mediaType || 'none';

            if (postObj.mediaFile) {
                const file = postObj.mediaFile;
                if (file.type.includes('video')) {
                    const result = await this.media.uploadVideo(file);
                    if (result) {
                        mediaUrl = result.url;
                        mediaType = 'video';
                    }
                } else if (file.type.includes('image')) {
                    const result = await this.media.uploadImage(file);
                    if (result) {
                        mediaUrl = result.url;
                        mediaType = 'image';
                    }
                }
            }

            const postData = {
                user_id: postObj.userId,
                username: postObj.username || postObj.handle,
                user_avatar: postObj.avatar,
                text: postObj.content || postObj.text,
                media_url: mediaUrl,
                media_type: mediaType,
                tags: postObj.tags || [],
                mood: postObj.mood || '',
                likes: [],
                dislikes: [],
                reactions: { cap: [], relate: [], wild: [], facts: [] },
                comment_count: 0,
                created_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // Default to 1 year for now
            };

            const { data, error } = await window.supabaseClient
                .from('posts')
                .insert([postData])
                .select();

            if (error) {
                console.error('Error saving post:', error);
                return null;
            }
            
            console.log('Post saved:', data);
            return data ? data[0] : postObj;
        } catch (error) {
            console.error('Error saving post:', error);
            return null;
        }
    }

    async getPosts(tab = 'all', communityId = null) {
        if (!window.supabaseClient) return [];

        const cacheKey = `posts_${tab}_${communityId || 'all'}`;
        const cached = await this.cache.getCachedPosts(cacheKey);
        if (cached && Array.isArray(cached)) {
            console.log('Returning cached posts');
            return cached;
        }

        try {
            let query = window.supabaseClient
                .from('posts')
                .select('*, users!inner(*)')
                .order('created_at', { ascending: false });

            if (communityId) {
                query = query.eq('communityId', communityId);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching joined posts:', error);
                // Fallback to non-joined query if relation fails
                const fallback = await window.supabaseClient
                    .from('posts')
                    .select('*')
                    .order('created_at', { ascending: false });
                if (fallback.error) return [];
                return this.mapPosts(fallback.data);
            }

            let posts = this.mapPosts(data);

            // Handle Trending Sort
            if (tab === 'trending') {
                posts = posts.map(p => ({
                    ...p,
                    vibeScore: this.calculateVibeScore(p)
                })).sort((a, b) => (b.vibeScore || 0) - (a.vibeScore || 0));
            }

            // Inject ads every 20 posts
            if (tab === 'vibeline') {
                const ads = typeof this.getAds === 'function' ? await this.getAds() : [];
                if (ads.length > 0) {
                    const result = [];
                    posts.forEach((post, index) => {
                        result.push(post);
                        if ((index + 1) % 20 === 0) {
                            const ad = ads[(index / 20) % ads.length];
                            result.push({
                                id: ad.id,
                                isSponsored: true,
                                content: ad.content,
                                media: ad.media_url,
                                mediaType: ad.media_type,
                                displayName: 'Sponsored',
                                handle: 'ad',
                                avatar: 'https://i.pravatar.cc/150?u=ad',
                                reactions: { like: 0, dislike: 0, heat: 0, admire: 0, cap: 0, wild: 0 }
                            });
                        }
                    });
                    posts = result;
                }
            }

            await this.cache.cachePosts(cacheKey, posts);
            return posts;
        } catch (error) {
            console.error('Exception in getPosts:', error);
            return [];
        }
    }

    mapPosts(data) {
        return (data || []).map(post => ({
            id: post.id,
            userId: post.user_id,
            displayName: post.users?.name || post.username,
            handle: post.users?.username || post.username,
            avatar: post.users?.avatar_url || post.user_avatar || `https://i.pravatar.cc/150?u=${post.user_id}`,
            content: post.text,
            media: post.media_url,
            mediaType: post.media_type,
            type: post.media_type === 'none' ? 'text' : post.media_type,
            reactions: {
                like: post.likes?.length || 0,
                heat: post.reactions?.heat?.length || 0,
                wild: post.reactions?.wild?.length || 0,
                cap: post.reactions?.cap?.length || 0,
                admire: post.reactions?.relate?.length || 0,
                dislike: post.dislikes?.length || 0
            },
            reactionScore: post.vibe_score || 0,
            badgeList: calculateUserBadges(post.users),
            isSponsored: post.is_sponsored
        }));
    }

    subscribeToPosts(callback) {
        if (!window.supabaseClient) return null;

        const channel = window.supabaseClient
            .channel('public:posts')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'posts'
            }, (payload) => {
                console.log('New post received:', payload.new);
                if (callback) callback({ type: 'new_post', data: payload.new });
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'posts'
            }, (payload) => {
                console.log('Post updated:', payload.new);
                if (callback) callback({ type: 'post_update', data: payload.new });
            })
            .subscribe();

        return channel;
    }

    async addReaction(postId, userId, reactionType) {
        if (!window.supabaseClient) return { success: true };

        try {
            const { data: post, error: fetchError } = await window.supabaseClient
                .from('posts')
                .select('likes, dislikes, reactions')
                .eq('id', postId)
                .single();

            if (fetchError) throw fetchError;

            if (reactionType === 'like' || reactionType === 'dislike') {
                const field = reactionType === 'like' ? 'likes' : 'dislikes';
                let list = post[field] || [];
                if (list.includes(userId)) {
                    list = list.filter(id => id !== userId);
                } else {
                    list.push(userId);
                }
                const { error: updateError } = await window.supabaseClient
                    .from('posts')
                    .update({ [field]: list })
                    .eq('id', postId);
                if (updateError) throw updateError;
            } else {
                let reactions = post.reactions || { cap: [], relate: [], wild: [], facts: [], heat: [] };
                if (!reactions[reactionType]) reactions[reactionType] = [];
                
                if (reactions[reactionType].includes(userId)) {
                    reactions[reactionType] = reactions[reactionType].filter(id => id !== userId);
                } else {
                    reactions[reactionType].push(userId);
                }
                
                const { error: updateError } = await window.supabaseClient
                    .from('posts')
                    .update({ reactions })
                    .eq('id', postId);
                if (updateError) throw updateError;
            }

            return { success: true };
        } catch (error) {
            console.error('Error in addReaction:', error);
            return { success: false, error: error.message };
        }
    }

    async toggleFollow(targetUserId, currentUserId) {
        if (!window.supabaseClient || !targetUserId || !currentUserId) return { success: false };
        if (targetUserId === currentUserId) return { success: false, error: "Cannot follow yourself" };

        try {
            // Update Target User's Followers
            const { data: targetUser } = await window.supabaseClient
                .from('users')
                .select('followers')
                .eq('id', targetUserId)
                .single();

            let followers = targetUser?.followers || [];
            let isFollowing = followers.includes(currentUserId);

            if (isFollowing) {
                followers = followers.filter(id => id !== currentUserId);
            } else {
                followers.push(currentUserId);
            }

            await window.supabaseClient
                .from('users')
                .update({ followers })
                .eq('id', targetUserId);

            // Update Current User's Following
            const { data: currentUser } = await window.supabaseClient
                .from('users')
                .select('following')
                .eq('id', currentUserId)
                .single();

            let following = currentUser?.following || [];
            if (isFollowing) {
                following = following.filter(id => id !== targetUserId);
            } else {
                following.push(targetUserId);
            }

            await window.supabaseClient
                .from('users')
                .update({ following })
                .eq('id', currentUserId);

            return { success: true, isFollowing: !isFollowing };
        } catch (err) {
            console.error('Follow toggle error:', err);
            return { success: false, error: err.message };
        }
    }

    async boostUserVibe(targetUserId, likerId) {
        if (!window.supabaseClient) return { success: true, action: 'added' };

        try {
            const { data: user, error: fetchError } = await window.supabaseClient
                .from('users')
                .select('vibe_likes')
                .eq('id', targetUserId)
                .single();

            if (fetchError) throw fetchError;

            let vibeLikes = user.vibe_likes || [];
            let action = 'added';

            if (vibeLikes.includes(likerId)) {
                vibeLikes = vibeLikes.filter(id => id !== likerId);
                action = 'removed';
            } else {
                vibeLikes.push(likerId);
            }

            const { error: updateError } = await window.supabaseClient
                .from('users')
                .update({ vibe_likes: vibeLikes })
                .eq('id', targetUserId);

            if (updateError) throw updateError;

            return { success: true, action };
        } catch (error) {
            console.error('Error boosting user vibe:', error);
            return { success: false, error: error.message };
        }
    }

    subscribeToComments(postId, callback) {
        if (!window.supabaseClient) return null;

        const channel = window.supabaseClient
            .channel(`comments:${postId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'comments',
                filter: `post_id=eq.${postId}`
            }, (payload) => {
                console.log('New comment received:', payload.new);
                if (callback) callback({ type: 'new_comment', data: payload.new });
            })
            .subscribe();

        return channel;
    }

    async getUserPosts(userId) {
        if (!window.supabaseClient) return [];

        try {
            const { data, error } = await window.supabaseClient
                .from('posts')
                .select('*, users!inner(*)')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) {
                console.error('Error fetching user posts with join:', error);
                // Fallback to non-joined query
                const fallback = await window.supabaseClient
                    .from('posts')
                    .select('*')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false })
                    .limit(50);
                if (fallback.error) return [];
                return this.mapPosts(fallback.data);
            }

            return this.mapPosts(data);
        } catch (error) {
            console.error('Error fetching user posts:', error);
            return [];
        }
    }

    subscribeToUserNotifications(userId, callback) {
        if (!window.supabaseClient) return null;

        const channel = window.supabaseClient
            .channel(`notifications:${userId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${userId}`
            }, (payload) => {
                console.log('New notification:', payload.new);
                if (callback) callback({ type: 'notification', data: payload.new });
                
                this.notifications.sendLocalNotification(
                    'New VibeHub Alert!',
                    payload.new.message || 'You have a new notification'
                );
            })
            .subscribe();

        return channel;
    }

    formatTimestamp(dateString) {
        if (!dateString) return 'Just now';
        const date = new Date(dateString);
        const now = new Date();
        const diff = Math.floor((now - date) / 1000);

        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
        return date.toLocaleDateString();
    }

    async likePost(postId, userId, postAuthor) {
        const allowed = await this.checkRateLimit(userId, 'like');
        if (!allowed) {
            return { error: 'rate_limit', message: 'Slow down! You can only like 5 times per minute' };
        }

        if (!window.supabaseClient) return;

        try {
            const { data: post } = await window.supabaseClient
                .from('posts')
                .select('likes, username')
                .eq('id', postId)
                .single();

            if (post) {
                let likes = post.likes || [];
                if (!likes.includes(userId)) {
                    likes.push(userId);
                    await window.supabaseClient
                        .from('posts')
                        .update({ likes })
                        .eq('id', postId);
                    
                    if (postAuthor && postAuthor !== userId) {
                        this.notifications.notifyLike(postAuthor, 'Someone');
                    }
                }
            }
        } catch (error) {
            console.error('Error liking post:', error);
        }
    }



    async getComments(postId) {
        if (!window.supabaseClient) return [];

        try {
            const { data } = await window.supabaseClient
                .from('comments')
                .select('*')
                .eq('post_id', postId)
                .order('created_at', { ascending: true });

            // Map flat rows to comment objects
            const flat = (data || []).map(c => ({
                id: c.id,
                parentId: c.parent_id || null,
                userId: c.user_id,
                displayName: c.username,
                avatar: c.user_avatar,
                text: c.text,
                audioUrl: c.audio_url,
                videoUrl: c.video_url,
                time: this.formatTimestamp(c.created_at),
                type: c.video_url ? 'video' : (c.audio_url ? 'audio' : 'text'),
                replies: []
            }));

            // Build tree: group children under their parent
            const map = {};
            const roots = [];
            flat.forEach(c => { map[c.id] = c; });
            flat.forEach(c => {
                if (c.parentId && map[c.parentId]) {
                    map[c.parentId].replies.push(c);
                } else {
                    roots.push(c);
                }
            });

            return roots;
        } catch (error) {
            console.error('Error fetching comments:', error);
            return [];
        }
    }

    async addComment(postId, comment) {
        if (!comment.userId) return null;

        const allowed = await this.checkRateLimit(comment.userId, 'comment');
        if (!allowed) {
            return { error: 'rate_limit', message: 'You can only comment 2 times per minute' };
        }

        if (!window.supabaseClient) return null;

        try {
            const { data, error } = await window.supabaseClient
                .from('comments')
                .insert([{
                    post_id: postId,
                    parent_id: comment.parentId || null,
                    user_id: comment.userId,
                    username: comment.displayName,
                    user_avatar: comment.avatar,
                    text: comment.text || '',
                    audio_url: comment.audioUrl || '',
                    video_url: comment.videoUrl || ''
                }])
                .select();

            if (!error && data) {
                const { data: post } = await window.supabaseClient
                    .from('posts')
                    .select('comment_count, username')
                    .eq('id', postId)
                    .single();
                
                if (post) {
                    await window.supabaseClient
                        .from('posts')
                        .update({ comment_count: (post.comment_count || 0) + 1 })
                        .eq('id', postId);
                }
                return data[0];
            }
            return null;
        } catch (error) {
            console.error('Error adding comment:', error);
            return null;
        }
    }

    async addCommentReaction(commentId, userId, reactionType) {
        if (!window.supabaseClient) return { success: true, action: 'added' };

        try {
            // Check if user already reacted with this type
            const { data: existing } = await window.supabaseClient
                .from('comment_reactions')
                .select('*')
                .eq('comment_id', commentId)
                .eq('user_id', userId)
                .eq('reaction_type', reactionType)
                .single();

            if (existing) {
                // Toggle off
                await window.supabaseClient
                    .from('comment_reactions')
                    .delete()
                    .eq('id', existing.id);
                return { success: true, action: 'removed' };
            } else {
                // Add
                await window.supabaseClient
                    .from('comment_reactions')
                    .insert([{
                        comment_id: commentId,
                        user_id: userId,
                        reaction_type: reactionType
                    }]);
                return { success: true, action: 'added' };
            }
        } catch (error) {
            console.error('Error toggling comment reaction:', error);
            return { success: false };
        }
    }

    async getCommentReactions(commentId) {
        if (!window.supabaseClient) return {};

        try {
            const { data } = await window.supabaseClient
                .from('comment_reactions')
                .select('reaction_type')
                .eq('comment_id', commentId);

            const counts = {};
            (data || []).forEach(r => {
                counts[r.reaction_type] = (counts[r.reaction_type] || 0) + 1;
            });
            return counts;
        } catch (error) {
            console.error('Error fetching comment reactions:', error);
            return {};
        }
    }

    async getCommunities() {
        if (!window.supabaseClient) {
            return [
                { id: 'c1', name: 'Synthwave Lovers', members: '12.4k', banner: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=400', desc: 'Retrofuturistic vibes only.' },
                { id: 'c2', name: 'Deep Psychology', members: '8.2k', banner: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400', desc: 'Exploring the linked mind.' }
            ];
        }

        try {
            const { data } = await window.supabaseClient
                .from('communities')
                .select('*')
                .order('created_at', { ascending: false });

            return (data || []).map(c => ({
                id: c.id,
                name: c.name,
                description: c.description,
                members: c.member_count || 0,
                banner: c.banner_url || 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=400',
                desc: c.description
            }));
        } catch (error) {
            console.error('Error fetching communities:', error);
            return [];
        }
    }

    async createCommunity(name, description, bannerUrl, creatorId) {
        if (!window.supabaseClient) {
            return { id: 'c_' + Date.now(), name, members: 1 };
        }

        try {
            const { data, error } = await window.supabaseClient
                .from('communities')
                .insert([{
                    name: name,
                    description: description,
                    banner_url: bannerUrl,
                    creator_id: creatorId,
                    member_count: 1
                }])
                .select()
                .single();

            if (error) throw error;
            
            // Add creator as first member
            await window.supabaseClient
                .from('community_members')
                .insert([{
                    community_id: data.id,
                    user_id: creatorId,
                    role: 'owner'
                }]);

            return { id: data.id, name: data.name, members: 1 };
        } catch (error) {
            console.error('Error creating community:', error);
            return null;
        }
    }

    async joinCommunity(communityId, userId) {
        if (!window.supabaseClient) return true;

        try {
            await window.supabaseClient
                .from('community_members')
                .insert([{
                    community_id: communityId,
                    user_id: userId
                }]);

            // Increment member count
            await window.supabaseClient.rpc('increment_community_members', { community_id: communityId });
            
            return true;
        } catch (error) {
            console.error('Error joining community:', error);
            return false;
        }
    }

    async getFriends(userId) {
        if (!userId) return [];
        
        if (!window.supabaseClient) {
            return [
                { id: 'f1', username: 'cyber_soul', displayName: 'Cyber Soul', avatar: 'https://i.pravatar.cc/150?u=cs' },
                { id: 'f2', username: 'neon_dreamer', displayName: 'Neon Dreamer', avatar: 'https://i.pravatar.cc/150?u=nd' }
            ];
        }

        try {
            const { data } = await window.supabaseClient
                .from('friends')
                .select('friend_id, friend:friend_id(*)')
                .eq('user_id', userId);

            return (data || []).map(f => ({
                id: f.friend_id,
                username: f.friend?.username || 'unknown',
                displayName: f.friend?.display_name || f.friend?.username || 'User',
                avatar: f.friend?.avatar_url || 'https://i.pravatar.cc/150?u=' + f.friend_id
            }));
        } catch (error) {
            console.error('Error fetching friends:', error);
            return [];
        }
    }

    async addFriend(userId, friendId) {
        if (!window.supabaseClient) return true;

        try {
            await window.supabaseClient
                .from('friends')
                .insert([{ user_id: userId, friend_id: friendId }]);
            return true;
        } catch (error) {
            console.error('Error adding friend:', error);
            return false;
        }
    }

    async getFriendsPosts(userId) {
        if (!userId) return [];
        
        if (!window.supabaseClient) {
            return [
                {
                    id: 'fp1',
                    userId: 'f1',
                    displayName: 'Cyber Soul',
                    handle: 'cyber_soul',
                    avatar: 'https://i.pravatar.cc/150?u=cs',
                    content: 'Just vibing in the Neon Matrix today. Anyone else linked?',
                    media: '',
                    mediaType: 'none',
                    timestamp: '2h ago',
                    reactions: { like: 12, heat: 5, wild: 2, cap: 0, admire: 8, dislike: 0 }
                },
                {
                    id: 'fp2',
                    userId: 'f2',
                    displayName: 'Neon Dreamer',
                    handle: 'neon_dreamer',
                    avatar: 'https://i.pravatar.cc/150?u=nd',
                    content: 'Check out this new synth track I made! Link in bio.',
                    media: '',
                    mediaType: 'none',
                    timestamp: '5h ago',
                    reactions: { like: 45, heat: 20, wild: 0, cap: 0, admire: 12, dislike: 1 }
                }
            ];
        }

        try {
            // Get friends' IDs
            const { data: friends } = await window.supabaseClient
                .from('friends')
                .select('friend_id')
                .eq('user_id', userId);

            if (!friends || friends.length === 0) return [];

            const friendIds = friends.map(f => f.friend_id);

            // Get friends' posts
            const { data } = await window.supabaseClient
                .from('posts')
                .select('*')
                .in('user_id', friendIds)
                .gt('expires_at', new Date().toISOString())
                .order('created_at', { ascending: false })
                .limit(50);

            return (data || []).map(post => ({
                id: post.id,
                userId: post.user_id,
                displayName: post.username,
                handle: post.username,
                avatar: post.user_avatar,
                content: post.text,
                media: post.media_url,
                mediaType: post.media_type,
                timestamp: this.formatTimestamp(post.created_at),
                reactions: {
                    like: post.likes?.length || 0,
                    heat: post.reactions?.heat?.length || 0,
                    wild: post.reactions?.wild?.length || 0,
                    cap: post.reactions?.cap?.length || 0,
                    admire: post.reactions?.relate?.length || 0,
                    dislike: post.dislikes?.length || 0
                }
            }));
        } catch (error) {
            console.error('Error fetching friends posts:', error);
            return [];
        }
    }

    async createAdPost(content, mediaUrl, mediaType, linkUrl) {
        if (!window.supabaseClient) return null;

        try {
            const { data, error } = await window.supabaseClient
                .from('ads')
                .insert([{
                    content,
                    media_url: mediaUrl,
                    media_type: mediaType,
                    link_url: linkUrl
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating ad:', error);
            return null;
        }
    }

    async getAds() {
        if (!window.supabaseClient) return [];
        try {
            const { data } = await window.supabaseClient
                .from('ads')
                .select('*')
                .order('created_at', { ascending: false });
            return data || [];
        } catch (e) { return []; }
    }

    async getMarketplace() {
        if (!window.supabaseClient) {
            return [
                { id: 'm1', title: 'Cyberpunk Jacket', price: '120 VIBE', seller: 'neon_junkie', image: 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=400' },
                { id: 'm2', title: 'Mindful Headset', price: '450 VIBE', seller: 'tech_zen', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400' }
            ];
        }

        try {
            const { data } = await window.supabaseClient
                .from('marketplace')
                .select('*')
                .eq('status', 'active')
                .order('created_at', { ascending: false });

            return (data || []).map(m => ({
                id: m.id,
                title: m.title,
                description: m.description,
                price: m.price + ' VIBE',
                seller: m.seller_username,
                category: m.category,
                image: m.image_url
            }));
        } catch (error) {
            console.error('Error fetching marketplace:', error);
            return [];
        }
    }

    async updateUserProfile(userId, updates) {
        if (!window.supabaseClient) return null;

        try {
            const { data } = await window.supabaseClient
                .from('users')
                .update(updates)
                .eq('id', userId)
                .select()
                .single();

            return data;
        } catch (error) {
            console.error('Error updating profile:', error);
            return null;
        }
    }

    async getUserProfile(userId) {
        if (!window.supabaseClient) return null;

        try {
            const { data } = await window.supabaseClient
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();

            if (data) {
                data.badgeList = calculateUserBadges(data);
                data.displayName = data.name;
                data.handle = data.username;
                data.profilePhoto = data.avatar_url;
                data.bannerImage = data.banner_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200';
            }
            return data;
        } catch (error) {
            console.error('Error fetching profile:', error);
            return null;
        }
    }
}

// ============================================
// VIDEO SERVICE - VibeStream
// ============================================
export class VideoService {
    async getVibeStream() {
        if (!window.supabaseClient) {
            return [
                { id: 'v1', url: 'https://assets.mixkit.io/videos/preview/mixkit-digital-animation-of-a-blue-and-purple-energy-field-42994-large.mp4', user: 'visual_guru', caption: 'Frequency meditation ðŸŒ€' },
                { id: 'v2', url: 'https://assets.mixkit.io/videos/preview/mixkit-abstract-laser-lights-background-34241-large.mp4', user: 'neon_artist', caption: 'Light show experiment #neon' }
            ];
        }

        try {
            const { data } = await window.supabaseClient
                .from('videos')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20);

            return (data || []).map(v => ({
                id: v.id,
                url: v.video_url,
                title: v.title,
                description: v.description,
                thumbnail: v.emoji_thumbnail,
                tags: v.tags,
                views: v.views,
                createdAt: v.created_at
            }));
        } catch (error) {
            console.error('Error fetching videos:', error);
            return [];
        }
    }

    async uploadMedia(blob, type) {
        if (!window.CLOUDINARY_CONFIG) return null;
        
        const formData = new FormData();
        formData.append('file', blob);
        formData.append('upload_preset', type === 'audio' ? 'vibehub_audio' : 'vibehub_videos');
        formData.append('cloud_name', window.CLOUDINARY_CONFIG.cloudName);
        
        try {
            const response = await fetch(`https://api.cloudinary.com/v1_1/${window.CLOUDINARY_CONFIG.cloudName}/${type}/upload`, {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            return data.secure_url;
        } catch (e) {
            console.error('Media upload failed:', e);
            return null;
        }
    }

    // --- LIVE STREAMING ---
    async startLive(userId, username) {
        if (!window.supabaseClient) return true;
        try {
            await window.supabaseClient
                .from('live_streams')
                .insert([{
                    user_id: userId,
                    username: username,
                    status: 'online',
                    started_at: new Date().toISOString()
                }]);
            return true;
        } catch (e) {
            console.error('Error starting live:', e);
            return false;
        }
    }

    async endLive(userId) {
        if (!window.supabaseClient) return true;
        try {
            await window.supabaseClient
                .from('live_streams')
                .delete()
                .eq('user_id', userId);
            return true;
        } catch (e) {
            console.error('Error ending live:', e);
            return false;
        }
    }

    async getLiveStreams() {
        if (!window.supabaseClient) return [];
        try {
            const { data } = await window.supabaseClient
                .from('live_streams')
                .select('*')
                .eq('status', 'online');
            return data || [];
        } catch (e) {
            return [];
        }
    }

    subscribeToLiveStreams(callback) {
        if (!window.supabaseClient) return null;
        return window.supabaseClient
            .channel('live_streams_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'live_streams' }, (payload) => {
                callback(payload);
            })
            .subscribe();
    }
}

// ============================================
// CHAT SERVICE - Sync Rooms & DMs
// ============================================
export class ChatService {
    constructor() {
        this.activeRoom = null;
        this.roomChannel = null;
    }

    async getSyncRooms() {
        if (!window.supabaseClient) {
            return [
                { id: 'r1', name: 'Neon Nights', users: 42, active: true },
                { id: 'r2', name: 'The Void', users: 15, active: true },
                { id: 'r3', name: 'Zen Garden', users: 8, active: true }
            ];
        }

        try {
            // Get active rooms that haven't expired
            const { data } = await window.supabaseClient
                .from('rooms')
                .select('*')
                .gt('expires_at', new Date().toISOString())
                .order('created_at', { ascending: false });

            return (data || []).map(s => ({
                id: s.id,
                name: s.name,
                description: s.description || '',
                users: s.current_user_count || 0,
                active: s.current_user_count < s.max_users,
                maxUsers: s.max_users,
                expiresAt: s.expires_at,
                createdAt: s.created_at
            }));
        } catch (error) {
            console.error('Error fetching sync rooms:', error);
            return [];
        }
    }

    async createRoom(name, creatorId) {
        if (!window.supabaseClient) {
            return { id: 'room_' + Date.now(), name, users: 0, active: true };
        }

        try {
            const { data, error } = await window.supabaseClient
                .from('rooms')
                .insert([{
                    name: name,
                    creator_id: creatorId,
                    max_users: 125,
                    current_user_count: 1,
                    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
                }])
                .select()
                .single();

            if (error) throw error;
            return { id: data.id, name: data.name, users: 1, active: true };
        } catch (error) {
            console.error('Error creating room:', error);
            return null;
        }
    }

    async joinRoom(roomId, userId, username) {
        if (!window.supabaseClient) {
            this.activeRoom = roomId;
            return true;
        }

        try {
            // Check current count
            const { data: room } = await window.supabaseClient
                .from('rooms')
                .select('current_user_count, max_users')
                .eq('id', roomId)
                .single();

            if (!room || room.current_user_count >= room.max_users) {
                return false; // Room full
            }

            // Increment user count
            await window.supabaseClient
                .from('rooms')
                .update({ current_user_count: room.current_user_count + 1 })
                .eq('id', roomId);

            this.activeRoom = roomId;
            return true;
        } catch (error) {
            console.error('Error joining room:', error);
            return false;
        }
    }

    async leaveRoom(roomId, userId) {
        if (!window.supabaseClient || !roomId) return;

        try {
            const { data: room } = await window.supabaseClient
                .from('rooms')
                .select('current_user_count')
                .eq('id', roomId)
                .single();

            if (room) {
                await window.supabaseClient
                    .from('rooms')
                    .update({ current_user_count: Math.max(0, room.current_user_count - 1) })
                    .eq('id', roomId);
            }
        } catch (error) {
            console.error('Error leaving room:', error);
        }

        this.activeRoom = null;
        if (this.roomChannel) {
            this.roomChannel.unsubscribe();
            this.roomChannel = null;
        }
    }

    subscribeToRoomUpdates(roomId, callback) {
        if (!window.supabaseClient) return;

        return window.supabaseClient
            .channel(`room-updates-${roomId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'rooms',
                filter: `id=eq.${roomId}`
            }, (payload) => {
                callback(payload.new);
            })
            .subscribe();
    }

    subscribeToRoomMessages(roomId, callback) {
        if (!window.supabaseClient) return;

        this.roomChannel = window.supabaseClient
            .channel(`room-${roomId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'room_messages',
                filter: `room_id=eq.${roomId}`
            }, (payload) => {
                callback(payload.new);
            })
            .subscribe();

        return this.roomChannel;
    }

    async sendRoomMessage(roomId, userId, username, content, type = 'text', messageId = null) {
        if (!window.supabaseClient) {
            // Mock message for demo
            return { id: 'msg_' + Date.now(), room_id: roomId, username, content, type, message_id: messageId };
        }

        try {
            const { data, error } = await window.supabaseClient
                .from('room_messages')
                .insert([{
                    room_id: roomId,
                    user_id: userId,
                    username: username,
                    content: content,
                    type: type,
                    message_id: messageId
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error sending message:', error);
            return null;
        }
    }

    async getMessages(conversationId) {
        if (!window.supabaseClient) return [];

        try {
            // If conversationId provided, get messages for that conversation
            if (conversationId) {
                const { data, error } = await window.supabaseClient
                    .from('messages')
                    .select('*')
                    .eq('conversation_id', conversationId)
                    .order('created_at', { ascending: true });
                
                if (error) throw error;
                return (data || []).map(m => ({
                    id: m.id,
                    senderId: m.sender_id,
                    sender: m.sender_username,
                    text: m.text,
                    time: this.formatTimestamp(m.created_at),
                    unread: !m.read
                }));
            }
            
            // Otherwise, get all recent messages for the current user
            const { data, error } = await window.supabaseClient
                .from('messages')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);
            
            if (error) throw error;

            return (data || []).map(m => ({
                id: m.id,
                userId: m.sender_id,
                id: m.id,
                user: m.sender_username || 'Unknown',
                lastMsg: m.text || '',
                time: this.formatTimestamp(m.created_at),
                unread: !m.read
            }));
        } catch (error) {
            console.error('Error fetching messages:', error);
            return [];
        }
    }

    async sendMessage(receiverId, text, sender) {
        if (!window.supabaseClient) return null;

        try {
            const { data } = await window.supabaseClient
                .from('messages')
                .insert([{
                    conversation_id: [sender.id, receiverId].sort().join('_'),
                    sender_id: sender.id,
                    sender_username: sender.username,
                    receiver_id: receiverId,
                    text: text,
                    read: false
                }])
                .select();

            return data?.[0];
        } catch (error) {
            console.error('Error sending message:', error);
            return null;
        }
    }
}

// ============================================
// ADMIN SERVICE
// ============================================
export class AdminService {
    async getStats() {
        if (!window.supabaseClient) {
            return { users: 12482, activeNow: 1205, postsToday: 458, revenue: '$1,240' };
        }
        
        try {
            const { count: users } = await window.supabaseClient.from('users').select('*', { count: 'exact', head: true });
            const { count: posts } = await window.supabaseClient.from('posts').select('*', { count: 'exact', head: true });
            return { users, activeNow: Math.floor(Math.random() * 100), postsToday: posts, revenue: '$1,240' };
        } catch (e) {
            return { users: 0, activeNow: 0, postsToday: 0, revenue: '$0' };
        }
    }

    async getReportedPosts() {
        if (!window.supabaseClient) return [];
        try {
            const { data } = await window.supabaseClient
                .from('reported_posts')
                .select('id, post_id, reason, post:post_id(text, username)')
                .eq('status', 'pending');
            return data || [];
        } catch (e) { return []; }
    }

    async deletePost(postId) {
        if (!window.supabaseClient) return;
        await window.supabaseClient.from('posts').delete().eq('id', postId);
        await window.supabaseClient.from('reported_posts').update({ status: 'resolved' }).eq('post_id', postId);
    }

    async banUser(userId) {
        if (!window.supabaseClient) return;
        await window.supabaseClient.from('banned_users').insert([{ user_id: userId }]);
        await window.supabaseClient.from('users').update({ banned: true }).eq('id', userId);
    }

    async getDetailedStats() {
        if (!window.supabaseClient) return this.getStats();

        try {
            const [usersCount, postsCount] = await Promise.all([
                window.supabaseClient.from('users').select('id', { count: 'exact' }),
                window.supabaseClient.from('posts').select('id', { count: 'exact' })
            ]);
            return { users: usersCount.count, activeNow: 0, postsToday: postsCount.count, revenue: '$0' };
        } catch (e) {
            return { users: 0, activeNow: 0, postsToday: 0, revenue: '$0' };
        }
    }

    async submitAd(content, mediaUrl, link) {
        if (!window.supabaseClient) return { success: true };
        try {
            await window.supabaseClient.from('sponsored_ads').insert([{
                content: content,
                media_url: mediaUrl,
                media_type: mediaUrl ? 'image' : 'none',
                link: link
            }]);
            return { success: true };
        } catch (e) {
            console.error('Error adding ad:', e);
            return { error: 'Failed to post ad' };
        }
    }

    async reportContent(type, targetId, reporterId) {
        if (!window.supabaseClient) return true;
        try {
            await window.supabaseClient
                .from('reports')
                .insert([{
                    type,
                    target_id: targetId,
                    reporter_id: reporterId,
                    status: 'pending'
                }]);
            return true;
        } catch (error) {
            console.error('Error reporting content:', error);
            return false;
        }
    }

    async getModerationQueue() {
        if (!window.supabaseClient) return [];
        try {
            const { data } = await window.supabaseClient
                .from('reports')
                .select('*, users!inner(*)') 
                .eq('status', 'pending');
            return data || [];
        } catch (e) {
            return [];
        }
    }
}
