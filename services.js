/**
 * VIBEHUB SERVICE LAYER
 * All cloud services integrated: Supabase, Cloudinary, ImageKit, Clerk, Redis, Firebase
 */

// ============================================
// MEDIA SERVICE - Cloudinary (Videos) + ImageKit (Photos)
// ============================================
class MediaService {
    constructor() {
        this.cloudinaryConfig = window.CLOUDINARY_CONFIG || null;
        this.imagekitConfig = window.IMAGEKIT_CONFIG || null;
    }

    async uploadImage(file) {
        if (!file) return null;
        
        console.log('Uploading image to ImageKit...');
        
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('fileName', `vibehub_${Date.now()}_${file.name}`);
            formData.append('publicKey', this.imagekitConfig?.publicKey || 'public_MImYpMzXVx4PGa/mecXw6V3tw90=');
            
            const response = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error('ImageKit upload failed');
            }
            
            const data = await response.json();
            console.log('Image uploaded to ImageKit:', data);
            
            return {
                url: data.url,
                thumbnailUrl: data.thumbnailUrl || data.url,
                fileId: data.fileId,
                type: 'image'
            };
        } catch (error) {
            console.error('ImageKit upload error:', error);
            return await this.uploadImageFallback(file);
        }
    }

    async uploadImageFallback(file) {
        console.log('Trying Cloudinary fallback for image...');
        
        return new Promise((resolve) => {
            if (window.cloudinary && this.cloudinaryConfig) {
                const uploadWidget = window.cloudinary.createUploadWidget({
                    cloudName: this.cloudinaryConfig.cloudName,
                    uploadPreset: 'vibehub_images',
                    sources: ['local'],
                    maxFileSize: 5000000
                }, (error, result) => {
                    if (!error && result && result.event === 'success') {
                        resolve({
                            url: result.info.secure_url,
                            thumbnailUrl: result.info.secure_url,
                            fileId: result.info.public_id,
                            type: 'image'
                        });
                    } else if (error) {
                        console.error('Cloudinary error:', error);
                        resolve(this.createLocalPreview(file));
                    }
                });
                uploadWidget.open();
            } else {
                resolve(this.createLocalPreview(file));
            }
        });
    }

    async uploadVideo(file) {
        if (!file) return null;
        
        console.log('Uploading video to Cloudinary...');
        
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', 'vibehub_videos');
            formData.append('cloud_name', this.cloudinaryConfig?.cloudName || 'dg35zlppj');
            
            const response = await fetch(`https://api.cloudinary.com/v1_1/${this.cloudinaryConfig?.cloudName || 'dg35zlppj'}/video/upload`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error('Cloudinary upload failed');
            }
            
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
            return this.createLocalPreview(file);
        }
    }

    createLocalPreview(file) {
        const reader = new FileReader();
        return new Promise((resolve) => {
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
        if (url.includes('ik.imagekit.io')) {
            return `${url}?tr=w-${width},q-80,f-auto`;
        }
        if (url.includes('cloudinary.com')) {
            return url.replace('/upload/', `/upload/w_${width},q_80,f_auto/`);
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
class CacheService {
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
class NotificationService {
    constructor() {
        this.token = null;
        this.enabled = !!(window.firebaseApp);
    }

    async requestPermission() {
        if (!this.enabled) {
            console.log('Firebase not available, using browser notifications');
            return await this.requestBrowserPermission();
        }

        try {
            const messaging = window.messaging || (await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging.js')).getMessaging(window.firebaseApp);
            
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                this.token = await getToken(messaging, {
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
            'New Like! 💜',
            `${likerName} liked your vibe!`,
            'https://i.ibb.co/Fqnj3JKp/1000001392.png'
        );
    }

    async notifyComment(postAuthor, commenterName, comment) {
        await this.sendLocalNotification(
            'New Comment! 💬',
            `${commenterName}: ${comment.substring(0, 50)}...`,
            'https://i.ibb.co/Fqnj3JKp/1000001392.png'
        );
    }

    async notifyFollow(followerName, userName) {
        await this.sendLocalNotification(
            'New Follower! ✨',
            `${followerName} is now following you!`,
            'https://i.ibb.co/Fqnj3JKp/1000001392.png'
        );
    }
}

// ============================================
// AUTH SERVICE - Clerk + Supabase
// ============================================
class AuthService {
    constructor() {
        this.user = JSON.parse(localStorage.getItem('vibehub_user')) || null;
        this.clerk = null;
        this.clerkInitialized = false;
    }

    async initClerk() {
        if (this.clerkInitialized) return;
        
        // Wait for Clerk to be ready
        const waitForClerk = () => {
            return new Promise((resolve) => {
                const check = () => {
                    if (window.clerk && window.clerkReady) {
                        resolve();
                    } else {
                        setTimeout(check, 100);
                    }
                };
                check();
            });
        };

        await waitForClerk();
        this.clerk = window.clerk;
        this.clerkInitialized = true;
        
        // Listen for session changes
        if (this.clerk) {
            this.clerk.addListener('sessionChanged', async (session) => {
                if (session) {
                    await this.handleClerkSession();
                } else {
                    this.logout();
                }
            });
            
            // Check existing session
            const session = await this.clerk.session;
            if (session) {
                await this.handleClerkSession();
            }
        }
    }

    checkSession() {
        return this.user;
    }

    async handleClerkSession() {
        if (!this.clerk) return null;
        
        try {
            const clerkUser = this.clerk.user;
            if (!clerkUser) return null;

            const clerkId = clerkUser.id;
            const email = clerkUser.primaryEmailAddress?.emailAddress || '';
            const firstName = clerkUser.firstName || '';
            const lastName = clerkUser.lastName || '';
            const displayName = clerkUser.fullName || firstName || email.split('@')[0];
            const username = clerkUser.username || email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '_');
            const avatar = clerkUser.imageUrl || `https://i.pravatar.cc/150?u=${clerkId}`;

            // Check if user exists in Supabase
            let supabaseUser = null;
            if (window.supabaseClient) {
                try {
                    const { data } = await window.supabaseClient
                        .from('users')
                        .select('*')
                        .eq('clerk_id', clerkId)
                        .single();
                    
                    if (data) {
                        supabaseUser = data;
                    }
                } catch (e) {
                    console.log('User not found in Supabase, creating...');
                }
            }

            // Create or update user in Supabase
            let userData;
            if (supabaseUser) {
                userData = supabaseUser;
            } else {
                userData = {
                    id: 'u_' + Date.now(),
                    clerk_id: clerkId,
                    username: username,
                    email: email,
                    name: displayName,
                    avatar_url: avatar,
                    bio: 'New to VibeHub!',
                    followers: [],
                    following: [],
                    vibe_score: 0,
                    role: 'user',
                    created_at: new Date().toISOString()
                };

                if (window.supabaseClient) {
                    try {
                        const { data } = await window.supabaseClient
                            .from('users')
                            .insert([userData])
                            .select()
                            .single();
                        if (data) userData = data;
                    } catch (e) {
                        console.error('Error creating user in Supabase:', e);
                    }
                }
            }

            // Create app user object
            const user = {
                id: userData.id,
                clerkId: clerkId,
                username: userData.username || username,
                displayName: userData.name || displayName,
                email: email,
                profilePhoto: userData.avatar_url || avatar,
                bannerImage: userData.banner_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200',
                bio: userData.bio || 'New to VibeHub!',
                followersCount: userData.followers?.length || 0,
                followingCount: userData.following?.length || 0,
                postCount: userData.post_count || 0,
                reactionScore: userData.vibe_score || 0,
                badgeList: userData.verified ? ['Verified'] : [],
                isSuperAdmin: false,
                createdAt: userData.created_at || new Date().toISOString()
            };

            this.user = user;
            localStorage.setItem('vibehub_user', JSON.stringify(user));
            
            // Notify app of login
            window.dispatchEvent(new CustomEvent('user-logged-in', { detail: user }));
            
            return user;
        } catch (error) {
            console.error('Error handling Clerk session:', error);
            return null;
        }
    }

    async openSignIn() {
        if (!this.clerk) {
            console.warn('Clerk not initialized');
            return;
        }
        
        try {
            await this.clerk.openSignIn({
                appearance: {
                    elements: {
                        rootBox: {
                            zIndex: '10000'
                        }
                    }
                },
                redirectUrl: window.location.href
            });
        } catch (error) {
            console.error('Error opening Clerk sign in:', error);
        }
    }

    async openSignUp() {
        if (!this.clerk) {
            console.warn('Clerk not initialized');
            return;
        }
        
        try {
            await this.clerk.openSignUp({
                appearance: {
                    elements: {
                        rootBox: {
                            zIndex: '10000'
                        }
                    }
                },
                redirectUrl: window.location.href
            });
        } catch (error) {
            console.error('Error opening Clerk sign up:', error);
        }
    }

    async login(email, password, isAdmin = false) {
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
                localStorage.setItem('vibehub_user', JSON.stringify(user));
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
        window.dispatchEvent(new CustomEvent('user-logged-out'));
    }
}

// ============================================
// DATA SERVICE - Supabase Posts, Comments, etc
// ============================================
// DATA SERVICE - Supabase Posts, Comments, etc
// ============================================
class DataService {
    constructor() {
        this.media = new MediaService();
        this.cache = new CacheService();
        this.notifications = new NotificationService();
        this.loadSampleDataIfEmpty();
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
                bio: 'Neon dreams in a digital world. 🏙️✨',
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
                bio: 'Is anyone else vibing on the new Sync Room features? ⚡',
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
                mood: '🧠',
                likes: ['u2', 'u3'],
                dislikes: [],
                reactions: { cap: ['u2'], relate: ['u3'], wild: ['u2'], facts: [] },
                comment_count: 1
            },
            {
                user_id: 'u2',
                username: 'cyber_soul', 
                user_avatar: 'https://i.pravatar.cc/150?u=vibehub2',
                text: 'Neon dreams in a digital world. The city never sleeps, and neither does the vibe. 🏙️✨ #neon',
                media_url: '',
                media_type: 'none',
                tags: ['neon'],
                mood: '🌃',
                likes: ['u1'],
                dislikes: [],
                reactions: { cap: [], relate: ['u1'], wild: [], facts: [] },
                comment_count: 0
            },
            {
                user_id: 'u3',
                username: 'future_ghost',
                user_avatar: 'https://i.pravatar.cc/150?u=vibehub3', 
                text: "Is anyone else vibing on the new Sync Room features? The energy in there is unreal! ⚡💬",
                media_url: '',
                media_type: 'none',
                tags: ['syncrooms'],
                mood: '⚡',
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
                    category: '🎵 Music',
                    emoji_banner: '🌃',
                    subscribers: ['u1', 'u2', 'u3']
                },
                {
                    owner_id: 'u2', 
                    name: 'Deep Psychology',
                    description: 'Exploring the linked mind and consciousness.',
                    category: '🧠 Science',
                    emoji_banner: '🔮',
                    subscribers: ['u1', 'u3']
                }
            ];

            await window.supabaseClient.from('channels').insert(sampleChannels);
            console.log('✅ Sample data loaded!');
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
                comment_count: 0
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
        if (cached) {
            console.log('Returning cached posts');
            return cached;
        }

        try {
            let query = window.supabaseClient
                .from('posts')
                .select('*')
                .order('created_at', { ascending: false });

            if (communityId) {
                query = query.eq('communityId', communityId);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching posts:', error);
                return [];
            }

            if (data) {
                const transformedPosts = data.map(post => ({
                    id: post.id,
                    userId: post.user_id,
                    displayName: post.username,
                    handle: post.username,
                    avatar: post.user_avatar,
                    content: post.text,
                    media: post.media_url,
                    mediaType: post.media_type,
                    type: post.media_type === 'none' ? 'text' : post.media_type,
                    engagement: (post.likes?.length || 0) + (post.reactions?.cap?.length || 0),
                    reactions: {
                        like: post.likes?.length || 0,
                        heat: post.reactions?.wild?.length || 0,
                        wild: post.reactions?.wild?.length || 0,
                        cap: post.reactions?.cap?.length || 0,
                        admire: post.reactions?.relate?.length || 0,
                        dislike: post.dislikes?.length || 0
                    },
                    likes: post.likes || [],
                    dislikes: post.dislikes || [],
                    postReactions: post.reactions || { cap: [], relate: [], wild: [], facts: [] },
                    comments: [],
                    commentCount: post.comment_count || 0,
                    timestamp: this.formatTimestamp(post.created_at),
                    isSponsored: false,
                    tab: 'all',
                    createdAt: post.created_at
                }));

                transformedPosts.forEach(post => {
                    post.vibeScore = this.calculateVibeScore(post);
                });

                if (tab === 'trending') {
                    return transformedPosts
                        .filter(p => p.tab === 'trending' || p.isSponsored)
                        .sort((a, b) => b.vibeScore - a.vibeScore);
                }
                if (tab === 'we-vibin') {
                    return transformedPosts.filter(p => p.tab === 'we-vibin' || p.isSponsored);
                }
                
                await this.cache.cachePosts(cacheKey, transformedPosts, 30);
                return transformedPosts;
            }

            return [];
        } catch (error) {
            console.error('Error fetching posts:', error);
            return [];
        }
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

    async addReaction(postId, userId, reactionType) {
        if (!window.supabaseClient) return;

        try {
            const { data: post } = await window.supabaseClient
                .from('posts')
                .select('reactions')
                .eq('id', postId)
                .single();

            if (post) {
                const reactions = post.reactions || { cap: [], relate: [], wild: [], facts: [] };
                if (!reactions[reactionType]) {
                    reactions[reactionType] = [];
                }
                if (!reactions[reactionType].includes(userId)) {
                    reactions[reactionType].push(userId);
                    await window.supabaseClient
                        .from('posts')
                        .update({ reactions })
                        .eq('id', postId);
                }
            }
        } catch (error) {
            console.error('Error adding reaction:', error);
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

            return (data || []).map(c => ({
                id: c.id,
                userId: c.user_id,
                displayName: c.username,
                avatar: c.user_avatar,
                text: c.text,
                audioUrl: c.audio_url,
                time: this.formatTimestamp(c.created_at),
                type: c.audio_url ? 'audio' : 'text'
            }));
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
                    user_id: comment.userId,
                    username: comment.displayName,
                    user_avatar: comment.avatar,
                    text: comment.text,
                    audio_url: comment.audioUrl || ''
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

    async getCommunities() {
        if (!window.supabaseClient) {
            return [
                { id: 'c1', name: 'Synthwave Lovers', members: '12.4k', banner: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=400', desc: 'Retrofuturistic vibes only.' },
                { id: 'c2', name: 'Deep Psychology', members: '8.2k', banner: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400', desc: 'Exploring the linked mind.' }
            ];
        }

        try {
            const { data } = await window.supabaseClient
                .from('channels')
                .select('*')
                .order('created_at', { ascending: false });

            return (data || []).map(c => ({
                id: c.id,
                name: c.name,
                description: c.description,
                category: c.category,
                emojiBanner: c.emoji_banner,
                members: c.subscribers?.length || 0,
                banner: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=400',
                desc: c.description
            }));
        } catch (error) {
            console.error('Error fetching communities:', error);
            return [];
        }
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
class VideoService {
    async getVibeStream() {
        if (!window.supabaseClient) {
            return [
                { id: 'v1', url: 'https://assets.mixkit.io/videos/preview/mixkit-digital-animation-of-a-blue-and-purple-energy-field-42994-large.mp4', user: 'visual_guru', caption: 'Frequency meditation 🌀' },
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
}

// ============================================
// CHAT SERVICE - Sync Rooms & DMs
// ============================================
class ChatService {
    async getSyncRooms() {
        if (!window.supabaseClient) {
            return [
                { id: 'r1', name: 'Neon Nights', users: 42, active: true },
                { id: 'r2', name: 'The Void', users: 15, active: true },
                { id: 'r3', name: 'Zen Garden', users: 8, active: true }
            ];
        }

        try {
            const { data } = await window.supabaseClient
                .from('sync_spaces')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            return (data || []).map(s => ({
                id: s.id,
                name: s.name,
                description: s.description,
                users: s.active_users?.length || 0,
                active: s.is_active,
                createdAt: s.created_at
            }));
        } catch (error) {
            console.error('Error fetching sync rooms:', error);
            return [];
        }
    }

    async getMessages() {
        return [];
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
class AdminService {
    getStats() {
        return {
            users: 12482,
            activeNow: 1205,
            postsToday: 458,
            revenue: '$1,240'
        };
    }

    async getDetailedStats() {
        if (!window.supabaseClient) return this.getStats();

        try {
            const [usersCount, postsCount] = await Promise.all([
                window.supabaseClient.from('users').select('id', { count: 'exact' }),
                window.supabaseClient.from('posts').select('id', { count: 'exact' })
            ]);

            return {
                users: usersCount.count || 0,
                posts: postsCount.count || 0,
                activeNow: Math.floor(Math.random() * 500) + 100,
                postsToday: Math.floor(Math.random() * 100) + 10,
                revenue: '$1,240'
            };
        } catch (error) {
            console.error('Error fetching stats:', error);
            return this.getStats();
        }
    }
}
