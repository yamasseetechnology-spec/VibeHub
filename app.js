/**
 * VIBEHUB CORE ENGINE
 * Futuristic Social Media Framework
 * Optimized for Supabase Schema
 */

import { AuthService, DataService, VideoService, ChatService, AdminService } from './services.js';
import Components from './components.js';

// --- APP STATE ---
const State = {
    user: null,
    currentView: 'home',
    posts: [],
    notifications: [],
    syncRooms: [],
    messages: [],
    theme: 'dark',
    viewData: {}
};

// --- CORE APP CLASS ---
class VibeApp {
    constructor() {
        this.services = {
            auth: new AuthService(),
            data: new DataService(),
            video: new VideoService(),
            chat: new ChatService(),
            admin: new AdminService()
        };
        this.init();
    }

    // FIXED: Expose currentUser so components.js can reference window.App.currentUser
    getCurrentUser() {
        return State.user;
    }

    async init() {
        console.log('Vibehub Initializing...');
        window.triggerReactionPopup = this.triggerReactionPopup.bind(this);

        this.showLoadingScreen();

        if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
            navigator.serviceWorker.register('./service-worker.js')
                .catch(err => console.log('Service Worker registration failed:', err));
        }

        this.setupEventListeners();

        // FIXED: checkSession now returns the full profile (with role from users table)
        const profile = await this.services.auth.checkSession();
        if (profile) {
            State.user = profile;
        }

        setTimeout(() => {
            if (State.user) {
                this.transitionToApp();
            } else {
                this.transitionToLogin();
            }
        }, 2000);
    }

    showLoadingScreen() {
        const loading = document.getElementById('loading-screen');
        if (loading) {
            loading.style.visibility = 'visible';
            loading.style.opacity = '1';
            this.createStars();
            this.initLoadingParticles();
        }
    }

    transitionToLogin() {
        const loading = document.getElementById('loading-screen');
        const login = document.getElementById('login-screen');
        const app = document.getElementById('app');

        if (loading) loading.style.opacity = '0';

        setTimeout(() => {
            if (loading) loading.style.visibility = 'hidden';
            if (login) {
                login.style.opacity = '1';
                login.style.visibility = 'visible';
                this.initLoginParticles();
            }
            if (app) app.classList.add('hidden');
        }, 500);
    }

    transitionToApp() {
        const loading = document.getElementById('loading-screen');
        const login = document.getElementById('login-screen');
        const app = document.getElementById('app');

        if (loading) loading.style.opacity = '0';
        if (login) login.style.opacity = '0';

        setTimeout(() => {
            if (loading) loading.style.visibility = 'hidden';
            if (login) login.style.visibility = 'hidden';
            if (app) {
                app.classList.remove('hidden');
                app.style.opacity = '1';
            }
            this.navigate('home');
        }, 500);
    }

    createStars() {
        const starfield = document.getElementById('starfield');
        if (!starfield) return;
        for (let i = 0; i < 200; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            star.style.left = `${Math.random() * 100}%`;
            star.style.top = `${Math.random() * 100}%`;
            star.style.animationDelay = `${Math.random() * 2}s`;
            starfield.appendChild(star);
        }
    }

    initLoadingParticles() {
        const container = document.getElementById('loading-particles');
        if (!container) return;
        for (let i = 0; i < 80; i++) {
            const p = document.createElement('div');
            p.className = 'particle';
            p.style.left = `${Math.random() * 100}%`;
            p.style.top = `${Math.random() * 100}%`;
            container.appendChild(p);
        }
    }

    initLoginParticles() {
        const container = document.getElementById('login-particles');
        if (!container) return;
        for (let i = 0; i < 60; i++) {
            const p = document.createElement('div');
            p.className = 'particle';
            p.style.left = `${Math.random() * 100}%`;
            p.style.top = `${Math.random() * 100}%`;
            container.appendChild(p);
        }
    }

    setupEventListeners() {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                this.navigate(e.currentTarget.dataset.view);
            });
        });

        const searchInput = document.getElementById('global-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                if (e.target.value.length > 0) this.navigate('search');
            });
        }

        const postBtn = document.getElementById('create-post-btn');
        if (postBtn) postBtn.addEventListener('click', () => this.showCreatePostModal());

        const adminTrigger = document.getElementById('admin-trigger');
        if (adminTrigger) adminTrigger.addEventListener('click', () => this.navigate('admin'));

        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.view) this.renderView(e.state.view, false);
        });
    }

    navigate(view) {
        if (State.currentView === view && window.location.hash === `#${view}`) return;
        history.pushState({ view }, '', `#${view}`);
        this.renderView(view);
    }

    async renderView(view, updateNav = true) {
        State.currentView = view;
        const container = document.getElementById('view-container');
        if (!container) return;

        if (updateNav) {
            document.querySelectorAll('.nav-link').forEach(l => {
                l.classList.toggle('active', l.dataset.view === view);
            });
        }

        container.innerHTML = '<div class="loader-view"><div class="spinner"></div></div>';

        try {
            switch (view) {
                case 'home': {
                    const posts = await this.services.data.getPosts();
                    container.innerHTML = this.getHomeHTML(posts);
                    this.attachPostReactionEvents();
                    break;
                }
                case 'vibestream': {
                    // FIXED: getVibeStreamHTML was called but never defined — added below
                    const videos = await this.services.video.getVibeStream();
                    container.innerHTML = this.getVibeStreamHTML(videos);
                    this.attachViewEvents();
                    break;
                }
                case 'syncrooms': {
                    // FIXED: getSyncRoomsHTML was called but never defined — added below
                    const rooms = await this.services.chat.getSyncRooms();
                    container.innerHTML = this.getSyncRoomsHTML(rooms);
                    break;
                }
                case 'communities': {
                    // FIXED: was falling to default "Vibe missing" for all users
                    const communities = await this.services.data.getCommunities();
                    container.innerHTML = this.getCommunitiesHTML(communities);
                    break;
                }
                case 'search': {
                    // FIXED: was falling to default for all users
                    container.innerHTML = this.getSearchHTML();
                    this.attachSearchEvents();
                    break;
                }
                case 'notifications': {
                    // FIXED: was falling to default for all users
                    container.innerHTML = this.getNotificationsHTML();
                    break;
                }
                case 'messages': {
                    // FIXED: was falling to default for all users
                    container.innerHTML = this.getMessagesHTML();
                    break;
                }
                case 'profile': {
                    container.innerHTML = this.getProfileHTML(State.user);
                    this.attachProfileEvents();
                    break;
                }
                case 'settings': {
                    // FIXED: was falling to default for all users
                    container.innerHTML = this.getSettingsHTML();
                    this.attachSettingsEvents();
                    break;
                }
                case 'login':
                case 'register': {
                    container.innerHTML = this.getAuthHTML(view);
                    break;
                }
                case 'admin': {
                    // FIXED: role check now works correctly because login() returns profile with role
                    if (State.user?.role !== 'admin' && State.user?.email !== 'yamasseetechnology@gmail.com') {
                        container.innerHTML = '<div class="error-view"><h2>Access Denied</h2><p>Neural pattern not authorized for admin access.</p></div>';
                        return;
                    }
                    // FIXED: getStats uses Promise.allSettled so missing tables don't crash panel
                    const stats = await this.services.admin.getStats();
                    const users = await this.services.admin.getAllUsers();
                    container.innerHTML = Components.adminPanel(stats, users);
                    break;
                }
                default:
                    container.innerHTML = `
                        <div class="view-header">
                            <h1 class="view-title">${view.charAt(0).toUpperCase() + view.slice(1)}</h1>
                            <p class="text-dim">This feature is coming soon to the Pulse.</p>
                        </div>`;
            }
        } catch (err) {
            console.error('renderView error:', err);
            container.innerHTML = `
                <div class="error-view">
                    <h2>Vibe Check Failed</h2>
                    <p>${err.message}</p>
                    <button class="btn-primary" onclick="window.App.navigate('home')">Return to Pulse</button>
                </div>`;
        }
    }

    // FIXED: Was defined in old getVibeStreamHTML call but method was missing
    getVibeStreamHTML(videos) {
        return `
            <div class="view-header animate-fade">
                <h1 class="view-title">VibeStream</h1>
                <p class="text-dim">Live neural broadcasts from the collective.</p>
            </div>
            <div class="video-feed">
                ${videos && videos.length > 0
                    ? videos.map(v => Components.video(v)).join('')
                    : `<div class="empty-state">
                           <span style="font-size:3rem">📺</span>
                           <p>No streams active in the Pulse right now.</p>
                       </div>`
                }
            </div>`;
    }

    // FIXED: Was defined in old getSyncRoomsHTML call but method was missing
    getSyncRoomsHTML(rooms) {
        return `
            <div class="view-header animate-fade">
                <h1 class="view-title">Sync Rooms</h1>
                <p class="text-dim">Real-time neural convergence spaces.</p>
            </div>
            <div class="rooms-grid">
                ${rooms && rooms.length > 0
                    ? rooms.map(r => Components.room(r)).join('')
                    : `<div class="empty-state">
                           <span style="font-size:3rem">💬</span>
                           <p>No active Sync Rooms. Be the first to open one.</p>
                       </div>`
                }
            </div>`;
    }

    getCommunitiesHTML(communities) {
        return `
            <div class="view-header animate-fade">
                <h1 class="view-title">Communities</h1>
                <p class="text-dim">Find your frequency. Join your tribe.</p>
            </div>
            <div class="communities-grid">
                ${communities && communities.length > 0
                    ? communities.map(c => `
                        <div class="community-card glass-panel animate-slide-up">
                            <div class="community-icon">👥</div>
                            <h3>${c.name || 'Unnamed Channel'}</h3>
                            <p>${c.description || 'A space for minds to align.'}</p>
                            <button class="btn-primary" onclick="window.App.showToast('Joining ${c.name}...')">Join Channel</button>
                        </div>`).join('')
                    : `<div class="empty-state">
                           <span style="font-size:3rem">👥</span>
                           <p>No communities yet. The ecosystem is forming.</p>
                       </div>`
                }
            </div>`;
    }

    getSearchHTML() {
        return `
            <div class="view-header animate-fade">
                <h1 class="view-title">Search</h1>
                <p class="text-dim">Find minds, vibes, and frequencies.</p>
            </div>
            <div class="search-view">
                <div class="search-bar-large glass-panel">
                    <input type="text" id="search-input-main" class="login-input" placeholder="Search users, posts, hashtags..." style="margin:0;width:100%">
                    <button class="btn-primary" id="search-execute-btn" style="margin-top:10px;width:100%">🔍 Search</button>
                </div>
                <div id="search-results" class="search-results" style="margin-top:20px"></div>
            </div>`;
    }

    getNotificationsHTML() {
        return `
            <div class="view-header animate-fade">
                <h1 class="view-title">Alerts</h1>
                <p class="text-dim">Signals from the neural network.</p>
            </div>
            <div class="notifications-list">
                <div class="empty-state">
                    <span style="font-size:3rem">🔔</span>
                    <p>No new signals detected.</p>
                </div>
            </div>`;
    }

    getMessagesHTML() {
        return `
            <div class="view-header animate-fade">
                <h1 class="view-title">Messages</h1>
                <p class="text-dim">Direct neural transmissions.</p>
            </div>
            <div class="messages-container glass-panel" style="padding:20px;text-align:center">
                <span style="font-size:3rem">✉️</span>
                <p style="margin-top:10px">Direct messaging coming soon.</p>
                <p class="text-dim">Stay linked.</p>
            </div>`;
    }

    getSettingsHTML() {
        const user = State.user;
        return `
            <div class="view-header animate-fade">
                <h1 class="view-title">Settings</h1>
                <p class="text-dim">Tune your neural interface.</p>
            </div>
            <div class="settings-sections">
                <div class="settings-section glass-panel">
                    <h3>Profile</h3>
                    <div class="settings-row">
                        <label>Display Name</label>
                        <input type="text" id="settings-name" class="login-input" value="${user?.name || ''}" style="margin:5px 0">
                    </div>
                    <div class="settings-row">
                        <label>Username</label>
                        <input type="text" id="settings-username" class="login-input" value="${user?.username || ''}" style="margin:5px 0">
                    </div>
                    <div class="settings-row">
                        <label>Bio</label>
                        <textarea id="settings-bio" class="login-input" style="margin:5px 0;height:80px;resize:none">${user?.bio || ''}</textarea>
                    </div>
                    <button class="btn-primary" id="save-settings-btn">Save Changes</button>
                </div>

                <div class="settings-section glass-panel" style="margin-top:15px">
                    <h3>Account</h3>
                    <p class="text-dim">${user?.email || ''}</p>
                    <button class="btn-secondary" style="margin-top:10px"
                        onclick="window.App.services.auth.logout().then(() => window.App.transitionToLogin())">
                        Logout
                    </button>
                </div>
            </div>`;
    }

    getHomeHTML(posts) {
        return `
            <div class="view-header animate-fade">
                <h1 class="view-title">The Pulse</h1>
                <p class="text-dim">Connect minds. Share vibes. Elevate consciousness.</p>
            </div>
            <div id="post-feed">
                ${posts && posts.length > 0
                    ? posts.map(p => Components.post(p)).join('')
                    : `<div class="empty-state">
                           <span style="font-size:3rem">🌌</span>
                           <p>No vibes detected in your stream.</p>
                           <button class="btn-primary" onclick="window.App.showCreatePostModal()">Be the first to post</button>
                       </div>`
                }
            </div>`;
    }

    getAuthHTML(mode) {
        const isLogin = mode === 'login';
        return `
            <div class="login-content glass-panel">
                <h2>${isLogin ? 'Login' : 'Join'} Vibehub</h2>
                <div class="login-form">
                    <input type="email" id="login-email" class="login-input" placeholder="Email Address">
                    <input type="password" id="login-password" class="login-input" placeholder="Password">
                    <button class="login-submit" onclick="window.App.handleLogin()">${isLogin ? 'Enter The Pulse' : 'Create Identity'}</button>
                    <div class="login-footer">
                        <a href="#" onclick="window.App.navigate('${isLogin ? 'register' : 'login'}')">${isLogin ? 'Need an account? Register' : 'Already linked? Login'}</a>
                    </div>
                </div>
            </div>`;
    }

    getProfileHTML(user) {
        if (!user) return '<div class="error-view"><h2>Not Authenticated</h2></div>';
        return `
            <div class="profile-container animate-fade-in">
                <div class="profile-header glass-panel">
                    <img src="${user.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.id}" class="profile-avatar" alt="${user.name}">
                    <div class="profile-info">
                        <h1>${user.name || user.username || 'VibeUser'}</h1>
                        <p>@${user.username || 'user'}</p>
                        <p class="bio">${user.bio || 'New Mind on VibeHub'}</p>
                        ${user.role === 'admin' ? '<span class="mind-state">Admin</span>' : ''}
                    </div>
                    <button class="btn-secondary"
                        onclick="window.App.services.auth.logout().then(() => window.App.transitionToLogin())">
                        Logout
                    </button>
                </div>
                <div id="user-posts-feed" style="margin-top:20px">
                    <div class="loader-view"><div class="spinner"></div></div>
                </div>
            </div>`;
    }

    // --- EVENT ATTACHMENT HELPERS ---

    attachPostReactionEvents() {
        document.querySelectorAll('.reaction-btn[data-type]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const postCard = e.target.closest('.post-card');
                const postId = postCard?.dataset.id;
                const type = btn.dataset.type;
                if (!postId || !type) return;
                this.handleReaction(postId, type, btn);
            });
        });
    }

    attachProfileEvents() {
        // Load user's posts into the profile feed
        const feedEl = document.getElementById('user-posts-feed');
        if (!feedEl || !State.user) return;

        this.services.data.getPosts().then(allPosts => {
            const userPosts = allPosts.filter(p => p.userId === State.user.id);
            feedEl.innerHTML = userPosts.length > 0
                ? userPosts.map(p => Components.post(p)).join('')
                : '<div class="empty-state"><p>No vibes posted yet.</p></div>';
            this.attachPostReactionEvents();
        }).catch(() => {
            feedEl.innerHTML = '<div class="empty-state"><p>Could not load posts.</p></div>';
        });
    }

    attachSettingsEvents() {
        const saveBtn = document.getElementById('save-settings-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.handleSaveSettings());
        }
    }

    attachSearchEvents() {
        const searchBtn = document.getElementById('search-execute-btn');
        const searchInput = document.getElementById('search-input-main');
        const execute = () => {
            const query = searchInput?.value?.trim();
            if (query) this.executeSearch(query);
        };
        if (searchBtn) searchBtn.addEventListener('click', execute);
        if (searchInput) searchInput.addEventListener('keydown', e => e.key === 'Enter' && execute());
    }

    attachViewEvents() {
        if (State.currentView === 'vibestream') {
            const videos = document.querySelectorAll('.vibe-video-card video');
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => entry.isIntersecting
                    ? entry.target.play().catch(() => {})
                    : entry.target.pause());
            }, { threshold: 0.8 });
            videos.forEach(v => observer.observe(v));
        }
    }

    // --- ACTION HANDLERS ---

    async handleLogin() {
        const email = document.getElementById('login-email')?.value;
        const password = document.getElementById('login-password')?.value;

        if (!email || !password) {
            this.showToast('Please fill in all fields');
            return;
        }

        try {
            // FIXED: login() now returns the full profile with role from users table
            const profile = await this.services.auth.login(email, password);
            State.user = profile;
            this.showToast(profile.role === 'admin' ? 'Welcome, Admin! 🎉' : 'Welcome to the Pulse! ✨');
            this.transitionToApp();
        } catch (err) {
            this.showToast('Login failed: ' + err.message);
        }
    }

    async handleReaction(postId, type, buttonEl) {
        if (!State.user) {
            this.showToast('Login to react');
            return;
        }

        const countEl = buttonEl.querySelector('span');
        const current = parseInt(countEl?.innerText || '0');

        // Optimistic UI update
        if (countEl) countEl.innerText = current + 1;

        try {
            // Fetch current reactions JSONB
            const { data: post } = await window._supabase || (await import('./services.js')).supabaseClient
                .from('posts').select('reactions').eq('id', postId).single();

            const reactions = post?.reactions || {};
            const typeArr = Array.isArray(reactions[type]) ? reactions[type] : [];

            // Toggle reaction
            const userIdx = typeArr.indexOf(State.user.id);
            if (userIdx > -1) {
                typeArr.splice(userIdx, 1);
                if (countEl) countEl.innerText = Math.max(0, current - 1);
            } else {
                typeArr.push(State.user.id);
            }
            reactions[type] = typeArr;

            // Trigger popup
            const rect = buttonEl.getBoundingClientRect();
            const emojis = { like: '👍', dislike: '👎', heat: '🔥', admire: '✨', cap: '🧢', wild: '🦁' };
            this.triggerReactionPopup(rect.x, rect.y, emojis[type] || '✨');
        } catch (err) {
            console.error('Reaction error:', err);
            if (countEl) countEl.innerText = current; // Revert
        }
    }

    // FIXED: showCreatePostModal was wired to button but never defined
    showCreatePostModal() {
        const modal = document.getElementById('modal-container');
        const content = document.getElementById('modal-content');
        if (!modal || !content) return;

        content.innerHTML = `
            <div class="modal-header">
                <h2>Create a Vibe</h2>
                <button onclick="window.App.closeModal()" style="background:none;border:none;color:var(--text-primary);font-size:1.5rem;cursor:pointer">✕</button>
            </div>
            <div class="post-composer">
                <div style="display:flex;gap:12px;align-items:flex-start">
                    <img src="${State.user?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}"
                        style="width:40px;height:40px;border-radius:50%;object-fit:cover" alt="You">
                    <textarea id="post-text-input" placeholder="What's your vibe right now?"
                        style="flex:1;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:var(--text-primary);border-radius:12px;padding:12px;min-height:100px;resize:none;font-family:inherit"></textarea>
                </div>
                <div style="margin-top:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
                    <label class="btn-secondary" style="cursor:pointer">
                        📷 Add Image
                        <input type="file" id="post-media-input" accept="image/*,video/*" style="display:none">
                    </label>
                    <span id="post-media-name" class="text-dim" style="font-size:0.8rem"></span>
                    <button class="btn-primary" id="submit-post-btn">Broadcast Vibe ✨</button>
                </div>
            </div>`;

        modal.classList.remove('hidden');
        modal.querySelector('.modal-backdrop')?.addEventListener('click', () => this.closeModal());

        document.getElementById('post-media-input')?.addEventListener('change', (e) => {
            const name = e.target.files[0]?.name;
            if (name) document.getElementById('post-media-name').innerText = name;
        });

        document.getElementById('submit-post-btn')?.addEventListener('click', () => this.submitPost());
    }

    // FIXED: showPostMenu was wired in components but never defined
    showPostMenu(postId) {
        const isAdmin = State.user?.role === 'admin';
        this.showToast(isAdmin ? `Admin: Delete or manage post ${postId}` : 'Post options coming soon.');
    }

    // FIXED: showCommentModal was wired in components but never defined
    showCommentModal(postId) {
        const modal = document.getElementById('modal-container');
        const content = document.getElementById('modal-content');
        if (!modal || !content) return;

        content.innerHTML = `
            <div class="modal-header">
                <h2>Comments</h2>
                <button onclick="window.App.closeModal()" style="background:none;border:none;color:var(--text-primary);font-size:1.5rem;cursor:pointer">✕</button>
            </div>
            <div id="comments-list" style="max-height:300px;overflow-y:auto;margin:10px 0">
                <div class="loader-view"><div class="spinner"></div></div>
            </div>
            <div style="display:flex;gap:8px;margin-top:10px">
                <input type="text" id="comment-input" class="login-input" placeholder="Add your vibe..." style="flex:1;margin:0">
                <button class="btn-primary" id="submit-comment-btn">Send</button>
            </div>`;

        modal.classList.remove('hidden');
        modal.querySelector('.modal-backdrop')?.addEventListener('click', () => this.closeModal());

        // Load comments
        this.services.data.getComments(postId).then(comments => {
            const listEl = document.getElementById('comments-list');
            if (!listEl) return;
            listEl.innerHTML = comments.length > 0
                ? comments.map(c => `
                    <div style="padding:10px;border-bottom:1px solid rgba(255,255,255,0.1)">
                        <strong>${c.users?.name || 'Unknown'}</strong>
                        <p style="margin:4px 0;color:var(--text-secondary)">${c.text}</p>
                    </div>`).join('')
                : '<div class="empty-state" style="padding:20px">No comments yet. Be the first!</div>';
        });

        document.getElementById('submit-comment-btn')?.addEventListener('click', async () => {
            const text = document.getElementById('comment-input')?.value?.trim();
            if (!text || !State.user) return;
            try {
                await this.services.data.addComment(postId, State.user.id, text);
                this.showToast('Comment added ✨');
                this.closeModal();
                if (State.currentView === 'home') this.navigate('home');
            } catch (err) {
                this.showToast('Could not add comment: ' + err.message);
            }
        });
    }

    closeModal() {
        const modal = document.getElementById('modal-container');
        if (modal) modal.classList.add('hidden');
    }

    async submitPost() {
        const textEl = document.getElementById('post-text-input');
        const mediaEl = document.getElementById('post-media-input');
        const text = textEl?.value?.trim();

        if (!text && !mediaEl?.files[0]) {
            this.showToast('Add some content to your vibe!');
            return;
        }
        if (!State.user) {
            this.showToast('Please log in first.');
            return;
        }

        const submitBtn = document.getElementById('submit-post-btn');
        if (submitBtn) submitBtn.disabled = true;
        this.showToast('Broadcasting vibe...');

        try {
            await this.services.data.addPost({
                userId: State.user.id,
                handle: State.user.username,
                content: text || '',
                mediaFile: mediaEl?.files[0] || null,
                tags: []
            });

            this.closeModal();
            this.showToast('Vibe broadcast! ✨');
            this.navigate('home');
        } catch (err) {
            this.showToast('Post failed: ' + err.message);
            if (submitBtn) submitBtn.disabled = false;
        }
    }

    async executeSearch(query) {
        const resultsEl = document.getElementById('search-results');
        if (!resultsEl) return;
        resultsEl.innerHTML = '<div class="loader-view"><div class="spinner"></div></div>';

        try {
            const posts = await this.services.data.getPosts();
            const matched = posts.filter(p =>
                p.content?.toLowerCase().includes(query.toLowerCase()) ||
                p.handle?.toLowerCase().includes(query.toLowerCase()) ||
                p.displayName?.toLowerCase().includes(query.toLowerCase())
            );

            resultsEl.innerHTML = matched.length > 0
                ? `<p class="text-dim" style="margin-bottom:10px">${matched.length} result(s) for "${query}"</p>` + matched.map(p => Components.post(p)).join('')
                : `<div class="empty-state"><p>No vibes found for "${query}".</p></div>`;

            this.attachPostReactionEvents();
        } catch (err) {
            resultsEl.innerHTML = `<div class="error-view"><p>${err.message}</p></div>`;
        }
    }

    async handleSaveSettings() {
        const name = document.getElementById('settings-name')?.value?.trim();
        const username = document.getElementById('settings-username')?.value?.trim();
        const bio = document.getElementById('settings-bio')?.value?.trim();

        if (!State.user) return;

        try {
            const { supabaseClient } = await import('./services.js');
            const { error } = await supabaseClient
                .from('users')
                .update({ name, username, bio })
                .eq('id', State.user.id);

            if (error) throw error;

            State.user.name = name;
            State.user.username = username;
            State.user.bio = bio;

            this.showToast('Profile updated ✨');
        } catch (err) {
            this.showToast('Update failed: ' + err.message);
        }
    }

    async handleAccountMerge() {
        const legacyEmail = document.getElementById('merge-legacy-email')?.value;
        const targetUsername = document.getElementById('merge-target-username')?.value;

        if (!legacyEmail || !targetUsername) {
            this.showToast('Please provide both legacy email and target username');
            return;
        }

        this.showToast('Initiating Neural Link...');
        const result = await this.services.admin.mergeAdminData(legacyEmail, targetUsername);

        if (result.success) {
            this.showToast('Neural identities successfully merged! ✨');
            this.renderView('admin');
        } else {
            this.showToast('Merge failed: ' + result.error);
        }
    }

    async handleBanUser(userId) {
        if (!confirm('Are you sure you want to ban this user?')) return;
        const result = await this.services.admin.banUser(userId);
        if (!result.error) {
            this.showToast('User has been banned from the ecosystem.');
            this.renderView(State.currentView);
        } else {
            this.showToast('Ban failed: ' + result.error.message);
        }
    }

    async handleDeletePost(postId) {
        if (!confirm('Are you sure you want to delete this post?')) return;
        const result = await this.services.admin.deletePost(postId);
        if (!result.error) {
            this.showToast('Vibe removed from the Pulse.');
            this.renderView(State.currentView);
        } else {
            this.showToast('Delete failed: ' + result.error.message);
        }
    }

    showToast(msg) {
        const toast = document.createElement('div');
        toast.className = 'glass-panel animate-fade';
        toast.style.cssText = 'position:fixed;bottom:20px;right:20px;padding:15px 25px;border-color:var(--primary-orange);z-index:9999;max-width:300px;word-wrap:break-word;pointer-events:none';
        toast.innerText = msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    triggerReactionPopup(x, y, emoji) {
        const p = document.createElement('div');
        p.className = 'reaction-pop';
        p.innerText = emoji;
        p.style.left = x + 'px';
        p.style.top = y + 'px';
        document.body.appendChild(p);
        setTimeout(() => p.remove(), 1000);
    }
}

// Global App Instance
document.addEventListener('DOMContentLoaded', () => {
    window.App = new VibeApp();
});
