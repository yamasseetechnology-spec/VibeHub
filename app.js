/**
 * VIBEHUB CORE ENGINE
 * Futuristic Social Media Framework
 * Prepared for Supabase Integration
 */

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

        // 1. Show loading screen
        this.showLoadingScreen();

        // 2. Register Service Worker (with error handling)
        if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
            // Switched to simple registration as external asset was causing hard block
            navigator.serviceWorker.register('./service-worker.js')
                .catch(err => console.log("Service Worker registration failed:", err));
        }

        // 3. Setup Routing & Event Listeners
        this.setupEventListeners();

        // 4. After 3 seconds, execute transition
        setTimeout(() => {
            this.transitionToLogin();
        }, 3000);
    }

    showLoadingScreen() {
        const loading = document.getElementById('loading-screen');

        if (loading) {
            loading.style.visibility = 'visible';
            loading.style.opacity = '1';

            // Initialize stars
            this.createStars();

            // Initialize loading particles
            this.initLoadingParticles();
        }
    }

    transitionToLogin() {
        const loading = document.getElementById('loading-screen');
        const login = document.getElementById('login-screen');
        const app = document.getElementById('app');

        if (loading) {
            loading.style.opacity = '0';
            
            setTimeout(() => {
                loading.style.visibility = 'hidden';
                
                if (login) {
                    login.style.opacity = '1';
                    login.style.visibility = 'visible';
                    this.initLoginParticles(); // Initialize login particles now that DOM is fully ready
                }
                
                if (app) {
                    app.classList.remove('hidden');
                    app.style.opacity = '1';
                }

            }, 500); // Match loading fade-out duration
        } else if (login) {
            // Fallback if loading screen was somehow skipped/closed
            login.style.opacity = '1';
            login.style.visibility = 'visible';
            this.initLoginParticles();
        }
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
            star.style.animationDuration = `${1.5 + Math.random() * 1.5}s`;
            starfield.appendChild(star);
        }
    }

    initLoadingParticles() {
        const container = document.getElementById('loading-particles');
        if (!container) return;
        const particleCount = 80;

        for (let i = 0; i < particleCount; i++) {
            const p = document.createElement('div');
            p.className = 'particle';
            const size = Math.random() * 10 + 3;
            p.style.width = `${size}px`;
            p.style.height = `${size}px`;
            p.style.left = `${Math.random() * 100}%`;
            p.style.top = `${Math.random() * 100}%`;
            p.style.setProperty('--drift', `${Math.random() * 100 - 50}px`);
            p.style.animationDelay = `${Math.random() * 10}s`;
            p.style.animationDuration = `${10 + Math.random() * 15}s`;
            p.style.boxShadow = '0 0 10px rgba(0, 242, 255, 0.5), 0 0 20px rgba(157, 80, 187, 0.5)';
            container.appendChild(p);
        }
    }

    showLoginScreen() {
        const login = document.getElementById('login-screen');
        if (!login) return;

        login.style.opacity = '1';
        login.style.visibility = 'visible';

        // Initialize login particles
        this.initLoginParticles();
    }

    handleRouting() {
        const hash = window.location.hash.replace('#', '') || 'home';
        this.navigate(hash);
    }

    initLoginParticles() {
        const container = document.getElementById('login-particles');
        if (!container) return;
        const particleCount = 60;

        for (let i = 0; i < particleCount; i++) {
            const p = document.createElement('div');
            p.className = 'particle';
            const size = Math.random() * 15 + 5;
            p.style.width = `${size}px`;
            p.style.height = `${size}px`;
            p.style.left = `${Math.random() * 100}%`;
            p.style.top = `${Math.random() * 100}%`;
            p.style.setProperty('--drift', `${Math.random() * 60 - 30}px`);
            p.style.animationDelay = `${Math.random() * 15}s`;
            p.style.animationDuration = `${12 + Math.random() * 10}s`;
            container.appendChild(p);
        }
    }

    setupEventListeners() {
        // Navigation clicks
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                this.navigate(view);
            });
        });

        // Global Search
        const searchInput = document.getElementById('global-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                if (State.currentView !== 'search' && e.target.value.length > 0) {
                    this.navigate('search');
                }
            });
        }

        // Create Post Modal
        const postBtn = document.getElementById('create-post-btn');
        if (postBtn) {
            postBtn.addEventListener('click', () => this.showCreatePostModal());
        }

        // Admin Trigger (Hidden)
        const adminTrigger = document.getElementById('admin-trigger');
        if (adminTrigger) {
            adminTrigger.addEventListener('click', () => this.navigate('admin'));
        }
        
        // Handle Back/Forward buttons
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.view) {
                this.renderView(e.state.view, false);
            }
        });
    }

    showPostMenu(postId) {
        // Simple context menu implementation
        const post = document.querySelector(`[data-id="${postId}"]`);
        if (!post) return;

        // Ensure we remove existing menu
        const existing = document.getElementById('post-menu');
        if (existing) existing.remove();

        const menu = document.createElement('div');
        menu.id = 'post-menu';
        menu.className = 'glass-panel';
        menu.style.cssText = 'position:absolute; right:20px; padding:10px; z-index:100;';
        menu.innerHTML = `
            <button class="btn-secondary" onclick="window.App.deletePost('${postId}')">Delete</button>
            <button class="btn-secondary">Report</button>
        `;
        post.appendChild(menu);
        
        // Close menu when clicking elsewhere
        setTimeout(() => {
            document.addEventListener('click', (e) => {
                if (e.target !== menu && !menu.contains(e.target)) {
                    menu.remove();
                }
            }, {once: true});
        }, 100);
    }

    deletePost(postId) {
        const post = document.querySelector(`[data-id="${postId}"]`);
        if (post) post.remove();
        this.showToast('Post deleted');
    }

        const modal = document.getElementById('modal-container');
        const content = document.getElementById('modal-content');
        if (!modal || !content) return;
        
        modal.classList.remove('hidden');
        content.innerHTML = `
            <h2 class="view-header">Post Your Vibe</h2>
            <textarea id="post-input" class="glass-panel" placeholder="What's your mind linked to?" style="width:100%; min-height:120px; background:rgba(0,0,0,0.5); border:1px solid var(--border-light); color:white; padding:15px; margin:15px 0;"></textarea>
            <div style="display:flex; gap:10px; margin-bottom:20px;">
                <button class="btn-secondary">📷 Photo</button>
                <button class="btn-secondary">🎥 Video</button>
                <button class="btn-secondary">📍 Location</button>
            </div>
            <div style="display:flex; justify-content:flex-end; gap:10px;">
                <button class="btn-secondary" onclick="document.getElementById('modal-container').classList.add('hidden')">Cancel</button>
                <button class="btn-primary" id="final-post-btn">Post Vibe</button>
            </div>
        `;

        document.getElementById('final-post-btn').addEventListener('click', () => this.handleCreatePost());
    }

    handleCreatePost() {
        const text = document.getElementById('post-input').value;
        if (!text) return;
        
        document.getElementById('modal-container').classList.add('hidden');
        this.showToast("Vibe posted to the Pulse!");
        this.renderView('home');
    }

    hideSplash() {
        // No longer needed - login screen is the entry point
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
        
        // Update Nav UI
        if (updateNav) {
            document.querySelectorAll('.nav-link').forEach(l => {
                l.classList.toggle('active', l.dataset.view === view);
            });
        }

        // Show Loading State in View
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
                case 'messages':
                    const dms = await this.services.chat.getMessages();
                    container.innerHTML = this.getMessagesHTML(dms);
                    break;
                case 'notifications':
                    container.innerHTML = this.getNotificationsHTML();
                    break;
                case 'settings':
                    container.innerHTML = this.getSettingsHTML();
                    break;
                case 'search':
                    container.innerHTML = this.getSearchHTML();
                    break;
                case 'communities':
                    const communities = await this.services.data.getCommunities();
                    container.innerHTML = this.getCommunitiesHTML(communities);
                    break;
                case 'marketplace':
                    const items = await this.services.data.getMarketplace();
                    container.innerHTML = this.getMarketplaceHTML(items);
                    break;
                case 'admin':
                    const stats = this.services.admin.getStats();
                    container.innerHTML = this.getAdminHTML(stats);
                    break;
                default:
                    container.innerHTML = `<div class="view-header"><h1 class="view-title">${view}</h1><p>Vibe missing. Error 404.</p></div>`;
            }
            this.attachViewEvents();
        } catch (err) {
            container.innerHTML = `<div class="error-view"><h2>Vibe Check Failed</h2><p>${err.message}</p></div>`;
        }
        
        container.scrollTop = 0;
    }

    attachViewEvents() {
        // Post Reactions
        document.querySelectorAll('.reaction-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                btn.classList.toggle('active');
                const countSpan = btn.querySelector('span');
                if (!countSpan) return;

                let count = parseInt(countSpan.innerText);
                count = btn.classList.contains('active') ? count + 1 : count - 1;
                countSpan.innerText = count;

                // Reaction popup animation
                if (btn.classList.contains('active')) {
                    const reactionName = btn.innerText.split(' ')[0];
                    this.showReactionPopup(e.clientX, e.clientY, reactionName);
                }

                btn.style.transform = 'scale(1.2)';
                setTimeout(() => btn.style.transform = '', 200);
            });
        });

        // Sync Room Live Stream Simulation
        if (State.currentView === 'syncrooms') {
            this.startSyncStream();
        } else {
            if (this.streamInterval) clearInterval(this.streamInterval);
        }

        // VibeStream Play/Pause on Scroll
        if (State.currentView === 'vibestream') {
            const videos = document.querySelectorAll('.vibe-video-card video');
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.play().catch(() => {});
                    } else {
                        entry.target.pause();
                    }
                });
            }, { threshold: 0.8 });
            videos.forEach(v => observer.observe(v));
        }
    }

    createFloatingReaction(x, y, emoji) {
        const react = document.createElement('div');
        react.className = 'reaction-pop';
        react.innerText = emoji;
        react.style.left = `${x}px`;
        react.style.top = `${y}px`;
        document.body.appendChild(react);
        setTimeout(() => react.remove(), 800);
    }

    showReactionPopup(x, y, reactionName) {
        const popup = document.createElement('div');
        popup.className = 'reaction-popup';
        popup.innerHTML = `<span>${reactionName}</span>`;
        popup.style.left = `${x}px`;
        popup.style.top = `${y}px`;
        popup.style.transform = 'translate(-50%, -100%) scale(0)';
        document.body.appendChild(popup);

        // Trigger animation
        requestAnimationFrame(() => {
            popup.style.transform = 'translate(-50%, -100%) scale(1.2)';
            popup.style.opacity = '1';
        });

        setTimeout(() => {
            popup.style.transform = 'translate(-50%, -150%) scale(0.8)';
            popup.style.opacity = '0';
        }, 100);

        setTimeout(() => popup.remove(), 800);
    }

    startSyncStream() {
        const streamContainer = document.getElementById('sync-stream-simulation');
        if (!streamContainer) {
            // Inject stream container if not present
            const view = document.getElementById('view-container');
            const streamDiv = document.createElement('div');
            streamDiv.id = 'sync-stream-simulation';
            streamDiv.style.cssText = `position:fixed; bottom:100px; right:20px; width:250px; z-index:50; pointer-events:none;`;
            view.appendChild(streamDiv);
        }
        
        const streamContainerRef = document.getElementById('sync-stream-simulation');
        const messages = [
            "Mind 42 just linked!",
            "Neural energy rising in Neon Nights.",
            "Someone just dropped a Heat Magnet vibe.",
            "Sync rate increasing...",
            "Deep focus achieved in room #4."
        ];
        
        if (this.streamInterval) clearInterval(this.streamInterval);
        this.streamInterval = setInterval(() => {
            const msg = document.createElement('div');
            msg.className = 'sync-stream-msg glass-panel';
            msg.innerHTML = `<strong>LINK:</strong> ${messages[Math.floor(Math.random() * messages.length)]}`;
            streamContainerRef.prepend(msg);
            if (streamContainerRef.children.length > 5) streamContainerRef.lastChild.remove();
        }, 3000);
    }

    // --- VIEW TEMPLATES ---
    getHomeHTML(posts, activeTab = 'vibeline') {
        const tabs = [
            { id: 'vibeline', label: 'Vibeline' },
            { id: 'trending', label: 'Trending' },
            { id: 'we-vibin', label: 'We Vibin' }
        ];
        return `
            <div class="view-header animate-fade">
                <h1 class="view-title">The Pulse</h1>
                <p class="text-dim" style="margin-top:8px;">Connect minds. Share vibes. Elevate consciousness.</p>
            </div>
            <div class="tabs">
                ${tabs.map(t => `<button class="tab ${activeTab === t.id ? 'active' : ''}" onclick="window.App.switchHomeTab('${t.id}')">${t.label}</button>`).join('')}
            </div>
            <div id="post-feed">
                ${posts.map(p => Components.post(p)).join('')}
            </div>
        `;
    }

    async switchHomeTab(tabId) {
        const posts = await this.services.data.getPosts(tabId);
        document.getElementById('view-container').innerHTML = this.getHomeHTML(posts, tabId);
        this.attachViewEvents();
    }

    getVibeStreamHTML(videos) {
        return `
            <div class="view-header">
                <h1 class="view-title">VibeStream</h1>
                <p>Vertical vibes for the linked mind.</p>
            </div>
            <div class="vibestream-container">
                ${videos.map(v => Components.video(v)).join('')}
            </div>
        `;
    }

    getSyncRoomsHTML(rooms) {
        return `
            <div class="view-header">
                <h1 class="view-title">Sync Rooms</h1>
                <p>Live psychological sync with 125 minds max.</p>
            </div>
            <div class="rooms-grid" id="rooms-grid">
                ${rooms.map(r => `
                    <div class="room-card glass-panel">
                        <h3>${r.name}</h3>
                        <p>${r.users} Vibing Now</p>
                        <button class="btn-primary" onclick="window.App.joinSyncRoom('${r.id}', '${r.name}')">Sync In</button>
                    </div>
                `).join('')}
            </div>
            <div id="active-chat-container" class="hidden">
                <div class="view-header"><button class="btn-secondary" onclick="window.App.leaveSyncRoom()">← Back to Rooms</button><h1 class="view-title" id="active-room-name"></h1></div>
                <div class="chat-container">
                    <div class="chat-messages" id="chat-messages"></div>
                    <div class="chat-input">
                        <input type="text" id="chat-message-input" placeholder="Type a message...">
                        <button class="btn-primary" onclick="window.App.sendChatMessage()">Send</button>
                    </div>
                </div>
            </div>
        `;
    }

    joinSyncRoom(roomId, roomName) {
        document.getElementById('rooms-grid').classList.add('hidden');
        document.getElementById('active-chat-container').classList.remove('hidden');
        document.getElementById('active-room-name').innerText = roomName;
        this.activeRoomId = roomId;

        // BroadcastChannel for simple live chat simulation between tabs
        this.chatChannel = new BroadcastChannel(`vibehub_chat_${roomId}`);
        this.chatChannel.onmessage = (event) => {
            this.appendChatMessage(event.data);
        };
    }

    leaveSyncRoom() {
        document.getElementById('rooms-grid').classList.remove('hidden');
        document.getElementById('active-chat-container').classList.add('hidden');
        if (this.chatChannel) this.chatChannel.close();
    }

    sendChatMessage() {
        const input = document.getElementById('chat-message-input');
        const message = {
            text: input.value,
            user: State.user.username,
            time: new Date().toLocaleTimeString()
        };
        this.chatChannel.postMessage(message);
        this.appendChatMessage(message);
        input.value = '';
    }

    appendChatMessage(message) {
        const chat = document.getElementById('chat-messages');
        chat.innerHTML += `<div style="margin-bottom:10px;"><strong>${message.user}:</strong> ${message.text} <span class="text-dim" style="font-size:0.7rem;">${message.time}</span></div>`;
        chat.scrollTop = chat.scrollHeight;
    }

    getProfileHTML(user) {
        if (!user) return `
            <div class="auth-required glass-panel" style="padding:40px; text-align:center;">
                <h2>Identify Your Vibe</h2>
                <p>Login to view your link state.</p>
                <button class="btn-primary" onclick="window.App.navigate('login')" style="margin-top:20px;">Login / Register</button>
            </div>
        `;
        return `
            <div class="profile-container">
                <div class="profile-header">
                    <img src="${user.profilePhoto}" class="profile-avatar" alt="${user.displayName}">
                    <div class="profile-info">
                        <h1 class="view-title">${user.displayName}</h1>
                        <p class="handle">@${user.username}</p>
                        <p style="margin-top:10px;">${user.bio}</p>
                    </div>
                </div>
                <div class="profile-stats">
                    <div class="stat-item"><span class="stat-value">${user.followersCount}</span><span class="stat-label">Followers</span></div>
                    <div class="stat-item"><span class="stat-value">${user.followingCount}</span><span class="stat-label">Following</span></div>
                    <div class="stat-item"><span class="stat-value">${user.postCount}</span><span class="stat-label">Posts</span></div>
                    <div class="stat-item"><span class="stat-value">98%</span><span class="stat-label">Vibe Match</span></div>
                </div>
                <div class="profile-tabs tabs" style="justify-content:center; margin-top:30px;">
                    <button class="tab active">Posts</button>
                    <button class="tab">Videos</button>
                    <button class="tab">Saved</button>
                    <button class="tab">Market</button>
                </div>
            </div>
        `;
    }

    generateBadges(user) {
        const badges = [];
        if (user.reactionScore > 5000) badges.push({ label: 'Heat Magnet', class: 'badge-heat' });
        if (user.postCount > 20) badges.push({ label: 'Truth Detector', class: 'badge-truth' });
        if (user.followersCount > 1000) badges.push({ label: 'Admired Creator', class: 'badge-admired' });
        
        return badges.map(b => `<span class="user-badge ${b.class}">${b.label}</span>`).join(' ');
    }

    getAuthHTML(mode) {
        const isLogin = mode === 'login';
        return `
            <div class="login-content glass-panel" style="border: 2px solid rgba(157, 80, 187, 0.3); box-shadow: 0 0 50px rgba(157, 80, 187, 0.2);">
                <div class="login-header">
                    <div class="login-logo">
                        <div class="login-logo-glow"></div>
                        <img src="https://i.ibb.co/Fqnj3JKp/1000001392.png" alt="Vibehub Logo">
                    </div>
                    <h1 class="login-title">${isLogin ? 'Login' : 'Join'} Vibehub</h1>
                    <p class="login-subtitle">${isLogin ? 'Link your mind' : 'Begin your journey'}</p>
                </div>

                <div class="login-form">
                    <div class="login-toggle">
                        <input type="checkbox" id="admin-toggle">
                        <label for="admin-toggle">I am an Admin</label>
                    </div>

                    <input type="email" id="login-email" class="login-input" placeholder="Email Address" required>
                    ${!isLogin ? '<input type="text" id="register-username" class="login-input" placeholder="Choose Username" required>' : ''}
                    <input type="password" id="login-password" class="login-input" placeholder="Password" required>
                    <button class="login-submit" onclick="window.App.handleLogin('${mode}')">${isLogin ? '✨ Enter The Pulse' : '🚀 Create My Identity'}</button>

                    <div class="login-footer">
                        <a href="#" onclick="window.App.navigate('${isLogin ? 'register' : 'login'}')">${isLogin ? 'Need an account? Register' : 'Already linked? Login'}</a>
                    </div>
                </div>
            </div>
        `;
    }

    async handleLogin(mode = 'login') {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const isAdmin = document.getElementById('admin-toggle').checked;

        // Simple validation
        if (!email || !password) {
            this.showToast('Please fill in all fields');
            return;
        }

        const user = await this.services.auth.login(email, password, isAdmin);
        State.user = user;

        if (user.isSuperAdmin) {
            this.showToast('Welcome, Admin! 🎉');
        } else {
            this.showToast('Welcome to the Pulse! ✨');
        }

        // Hide login screen
        const login = document.getElementById('login-screen');
        if (login) {
            login.style.opacity = '0';
            setTimeout(() => {
                login.style.visibility = 'hidden';
            }, 800);
        }

        this.navigate('home');
    }

    getMessagesHTML(dms) {
        return `
            <div class="view-header"><h1 class="view-title">Messages</h1></div>
            <div class="messages-list">
                ${dms.map(d => `
                    <div class="dm-card glass-panel" style="padding:15px; margin-bottom:10px; display:flex; align-items:center; gap:15px; cursor:pointer;">
                        <img src="https://i.pravatar.cc/100?u=${d.id}" class="user-avatar" style="width:50px; height:50px;">
                        <div style="flex:1;">
                            <div style="display:flex;">
                                <strong>${d.user}</strong>
                                <span class="text-dim" style="font-size:0.8rem; margin-left:auto;">${d.time}</span>
                            </div>
                            <p class="${d.unread ? 'text-main' : 'text-dim'}" style="font-size:0.9rem;">${d.lastMsg}</p>
                        </div>
                        ${d.unread ? '<div style="width:8px; height:8px; border-radius:50%; background:var(--primary-orange);"></div>' : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }

    getNotificationsHTML() {
        const mockNotifs = [
            { id: 1, type: 'reaction', text: '<strong>Cyber Soul</strong> reacted 🔥 to your post', time: '5m ago' },
            { id: 2, type: 'follow', text: '<strong>Future Ghost</strong> started following you', time: '1h ago' }
        ];
        return `
            <div class="view-header"><h1 class="view-title">Alerts</h1></div>
            <div class="notif-list">
                ${mockNotifs.map(n => `
                    <div class="notif-card glass-panel" style="padding:15px; margin-bottom:10px; display:flex; align-items:center; gap:15px;">
                        <span style="font-size:1.5rem;">${n.type === 'reaction' ? '⚡' : '👤'}</span>
                        <div style="flex:1;">
                            <p>${n.text}</p>
                            <span class="text-dim" style="font-size:0.8rem;">${n.time}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    getSearchHTML() {
        return `
            <div class="view-header"><h1 class="view-title">Search</h1></div>
            <div class="search-tabs tabs">
                <button class="tab active">Minds</button>
                <button class="tab">Vibes</button>
                <button class="tab">Communities</button>
                <button class="tab">Hashtags</button>
            </div>
            <div id="search-results-area" style="padding: 20px 0;">
                <h3 class="text-dim">Trending Topics</h3>
                <div style="display:flex; flex-wrap:wrap; gap:10px; margin-top:15px;">
                    <span class="user-badge badge-truth">#cyberpunk</span>
                    <span class="user-badge badge-truth">#psychology</span>
                    <span class="user-badge badge-truth">#synthwave</span>
                    <span class="user-badge badge-truth">#meditation</span>
                </div>
                
                <div style="margin-top:40px;">
                    <h3 class="text-dim">Minds to Link</h3>
                    ${[1,2,3].map(i => `
                        <div class="glass-panel" style="padding:15px; margin-bottom:10px; display:flex; align-items:center; gap:15px;">
                            <img src="https://i.pravatar.cc/100?u=s${i}" class="user-avatar" style="width:50px; height:50px;">
                            <div>
                                <strong>Mind ${i}</strong>
                                <p class="text-dim" style="font-size:0.8rem;">Vibe Match: <span style="color:var(--primary-orange); font-weight:700;">${90 + i}%</span></p>
                            </div>
                            <button class="btn-primary btn-sm" style="margin-left:auto;">Link</button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    getSettingsHTML() {
        return `
            <div class="view-header"><h1 class="view-title">Settings</h1></div>
            <div class="settings-grid" style="display:flex; flex-direction:column; gap:20px;">
                <div class="glass-panel" style="padding:20px;">
                    <h3>Support Vibehub Development</h3>
                    <p class="text-dim" style="margin-top:5px;">Help us link more minds. Secure via Square.</p>
                    <button class="btn-primary" style="margin-top:15px;" onclick="window.App.handleDonation()">Donate to Vibe Evolution</button>
                </div>
                <div class="glass-panel" style="padding:20px;">
                    <h3>Account Security</h3>
                    <button class="btn-secondary" style="margin-top:10px; width:100%;">Update Passlink</button>
                </div>
                <button class="btn-secondary" style="color:var(--accent-pink); border-color:var(--accent-pink);" onclick="window.App.services.auth.logout()">Disconnect Session</button>
            </div>
        `;
    }

    handleDonation() {
        alert("Redirecting to Square secure donation link...");
    }

    getAdminHTML(stats) {
        return `
            <div class="view-header">
                <h1 class="view-title">Admin Dashboard</h1>
            </div>
            <div class="tabs">
                <button class="tab active" onclick="this.parentElement.querySelectorAll('.tab').forEach(t=>t.classList.remove('active')); this.classList.add('active'); document.getElementById('admin-stats').classList.remove('hidden'); document.getElementById('admin-manage').classList.add('hidden');">Dashboard</button>
                <button class="tab" onclick="this.parentElement.querySelectorAll('.tab').forEach(t=>t.classList.remove('active')); this.classList.add('active'); document.getElementById('admin-stats').classList.add('hidden'); document.getElementById('admin-manage').classList.remove('hidden');">Moderation</button>
            </div>

            <div id="admin-stats" class="admin-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px;">
                <div class="stat-card glass-panel" style="padding: 24px;">
                    <h3 class="text-dim">Total Users</h3>
                    <p style="font-size: 2.5rem; font-weight:800; color: var(--primary-purple);">${stats.users}</p>
                </div>
                <div class="stat-card glass-panel" style="padding: 24px;">
                    <h3 class="text-dim">Active Now</h3>
                    <p style="font-size: 2.5rem; font-weight:800; color: var(--primary-orange);">${stats.activeNow}</p>
                </div>
                <div class="stat-card glass-panel" style="padding: 24px;">
                    <h3 class="text-dim">Posts Today</h3>
                    <p style="font-size: 2.5rem; font-weight:800; color: var(--accent-cyan);">${stats.postsToday}</p>
                </div>
                <div class="stat-card glass-panel" style="padding: 24px;">
                    <h3 class="text-dim">Revenue</h3>
                    <p style="font-size: 2.5rem; font-weight:800; color: var(--accent-gold);">${stats.revenue}</p>
                </div>
            </div>

            <div id="admin-manage" class="hidden glass-panel" style="padding:24px;">
                <h3>Moderation</h3>
                <div style="margin-top:20px; display:flex; flex-direction:column; gap:10px;">
                    <button class="btn-secondary" onclick="window.App.showToast('Moderation Tool Active: Delete Posts/Users')">Manage Users & Posts</button>
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
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.App = new VibeApp();
});