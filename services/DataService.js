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
            { user_id: 'u1', username: 'echo_mind', user_avatar: 'https://i.pravatar.cc/150?u=vibehub1', text: 'The geometry of thought is fascinating.', media_url: 'https://images.unsplash.com/photo-1633167606207-d840b5070fc2?w=800', media_type: 'image', tags: ['mindfulness'], mood: '🧠', likes: ['u2'], dislikes: [], reactions: { cap: [], relate: [], wild: [], facts: [] }, comment_count: 0 }
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
                user_id: postObj.userId,
                username: postObj.username || postObj.handle,
                user_avatar: postObj.avatar,
                text: postObj.content || postObj.text,
                media_url: mediaUrl,
                media_type: mediaType,
                tags: postObj.tags || [],
                likes: [],
                dislikes: [],
                reactions: { cap: [], relate: [], wild: [], facts: [] },
                created_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
            };
            const insertResult = await window.supabaseClient.from('posts').insert([{ ...postData, comment_count: 0 }]).select();
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
            let query = window.supabaseClient.from('posts').select('*, users(*)').order('created_at', { ascending: false });
            if (communityId) query = query.eq('community_id', communityId);
            const { data, error } = await query;
            if (error) throw error;
            let posts = this.mapPosts(data);
            await this.cache.cachePosts(cacheKey, posts);
            return posts;
        } catch (error) { console.error('getPosts failed:', error); return []; }
    }

    mapPosts(data) {
        return (data || []).map(post => {
            const user = post.users || {};
            return {
                id: post.id,
                userId: post.user_id,
                displayName: user.name || post.username,
                handle: user.username || post.username,
                avatar: user.avatar_url || post.user_avatar || `https://i.pravatar.cc/150?u=${post.user_id}`,
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
            if (reactionType === 'like' || reactionType === 'dislike') {
                const field = reactionType === 'like' ? 'likes' : 'dislikes';
                let list = post[field] || [];
                if (list.includes(userId)) { list = list.filter(id => id !== userId); isRemoving = true; } else { list.push(userId); }
                await window.supabaseClient.from('posts').update({ [field]: list }).eq('id', postId);
            } else {
                let reactions = post.reactions || { cap: [], relate: [], wild: [], facts: [], heat: [] };
                if (!reactions[reactionType]) reactions[reactionType] = [];
                if (reactions[reactionType].includes(userId)) { reactions[reactionType] = reactions[reactionType].filter(id => id !== userId); isRemoving = true; } else { reactions[reactionType].push(userId); }
                await window.supabaseClient.from('posts').update({ reactions }).eq('id', postId);
            }
            return { success: true };
        } catch (error) { return { success: false, error: error.message }; }
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
    
    // ... (rest of simple methods like getUserProfile, createNotification, etc are in the temp file)
}
