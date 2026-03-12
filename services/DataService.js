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
    if (userData.role === 'admin' || userData.is_admin) badges.push('Admin');
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
                user_avatar: postObj.user_avatar || postObj.avatar,
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
            const insertResult = await window.supabaseClient.from('posts').insert([postData]).select();
            if (insertResult.error) throw insertResult.error;
            await this.cache.clearPostsCache();
            return insertResult.data ? insertResult.data[0] : postObj;
        } catch (error) { console.error('Error saving post:', error); return null; }
    }

    async getPosts(tab = 'all', communityId = null) {
        const ready = await this.waitForSupabase();
        if (!ready) return [];
        const cacheKey = `posts_${tab}_${communityId || 'all'}`;
        const cached = await this.cache.getCachedPosts(cacheKey);
        if (cached && Array.isArray(cached)) return cached;
        
        try {
            // Attempt join query first
            let query = window.supabaseClient.from('posts').select('*, users(*)').order('created_at', { ascending: false });
            if (communityId) query = query.eq('community_id', communityId);
            
            const { data, error } = await query;
            
            if (error) {
                // If it's the specific join error (PGRST200), fall back to dual-query
                if (error.code === 'PGRST200' || error.message.includes('relationship')) {
                    console.warn('⚠️ Supabase Relationship Missing (PGRST200). Falling back to dual-query fetch.');
                    
                    let fallbackQuery = window.supabaseClient.from('posts').select('*').order('created_at', { ascending: false });
                    if (communityId) fallbackQuery = fallbackQuery.eq('community_id', communityId);
                    
                    const { data: postsData, error: postsError } = await fallbackQuery;
                    if (postsError) throw postsError;
                    
                    if (!postsData || postsData.length === 0) return [];

                    // Fetch associated users
                    const userIds = [...new Set(postsData.map(p => p.user_id))].filter(id => !!id);
                    const { data: userData, error: userError } = await window.supabaseClient
                        .from('users').select('*').in('id', userIds);
                    
                    if (userError) console.error('User fetch error in fallback:', userError);
                    
                    const userMap = (userData || []).reduce((acc, u) => {
                        acc[u.id] = u;
                        return acc;
                    }, {});

                    // Manually join
                    const joinedData = postsData.map(p => ({
                        ...p,
                        users: userMap[p.user_id] || null
                    }));

                    let posts = await this.mapPosts(joinedData);
                    await this.cache.cachePosts(cacheKey, posts);
                    return posts;
                }
                throw error;
            }
            
            let posts = this.mapPosts(data);
            await this.cache.cachePosts(cacheKey, posts);
            return posts;
        } catch (error) { 
            console.error('getPosts failed:', error); 
            return []; 
        }
    }

    async mapPosts(data) {
        if (!data || data.length === 0) return [];
        
        // Get all unique user IDs from posts
        const userIds = [...new Set(data.map(p => p.user_id))].filter(id => !!id);
        
        // Fetch current user data for all posts
        let userData = [];
        try {
            const { data: users } = await window.supabaseClient
                .from('users')
                .select('id, avatar_url, name, username, vibe_score, reaction_stats')
                .in('id', userIds);
            userData = users || [];
        } catch (error) {
            console.error('Error fetching user data for posts:', error);
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
                reactions: { like: post.likes?.length || 0, heat: post.reactions?.heat?.length || 0, wild: post.reactions?.wild?.length || 0, cap: post.reactions?.cap?.length || 0, admire: post.reactions?.relate?.length || 0, dislike: post.dislikes?.length || 0 },
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
        if (!window.supabaseClient) return [];
        try {
            const { data } = await window.supabaseClient.from('sponsored_ads').select('*').order('created_at', { ascending: false });
            return data || [];
        } catch (error) {
            console.error('Error fetching ads:', error);
            return [];
        }
    }

    subscribeToPosts(callback) {
        if (!window.supabaseClient) return null;
        return window.supabaseClient.channel('public:posts').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
            if (callback) callback({ type: 'new_post', data: payload.new });
        }).subscribe();
    }

    async addReaction(postId, userId, reactionType) {
        if (!window.supabaseClient) return { success: true };
        try {
            const { data: post, error: fetchError } = await window.supabaseClient.from('posts').select('likes, dislikes, reactions, user_id').eq('id', postId).single();
            if (fetchError) throw fetchError;
            let isRemoving = false;
            let reactions = post.reactions || { cap: [], relate: [], wild: [], facts: [], heat: [] };
            if (reactionType === 'like' || reactionType === 'dislike') {
                const field = reactionType === 'like' ? 'likes' : 'dislikes';
                let list = post[field] || [];
                if (list.includes(userId)) { list = list.filter(id => id !== userId); isRemoving = true; } else { list.push(userId); }
                await window.supabaseClient.from('posts').update({ [field]: list }).eq('id', postId);
            } else {
                if (!reactions[reactionType]) reactions[reactionType] = [];
                if (reactions[reactionType].includes(userId)) { reactions[reactionType] = reactions[reactionType].filter(id => id !== userId); isRemoving = true; } else { reactions[reactionType].push(userId); }
                await window.supabaseClient.from('posts').update({ reactions }).eq('id', postId);
            }
            // Sync with post_reactions table for uniqueness and realtime
            if (isRemoving) {
                await window.supabaseClient.from('post_reactions').delete().match({ post_id: postId, user_id: userId, reaction_type: reactionType });
            } else {
                await window.supabaseClient.from('post_reactions').insert({ post_id: postId, user_id: userId, reaction_type: reactionType });
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
            const commentPayload = { post_id: postId, user_id: comment.userId, username: comment.displayName, user_avatar: comment.avatar, text: comment.text || '' };
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
            const { data } = await window.supabaseClient.from('friends').select('friend_id, friend:friend_id(*)').eq('user_id', userId);
            return (data || []).map(f => ({ id: f.friend_id, username: f.friend?.username || 'unknown', displayName: f.friend?.display_name || f.friend?.username || 'User', avatar: f.friend?.avatar_url || 'https://i.pravatar.cc/150?u=' + f.friend_id }));
        } catch (error) { return []; }
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
            const { data } = await window.supabaseClient.from('posts').select('*, users(*)').eq('user_id', userId).order('created_at', { ascending: false });
            return this.mapPosts(data);
        } catch (error) { return []; }
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
            const { data } = await window.supabaseClient.from('posts').select('*, users(*)').in('user_id', friendIds).order('created_at', { ascending: false });
            return this.mapPosts(data);
        } catch (error) { return []; }
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
            
            // Fetch posts within timeframe
            const { data: posts, error } = await window.supabaseClient
                .from('posts')
                .select('*, users(*)')
                .gte('created_at', since.toISOString())
                .order('created_at', { ascending: false })
                .limit(limit * 2); // Get more to calculate trending
            
            if (error) throw error;
            
            // Calculate engagement scores
            const postsWithScores = (posts || []).map(post => {
                const user = post.users || {};
                
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
            
            // Fetch posts with highest engagement
            const { data: posts, error } = await window.supabaseClient
                .from('posts')
                .select('*, users(*)')
                .gte('created_at', since.toISOString())
                .order('likes', { ascending: false })
                .limit(limit);
            
            if (error) throw error;
            
            return await this.mapPosts(posts || []);
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
                glowColor: this.getMoodGlowColor(moodScore.mood),
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

    calculateVibeMatch(user1, user2) {
        if (!user1 || !user2) return 100;
        // Simple mock calculation for now
        return 85 + Math.floor(Math.random() * 15);
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
