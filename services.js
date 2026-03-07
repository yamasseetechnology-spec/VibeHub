/**
 * VIBEHUB SERVICE LAYER
 * Modular services ready for Supabase replacement.
 */

// --- AUTH SERVICE ---
export class AuthService {
    constructor() {
        this.user = JSON.parse(localStorage.getItem('vibehub_user')) || null;
    }

    checkSession() {
        return this.user;
    }

    async login(email, password) {
        // Prepare for: await supabase.auth.signInWithPassword({ email, password })
        return new Promise(resolve => {
            setTimeout(() => {
                const mockUser = {
                    id: 'u1',
                    username: 'vibe_master',
                    displayName: 'Vibe Master',
                    email: email,
                    profilePhoto: 'https://i.pravatar.cc/150?u=me',
                    bannerImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200',
                    bio: 'Linking minds through deep vibes.',
                    followersCount: 1205,
                    followingCount: 840,
                    postCount: 42,
                    reactionScore: 8500,
                    badgeList: ['Heat Magnet', 'Admired Creator'],
                    createdAt: new Date().toISOString()
                };
                this.user = mockUser;
                localStorage.setItem('vibehub_user', JSON.stringify(mockUser));
                resolve(mockUser);
            }, 1000);
        });
    }

    logout() {
        this.user = null;
        localStorage.removeItem('vibehub_user');
        window.location.reload();
    }
}

// --- DATA SERVICE (Posts, Communities, Marketplace) ---
export class DataService {
    async getPosts(tab = 'all') {
        // Prepare for: await supabase.from('posts').select('*').order('engagement', { ascending: false })
        const posts = [
            {
                id: 'p1',
                userId: 'u1',
                displayName: 'Echo Mind',
                handle: 'echo_vibes',
                avatar: 'https://i.pravatar.cc/150?u=vibehub1',
                content: 'The geometry of thought is fascinating. #mindfulness #vibes',
                media: 'https://images.unsplash.com/photo-1633167606207-d840b5070fc2?w=800',
                type: 'image',
                engagement: 1200,
                reactions: { like: 450, heat: 320, wild: 120, cap: 2, admire: 85, dislike: 5 },
                commentsCount: 24,
                timestamp: '2h ago',
                isSponsored: false,
                tab: 'all'
            },
            {
                id: 'p2',
                userId: 'u2',
                displayName: 'Cyber Soul',
                handle: 'cybersoul',
                avatar: 'https://i.pravatar.cc/150?u=vibehub2',
                content: 'Neon dreams in a digital world. 🏙️✨',
                media: null,
                type: 'text',
                engagement: 800,
                reactions: { like: 200, heat: 150, wild: 40, cap: 0, admire: 30, dislike: 1 },
                commentsCount: 12,
                timestamp: '4h ago',
                isSponsored: false,
                tab: 'trending'
            },
            {
                id: 'p3',
                userId: 'u3',
                displayName: 'Future Ghost',
                handle: 'future_ghost',
                avatar: 'https://i.pravatar.cc/150?u=vibehub3',
                content: 'Is anyone else vibing on the new Sync Room features? ⚡💬',
                media: null,
                type: 'text',
                engagement: 1500,
                reactions: { like: 600, heat: 400, wild: 200, cap: 5, admire: 150, dislike: 10 },
                commentsCount: 56,
                timestamp: '30m ago',
                isSponsored: false,
                tab: 'we-vibin'
            },
            {
                id: 'ad1',
                displayName: 'Vibehub Labs',
                handle: 'vibehub_ads',
                avatar: 'https://i.ibb.co/Fqnj3JKp/1000001392.png',
                content: 'Upgrade to VibePlus for exclusive badges and neon themes!',
                media: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=800',
                type: 'image',
                isSponsored: true,
                engagement: 0,
                reactions: { like: 10, heat: 5, wild: 2, cap: 0, admire: 0, dislike: 0 },
                commentsCount: 0,
                timestamp: 'Sponsored'
            }
        ];
        
        if (tab === 'all') return posts;
        return posts.filter(p => p.tab === tab || p.isSponsored);
    }

    async getCommunities() {
        return [
            { id: 'c1', name: 'Synthwave Lovers', members: '12.4k', banner: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=400', desc: 'Retrofuturistic vibes only.' },
            { id: 'c2', name: 'Deep Psychology', members: '8.2k', banner: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400', desc: 'Exploring the linked mind.' }
        ];
    }

    async getMarketplace() {
        return [
            { id: 'm1', title: 'Cyberpunk Jacket', price: '120 VIBE', seller: 'neon_junkie', image: 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=400' },
            { id: 'm2', title: 'Mindful Headset', price: '450 VIBE', seller: 'tech_zen', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400' }
        ];
    }
}

// --- VIDEO SERVICE (VibeStream) ---
export class VideoService {
    async getVibeStream() {
        return [
            { id: 'v1', url: 'https://assets.mixkit.io/videos/preview/mixkit-digital-animation-of-a-blue-and-purple-energy-field-42994-large.mp4', user: 'visual_guru', caption: 'Frequency meditation 🌀' },
            { id: 'v2', url: 'https://assets.mixkit.io/videos/preview/mixkit-abstract-laser-lights-background-34241-large.mp4', user: 'neon_artist', caption: 'Light show experiment #neon' }
        ];
    }
}

// --- CHAT SERVICE (Sync Rooms & DMs) ---
export class ChatService {
    async getSyncRooms() {
        return [
            { id: 'r1', name: 'Neon Nights', users: 42, active: true },
            { id: 'r2', name: 'The Void', users: 15, active: true },
            { id: 'r3', name: 'Zen Garden', users: 8, active: true }
        ];
    }

    async getMessages() {
        return [
            { id: 'd1', user: 'Echo Mind', lastMsg: 'See you in the Sync Room!', time: '10m ago', unread: true },
            { id: 'd2', user: 'Cyber Soul', lastMsg: 'The new track is fire 🔥', time: '1h ago', unread: false }
        ];
    }
}

// --- ADMIN SERVICE ---
export class AdminService {
    getStats() {
        return {
            users: 12482,
            activeNow: 1205,
            postsToday: 458,
            revenue: '$1,240'
        };
    }
}
