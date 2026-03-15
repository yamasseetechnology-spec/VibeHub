/**
 * VIBEHUB SERVICE LAYER
 * Supabase-powered services for production.
 */
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// --- AUTH SERVICE ---
export class AuthService {
    constructor() {
        this.user = null;
        this.initializeAuthListener();
    }

    initializeAuthListener() {
        supabaseClient.auth.onAuthStateChange((event, session) => {
            if (session) {
                this.user = session.user;
                localStorage.setItem('vibehub_user', JSON.stringify(this.user));
            } else {
                this.user = null;
                localStorage.removeItem('vibehub_user');
            }
        });
    }

    async checkSession() {
        if (this.user) return this.user;
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            this.user = session.user;
            localStorage.setItem('vibehub_user', JSON.stringify(this.user));
        }
        return this.user;
    }

    async login(email, password) {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });
        if (error) throw error;
        // Ensure profile exists
        await this.ensureProfileExists(data.user);
        this.user = data.user;
        localStorage.setItem('vibehub_user', JSON.stringify(this.user));
        return this.user;
    }

    async signUp(email, password, fullName) {
        const { data, error } = await supabaseClient.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName
                }
            }
        });
        if (error) throw error;
        // Note: email confirmation handled separately
        return data;
    }

    async logout() {
        await supabaseClient.auth.signOut();
        this.user = null;
        localStorage.removeItem('vibehub_user');
    }

    async ensureProfileExists(user) {
        const { data: existingProfile } = await supabaseClient
            .from('users')
            .select('id')
            .eq('id', user.id)
            .single();

        if (!existingProfile) {
            await supabaseClient
                .from('users')
                .insert({
                    id: user.id,
                    clerk_id: user.id,
                    username: user.email.split('@')[0],
                    name: user.user_metadata?.full_name || user.email.split('@')[0],
                    avatar_url: 'https://i.pravatar.cc/150?u=' + user.id,
                    email: user.email,
                    role: user.email === 'yamasseetechnology@gmail.com' ? 'admin' : 'user'
                });
        }
    }
}

// --- DATA SERVICE (Posts, Communities, Marketplace) ---
export class DataService {
    constructor() {
    }

    async addPost(postObj) {
        try {
            let mediaUrl = null;
            let mediaType = 'none';
            
            if (postObj.mediaFile) {
                const fileExt = postObj.mediaFile.name.split('.').pop().toLowerCase();
                const filePath = `posts/${postObj.userId}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
                
                const { data: uploadData, error: uploadError } = await supabaseClient.storage
                    .from('post-media')
                    .upload(filePath, postObj.mediaFile);
                    
                if (uploadError) throw uploadError;
                const { data: publicUrlData } = await supabaseClient.storage
                    .from('post-media')
                    .getPublicUrl(filePath);
                mediaUrl = publicUrlData.publicUrl;
                mediaType = postObj.mediaFile.type.startsWith('video/') ? 'video' : 'image';
            }

            const { data: postData, error: postError } = await supabaseClient
                .from('posts')
                .insert({
                    user_id: postObj.userId,
                    text: postObj.content,
                    media_url: mediaUrl,
                    media_type: mediaType,
                    username: postObj.handle, // For legacy support/denormalization
                    tags: postObj.tags || []
                })
                .select(`
                    *,
                    users (
                        id, username, name, avatar_url, verified
                    )
                `)
                .single();

            if (postError) throw postError;
            return this.formatPost(postData);
        } catch (error) {
            console.error('Error adding post:', error);
            throw error;
        }
    }

    async getPosts(tab = 'all', communityId = null, limit = 20, offset = 0) {
        try {
            let query = supabaseClient
                .from('posts')
                .select(`
                    *,
                    users (
                        id, username, name, avatar_url, verified, role
                    )
                `)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);
    
            // Filter by tags/mood if tab maps to something?
            // Current schema doesn't have 'tab' column, let's use tags or text search
            if (tab !== 'all') {
                // query = query.contains('tags', [tab]); // Example
            }

            const { data: posts, error } = await query;
            if (error) throw error;
    
            return posts.map(post => this.formatPost(post));
        } catch (error) {
            console.error('Error getting posts:', error);
            throw error;
        }
    }

    async getComments(postId, limit = 50, offset = 0) {
        try {
            const { data: comments, error } = await supabaseClient
                .from('comments')
                .select(`
                    *,
                    users!inner (
                        id, username, name, avatar_url
                    )
                `)
                .eq('post_id', postId)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) throw error;
            return comments;
        } catch (error) {
            console.error('Error getting comments:', error);
            throw error;
        }
    }

    async addComment(postId, userId, content, mediaFile = null) {
        try {
            let mediaUrl = null;
            
            if (mediaFile) {
                const fileExt = mediaFile.name.split('.').pop().toLowerCase();
                const filePath = `comments/${postId}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
                
                const { error: uploadError } = await supabaseClient.storage
                    .from('comment-media')
                    .upload(filePath, mediaFile);
                    
                if (uploadError) throw uploadError;
                const { data: publicUrlData } = await supabaseClient.storage
                    .from('comment-media')
                    .getPublicUrl(filePath);
                mediaUrl = publicUrlData.publicUrl;
            }

            const { data: commentData, error } = await supabaseClient
                .from('comments')
                .insert({
                    post_id: postId,
                    user_id: userId,
                    text: content,
                    audio_url: mediaUrl // Matching schema
                })
                .select(`
                    *,
                    users!inner (
                        id, username, name, avatar_url
                    )
                `)
                .single();

            if (error) throw error;
            return commentData;
        } catch (error) {
            console.error('Error adding comment:', error);
            throw error;
        }
    }

    async getCommunities() {
        try {
            const { data: communities, error } = await supabaseClient
                .from('channels') // Migration uses channels
                .select('*')
                .order('name');
                
            if (error) throw error;
            return communities;
        } catch (error) {
            console.error('Error getting communities:', error);
            throw error;
        }
    }

    async getMarketplace() {
        try {
            const { data: marketplace, error } = await supabaseClient
                .from('marketplace')
                .select('*')
                .order('created_at', { ascending: false });
                
            if (error) throw error;
            return marketplace;
        } catch (error) {
            console.error('Error getting marketplace:', error);
            throw error;
        }
    }

    formatPost(post) {
        if (!post) return null;
        // Extract reaction counts from JSONB
        const reactionCounts = {};
        if (post.reactions) {
            Object.keys(post.reactions).forEach(type => {
                reactionCounts[type] = post.reactions[type]?.length || 0;
            });
        }

        return {
            id: post.id,
            userId: post.user_id,
            displayName: post.users?.name || post.username || 'Unknown User',
            handle: post.users?.username || post.username || 'user',
            avatar: post.users?.avatar_url || post.user_avatar || 'https://i.pravatar.cc/150?u=unknown',
            content: post.text, // Schema uses text
            media: post.media_url,
            type: post.media_type || 'none',
            engagement: post.comment_count + Object.values(reactionCounts).reduce((a, b) => a + b, 0),
            reactions: reactionCounts,
            comments: [], 
            timestamp: this.formatTimestamp(post.created_at),
            isSponsored: false, 
            tab: post.mood || 'all',
            hashtag: post.tags?.[0] || null,
            communityId: null
        };
    }

    formatTimestamp(isoString) {
        if (!isoString) return '';
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    }
}

// --- VIDEO SERVICE (VibeStream) ---
export class VideoService {
    async getVibeStream() {
        try {
            const { data: streams, error } = await supabaseClient
                .from('videos') // Migration uses videos
                .select(`
                    *,
                    channels!inner (
                        id, name, owner_id
                    )
                `)
                .order('created_at', { ascending: false });
                
            if (error) throw error;
            return streams;
        } catch (error) {
            console.error('Error getting vibe streams:', error);
            return [];
        }
    }
}

// --- CHAT SERVICE (Sync Rooms & DMs) ---
export class ChatService {
    async getSyncRooms() {
        try {
            const { data: rooms, error } = await supabaseClient
                .from('sync_spaces') // Match schema
                .select(`
                    *,
                    users (
                        id, username, name
                    )
                `)
                .order('name');
                
            if (error) throw error;
            return rooms;
        } catch (error) {
            console.error('Error getting sync rooms:', error);
            return [];
        }
    }

    async getMessages() {
        try {
            const { data: messages, error } = await supabaseClient
                .from('messages') // Match schema
                .select(`
                    *,
                    users (
                        id, username, name
                    )
                `)
                .order('created_at', { ascending: false });
                
            if (error) throw error;
            return messages;
        } catch (error) {
            console.error('Error getting messages:', error);
            return [];
        }
    }

    async sendMessage(senderId, receiverId, content) {
        try {
            const { data: message, error } = await supabaseClient
                .from('messages')
                .insert({
                    sender_id: senderId,
                    receiver_id: receiverId,
                    text: content,
                    conversation_id: [senderId, receiverId].sort().join(':')
                })
                .select()
                .single();
                
            if (error) throw error;
            return message;
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }
}

// --- ADMIN SERVICE ---
export class AdminService {
    async getStats() {
        try {
            const [usersResult, postsResult, reportsResult] = await Promise.all([
                supabaseClient.from('users').select('id', { count: 'exact', head: true }),
                supabaseClient.from('posts').select('id', { count: 'exact', head: true }),
                supabaseClient.from('reports').select('id', { count: 'exact', head: true })
            ]);

            return {
                users: usersResult.count || 0,
                activeNow: Math.floor((usersResult.count || 0) * 0.1),
                postsToday: postsResult.count || 0,
                reports: reportsResult.count || 0
            };
        } catch (error) {
            console.error('Error getting admin stats:', error);
            return { users: 0, activeNow: 0, postsToday: 0, reports: 0 };
        }
    }

    async mergeAdminData(legacyEmail, targetUsername = 'KingKool23') {
        try {
            // Find target user
            const { data: targetUser } = await supabaseClient
                .from('users')
                .select('id')
                .eq('username', targetUsername)
                .single();

            if (!targetUser) throw new Error('Target user not found');

            // Find legacy user
            const { data: legacyUser } = await supabaseClient
                .from('users')
                .select('id')
                .eq('email', legacyEmail)
                .single();

            if (!legacyUser) throw new Error('Legacy user not found');

            // Transfer posts
            await supabaseClient.from('posts').update({ user_id: targetUser.id }).eq('user_id', legacyUser.id);
            // Transfer comments
            await supabaseClient.from('comments').update({ user_id: targetUser.id }).eq('user_id', legacyUser.id);
            // Delete legacy user
            await supabaseClient.from('users').delete().eq('id', legacyUser.id);

            return { success: true };
        } catch (error) {
            console.error('Merge error:', error);
            return { success: false, error: error.message };
        }
    }

    async banUser(userId) {
        return await supabaseClient.from('users').update({ role: 'banned' }).eq('id', userId);
    }

    async deletePost(postId) {
        return await supabaseClient.from('posts').delete().eq('id', postId);
    }
}