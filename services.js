/**
 * VIBEHUB SERVICE LAYER
 * Modular services ready for Supabase replacement.
 */

// --- AUTH SERVICE ---
class AuthService {
    constructor() {
        this.user = JSON.parse(localStorage.getItem('vibehub_user')) || null;
    }

    checkSession() {
        return this.user;
    }

    async login(email, password, isAdmin = false) {
        // Admin credentials
        const validAdminEmail = 'yamasseetechnology@gmail.com';
        const adminPassword = 'citawoo789!';

        return new Promise(resolve => {
            setTimeout(() => {
                const isSuperAdmin = isAdmin ||
                                   (email.toLowerCase() === validAdminEmail && password === adminPassword) ||
                                   email.toLowerCase().includes('admin');

                const mockUser = {
                    id: 'u1',
                    username: isAdmin || email.toLowerCase() === validAdminEmail ? 'super_admin' : 'vibe_master',
                    displayName: isAdmin || email.toLowerCase() === validAdminEmail ? 'Super Admin' : 'Vibe Master',
                    email: email,
                    profilePhoto: 'https://i.pravatar.cc/150?u=me',
                    bannerImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200',
                    bio: 'Linking minds through deep vibes.',
                    followersCount: isAdmin || email.toLowerCase() === validAdminEmail ? 0 : 1205,
                    followingCount: isAdmin || email.toLowerCase() === validAdminEmail ? 0 : 840,
                    postCount: isAdmin || email.toLowerCase() === validAdminEmail ? 0 : 42,
                    reactionScore: isAdmin || email.toLowerCase() === validAdminEmail ? 0 : 8500,
                    badgeList: isAdmin || email.toLowerCase() === validAdminEmail ? ['Admin'] : ['Heat Magnet', 'Admired Creator'],
                    isSuperAdmin: isSuperAdmin,
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
class DataService {
    constructor() {
        this.posts = [
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
                comments: [
                    { userId: 'u2', displayName: 'Cyber Soul', time: '1h ago', text: 'Absolutely.', type: 'text' }
                ],
                timestamp: '2h ago',
                isSponsored: false,
                tab: 'all',
                hashtag: 'mindfulness',
                communityId: 'c1' // Synthwave Lovers
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
                comments: [],
                timestamp: '4h ago',
                isSponsored: false,
                tab: 'trending',
                hashtag: 'neon'
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
                comments: [
                    { userId: 'u1', displayName: 'Echo Mind', time: '5m ago', type: 'audio' }
                ],
                timestamp: '30m ago',
                isSponsored: false,
                tab: 'we-vibin',
                hashtag: 'syncrooms'
            },
            {
                id: 'p4',
                userId: 'u4',
                displayName: 'Neural Spark',
                handle: 'neural_spark',
                avatar: 'https://i.pravatar.cc/150?u=vibehub4',
                content: 'That\'s wild! Just achieved a 100% brain synchronization rate in my session 🔥',
                media: null,
                type: 'text',
                engagement: 2100,
                reactions: { like: 800, heat: 500, wild: 150, cap: 8, admire: 200, dislike: 2 },
                comments: [],
                timestamp: '15m ago',
                isSponsored: false,
                tab: 'trending',
                hashtag: 'neural'
            },
            {
                id: 'p5',
                userId: 'u5',
                displayName: 'Deep Respect',
                handle: 'deep_respect',
                avatar: 'https://i.pravatar.cc/150?u=vibehub5',
                content: 'This conversation changed my perspective on consciousness. Admire your insights 🙏',
                media: null,
                type: 'text',
                engagement: 1850,
                reactions: { like: 750, heat: 350, wild: 60, cap: 12, admire: 450, dislike: 3 },
                comments: [],
                timestamp: '1h ago',
                isSponsored: false,
                tab: 'all',
                hashtag: 'consciousness',
                communityId: 'c2' // Deep Psychology
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
                comments: [],
                timestamp: 'Sponsored'
            }
        ];
    }

    async addPost(postObj) {
        // 1. Add to local state for instant timeline update
        this.posts.unshift(postObj);

        // 2. If Supabase is connected, save to the cloud
        if (window.supabaseClient) {
            try {
                await window.supabaseClient
                    .from('posts')
                    .insert([postObj]);
                console.log("Post saved to Supabase");
            } catch (error) {
                console.error("Error saving post to Supabase:", error);
            }
        }
        return postObj;
    }

    async getPosts(tab = 'all', communityId = null) {
        const calculateVibeScore = (r) => {
            return (r.like * 1) + (r.heat * 2.5) + (r.admire * 2) + (r.wild * 3) - (r.dislike * 1.5) + (r.cap * 1);
        };

        this.posts.forEach(post => {
            post.vibeScore = calculateVibeScore(post.reactions);
        });

        if (tab === 'all') return communityId ? this.posts.filter(p => p.communityId === communityId) : this.posts;
        if (tab === 'trending') return this.posts.filter(p => !communityId && (p.tab === tab || p.isSponsored)).sort((a, b) => b.vibeScore - a.vibeScore);
        if (tab === 'we-vibin') return this.posts.filter(p => !communityId && (p.tab === tab || p.isSponsored));
        return this.posts;
    }

    async getComments(postId) {
        const post = this.posts.find(p => p.id === postId);
        return post ? post.comments : [];
    }

    async addComment(postId, comment) {
        const post = this.posts.find(p => p.id === postId);
        if (post) {
            comment.time = 'Just now';
            post.comments.push(comment);
        }
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
class VideoService {
    async getVibeStream() {
        return [
            { id: 'v1', url: 'https://assets.mixkit.io/videos/preview/mixkit-digital-animation-of-a-blue-and-purple-energy-field-42994-large.mp4', user: 'visual_guru', caption: 'Frequency meditation 🌀' },
            { id: 'v2', url: 'https://assets.mixkit.io/videos/preview/mixkit-abstract-laser-lights-background-34241-large.mp4', user: 'neon_artist', caption: 'Light show experiment #neon' }
        ];
    }
}

// --- CHAT SERVICE (Sync Rooms & DMs) ---
class ChatService {
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
class AdminService {
    getStats() {
        return {
            users: 12482,
            activeNow: 1205,
            postsToday: 458,
            revenue: '$1,240'
        };
    }
}

// --- GLOBAL SERVICE INSTANCES ---
// Removed to avoid Uncaught SyntaxError: Identifier has already been declared
// Instances are created inside app.js VibeApp constructor.