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

        // Expose global reaction popup for components
        window.triggerReactionPopup = this.triggerReactionPopup.bind(this);

        // Global error handler
        window.addEventListener('error', (e) => {
            console.error('Global error:', e.error);
        });
        
        window.addEventListener('unhandledrejection', (e) => {
            console.error('Unhandled promise rejection:', e.reason);
        });

        // 1. Show loading screen
        this.showLoadingScreen();

        // 2. Register Service Worker (with error handling)
        if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
            navigator.serviceWorker.register('./service-worker.js')
                .catch(err => console.log("Service Worker registration failed:", err));
        }

        // 3. Setup Routing & Event Listeners
        this.setupEventListeners();

        // 4. Listen for Clerk auth events
        this.setupClerkListeners();

        // 5. After 3 seconds, execute transition
        setTimeout(() => {
            this.transitionToLogin();
        }, 3000);
    }

    setupClerkListeners() {
        // Listen for Clerk session changes
        window.addEventListener('clerk-session-change', async (e) => {
            if (e.detail) {
                console.log('Clerk session detected, handling...');
                await this.services.auth.handleClerkSession();
            }
        });

        // Listen for user logged in event from AuthService
        window.addEventListener('user-logged-in', (e) => {
            console.log('User logged in:', e.detail);
            State.user = e.detail;
            
            // Hide login screen
            const login = document.getElementById('login-screen');
            if (login) {
                login.style.opacity = '0';
                setTimeout(() => {
                    login.style.visibility = 'hidden';
                }, 500);
            }
            
            // Enable real-time subscriptions
            this.enableRealTimeSubscriptions();
            
            this.showToast(`Welcome, ${e.detail.displayName}! ✨`);
            this.navigate('home');
        });

        // Listen for user logged out event
        window.addEventListener('user-logged-out', () => {
            console.log('User logged out');
            State.user = null;
            this.disableRealTimeSubscriptions();
            this.navigate('login');
            this.showToast('You have been logged out');
        });
    }

    // Real-time subscriptions for live updates
    enableRealTimeSubscriptions() {
        if (!this.services.data) return;
        
        console.log('📡 Enabling real-time subscriptions...');
        
        // Subscribe to new posts
        this.postsChannel = this.services.data.subscribeToPosts((event) => {
            console.log('Real-time event:', event);
            if (event.type === 'new_post') {
                // Add new post to top of timeline
                State.posts.unshift(event.data);
                if (State.currentView === 'home') {
                    this.renderView('home');
                }
                this.showToast('New vibe posted!', 'info');
            } else if (event.type === 'post_update') {
                // Update existing post
                const index = State.posts.findIndex(p => p.id === event.data.id);
                if (index !== -1) {
                    State.posts[index] = { ...State.posts[index], ...event.data };
                    if (State.currentView === 'home') {
                        this.renderView('home');
                    }
                }
            }
        });

        // Subscribe to notifications
        if (State.user) {
            this.notificationsChannel = this.services.data.subscribeToUserNotifications(State.user.id, (event) => {
                if (event.type === 'notification') {
                    State.notifications.unshift(event.data);
                    this.updateNotificationBadge();
                    this.services.data.notifications.sendLocalNotification(
                        'New VibeHub Alert!',
                        event.data.message || 'You have a new notification'
                    );
                }
            });
        }

        // Listen for online/offline status
        window.addEventListener('online', () => this.handleOnlineStatus(true));
        window.addEventListener('offline', () => this.handleOnlineStatus(false));

        console.log('✅ Real-time subscriptions enabled');
    }

    disableRealTimeSubscriptions() {
        if (this.postsChannel) {
            if (window.supabaseClient) {
                window.supabaseClient.removeChannel(this.postsChannel);
            }
            this.postsChannel = null;
        }
        if (this.notificationsChannel) {
            if (window.supabaseClient) {
                window.supabaseClient.removeChannel(this.notificationsChannel);
            }
            this.notificationsChannel = null;
        }
        console.log('Real-time subscriptions disabled');
    }

    handleOnlineStatus(isOnline) {
        const offlineBanner = document.getElementById('offline-banner');
        if (!offlineBanner && !isOnline) {
            // Create offline banner
            const banner = document.createElement('div');
            banner.id = 'offline-banner';
            banner.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: linear-gradient(135deg, #ff6b00, #ff9f00);
                color: white;
                padding: 10px 20px;
                text-align: center;
                font-weight: 600;
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
            `;
            banner.innerHTML = '📡 You appear to be offline. Showing cached data.';
            document.body.appendChild(banner);
            
            // Adjust top bar padding
            const topBar = document.getElementById('top-bar');
            if (topBar) topBar.style.paddingTop = '50px';
        } else if (offlineBanner && isOnline) {
            // Remove offline banner
            offlineBanner.remove();
            
            // Reset top bar padding
            const topBar = document.getElementById('top-bar');
            if (topBar) topBar.style.paddingTop = '';
            
            this.showToast('Back online! ✨', 'success');
            
            // Refresh data from cloud
            if (State.currentView === 'home') {
                this.renderView('home');
            }
        }
    }

    updateNotificationBadge() {
        const badge = document.getElementById('notif-badge');
        if (badge && State.notifications) {
            const count = State.notifications.filter(n => !n.read).length;
            if (count > 0) {
                badge.textContent = count > 9 ? '9+' : count;
                badge.classList.remove('hidden');
            }
        }
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

        // Create Post Modal - support both desktop and mobile
        const postBtn = document.getElementById('create-post-btn');
        if (postBtn) {
            postBtn.addEventListener('click', () => this.showCreatePostModal());
        }
        const postBtnMobile = document.getElementById('create-post-btn-mobile');
        if (postBtnMobile) {
            postBtnMobile.addEventListener('click', () => this.showCreatePostModal());
        }

        // Admin Trigger (Hidden)
        const adminTrigger = document.getElementById('admin-trigger');
        if (adminTrigger) {
            adminTrigger.addEventListener('click', () => this.navigate('admin'));
        }

        // Global Event Delegation for Reactions
        document.body.addEventListener('click', (e) => {
            const btn = e.target.closest('.reaction-btn');
            if (btn) {
                btn.classList.toggle('active');
                const countSpan = btn.querySelector('span');
                if (countSpan) {
                    let count = parseInt(countSpan.innerText);
                    count = btn.classList.contains('active') ? count + 1 : count - 1;
                    countSpan.innerText = count;
                }

                // Reaction popup animation
                if (btn.classList.contains('active')) {
                    const reactionName = btn.innerText.split(' ')[0];
                    window.triggerReactionPopup(e.clientX, e.clientY, reactionName);
                }

                btn.style.transform = 'scale(1.2)';
                setTimeout(() => btn.style.transform = '', 200);
            }
        });
        
        // Handle Back/Forward buttons
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.view) {
                this.renderView(e.state.view, false);
            }
        });
    }

    // Mobile Hamburger Menu
    toggleMobileMenu() {
        const hamburger = document.getElementById('hamburger-btn');
        const drawer = document.getElementById('mobile-drawer');
        const overlay = document.getElementById('drawer-overlay');
        
        if (!hamburger || !drawer) return;
        
        const isOpen = drawer.classList.contains('open');
        
        if (isOpen) {
            hamburger.classList.remove('active');
            drawer.classList.remove('open');
            if (overlay) overlay.classList.remove('open');
            document.body.style.overflow = '';
        } else {
            hamburger.classList.add('active');
            drawer.classList.add('open');
            if (overlay) overlay.classList.add('open');
            document.body.style.overflow = 'hidden';
        }
    }

    closeMobileMenu() {
        const hamburger = document.getElementById('hamburger-btn');
        const drawer = document.getElementById('mobile-drawer');
        const overlay = document.getElementById('drawer-overlay');
        
        if (hamburger) hamburger.classList.remove('active');
        if (drawer) drawer.classList.remove('open');
        if (overlay) overlay.classList.remove('open');
        document.body.style.overflow = '';
    }

    toggleSearch() {
        const searchContainer = document.getElementById('search-container');
        if (!searchContainer) return;
        
        searchContainer.classList.toggle('mobile-expand');
        
        if (searchContainer.classList.contains('mobile-expand')) {
            const input = searchContainer.querySelector('input');
            if (input) {
                setTimeout(() => input.focus(), 100);
            }
        }
    }
    showPostMenu(postId) {
        // Context menu implementation
        const post = document.querySelector(`[data-id="${postId}"]`);
        if (!post) return;

        // Ensure we remove existing menu
        const existing = document.getElementById('post-menu');
        if (existing) existing.remove();

        const menu = document.createElement('div');
        menu.id = 'post-menu';
        menu.className = 'glass-panel';
        menu.style.cssText = 'position:absolute; right:20px; top:40px; padding:10px; z-index:100; display:flex; flex-direction:column; min-width:150px;';
        
        // Admin Options vs Standard User Options
        if (State.user && State.user.isSuperAdmin) {
            menu.innerHTML = `
                <button class="menu-item text-main" style="border:none; background:transparent; padding:8px; text-align:left; cursor:pointer;" onclick="window.App.deletePost('${postId}')">Delete Post</button>
                <div style="height:1px; background:var(--border-light); margin:4px 0;"></div>
                <button class="menu-item text-main" style="border:none; background:transparent; padding:8px; text-align:left; cursor:pointer; color:var(--accent-pink);" onclick="window.App.removeUser('${postId}')">Remove User</button>
            `;
        } else {
            menu.innerHTML = `
                <button class="menu-item text-main" style="border:none; background:transparent; padding:8px; text-align:left; cursor:pointer;" onclick="window.App.reportPost('${postId}')">Report Post</button>
            `;
        }
        
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

    reportPost(postId) {
        // Stub for reporting
        this.showToast('Post reported for review');
        const menu = document.getElementById('post-menu');
        if (menu) menu.remove();
    }

    removeUser(postId) {
        // Stub for admin user removal
        const post = document.querySelector(`[data-id="${postId}"]`);
        if (post) post.remove(); // hide their post visually
        this.showToast('User has been removed.');
    }

    deletePost(postId) {
        const post = document.querySelector(`[data-id="${postId}"]`);
        if (post) post.remove();
        this.showToast('Post deleted');
    }

    handlePostImage(input) {
        const file = input.files[0];
        if (!file) return;
        
        const preview = document.getElementById('media-preview');
        if (preview) {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.innerHTML = `<img src="${e.target.result}" style="max-height:200px;border-radius:8px;margin-top:8px;">`;
                preview.dataset.file = JSON.stringify({ type: 'image', data: file });
            };
            reader.readAsDataURL(file);
        }
    }

    handlePostVideo(input) {
        const file = input.files[0];
        if (!file) return;
        
        if (file.size > 100 * 1024 * 1024) {
            this.showToast('Video must be under 100MB', 'error');
            return;
        }
        
        const preview = document.getElementById('media-preview');
        if (preview) {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.innerHTML = `<video src="${e.target.result}" controls style="max-height:200px;border-radius:8px;margin-top:8px;width:100%;"></video>`;
                preview.dataset.file = JSON.stringify({ type: 'video', data: file });
            };
            reader.readAsDataURL(file);
        }
    }

    clearMediaPreview() {
        const preview = document.getElementById('media-preview');
        if (preview) {
            preview.innerHTML = '';
            delete preview.dataset.file;
        }
        const imageInput = document.getElementById('image-upload-input');
        const videoInput = document.getElementById('video-upload-input');
        if (imageInput) imageInput.value = '';
        if (videoInput) videoInput.value = '';
    }

    showCreatePostModal() {
        const modal = document.getElementById('modal-container');
        const content = document.getElementById('modal-content');
        if (!modal || !content) return;
        
        modal.classList.remove('hidden');
        content.innerHTML = `
            <h2 class="view-header">Post Your Vibe</h2>
            <textarea id="post-input" class="glass-panel" placeholder="What's your mind linked to?" style="width:100%; min-height:120px; background:rgba(0,0,0,0.5); border:1px solid var(--border-light); color:white; padding:15px; margin:15px 0;"></textarea>
            
            <div id="media-preview" style="margin-bottom:15px; min-height:50px;"></div>
            
            <div style="display:flex; gap:10px; margin-bottom:20px; flex-wrap:wrap;">
                <label class="btn-secondary" style="cursor:pointer; display:inline-flex; align-items:center; gap:5px;">
                    📷 Photo
                    <input type="file" id="image-upload-input" accept="image/*" style="display:none" onchange="window.App.handlePostImage(this)">
                </label>
                <label class="btn-secondary" style="cursor:pointer; display:inline-flex; align-items:center; gap:5px;">
                    🎥 Video
                    <input type="file" id="video-upload-input" accept="video/*" style="display:none" onchange="window.App.handlePostVideo(this)">
                </label>
                <button class="btn-secondary" onclick="window.App.clearMediaPreview()" style="display:none;" id="clear-media-btn">✕ Clear</button>
                <button class="btn-secondary">📍 Location</button>
            </div>
            
            <div style="display:flex; justify-content:flex-end; gap:10px;">
                <button class="btn-secondary" onclick="document.getElementById('modal-container').classList.add('hidden')">Cancel</button>
                <button class="btn-primary" id="final-post-btn" onclick="window.App.handleCreatePost()">Post Vibe</button>
            </div>
            <div id="upload-progress" style="display:none; margin-top:15px;">
                <div style="background:rgba(255,255,255,0.1); border-radius:4px; height:8px; overflow:hidden;">
                    <div id="progress-bar" style="background:linear-gradient(90deg, #9d50bb, #6e48aa); height:100%; width:0%; transition:width 0.3s;"></div>
                </div>
                <p style="text-align:center; font-size:12px; color:#aaa; margin-top:5px;" id="progress-text">Uploading...</p>
            </div>
        `;
    }

    async handleCreatePost() {
        const text = document.getElementById('post-input').value;
        if (!text && !State.user) {
            this.showToast('Write something or add media!', 'error');
            return;
        }
        if (!State.user) {
            this.showToast('Please login first', 'error');
            return;
        }
        
        const progressDiv = document.getElementById('upload-progress');
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');
        const clearBtn = document.getElementById('clear-media-btn');
        
        let mediaFile = null;
        let mediaType = 'none';
        
        const preview = document.getElementById('media-preview');
        if (preview && preview.dataset.file) {
            try {
                const fileData = JSON.parse(preview.dataset.file);
                mediaFile = fileData.data;
                mediaType = fileData.type;
                
                if (progressDiv) progressDiv.style.display = 'block';
                if (clearBtn) clearBtn.style.display = 'none';
            } catch (e) {
                console.error('Error parsing media file:', e);
            }
        }
        
        const newPost = {
            userId: State.user.id,
            username: State.user.username,
            displayName: State.user.displayName,
            handle: State.user.username,
            avatar: State.user.profilePhoto,
            content: text || '',
            mediaFile: mediaFile,
            mediaType: mediaType,
            tags: (text.match(/#(\w+)/g) || []).map(t => t.substring(1)),
            timestamp: 'Just now',
            tab: 'all'
        };
        
        if (progressBar) progressBar.style.width = '30%';
        
        const result = await this.services.data.addPost(newPost);
        
        if (progressBar) progressBar.style.width = '100%';
        
        if (result?.error === 'rate_limit') {
            this.showToast(result.message, 'error');
            if (progressDiv) progressDiv.style.display = 'none';
            if (clearBtn) clearBtn.style.display = 'inline-flex';
            return;
        }
        
        document.getElementById('modal-container').classList.add('hidden');
        
        if (progressDiv) progressDiv.style.display = 'none';
        
        this.showToast(mediaType === 'video' ? 'Video vibe posted!' : 'Vibe posted to the Pulse!');
        
        this.renderView('home');
        
        if (State.user) {
            this.services.data.notifications.requestPermission();
        }
    }

    async showCommentModal(postId) {
        const modal = document.getElementById('modal-container');
        const content = document.getElementById('modal-content');
        if (!modal || !content) return;
        
        // Fetch comments from DataService
        const comments = await this.services.data.getComments(postId);
        
        modal.classList.remove('hidden');
        content.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <h2 class="view-title" style="margin:0;">Comments</h2>
                <button class="btn-secondary" style="padding:5px 10px;" onclick="document.getElementById('modal-container').classList.add('hidden')">✕</button>
            </div>
            
            <div id="comments-list" style="max-height: 50vh; overflow-y: auto; margin-bottom:15px; padding-right:5px;">
                ${this.renderCommentsHTML(comments)}
            </div>
            
            <div class="comment-input-area" style="display:flex; flex-direction:column; gap:10px;">
                <textarea id="comment-input" class="glass-panel" placeholder="Add a comment..." style="width:100%; min-height:80px; background:rgba(0,0,0,0.5); border:1px solid var(--border-light); color:white; padding:10px;"></textarea>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; gap:10px;">
                        <button class="btn-secondary" title="Audio Comment" onclick="window.App.startAudioComment('${postId}')">🎤</button>
                        <button class="btn-secondary" title="Video Reply" onclick="window.App.startVideoComment('${postId}')">🎥</button>
                    </div>
                    <button class="btn-primary" onclick="window.App.submitTextComment('${postId}')">Post Comment</button>
                </div>
            </div>
        `;
    }

    renderCommentsHTML(comments) {
        if (!comments || comments.length === 0) {
            return '<p class="text-dim" style="text-align:center; padding:20px;">No comments yet. Be the first to vibe!</p>';
        }
        
        return comments.map(c => {
            let mediaContent = '';
            if (c.type === 'audio') {
                mediaContent = `<div style="background:var(--bg-glass); padding:8px 15px; border-radius:50px; display:inline-flex; align-items:center; gap:10px; border:1px solid var(--primary-purple); cursor:pointer;"><span style="color:var(--accent-cyan);">▶</span> Audio Comment (0:0${Math.floor(Math.random()*5)+2})</div>`;
            } else if (c.type === 'video') {
                mediaContent = `<div style="background:black; width:150px; height:80px; border-radius:10px; display:flex; align-items:center; justify-content:center; border:1px solid var(--primary-orange); cursor:pointer;"><span style="color:white; font-size:1.5rem;">▶</span></div>`;
            }
            
            return `
                <div class="comment" style="display:flex; gap:12px; margin-bottom:15px; animation: slideInRight 0.3s ease-out;">
                    <img src="https://i.pravatar.cc/100?u=${c.userId}" style="width:36px; height:36px; border-radius:50%; object-fit:cover;">
                    <div class="comment-body" style="flex:1;">
                        <div style="display:flex; align-items:baseline; gap:8px;">
                            <span class="comment-author" style="font-weight:bold; font-size:0.9rem;">${c.displayName || c.userId}</span>
                            <span class="comment-time text-dim" style="font-size:0.75rem;">${c.time}</span>
                        </div>
                        ${c.text ? `<div class="comment-text" style="font-size:0.95rem; margin-top:2px;">${c.text}</div>` : ''}
                        ${mediaContent ? `<div style="margin-top:5px;">${mediaContent}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    async submitTextComment(postId) {
        const input = document.getElementById('comment-input');
        const text = input.value.trim();
        if (!text) return;
        
        await this.services.data.addComment(postId, {
            userId: State.user ? State.user.username : 'guest',
            displayName: State.user ? State.user.displayName : 'Guest User',
            text: text,
            type: 'text'
        });
        
        this.showCommentModal(postId);
        this.showToast("Comment posted!");
        
        const postBtn = document.querySelector(`.post-card[data-id="${postId}"] .action-comment span`);
        if (postBtn) postBtn.innerText = parseInt(postBtn.innerText) + 1;
    }

    async startAudioComment(postId) {
        this.showToast("Recording audio... (Simulated)");
        setTimeout(async () => {
            await this.services.data.addComment(postId, {
                userId: State.user ? State.user.username : 'guest',
                displayName: State.user ? State.user.displayName : 'Guest User',
                type: 'audio'
            });
            this.showCommentModal(postId);
            this.showToast("Audio comment posted!");
            const postBtn = document.querySelector(`.post-card[data-id="${postId}"] .action-comment span`);
            if (postBtn) postBtn.innerText = parseInt(postBtn.innerText) + 1;
        }, 2000);
    }

    async startVideoComment(postId) {
        this.showToast("Uploading video... (Simulated)");
        setTimeout(async () => {
            await this.services.data.addComment(postId, {
                userId: State.user ? State.user.username : 'guest',
                displayName: State.user ? State.user.displayName : 'Guest User',
                type: 'video'
            });
            this.showCommentModal(postId);
            this.showToast("Video reply posted!");
            const postBtn = document.querySelector(`.post-card[data-id="${postId}"] .action-comment span`);
            if (postBtn) postBtn.innerText = parseInt(postBtn.innerText) + 1;
        }, 2000);
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
        // Post Reactions handling moved to global event delegation in init() or setupEventListeners()
        // to handle all reactions uniformly.

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

    triggerReactionPopup(x, y, reactionName) {
        const popup = document.createElement('div');
        popup.className = 'reaction-popup';
        popup.innerHTML = `<span>${reactionName}</span>`;
        popup.style.left = `${x}px`;
        popup.style.top = `${y}px`;
        popup.style.position = 'fixed';
        popup.style.pointerEvents = 'none';
        popup.style.zIndex = '9999';
        popup.style.fontSize = '1.5rem';
        popup.style.textShadow = '0 0 10px rgba(255,157,0,0.8)';
        popup.style.transition = 'all 0.4s ease-out';
        popup.style.transform = 'translate(-50%, -50%) scale(0.5)';
        popup.style.opacity = '0';
        document.body.appendChild(popup);

        // Trigger animation
        requestAnimationFrame(() => {
            popup.style.transform = 'translate(-50%, -150px) scale(1.5)';
            popup.style.opacity = '1';
        });

        setTimeout(() => {
            popup.style.opacity = '0';
            popup.style.transform = 'translate(-50%, -200px) scale(0.8)';
        }, 500);

        setTimeout(() => popup.remove(), 900);
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
            <div class="view-header" style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <h1 class="view-title">VibeStream</h1>
                    <p>Vertical vibes for the linked mind.</p>
                </div>
                <button class="btn-primary" onclick="window.App.goLive()">Go Live</button>
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
                <div class="profile-banner">
                    <img src="${user.bannerImage || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200'}" alt="Banner">
                </div>
                <div class="profile-content">
                    <div class="profile-header">
                        <img src="${user.profilePhoto}" class="profile-avatar" alt="${user.displayName}">
                        <div class="profile-info">
                            <h1 class="view-title">${user.displayName}</h1>
                            <p class="handle">@${user.username}</p>
                            <p class="bio">${user.bio}</p>
                            <div class="profile-badges">
                                ${this.generateBadges(user)}
                            </div>
                        </div>
                    </div>
                    <div class="profile-stats glass-panel">
                        <div class="stat-item"><span class="stat-value">${user.followersCount.toLocaleString()}</span><span class="stat-label">Followers</span></div>
                        <div class="stat-item"><span class="stat-value">${user.followingCount.toLocaleString()}</span><span class="stat-label">Following</span></div>
                        <div class="stat-item"><span class="stat-value">${user.postCount.toLocaleString()}</span><span class="stat-label">Posts</span></div>
                        <div class="stat-item"><span class="stat-value">98%</span><span class="stat-label">Vibe Match</span></div>
                    </div>
                    
                    <div class="top-vibes-section">
                        <h3 class="section-title">Top 8 Vibes</h3>
                        <div class="top-vibes-grid">
                            ${Array(8).fill(0).map((_, i) => `<div class="vibe-img-card"><img src="https://picsum.photos/250?random=${i}" loading="lazy"></div>`).join('')}
                        </div>
                    </div>

                    <div class="profile-tabs tabs">
                        <button class="tab active" style="flex:1;">Posts</button>
                        <button class="tab" style="flex:1;">Videos</button>
                        <button class="tab" style="flex:1;">Saved</button>
                        <button class="tab" style="flex:1;">Market</button>
                    </div>
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
            <div class="login-content glass-panel" style="border: 2px solid rgba(255, 165, 0, 0.4); box-shadow: 0 0 60px rgba(255, 165, 0, 0.15), 0 0 100px rgba(157, 80, 187, 0.1); max-width:420px; margin:0 auto;">
                <div class="login-header">
                    <div class="login-logo">
                        <div class="login-logo-glow" style="background: linear-gradient(135deg, #ff9f00, #9d50bb);"></div>
                        <img src="https://i.ibb.co/Fqnj3JKp/1000001392.png" alt="Vibehub Logo">
                    </div>
                    <h1 class="login-title" style="background: linear-gradient(135deg, #ff9f00, #9d50bb); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${isLogin ? 'Welcome Back' : 'Join Vibehub'}</h1>
                    <p class="login-subtitle" style="color: #aaa;">Link your mind. Share your vibe.</p>
                </div>

                <div class="login-form">
                    <!-- Clerk Buttons -->
                    <button class="clerk-auth-btn clerk-signin-btn" onclick="window.App.handleClerkSignIn()" style="
                        background: linear-gradient(135deg, #ff9f00 0%, #ff6b00 100%);
                        border: none;
                        padding: 14px 20px;
                        border-radius: 12px;
                        color: white;
                        font-weight: 600;
                        font-size: 15px;
                        cursor: pointer;
                        width: 100%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 10px;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 15px rgba(255, 159, 0, 0.3);
                        margin-bottom: 12px;
                    ">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                            <polyline points="10 17 15 12 10 7"></polyline>
                            <line x1="15" y1="12" x2="3" y2="12"></line>
                        </svg>
                        Sign in with Clerk
                    </button>
                    
                    <button class="clerk-auth-btn clerk-signup-btn" onclick="window.App.handleClerkSignUp()" style="
                        background: linear-gradient(135deg, #9d50bb 0%, #6e48aa 100%);
                        border: none;
                        padding: 14px 20px;
                        border-radius: 12px;
                        color: white;
                        font-weight: 600;
                        font-size: 15px;
                        cursor: pointer;
                        width: 100%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 10px;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 15px rgba(157, 80, 187, 0.3);
                        margin-bottom: 20px;
                    ">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="8.5" cy="7" r="4"></circle>
                            <line x1="20" y1="8" x2="20" y2="14"></line>
                            <line x1="23" y1="11" x2="17" y2="11"></line>
                        </svg>
                        Create Account
                    </button>
                    
                    <div class="auth-divider" style="display: flex; align-items: center; margin: 20px 0; color: #666;">
                        <div style="flex: 1; height: 1px; background: linear-gradient(90deg, transparent, rgba(255,165,0,0.3), transparent);"></div>
                        <span style="padding: 0 15px; font-size: 13px;">or continue with</span>
                        <div style="flex: 1; height: 1px; background: linear-gradient(90deg, transparent, rgba(157,80,187,0.3), transparent);"></div>
                    </div>

                    <!-- Admin fallback -->
                    <div class="admin-section" style="
                        background: rgba(255, 165, 0, 0.05);
                        border: 1px solid rgba(255, 165, 0, 0.2);
                        border-radius: 12px;
                        padding: 15px;
                        margin-bottom: 15px;
                    ">
                        <p style="color: #ff9f00; font-size: 12px; margin-bottom: 10px; text-align: center;">🔐 Admin Access Only</p>
                        <input type="email" id="login-email" class="login-input" placeholder="Admin Email" style="
                            background: rgba(0,0,0,0.3);
                            border: 1px solid rgba(255, 165, 0, 0.3);
                            padding: 12px 15px;
                            border-radius: 8px;
                            color: white;
                            width: 100%;
                            margin-bottom: 10px;
                        ">
                        <input type="password" id="login-password" class="login-input" placeholder="Admin Password" style="
                            background: rgba(0,0,0,0.3);
                            border: 1px solid rgba(255, 165, 0, 0.3);
                            padding: 12px 15px;
                            border-radius: 8px;
                            color: white;
                            width: 100%;
                            margin-bottom: 10px;
                        ">
                        <button class="login-submit" onclick="window.App.handleAdminLogin()" style="
                            background: linear-gradient(135deg, #ff9f00, #ff6b00);
                            border: none;
                            padding: 12px;
                            border-radius: 8px;
                            color: white;
                            font-weight: 600;
                            width: 100%;
                            cursor: pointer;
                            transition: all 0.3s;
                        ">🔑 Enter as Admin</button>
                    </div>
                </div>
            </div>
        `;
    }

    async handleClerkSignIn() {
        if (this.services.auth.clerk) {
            await this.services.auth.openSignIn();
        } else {
            this.showToast('Authentication loading...', 'info');
            setTimeout(() => this.handleClerkSignIn(), 1000);
        }
    }

    async handleClerkSignUp() {
        if (this.services.auth.clerk) {
            await this.services.auth.openSignUp();
        } else {
            this.showToast('Authentication loading...', 'info');
            setTimeout(() => this.handleClerkSignUp(), 1000);
        }
    }

    async handleAdminLogin() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        if (!email || !password) {
            this.showToast('Please enter admin credentials', 'error');
            return;
        }

        const user = await this.services.auth.login(email, password, true);
        
        if (user?.error === 'use_clerk') {
            this.showToast(user.message, 'error');
            return;
        }
        
        State.user = user;
        this.showToast('Welcome, Admin! 🎉');
        
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

    getCommunitiesHTML(communities) {
        return `
            <div class="view-header" style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <h1 class="view-title">Communities</h1>
                    <p class="text-dim">Find your tribe. Link your mind.</p>
                </div>
                <button class="btn-primary" onclick="window.App.showToast('Create Community coming soon!')">+ New Group</button>
            </div>
            
            <div class="communities-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; margin-top:20px;">
                ${communities.map(c => `
                    <div class="community-card glass-panel" style="overflow:hidden; cursor:pointer;" onclick="window.App.viewCommunity('${c.id}', '${c.name}')">
                        <img src="${c.banner}" style="width:100%; height:120px; object-fit:cover;" alt="Banner">
                        <div style="padding:15px;">
                            <h3 style="font-family:var(--font-display); font-size:1.3rem;">${c.name}</h3>
                            <p class="text-dim" style="font-size:0.9rem; margin-top:5px; margin-bottom:15px;">${c.desc}</p>
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <span class="badge-admired user-badge" style="margin:0;">${c.members} Members</span>
                                <button class="btn-secondary btn-sm" onclick="event.stopPropagation(); window.App.showToast('Joined ${c.name}!')">Join</button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    async viewCommunity(communityId, communityName) {
        // Switch to home view but filtered for this community
        State.currentView = 'home';
        document.querySelectorAll('.nav-link').forEach(l => {
            l.classList.toggle('active', l.dataset.view === 'home');
        });
        
        const posts = await this.services.data.getPosts('all', communityId);
        
        const container = document.getElementById('view-container');
        if (!container) return;
        
        container.innerHTML = `
            <div class="view-header animate-fade">
                <button class="btn-secondary" style="margin-bottom:15px;" onclick="window.App.navigate('communities')">← Back to Communities</button>
                <h1 class="view-title">${communityName}</h1>
                <p class="text-dim" style="margin-top:8px;">Viewing community feed.</p>
            </div>
            <div id="post-feed">
                ${posts.length > 0 ? posts.map(p => Components.post(p)).join('') : '<p class="text-dim" style="padding:20px;">No vibes in this community yet.</p>'}
            </div>
        `;
        this.attachViewEvents();
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

    async goLive() {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        const videoElement = document.createElement('video');
        videoElement.srcObject = stream;
        videoElement.autoplay = true;
        videoElement.muted = true;
        videoElement.className = 'vibe-video-card';
        document.getElementById('view-container').appendChild(videoElement);
        this.showToast('You are live!');
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