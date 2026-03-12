/**
 * VIBEHUB SERVICE AGGREGATOR
 * This file maintains backward compatibility by exporting services 
 * from their new modular locations.
 */

export { MediaService } from './services/MediaService.js';
export { CacheService } from './services/CacheService.js';
export { NotificationService } from './services/NotificationService.js';
export { AuthService } from './services/AuthService.js';
export { DataService } from './services/DataService.js';

// Also export specific services if they were used as named exports elsewhere
// and maintain the VideoService, ChatService, AdminService logic (which will be modularized in Phase 3)

/**
 * VIBEHUB VIDEO SERVICE
 */
export class VideoService {
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

    async uploadMedia(blob, type) {
        const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
        if (!cloudName) return null;
        
        const formData = new FormData();
        formData.append('file', blob);
        formData.append('upload_preset', type === 'audio' ? 'vibehub_audio' : 'vibehub_videos');
        formData.append('cloud_name', cloudName);
        
        try {
            const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${type}/upload`, {
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

    async startLive(userId, username, topic = "") {
        if (!window.supabaseClient) return true;
        try {
            await window.supabaseClient
                .from('live_streams')
                .insert([{
                    user_id: userId,
                    username: username,
                    topic: topic,
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

    subscribeToSignaling(streamId, callback) {
        if (!window.supabaseClient) return null;
        return window.supabaseClient
            .channel(`signaling:${streamId}`)
            .on('broadcast', { event: 'signal' }, ({ payload }) => {
                callback(payload);
            })
            .subscribe();
    }

    async sendSignal(streamId, signalData) {
        if (!window.supabaseClient) return;
        const channel = window.supabaseClient.channel(`signaling:${streamId}`);
        await channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.send({
                    type: 'broadcast',
                    event: 'signal',
                    payload: signalData
                });
            }
        });
    }
}

/**
 * VIBEHUB CHAT SERVICE
 */
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
            const { data: room } = await window.supabaseClient
                .from('rooms')
                .select('current_user_count, max_users')
                .eq('id', roomId)
                .single();

            if (!room || room.current_user_count >= room.max_users) {
                return false;
            }

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
            
            const { data, error } = await window.supabaseClient
                .from('messages')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);
            
            if (error) throw error;

            return (data || []).map(m => ({
                id: m.id,
                userId: m.sender_id,
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

    formatTimestamp(dateString) {
        if (!dateString) return 'Just now';
        const date = new Date(dateString);
        const diff = Math.floor((new Date() - date) / 1000);
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return date.toLocaleDateString();
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

    async getRoomUsers(roomId) {
        if (!window.supabaseClient) {
            return [{ username: 'Echo_Mind' }, { username: 'Cyber_Soul' }, { username: 'Future_Ghost' }];
        }
        
        try {
            const { data } = await window.supabaseClient
                .from('rooms')
                .select('current_user_count')
                .eq('id', roomId)
                .single();
            
            const users = [];
            const count = data?.current_user_count || 1;
            for(let i=0; i<Math.min(count, 125); i++) {
                users.push({ username: `Viber_${101+i}` });
            }
            return users;
        } catch (e) {
            return [];
        }
    }
}

/**
 * VIBEHUB ADMIN SERVICE
 */
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

    async getUsers() {
        if (!window.supabaseClient) return [];
        try {
            const { data } = await window.supabaseClient
                .from('users')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);
            return data || [];
        } catch (e) {
            console.error('Error fetching users:', e);
            return [];
        }
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

    async deleteAd(adId) {
        if (!window.supabaseClient) return { success: true };
        try {
            await window.supabaseClient.from('sponsored_ads').delete().eq('id', adId);
            return { success: true };
        } catch (e) {
            console.error('Error deleting ad:', e);
            return { error: 'Failed to delete ad' };
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

    async mergeAdminData(legacyEmail, newUsername) {
        if (!window.supabaseClient) throw new Error('Supabase not available');
        console.log(`🚀 Starting Neural Data Merge: ${legacyEmail} -> ${newUsername}`);

        try {
            const { data: legacyUser, error: e1 } = await window.supabaseClient
                .from('users')
                .select('id')
                .eq('email', legacyEmail)
                .single();
            
            let legacyId;
            if (e1) {
                const { data: legacyUser2 } = await window.supabaseClient
                    .from('users')
                    .select('id')
                    .eq('username', 'super_admin')
                    .single();
                if (!legacyUser2) throw new Error('Legacy admin user not found');
                legacyId = legacyUser2.id;
            } else {
                legacyId = legacyUser.id;
            }

            const { data: newUser, error: e2 } = await window.supabaseClient
                .from('users')
                .select('id')
                .eq('username', newUsername)
                .single();
            
            if (e2 || !newUser) throw new Error(`New admin user ${newUsername} not found`);
            const newId = newUser.id;

            const { count, error: e3 } = await window.supabaseClient
                .from('posts')
                .update({ user_id: newId })
                .eq('user_id', legacyId);
            
            if (e3) throw e3;

            return { success: true, mergedPosts: count || 0 };
        } catch (error) {
            console.error('❌ Data Merge Failed:', error);
            throw error;
        }
    }
}
