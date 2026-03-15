/**
 * VIBEHUB SERVICE LAYER
 * Supabase-powered services for production.
 */

// FIXED: Import createClient normally — Vite bundles this from node_modules
import { createClient } from '@supabase/supabase-js';

// FIXED: Standard Vite env var pattern
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase env vars missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to GitHub Actions secrets.');
}

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
            } else {
                this.user = null;
                localStorage.removeItem('vibehub_user');
            }
        });
    }

    async checkSession() {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            this.user = session.user;
            // FIXED: Always load the full profile (with role) from users table
            const profile = await this.getFullProfile(session.user);
            return profile;
        }
        return null;
    }

    async login(email, password) {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;

        this.user = data.user;

        // FIXED: ensureProfileExists now returns the full profile object
        const profile = await this.ensureProfileExists(data.user);
        return profile;
    }

    async signUp(email, password, fullName) {
        const { data, error } = await supabaseClient.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName } }
        });
        if (error) throw error;
        return data;
    }

    async logout() {
        await supabaseClient.auth.signOut();
        this.user = null;
        localStorage.removeItem('vibehub_user');
    }

    // FIXED: Now returns the full profile object (including role from users table)
    // Previously returned undefined, causing State.user to always be the raw auth user
    async ensureProfileExists(authUser) {
        try {
            // Try to fetch existing profile
            const { data: existingProfile, error: fetchError } = await supabaseClient
                .from('users')
                .select('id, username, name, avatar_url, bio, email, role, created_at, verified')
                .eq('id', authUser.id)
                .single();

            if (existingProfile) {
                // Profile found — return it merged with auth user data
                return this.mergeAuthAndProfile(authUser, existingProfile);
            }

            // No profile — create one
            const newProfile = {
                id: authUser.id,
                clerk_id: authUser.id,
                username: authUser.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_'),
                name: authUser.user_metadata?.full_name || authUser.email.split('@')[0],
                avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + authUser.id,
                email: authUser.email,
                role: authUser.email === 'yamasseetechnology@gmail.com' ? 'admin' : 'user'
            };

            const { data: inserted, error: insertError } = await supabaseClient
                .from('users')
                .insert(newProfile)
                .select('id, username, name, avatar_url, bio, email, role, created_at, verified')
                .single();

            if (insertError) {
                console.error('Profile insert error:', insertError);
                // Insert failed (likely duplicate) — try fetching again
                const { data: retryProfile } = await supabaseClient
                    .from('users')
                    .select('id, username, name, avatar_url, bio, email, role, created_at, verified')
                    .eq('id', authUser.id)
                    .single();
                if (retryProfile) return this.mergeAuthAndProfile(authUser, retryProfile);
            }

            return this.mergeAuthAndProfile(authUser, inserted || newProfile);
        } catch (err) {
            console.error('ensureProfileExists error:', err);
            // Fallback: return auth user with a default role
            return {
                ...authUser,
                role: authUser.email === 'yamasseetechnology@gmail.com' ? 'admin' : 'user',
                username: authUser.email?.split('@')[0] || 'user',
                name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
                avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + authUser.id
            };
        }
    }

    // FIXED: Loads full profile from users table (for session restore on refresh)
    async getFullProfile(authUser) {
        try {
            const { data: profile } = await supabaseClient
                .from('users')
                .select('id, username, name, avatar_url, bio, email, role, created_at, verified')
                .eq('id', authUser.id)
                .single();

            if (profile) return this.mergeAuthAndProfile(authUser, profile);
        } catch (err) {
            console.warn('Could not load profile, using auth user:', err);
        }
        // Fallback
        return {
            ...authUser,
            role: authUser.email === 'yamasseetechnology@gmail.com' ? 'admin' : 'user',
            username: authUser.email?.split('@')[0] || 'user',
            name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + authUser.id
        };
    }

    // Utility: merge Supabase auth user with profile row into one clean object
    mergeAuthAndProfile(authUser, profile) {
        return {
            id: authUser.id,
            email: authUser.email,
            role: profile.role || 'user',            // role from users table
            username: profile.username || authUser.email?.split('@')[0],
            name: profile.name || authUser.user_metadata?.full_name || profile.username,
            avatar_url: profile.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + authUser.id,
            bio: profile.bio || '',
            verified: profile.verified || false,
            created_at: profile.created_at || authUser.created_at,
            // Keep original auth fields accessible
            user_metadata: authUser.user_metadata
        };
    }
}

// --- DATA SERVICE (Posts, Communities, Marketplace) ---
export class DataService {

    async addPost(postObj) {
        try {
            let mediaUrl = null;
            let mediaType = 'none';

            if (postObj.mediaFile) {
                const fileExt = postObj.mediaFile.name.split('.').pop().toLowerCase();
                // FIXED: Unique file path prevents collisions and wrong-image bugs
                const filePath = `posts/${postObj.userId}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

                const { error: uploadError } = await supabaseClient.storage
                    .from('post-media')
                    .upload(filePath, postObj.mediaFile);

                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabaseClient.storage
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
                    username: postObj.handle,
                    tags: postObj.tags || []
                })
                .select(`*, users (id, username, name, avatar_url, verified)`)
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
                .select(`*, users (id, username, name, avatar_url, verified, role)`)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            const { data: posts, error } = await query;
            if (error) throw error;

            // FIXED: Guard against null response (can happen with RLS misconfiguration)
            if (!posts) return [];
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
                .select(`*, users!inner (id, username, name, avatar_url)`)
                .eq('post_id', postId)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) throw error;
            return comments || [];
        } catch (error) {
            console.error('Error getting comments:', error);
            return [];
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
                const { data: publicUrlData } = supabaseClient.storage
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
                    audio_url: mediaUrl
                })
                .select(`*, users!inner (id, username, name, avatar_url)`)
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
                .from('channels')
                .select('*')
                .order('name');

            if (error) throw error;
            return communities || [];
        } catch (error) {
            console.error('Error getting communities:', error);
            return [];
        }
    }

    async getMarketplace() {
        try {
            const { data: marketplace, error } = await supabaseClient
                .from('marketplace')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return marketplace || [];
        } catch (error) {
            console.error('Error getting marketplace:', error);
            return [];
        }
    }

    formatPost(post) {
        if (!post) return null;
        const reactionCounts = {};
        if (post.reactions && typeof post.reactions === 'object') {
            Object.keys(post.reactions).forEach(type => {
                reactionCounts[type] = Array.isArray(post.reactions[type])
                    ? post.reactions[type].length
                    : (Number(post.reactions[type]) || 0);
            });
        }

        return {
            id: post.id,
            userId: post.user_id,
            displayName: post.users?.name || post.username || 'Unknown User',
            handle: post.users?.username || post.username || 'user',
            avatar: post.users?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + post.user_id,
            content: post.text || '',
            // FIXED: Use exact media_url from DB — no random images
            media: post.media_url || null,
            type: post.media_type || 'none',
            engagement: (post.comment_count || 0) + Object.values(reactionCounts).reduce((a, b) => a + b, 0),
            reactions: reactionCounts,
            comments: [],
            timestamp: this.formatTimestamp(post.created_at),
            isSponsored: false,
            tab: post.mood || 'all',
            hashtag: post.tags?.[0] || null,
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
                .from('videos')
                .select(`*, channels!inner (id, name, owner_id)`)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return streams || [];
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
                .from('sync_spaces')
                .select(`*, users (id, username, name)`)
                .order('name');

            if (error) throw error;
            return rooms || [];
        } catch (error) {
            console.error('Error getting sync rooms:', error);
            return [];
        }
    }

    async getMessages(userId, partnerId = null) {
        try {
            let query = supabaseClient
                .from('messages')
                .select(`*, users (id, username, name, avatar_url)`)
                .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
                .order('created_at', { ascending: false })
                .limit(50);

            if (partnerId) {
                const convoId = [userId, partnerId].sort().join(':');
                query = supabaseClient
                    .from('messages')
                    .select(`*, users (id, username, name, avatar_url)`)
                    .eq('conversation_id', convoId)
                    .order('created_at', { ascending: true });
            }

            const { data: messages, error } = await query;
            if (error) throw error;
            return messages || [];
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
            const [usersResult, postsResult, reportsResult] = await Promise.allSettled([
                supabaseClient.from('users').select('id', { count: 'exact', head: true }),
                supabaseClient.from('posts').select('id', { count: 'exact', head: true }),
                // FIXED: Use allSettled so a missing 'reports' table doesn't crash the panel
                supabaseClient.from('reports').select('id', { count: 'exact', head: true })
            ]);

            return {
                users: usersResult.status === 'fulfilled' ? (usersResult.value.count || 0) : 0,
                activeNow: usersResult.status === 'fulfilled' ? Math.floor((usersResult.value.count || 0) * 0.1) : 0,
                postsToday: postsResult.status === 'fulfilled' ? (postsResult.value.count || 0) : 0,
                reports: reportsResult.status === 'fulfilled' ? (reportsResult.value.count || 0) : 0
            };
        } catch (error) {
            console.error('Error getting admin stats:', error);
            return { users: 0, activeNow: 0, postsToday: 0, reports: 0 };
        }
    }

    async getAllUsers(limit = 50, offset = 0) {
        try {
            const { data, error } = await supabaseClient
                .from('users')
                .select('id, username, name, email, role, avatar_url, created_at')
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting all users:', error);
            return [];
        }
    }

    async mergeAdminData(legacyEmail, targetUsername = 'KingKool23') {
        try {
            const { data: targetUser } = await supabaseClient
                .from('users').select('id').eq('username', targetUsername).single();
            if (!targetUser) throw new Error('Target user not found');

            const { data: legacyUser } = await supabaseClient
                .from('users').select('id').eq('email', legacyEmail).single();
            if (!legacyUser) throw new Error('Legacy user not found');

            await supabaseClient.from('posts').update({ user_id: targetUser.id }).eq('user_id', legacyUser.id);
            await supabaseClient.from('comments').update({ user_id: targetUser.id }).eq('user_id', legacyUser.id);
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
