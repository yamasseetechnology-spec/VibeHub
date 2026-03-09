/**
 * VIBEHUB CORE ENGINE
 * Futuristic Social Media Framework
 * Prepared for Supabase Integration
 */
import { AuthService, DataService, VideoService, ChatService, AdminService } from './services.js';
import { Components } from './components.js';

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
        try {
            this.services = {
                auth: new AuthService(),
                data: new DataService(),
                video: new VideoService(),
                chat: new ChatService(),
                admin: new AdminService()
            };
        } catch (e) {
            console.error("Service initialization failed:", e);
            this.services = {
                auth: null,
                data: null,
                video: null,
                chat: null,
                admin: null
            };
        }
        this.init();
        window.App = this;
    }

    async init() {
        console.log("Vibehub Initializing...");

        try {
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
            console.log("Loading screen shown.");

            // 2. Register Service Worker (with error handling)
            if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
                navigator.serviceWorker.register('./service-worker.js')
                    .catch(err => console.log("Service Worker registration failed:", err));
            }
            console.log("Service worker step passed.");

            // 3. Setup Routing & Event Listeners
            this.setupEventListeners();
            console.log("EventListeners setup passed.");
            
            // Initialize Premium Header Effects
            this.initHeaderParticles();

            // 3.5. Initialize Premium Header Effects
            this.initHeaderParticles();

            // 4. Initialize Clerk and setup listeners
            console.log("Initializing Clerk...");
            // Wrap Clerk init in a timeout so it doesn't block the app if CDN fails
            await Promise.race([
                this.services.auth.initClerk(),
                new Promise(resolve => setTimeout(resolve, 3000))
            ]);
            console.log("Clerk initialization attempted.");
            this.setupClerkListeners();
            console.log("Clerk listeners setup.");

        } catch (err) {
            console.error("Initialization error:", err);
            this.showToast("Loading failed, trying login anyway...", "error");
        } finally {
            // 5. After 0.5 seconds, execute transition
            console.log("Executing transitionToLogin...");
            setTimeout(() => {
                this.transitionToLogin();
            }, 500);
        }
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

    initHeaderParticles() {
        const container = document.getElementById('header-particles');
        if (!container) return;

        setInterval(() => {
            const spark = document.createElement('div');
            spark.className = 'header-spark';
            
            const brand = document.querySelector('.brand-center');
            if (!brand) return;
            
            const rect = brand.getBoundingClientRect();
            const headerRect = container.getBoundingClientRect();
            
            const x = (rect.left - headerRect.left) + Math.random() * rect.width;
            const y = (rect.top - headerRect.top) + rect.height / 2;
            
            spark.style.left = `${x}px`;
            spark.style.top = `${y}px`;
            spark.style.background = Math.random() > 0.5 ? 'var(--primary-purple)' : 'var(--primary-orange)';
            spark.style.animationDelay = `${Math.random() * 2}s`;
            
            container.appendChild(spark);
            setTimeout(() => spark.remove(), 3000);
        }, 300);
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
        console.log("transitionToLogin called");
        const loading = document.getElementById('loading-screen');
        const login = document.getElementById('login-screen');
        const app = document.getElementById('app');

        console.log("Loading element:", loading);
        console.log("Login element:", login);

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
            }, 500);
        } else {
            console.warn("Loading screen not found!");
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
        document.body.addEventListener('click', async (e) => {
            const btn = e.target.closest('.reaction-btn');
            if (btn) {
                const postCard = btn.closest('.post-card');
                const postId = postCard?.dataset?.id;
                const reactionType = btn.dataset?.type;
                
                if (!postId || !reactionType) return;

                // Toggle UI
                btn.classList.toggle('active');
                const countSpan = btn.querySelector('span');
                if (countSpan) {
                    let count = parseInt(countSpan.innerText) || 0;
                    count = btn.classList.contains('active') ? count + 1 : Math.max(0, count - 1);
                    countSpan.innerText = count;
                }

                // Save to Supabase
                const user = State.user;
                if (user) {
                    await this.services.data.addReaction(postId, user.id, reactionType);
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
        console.log(`Reporting post ${postId}`);
        this.showToast('Post reported for review');
        const menu = document.getElementById('post-menu');
        if (menu) menu.remove();
    }

    removeUser(postId) {
        console.log(`Removing user for post ${postId}`);
        const post = document.querySelector(`[data-id="${postId}"]`);
        if (post) post.remove();
        this.showToast('User reported to moderation.');
    }

    deletePost(postId) {
        console.log(`Deleting post ${postId}`);
        const post = document.querySelector(`[data-id="${postId}"]`);
        if (post) post.remove();
        this.showToast('Post deleted');
        
        // Optionally call backend to delete
        if (window.supabaseClient) {
            window.supabaseClient.from('posts').delete().eq('id', postId).catch(e => console.error('Delete error:', e));
        }
    }

    handleDonation() {
        this.showToast('Donation feature coming soon!');
    }

    handlePostVideo(input) {
        const file = input.files[0];
        if (!file) return;
        
        if (file.size > 100 * 1024 * 1024) {
            this.showToast('Video must be under 100MB', 'error');
            return;
        }

        const preview = document.getElementById('media-preview');
        const clearBtn = document.getElementById('clear-media-btn');
        if (preview) {
            const url = URL.createObjectURL(file);
            
            // Check video duration constraint (max 30s)
            const video = document.createElement('video');
            video.src = url;
            video.onloadedmetadata = () => {
                if (video.duration > 30) {
                    this.showToast('Timeline videos must be 30 seconds or less', 'error');
                    this.clearMediaPreview();
                    return;
                }
                preview.innerHTML = `<video src="${url}" controls style="max-height:200px;border-radius:8px;margin-top:8px;width:100%;"></video>`;
                this._pendingMediaFile = file;
                this._pendingMediaType = 'video';
                if (clearBtn) clearBtn.style.display = 'inline-flex';
            };
        }
    }

    handlePostImage(input) {
        const file = input.files[0];
        if (!file) return;
        
        if (file.size > 20 * 1024 * 1024) {
            this.showToast('Image must be under 20MB', 'error');
            return;
        }
        
        const preview = document.getElementById('media-preview');
        const clearBtn = document.getElementById('clear-media-btn');
        if (preview) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    // Compress image using canvas
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1200;
                    const MAX_HEIGHT = 1200;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Convert to blob
                    canvas.toBlob((blob) => {
                        // Create a new File object with the compressed blob
                        const compressedFile = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now()
                        });
                        
                        preview.innerHTML = `<img src="${URL.createObjectURL(compressedFile)}" style="max-height:200px;border-radius:8px;margin-top:8px;width:100%;object-fit:cover;">`;
                        this._pendingMediaFile = compressedFile;
                        this._pendingMediaType = 'image';
                        if (clearBtn) clearBtn.style.display = 'inline-flex';
                    }, 'image/jpeg', 0.8); // 80% quality
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }

    clearMediaPreview() {
        const preview = document.getElementById('media-preview');
        const clearBtn = document.getElementById('clear-media-btn');
        if (preview) {
            preview.innerHTML = '';
            this._pendingMediaFile = null;
            this._pendingMediaType = null;
            if (clearBtn) clearBtn.style.display = 'none';
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
        
        let mediaFile = this._pendingMediaFile || null;
        let mediaType = this._pendingMediaType || 'none';
        
        if (mediaFile && progressDiv) {
            progressDiv.style.display = 'block';
            if (clearBtn) clearBtn.style.display = 'none';
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
                <div id="reply-indicator" style="display:none; font-size:0.8rem; color:var(--text-dim); padding:4px 8px; background:var(--bg-glass); border-radius:8px;"></div>
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

    renderCommentsHTML(comments, depth = 0) {
        if (!comments || comments.length === 0) {
            if (depth === 0) {
                return '<p class="text-dim" style="text-align:center; padding:20px;">No comments yet. Be the first to vibe!</p>';
            }
            return '';
        }
        
        return comments.map(c => {
            let mediaContent = '';
            if (c.type === 'audio' && c.audioUrl) {
                mediaContent = `<audio controls src="${c.audioUrl}" style="max-width:100%; height:36px;"></audio>`;
            } else if (c.type === 'audio') {
                mediaContent = `<div style="background:var(--bg-glass); padding:8px 15px; border-radius:50px; display:inline-flex; align-items:center; gap:10px; border:1px solid var(--primary-purple); cursor:pointer;"><span style="color:var(--accent-cyan);">▶</span> Audio Comment</div>`;
            } else if (c.type === 'video' && c.videoUrl) {
                mediaContent = `<video controls src="${c.videoUrl}" style="max-width:200px; border-radius:10px; border:1px solid var(--primary-orange);"></video>`;
            } else if (c.type === 'video') {
                mediaContent = `<div style="background:black; width:150px; height:80px; border-radius:10px; display:flex; align-items:center; justify-content:center; border:1px solid var(--primary-orange); cursor:pointer;"><span style="color:white; font-size:1.5rem;">▶</span></div>`;
            }

            const indent = Math.min(depth, 4) * 24;
            const repliesHTML = (c.replies && c.replies.length > 0) ? this.renderCommentsHTML(c.replies, depth + 1) : '';

            return `
                <div class="comment-thread" style="margin-left:${indent}px; ${depth > 0 ? 'border-left:2px solid var(--border-purple); padding-left:12px;' : ''}">
                    <div class="comment" style="display:flex; gap:12px; margin-bottom:10px; animation: slideInRight 0.3s ease-out;">
                        <img src="${c.avatar || 'https://i.pravatar.cc/100?u=' + c.userId}" style="width:${depth > 0 ? '28px' : '36px'}; height:${depth > 0 ? '28px' : '36px'}; border-radius:50%; object-fit:cover; flex-shrink:0;">
                        <div class="comment-body" style="flex:1; min-width:0;">
                            <div style="display:flex; align-items:baseline; gap:8px; flex-wrap:wrap;">
                                <span class="comment-author" style="font-weight:bold; font-size:${depth > 0 ? '0.8rem' : '0.9rem'};">${c.displayName || c.userId}</span>
                                <span class="comment-time text-dim" style="font-size:0.7rem;">${c.time}</span>
                            </div>
                            ${c.text ? `<div class="comment-text" style="font-size:${depth > 0 ? '0.85rem' : '0.95rem'}; margin-top:2px; word-break:break-word;">${c.text}</div>` : ''}
                            ${mediaContent ? `<div style="margin-top:5px;">${mediaContent}</div>` : ''}
                            <div style="display:flex; gap:6px; margin-top:4px; align-items:center; flex-wrap:wrap;">
                                <button class="comment-reply-btn" onclick="window.App.setReplyTarget('${c.id}', '${(c.displayName || c.userId).replace(/'/g, "\\'")}')" style="background:none; border:none; color:var(--text-muted); font-size:0.75rem; cursor:pointer; padding:2px 0;">↩ Reply</button>
                                <button onclick="window.App.reactToComment('${c.id}','heat')" style="background:none; border:none; cursor:pointer; font-size:0.7rem; color:var(--text-muted);">🔥${c.reactions?.heat || ''}</button>
                                <button onclick="window.App.reactToComment('${c.id}','like')" style="background:none; border:none; cursor:pointer; font-size:0.7rem; color:var(--text-muted);">❤️${c.reactions?.like || ''}</button>
                                <button onclick="window.App.reactToComment('${c.id}','wild')" style="background:none; border:none; cursor:pointer; font-size:0.7rem; color:var(--text-muted);">🤯${c.reactions?.wild || ''}</button>
                            </div>
                        </div>
                    </div>
                    ${repliesHTML}
                </div>
            `;
        }).join('');
    }

    setReplyTarget(commentId, displayName) {
        this._replyParentId = commentId;
        const input = document.getElementById('comment-input');
        if (input) {
            input.placeholder = `Replying to ${displayName}...`;
            input.focus();
        }
        // Show a small indicator
        const indicator = document.getElementById('reply-indicator');
        if (indicator) {
            indicator.innerHTML = `Replying to <strong>${displayName}</strong> <button onclick="window.App.clearReplyTarget()" style="background:none; border:none; color:var(--accent-pink); cursor:pointer; font-size:0.8rem;">✕</button>`;
            indicator.style.display = 'block';
        }
    }

    clearReplyTarget() {
        this._replyParentId = null;
        const input = document.getElementById('comment-input');
        if (input) input.placeholder = 'Add a comment...';
        const indicator = document.getElementById('reply-indicator');
        if (indicator) indicator.style.display = 'none';
    }

    async reactToComment(commentId, reactionType) {
        if (!State.user) {
            this.showToast('Login to react', 'error');
            return;
        }
        const result = await this.services.data.addCommentReaction(commentId, State.user.id || State.user.username, reactionType);
        if (result?.success) {
            this.showToast(result.action === 'added' ? 'Reacted!' : 'Reaction removed');
        }
    }

    async submitTextComment(postId) {
        const input = document.getElementById('comment-input');
        const text = input.value.trim();
        if (!text) return;
        
        await this.services.data.addComment(postId, {
            userId: State.user ? State.user.username : 'guest',
            displayName: State.user ? State.user.displayName : 'Guest User',
            avatar: State.user ? State.user.profilePhoto : '',
            text: text,
            parentId: this._replyParentId || null,
            type: 'text'
        });
        
        this._replyParentId = null;
        this.showCommentModal(postId);
        this.showToast("Comment posted!");
        
        const postBtn = document.querySelector(`.post-card[data-id="${postId}"] .action-comment span`);
        if (postBtn) postBtn.innerText = parseInt(postBtn.innerText) + 1;
    }

    async startAudioComment(postId) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            const chunks = [];

            mediaRecorder.ondataavailable = e => chunks.push(e.data);
            mediaRecorder.onstop = async () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                this.showToast("Uploading audio...");
                
                // Simulate Cloudinary upload
                const audioUrl = await this.services.video.uploadMedia(blob, 'audio');
                
                await this.services.data.addComment(postId, {
                    userId: State.user?.username || 'guest',
                    displayName: State.user?.displayName || 'Guest',
                    type: 'audio',
                    audioUrl: audioUrl
                });
                
                this.showCommentModal(postId);
                this.showToast("Audio comment posted! 🎤");
            };

            mediaRecorder.start();
            this.showToast("Recording... (15s max)");
            setTimeout(() => {
                if (mediaRecorder.state !== 'inactive') {
                    mediaRecorder.stop();
                    stream.getTracks().forEach(track => track.stop());
                }
            }, 15000);
        } catch (err) {
            this.showToast("Audio recording failed: " + err.message, 'error');
        }
    }

    async startVideoComment(postId) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            const video = document.createElement('video');
            video.srcObject = stream;
            video.autoplay = true;
            video.muted = true;
            video.style.width = '100%';
            
            // Show preview
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="glass-panel" style="max-width:400px; margin:auto; padding:20px;">
                    <h3 style="margin-bottom:10px;">Recording Video...</h3>
                    <div id="video-preview"></div>
                </div>
            `;
            document.body.appendChild(modal);
            document.getElementById('video-preview').appendChild(video);

            const mediaRecorder = new MediaRecorder(stream);
            const chunks = [];
            mediaRecorder.ondataavailable = e => chunks.push(e.data);
            mediaRecorder.onstop = async () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                this.showToast("Uploading video...");
                
                // Simulate Cloudinary upload
                const videoUrl = await this.services.video.uploadMedia(blob, 'video');
                
                await this.services.data.addComment(postId, {
                    userId: State.user?.username || 'guest',
                    displayName: State.user?.displayName || 'Guest',
                    type: 'video',
                    videoUrl: videoUrl
                });
                
                modal.remove();
                stream.getTracks().forEach(track => track.stop());
                this.showCommentModal(postId);
                this.showToast("Video reply posted! 🎥");
            };

            mediaRecorder.start();
            setTimeout(() => {
                if (mediaRecorder.state !== 'inactive') {
                    mediaRecorder.stop();
                }
            }, 15000);
        } catch (err) {
            this.showToast("Video recording failed: " + err.message, 'error');
        }
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

        // Clean up any stale overlays / modals from previous views
        document.querySelectorAll('.modal-overlay').forEach(el => el.remove());
        const modalContainer = document.getElementById('modal-container');
        if (modalContainer) modalContainer.classList.add('hidden');

        try {
            switch(view) {
                case 'home':
                    const posts = await this.services.data.getPosts();
                    container.innerHTML = this.getHomeHTML(Array.isArray(posts) ? posts : []);
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
                    const userPosts = State.user ? await this.services.data.getUserPosts(State.user.id) : [];
                    container.innerHTML = await this.getProfileHTML(State.user, userPosts);
                    break;
                case 'login':
                case 'register':
                    container.innerHTML = await this.getAuthHTML(view);
                    break;
                case 'messages':
                    const dms = await this.services.chat.getMessages();
                    container.innerHTML = await this.getMessagesHTML(dms);
                    break;
                case 'notifications':
                    container.innerHTML = await this.getNotificationsHTML();
                    break;
                case 'friends':
                    const friends = await this.services.data.getFriends(State.user?.id);
                    const friendsPosts = await this.services.data.getFriendsPosts(State.user?.id);
                    container.innerHTML = await this.getFriendsHTML(friends, friendsPosts);
                    break;
                case 'guidelines':
                    container.innerHTML = await this.getGuidelinesHTML();
                    break;
                case 'settings':
                    container.innerHTML = await this.getSettingsHTML();
                    break;
                case 'search':
                    container.innerHTML = await this.getSearchHTML();
                    break;
                case 'communities':
                    const communities = await this.services.data.getCommunities();
                    container.innerHTML = await this.getCommunitiesHTML(communities);
                    break;
                case 'marketplace':
                    const items = await this.services.data.getMarketplace();
                    container.innerHTML = await this.getMarketplaceHTML(items);
                    break;
                case 'admin':
                    const stats = await this.services.admin.getStats();
                    container.innerHTML = await this.getAdminHTML(stats);
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
        const safePosts = Array.isArray(posts) ? posts : [];
        const tabs = [
            { id: 'vibeline', label: 'Vibeline' },
            { id: 'trending', label: 'Trending' },
            { id: 'we-vibin', label: 'We Vibin' },
            { id: 'friends', label: 'Friends' }
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
                ${safePosts.length > 0 ? safePosts.map(p => Components.post(p)).join('') : '<p class="text-dim" style="padding:30px; text-align:center;">No vibes yet. Be the first to post!</p>'}
            </div>
        `;
    }

    async switchHomeTab(tabId) {
        if (tabId === 'friends') {
            this.navigate('friends');
            return;
        }
        const posts = await this.services.data.getPosts(tabId);
        document.getElementById('view-container').innerHTML = this.getHomeHTML(Array.isArray(posts) ? posts : [], tabId);
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
                ${videos && videos.length > 0 ? videos.map(v => Components.video(v)).join('') : '<p class="text-dim" style="padding:30px; text-align:center;">No videos yet. Go live!</p>'}
            </div>
        `;
    }

    getSyncRoomsHTML(rooms) {
        const getRoomGlow = (expiresAt) => {
            if (!expiresAt) return '';
            const now = new Date();
            const expires = new Date(expiresAt);
            const hoursLeft = (expires - now) / (1000 * 60 * 60);
            
            if (hoursLeft > 20) return 'box-shadow: 0 0 30px rgba(255, 159, 0, 0.8); border-color: rgba(255, 159, 0, 0.6);';
            if (hoursLeft > 12) return 'box-shadow: 0 0 20px rgba(255, 159, 0, 0.5); border-color: rgba(255, 159, 0, 0.4);';
            if (hoursLeft > 6) return 'box-shadow: 0 0 15px rgba(255, 159, 0, 0.3); border-color: rgba(255, 159, 0, 0.3);';
            return 'box-shadow: 0 0 8px rgba(255, 159, 0, 0.2); border-color: rgba(255, 159, 0, 0.2);';
        };

        const getTimeRemaining = (expiresAt) => {
            if (!expiresAt) return '';
            const now = new Date();
            const expires = new Date(expiresAt);
            const hoursLeft = Math.floor((expires - now) / (1000 * 60 * 60));
            if (hoursLeft <= 0) return 'Expiring soon';
            if (hoursLeft < 24) return `${hoursLeft}h remaining`;
            return '';
        };

        return `
            <div class="view-header" style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <h1 class="view-title">Sync Rooms</h1>
                    <p>Live psychological sync with 125 minds max.</p>
                </div>
                <button class="btn-primary" onclick="window.App.showCreateRoomModal()">+ Create Room</button>
            </div>
            <div class="rooms-grid" id="rooms-grid">
                ${rooms && rooms.length > 0 ? rooms.map(r => `
                    <div class="room-card glass-panel" style="${getRoomGlow(r.expiresAt)}">
                        ${getTimeRemaining(r.expiresAt) ? `<span class="room-timer" style="font-size:0.7rem; color:var(--primary-orange);">${getTimeRemaining(r.expiresAt)}</span>` : ''}
                        <h3>${r.name || 'Unnamed Room'}</h3>
                        <p>${r.users || 0} / ${r.maxUsers || 125} Vibing Now</p>
                        <button class="btn-primary" onclick="window.App.joinSyncRoom('${r.id}', '${r.name}')" ${r.users >= (r.maxUsers || 125) ? 'disabled style="opacity:0.5"' : ''}>${r.users >= (r.maxUsers || 125) ? 'Full' : 'Sync In'}</button>
                    </div>
                `).join('') : '<p class="text-dim" style="padding:20px; text-align:center;">No active rooms. Create one!</p>'}
            </div>
            <div id="active-chat-container" class="hidden">
                <div class="view-header"><button class="btn-secondary" onclick="window.App.leaveSyncRoom()">← Back to Rooms</button><h1 class="view-title" id="active-room-name"></h1></div>
                <div class="chat-container">
                    <div class="chat-messages" id="chat-messages"></div>
                    <div class="chat-input">
                        <input type="text" id="chat-message-input" placeholder="Type a message..." onkeypress="if(event.key==='Enter')window.App.sendChatMessage()">
                        <button class="btn-primary" onclick="window.App.sendChatMessage()">Send</button>
                    </div>
                </div>
            </div>
        `;
    }

    showCreateRoomModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'create-room-modal';
        modal.innerHTML = `
            <div class="modal-content glass-panel" style="max-width:400px; margin:auto;">
                <h2 style="margin-bottom:20px;">Create Sync Room</h2>
                <input type="text" id="new-room-name" class="login-input" placeholder="Room Name" style="width:100%; margin-bottom:15px;">
                <p class="text-dim" style="font-size:0.8rem; margin-bottom:20px;">Room lasts 24 hours and auto-disappears.</p>
                <div style="display:flex; gap:10px;">
                    <button class="btn-secondary" onclick="document.getElementById('create-room-modal').remove()" style="flex:1;">Cancel</button>
                    <button class="btn-primary" onclick="window.App.createRoom()" style="flex:1;">Create</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    async createRoom() {
        const nameInput = document.getElementById('new-room-name');
        const name = nameInput?.value.trim();
        
        if (!name) {
            this.showToast('Please enter a room name', 'error');
            return;
        }

        const user = State.user || { id: 'guest_' + Date.now(), username: 'Guest' };
        const room = await this.services.chat.createRoom(name, user.id);
        
        if (room) {
            this.showToast('Room created! 🎉');
            document.getElementById('create-room-modal')?.remove();
            this.navigate('syncrooms');
        } else {
            this.showToast('Failed to create room', 'error');
        }
    }

    joinSyncRoom(roomId, roomName) {
        document.getElementById('rooms-grid').classList.add('hidden');
        document.getElementById('active-chat-container').classList.remove('hidden');
        document.getElementById('active-room-name').innerText = roomName;
        this.activeRoomId = roomId;

        const user = State.user || { id: 'guest', username: 'Guest' };
        
        // Try to join via service (checks 125 limit)
        this.services.chat.joinRoom(roomId, user.id, user.username).then(success => {
            if (!success) {
                this.showToast('Room is full!', 'error');
                this.leaveSyncRoom();
                return;
            }
        });

        // Subscribe to realtime messages
        this.services.chat.subscribeToRoomMessages(roomId, (message) => {
            this.appendChatMessage({
                user: message.username,
                text: message.content,
                time: 'now'
            });
        });

        // Also support BroadcastChannel for local multi-tab testing
        this.chatChannel = new BroadcastChannel(`vibehub_chat_${roomId}`);
        this.chatChannel.onmessage = (event) => {
            this.appendChatMessage(event.data);
        };
    }

    async sendChatMessage() {
        const input = document.getElementById('chat-message-input');
        const content = input?.value.trim();
        
        if (!content || !this.activeRoomId) return;

        const user = State.user || { id: 'guest', username: 'Guest' };
        
        // Send via Supabase
        await this.services.chat.sendRoomMessage(
            this.activeRoomId,
            user.id,
            user.username,
            content
        );

        // Also broadcast for multi-tab
        if (this.chatChannel) {
            this.chatChannel.postMessage({
                user: user.username,
                text: content,
                time: 'now'
            });
        }

        // Clear input
        if (input) input.value = '';
    }

    leaveSyncRoom() {
        document.getElementById('rooms-grid').classList.remove('hidden');
        document.getElementById('active-chat-container').classList.add('hidden');
        
        const user = State.user || { id: 'guest' };
        this.services.chat.leaveRoom(this.activeRoomId, user.id);
        
        if (this.chatChannel) this.chatChannel.close();
        this.activeRoomId = null;
    }

    appendChatMessage(message) {
        const chat = document.getElementById('chat-messages');
        chat.innerHTML += `<div style="margin-bottom:10px;"><strong>${message.user}:</strong> ${message.text} <span class="text-dim" style="font-size:0.7rem;">${message.time}</span></div>`;
        chat.scrollTop = chat.scrollHeight;
    }

    async getProfileHTML(user, userPosts = []) {
        if (!user) return `
            <div class="auth-required glass-panel" style="padding:40px; text-align:center;">
                <h2>Identify Your Vibe</h2>
                <p>Login to view your link state.</p>
                <button class="btn-primary" onclick="window.App.navigate('login')" style="margin-top:20px;">Login / Register</button>
            </div>
        `;
        
        const isOwnProfile = true; // For now, always show edit button since we don't have user viewing other profiles yet
        
        return `
            <div class="profile-container">
                <div class="profile-banner">
                    <img src="${user.bannerImage || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200'}" alt="Banner">
                </div>
                <div class="profile-content">
                    <div class="profile-header">
                        <img src="${user.profilePhoto || 'https://i.pravatar.cc/150'}" class="profile-avatar" alt="${user.displayName || 'User'}">
                        <div class="profile-info" style="text-align:center;">
                            <h1 class="view-title" style="margin-bottom:0;">${user.displayName || 'User'}</h1>
                            <p class="handle" style="margin-top:2px;">@${user.username || 'username'}</p>
                            <p class="bio" style="margin-top:10px;">${user.bio || 'Welcome to my Vibe.'}</p>
                            
                            ${user.songLink ? `
                            <div style="margin-top:10px; display:inline-flex; align-items:center; gap:8px; background:rgba(255,255,255,0.05); padding:6px 15px; border-radius:30px; border:1px solid var(--border-light);">
                                <span>🎵</span>
                                <a href="${user.songLink}" target="_blank" style="color:var(--accent-cyan); text-decoration:none; font-size:0.9rem; font-weight:600;">Vibe Track</a>
                            </div>
                            ` : ''}

                            <div class="profile-badges" style="justify-content:center; margin-top:15px;">
                                ${this.generateBadges(user)}
                            </div>
                        </div>
                        ${isOwnProfile ? `<button class="btn-secondary" onclick="window.App.showEditProfileModal()" style="margin: 20px auto 0;">Edit Profile</button>` : `<button class="btn-primary" onclick="window.App.showToast('Follow coming soon!')">Follow</button>`}
                    </div>
                    <div class="profile-stats glass-panel">
                        <div class="stat-item"><span class="stat-value">${(user.followersCount || 0).toLocaleString()}</span><span class="stat-label">Followers</span></div>
                        <div class="stat-item"><span class="stat-value">${(user.followingCount || 0).toLocaleString()}</span><span class="stat-label">Following</span></div>
                        <div class="stat-item"><span class="stat-value">${(user.postCount || 0).toLocaleString()}</span><span class="stat-label">Posts</span></div>
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
                    
                    <div class="user-posts-section" style="margin-top:20px;">
                        <h3 class="section-title">Recent Vibes</h3>
                        ${userPosts && userPosts.length > 0 ? userPosts.map(p => Components.post(p)).join('') : '<p class="text-dim" style="padding:20px; text-align:center;">No recent vibes. Post something!</p>'}
                    </div>
                </div>
            </div>
        `;
    }

    showEditProfileModal() {
        const user = State.user;
        if (!user) {
            this.showToast('Please login first', 'error');
            return;
        }
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'edit-profile-modal';
        modal.innerHTML = `
            <div class="modal-content glass-panel" style="max-width:450px; margin:auto; max-height:90vh; overflow-y:auto;">
                <h2 style="margin-bottom:20px;">Edit Profile</h2>
                <div style="display:flex; flex-direction:column; gap:15px;">
                    <div>
                        <label style="color:var(--text-dim); font-size:0.8rem;">Display Name</label>
                        <input type="text" id="edit-display-name" class="login-input" value="${user.displayName || ''}" style="width:100%;">
                    </div>
                    <div>
                        <label style="color:var(--text-dim); font-size:0.8rem;">Username</label>
                        <input type="text" id="edit-username" class="login-input" value="${user.username || ''}" style="width:100%;">
                    </div>
                    <div>
                        <label style="color:var(--text-dim); font-size:0.8rem;">Bio</label>
                        <textarea id="edit-bio" class="login-input" rows="3" style="width:100%; resize:none;">${user.bio || ''}</textarea>
                    </div>
                    <div>
                        <label style="color:var(--text-dim); font-size:0.8rem;">Avatar URL</label>
                        <input type="text" id="edit-avatar" class="login-input" value="${user.profilePhoto || ''}" placeholder="https://..." style="width:100%;">
                    </div>
                    <div>
                        <label style="color:var(--text-dim); font-size:0.8rem;">Banner URL</label>
                        <input type="text" id="edit-banner" class="login-input" value="${user.bannerImage || ''}" placeholder="https://..." style="width:100%;">
                    </div>
                   <div>
                        <label style="color:var(--text-dim); font-size:0.8rem;">Song Link (Spotify/Soundcloud/YouTube)</label>
                        <input type="text" id="edit-song" class="login-input" value="${user.songLink || ''}" placeholder="https://..." style="width:100%;">
                    </div>
                </div>
                <div style="display:flex; gap:10px; margin-top:20px;">
                    <button class="btn-secondary" onclick="document.getElementById('edit-profile-modal').remove()" style="flex:1;">Cancel</button>
                    <button class="btn-primary" onclick="window.App.saveProfile()" style="flex:1;">Save</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    async saveProfile() {
        const displayName = document.getElementById('edit-display-name')?.value.trim();
        const username = document.getElementById('edit-username')?.value.trim();
        const bio = document.getElementById('edit-bio')?.value.trim();
        const profilePhoto = document.getElementById('edit-avatar')?.value.trim();
        const bannerImage = document.getElementById('edit-banner')?.value.trim();
        const songLink = document.getElementById('edit-song')?.value.trim();
        
        if (!displayName || !username) {
            this.showToast('Display name and username are required', 'error');
            return;
        }
        
        const updates = { displayName, username, bio, profilePhoto, bannerImage, songLink };
        
        // Update in AuthService
        await this.services.auth.updateProfile(updates);
        
        // Update local state
        State.user = { ...State.user, ...updates };
        
        this.showToast('Profile updated! ✨');
        document.getElementById('edit-profile-modal')?.remove();
        this.navigate('profile');
    }

    generateBadges(user) {
        const badges = [];
        const totalReactions = user.reactionScore || 0;
        const capCount = user.reactions?.cap || 0;
        const wildCount = user.reactions?.wild || 0;
        const heatCount = user.reactions?.heat || 0;
        const admireCount = user.reactions?.admire || 0;
        const likeCount = user.reactions?.like || 0;

        if (capCount >= 500) badges.push({ label: 'Cap Detector', class: 'badge-truth' });
        if (wildCount >= 500) badges.push({ label: 'Wild Card', class: 'badge-wild' });
        if (heatCount >= 500) badges.push({ label: 'Heat Magnet', class: 'badge-heat' });
        if (admireCount >= 500) badges.push({ label: 'Respected', class: 'badge-admired' });
        if (likeCount >= 500) badges.push({ label: 'Vibe King', class: 'badge-gold' });
        
        if (user.postCount > 20) badges.push({ label: 'Truth Detector', class: 'badge-truth' });
        if (user.followersCount > 1000) badges.push({ label: 'Admired Creator', class: 'badge-admired' });
        
        return badges.length > 0 ? badges.map(b => `<span class="user-badge ${b.class}">${b.label}</span>`).join(' ') : '<span class="text-dim">No badges yet</span>';
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
                    <!-- Custom Login Form -->
                    <div id="login-form-fields" style="display: ${isLogin ? 'block' : 'none'}; margin-bottom: 20px;">
                        <input type="email" id="login-email-input" class="login-input" placeholder="Email Address" style="width: 100%; padding: 12px; margin-bottom: 10px; border-radius: 8px; border: 1px solid rgba(255, 165, 0, 0.3); background: rgba(0,0,0,0.3); color: white;">
                        <input type="password" id="login-password-input" class="login-input" placeholder="Password" style="width: 100%; padding: 12px; margin-bottom: 10px; border-radius: 8px; border: 1px solid rgba(255, 165, 0, 0.3); background: rgba(0,0,0,0.3); color: white;">
                        <button class="login-submit-btn" onclick="window.App.handleCustomSignIn()" style="width: 100%; padding: 12px; border-radius: 8px; border: none; background: linear-gradient(135deg, #ff9f00, #ff6b00); color: white; font-weight: 600; cursor: pointer;">Sign In</button>
                    </div>
                    
                    <!-- Custom Sign Up Form -->
                    <div id="signup-form-fields" style="display: ${!isLogin ? 'block' : 'none'}; margin-bottom: 20px;">
                        <input type="text" id="signup-name-input" class="login-input" placeholder="Full Name" style="width: 100%; padding: 12px; margin-bottom: 10px; border-radius: 8px; border: 1px solid rgba(157, 80, 187, 0.3); background: rgba(0,0,0,0.3); color: white;">
                        <input type="email" id="signup-email-input" class="login-input" placeholder="Email Address" style="width: 100%; padding: 12px; margin-bottom: 10px; border-radius: 8px; border: 1px solid rgba(157, 80, 187, 0.3); background: rgba(0,0,0,0.3); color: white;">
                        <input type="password" id="signup-password-input" class="login-input" placeholder="Password" style="width: 100%; padding: 12px; margin-bottom: 10px; border-radius: 8px; border: 1px solid rgba(157, 80, 187, 0.3); background: rgba(0,0,0,0.3); color: white;">
                        <button class="signup-submit-btn" onclick="window.App.handleCustomSignUp()" style="width: 100%; padding: 12px; border-radius: 8px; border: none; background: linear-gradient(135deg, #9d50bb, #6e48aa); color: white; font-weight: 600; cursor: pointer;">Create Account</button>
                    </div>

                    <button id="toggle-auth-btn" onclick="window.App.toggleAuthMode()" style="
                        background: transparent;
                        border: none;
                        color: #aaa;
                        font-size: 14px;
                        cursor: pointer;
                        width: 100%;
                        margin-bottom: 20px;
                        text-decoration: underline;
                    ">
                        ${isLogin ? 'Need an account? Sign Up' : 'Already have an account? Sign In'}
                    </button>
                </div>
            </div>
        `;
    }

    toggleAuthMode() {
        const loginFields = document.getElementById('login-form-fields');
        const signupFields = document.getElementById('signup-form-fields');
        const toggleBtn = document.getElementById('toggle-auth-btn');
        const title = document.querySelector('.login-title');
        
        const isLogin = loginFields.style.display === 'block';
        
        loginFields.style.display = isLogin ? 'none' : 'block';
        signupFields.style.display = isLogin ? 'block' : 'none';
        toggleBtn.innerText = isLogin ? 'Already have an account? Sign In' : 'Need an account? Sign Up';
        title.innerText = isLogin ? 'Join Vibehub' : 'Welcome Back';
    }

    handleClerkSignIn() {
        // Use custom sign in form instead of Clerk modal
        const loginFields = document.getElementById('login-form-fields');
        const signupFields = document.getElementById('signup-form-fields');
        if (loginFields) loginFields.style.display = 'block';
        if (signupFields) signupFields.style.display = 'none';
    }

    handleClerkSignUp() {
        // Use custom sign up form instead of Clerk modal
        const loginFields = document.getElementById('login-form-fields');
        const signupFields = document.getElementById('signup-form-fields');
        if (loginFields) loginFields.style.display = 'none';
        if (signupFields) signupFields.style.display = 'block';
    }

    async handleCustomSignIn() {
        const emailInput = document.getElementById('login-email-input');
        const passwordInput = document.getElementById('login-password-input');
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        
        if (!email || !password) {
            this.showToast('Please enter both email and password', 'error');
            return;
        }
        
        if (!email.includes('@')) {
             this.showToast('Please enter a valid email address', 'error');
             return;
        }

        const rememberMe = document.getElementById('remember-me')?.checked ?? true;
        const result = await this.services.auth.customSignIn(email, password, rememberMe);
        if (result.success) {
            this.showToast('Welcome back! ✨');
            await this.services.auth.handleClerkSession();
        } else {
            this.showToast(result.error, 'error');
        }
    }

    async handleCustomSignUp() {
        const emailInput = document.getElementById('signup-email-input');
        const passwordInput = document.getElementById('signup-password-input');
        const nameInput = document.getElementById('signup-name-input');
        
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        const name = nameInput.value.trim();
        
        if (!email || !password || !name) {
            this.showToast('Please fill in all fields', 'error');
            return;
        }
        
        if (password.length < 8) {
             this.showToast('Password must be at least 8 characters long', 'error');
             return;
        }

        const rememberMe = document.getElementById('remember-me')?.checked ?? true;
        const result = await this.services.auth.customSignUp(email, password, name, rememberMe);
        if (result.success) {
            this.showToast('Welcome to VibeHub! ✨');
            await this.services.auth.handleClerkSession();
        } else {
            this.showToast(result.error, 'error');
        }
    }

    async handleAdminLogin() {
        const email = document.getElementById('admin-login-email').value;
        const password = document.getElementById('admin-login-password').value;
        
        if (!email || !password) {
            this.showToast('Please enter admin credentials', 'error');
            return;
        }

        const rememberMe = document.getElementById('admin-remember-me')?.checked ?? true;
        const user = await this.services.auth.login(email, password, true, rememberMe);
        
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
                <button class="btn-primary" onclick="window.App.showCreateCommunityModal()">+ New Group</button>
            </div>
            
            <div class="communities-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; margin-top:20px;">
                ${communities && communities.length > 0 ? communities.map(c => `
                    <div class="community-card glass-panel" style="overflow:hidden; cursor:pointer;" onclick="window.App.viewCommunity('${c.id}', '${c.name}')">
                        <img src="${c.banner || 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=400'}" style="width:100%; height:120px; object-fit:cover;" alt="Banner">
                        <div style="padding:15px;">
                            <h3 style="font-family:var(--font-display); font-size:1.3rem;">${c.name || 'Unnamed'}</h3>
                            <p class="text-dim" style="font-size:0.9rem; margin-top:5px; margin-bottom:15px;">${c.desc || ''}</p>
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <span class="badge-admired user-badge" style="margin:0;">${c.members || 0} Members</span>
                                <button class="btn-secondary btn-sm" onclick="event.stopPropagation(); window.App.joinCommunity('${c.id}', '${c.name}')">Join</button>
                            </div>
                        </div>
                    </div>
                `).join('') : '<p class="text-dim" style="padding:30px; text-align:center;">No communities yet. Create one!</p>'}
            </div>
        `;
    }

    showCreateCommunityModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'create-community-modal';
        modal.innerHTML = `
            <div class="modal-content glass-panel" style="max-width:450px; margin:auto;">
                <h2 style="margin-bottom:20px;">Create Community</h2>
                <div style="display:flex; flex-direction:column; gap:15px;">
                    <input type="text" id="new-community-name" class="login-input" placeholder="Community Name" style="width:100%;">
                    <textarea id="new-community-desc" class="login-input" rows="3" placeholder="Description" style="width:100%; resize:none;"></textarea>
                    <input type="text" id="new-community-banner" class="login-input" placeholder="Banner Image URL (optional)" style="width:100%;">
                </div>
                <div style="display:flex; gap:10px; margin-top:20px;">
                    <button class="btn-secondary" onclick="document.getElementById('create-community-modal').remove()" style="flex:1;">Cancel</button>
                    <button class="btn-primary" onclick="window.App.createCommunity()" style="flex:1;">Create</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    async createCommunity() {
        const name = document.getElementById('new-community-name')?.value.trim();
        const description = document.getElementById('new-community-desc')?.value.trim();
        const bannerUrl = document.getElementById('new-community-banner')?.value.trim();
        
        if (!name) {
            this.showToast('Please enter a community name', 'error');
            return;
        }
        
        const user = State.user || { id: 'guest' };
        const community = await this.services.data.createCommunity(name, description, bannerUrl, user.id);
        
        if (community) {
            this.showToast('Community created! 🎉');
            document.getElementById('create-community-modal')?.remove();
            this.navigate('communities');
        } else {
            this.showToast('Failed to create community', 'error');
        }
    }

    async joinCommunity(communityId, communityName) {
        if (!State.user) {
            this.showToast('Please login to join communities', 'error');
            return;
        }
        
        const success = await this.services.data.joinCommunity(communityId, State.user.id);
        if (success) {
            this.showToast(`Joined ${communityName}! 🎉`);
            this.navigate('communities');
        } else {
            this.showToast('Failed to join community', 'error');
        }
    }

    getMarketplaceHTML(items) {
        return `
            <div class="view-header">
                <h1 class="view-title">Vibe Market</h1>
                <p class="text-dim">Trade vibes, digital goods, and more.</p>
            </div>
            <div class="marketplace-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; margin-top:20px;">
                ${items && items.length > 0 ? items.map(item => `
                    <div class="marketplace-item glass-panel" style="overflow:hidden;">
                        <img src="${item.image || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400'}" style="width:100%; height:150px; object-fit:cover;" alt="${item.title || 'Item'}">
                        <div style="padding:15px;">
                            <h3 style="font-size:1rem;">${item.title || 'Untitled'}</h3>
                            <p class="text-dim" style="font-size:0.85rem; margin:5px 0;">${item.description || ''}</p>
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
                                <span style="color:var(--primary-orange); font-weight:bold;">${item.price || '0 VIBE'}</span>
                                <button class="btn-primary btn-sm" onclick="window.App.buyItem('${item.id}')">Buy</button>
                            </div>
                            <p class="text-dim" style="font-size:0.75rem; margin-top:8px;">Seller: @${item.seller || 'unknown'}</p>
                        </div>
                    </div>
                `).join('') : '<p class="text-dim" style="padding:30px; text-align:center;">No items listed yet. Check back later!</p>'}
            </div>
        `;
    }

    buyItem(itemId) {
        this.showToast('Purchase feature coming soon!');
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
                ${posts && posts.length > 0 ? posts.map(p => Components.post(p)).join('') : '<p class="text-dim" style="padding:20px;">No vibes in this community yet.</p>'}
            </div>
        `;
        this.attachViewEvents();
    }

    getMessagesHTML(dms) {
        return `
            <div class="view-header"><h1 class="view-title">Messages</h1></div>
            <div class="messages-list">
                ${dms && dms.length > 0 ? dms.map(d => `
                    <div class="dm-card glass-panel" style="padding:15px; margin-bottom:10px; display:flex; align-items:center; gap:15px; cursor:pointer;">
                        <img src="https://i.pravatar.cc/100?u=${d.id}" class="user-avatar" style="width:50px; height:50px;">
                        <div style="flex:1;">
                            <div style="display:flex;">
                                <strong>${d.user || 'Unknown'}</strong>
                                <span class="text-dim" style="font-size:0.8rem; margin-left:auto;">${d.time || ''}</span>
                            </div>
                            <p class="${d.unread ? 'text-main' : 'text-dim'}" style="font-size:0.9rem;">${d.lastMsg || ''}</p>
                        </div>
                        ${d.unread ? '<div style="width:8px; height:8px; border-radius:50%; background:var(--primary-orange);"></div>' : ''}
                    </div>
                `).join('') : '<p class="text-dim" style="padding:20px; text-align:center;">No messages yet. Start a conversation!</p>'}
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
                    <h3>Community</h3>
                    <button class="btn-secondary" style="margin-top:10px; width:100%;" onclick="window.App.navigate('guidelines')">Community Guidelines</button>
                </div>
                <div class="glass-panel" style="padding:20px;">
                    <h3>Account Security</h3>
                    <button class="btn-secondary" style="margin-top:10px; width:100%;">Update Passlink</button>
                </div>
                <button class="btn-secondary" style="color:var(--accent-pink); border-color:var(--accent-pink);" onclick="window.App.services.auth.logout()">Disconnect Session</button>
            </div>
        `;
    }

    getFriendsHTML(friends, posts) {
        return `
            <div class="view-header">
                <h1 class="view-title">Friends</h1>
                <p class="text-dim">Your vibe circle.</p>
            </div>
            <div class="tabs">
                <button class="tab active" style="flex:1;" onclick="
                    this.parentElement.querySelectorAll('.tab').forEach(t=>t.classList.remove('active')); 
                    this.classList.add('active'); 
                    document.getElementById('friends-list-container').classList.remove('hidden'); 
                    document.getElementById('friends-feed-container').classList.add('hidden');
                ">Friends List</button>
                <button class="tab" style="flex:1;" onclick="
                    this.parentElement.querySelectorAll('.tab').forEach(t=>t.classList.remove('active')); 
                    this.classList.add('active'); 
                    document.getElementById('friends-list-container').classList.add('hidden'); 
                    document.getElementById('friends-feed-container').classList.remove('hidden');
                ">Friends Feed</button>
            </div>
            
            <div id="friends-list-container">
                <div class="friends-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap:15px; margin-top:20px;">
                    ${friends && friends.length > 0 ? friends.map(f => `
                        <div class="friend-card glass-panel" style="padding:15px; text-align:center; cursor:pointer;" onclick="window.App.viewUserProfile('${f.id}', '${f.username}')">
                            <img src="${f.avatar || 'https://i.pravatar.cc/150'}" style="width:60px; height:60px; border-radius:50%; margin-bottom:10px;">
                            <h4 style="font-size:0.9rem;">${f.displayName || f.username}</h4>
                            <p class="text-dim" style="font-size:0.75rem;">@${f.username}</p>
                        </div>
                    `).join('') : '<p class="text-dim" style="grid-column:1/-1; text-align:center; padding:30px;">No friends yet. Start connecting!</p>'}
                </div>
            </div>
            
            <div id="friends-feed-container" class="hidden">
                <div style="margin-top:20px;">
                    <h3 class="section-title">Friends' Recent Vibes</h3>
                    <div id="friends-feed" style="margin-top:15px;">
                        ${posts && posts.length > 0 ? posts.map(p => Components.post(p)).join('') : '<p class="text-dim" style="text-align:center; padding:20px;">No recent vibes from friends.</p>'}
                    </div>
                </div>
            </div>
        `;
    }

    async viewUserProfile(userId, username) {
        this.showToast(`Viewing ${username}'s profile...`);
    }

    getGuidelinesHTML() {
        return `
            <div class="view-header" style="display:flex; justify-content:space-between; align-items:center;">
                <h1 class="view-title">Community Guidelines</h1>
                <button class="btn-secondary" onclick="window.App.navigate('home')">← Back to Home</button>
            </div>
            <div class="glass-panel" style="padding:25px; margin-top:20px;">
                <h2 style="color:var(--primary-orange); margin-bottom:20px;">VibeHub Community Standards</h2>
                
                <div style="margin-bottom:25px;">
                    <h3 style="color:var(--primary-purple);">1. Be Respectful</h3>
                    <p class="text-dim" style="margin-top:5px;">Treat all members with respect. No harassment, hate speech, or bullying.</p>
                </div>
                
                <div style="margin-bottom:25px;">
                    <h3 style="color:var(--primary-purple);">2. Authentic Interactions</h3>
                    <p class="text-dim" style="margin-top:5px;">Be yourself. No catfishing, impersonation, or fake accounts.</p>
                </div>
                
                <div style="margin-bottom:25px;">
                    <h3 style="color:var(--primary-purple);">3. Quality Content</h3>
                    <p class="text-dim" style="margin-top:5px;">Post original content. No spam, bot activity, or excessive self-promotion.</p>
                </div>
                
                <div style="margin-bottom:25px;">
                    <h3 style="color:var(--primary-purple);">4. Privacy & Safety</h3>
                    <p class="text-dim" style="margin-top:5px;">Don't share personal info of others. Report suspicious activity.</p>
                </div>
                
                <div style="margin-bottom:25px;">
                    <h3 style="color:var(--primary-purple);">5. Reaction Culture</h3>
                    <p class="text-dim" style="margin-top:5px;">Use reactions thoughtfully: Cap (call out misinformation), Wild (amazing content), Heat (trending), Admire (show respect), Like (general approval).</p>
                </div>
                
                <div style="margin-top:30px; padding:15px; background:rgba(255,0,0,0.1); border-radius:10px;">
                    <p style="color:var(--accent-pink);">Violations may result in warnings, temporary suspension, or permanent banning depending on severity.</p>
                </div>
                
                <button class="btn-primary" style="margin-top:25px; width:100%;" onclick="window.App.navigate('home')">I Understand - Return to Home</button>
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
                <button class="tab" onclick="this.parentElement.querySelectorAll('.tab').forEach(t=>t.classList.remove('active')); this.classList.add('active'); document.getElementById('admin-stats').classList.add('hidden'); document.getElementById('admin-manage').classList.remove('hidden'); window.App.renderAdminModeration();">Moderation</button>
            </div>

            <div id="admin-stats" class="admin-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px;">
                <div class="stat-card glass-panel" style="padding: 24px;">
                    <h3 class="text-dim">Total Users</h3>
                    <p style="font-size: 2.5rem; font-weight:800; color: var(--primary-purple);">${stats?.users || 0}</p>
                </div>
                <div class="stat-card glass-panel" style="padding: 24px;">
                    <h3 class="text-dim">Active Now</h3>
                    <p style="font-size: 2.5rem; font-weight:800; color: var(--primary-orange);">${stats?.activeNow || 0}</p>
                </div>
                <div class="stat-card glass-panel" style="padding: 24px;">
                    <h3 class="text-dim">Posts Today</h3>
                    <p style="font-size: 2.5rem; font-weight:800; color: var(--accent-cyan);">${stats?.postsToday || 0}</p>
                </div>
                <div class="stat-card glass-panel" style="padding: 24px;">
                    <h3 class="text-dim">Revenue</h3>
                    <p style="font-size: 2.5rem; font-weight:800; color: var(--accent-pink);">${stats?.revenue || '$0'}</p>
                </div>
            </div>

            <div id="admin-manage" class="hidden glass-panel" style="padding:24px; margin-top:20px;">
                <!-- Moderation content injected here -->
                <h3 style="margin-top:30px;">Post Sponsored Ad</h3>
                <div style="margin-top:15px; display:flex; flex-direction:column; gap:10px;">
                    <textarea id="ad-content" class="login-input" placeholder="Ad Content"></textarea>
                    <input type="text" id="ad-media" class="login-input" placeholder="Media URL">
                    <input type="text" id="ad-link" class="login-input" placeholder="Target Link URL">
                    <button class="btn-primary" onclick="window.App.submitAdPost()">Post Sponsored Ad</button>
                </div>
            </div>
        `;
    }

    async submitAdPost() {
        const content = document.getElementById('ad-content')?.value?.trim();
        const media = document.getElementById('ad-media')?.value?.trim();
        const link = document.getElementById('ad-link')?.value?.trim();

        if (!content) {
            this.showToast('Ad content is required', 'error');
            return;
        }

        const result = await this.services.admin.submitAd(content, media, link);
        if (result.success) {
            this.showToast('Sponsored Ad Posted!', 'success');
            document.getElementById('ad-content').value = '';
            document.getElementById('ad-media').value = '';
            document.getElementById('ad-link').value = '';
        } else {
            this.showToast(result.error, 'error');
        }
    }

    async renderAdminModeration() {
        const manageContainer = document.getElementById('admin-manage');
        if (!manageContainer) return;

        // Clear existing moderation content but keep Ad form
        const existingMod = document.getElementById('moderation-list');
        if (existingMod) existingMod.remove();

        const reportedPosts = await this.services.admin.getReportedPosts();
        
        const modHtml = `
            <div id="moderation-list" style="margin-top: 20px;">
                <h3 style="color:var(--accent-pink);">Reported Content</h3>
                ${reportedPosts.length > 0 ? reportedPosts.map(rp => `
                    <div class="glass-panel" style="padding:15px; margin-top:10px; border-left: 3px solid var(--accent-pink);">
                        <p class="text-dim">Reason: <strong>${rp.reason}</strong></p>
                        <p style="margin: 10px 0;">"${rp.post?.text || 'No text content'}" - @${rp.post?.username || 'Unknown'}</p>
                        <div style="display:flex; gap:10px;">
                            <button class="btn-secondary btn-sm" onclick="window.App.handleDeletePost('${rp.post_id}')">Delete Post</button>
                            <button class="btn-secondary btn-sm" style="color:var(--accent-pink); border-color:var(--accent-pink);" onclick="window.App.handleBanUser('${rp.post?.username}')">Ban User</button>
                        </div>
                    </div>
                `).join('') : '<p class="text-dim" style="margin-top:10px;">No pending reports. Vibes are clean.</p>'}
            </div>
        `;

        // Insert before the Ad form
        manageContainer.insertAdjacentHTML('afterbegin', modHtml);
    }

    async handleDeletePost(postId) {
        await this.services.admin.deletePost(postId);
        this.showToast('Post deleted.');
        this.renderAdminModeration();
    }

    async handleBanUser(username) {
        // Need mapping for username -> id
        this.showToast(`Banning ${username} (Simulation)`);
        await this.services.admin.banUser(username);
        this.renderAdminModeration();
    }

    showToast(msg, type = 'info') {
        const toast = document.createElement('div');
        toast.className = 'glass-panel animate-fade';
        
        let borderColor = 'var(--primary-orange)';
        if (type === 'error') {
            borderColor = 'var(--accent-pink)';
            toast.style.background = 'rgba(255, 50, 100, 0.2)';
        } else if (type === 'success') {
            borderColor = 'var(--accent-cyan)';
            toast.style.background = 'rgba(0, 242, 255, 0.1)';
        }
        
        toast.style.cssText = `position:fixed; bottom:20px; right:20px; padding:15px 25px; border:1px solid ${borderColor}; z-index:2000;`;
        toast.innerText = msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.App = new VibeApp();
});