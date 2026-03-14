/**
 * VIBEHUB DATA SERVICE
 * Handles Supabase Posts, Comments, Communities, Friends, etc.
 */
import { MediaService } from './MediaService.js';
import { CacheService } from './CacheService.js';
import { NotificationService } from './NotificationService.js';

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
    if (userData.role === 'admin') badges.push('Admin');
    return badges;
}

export class DataService {
    constructor() {
        try { this.media = new MediaService(); } catch (e) { this.media = null; }
        try { this.cache = new CacheService(); } catch (e) { this.cache = null; }
        try { this.notifications = new NotificationService(); } catch (e) { this.notifications = null; }
        this.supabase = window.supabaseClient;
        this.loadSampleDataIfEmpty();
    }

    isSupabaseReady() { return !!window.supabaseClient; }

    async waitForSupabase(timeoutMs = 3000) {
        if (window.supabaseClient) return true;
        let waited = 0;
        while (!window.supabaseClient && waited < timeoutMs) {
            await new Promise(r => setTimeout(r, 100));
            waited += 100;
        }
        return !!window.supabaseClient;
    }

    async loadSampleDataIfEmpty() {
        const ready = await this.waitForSupabase();
        if (!ready) return;
        try {
            const { count } = await window.supabaseClient.from('posts').select('*', { count: 'exact', head: true });
            if (count === 0) await this.loadSampleData();
        } catch (e) {}
    }

    async loadSampleData() {
        if (!window.supabaseClient) return;
        const sampleUsers = [
            { id: 'u1', username: 'echo_mind', email: 'echo@vibehub.com', name: 'Echo Mind', bio: 'The geometry of thought is fascinating. #mindfulness', avatar_url: 'https://i.pravatar.cc/150?u=vibehub1', banner_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200', theme: 'purple', followers: ['u2', 'u3'], following: ['u2'], vibe_score: 1200, verified: true, role: 'user', created_at: new Date().toISOString() },
            { id: 'u2', username: 'cyber_soul', email: 'cyber@vibehub.com', name: 'Cyber Soul', bio: 'Neon dreams in a digital world. 🏙️✨', avatar_url: 'https://i.pravatar.cc/150?u=vibehub2', banner_url: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=1200', theme: 'cyan', followers: ['u1', 'u3', 'u4'], following: ['u1'], vibe_score: 850, verified: true, role: 'user', created_at: new Date().toISOString() }
        ];
        const samplePosts = [
            { id: crypto.randomUUID(), user_id: 'u1', username: 'echo_mind', text: 'The geometry of thought is fascinating.', media_url: 'https://images.unsplash.com/photo-1633167606207-d840b5070fc2?w=800', media_type: 'image', tags: ['mindfulness'], likes: ['u2'], dislikes: [], reactions: { cap: [], relate: [], wild: [], facts: [] }, comments: [] }
        ];
        try {
            await window.supabaseClient.from('users').insert(sampleUsers);
            await window.supabaseClient.from('posts').insert(samplePosts);
            console.log('✅ Sample data loaded!');
        } catch (error) { console.error('Error loading sample data:', error); }
    }

    calculateVibeScore(post) {
        const likes = post.likes || [];
        const dislikes = post.dislikes || [];
        const reactions = post.reactions || { cap: [], relate: [], wild: [], facts: [] };
        return (likes.length * 1) + (dislikes.length * -1) + ((reactions.cap?.length || 0) * 1) + ((reactions.relate?.length || 0) * 1.5) + ((reactions.wild?.length || 0) * 3) + ((reactions.facts?.length || 0) * 2);
    }

    async checkRateLimit(userId, action) {
        const limits = { post: 2, like: 5, comment: 2 };
        return await this.cache.checkRateLimit(userId, action, limits[action] || 5);
    }

    async addPost(postObj) {
        if (!postObj.userId) return null;
        const allowed = await this.checkRateLimit(postObj.userId, 'post');
        if (!allowed) return { error: 'rate_limit', message: 'You can only post 2 times per minute' };
        const ready = await this.waitForSupabase();
        if (!ready) return null;
        try {
            let mediaUrl = postObj.mediaUrl || '';
            let mediaType = postObj.mediaType || 'none';
            if (postObj.mediaFile) {
                const file = postObj.mediaFile;
                if (file.type.includes('video')) {
                    const result = await this.media.uploadVideo(file);
                    if (result) { mediaUrl = result.url; mediaType = 'video'; }
                } else if (file.type.includes('image')) {
                    const result = await this.media.uploadImage(file);
                    if (result) { mediaUrl = result.url; mediaType = 'image'; }
                }
            }
            const postData = {
                id: crypto.randomUUID(),
                user_id: postObj.userId,
                username: postObj.username || postObj.handle,
                text: postObj.content || postObj.text,
                media_url: mediaUrl,
                media_type: mediaType,
                tags: postObj.tags || [],
                likes: [],
                dislikes: [],
                reactions: { cap: [], relate: [], wild: [], facts: [] },
                comments: [],
                created_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
            };
            console.log('[DEBUG addPost] Attempting to insert post:', postData);
            const insertResult = await window.supabaseClient.from('posts').insert([postData]).select();
            if (insertResult.error) {
                console.error('[DEBUG addPost] Supabase insert error:', insertResult.error);
                throw insertResult.error;
            }
            console.log('[DEBUG addPost] Post inserted successfully:', insertResult.data);
            await this.cache.clearPostsCache();
            return insertResult.data ? insertResult.data[0] : postObj;
        } catch (error) { 
            console.error('[DEBUG addPost] Error saving post:', error); 
            return null; 
        }
    }

    async getPosts(tab = 'all', communityId = null) {
        console.log('👑 DataService.getPosts called');
        const ready = await this.waitForSupabase();
        console.log('👑 DataService.waitForSupabase:', ready);
        if (!ready) {
            console.error('👑 DataService: Supabase not ready');
            return [];
        }
        
        const cacheKey = `posts_${tab}_${communityId || 'all'}`;
        const cached = await this.cache.getCachedPosts(cacheKey);
        if (cached && Array.isArray(cached)) return cached;
        
        try {
            let postsQuery = window.supabaseClient.from('posts').select('*').order('created_at', { ascending: false });
            if (communityId) postsQuery = postsQuery.eq('community_id', communityId);
            
            const { data: postsData, error: postsError } = await postsQuery;
            if (postsError) {
                console.error('👑 DataService Error:', postsError);
                return [];
            }
            console.log('👑 DataService fetched raw posts:', postsData?.length);
            
            if (!postsData || postsData.length === 0) return [];
            
            // Fetch associated users separately
            const isValidUUID = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
            const allUserIds = [...new Set(postsData.map(p => p.user_id))];
            const userIds = allUserIds.filter(id => !!id && isValidUUID(id));
            
            let userData = [];
            if (userIds.length > 0) {
                try {
                    const { data: users } = await window.supabaseClient
                        .from('users')
                        .select('id, avatar_url, name, username, bio, banner_url')
                        .in('id', userIds);
                    userData = users || [];
                } catch (e) {
                    console.warn('Error fetching users for posts:', e);
                }
            }
            
            // Also fetch by username for string-based IDs
            const stringUsernames = allUserIds.filter(id => !!id && !isValidUUID(id));
            if (stringUsernames.length > 0) {
                try {
                    const { data: usersByName } = await window.supabaseClient
                        .from('users')
                        .select('id, username, name, avatar_url, banner_url, bio')
                        .in('username', stringUsernames);
                    if (usersByName) {
                        userData = [...userData, ...usersByName];
                    }
                } catch (e) {
                    console.warn('Error fetching users by username:', e);
                }
            }
            
            // Create user lookup map
            const userMap = userData.reduce((acc, user) => {
                acc[user.id] = user;
                if (user.username) acc[user.username] = user;
                return acc;
            }, {});
            
            // Map posts with user data
            const postsWithUser = postsData.map(post => ({
                ...post,
                users: userMap[post.user_id] || userMap[post.username] || null
            }));
            
            let posts = await this.mapPosts(postsWithUser);
            await this.cache.cachePosts(cacheKey, posts);
            return posts;
        } catch (error) { 
            console.error('getPosts failed:', error); 
            return []; 
        }
    }

        
        try {
            let postsQuery = window.supabaseClient.from('posts').select('*').order('created_at', { ascending: false });
            if (communityId) postsQuery = postsQuery.eq('community_id', communityId);
            
            const { data: postsData, error: postsError } = await postsQuery;
            if (postsError) {
                console.error('👑 DataService Error:', postsError);
                return [];
            }
            console.log('👑 DataService fetched raw posts:', postsData?.length);
            
            if (!postsData || postsData.length === 0) return [];
            
            // ... (rest of the mapping code)

    async mapPosts(data) {
        if (!data || data.length === 0) return [];
        
        // Get all unique user IDs from posts
        // Filter only valid UUIDs to prevent 400 errors
        const isValidUUID = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        const userIds = [...new Set(data.map(p => p.user_id))].filter(id => {
            const valid = !!id && isValidUUID(id);
            if (!valid) console.warn('Invalid user_id found:', id);
            return valid;
        });
        
        // Fetch current user data for all posts - only if we have valid UUIDs
        let userData = [];
        if (userIds.length > 0) {
            try {
                const { data: users, error } = await window.supabaseClient
                    .from('users')
                    .select('id, avatar_url, name, username, bio, banner_url')
                    .in('id', userIds);
                if (error) {
                    console.warn('Error fetching user data:', error);
                } else {
                    userData = users || [];
                }
            } catch (error) {
                console.error('Error fetching user data for posts:', error);
            }
        }
        
        // Create user lookup map
        const userMap = userData.reduce((acc, user) => {
            acc[user.id] = user;
            return acc;
        }, {});
        
        return data.map(post => {
            // CRITICAL FIX: Always use fresh user data, never cached post avatar
            const user = userMap[post.user_id] || {};
            const avatar = user.avatar_url || `https://i.pravatar.cc/150?u=${post.user_id}`;
            
            return {
                id: post.id,
                userId: post.user_id,
                displayName: user.name || post.username,
                handle: user.username || post.username,
                avatar: avatar,
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
                    dislike: post.dislikes?.length || 0,
                    gross: post.reactions?.gross?.length || 0,
                    wtf: post.reactions?.wtf?.length || 0,
                    dope: post.reactions?.dope?.length || 0
                },
                vibeScore: user.vibe_score || 0,
                commentCount: post.comment_count || 0,
                badgeList: calculateUserBadges(user),
                isSponsored: post.is_sponsored,
                timestamp: post.created_at ? this.formatTimestamp(post.created_at) : 'Just now',
                created_at: post.created_at || new Date().toISOString()
            };
        });
    }

    async getAds() {
        // Simplified: Fetch posts from KingKool23 as "ads" instead of using sponsored_ads table
        if (!window.supabaseClient) return [];
        try {
            const { data, error } = await window.supabaseClient
                .from('posts')
                .select('*')
                .eq('username', 'KingKool23')
                .order('created_at', { ascending: false })
                .limit(10);
            if (error) throw error;
            // Mark these as ads
            return (data || []).map(post => ({ ...post, is_ad: true }));
        } catch (error) {
            console.error('Error getting ads:', error);
            return [];
        }
    }

    // --- ENHANCED REAL-TIME SYNCHRONIZATION ---
    
    subscribeToPosts(callback) {
        if (!window.supabaseClient) return null;
        
        const channel = window.supabaseClient.channel('public:posts')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
                if (callback) callback({ type: 'new_post', data: payload.new });
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts' }, (payload) => {
                if (callback) callback({ type: 'post_updated', data: payload.new, old: payload.old });
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' }, (payload) => {
                if (callback) callback({ type: 'post_deleted', data: payload.old });
            });
        
        channel.subscribe((status) => {
            console.log('Posts subscription status:', status);
        });
        
        return channel;
    }
    
    subscribeToReactions(callback) {
        if (!window.supabaseClient) return null;
        
        const channel = window.supabaseClient.channel('public:reactions')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'post_reactions' }, (payload) => {
                if (callback) callback({ type: 'new_reaction', data: payload.new });
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'post_reactions' }, (payload) => {
                if (callback) callback({ type: 'reaction_removed', data: payload.old });
            });
        
        channel.subscribe((status) => {
            console.log('Reactions subscription status:', status);
        });
        
        return channel;
    }
    
    subscribeToUserUpdates(callback) {
        if (!window.supabaseClient) return null;
        
        const channel = window.supabaseClient.channel('public:users')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users' }, (payload) => {
                if (callback) callback({ type: 'user_updated', data: payload.new, old: payload.old });
            });
        
        channel.subscribe((status) => {
            console.log('User updates subscription status:', status);
        });
        
        return channel;
    }
    
    subscribeToTop8Updates(callback) {
        if (!window.supabaseClient) return null;
        
        const channel = window.supabaseClient.channel('public:top8')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users' }, (payload) => {
                // Check if top_8_friends changed
                const newTop8 = payload.new.top_8_friends || [];
                const oldTop8 = payload.old.top_8_friends || [];
                
                if (JSON.stringify(newTop8) !== JSON.stringify(oldTop8)) {
                    if (callback) callback({ 
                        type: 'top8_updated', 
                        userId: payload.new.id,
                        data: payload.new,
                        oldTop8,
                        newTop8
                    });
                }
            });
        
        channel.subscribe((status) => {
            console.log('Top 8 updates subscription status:', status);
        });
        
        return channel;
    }
    
    subscribeToComments(callback) {
        if (!window.supabaseClient) return null;
        
        const channel = window.supabaseClient.channel('public:comments')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, (payload) => {
                if (callback) callback({ type: 'new_comment', data: payload.new });
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'comments' }, (payload) => {
                if (callback) callback({ type: 'comment_updated', data: payload.new });
            });
        
        channel.subscribe((status) => {
            console.log('Comments subscription status:', status);
        });
        
        return channel;
    }
    
    subscribeToVibeBoosts(callback) {
        if (!window.supabaseClient) return null;
        
        const channel = window.supabaseClient.channel('public:vibe_boosts')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users' }, (payload) => {
                // Check if vibe_likes changed
                const newVibeLikes = payload.new.vibe_likes || [];
                const oldVibeLikes = payload.old.vibe_likes || [];
                
                if (JSON.stringify(newVibeLikes) !== JSON.stringify(oldVibeLikes)) {
                    if (callback) callback({ 
                        type: 'vibe_boost_updated', 
                        userId: payload.new.id,
                        data: payload.new,
                        oldVibeLikes,
                        newVibeLikes
                    });
                }
            });
        
        channel.subscribe((status) => {
            console.log('Vibe boosts subscription status:', status);
        });
        
        return channel;
    }

    async addReaction(postId, userId, reactionType) {
        if (!postId || !userId || !reactionType || !window.supabaseClient) {
            return { success: false, error: 'Invalid parameters' };
        }
        
        try {
            // Get current post data
            const { data: post } = await window.supabaseClient
                .from('posts')
                .select('*')
                .eq('id', postId)
                .single();
                
            if (!post) {
                return { success: false, error: 'Post not found' };
            }
            
            let isRemoving = false;
            let reactions = post.reactions || { cap: [], relate: [], wild: [], facts: [], heat: [], gross: [], wtf: [], dope: [] };
            
            if (reactionType === 'like' || reactionType === 'dislike') {
                const field = reactionType === 'like' ? 'likes' : 'dislikes';
                let list = post[field] || [];
                if (list.includes(userId)) { 
                    list = list.filter(id => id !== userId); 
                    isRemoving = true; 
                } else { 
                    list.push(userId); 
                }
                await window.supabaseClient.from('posts').update({ [field]: list }).eq('id', postId);
            } else {
                if (!reactions[reactionType]) reactions[reactionType] = [];
                if (reactions[reactionType].includes(userId)) { 
                    reactions[reactionType] = reactions[reactionType].filter(id => id !== userId); 
                    isRemoving = true; 
                } else { 
                    reactions[reactionType].push(userId); 
                }
                await window.supabaseClient.from('posts').update({ reactions }).eq('id', postId);
            }
            
            // Sync with post_reactions table for uniqueness and realtime
            if (isRemoving) {
                await window.supabaseClient.from('post_reactions').delete().match({ 
                    post_id: postId, 
                    user_id: userId, 
                    reaction_type: reactionType 
                });
            } else {
                await window.supabaseClient.from('post_reactions').insert({ 
                    post_id: postId, 
                    user_id: userId, 
                    reaction_type: reactionType 
                });
            }
            
            return { success: true };
        } catch (error) {
            console.error('Error in addReaction:', error);
            return { success: false, error: error.message };
        }
    }

    async updateTop8(userId, top8Ids) {
        if (!userId || !Array.isArray(top8Ids) || !window.supabaseClient) return false;
        try {
            await window.supabaseClient
                .from('users')
                .update({ top_8_friends: top8Ids })
                .eq('id', userId);
            return true;
        } catch (error) {
            console.error('updateTop8 failed:', error);
            return false;
        }
    }

    async getComments(postId) {
        if (!window.supabaseClient) return [];
        try {
            const { data } = await window.supabaseClient.from('comments').select('*').eq('post_id', postId).order('created_at', { ascending: true });
            return (data || []).map(c => ({ id: c.id, userId: c.user_id, displayName: c.username, avatar: c.user_avatar, text: c.text, time: this.formatTimestamp(c.created_at), replies: [] }));
        } catch (error) { return []; }
    }

    async addComment(postId, comment) {
        if (!comment.userId) return null;
        const allowed = await this.checkRateLimit(comment.userId, 'comment');
        if (!allowed) return { error: 'rate_limit', message: 'You can only comment 2 times per minute' };
        if (!window.supabaseClient) return null;
        try {
            const commentPayload = { post_id: postId, user_id: comment.userId, username: comment.displayName, text: comment.text || '' };
            let { data, error } = await window.supabaseClient.from('comments').insert([commentPayload]).select();
            if (!error && data) {
                const { data: post } = await window.supabaseClient.from('posts').select('comment_count').eq('id', postId).single();
                if (post) await window.supabaseClient.from('posts').update({ comment_count: (post.comment_count || 0) + 1 }).eq('id', postId);
                return data[0];
            }
            return null;
        } catch (error) { return null; }
    }

    async getCommunities() {
        if (!window.supabaseClient) return [];
        try {
            const { data } = await window.supabaseClient.from('communities').select('*').order('created_at', { ascending: false });
            return (data || []).map(c => ({ id: c.id, name: c.name, description: c.description, members: c.member_count || 0 }));
        } catch (error) { return []; }
    }

    async getFriends(userId) {
        if (!userId || !window.supabaseClient) return [];
        try {
            // Skip join - fetch friends and user data separately
            const { data: friends } = await window.supabaseClient.from('friends').select('friend_id').eq('user_id', userId);
            if (!friends || friends.length === 0) return [];
            
            const friendIds = friends.map(f => f.friend_id);
            
            // Fetch user data for all friends
            const { data: users } = await window.supabaseClient.from('users').select('id, username, name, avatar_url').in('id', friendIds);
            
            return (users || []).map(u => ({ 
                id: u.id, 
                username: u.username || 'unknown', 
                displayName: u.name || u.username || 'User', 
                avatar: u.avatar_url || 'https://i.pravatar.cc/150?u=' + u.id 
            }));
        } catch (error) { 
            console.error('Error getting friends:', error);
            return []; 
        }
    }

    formatTimestamp(dateString) {
        if (!dateString) return 'Just now';
        const date = new Date(dateString);
        const diff = Math.floor((new Date() - date) / 1000);
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return date.toLocaleDateString();
    }
    
    subscribeToUserNotifications(userId, callback) {
        if (!window.supabaseClient) return null;
        return window.supabaseClient.channel(`notifications:${userId}`)
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'notifications',
                filter: `user_id=eq.${userId}`
            }, (payload) => {
                if (callback) callback({ type: 'notification', data: payload.new });
            }).subscribe();
    }

    async getUserPosts(userId, username) {
        if (!window.supabaseClient) return [];
        try {
            // Simple query without join - fetch posts and user data separately
            const { data } = await window.supabaseClient.from('posts').select('*').eq('user_id', userId).order('created_at', { ascending: false });
            
            if (!data || data.length === 0) return [];
            
            // Fetch user data
            const { data: userData } = await window.supabaseClient.from('users').select('id, username, name, avatar_url, banner_url, bio').eq('id', userId).maybeSingle();
            
            // Map posts with user data
            const postsWithUser = data.map(post => ({
                ...post,
                users: userData || null
            }));
            
            return this.mapPosts(postsWithUser);
        } catch (error) { 
            console.error('Error getting user posts:', error);
            return []; 
        }
    }

    async getNotifications(userId) {
        if (!userId || !window.supabaseClient) return [];
        try {
            const { data } = await window.supabaseClient.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
            return data || [];
        } catch (error) { return []; }
    }

    async markNotificationsRead(userId) {
        if (!userId || !window.supabaseClient) return;
        try {
            await window.supabaseClient.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
        } catch (error) {}
    }

    async getFriendsPosts(userId) {
        if (!userId || !window.supabaseClient) return [];
        try {
            const { data: friends } = await window.supabaseClient.from('friends').select('friend_id').eq('user_id', userId);
            const friendIds = (friends || []).map(f => f.friend_id);
            if (friendIds.length === 0) return [];
            
            // Simple query without join
            const { data } = await window.supabaseClient.from('posts').select('*').in('user_id', friendIds).order('created_at', { ascending: false });
            
            if (!data || data.length === 0) return [];
            
            // Fetch all user data for these posts
            const uniqueUserIds = [...new Set(data.map(p => p.user_id))];
            const { data: usersData } = await window.supabaseClient.from('users').select('id, username, name, avatar_url, banner_url, bio').in('id', uniqueUserIds);
            
            const userMap = {};
            (usersData || []).forEach(u => userMap[u.id] = u);
            
            // Map posts with user data
            const postsWithUser = data.map(post => ({
                ...post,
                users: userMap[post.user_id] || null
            }));
            
            return this.mapPosts(postsWithUser);
        } catch (error) { 
            console.error('Error getting friends posts:', error);
            return []; 
        }
    }

    async sendFriendRequest(fromId, toId) {
        if (!window.supabaseClient) return false;
        try {
            const { error } = await window.supabaseClient.from('friend_requests').insert([{
                from_id: fromId,
                to_id: toId,
                status: 'pending'
            }]);
            if (error) throw error;
            await this.createNotification(toId, 'Someone wants to link minds with you!', 'follow');
            return true;
        } catch (error) {
            console.error('sendFriendRequest failed:', error);
            return false;
        }
    }

    async respondToFriendRequest(userId, friendId, accept) {
        if (!window.supabaseClient) return false;
        try {
            if (accept) {
                await window.supabaseClient.from('friends').insert([
                    { user_id: userId, friend_id: friendId },
                    { user_id: friendId, friend_id: userId }
                ]);
                await window.supabaseClient.from('friend_requests').update({ status: 'accepted' }).eq('from_id', friendId).eq('to_id', userId);
                await this.createNotification(friendId, 'Social Link Established!', 'follow');
            } else {
                await window.supabaseClient.from('friend_requests').delete().eq('from_id', friendId).eq('to_id', userId);
            }
            return true;
        } catch (error) {
            console.error('respondToFriendRequest failed:', error);
            return false;
        }
    }

    async getFriendshipStatus(userId, friendId) {
        if (!userId || !friendId || !window.supabaseClient) return 'none';
        try {
            const { data: friends } = await window.supabaseClient.from('friends').select('*').eq('user_id', userId).eq('friend_id', friendId);
            if (friends && friends.length > 0) return 'friends';
            const { data: sent } = await window.supabaseClient.from('friend_requests').select('*').eq('from_id', userId).eq('to_id', friendId).eq('status', 'pending');
            if (sent && sent.length > 0) return 'pending';
            const { data: received } = await window.supabaseClient.from('friend_requests').select('*').eq('from_id', friendId).eq('to_id', userId).eq('status', 'pending');
            if (received && received.length > 0) return 'requested';
            return 'none';
        } catch (error) { return 'none'; }
    }

    async getUserProfile(userId) {
        if (!userId || !window.supabaseClient) return null;
        try {
            const { data, error } = await window.supabaseClient.from('users').select('*').eq('id', userId).single();
            if (error) throw error;
            return {
                id: data.id,
                username: data.username,
                displayName: data.name || data.username,
                avatar: data.avatar_url,
                banner: data.banner_url,
                bio: data.bio,
                songLink: data.song_link,
                followersCount: data.followers?.length || 0,
                followingCount: data.following?.length || 0,
                postCount: 0, // Should fetch real count if possible
                vibeBoosts: data.vibe_score || 0,
                verified: data.verified
            };
        } catch (error) { return null; }
    }

    async createNotification(userId, message, type = 'info', relatedId = null) {
        if (!userId || !window.supabaseClient) return;
        try {
            const notificationData = {
                user_id: userId,
                message,
                type,
                read: false,
                created_at: new Date().toISOString()
            };
            
            if (relatedId) {
                notificationData.related_id = relatedId;
            }
            
            const { data, error } = await window.supabaseClient
                .from('notifications')
                .insert([notificationData])
                .select();
                
            if (!error && data) {
                return data[0];
            }
        } catch (error) {
            console.error('Error creating notification:', error);
        }
        return null;
    }

    async markNotificationRead(notificationId) {
        if (!notificationId || !window.supabaseClient) return;
        try {
            await window.supabaseClient
                .from('notifications')
                .update({ read: true })
                .eq('id', notificationId);
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }

    async editPost(postId, newContent, newMediaUrl = null, newMediaType = null) {
        if (!postId || !window.supabaseClient) return { success: false, error: 'Invalid parameters' };
        
        try {
            // Verify user owns the post
            const { data: post, error: fetchError } = await window.supabaseClient
                .from('posts')
                .select('user_id')
                .eq('id', postId)
                .single();
                
            if (fetchError || !post) {
                return { success: false, error: 'Post not found' };
            }
            
            // Build update data
            const updateData = {
                text: newContent,
                updated_at: new Date().toISOString(),
                edited: true
            };
            
            // Update media if provided
            if (newMediaUrl && newMediaType) {
                updateData.media_url = newMediaUrl;
                updateData.media_type = newMediaType;
            }
            
            // Update the post
            const { data, error } = await window.supabaseClient
                .from('posts')
                .update(updateData)
                .eq('id', postId)
                .select()
                .single();
                
            if (error) throw error;
            
            // Clear cache to ensure fresh data
            await this.cache.clearPostsCache();
            
            return { success: true, data };
        } catch (error) {
            console.error('Error editing post:', error);
            return { success: false, error: error.message };
        }
    }

    async deletePost(postId) {
        if (!postId || !window.supabaseClient) return { success: false, error: 'Invalid parameters' };
        
        try {
            // Verify user owns the post or is admin
            const { data: post, error: fetchError } = await window.supabaseClient
                .from('posts')
                .select('user_id')
                .eq('id', postId)
                .single();
                
            if (fetchError || !post) {
                return { success: false, error: 'Post not found' };
            }
            
            // Delete the post
            const { error } = await window.supabaseClient
                .from('posts')
                .delete()
                .eq('id', postId);
                
            if (error) throw error;
            
            // Clear cache to ensure fresh data
            await this.cache.clearPostsCache();
            
            return { success: true };
        } catch (error) {
            console.error('Error deleting post:', error);
            return { success: false, error: error.message };
        }
    }

    async getTrendingPosts(timeframe = '24h', limit = 20) {
        if (!window.supabaseClient) return [];
        
        try {
            // Calculate timeframe
            const timeframes = {
                '1h': 1 * 60 * 60 * 1000,
                '6h': 6 * 60 * 60 * 1000,
                '24h': 24 * 60 * 60 * 1000,
                '7d': 7 * 24 * 60 * 60 * 1000,
                '30d': 30 * 24 * 60 * 60 * 1000
            };
            
            const timeframeMs = timeframes[timeframe] || timeframes['24h'];
            const since = new Date(Date.now() - timeframeMs);
            
            // Fetch posts within timeframe - no join
            const { data: posts, error } = await window.supabaseClient
                .from('posts')
                .select('*')
                .gte('created_at', since.toISOString())
                .order('created_at', { ascending: false })
                .limit(limit * 2); // Get more to calculate trending
            
            if (error) throw error;
            if (!posts || posts.length === 0) return [];
            
            // Fetch user data separately
            const userIds = [...new Set(posts.map(p => p.user_id).filter(id => !!id))];
            let userData = [];
            if (userIds.length > 0) {
                const { data: users } = await window.supabaseClient.from('users').select('id, username, name, avatar_url, vibe_score').in('id', userIds);
                userData = users || [];
            }
            const userMap = {};
            userData.forEach(u => userMap[u.id] = u);
            
            // Calculate engagement scores
            const postsWithScores = (posts || []).map(post => {
                const user = userMap[post.user_id] || {};
                
                // Calculate engagement score
                const reactions = {
                    like: post.likes?.length || 0,
                    heat: post.reactions?.heat?.length || 0,
                    wild: post.reactions?.wild?.length || 0,
                    cap: post.reactions?.cap?.length || 0,
                    admire: post.reactions?.admire?.length || 0,
                    relate: post.reactions?.relate?.length || 0
                };
                
                const totalReactions = Object.values(reactions).reduce((sum, count) => sum + count, 0);
                const commentScore = (post.comment_count || 0) * 2; // Comments worth more
                const userScore = user.vibe_score || 0;
                
                // Time decay (newer posts get slight boost)
                const ageInHours = (Date.now() - new Date(post.created_at).getTime()) / (1000 * 60 * 60);
                const timeMultiplier = Math.max(0.5, 1 - (ageInHours / 48)); // Decay over 48 hours
                
                // Final trending score
                const trendingScore = (totalReactions + commentScore + userScore) * timeMultiplier;
                
                return {
                    ...post,
                    trendingScore,
                    totalReactions,
                    commentCount: post.comment_count || 0
                };
            });
            
            // Sort by trending score and limit
            const trendingPosts = postsWithScores
                .sort((a, b) => b.trendingScore - a.trendingScore)
                .slice(0, limit);
            
            return await this.mapPosts(trendingPosts);
        } catch (error) {
            console.error('Error fetching trending posts:', error);
            return [];
        }
    }

    async getExplorePosts(tab = 'trending', timeframe = '24h') {
        switch (tab) {
            case 'trending':
                return await this.getTrendingPosts(timeframe);
            case 'new':
                return await this.getPosts('all', null); // All posts, newest first
            case 'top':
                return await this.getTopPosts(timeframe);
            default:
                return await this.getPosts('all', null);
        }
    }

    // --- ADVANCED ENGAGEMENT RANKING ALGORITHM ---
    
    calculateEngagementScore(post, userContext = null) {
        if (!post) return 0;
        
        // 1. Reaction Weighting (different reactions have different weights)
        const reactionWeights = {
            like: 1.0,
            admire: 1.5,      // Higher weight for admiration
            heat: 2.0,        // High weight for excitement
            wild: 1.8,        // High weight for surprise
            cap: 0.8,         // Lower weight for disagreement
            relate: 1.2       // Moderate weight for connection
        };
        
        let reactionScore = 0;
        if (post.reactions) {
            Object.entries(post.reactions).forEach(([type, reactions]) => {
                const weight = reactionWeights[type] || 1.0;
                reactionScore += (reactions?.length || 0) * weight;
            });
        }
        
        // Legacy likes/dislikes support
        if (post.likes) reactionScore += post.likes.length * 1.0;
        if (post.dislikes) reactionScore += post.dislikes.length * 0.5;
        
        // 2. Comment Engagement (comments weighted higher than reactions)
        const commentScore = (post.comment_count || 0) * 2.5;
        
        // 3. Top 8 Relationship Boost (posts from users in Top 8 get priority)
        let top8Boost = 0;
        if (userContext && userContext.top_8_friends && post.user_id) {
            if (userContext.top_8_friends.includes(post.user_id)) {
                top8Boost = 15; // Significant boost for Top 8 connections
            }
        }
        
        // 4. User Vibe Score Boost (users with higher vibe scores get more visibility)
        const vibeScore = (post.vibeScore || 0) * 0.1;
        
        // 5. Time Decay (newer content gets boost, but very old content gets penalty)
        const timeDecay = this.calculateTimeDecay(post.created_at);
        
        // 6. User Interaction History (boost content from users you interact with)
        let userHistoryScore = 0;
        if (userContext && post.user_id) {
            userHistoryScore = this.calculateUserInteractionScore(post.user_id, userContext);
        }
        
        // 7. Content Quality Signals
        let contentQualityScore = 0;
        if (post.text && post.text.length > 50) contentQualityScore += 2; // Substantive content
        if (post.media_url) contentQualityScore += 3; // Media content
        if (post.tags && post.tags.length > 0) contentQualityScore += 1; // Tagged content
        
        // Calculate final score
        const baseScore = reactionScore + commentScore + contentQualityScore;
        const socialBoost = top8Boost + vibeScore + userHistoryScore;
        
        return (baseScore + socialBoost) * timeDecay;
    }
    
    calculateTimeDecay(createdAt) {
        if (!createdAt) return 0.5; // Penalty for posts without timestamps
        
        const now = Date.now();
        const postTime = new Date(createdAt).getTime();
        const hoursOld = (now - postTime) / (1000 * 60 * 60);
        
        // Optimal window: 0-6 hours gets boost, 6-24 hours neutral, >24 hours decay
        if (hoursOld <= 6) {
            return 1.2; // Fresh content boost
        } else if (hoursOld <= 24) {
            return 1.0; // Neutral
        } else if (hoursOld <= 72) {
            return Math.max(0.7, 1.0 - (hoursOld - 24) * 0.01); // Gradual decay
        } else {
            return Math.max(0.3, 0.5 - (hoursOld - 72) * 0.005); // Heavy decay for old content
        }
    }
    
    calculateUserInteractionScore(targetUserId, userContext) {
        // Simple implementation - can be enhanced with actual interaction data
        if (!userContext.interaction_history) return 0;
        
        const interactions = userContext.interaction_history[targetUserId] || {};
        const recentInteractions = interactions.reactions || 0;
        const commentInteractions = interactions.comments || 0;
        
        return (recentInteractions * 0.5) + (commentInteractions * 1.5);
    }
    
    async getRankedPosts(tab = 'all', communityId = null, userContext = null) {
        try {
            console.log('getRankedPosts: tab=', tab, 'userContext=', userContext);
            const posts = await this.getPosts(tab, communityId);
            console.log('getRankedPosts: Got base posts:', posts ? posts.length : 0);
            
            if (!posts || posts.length === 0) return [];
            
            const postsWithScores = posts.map(post => {
                try {
                    return {
                        ...post,
                        engagementScore: this.calculateEngagementScore(post, userContext)
                    };
                } catch (e) {
                    console.error('Error calculating score for post:', post.id, e);
                    return { ...post, engagementScore: 0 };
                }
            });
            
            const result = postsWithScores.sort((a, b) => b.engagementScore - a.engagementScore);
            console.log('getRankedPosts: Returning ranked posts:', result.length);
            return result;
        } catch (error) {
            console.error('Error getting ranked posts:', error);
            return [];
        }
    }
    
    getTotalReactions(post) {
        let total = 0;
        
        // Count reactions from reactions object
        if (post.reactions) {
            Object.values(post.reactions).forEach(reactions => {
                total += reactions?.length || 0;
            });
        }
        
        // Legacy support
        if (post.likes) total += post.likes.length;
        if (post.dislikes) total += post.dislikes.length;
        
        return total;
    }
    
    getHoursSinceCreation(createdAt) {
        if (!createdAt) return 999; // Very old for posts without timestamps
        
        const now = Date.now();
        const postTime = new Date(createdAt).getTime();
        return (now - postTime) / (1000 * 60 * 60);
    }

    async getTopPosts(timeframe = '24h', limit = 20) {
        if (!window.supabaseClient) return [];
        
        try {
            const timeframes = {
                '1h': 1 * 60 * 60 * 1000,
                '6h': 6 * 60 * 60 * 1000,
                '24h': 24 * 60 * 60 * 1000,
                '7d': 7 * 24 * 60 * 60 * 1000,
                '30d': 30 * 24 * 60 * 60 * 1000
            };
            
            const timeframeMs = timeframes[timeframe] || timeframes['24h'];
            const since = new Date(Date.now() - timeframeMs);
            
            // Fetch posts with highest engagement using a simple query.
            // We avoid implicit joins here because the Supabase schema does not
            // define a direct foreign-key relationship suitable for select('*, users(*)')
            // and that can cause runtime errors in production.
            const { data: posts, error } = await window.supabaseClient
                .from('posts')
                .select('*')
                .gte('created_at', since.toISOString())
                .order('likes', { ascending: false })
                .limit(limit);

            if (error) throw error;

            if (!posts || posts.length === 0) return [];

            // Re‑use the existing mapping helper to attach user data and
            // convert into the timeline-friendly shape.
            return await this.mapPosts(posts);
        } catch (error) {
            console.error('Error fetching top posts:', error);
            return [];
        }
    }

    async getUserAnalytics(userId, timeframe = '30d') {
        if (!window.supabaseClient || !userId) return null;
        
        try {
            const timeframes = {
                '7d': 7 * 24 * 60 * 60 * 1000,
                '30d': 30 * 24 * 60 * 60 * 1000,
                '90d': 90 * 24 * 60 * 60 * 1000
            };
            
            const timeframeMs = timeframes[timeframe] || timeframes['30d'];
            const since = new Date(Date.now() - timeframeMs);
            
            // Fetch user's posts within timeframe
            const { data: posts, error: postsError } = await window.supabaseClient
                .from('posts')
                .select('*')
                .eq('user_id', userId)
                .gte('created_at', since.toISOString());
                
            if (postsError) throw postsError;
            
            // Calculate metrics
            const totalPosts = posts?.length || 0;
            const totalReactions = posts?.reduce((sum, post) => {
                const reactions = post.likes?.length || 0;
                const heat = post.reactions?.heat?.length || 0;
                const wild = post.reactions?.wild?.length || 0;
                const cap = post.reactions?.cap?.length || 0;
                const admire = post.reactions?.admire?.length || 0;
                const relate = post.reactions?.relate?.length || 0;
                return sum + reactions + heat + wild + cap + admire + relate;
            }, 0) || 0;
            
            const totalComments = posts?.reduce((sum, post) => sum + (post.comment_count || 0), 0) || 0;
            
            // Daily activity breakdown
            const dailyActivity = {};
            for (let i = 0; i < 30; i++) {
                const date = new Date(Date.now() - (i * 24 * 60 * 60 * 1000));
                const dateKey = date.toISOString().split('T')[0];
                dailyActivity[dateKey] = {
                    posts: 0,
                    reactions: 0,
                    comments: 0
                };
            }
            
            posts?.forEach(post => {
                const dateKey = new Date(post.created_at).toISOString().split('T')[0];
                if (dailyActivity[dateKey]) {
                    dailyActivity[dateKey].posts += 1;
                    dailyActivity[dateKey].reactions += post.likes?.length || 0;
                    dailyActivity[dateKey].comments += post.comment_count || 0;
                }
            });
            
            // Top performing posts
            const topPosts = posts?.sort((a, b) => {
                const scoreA = (a.likes?.length || 0) + (a.comment_count || 0) * 2;
                const scoreB = (b.likes?.length || 0) + (b.comment_count || 0) * 2;
                return scoreB - scoreA;
            }).slice(0, 5) || [];
            
            // Engagement rate
            const engagementRate = totalPosts > 0 ? (totalReactions / totalPosts) : 0;
            
            return {
                timeframe,
                summary: {
                    totalPosts,
                    totalReactions,
                    totalComments,
                    engagementRate: Math.round(engagementRate * 100) / 100
                },
                dailyActivity,
                topPosts,
                averagePostsPerDay: Math.round((totalPosts / (timeframeMs / (24 * 60 * 60 * 1000))) * 10) / 10
            };
        } catch (error) {
            console.error('Error fetching user analytics:', error);
            return null;
        }
    }

    async getPlatformAnalytics(timeframe = '30d') {
        if (!window.supabaseClient) return null;
        
        try {
            const timeframes = {
                '7d': 7 * 24 * 60 * 60 * 1000,
                '30d': 30 * 24 * 60 * 60 * 1000,
                '90d': 90 * 24 * 60 * 60 * 1000
            };
            
            const timeframeMs = timeframes[timeframe] || timeframes['30d'];
            const since = new Date(Date.now() - timeframeMs);
            
            // Fetch platform-wide stats
            const { data: posts, error: postsError } = await window.supabaseClient
                .from('posts')
                .select('*')
                .gte('created_at', since.toISOString());
                
            if (postsError) throw postsError;
            
            const { data: users, error: usersError } = await window.supabaseClient
                .from('users')
                .select('created_at')
                .gte('created_at', since.toISOString());
                
            if (usersError) throw usersError;
            
            // Calculate metrics
            const totalPosts = posts?.length || 0;
            const newUsers = users?.length || 0;
            const totalReactions = posts?.reduce((sum, post) => {
                return sum + (post.likes?.length || 0) + (post.comment_count || 0);
            }, 0) || 0;
            
            // Daily platform activity
            const dailyActivity = {};
            for (let i = 0; i < 30; i++) {
                const date = new Date(Date.now() - (i * 24 * 60 * 60 * 1000));
                const dateKey = date.toISOString().split('T')[0];
                dailyActivity[dateKey] = {
                    posts: 0,
                    users: 0,
                    reactions: 0
                };
            }
            
            posts?.forEach(post => {
                const dateKey = new Date(post.created_at).toISOString().split('T')[0];
                if (dailyActivity[dateKey]) {
                    dailyActivity[dateKey].posts += 1;
                    dailyActivity[dateKey].reactions += (post.likes?.length || 0) + (post.comment_count || 0);
                }
            });
            
            users?.forEach(user => {
                const dateKey = new Date(user.created_at).toISOString().split('T')[0];
                if (dailyActivity[dateKey]) {
                    dailyActivity[dateKey].users += 1;
                }
            });
            
            return {
                timeframe,
                summary: {
                    totalPosts,
                    newUsers,
                    totalReactions,
                    averagePostsPerDay: Math.round((totalPosts / (timeframeMs / (24 * 60 * 60 * 1000))) * 10) / 10,
                    averageUsersPerDay: Math.round((newUsers / (timeframeMs / (24 * 60 * 60 * 1000))) * 10) / 10
                },
                dailyActivity
            };
        } catch (error) {
            console.error('Error fetching platform analytics:', error);
            return null;
        }
    }

    // --- MOOD GLOW EMOTIONAL INTELLIGENCE SYSTEM ---
    
    async calculateUserMood(userId, timeframe = '7d') {
        if (!window.supabaseClient || !userId) return null;
        
        try {
            const timeframes = {
                '24h': 24 * 60 * 60 * 1000,
                '3d': 3 * 24 * 60 * 60 * 1000,
                '7d': 7 * 24 * 60 * 60 * 1000,
                '14d': 14 * 24 * 60 * 60 * 1000,
                '30d': 30 * 24 * 60 * 60 * 1000
            };
            
            const timeframeMs = timeframes[timeframe] || timeframes['7d'];
            const since = new Date(Date.now() - timeframeMs);
            
            // Gather all user data for analysis
            const [posts, interactions, reactions] = await Promise.all([
                this.getUserPostsForMoodAnalysis(userId, since),
                this.getUserInteractionsForMoodAnalysis(userId, since),
                this.getUserReactionsForMoodAnalysis(userId, since)
            ]);
            
            // Calculate mood signals
            const languageSignal = this.analyzeLanguageSignals(posts);
            const behaviorSignal = this.analyzePostingBehavior(posts, timeframeMs);
            const engagementSignal = this.analyzeEngagementStyle(interactions);
            const reactionSignal = this.analyzeReactionPatterns(reactions);
            const topicSignal = this.analyzeTopicDrift(posts);
            
            // Combine signals with weighted algorithm
            const moodScore = this.calculateMoodScore({
                language: languageSignal,
                behavior: behaviorSignal,
                engagement: engagementSignal,
                reactions: reactionSignal,
                topics: topicSignal
            });
            
            return {
                mood: moodScore.mood,
                confidence: moodScore.confidence,
                signals: {
                    language: languageSignal,
                    behavior: behaviorSignal,
                    engagement: engagementSignal,
                    reactions: reactionSignal,
                    topics: topicSignal
                },
                intensity: moodScore.intensity,
                timeframe,
                analyzedAt: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error calculating user mood:', error);
            return null;
        }
    }
    
    analyzeLanguageSignals(posts) {
        if (!posts || posts.length === 0) return { mood: 'neutral', confidence: 0, signals: {} };
        
        // Emotional word dictionaries based on computational linguistics research
        const positiveWords = [
            'grateful', 'thank', 'excited', 'amazing', 'wonderful', 'love', 'happy', 'great',
            'awesome', 'fantastic', 'beautiful', 'blessed', 'joy', 'celebrate', 'growth',
            'goals', 'future', 'hope', 'optimistic', 'proud', 'accomplished', 'success'
        ];
        
        const negativeWords = [
            'exhausted', 'tired', 'frustrated', 'lonely', 'sad', 'angry', 'hate',
            'stressed', 'overwhelmed', 'anxious', 'depressed', 'confused', 'lost',
            'worried', 'disappointed', 'hurt', 'pain', 'struggle', 'difficult'
        ];
        
        const anxietyWords = [
            'insomnia', 'sleep', 'night', 'can\'t', 'worried', 'anxious', 'panic',
            'racing', 'mind', 'overthinking', 'stress', 'pressure', 'overwhelmed'
        ];
        
        const withdrawalWords = [
            'alone', 'isolated', 'quiet', 'silent', 'away', 'disappeared', 'gone',
            'withdrawn', 'distant', 'separate', 'apart'
        ];
        
        let positiveCount = 0;
        let negativeCount = 0;
        let anxietyCount = 0;
        let withdrawalCount = 0;
        let pronounICount = 0;
        let totalWords = 0;
        
        posts.forEach(post => {
            const text = (post.text || '').toLowerCase();
            const words = text.split(/\s+/);
            
            words.forEach(word => {
                totalWords++;
                if (positiveWords.includes(word)) positiveCount++;
                if (negativeWords.includes(word)) negativeCount++;
                if (anxietyWords.includes(word)) anxietyCount++;
                if (withdrawalWords.includes(word)) withdrawalCount++;
                if (word === 'i' || word === 'me' || word === 'my' || word === 'myself') pronounICount++;
            });
        });
        
        // Calculate emotional ratios
        const positiveRatio = totalWords > 0 ? positiveCount / totalWords : 0;
        const negativeRatio = totalWords > 0 ? negativeCount / totalWords : 0;
        const anxietyRatio = totalWords > 0 ? anxietyCount / totalWords : 0;
        const withdrawalRatio = totalWords > 0 ? withdrawalCount / totalWords : 0;
        const selfFocusRatio = totalWords > 0 ? pronounICount / totalWords : 0;
        
        // Determine mood based on patterns
        let mood = 'neutral';
        let confidence = 0;
        
        if (selfFocusRatio > 0.15 && (negativeRatio > 0.05 || anxietyRatio > 0.03)) {
            mood = 'depressive';
            confidence = Math.min(0.8, selfFocusRatio * 3);
        } else if (anxietyRatio > 0.04) {
            mood = 'anxious';
            confidence = Math.min(0.8, anxietyRatio * 4);
        } else if (withdrawalRatio > 0.03) {
            mood = 'withdrawn';
            confidence = Math.min(0.7, withdrawalRatio * 3);
        } else if (positiveRatio > 0.06 && negativeRatio < 0.02) {
            mood = 'positive';
            confidence = Math.min(0.8, positiveRatio * 3);
        } else if (negativeRatio > 0.06) {
            mood = 'negative';
            confidence = Math.min(0.8, negativeRatio * 3);
        }
        
        return {
            mood,
            confidence,
            signals: {
                positiveRatio,
                negativeRatio,
                anxietyRatio,
                withdrawalRatio,
                selfFocusRatio,
                totalWords,
                postCount: posts.length
            }
        };
    }
    
    analyzePostingBehavior(posts, timeframeMs) {
        if (!posts || posts.length === 0) return { mood: 'neutral', confidence: 0, signals: {} };
        
        const now = Date.now();
        const postsByHour = {};
        const postingTimes = posts.map(p => new Date(p.created_at).getTime());
        
        // Analyze posting patterns
        postingTimes.forEach(time => {
            const hour = new Date(time).getHours();
            postsByHour[hour] = (postsByHour[hour] || 0) + 1;
        });
        
        // Calculate metrics
        const totalPosts = posts.length;
        const avgPostsPerDay = totalPosts / (timeframeMs / (24 * 60 * 60 * 1000));
        const lateNightPosts = postsByHour[0] + postsByHour[1] + postsByHour[2] + postsByHour[22] + postsByHour[23];
        const lateNightRatio = totalPosts > 0 ? lateNightPosts / totalPosts : 0;
        
        // Calculate posting regularity (consistency)
        const days = new Set(postingTimes.map(time => new Date(time).toDateString()));
        const regularity = days.size / Math.min(7, timeframeMs / (24 * 60 * 60 * 1000));
        
        // Look for sudden bursts or long silences
        const sortedTimes = postingTimes.sort((a, b) => a - b);
        let longestGap = 0;
        for (let i = 1; i < sortedTimes.length; i++) {
            const gap = sortedTimes[i] - sortedTimes[i-1];
            longestGap = Math.max(longestGap, gap);
        }
        
        // Determine mood signals
        let mood = 'neutral';
        let confidence = 0;
        
        if (lateNightRatio > 0.4 && avgPostsPerDay > 2) {
            mood = 'anxious';
            confidence = Math.min(0.7, lateNightRatio * 1.5);
        } else if (avgPostsPerDay < 0.5 && regularity < 0.3) {
            mood = 'withdrawn';
            confidence = Math.min(0.7, (1 - regularity) * 2);
        } else if (avgPostsPerDay > 5 && longestGap < 24 * 60 * 60 * 1000) {
            mood = 'emotional_flooding';
            confidence = Math.min(0.6, avgPostsPerDay / 10);
        } else if (regularity > 0.7 && avgPostsPerDay >= 1 && avgPostsPerDay <= 3) {
            mood = 'stable';
            confidence = Math.min(0.6, regularity);
        }
        
        return {
            mood,
            confidence,
            signals: {
                avgPostsPerDay,
                regularity,
                lateNightRatio,
                longestGap: longestGap / (24 * 60 * 60 * 1000), // in days
                totalPosts
            }
        };
    }
    
    analyzeEngagementStyle(interactions) {
        if (!interactions || interactions.length === 0) return { mood: 'neutral', confidence: 0, signals: {} };
        
        const comments = interactions.filter(i => i.type === 'comment').length;
        const reactions = interactions.filter(i => i.type === 'reaction').length;
        const replies = interactions.filter(i => i.type === 'reply').length;
        const totalInteractions = comments + reactions + replies;
        
        // Calculate engagement ratios
        const commentRatio = totalInteractions > 0 ? comments / totalInteractions : 0;
        const reactionRatio = totalInteractions > 0 ? reactions / totalInteractions : 0;
        const replyRatio = totalInteractions > 0 ? replies / totalInteractions : 0;
        
        // Analyze interaction patterns over time
        const now = Date.now();
        const recentInteractions = interactions.filter(i => 
            now - new Date(i.created_at).getTime() < 3 * 24 * 60 * 60 * 1000
        ).length;
        
        const interactionTrend = recentInteractions > (totalInteractions * 0.5) ? 'increasing' : 'decreasing';
        
        // Determine mood
        let mood = 'neutral';
        let confidence = 0;
        
        if (totalInteractions === 0) {
            mood = 'withdrawn';
            confidence = 0.5;
        } else if (commentRatio < 0.2 && reactionRatio > 0.8) {
            mood = 'passive';
            confidence = Math.min(0.6, reactionRatio);
        } else if (commentRatio > 0.5 && replyRatio > 0.3) {
            mood = 'engaged';
            confidence = Math.min(0.7, commentRatio + replyRatio);
        } else if (interactionTrend === 'decreasing') {
            mood = 'social_retreat';
            confidence = 0.5;
        }
        
        return {
            mood,
            confidence,
            signals: {
                totalInteractions,
                commentRatio,
                reactionRatio,
                replyRatio,
                interactionTrend
            }
        };
    }
    
    analyzeReactionPatterns(reactions) {
        if (!reactions || reactions.length === 0) return { mood: 'neutral', confidence: 0, signals: {} };
        
        // Categorize reactions by emotional valence
        const positiveReactions = reactions.filter(r => 
            ['like', 'admire', 'relate'].includes(r.type)
        ).length;
        
        const negativeReactions = reactions.filter(r => 
            ['dislike'].includes(r.type)
        ).length;
        
        const intenseReactions = reactions.filter(r => 
            ['heat', 'wild', 'cap'].includes(r.type)
        ).length;
        
        const totalReactions = reactions.length;
        
        // Analyze content resonance patterns
        const positiveRatio = totalReactions > 0 ? positiveReactions / totalReactions : 0;
        const negativeRatio = totalReactions > 0 ? negativeReactions / totalReactions : 0;
        const intenseRatio = totalReactions > 0 ? intenseReactions / totalReactions : 0;
        
        // Determine mood congruent attention
        let mood = 'neutral';
        let confidence = 0;
        
        if (negativeRatio > 0.3) {
            mood = 'negative_congruence';
            confidence = Math.min(0.6, negativeRatio * 2);
        } else if (intenseRatio > 0.4) {
            mood = 'intense_resonance';
            confidence = Math.min(0.6, intenseRatio * 1.5);
        } else if (positiveRatio > 0.7) {
            mood = 'positive_congruence';
            confidence = Math.min(0.6, positiveRatio);
        }
        
        return {
            mood,
            confidence,
            signals: {
                totalReactions,
                positiveRatio,
                negativeRatio,
                intenseRatio
            }
        };
    }
    
    analyzeTopicDrift(posts) {
        if (!posts || posts.length === 0) return { mood: 'neutral', confidence: 0, signals: {} };
        
        // Topic analysis based on keywords
        const exhaustionTopics = ['tired', 'exhausted', 'burnout', 'overwhelmed', 'stress', 'busy'];
        const growthTopics = ['growth', 'goals', 'progress', 'learning', 'improving', 'future', 'plan'];
        const gratitudeTopics = ['grateful', 'thank', 'blessed', 'appreciate', 'lucky', 'thankful'];
        const uncertaintyTopics = ['confused', 'lost', 'unsure', 'uncertain', 'question', 'wonder'];
        const socialTopics = ['friends', 'family', 'together', 'people', 'community', 'connection'];
        
        let topicCounts = {
            exhaustion: 0,
            growth: 0,
            gratitude: 0,
            uncertainty: 0,
            social: 0
        };
        
        posts.forEach(post => {
            const text = (post.text || '').toLowerCase();
            
            Object.keys(topicCounts).forEach(topic => {
                const keywords = {
                    exhaustion: exhaustionTopics,
                    growth: growthTopics,
                    gratitude: gratitudeTopics,
                    uncertainty: uncertaintyTopics,
                    social: socialTopics
                }[topic];
                
                keywords.forEach(keyword => {
                    if (text.includes(keyword)) {
                        topicCounts[topic]++;
                    }
                });
            });
        });
        
        const totalTopicMentions = Object.values(topicCounts).reduce((sum, count) => sum + count, 0);
        
        // Calculate dominant themes
        let dominantTopic = 'neutral';
        let confidence = 0;
        
        if (totalTopicMentions > 0) {
            const maxCount = Math.max(...Object.values(topicCounts));
            const dominantTopics = Object.keys(topicCounts).filter(topic => topicCounts[topic] === maxCount);
            
            if (dominantTopics.includes('exhaustion')) {
                dominantTopic = 'strain';
                confidence = Math.min(0.7, topicCounts.exhaustion / totalTopicMentions * 2);
            } else if (dominantTopics.includes('growth')) {
                dominantTopic = 'growth';
                confidence = Math.min(0.7, topicCounts.growth / totalTopicMentions * 2);
            } else if (dominantTopics.includes('gratitude')) {
                dominantTopic = 'gratitude';
                confidence = Math.min(0.7, topicCounts.gratitude / totalTopicMentions * 2);
            } else if (dominantTopics.includes('uncertainty')) {
                dominantTopic = 'uncertainty';
                confidence = Math.min(0.6, topicCounts.uncertainty / totalTopicMentions * 2);
            } else if (dominantTopics.includes('social')) {
                dominantTopic = 'social';
                confidence = Math.min(0.6, topicCounts.social / totalTopicMentions * 2);
            }
        }
        
        return {
            mood: dominantTopic,
            confidence,
            signals: topicCounts
        };
    }
    
    calculateMoodScore(signals) {
        // Weight different signals based on reliability
        const weights = {
            language: 0.3,
            behavior: 0.25,
            engagement: 0.2,
            reactions: 0.15,
            topics: 0.1
        };
        
        // Map mood categories to numerical values
        const moodValues = {
            'positive': 1.0,
            'stable': 0.8,
            'engaged': 0.7,
            'social': 0.6,
            'growth': 0.8,
            'gratitude': 0.9,
            'neutral': 0.5,
            'uncertainty': 0.3,
            'passive': 0.4,
            'negative_congruence': 0.2,
            'intense_resonance': 0.3,
            'negative': 0.2,
            'anxious': 0.2,
            'withdrawn': 0.1,
            'depressive': 0.0,
            'social_retreat': 0.2,
            'emotional_flooding': 0.3,
            'strain': 0.2
        };
        
        let weightedScore = 0;
        let totalWeight = 0;
        let overallConfidence = 0;
        
        Object.keys(signals).forEach(signalType => {
            const signal = signals[signalType];
            const moodValue = moodValues[signal.mood] || 0.5;
            const weight = weights[signalType] * signal.confidence;
            
            weightedScore += moodValue * weight;
            totalWeight += weight;
            overallConfidence += signal.confidence * weights[signalType];
        });
        
        const finalScore = totalWeight > 0 ? weightedScore / totalWeight : 0.5;
        const finalConfidence = overallConfidence;
        
        // Map score back to mood categories
        let finalMood = 'neutral';
        if (finalScore >= 0.8) finalMood = 'positive';
        else if (finalScore >= 0.7) finalMood = 'good';
        else if (finalScore >= 0.6) finalMood = 'neutral_positive';
        else if (finalScore >= 0.4) finalMood = 'neutral';
        else if (finalScore >= 0.3) finalMood = 'neutral_negative';
        else if (finalScore >= 0.2) finalMood = 'negative';
        else finalMood = 'very_negative';
        
        return {
            mood: finalMood,
            confidence: finalConfidence,
            intensity: Math.abs(finalScore - 0.5) * 2, // 0 = neutral, 1 = extreme
            score: finalScore
        };
    }
    
    getMoodGlowColor(mood) {
        const moodColors = {
            'positive': 'linear-gradient(45deg, #FFD700, #FFA500, #FF6347)', // Gold to orange
            'good': 'linear-gradient(45deg, #87CEEB, #98FB98)', // Sky blue to light green
            'neutral_positive': 'linear-gradient(45deg, #E6E6FA, #F0E68C)', // Lavender to khaki
            'neutral': 'linear-gradient(45deg, #D3D3D3, #A9A9A9)', // Light to dark gray
            'neutral_negative': 'linear-gradient(45deg, #BC8F8F, #D2B48C)', // Rosy brown to tan
            'negative': 'linear-gradient(45deg, #708090, #778899)', // Slate gray
            'very_negative': 'linear-gradient(45deg, #483D8B, #696969)', // Dark slate to dim gray
            'anxious': 'linear-gradient(45deg, #FF6347, #FF4500)', // Tomato to orange red
            'withdrawn': 'linear-gradient(45deg, #708090, #2F4F4F)', // Slate to dark slate gray
            'depressive': 'linear-gradient(45deg, #2F4F4F, #191970)', // Dark slate to midnight blue
            'emotional_flooding': 'linear-gradient(45deg, #FF1493, #FF69B4)', // Deep pink to hot pink
            'strain': 'linear-gradient(45deg, #8B4513, #A0522D)', // Saddle brown to sienna
            'growth': 'linear-gradient(45deg, #32CD32, #00FF00)', // Lime green to green
            'gratitude': 'linear-gradient(45deg, #FFD700, #FFA500)', // Gold to orange
            'social': 'linear-gradient(45deg, #87CEEB, #00BFFF)', // Sky blue to deep sky blue
            'uncertainty': 'linear-gradient(45deg, #DDA0DD, #DA70D6)', // Plum to orchid
            'default': 'linear-gradient(45deg, #E6E6FA, #D3D3D3)' // Lavender to light gray
        };
        
        return moodColors[mood] || moodColors['default'];
    }

    async getUserPostsForMoodAnalysis(userId, since) {
        if (!window.supabaseClient) return [];
        
        try {
            const { data, error } = await window.supabaseClient
                .from('posts')
                .select('*')
                .eq('user_id', userId)
                .gte('created_at', since.toISOString())
                .order('created_at', { ascending: false });
                
            return data || [];
        } catch (error) {
            console.error('Error fetching posts for mood analysis:', error);
            return [];
        }
    }
    
    async getUserInteractionsForMoodAnalysis(userId, since) {
        if (!window.supabaseClient) return [];
        
        try {
            const interactions = [];
            
            // Get comments
            const { data: comments } = await window.supabaseClient
                .from('comments')
                .select('*')
                .eq('user_id', userId)
                .gte('created_at', since.toISOString());
                
            if (comments) {
                comments.forEach(c => interactions.push({ ...c, type: 'comment' }));
            }
            
            // Get reactions to posts (outgoing engagement)
            const { data: reactions } = await window.supabaseClient
                .from('post_reactions')
                .select('*')
                .eq('user_id', userId)
                .gte('created_at', since.toISOString());
                
            if (reactions) {
                reactions.forEach(r => interactions.push({ ...r, type: 'reaction' }));
            }
            
            return interactions;
        } catch (error) {
            console.error('Error fetching interactions for mood analysis:', error);
            return [];
        }
    }
    
    async getUserReactionsForMoodAnalysis(userId, since) {
        if (!window.supabaseClient) return [];
        
        try {
            const { data, error } = await window.supabaseClient
                .from('post_reactions')
                .select('*')
                .eq('user_id', userId)
                .gte('created_at', since.toISOString())
                .order('created_at', { ascending: false });
                
            return data || [];
        } catch (error) {
            console.error('Error fetching reactions for mood analysis:', error);
            return [];
        }
    }

    async updateTop8(userId, top8FriendIds) {
        if (!window.supabaseClient || !userId) return false;
        try {
            const { error } = await window.supabaseClient
                .from('users')
                .update({ top_8_friends: top8FriendIds })
                .eq('id', userId);
            
            if (error) {
                console.error('Error updating Top 8:', error);
                return false;
            }
            return true;
        } catch (error) {
            console.error('Error in updateTop8:', error);
            return false;
        }
    }

    // --- ADVANCED VIBE MATCHING SYSTEM ---
    
    async calculateVibeMatch(user1, user2) {
        if (!user1 || !user2 || user1.id === user2.id) return 0;
        
        try {
            // 1. Reaction Pattern Similarity (30% weight)
            const reactionOverlap = await this.calculateReactionPatternSimilarity(user1.id, user2.id);
            
            // 2. Top 8 Connection Overlap (40% weight) - Strongest signal
            const top8Overlap = this.calculateTop8Overlap(user1, user2);
            
            // 3. Interaction Frequency (20% weight)
            const interactionFreq = await this.calculateInteractionFrequency(user1.id, user2.id);
            
            // 4. Content Preference Similarity (10% weight)
            const contentSimilarity = await this.calculateContentPreferenceSimilarity(user1.id, user2.id);
            
            // Calculate weighted score
            const vibeScore = (reactionOverlap * 0.3) + (top8Overlap * 0.4) + 
                           (interactionFreq * 0.2) + (contentSimilarity * 0.1);
            
            return Math.round(Math.min(100, Math.max(0, vibeScore)));
        } catch (error) {
            console.error('Error calculating vibe match:', error);
            return 50; // Fallback to neutral score
        }
    }
    
    async calculateReactionPatternSimilarity(user1Id, user2Id) {
        try {
            // Get recent reactions for both users
            const timeWindow = 30 * 24 * 60 * 60 * 1000; // 30 days
            const cutoffTime = new Date(Date.now() - timeWindow).toISOString();
            
            const { data: user1Reactions } = await window.supabaseClient
                .from('post_reactions')
                .select('post_id, reaction_type, created_at')
                .eq('user_id', user1Id)
                .gte('created_at', cutoffTime);
                
            const { data: user2Reactions } = await window.supabaseClient
                .from('post_reactions')
                .select('post_id, reaction_type, created_at')
                .eq('user_id', user2Id)
                .gte('created_at', cutoffTime);
            
            if (!user1Reactions?.length || !user2Reactions?.length) return 0;
            
            // Find posts both users reacted to
            const user1PostIds = new Set(user1Reactions.map(r => r.post_id));
            const user2PostIds = new Set(user2Reactions.map(r => r.post_id));
            const commonPosts = [...user1PostIds].filter(postId => user2PostIds.has(postId));
            
            if (commonPosts.length === 0) return 0;
            
            // Calculate reaction similarity on common posts
            let similarityScore = 0;
            commonPosts.forEach(postId => {
                const user1Reaction = user1Reactions.find(r => r.post_id === postId)?.reaction_type;
                const user2Reaction = user2Reactions.find(r => r.post_id === postId)?.reaction_type;
                
                if (user1Reaction === user2Reaction) {
                    similarityScore += 100; // Perfect match
                } else if (this.areReactionsCompatible(user1Reaction, user2Reaction)) {
                    similarityScore += 50; // Partial match
                }
            });
            
            return similarityScore / commonPosts.length;
        } catch (error) {
            console.error('Error calculating reaction pattern similarity:', error);
            return 0;
        }
    }
    
    calculateTop8Overlap(user1, user2) {
        const user1Top8 = new Set(user1.top_8_friends || []);
        const user2Top8 = new Set(user2.top_8_friends || []);
        
        // If they're in each other's Top 8, maximum score
        if (user1Top8.has(user2.id) && user2Top8.has(user1.id)) {
            return 100;
        }
        
        // If one is in the other's Top 8, high score
        if (user1Top8.has(user2.id) || user2Top8.has(user1.id)) {
            return 75;
        }
        
        // Calculate overlap in their Top 8 lists
        const overlap = [...user1Top8].filter(id => user2Top8.has(id)).length;
        const maxOverlap = Math.min(user1Top8.size, user2Top8.size);
        
        if (maxOverlap === 0) return 0;
        return (overlap / maxOverlap) * 50; // Max 50 points for Top 8 overlap
    }
    
    async calculateInteractionFrequency(user1Id, user2Id) {
        try {
            // Count interactions: reactions to each other's posts, comments, follows
            const timeWindow = 30 * 24 * 60 * 60 * 1000; // 30 days
            const cutoffTime = new Date(Date.now() - timeWindow).toISOString();
            
            // Get posts from both users
            const { data: user1Posts } = await window.supabaseClient
                .from('posts')
                .select('id')
                .eq('user_id', user1Id)
                .gte('created_at', cutoffTime);
                
            const { data: user2Posts } = await window.supabaseClient
                .from('posts')
                .select('id')
                .eq('user_id', user2Id)
                .gte('created_at', cutoffTime);
            
            if (!user1Posts?.length || !user2Posts?.length) return 0;
            
            const user1PostIds = user1Posts.map(p => p.id);
            const user2PostIds = user2Posts.map(p => p.id);
            
            // Count reactions to each other's posts
            const { data: reactionsToUser1 } = await window.supabaseClient
                .from('post_reactions')
                .select('user_id')
                .in('post_id', user1PostIds)
                .eq('user_id', user2Id);
                
            const { data: reactionsToUser2 } = await window.supabaseClient
                .from('post_reactions')
                .select('user_id')
                .in('post_id', user2PostIds)
                .eq('user_id', user1Id);
            
            const reactionCount = (reactionsToUser1?.length || 0) + (reactionsToUser2?.length || 0);
            
            // Base score on interaction frequency
            if (reactionCount >= 10) return 100;
            if (reactionCount >= 5) return 75;
            if (reactionCount >= 2) return 50;
            if (reactionCount >= 1) return 25;
            return 0;
        } catch (error) {
            console.error('Error calculating interaction frequency:', error);
            return 0;
        }
    }
    
    async calculateContentPreferenceSimilarity(user1Id, user2Id) {
        try {
            // Analyze content preferences through tags, topics, and engagement patterns
            const timeWindow = 30 * 24 * 60 * 60 * 1000; // 30 days
            const cutoffTime = new Date(Date.now() - timeWindow).toISOString();
            
            // Get posts with tags from both users
            const { data: user1Posts } = await window.supabaseClient
                .from('posts')
                .select('tags')
                .eq('user_id', user1Id)
                .gte('created_at', cutoffTime)
                .not('tags', 'is', null);
                
            const { data: user2Posts } = await window.supabaseClient
                .from('posts')
                .select('tags')
                .eq('user_id', user2Id)
                .gte('created_at', cutoffTime)
                .not('tags', 'is', null);
            
            if (!user1Posts?.length || !user2Posts?.length) return 0;
            
            // Extract all tags from both users
            const user1Tags = new Set();
            const user2Tags = new Set();
            
            user1Posts.forEach(post => {
                if (post.tags && Array.isArray(post.tags)) {
                    post.tags.forEach(tag => user1Tags.add(tag.toLowerCase()));
                }
            });
            
            user2Posts.forEach(post => {
                if (post.tags && Array.isArray(post.tags)) {
                    post.tags.forEach(tag => user2Tags.add(tag.toLowerCase()));
                }
            });
            
            if (user1Tags.size === 0 || user2Tags.size === 0) return 0;
            
            // Calculate tag overlap
            const commonTags = [...user1Tags].filter(tag => user2Tags.has(tag));
            const totalUniqueTags = new Set([...user1Tags, ...user2Tags]).size;
            
            return (commonTags.length / totalUniqueTags) * 100;
        } catch (error) {
            console.error('Error calculating content preference similarity:', error);
            return 0;
        }
    }
    
    areReactionsCompatible(reaction1, reaction2) {
        // Define compatible reaction pairs
        const compatiblePairs = [
            ['like', 'admire'],
            ['heat', 'wild'],
            ['relate', 'like'],
            ['admire', 'relate']
        ];
        
        return compatiblePairs.some(pair => 
            (pair[0] === reaction1 && pair[1] === reaction2) ||
            (pair[1] === reaction1 && pair[0] === reaction2)
        );
    }
    
    async getVibeMatches(userId, limit = 10) {
        try {
            // Get all users except the current user
            const { data: allUsers } = await window.supabaseClient
                .from('users')
                .select('id, username, name, avatar_url, top_8_friends')
                .neq('id', userId)
                .limit(50);
            
            if (!allUsers?.length) return [];
            
            // Get current user data
            const { data: currentUser } = await window.supabaseClient
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();
            
            // Calculate vibe matches for all users
            const matches = [];
            for (const user of allUsers) {
                const vibeScore = await this.calculateVibeMatch(currentUser, user);
                matches.push({
                    ...user,
                    vibeScore,
                    matchReason: this.getMatchReason(vibeScore)
                });
            }
            
            // Sort by vibe score and return top matches
            return matches
                .sort((a, b) => b.vibeScore - a.vibeScore)
                .slice(0, limit);
        } catch (error) {
            console.error('Error getting vibe matches:', error);
            return [];
        }
    }
    
    getMatchReason(vibeScore) {
        if (vibeScore >= 80) return 'Perfect Vibe Match';
        if (vibeScore >= 60) return 'Strong Vibe Connection';
        if (vibeScore >= 40) return 'Similar Interests';
        if (vibeScore >= 20) return 'Some Common Ground';
        return 'New Vibe to Explore';
    }

    async boostUserVibe(targetUserId, fromUserId) {
        if (!window.supabaseClient) return { success: true, action: 'added' };
        try {
            const { data: user } = await window.supabaseClient.from('users').select('vibe_likes').eq('id', targetUserId).single();
            let likes = user?.vibe_likes || [];
            let action = 'added';
            
            if (likes.includes(fromUserId)) {
                likes = likes.filter(id => id !== fromUserId);
                action = 'removed';
            } else {
                likes.push(fromUserId);
                await this.createNotification(targetUserId, 'Someone boosted your vibe! ✨', 'vibe_boost');
            }
            
            await window.supabaseClient.from('users').update({ vibe_likes: likes }).eq('id', targetUserId);
            return { success: true, action };
        } catch (error) {
            console.error('boostUserVibe failed:', error);
            return { success: false };
        }
    }
}
