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

    async init() {
        console.log("Vibehub Initializing...");
        window.triggerReactionPopup = this.triggerReactionPopup.bind(this);

        this.showLoadingScreen();

        if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
            navigator.serviceWorker.register('./service-worker.js')
                .catch(err => console.log("Service Worker registration failed:", err));
        }

        this.setupEventListeners();

        // Check for existing session
        const sessionUser = await this.services.auth.checkSession();
        if (sessionUser) {
            const profile = await this.services.auth.ensureProfileExists(sessionUser);
            State.user = profile || sessionUser;
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
                if (State.currentView !== 'search' && e.target.value.length > 0) {
                    this.navigate('search');
                }
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
        history.pushState({ view }, "", `#${view}`);
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
            switch(view) {
                case 'home':
                    const posts = await this.services.data.getPosts();
                    container.innerHTML = this.getHomeHTML(posts);
                    break;
                case 'vibestream':
                    const videos = await this.services.video.getVibeStream();
                    container.innerHTML = this.getVibeStreamHTML(videos);
                    break;
                case 'syncrooms':
                    const rooms = await this.services.chat.getSyncRooms();
                    container.innerHTML = this.getSyncRoomsHTML(rooms);
                    break;
                case 'profile':
                    container.innerHTML = this.getProfileHTML(State.user);
                    break;
                case 'login':
                case 'register':
                    container.innerHTML = this.getAuthHTML(view);
                    break;
                case 'admin':
                    if (State.user?.role !== 'admin' && State.user?.email !== 'yamasseetechnology@gmail.com') {
                        container.innerHTML = '<div class="error-view"><h2>Access Denied</h2><p>Neural pattern not authorized for admin access.</p></div>';
                        return;
                    }
                    const stats = await this.services.admin.getStats();
                    container.innerHTML = Components.adminPanel(stats);
                    break;
                default:
                    container.innerHTML = `<div class="view-header"><h1 class="view-title">${view}</h1><p>Vibe missing.</p></div>`;
            }
            this.attachViewEvents();
        } catch (err) {
            console.error(err);
            container.innerHTML = `<div class="error-view"><h2>Vibe Check Failed</h2><p>${err.message}</p></div>`;
        }
    }

    attachViewEvents() {
        if (State.currentView === 'vibestream') {
            const videos = document.querySelectorAll('.vibe-video-card video');
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => entry.isIntersecting ? entry.target.play().catch(() => {}) : entry.target.pause());
            }, { threshold: 0.8 });
            videos.forEach(v => observer.observe(v));
        }
    }

    async handleLogin(mode = 'login') {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        if (!email || !password) {
            this.showToast('Please fill in all fields');
            return;
        }

        try {
            const user = await this.services.auth.login(email, password);
            State.user = user;
            this.showToast(user.role === 'admin' ? 'Welcome, Admin! 🎉' : 'Welcome to the Pulse! ✨');
            this.transitionToApp();
        } catch (err) {
            this.showToast(err.message);
        }
    }

    async handleAccountMerge() {
        const legacyEmail = document.getElementById('merge-legacy-email').value;
        const targetUsername = document.getElementById('merge-target-username').value;
        
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

    getHomeHTML(posts, activeTab = 'all') {
        return `
            <div class="view-header animate-fade">
                <h1 class="view-title">The Pulse</h1>
                <p class="text-dim">Connect minds. Share vibes. Elevate consciousness.</p>
            </div>
            <div id="post-feed">
                ${posts.length > 0 ? posts.map(p => Components.post(p)).join('') : '<div class="empty-state">No vibes detected in your stream.</div>'}
            </div>
        `;
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
            </div>
        `;
    }

    getProfileHTML(user) {
        if (!user) return '<div class="error-view"><h2>Not Authenticated</h2></div>';
        return `
            <div class="profile-container animate-fade-in">
                <div class="profile-header glass-panel">
                    <img src="${user.avatar_url}" class="profile-avatar">
                    <div class="profile-info">
                        <h1>${user.name || user.username}</h1>
                        <p>@${user.username}</p>
                        <p class="bio">${user.bio || 'New Mind on VibeHub'}</p>
                    </div>
                    <button class="btn-secondary" onclick="window.App.services.auth.logout(); window.App.transitionToLogin();">Logout</button>
                </div>
            </div>
        `;
    }

    showToast(msg) {
        const toast = document.createElement('div');
        toast.className = 'glass-panel animate-fade';
        toast.style.cssText = `position:fixed; bottom:20px; right:20px; padding:15px 25px; border-color:var(--primary-orange); z-index:2000;`;
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