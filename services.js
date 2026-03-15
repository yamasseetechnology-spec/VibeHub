/**
 * VIBEHUB SERVICE LAYER
 * Supabase-powered services for production.
 */

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
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .single();

        if (!existingProfile) {
            await supabaseClient
                .from('profiles')
                .insert({
                    id: user.id,
                    username: user.email.split('@')[0],
                    display_name: user.user_metadata?.full_name || user.email.split('@')[0],
                    avatar_url: 'https://i.pravatar.cc/150?u=' + user.id
                });
        }
    }
}

// --- DATA SERVICE (Posts, Communities, Marketplace) ---
export class DataService {
    constructor() {
        // No local mock data
    }

    async addPost(postObj) {
        try {
            // Handle media upload if present
            let mediaUrl = null;
            let mediaType = null;
            
            if (postObj.mediaFile) {
                const fileExt = postObj.mediaFile.name.split('.').pop().toLowerCase();
                const filePath = `posts/${postObj.userId}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
                
                const { data: uploadData, error: uploadError } = await supabaseClient.storage
                    .from('post-media')
                    .upload(filePath, postObj.mediaFile, {
                        contentType: postObj.mediaFile.type,
                        cacheControl: '3600',
                        upsert: false
                    });
                    
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
                    content: postObj.content,
                    media_url: mediaUrl,
                    media_type: mediaType,
                    tab: postObj.tab || 'all',
                    community_id: postObj.communityId || null,
                    is_ad: postObj.isAd || false
                })
                .select(`
                    *,
                    profiles!inner (
                        id, username, display_name, avatar_url
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
                    profiles!inner (
                        id, username, display_name, avatar_url
                    )
                `)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);
    
            if (tab !== 'all') {
                query = query.eq('tab', tab);
            }
            if (communityId) {
                query = query.eq('community_id', communityId);
            }
    
            const { data: posts, error } = await query;
            if (error) throw error;
    
            // Fetch reactions for all posts in one query
            const postIds = posts.map(p => p.id);
            if (postIds.length > 0) {
                const { data: reactions, error: reactError } = await supabaseClient
                    .from('post_reactions')
                    .select('post_id, reaction_type, count()')
                    .in('post_id', postIds)
                    .groupBy('post_id, reaction_type');
                
                if (!reactError) {
                    // Attach reactions to posts
                    posts.forEach(post => {
                        post.reactions = {};
                        const postReactions = reactions.filter(r => r.post_id === post.id);
                        postReactions.forEach(r => {
                            post.reactions[r.reaction_type] = r.count;
                        });
                    });
                }
            }
    
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
                    profiles!inner (
                        id, username, display_name, avatar_url
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
            let mediaType = null;
            
            if (mediaFile) {
                const fileExt = mediaFile.name.split('.').pop().toLowerCase();
                const filePath = `comments/${postId}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
                
                const { data: uploadData, error: uploadError } = await supabaseClient.storage
                    .from('comment-media')
                    .upload(filePath, mediaFile, {
                        contentType: mediaFile.type,
                        cacheControl: '3600',
                        upsert: false
                    });
                    
                if (uploadError) throw uploadError;
                const { data: publicUrlData } = await supabaseClient.storage
                    .from('comment-media')
                    .getPublicUrl(filePath);
                mediaUrl = publicUrlData.publicUrl;
                mediaType = mediaFile.type.startsWith('audio/') ? 'audio' : 'video';
            }

            const { data: commentData, error } = await supabaseClient
                .from('comments')
                .insert({
                    post_id: postId,
                    user_id: userId,
                    content: content,
                    media_url: mediaUrl,
                    media_type: mediaType
                })
                .select(`
                    *,
                    profiles!inner (
                        id, username, display_name, avatar_url
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
                .from('communities')
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

    // Helper to format post data to match expected structure
    formatPost(post) {
        if (!post) return null;
        return {
            id: post.id,
            userId: post.user_id,
            displayName: post.profiles?.display_name || 'Unknown User',
            handle: post.profiles?.username || 'user',
            avatar: post.profiles?.avatar_url || 'https://i.pravatar.cc/150?u=unknown',
            content: post.content,
            media: post.media_url,
            type: post.media_type || null,
            engagement: Object.values(post.reactions || {}).reduce((sum, count) => sum + count, 0),
            reactions: post.reactions || {},
            comments: [], // Comments are loaded separately
            timestamp: this.formatTimestamp(post.created_at),
            isSponsored: post.is_ad || false,
            tab: post.tab || 'all',
            hashtag: null, // Would need to be added to schema
            communityId: post.community_id
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
                .from('vibe_streams')
                .select(`
                    *,
                    profiles!inner (
                        id, username, display_name, avatar_url
                    )
                `)
                .order('created_at', { ascending: false });
                
            if (error) throw error;
            return streams;
        } catch (error) {
            console.error('Error getting vibe streams:', error);
            throw error;
        }
    }
}

// --- CHAT SERVICE (Sync Rooms & DMs) ---
export class ChatService {
    async getSyncRooms() {
        try {
            const { data: rooms, error } = await supabaseClient
                .from('sync_rooms')
                .select(`
                    *,
                    profiles!inner (
                        id, username, display_name
                    )
                `)
                .order('name');
                
            if (error) throw error;
            return rooms;
        } catch (error) {
            console.error('Error getting sync rooms:', error);
            throw error;
        }
    }

    async getMessages() {
        try {
            const { data: messages, error } = await supabaseClient
                .from('direct_messages')
                .select(`
                    *,
                    profiles!inner (
                        id, username, display_name
                    )
                `)
                .order('created_at', { ascending: false });
                
            if (error) throw error;
            return messages;
        } catch (error) {
            console.error('Error getting messages:', error);
            throw error;
        }
    }

    async sendMessage(senderId, receiverId, content) {
        try {
            const { data: message, error } = await supabaseClient
                .from('direct_messages')
                .insert({
                    sender_id: senderId,
                    receiver_id: receiverId,
                    content: content
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
            // Get counts in parallel
            const [usersResult, postsResult, revenueResult] = await Promise.all([
                supabaseClient.from('profiles').select('id', { count: 'exact' }),
                supabaseClient.from('posts').select('id', { count: 'exact' }),
                // For revenue, we might have a separate table or calculate from marketplace sales
                // For now, we'll use a placeholder or calculate from a hypothetical transactions table
                Promise.resolve({ count: 0 }) // Placeholder for revenue
            ]);

            const usersCount = usersResult.count || 0;
            const postsCount = postsResult.count || 0;
            // Revenue would come from actual sales data - placeholder for now
            const revenue = '$0'; // Would calculate from actual transactions

            return {
                users: usersCount,
                activeNow: Math.floor(usersCount * 0.1), // Estimate 10% active
                postsToday: postsCount, // Simplified - would filter by today
                revenue: revenue
            };
        } catch (error) {
            console.error('Error getting admin stats:', error);
            // Return fallback stats
            return {
                users: 0,
                activeNow: 0,
                postsToday: 0,
                revenue: '$0'
            };
        }
    }
}