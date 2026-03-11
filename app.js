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
    currentView: null,
    posts: [],
    notifications: [],
    syncRooms: [],
    messages: [],
    theme: 'dark',
    viewData: {},
    liveStream: null
};

// --- CORE APP CLASS ---
class VibeApp {
    constructor() {
        this.services = {};
        
        const serviceClasses = {
            auth: AuthService,
            data: DataService,
            video: VideoService,
            chat: ChatService,
            admin: AdminService
        };

        for (const [key, ServiceClass] of Object.entries(serviceClasses)) {
            try {
                this.services[key] = new ServiceClass();
            } catch (e) {
                console.error(`❌ Service initialization failed for ${key}:`, e);
                this.services[key] = null;
            }
        }

        this.init();
        window.App = this;
    }

    async init() {
        console.log("Vibehub Initializing...");
        const initStartTime = Date.now();
        const MIN_LOADING_MS = 2000;

        try {
            window.triggerReactionPopup = this.triggerReactionPopup.bind(this);
            window.addEventListener('error', (e) => console.error('Global error:', e.error));
            window.addEventListener('unhandledrejection', (e) => console.error('Unhandled promise rejection:', e.reason));

            this.showLoadingScreen();
            
            if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
                navigator.serviceWorker.register('./service-worker.js')
                    .catch(err => console.log("Service Worker registration failed:", err));
            }

            this.setupEventListeners();
            this.initHeaderParticles();
            this.setupClerkListeners();

            const clerkPromise = this.services.auth.initClerk();
            
            let progress = 0;
            const timerFill = document.getElementById('timer-fill');
            const progressInterval = setInterval(() => {
                progress += Math.random() * 8;
                if (progress > 90) progress = 90;
                if (timerFill) timerFill.style.width = `${progress}%`;
            }, 150);

            await Promise.race([
                clerkPromise,
                new Promise(resolve => setTimeout(resolve, 3500))
            ]);
            
            clearInterval(progressInterval);
            if (timerFill) timerFill.style.width = '100%';
            console.log("Clerk initialization step complete.");

        } catch (err) {
            console.error("Initialization error:", err);
        } finally {
            const elapsed = Date.now() - initStartTime;
            const remaining = Math.max(0, MIN_LOADING_MS - elapsed);
            setTimeout(() => this.finalizeInitialization(), remaining);
        }
    }

    finalizeInitialization() {
        console.log("Finalizing initialization flow...");
        let persistedUser = null;
        try {
            if (this.services && this.services.auth) {
                persistedUser = this.services.auth.checkSession();
            }
        } catch (authError) {
            console.error("Auth session check failed:", authError);
        }

        if (persistedUser) {
            console.log("Persisted session found, navigating home.");
            State.user = persistedUser;
            this.updateAdminAccess();
            this.hideLoadingScreen();
            
            const appElem = document.getElementById('app');
            if (appElem) {
                appElem.classList.remove('hidden');
                appElem.style.opacity = '1';
            }

            this.enableRealTimeSubscriptions();
            this.initializeLiveSub();
            this.navigate('home', true);
        } else {
            console.log("No session found, transitioning to login.");
            this.transitionToLogin();
        }
    }

    hideLoadingScreen() {
        const loading = document.getElementById('loading-screen');
        if (loading) {
            loading.style.opacity = '0';
            setTimeout(() => {
                loading.style.visibility = 'hidden';
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
            this.updateAdminAccess();
            
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
            this.initializeLiveSub();
            
            // Push initial state to history stack upon login
            window.history.replaceState({ view: State.currentView }, '', `#${State.currentView}`);
            
            this.showToast(`Welcome, ${e.detail.displayName}! ✨`);
            // Direct call to render home to ensure it loads immediately after login
            setTimeout(() => {
                this.navigate('home', true);
            }, 300);
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

    initializeLiveSub() {
        if (!this.services.video) return;
        this.services.video.subscribeToLiveStreams((payload) => {
            if (State.currentView === 'vibestream') {
                this.services.video.getLiveStreams().then(liveStreams => {
                    const container = document.querySelector('.live-scroll-container');
                    if (container) {
                        container.innerHTML = liveStreams.length > 0 ? liveStreams.map(l => `
                            <div class="live-card glass-panel" onclick="window.App.showToast('Joining ${l.username}\\'s stream...')">
                                <div class="live-avatar">
                                    <img src="https://i.pravatar.cc/150?u=${l.user_id}" alt="${l.username}">
                                    <span class="live-tag">LIVE</span>
                                </div>
                                <span class="live-username">${l.username}</span>
                            </div>
                        `).join('') : '<p class="text-dim">No one is live yet.</p>';
                    }
                });
            }
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
        
        // Guard: If user somehow got logged in during clerk/supabase init, don't show login
        if (State.user) {
            console.log("User detected, skipping login transition.");
            this.hideLoadingScreen();
            return;
        }

        const loading = document.getElementById('loading-screen');
        const login = document.getElementById('login-screen');
        const app = document.getElementById('app');

        console.log("Loading element:", loading);
        console.log("Login element:", login);

        if (loading) {
            loading.style.opacity = '0';
            
            setTimeout(() => {
                loading.style.visibility = 'hidden';
                
                if (login && !State.user) {
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
                if (view) {
                    this.navigate(view);
                }
                // If no data-view, let the onclick handler (e.g. showCreatePostModal) do its thing
            });
        });

        // --- Hardware Back Button Support ---
        window.addEventListener('popstate', async (e) => {
            if (e.state && e.state.view) {
                State.currentView = e.state.view;
                await this.renderView(e.state.view);
                
                // Update bottom nav highlights silently
                document.querySelectorAll('.mobile-bottom-nav').forEach(nav => nav.classList.remove('active'));
                const activeNav = document.querySelector(`.mobile-bottom-nav[data-view="${e.state.view}"]`);
                if (activeNav) activeNav.classList.add('active');
            } else if (!State.user) {
                // If no user and we hit back, ensure we stay on login
                this.transitionToLogin();
            } else {
                // Default fallback to home if history gets lost but user is logged in
                State.currentView = 'home';
                await this.renderView('home');
            }
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

        // --- Custom Pull-to-Refresh System ---
        let ptrStartY = 0;
        let ptrCurrentY = 0;
        let isPulling = false;
        let lastRefreshTime = 0;
        const PTR_THRESHOLD = 150; 
        const PTR_COOLDOWN = 3 * 60 * 1000; 

        const appBody = document.querySelector('main');
        if (appBody) {
            appBody.addEventListener('touchstart', (e) => {
                // Only start pull if we're at the very top
                if (window.scrollY <= 0) {
                    ptrStartY = e.touches[0].clientY;
                    isPulling = true;
                }
            }, { passive: true });

            appBody.addEventListener('touchmove', (e) => {
                if (!isPulling) return;
                ptrCurrentY = e.touches[0].clientY;
                const pullDistance = ptrCurrentY - ptrStartY;
                
                // If pulling down at top
                if (pullDistance > 0 && window.scrollY <= 0) {
                    if (e.cancelable) e.preventDefault();
                    const viewContainer = document.getElementById('view-container');
                    if (viewContainer) {
                        viewContainer.style.transform = `translateY(${Math.min(pullDistance * 0.3, 70)}px)`;
                    }
                } else {
                    isPulling = false;
                }
            }, { passive: false });

            appBody.addEventListener('touchend', async () => {
                if (!isPulling) return;
                isPulling = false;
                const pullDistance = ptrCurrentY - ptrStartY;
                
                const viewContainer = document.getElementById('view-container');
                if (viewContainer) {
                    viewContainer.style.transform = '';
                    viewContainer.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                    setTimeout(() => viewContainer.style.transition = '', 300);
                }
                
                if (pullDistance > PTR_THRESHOLD && window.scrollY <= 0) {
                    const now = Date.now();
                    if (now - lastRefreshTime > PTR_COOLDOWN) {
                        lastRefreshTime = now;
                        this.showToast('Pulling fresh Vibes... 🔥');
                        if (this.services.data.cache.clearCache) {
                            this.services.data.cache.clearCache('posts_');
                        }
                        if (State.currentView === 'home' || State.currentView === 'trending') {
                            await this.renderView(State.currentView);
                        }
                    } else {
                        const remaining = Math.ceil((PTR_COOLDOWN - (now - lastRefreshTime)) / 1000);
                        this.showToast(`Feed is hot! Wait ${Math.floor(remaining/60)}m ${remaining%60}s to refresh.`);
                    }
                }
                ptrStartY = 0;
                ptrCurrentY = 0;
            });
        }
        // --- End Pull to Refresh ---

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

        // Handle Back/Forward buttons
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.view) {
                this.renderView(e.state.view, false);
            }
        });

        // Mobile Keyboard Adjustment
        this.setupKeyboardHandler();
    }

    updateAdminAccess() {
        const isAdmin = State.user && (State.user.isSuperAdmin || State.user.username === 'KingKool23');
        console.log('👑 Admin access status:', isAdmin);
        document.querySelectorAll('.admin-only').forEach(el => {
            if (isAdmin) {
                el.classList.remove('hidden');
            } else {
                el.classList.add('hidden');
            }
        });
    }

    // --- Mobile Keyboard Adjustment System ---
    // IMPORTANT: Do NOT intercept touch/click events on inputs.
    // Android WebView needs the native event chain to open the keyboard.
    // We only OBSERVE and REACT — never interfere.
    setupKeyboardHandler() {
        const initialHeight = window.innerHeight;
        let keyboardOpen = false;

        const setKeyboardState = (isOpen) => {
            if (keyboardOpen === isOpen) return;
            keyboardOpen = isOpen;
            if (isOpen) {
                document.body.classList.add('keyboard-open');
                // Use Virtual Keyboard API if available to prevent auto-hiding
                if ("virtualKeyboard" in navigator) {
                    navigator.virtualKeyboard.overlaysContent = true;
                    navigator.virtualKeyboard.show();
                }
            } else {
                document.body.classList.remove('keyboard-open');
            }
        };

        // Global Force Focus Helper
        const self = this;
        window.forceFocus = (id) => {
            const el = document.getElementById(id);
            if (el) {
                setTimeout(() => {
                    el.focus();
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    if ("virtualKeyboard" in navigator) navigator.virtualKeyboard.show();
                }, 50);
            }
        };

        // Detect keyboard via visualViewport (passive observation only)
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', () => {
                const vpHeight = window.visualViewport.height;
                if (vpHeight < initialHeight * 0.75) {
                    setKeyboardState(true);
                } else {
                    setKeyboardState(false);
                }
                document.documentElement.style.setProperty('--vh', `${vpHeight * 0.01}px`);
            });
        }

        // Gently scroll focused input into view AFTER keyboard opens (passive, no interference)
        document.addEventListener('focusin', (e) => {
            const el = e.target;
            if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
                // Wait for keyboard to fully animate open before scrolling
                setTimeout(() => {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    setKeyboardState(true);
                }, 400);
            }
        });

        document.addEventListener('focusout', () => {
            setTimeout(() => {
                const active = document.activeElement;
                if (active?.tagName !== 'INPUT' && active?.tagName !== 'TEXTAREA') {
                    setKeyboardState(false);
                }
            }, 200);
        });

        // Track viewport height changes
        window.addEventListener('resize', () => {
            document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
        });
        document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
    }

    // Toggle Visibility of Post Buttons (FAB and Mobile Header)
    togglePostButton(show) {
        const fab = document.querySelector('.fab-post.brain-post-btn');
        const headerBtn = document.getElementById('create-post-btn-mobile');
        
        if (show) {
            if (fab) fab.classList.remove('hidden-vibe-btn');
            if (headerBtn) headerBtn.classList.remove('hidden-vibe-btn');
        } else {
            if (fab) fab.classList.add('hidden-vibe-btn');
            if (headerBtn) headerBtn.classList.add('hidden-vibe-btn');
        }
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
            this.togglePostButton(true); // Re-show vibe button
        } else {
            hamburger.classList.add('active');
            drawer.classList.add('open');
            if (overlay) overlay.classList.add('open');
            document.body.style.overflow = 'hidden';
            this.togglePostButton(false); // Hide vibe button
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
        this.togglePostButton(true); // Re-show vibe button
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
        menu.className = 'glass-panel animate-scale';
        menu.style.cssText = 'position:absolute; right:20px; top:40px; padding:10px; z-index:100; display:flex; flex-direction:column; min-width:150px;';
        
        // Admin Options vs Standard User Options
        if (State.user && State.user.isSuperAdmin) {
            menu.innerHTML = `
                <button class="menu-item text-main" style="border:none; background:transparent; padding:8px; text-align:left; cursor:pointer;" onclick="window.App.deletePost('${postId}')">🗑️ Delete Post</button>
                <div style="height:1px; background:var(--border-light); margin:4px 0;"></div>
                <button class="menu-item text-main" style="border:none; background:transparent; padding:8px; text-align:left; cursor:pointer; color:var(--accent-pink);" onclick="window.App.handleAdminBan('${postId}')">🚫 Ban User</button>
            `;
        } else {
            menu.innerHTML = `
                <button class="menu-item text-main" style="border:none; background:transparent; padding:8px; text-align:left; cursor:pointer;" onclick="window.App.reportPost('${postId}')">🚩 Report Vibe</button>
            `;
        }
        
        menu.innerHTML += `
            <div style="height:1px; background:var(--border-light); margin:4px 0;"></div>
            <button class="menu-item text-main" style="border:none; background:transparent; padding:8px; text-align:left; cursor:pointer;" onclick="window.App.copyPostLink('${postId}')">🔗 Copy Link</button>
        `;

        post.appendChild(menu);
        
        // Close menu when clicking elsewhere
        setTimeout(() => {
            const closeMenu = (e) => {
                if (!menu.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener('mousedown', closeMenu);
                }
            };
            document.addEventListener('mousedown', closeMenu);
        }, 10);
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

    async handleAdminBan(postId) {
        if (!State.user || !State.user.isSuperAdmin) return;
        this.showToast('Banning user...', 'info');
        try {
            // First get the post to find the exact author ID
            const { data: postData } = await window.supabaseClient.from('posts').select('user_id').eq('id', postId).single();
            if (postData && postData.user_id) {
                await this.services.admin.banUser(postData.user_id);
                this.showToast('User has been banned.');
                this.deletePost(postId); // Also remove the offending post
            } else {
                this.showToast('Could not find post author.', 'error');
            }
        } catch (e) {
            console.error('Ban error:', e);
            this.showToast('Failed to ban user.', 'error');
        }
    }

    copyPostLink(postId) {
        const link = window.location.origin + window.location.pathname + '#post-' + postId;
        navigator.clipboard.writeText(link).then(() => {
            this.showToast('Link copied to clipboard! 🔗');
        }).catch(err => {
            console.error('Could not copy text: ', err);
            this.showToast('Failed to copy link', 'error');
        });
        const menu = document.getElementById('post-menu');
        if (menu) menu.remove();
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
        
        this.togglePostButton(false);
        modal.classList.remove('hidden');
        content.innerHTML = `
            <h2 class="view-header">Post Your Vibe</h2>
            <textarea id="post-input" class="glass-panel" placeholder="What's your mind linked to?" style="width:100%; min-height:120px; background:rgba(0,0,0,0.5); border:1px solid var(--border-light); color:white; padding:15px; margin:15px 0;"></textarea>
            
            <div id="media-preview" style="margin-bottom:15px; min-height:50px;"></div>
            
            <div style="display:flex; gap:10px; margin-bottom:20px; flex-wrap:wrap;">
                <button type="button" class="btn-secondary" style="display:inline-flex; align-items:center; gap:5px;" onclick="document.getElementById('image-upload-input').click()">
                    📷 Photo
                </button>
                <input type="file" id="image-upload-input" accept="image/*" capture="environment" onchange="window.App.handlePostImage(this)" style="display:none;">
                
                <button type="button" class="btn-secondary" style="display:inline-flex; align-items:center; gap:5px;" onclick="document.getElementById('video-upload-input').click()">
                    🎥 Video
                </button>
                <input type="file" id="video-upload-input" accept="video/*" capture="environment" onchange="window.App.handlePostVideo(this)" style="display:none;">
                <button class="btn-secondary" onclick="window.App.clearMediaPreview()" style="display:none;" id="clear-media-btn">✕ Clear</button>
                <button class="btn-secondary">📍 Location</button>
            </div>
            
            <div style="display:flex; justify-content:flex-end; gap:10px;">
                <button class="btn-secondary" onclick="window.App.closeCreatePostModal()">Cancel</button>
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

    closeCreatePostModal() {
        const modal = document.getElementById('modal-container');
        if (modal) {
            modal.classList.add('hidden');
        }
        this.togglePostButton(State.currentView === 'home');
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
        
        this.closeCreatePostModal();
        
        if (progressDiv) progressDiv.style.display = 'none';
        
        this.showToast(mediaType === 'video' ? 'Video vibe posted!' : 'Vibe posted to the Pulse!');
        
        // Optimistic insert: instantly show the new post at the top of the feed
        this._pendingMediaFile = null;
        this._pendingMediaType = null;

        // Build a display-ready post object from the saved result
        const displayPost = {
            id: result?.id || 'temp_' + Date.now(),
            userId: State.user.id,
            displayName: State.user.displayName,
            handle: State.user.username,
            avatar: State.user.profilePhoto,
            content: text || '',
            media: result?.media_url || '',
            mediaType: result?.media_type || mediaType,
            reactions: { like: 0, heat: 0, wild: 0, cap: 0, admire: 0, dislike: 0 },
            commentCount: 0,
            timestamp: 'Just now'
        };

        // If we're already on the home view, prepend; otherwise navigate
        const feed = document.getElementById('post-feed');
        if (feed && State.currentView === 'home') {
            const postHTML = Components.post(displayPost);
            const wrapper = document.createElement('div');
            wrapper.innerHTML = postHTML;
            const postEl = wrapper.firstElementChild;
            if (postEl) {
                postEl.style.opacity = '0';
                postEl.style.transform = 'translateY(-20px)';
                postEl.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                feed.prepend(postEl);
                // Trigger animation
                requestAnimationFrame(() => {
                    postEl.style.opacity = '1';
                    postEl.style.transform = 'translateY(0)';
                });
            }
            // Also clear post cache so next full load is fresh
            this.services.data.cache.clearCache?.('posts_');
        } else {
            this.navigate('home', true);
        }
        
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
                <textarea id="comment-input" class="login-input" placeholder="Add a comment..." 
                          ontouchend="event.preventDefault(); this.focus();"
                          style="width:100%; min-height:80px; background:rgba(0,0,0,0.5); border:1px solid var(--border-light); color:white; padding:10px;"></textarea>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; gap:10px;">
                        <button class="btn-secondary" title="Audio Comment" onclick="window.App.startAudioComment('${postId}')">🎤</button>
                        <form method="post" enctype="multipart/form-data" style="margin:0; display:inline-block;">
                            <button type="button" class="btn-secondary" title="Upload Video Comment" onclick="this.nextElementSibling.click()">🎥 Upload</button>
                            <input type="file" accept="video/*" style="display:none;" onchange="window.App.handleVideoCommentUpload(this, '${postId}')">
                        </form>
                        <button class="btn-secondary" title="Live Video Reply" onclick="window.App.startVideoComment('${postId}')">🤳 Live</button>
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
                mediaContent = `<div class="vibe-audio-thumb" onclick="window.App.playVibe(this, '${c.audioUrl}', 'audio')">🎙️ Listen to Vibe</div>`;
            } else if (c.type === 'video' && c.videoUrl) {
                mediaContent = `<video class="vibe-media-thumb" src="${c.videoUrl}" style="max-width:200px; border-radius:10px;" onclick="window.App.playVibe(this, '${c.videoUrl}', 'video')"></video>`;
            }

            const indent = Math.min(depth, 4) * 24;
            const repliesHTML = (c.replies && c.replies.length > 0) ? this.renderCommentsHTML(c.replies, depth + 1) : '';

            return `
                <div class="comment-thread ${c.type !== 'text' ? 'vibe-thread-item' : ''}" style="margin-left:${indent}px; ${depth > 0 ? 'border-left:2px solid var(--border-purple); padding-left:12px;' : ''}">
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
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="glass-panel" style="max-width:300px; margin:auto; padding:20px; text-align:center;">
                    <h3 style="margin-bottom:10px;">Recording Audio...</h3>
                    <div id="recording-timer" style="font-size:2rem; font-weight:bold; color:var(--primary-orange); margin:15px 0;">15</div>
                    <div class="recording-pulse" style="width:50px; height:50px; background:var(--primary-orange); border-radius:50%; margin:auto; animation: pulse 1s infinite;"></div>
                </div>
            `;
            document.body.appendChild(modal);

            const mediaRecorder = new MediaRecorder(stream);
            const chunks = [];
            mediaRecorder.ondataavailable = e => chunks.push(e.data);
            
            let timeLeft = 15;
            const timerInterval = setInterval(() => {
                timeLeft--;
                const timerEl = document.getElementById('recording-timer');
                if (timerEl) timerEl.innerText = timeLeft;
                if (timeLeft <= 0) {
                    clearInterval(timerInterval);
                    if (mediaRecorder.state !== 'inactive') mediaRecorder.stop();
                }
            }, 1000);

            mediaRecorder.onstop = async () => {
                clearInterval(timerInterval);
                const blob = new Blob(chunks, { type: 'audio/webm' });
                this.showToast("Uploading audio...");
                const result = await this.services.data.media.uploadVideo(blob); // MediaService handles audio/video as generic media via Cloudinary
                const audioUrl = result?.url;
                
                await this.services.data.addComment(postId, {
                    userId: State.user?.username || 'guest',
                    displayName: State.user?.displayName || 'Guest',
                    type: 'audio',
                    audioUrl: audioUrl
                });
                
                modal.remove();
                stream.getTracks().forEach(track => track.stop());
                this.showCommentModal(postId);
                this.showToast("Audio comment posted! 🎤");
            };

            mediaRecorder.start();
        } catch (err) {
            console.error("Audio recording failed:", err);
            let msg = "Microphone access failed.";
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                msg = "Microphone access denied. Please allow it in device settings.";
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                msg = "No microphone found on this device.";
            }
            this.showToast(msg, 'error');
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
            
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="glass-panel" style="max-width:400px; margin:auto; padding:20px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <h3>Recording Video...</h3>
                        <div id="video-timer" style="font-size:1.5rem; font-weight:bold; color:var(--primary-orange);">15</div>
                    </div>
                    <div id="video-preview"></div>
                </div>
            `;
            document.body.appendChild(modal);
            document.getElementById('video-preview').appendChild(video);

            const mediaRecorder = new MediaRecorder(stream);
            const chunks = [];
            mediaRecorder.ondataavailable = e => chunks.push(e.data);
            
            let timeLeft = 15;
            const timerInterval = setInterval(() => {
                timeLeft--;
                const timerEl = document.getElementById('video-timer');
                if (timerEl) timerEl.innerText = timeLeft;
                if (timeLeft <= 0) {
                    clearInterval(timerInterval);
                    if (mediaRecorder.state !== 'inactive') mediaRecorder.stop();
                }
            }, 1000);

            mediaRecorder.onstop = async () => {
                clearInterval(timerInterval);
                const blob = new Blob(chunks, { type: 'video/webm' });
                this.showToast("Uploading video...");
                const result = await this.services.data.media.uploadVideo(blob);
                const videoUrl = result?.url;
                
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
        } catch (err) {
            console.error("Video recording failed:", err);
            let msg = "Camera/Microphone access failed.";
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                msg = "Permission denied. Check device settings for Camera/Mic.";
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                msg = "No camera or microphone found.";
            }
            this.showToast(msg, 'error');
        }
    }

    async handleVideoCommentUpload(input, postId) {
        const file = input.files[0];
        if (!file) return;
        
        this.showToast("Uploading video comment...");
        try {
            const result = await this.services.data.media.uploadVideo(file);
            const videoUrl = result?.url;
            
            if (videoUrl) {
                await this.services.data.addComment(postId, {
                    userId: State.user?.username || 'guest',
                    displayName: State.user?.displayName || 'Guest',
                    type: 'video',
                    videoUrl: videoUrl
                });
                this.showCommentModal(postId);
                this.showToast("Video comment uploaded! 🎥");
            }
        } catch (err) {
            this.showToast("Upload failed: " + err.message, 'error');
        }
    }

    showStreamSetupModal() {
        if (!State.user) {
            this.showToast('Please login to go live.');
            return;
        }

        const modalId = 'stream-setup-modal';
        const existing = document.getElementById(modalId);
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.className = 'profile-modal animate-fade';
        modal.id = modalId;
        
        modal.innerHTML = `
            <div class="profile-modal-content">
                <span class="profile-close-btn" onclick="document.getElementById('${modalId}').remove()">&times;</span>
                
                <div class="edit-banner-area" style="height: 100px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, var(--primary-purple), var(--primary-orange));">
                    <h2 style="font-family:var(--font-display); text-shadow: 0 2px 10px rgba(0,0,0,0.3);">Go Live✨</h2>
                </div>

                <div class="edit-profile-body" style="margin-top: 0; padding-top: 25px;">
                    <div class="edit-fields">
                        <p class="text-dim" style="font-size: 0.9rem; text-align: center; margin-bottom: 10px;">Neural link ready. What's your vibe?</p>
                        
                        <div class="edit-field">
                            <label class="edit-label">Stream Topic</label>
                            <input type="text" id="stream-topic" class="edit-input" placeholder="e.g. Late Night Vibes" autofocus>
                        </div>
                    </div>

                    <div class="edit-actions" style="margin-top: 30px;">
                        <button class="btn-secondary edit-cancel-btn" onclick="document.getElementById('${modalId}').remove()">Cancel</button>
                        <button class="btn-primary edit-save-btn" onclick="window.App.goLive(document.getElementById('stream-topic').value)">Go Live ✨</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };
    }

    async goLive(topic = "Just Vibing") {
        document.getElementById('stream-setup-modal')?.remove();
        this.showToast("Initializing broadcast... 📡");
        
        try {
            // Setup WebRTC Host and Media
            this.rtcPeers = new Map();
            this.localStream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: "user" }, 
                audio: true 
            });
            
            const userId = State.user?.id || 'guest_' + Date.now();
            const username = State.user?.username || 'Guest';

            const success = await this.services.video.startLive(userId, username, topic || "Vibing");
            if (!success) {
                this.showToast('Failed to start live stream.', 'error');
                return;
            }

            // Show broadcast view
            const container = document.getElementById('view-container');
            if (container) {
                container.innerHTML = this.getBroadcastModeHTML(topic || "Vibing");
                const preview = document.getElementById('broadcast-preview');
                if (preview) {
                    preview.srcObject = this.localStream;
                    preview.muted = true;
                    preview.setAttribute('playsinline', '');
                    preview.play().catch(e => console.error("Preview fail:", e));
                }
            }

            this.services.video.subscribeToSignaling(userId, (signal) => this.handleHostSignal(signal));
            this.showToast("You are LIVE! 📺", 'success');

        } catch (error) {
            console.error("VibeStream initiation failed:", error);
            this.showToast("Could not access camera/mic.", "error");
        }
    }

    async handleViewerJoin(hostId, viewerId, stream) {
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        
        this.rtcPeers.set(viewerId, pc);
        
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
        
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.services.video.sendSignal(viewerId, {
                    type: 'candidate',
                    candidate: event.candidate,
                    hostId: hostId
                });
            }
        };
        
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        this.services.video.sendSignal(viewerId, {
            type: 'offer',
            sdp: offer,
            hostId: hostId
        });
    }

    renderBroadcastMode(topic) {
        const container = document.getElementById('view-container');
        if (!container) return;
        
        container.innerHTML = `
            <div class="broadcast-view" style="height: calc(100vh - 120px); display: flex; flex-direction: column; gap: 20px;">
                <div class="broadcast-header glass-panel" style="padding: 15px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <span class="live-tag" style="background: var(--primary-orange); color: white; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 0.7rem; margin-right: 10px;">LIVE</span>
                        <span style="font-weight: bold;">${topic}</span>
                    </div>
                    <button class="btn-secondary" onclick="window.App.endLiveBroadcast()" style="padding: 5px 15px; font-size: 0.8rem; background: rgba(255, 0, 0, 0.2); border-color: rgba(255, 0, 0, 0.4);">END STREAM</button>
                </div>
                
                <div class="video-preview-container glass-panel" style="flex: 1; position: relative; overflow: hidden; border-radius: 12px; background: black;">
                    <video id="live-local-video" autoplay muted playsinline style="width: 100%; height: 100%; object-fit: cover;"></video>
                    
                    <div class="viewer-count" style="position: absolute; bottom: 20px; left: 20px; background: rgba(0, 0, 0, 0.6); padding: 5px 12px; border-radius: 20px; display: flex; align-items: center; gap: 6px; font-size: 0.8rem;">
                        <span class="pulse-dot" style="width: 8px; height: 8px; background: var(--accent-cyan);"></span>
                        <span id="live-viewers">1 viewer</span>
                    </div>

                    <div class="broadcast-controls" style="position: absolute; bottom: 20px; right: 20px; display: flex; gap: 10px;">
                        <button class="video-action" onclick="window.App.toggleLiveMic()" id="mic-btn">🎧</button>
                        <button class="video-action" onclick="window.App.toggleLiveCam()" id="cam-btn">🎥</button>
                    </div>
                </div>

                <div class="broadcast-chat glass-panel" style="height: 150px; padding: 15px; overflow-y: auto;">
                    <p class="text-dim" style="font-size: 0.8rem; text-align: center;">Waiting for reactions...</p>
                    <div id="broadcast-messages" style="display: flex; flex-direction: column; gap: 8px;"></div>
                </div>
            </div>
        `;

        // Start local camera
        this.startLiveCamera();
    }

    async startLiveCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            const videoEl = document.getElementById('live-local-video');
            if (videoEl) videoEl.srcObject = stream;
            State.liveStream = stream;
        } catch (err) {
            console.error("Camera access failed:", err);
            this.showToast("Could not access camera/mic.", "error");
        }
    }

    async endLiveBroadcast() {
        if (confirm("End your live stream?")) {
            const user = State.user;
            if (user) await this.services.video.endLive(user.id);
            
            if (State.liveStream) {
                State.liveStream.getTracks().forEach(t => t.stop());
                State.liveStream = null;
            }

            // Cleanup WebRTC Peers
            if (this.rtcPeers) {
                this.rtcPeers.forEach(pc => pc.close());
                this.rtcPeers.clear();
            }
            if (this.hostSignaling) {
                this.hostSignaling.unsubscribe();
                this.hostSignaling = null;
            }
            
            this.showToast("Stream ended! 🎬");
            this.navigate('vibestream');
        }
    }

    toggleLiveMic() {
        if (State.liveStream) {
            const audioTrack = State.liveStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                const btn = document.getElementById('mic-btn');
                if (btn) btn.innerText = audioTrack.enabled ? '🎧' : '🔇';
                this.showToast(audioTrack.enabled ? "Mic On" : "Mic Muted");
            }
        }
    }

    toggleLiveCam() {
        if (State.liveStream) {
            const videoTrack = State.liveStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                const btn = document.getElementById('cam-btn');
                if (btn) btn.innerText = videoTrack.enabled ? '🎥' : '📵';
                this.showToast(videoTrack.enabled ? "Camera On" : "Camera Off");
            }
        }
    }

    hideSplash() {
        // No longer needed - login screen is the entry point
    }

    navigate(view, force = false) {
        if (!force && State.currentView === view && window.location.hash === `#${view}`) return;
        
        // Push state to browser history for native back button support
        window.history.pushState({ view }, "", `#${view}`);
        
        // Update Bottom Nav Highlighting Silent
        document.querySelectorAll('.mobile-bottom-nav').forEach(nav => nav.classList.remove('active'));
        const activeNav = document.querySelector(`.mobile-bottom-nav[data-view="${view}"]`);
        if (activeNav) activeNav.classList.add('active');
        
        this.renderView(view);
    }

    async renderView(view, updateNav = true) {
        State.currentView = view;
        const container = document.getElementById('view-container');
        if (!container) return;
        
        // Ensure app and container are visible if they were hidden
        const app = document.getElementById('app');
        if (app) app.classList.remove('hidden');
        container.classList.remove('hidden');
        container.style.display = 'block';
        container.style.opacity = '1';

        // Show Skeleton Loading State
        this.showSkeletons(view);

        // Clean up any stale overlays / modals from previous views
        document.querySelectorAll('.modal-overlay').forEach(el => el.remove());
        const modalContainer = document.getElementById('modal-container');
        if (modalContainer) modalContainer.classList.add('hidden');

        // Toggle Vibe Out button visibility ensuring it's only shown on the home page tab
        this.togglePostButton(view === 'home');

        try {
            switch(view) {
                case 'home':
                    const posts = await this.services.data.getPosts();
                    if (!posts || posts.length === 0) {
                        // Retry once for new users or slow loads
                        setTimeout(async () => {
                            const retryPosts = await this.services.data.getPosts();
                            if (retryPosts && retryPosts.length > 0) {
                                container.innerHTML = this.getHomeHTML(retryPosts);
                            }
                        }, 1000);
                    }
                    container.innerHTML = this.getHomeHTML(Array.isArray(posts) ? posts : []);
                    break;
                case 'vibestream':
                    const videos = await this.services.video.getVibeStream();
                    const liveStreams = await this.services.video.getLiveStreams();
                    container.innerHTML = this.getVibeStreamHTML(videos, liveStreams);
                    break;
                case 'syncrooms':
                    const rooms = await this.services.chat.getSyncRooms();
                    container.innerHTML = this.getSyncRoomsHTML(rooms);
                    break;
                case 'profile':
                    const userPosts = State.user ? await this.services.data.getUserPosts(State.user.id, State.user.username) : [];
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
                case 'disclaimer':
                    container.innerHTML = await this.getDisclaimerHTML();
                    break;
                case 'privacy':
                    container.innerHTML = await this.getPrivacyHTML();
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

    showSkeletons(view) {
        const container = document.getElementById('view-container');
        if (!container) return;

        let skeletonHTML = '';
        const count = view === 'home' || view === 'friends' ? 5 : 3;

        for (let i = 0; i < count; i++) {
            skeletonHTML += `
                <div class="post-card glass-panel skeleton-loader" style="height: 300px; margin-bottom: 20px;">
                    <div class="skeleton-shimmer"></div>
                    <div style="display: flex; gap: 15px; margin-bottom: 15px;">
                        <div style="width: 45px; height: 45px; border-radius: 50%; background: rgba(255,255,255,0.05);"></div>
                        <div style="flex: 1;">
                            <div style="width: 40%; height: 12px; background: rgba(255,255,255,0.05); margin-bottom: 8px;"></div>
                            <div style="width: 25%; height: 10px; background: rgba(255,255,255,0.03);"></div>
                        </div>
                    </div>
                    <div style="width: 90%; height: 15px; background: rgba(255,255,255,0.05); margin-bottom: 10px;"></div>
                    <div style="width: 70%; height: 15px; background: rgba(255,255,255,0.05); margin-bottom: 20px;"></div>
                    <div style="width: 100%; height: 150px; border-radius: 12px; background: rgba(255,255,255,0.03);"></div>
                </div>
            `;
        }

        container.innerHTML = `
            <div class="view-header"><div class="skeleton-shimmer" style="width: 200px; height: 30px; background: rgba(255,255,255,0.05);"></div></div>
            ${view === 'syncrooms' ? `
                <div class="rooms-grid">
                    ${Array(6).fill(0).map(() => `
                        <div class="room-card glass-panel skeleton-loader" style="height: 180px;">
                            <div class="skeleton-shimmer"></div>
                        </div>
                    `).join('')}
                </div>
            ` : skeletonHTML}
        `;
    }

    attachViewEvents() {
        // Post Reactions handling moved to global event delegation in init() or setupEventListeners()
        // to handle all reactions uniformly.



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
            <div class="view-header animate-fade" style="text-align:center; padding-top: 5px; padding-bottom: 0;">
                <h1 class="view-title" style="background: linear-gradient(135deg, #9d50bb, #ff9f00); -webkit-background-clip: text; -webkit-text-fill-color: transparent; display: inline-block; font-size: 2.2rem; filter: drop-shadow(0px 0px 8px rgba(157,80,187,0.5)); margin-bottom: 0;">The Pulse</h1>
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

    async joinLiveStream(hostId, username) {
        this.showToast(`Linking to ${username}'s vibe...`);
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="broadcast-view" style="width:100%; height:100%; display: flex; flex-direction: column; background: black;">
                <div class="broadcast-header glass-panel" style="padding: 15px; display: flex; justify-content: space-between; align-items: center; border-radius: 0;">
                    <div>
                        <span class="live-tag" style="background: var(--primary-orange); color: white; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 0.7rem; margin-right: 10px;">LIVE</span>
                        <span style="font-weight: bold;">${username}'s Stream</span>
                    </div>
                    <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()" style="padding: 5px 15px; font-size: 0.8rem;">CLOSE</button>
                </div>
                <div class="video-preview-container" style="flex: 1; position: relative;">
                    <video id="remote-live-video" autoplay playsinline style="width: 100%; height: 100%; object-fit: contain;"></video>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        const viewerId = 'viewer_' + Math.random().toString(36).substr(2, 9);
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        
        pc.ontrack = (event) => {
            const videoEl = document.getElementById('remote-live-video');
            if (videoEl) videoEl.srcObject = event.streams[0];
        };
        
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.services.video.sendSignal(hostId, {
                    type: 'candidate',
                    candidate: event.candidate,
                    viewerId: viewerId
                });
            }
        };
        
        // Signaling for viewer
        const sub = this.services.video.subscribeToSignaling(viewerId, async (data) => {
            if (data.type === 'offer') {
                await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                this.services.video.sendSignal(hostId, {
                    type: 'answer',
                    sdp: answer,
                    viewerId: viewerId
                });
            } else if (data.type === 'candidate') {
                await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
        });
        
        // Send join request
        this.services.video.sendSignal(hostId, {
            type: 'join-request',
            viewerId: viewerId
        });
        
        modal.addEventListener('remove', () => {
            sub.unsubscribe();
            pc.close();
        });
    }

    getVibeStreamHTML(videos, liveStreams = []) {
        return `
            <div class="vibestream-animated-caption">Vibe for the moment.</div>
            <div class="view-header vibestream-header" style="display:flex; justify-content:space-between; align-items:center; gap: 15px; flex-wrap: wrap; margin-bottom: 20px;">
                <div style="flex: 1; min-width: 150px;">
                    <h1 class="view-title">VibeStream</h1>
                    <p class="text-dim">Vertical vibes for the linked mind.</p>
                </div>
                <button class="btn-primary go-live-btn" onclick="window.App.showStreamSetupModal()" style="white-space: nowrap; padding: 12px 25px;">Go Live</button>
            </div>
            
            <div class="live-now-section animate-fade" style="margin-bottom: 30px;">
                <h3 style="margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
                    <span class="pulse-dot"></span> Live Now
                </h3>
                <div class="live-scroll-container" style="display: flex; gap: 15px; overflow-x: auto; padding-bottom: 10px;">
                    ${liveStreams.length > 0 ? liveStreams.map(l => `
                        <div class="live-card glass-panel" onclick="window.App.joinLiveStream('${l.user_id}', '${l.username}')">
                            <div class="live-avatar">
                                <img src="https://i.pravatar.cc/150?u=${l.user_id}" alt="${l.username}">
                                <span class="live-tag">LIVE</span>
                            </div>
                            <span class="live-username">${l.username}</span>
                        </div>
                    `).join('') : '<p class="text-dim">No one is live yet.</p>'}
                </div>
            </div>

            <div class="vibestream-container">
                ${videos && videos.length > 0 ? videos.map(v => Components.video(v)).join('') : '<p class="text-dim" style="padding:30px; text-align:center;">No videos yet. Go live!</p>'}
            </div>
        `;
    }

    getSyncRoomsHTML(rooms) {
        const getRoomGlow = (userCount = 0) => {
            const intensity = Math.min(userCount / 125, 1); // Normalize to 125 users
            const opacity = 0.2 + (intensity * 0.6);
            const blur = 10 + (intensity * 30);
            return `box-shadow: 0 0 ${blur}px rgba(255, 159, 0, ${opacity}); border-color: rgba(255, 159, 0, ${0.2 + intensity * 0.4});`;
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
                    <div class="room-card glass-panel" style="${getRoomGlow(r.users)}">
                        ${getTimeRemaining(r.expiresAt) ? `<span class="room-timer" style="font-size:0.65rem; color:var(--primary-orange); position:absolute; top:12px; left:12px; text-transform:uppercase; letter-spacing:1px; font-weight:800;">[ ${getTimeRemaining(r.expiresAt)} ]</span>` : ''}
                        <h3 style="margin-top:10px; font-family:var(--font-display);">${r.name || 'Unnamed Room'}</h3>
                        <div style="margin:15px 0; font-size:0.9rem; color:rgba(255,255,255,0.7);">
                            <span style="color:var(--accent-cyan); font-weight:bold;">${r.users || 0}</span> / ${r.maxUsers || 125} Connected
                        </div>
                        <button class="btn-primary" onclick="window.App.joinSyncRoom('${r.id}', '${r.name}')" ${r.users >= (r.maxUsers || 125) ? 'disabled style="opacity:0.5"' : ''} style="width:100%;">
                            ${r.users >= (r.maxUsers || 125) ? 'CAPACITY REACHED' : 'SYNC IN →'}
                        </button>
                    </div>
                `).join('') : '<p class="text-dim" style="padding:20px; text-align:center;">No active rooms. Create one!</p>'}
            </div>
            <div id="active-chat-container" class="hidden" style="height: calc(100vh - 120px); display: flex; flex-direction: column;">
                <div class="view-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; padding:0 10px;">
                    <button class="btn-secondary" onclick="window.App.leaveSyncRoom()" style="padding: 8px 15px; font-size:0.85rem;">← EXIT SYNC</button>
                    <div style="text-align:center;">
                        <h1 class="view-title" id="active-room-name" style="font-size:1.1rem; margin:0;"></h1>
                        <span id="typing-status" class="text-dim" style="font-size:0.7rem; height:12px; display:block;"></span>
                    </div>
                    <button class="btn-secondary" onclick="window.App.toggleChatSidebar()" style="padding: 8px 15px; font-size:0.85rem;">USERS 👥</button>
                </div>
                
                <div style="flex: 1; display: flex; gap: 15px; overflow: hidden; position: relative;">
                    <!-- Chat Area -->
                    <div class="chat-main-area" style="flex: 1; display: flex; flex-direction: column; glass-panel; overflow: hidden;">
                        <div class="chat-messages" id="chat-messages" style="flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap:12px;"></div>
                        
                        <div class="chat-input-area glass-panel" style="padding: 15px; display: flex; gap: 10px; border-top: 1px solid rgba(255,255,255,0.05); margin-top:10px;">
                            <input type="text" id="chat-message-input" class="login-input" placeholder="Broadcast to neural link..." style="flex: 1; background: rgba(0,0,0,0.3);" onkeypress="if(event.key==='Enter')window.App.sendChatMessage()" oninput="window.App.handleTyping()">
                            <button class="btn-primary" onclick="window.App.sendChatMessage()" style="padding: 0 25px;">SEND</button>
                        </div>
                    </div>

                    <!-- Collapsible Sidebar -->
                    <div id="chat-sidebar" class="glass-panel" style="width: 250px; display: none; flex-direction: column; padding: 20px; border-left: 1px solid rgba(0, 242, 255, 0.2); position: absolute; right: 0; top: 0; bottom: 0; z-index: 10;">
                        <h3 style="font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 20px; color: var(--accent-cyan);">Sync Participants</h3>
                        <div id="user-list" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 10px;">
                            <!-- Users will be populated here -->
                        </div>
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

        // Subscribe to realtime room updates (counts)
        this.services.chat.subscribeToRoomUpdates(roomId, (room) => {
            const countEl = document.querySelector('#active-chat-container .view-header h1 span');
            if (countEl) countEl.innerText = ` (${room.current_user_count} / ${room.max_users})`;
        });

        // Subscribe to realtime messages
        this.services.chat.subscribeToRoomMessages(roomId, (message) => {
            if (message.type === 'reaction') {
                this.appendChatReaction(message.message_id, message.content);
            } else if (message.type === 'typing') {
                this.setTypingStatus(message.username, true);
            } else {
                this.appendChatMessage({
                    user: message.username,
                    text: message.content,
                    time: 'now'
                });
            }
        });

        // Update User List Sidebar
        this.updateUserList(roomId);
    }

    async updateUserList(roomId) {
        const userListEl = document.getElementById('user-list');
        if (!userListEl) return;

        const users = await this.services.chat.getRoomUsers(roomId);
        userListEl.innerHTML = users.map(u => `
            <div class="glass-panel" style="padding: 10px; display: flex; align-items: center; gap: 10px; font-size: 0.85rem; border: none; background: rgba(255,255,255,0.03);">
                <div style="width: 8px; height: 8px; border-radius: 50%; background: var(--accent-neon-green); box-shadow: 0 0 5px var(--accent-neon-green);"></div>
                <span style="color: rgba(255,255,255,0.8);">${u.username}</span>
            </div>
        `).join('');
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

    playVibe(el, url, type) {
        // Remove pulsing from all other vibes
        document.querySelectorAll('.vibe-pulsing').forEach(p => p.classList.remove('vibe-pulsing'));
        
        // Add pulse to this one
        el.classList.add('vibe-pulsing');
        
        if (type === 'audio') {
            const audio = new Audio(url);
            audio.onended = () => el.classList.remove('vibe-pulsing');
            audio.play();
        } else {
            el.play();
            el.onended = () => el.classList.remove('vibe-pulsing');
        }
    }

    toggleChatSidebar() {
        const sidebar = document.getElementById('chat-sidebar');
        if (sidebar) {
            sidebar.style.display = sidebar.style.display === 'none' ? 'flex' : 'none';
        }
    }

    appendChatMessage(message) {
        const chat = document.getElementById('chat-messages');
        if (!chat) return;
        
        const msgId = 'msg_' + Date.now();
        const isOwn = State.user && message.user === State.user.username;
        
        const msgHTML = `
            <div id="${msgId}" class="chat-msg-bubble animate-fade" style="
                max-width: 85%;
                margin-bottom: 8px;
                padding: 12px 16px;
                border-radius: 18px;
                align-self: ${isOwn ? 'flex-end' : 'flex-start'};
                background: ${isOwn ? 'rgba(157, 80, 187, 0.2)' : 'rgba(255,255,255,0.05)'};
                border: 1px solid ${isOwn ? 'rgba(157, 80, 187, 0.4)' : 'rgba(255,255,255,0.1)'};
                position: relative;
                cursor: context-menu;
            " oncontextmenu="window.App.showChatContextMenu('${msgId}', event); return false;">
                <div style="font-size: 0.75rem; font-weight: 800; color: ${isOwn ? 'var(--primary-purple)' : 'var(--accent-cyan)'}; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">
                    ${message.user}
                </div>
                <div style="color: rgba(255,255,255,0.9); line-height: 1.4; word-break: break-word;">${message.text}</div>
                <div class="msg-reactions" style="display:flex; flex-wrap: wrap; gap:5px; margin-top:6px;"></div>
                <button onclick="window.App.showChatReactionPicker('${msgId}')" style="position: absolute; ${isOwn ? 'left: -30px' : 'right: -30px'}; top: 50%; transform: translateY(-50%); background:none; border:none; cursor:pointer; font-size:1rem; opacity:0.3; transition: opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.3'">➕</button>
            </div>
        `;
        
        chat.innerHTML += msgHTML;
        chat.scrollTop = chat.scrollHeight;
    }

    showChatContextMenu(msgId, event) {
        event.preventDefault();
        const existing = document.getElementById('chat-context-menu');
        if (existing) existing.remove();

        const menu = document.createElement('div');
        menu.id = 'chat-context-menu';
        menu.className = 'glass-panel hud-border animate-fade';
        menu.style.cssText = `
            position: fixed;
            top: ${event.clientY}px;
            left: ${event.clientX}px;
            z-index: 10000;
            padding: 8px;
            min-width: 140px;
            background: rgba(10, 10, 15, 0.95);
            box-shadow: 0 0 20px rgba(0,0,0,0.8);
        `;

        menu.innerHTML = `
            <div class="menu-item" style="padding: 10px; cursor: pointer; border-radius: 6px; hover:background:rgba(255,255,255,0.1);" onclick="window.App.showToast('Profile view coming soon...')">👤 View Profile</div>
            <div class="menu-item" style="padding: 10px; cursor: pointer; border-radius: 6px; hover:background:rgba(255,255,255,0.1);" onclick="window.App.showChatReactionPicker('${msgId}')">😀 React</div>
            <div class="menu-item" style="padding: 10px; cursor: pointer; border-radius: 6px; hover:background:rgba(255,255,255,0.1); color: #ef4444;" onclick="window.App.showToast('Message reported.')">🚩 Report</div>
        `;

        document.body.appendChild(menu);

        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        setTimeout(() => document.addEventListener('click', closeMenu), 10);
    }

    handleTyping() {
        if (!this.activeRoomId || !State.user) return;
        
        const now = Date.now();
        if (now - (this._lastTypingTime || 0) > 3000) {
            this._lastTypingTime = now;
            this.services.chat.sendRoomMessage(this.activeRoomId, State.user.id, State.user.username, '', 'typing');
        }
    }

    setTypingStatus(user, isTyping) {
        const statusEl = document.getElementById('typing-status');
        if (!statusEl) return;
        
        if (isTyping) {
            statusEl.innerText = `${user} is linking thoughts... ⚡`;
            if (this._typingTimeout) clearTimeout(this._typingTimeout);
            this._typingTimeout = setTimeout(() => statusEl.innerText = '', 4000);
        } else {
            statusEl.innerText = '';
        }
    }



    showChatReactionPicker(msgId) {
        const emojis = ['🔥', '🧠', '🖤', '🌌', '🧬', '💀'];
        const picker = document.createElement('div');
        picker.className = 'glass-panel animate-fade';
        picker.style.cssText = `
            position: absolute;
            bottom: 40px;
            right: 0;
            display: flex;
            gap: 8px;
            padding: 10px;
            z-index: 1000;
            border: 1px solid var(--accent-cyan);
        `;
        
        emojis.forEach(e => {
            const btn = document.createElement('button');
            btn.innerText = e;
            btn.style.cssText = 'background:none; border:none; cursor:pointer; font-size:1.2rem; transition: transform 0.2s;';
            btn.onmouseover = () => btn.style.transform = 'scale(1.3)';
            btn.onmouseout = () => btn.style.transform = 'scale(1)';
            btn.onclick = () => {
                this.sendChatReaction(msgId, e);
                picker.remove();
            };
            picker.appendChild(btn);
        });
        
        const msg = document.getElementById(msgId);
        if (msg) msg.appendChild(picker);
        
        // Auto-close picker on outside click
        setTimeout(() => {
            const closer = (e) => {
                if (!picker.contains(e.target)) {
                    picker.remove();
                    document.removeEventListener('click', closer);
                }
            };
            document.addEventListener('click', closer);
        }, 100);
    }

    async sendChatReaction(msgId, emoji) {
        // Optimistic UI update
        this.appendChatReaction(msgId, emoji);
        
        // Broadcast via Realtime
        if (this.activeRoomId) {
            await this.services.chat.sendRoomMessage(this.activeRoomId, State.user?.id, State.user?.username, emoji, 'reaction', msgId);
        }
    }

    appendChatReaction(msgId, emoji) {
        const msg = document.getElementById(msgId);
        if (!msg) return;
        const container = msg.querySelector('.msg-reactions');
        if (!container) return;

        const existing = Array.from(container.children).find(c => c.dataset.emoji === emoji);
        
        // Animated Popup Effect
        const popup = document.createElement('div');
        popup.innerText = emoji;
        popup.style.cssText = `
            position: absolute;
            top: 0;
            left: 50%;
            transform: translateX(-50%);
            font-size: 2rem;
            pointer-events: none;
            animation: reactionPop 0.8s cubic-bezier(0.17, 0.67, 0.83, 0.67) forwards;
            z-index: 100;
        `;
        msg.appendChild(popup);
        setTimeout(() => popup.remove(), 800);

        if (existing) {
            const count = parseInt(existing.dataset.count) + 1;
            existing.dataset.count = count;
            existing.innerText = `${emoji} ${count}`;
            existing.style.animation = 'none';
            existing.offsetHeight; // trigger reflow
            existing.style.animation = 'reactionPulse 0.3s ease';
        } else {
            const el = document.createElement('span');
            el.dataset.emoji = emoji;
            el.dataset.count = 1;
            el.innerText = `${emoji} 1`;
            el.style.cssText = `
                background: rgba(255,255,255,0.08);
                padding: 2px 8px;
                border-radius: 10px;
                font-size: 0.8rem;
                cursor: pointer;
                border: 1px solid rgba(255,255,255,0.1);
                animation: reactionPulse 0.3s ease;
            `;
            el.onclick = () => window.App.sendChatReaction(msgId, emoji);
            container.appendChild(el);
        }
    }

    async getProfileHTML(user, userPosts = [], friendStatus = 'none', top8Data = [], vibeMatchScore = 100) {
        if (!user) return `
            <div class="auth-required glass-panel" style="padding:40px; text-align:center;">
                <h2>Identify Your Vibe</h2>
                <p>Login to view your link state.</p>
                <button class="btn-primary" onclick="window.App.navigate('login')" style="margin-top:20px;">Login / Register</button>
            </div>
        `;
        
        // Ensure user defaults for safe rendering
        const displayName = user.displayName || user.name || 'User';
        const username = user.username || user.handle || 'username';
        const avatar = user.profilePhoto || user.avatar_url || 'https://i.pravatar.cc/150';
        const banner = user.bannerImage || user.banner_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200';
        const bio = user.bio || 'Welcome to my Vibe.';
        
        const isOwnProfile = State.user && user.id === State.user.id;
        
        let friendButtonHTML = '';
        if (!isOwnProfile && State.user) {
            if (friendStatus === 'friends') {
                friendButtonHTML = `<button class="btn-secondary" style="border-color:var(--primary-orange); color:var(--primary-orange);" onclick="window.App.handleRemoveFriend('${user.id}')">✓ Friends</button>`;
            } else if (friendStatus === 'pending') {
                friendButtonHTML = `<button class="btn-secondary" style="opacity:0.7;" disabled>Request Sent</button>`;
            } else if (friendStatus === 'requested') {
                friendButtonHTML = `
                    <button class="btn-primary" style="background:var(--accent-neon-green);" onclick="window.App.handleAcceptFriend('${user.id}')">Accept</button>
                    <button class="btn-secondary" onclick="window.App.handleRejectFriend('${user.id}')">Decline</button>
                `;
            } else {
                friendButtonHTML = `<button class="btn-primary" onclick="window.App.handleAddFriend('${user.id}')">Add Friend</button>`;
            }
        }

        let musicPlayerHTML = '';
        if (user.songLink) {
            if (user.songLink.includes('spotify.com') || user.songLink.includes('soundcloud.com')) {
                musicPlayerHTML = `<div style="margin-top:15px; width:100%; max-width:400px; margin-left:auto; margin-right:auto;"><iframe src="${user.songLink}" width="100%" height="80" frameborder="0" allowtransparency="true" allow="encrypted-media; autoplay"></iframe></div>`;
            } else {
                musicPlayerHTML = `<audio id="profile-audio-player" src="${user.songLink}" autoplay loop style="display:none;"></audio>`;
            }
        }
        
        return `
            <div class="profile-container">
                <div class="profile-banner">
                    <img src="${banner}" alt="Banner">
                </div>
                <div class="profile-content">
                    <div class="profile-header">
                        <img src="${avatar}" class="profile-avatar" alt="${displayName}">
                        <div class="profile-info" style="text-align:center;">
                            <h1 class="view-title" style="margin-bottom:0;">${displayName}</h1>
                            <p class="handle" style="margin-top:2px;">@${username}</p>
                            <p class="bio" style="margin-top:10px;">${bio}</p>
                            
                            ${user.songLink ? `
                            <div style="margin-top:10px; display:inline-flex; align-items:center; gap:8px; background:rgba(255,255,255,0.05); padding:6px 15px; border-radius:30px; border:1px solid var(--border-light);">
                                <span>🎵</span>
                                <a href="${user.songLink}" target="_blank" style="color:var(--accent-cyan); text-decoration:none; font-size:0.9rem; font-weight:600;">Vibe Track</a>
                            </div>
                            ` : ''}
                            
                            ${musicPlayerHTML}

                            <div class="profile-badges" style="justify-content:center; margin-top:15px;">
                                ${this.generateBadges(user)}
                            </div>
                        </div>
                        ${isOwnProfile ? 
                            `<button class="btn-secondary" onclick="window.App.showEditProfileModal()" style="margin: 20px auto 0;">Edit Profile</button>` : 
                            `<div style="display:flex; gap:10px; margin-top:20px; justify-content:center; align-items:center;">
                                ${friendButtonHTML}
                                <button class="btn-primary" onclick="window.App.boostVibe('${user.id}')" style="background:var(--primary-purple);">Boost ✨</button>
                                <button class="btn-secondary" onclick="window.App.navigate('messages')">Message</button>
                             </div>`
                        }
                    </div>
                    <div class="profile-stats glass-panel">
                        <div class="stat-item"><span class="stat-value">${(user.followersCount || 0).toLocaleString()}</span><span class="stat-label">Followers</span></div>
                        <div class="stat-item"><span class="stat-value">${(user.followingCount || 0).toLocaleString()}</span><span class="stat-label">Following</span></div>
                        <div class="stat-item"><span class="stat-value">${(user.postCount || 0).toLocaleString()}</span><span class="stat-label">Posts</span></div>
                        ${!isOwnProfile && window.State.user ? `<div class="stat-item"><span class="stat-value" style="color:${vibeMatchScore >= 80 ? 'var(--accent-neon-green)' : vibeMatchScore >= 50 ? 'var(--primary-orange)' : 'var(--accent-pink)'}">${vibeMatchScore}%</span><span class="stat-label">Vibe Match</span></div>` : ''}
                        <div class="stat-item"><span class="stat-value" id="vibe-boost-count">${(user.vibeBoosts || 0).toLocaleString()}</span><span class="stat-label">Vibe Level</span></div>
                    </div>
                    
                    <div class="top-vibes-section" style="margin-top:30px;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <h3 class="section-title">⭐ Top 8 Vibes</h3>
                            ${isOwnProfile ? `<button class="btn-secondary btn-sm" onclick="window.App.showTop8Modal()">Edit Top 8</button>` : ''}
                        </div>
                        <div class="top-vibes-grid" style="display:grid; grid-template-columns: repeat(4, 1fr); gap:10px; margin-top:15px;">
                            ${Array(8).fill(0).map((_, i) => {
                                const friend = top8Data[i];
                                if (friend) {
                                    return `
                                    <div class="vibe-img-card" style="text-align:center; cursor:pointer;" onclick="window.App.viewUserProfile('${friend.id}', '${friend.username}')">
                                        <img src="${friend.avatar_url || 'https://i.pravatar.cc/150'}" loading="lazy" style="width:100%; aspect-ratio:1; border-radius:12px; object-fit:cover; border:2px solid var(--accent-cyan);">
                                        <div style="font-size:0.75rem; margin-top:5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${friend.name || friend.username}</div>
                                    </div>`;
                                } else {
                                    return `
                                    <div class="vibe-img-card empty-top8" style="text-align:center; opacity:0.5; ${isOwnProfile ? 'cursor:pointer;' : ''}" ${isOwnProfile ? 'onclick="window.App.showTop8Modal()"' : ''}>
                                        <div style="width:100%; aspect-ratio:1; border-radius:12px; background:rgba(255,255,255,0.05); border:2px dashed rgba(255,255,255,0.2); display:flex; align-items:center; justify-content:center; font-size:1.5rem; color:rgba(255,255,255,0.3);">+</div>
                                        <div style="font-size:0.75rem; margin-top:5px; color:var(--text-dim);">Open</div>
                                    </div>`;
                                }
                            }).join('')}
                        </div>
                    </div>

                    <div class="profile-tabs tabs" style="margin-top:30px;">
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

        // Clean up any existing edit modal
        const existing = document.getElementById('edit-profile-modal');
        if (existing) existing.remove();
        
        const modal = document.createElement('div');
        modal.className = 'profile-modal animate-fade';
        modal.id = 'edit-profile-modal';
        // Close on clicking outside the content
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };
        
        modal.innerHTML = `
            <div class="profile-modal-content">
                <span class="profile-close-btn" onclick="document.getElementById('edit-profile-modal').remove()">&times;</span>
                <!-- Banner Preview Area -->
                <div class="edit-banner-area">
                    <img id="preview-banner" src="${user.bannerImage || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200'}" class="edit-banner-img">
                    <div class="edit-banner-overlay">
                        <button type="button" class="edit-upload-btn" onclick="document.getElementById('banner-upload-input').click()">
                            📸 Change Banner
                        </button>
                        <input type="file" id="banner-upload-input" accept="image/*" capture="environment" onchange="window.App.handleProfileUpload(this, 'banner')" style="display:none;">
                    </div>
                </div>
                <div class="edit-profile-body">
                    <!-- Avatar Upload Area -->
                    <div class="edit-avatar-area">
                        <img id="preview-avatar" src="${user.profilePhoto || 'https://i.pravatar.cc/150'}" class="edit-avatar-img">
                        <button type="button" class="edit-avatar-btn" onclick="document.getElementById('avatar-upload-input').click()">
                            📷
                        </button>
                        <input type="file" id="avatar-upload-input" accept="image/*" capture="environment" onchange="window.App.handleProfileUpload(this, 'avatar')" style="display:none;">
                    </div>

                    <div class="edit-fields">
                        <div class="edit-field">
                            <label class="edit-label">Display Name</label>
                            <input type="text" id="edit-display-name" class="edit-input" value="${user.displayName || ''}" placeholder="Your name">
                        </div>
                        <div class="edit-field">
                            <label class="edit-label">Username</label>
                            <input type="text" id="edit-username" class="edit-input" value="${user.username || ''}" placeholder="username">
                        </div>
                        <div class="edit-field">
                            <label class="edit-label">Neural Bio</label>
                            <textarea id="edit-bio" class="edit-input edit-textarea" rows="2" placeholder="Tell the network about your vibe...">${user.bio || ''}</textarea>
                        </div>
                        <div class="edit-field">
                            <label class="edit-label">Vibe Track (Link)</label>
                            <input type="text" id="edit-song" class="edit-input" value="${user.songLink || ''}" placeholder="Spotify / Soundcloud URL">
                        </div>
                    </div>

                    <!-- Hidden inputs for uploaded URLs -->
                    <input type="hidden" id="edit-avatar-url" value="${user.profilePhoto || ''}">
                    <input type="hidden" id="edit-banner-url" value="${user.bannerImage || ''}">

                    <div class="edit-actions">
                        <button class="btn-secondary edit-cancel-btn" onclick="document.getElementById('edit-profile-modal').remove()">Cancel</button>
                        <button class="btn-primary edit-save-btn" id="save-profile-btn" onclick="window.App.saveProfile()">Sync Profile</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    async handleProfileUpload(input, type) {
        const file = input.files[0];
        if (!file) return;

        const previewId = type === 'avatar' ? 'preview-avatar' : 'preview-banner';
        const hiddenInputId = type === 'avatar' ? 'edit-avatar-url' : 'edit-banner-url';
        const previewImg = document.getElementById(previewId);
        const saveBtn = document.getElementById('save-profile-btn');

        if (previewImg) {
            previewImg.style.opacity = '0.5';
            previewImg.style.filter = 'grayscale(1) blur(2px)';
        }
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="spinner-mini"></span> Uploading...';
        }

        try {
            this.showToast(`Uploading ${type}...`, 'info');
            // Folder mapping for ImageKit (avatar or banner)
            const folder = type === 'avatar' ? 'profiles/avatars' : 'profiles/banners';
            const result = await this.services.data.media.uploadImage(file, folder);
            
            if (result && result.url) {
                document.getElementById(hiddenInputId).value = result.url;
                if (previewImg) {
                    previewImg.src = result.url;
                    previewImg.style.opacity = '1';
                    previewImg.style.filter = 'none';
                }
                this.showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} vibe captured! ✨`, 'success');
            } else {
                throw new Error('Upload returned no URL');
            }
        } catch (err) {
            console.error(`${type} upload failed:`, err);
            this.showToast(`Upload failed: ${err.message}`, 'error');
            if (previewImg) {
                previewImg.style.opacity = '1';
                previewImg.style.filter = 'none';
            }
        } finally {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerText = 'Sync Profile';
            }
        }
    }

    async saveProfile() {
        const displayName = document.getElementById('edit-display-name')?.value.trim();
        const username = document.getElementById('edit-username')?.value.trim();
        const bio = document.getElementById('edit-bio')?.value.trim();
        const profilePhoto = document.getElementById('edit-avatar-url')?.value.trim();
        const bannerImage = document.getElementById('edit-banner-url')?.value.trim();
        const songLink = document.getElementById('edit-song')?.value.trim();
        
        if (!displayName || !username) {
            this.showToast('Display name and username are required', 'error');
            return;
        }
        
        const updates = { 
            displayName, 
            username, 
            bio, 
            profilePhoto, 
            bannerImage, 
            songLink 
        };
        
        const saveBtn = document.getElementById('save-profile-btn');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="spinner-mini"></span> Syncing...';
        }

        try {
            console.log('🚀 Initiating Cloud Sync...');
            // Update in AuthService (Supabase + Clerk)
            const updatedUser = await this.services.auth.updateProfile(updates);
            
            if (updatedUser) {
                // Update local global State to match synchronized service state
                State.user = updatedUser;
                
                this.showToast('Global Profile Synced! ✨', 'success');
                
                // Close modal
                document.getElementById('edit-profile-modal')?.remove();
                
                // Refresh view if on profile
                if (State.currentView === 'profile') {
                    this.renderView('profile', false);
                }
            } else {
                throw new Error('Sync returned null user');
            }
        } catch (err) {
            console.error('Profile sync error:', err);
            this.showToast('Sync failed: ' + err.message, 'error');
        } finally {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerText = 'Sync Profile';
            }
        }
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
        
        const vibeBoosts = user.vibeBoosts || 0;
        if (vibeBoosts >= 200) badges.push({ label: 'Vibe Master', class: 'badge-wild' });
        if (vibeBoosts >= 500) badges.push({ label: 'Aura of Light', class: 'badge-heat' });
        
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
                        <input type="email" id="login-email-input" class="login-input" placeholder="Email Address" style="width: 100%; padding: 12px; margin-bottom: 10px; border-radius: 8px; border: 1px solid rgba(255, 165, 0, 0.3); background: rgba(0,0,0,0.3); color: white;" onkeypress="if(event.key==='Enter')window.App.handleCustomSignIn()">
                        <input type="password" id="login-password-input" class="login-input" placeholder="Password" style="width: 100%; padding: 12px; margin-bottom: 10px; border-radius: 8px; border: 1px solid rgba(255, 165, 0, 0.3); background: rgba(0,0,0,0.3); color: white;" onkeypress="if(event.key==='Enter')window.App.handleCustomSignIn()">
                        <button class="login-submit-btn" onclick="window.App.handleCustomSignIn()" style="width: 100%; padding: 12px; border-radius: 8px; border: none; background: linear-gradient(135deg, #ff9f00, #ff6b00); color: white; font-weight: 600; cursor: pointer;">Sign In</button>
                    </div>
                    
                    <!-- Custom Sign Up Form -->
                    <div id="signup-form-fields" style="display: ${!isLogin ? 'block' : 'none'}; margin-bottom: 20px;">
                        <input type="text" id="signup-name-input" class="login-input" placeholder="Full Name" style="width: 100%; padding: 12px; margin-bottom: 10px; border-radius: 8px; border: 1px solid rgba(157, 80, 187, 0.3); background: rgba(0,0,0,0.3); color: white;">
                        <input type="email" id="signup-email-input" class="login-input" placeholder="Email Address" style="width: 100%; padding: 12px; margin-bottom: 10px; border-radius: 8px; border: 1px solid rgba(157, 80, 187, 0.3); background: rgba(0,0,0,0.3); color: white;">
                        <input type="password" id="signup-password-input" class="login-input" placeholder="Password" style="width: 100%; padding: 12px; margin-bottom: 10px; border-radius: 8px; border: 1px solid rgba(157, 80, 187, 0.3); background: rgba(0,0,0,0.3); color: white;">
                        <button class="signup-submit-btn" onclick="window.App.handleCustomSignUp()" style="width: 100%; padding: 12px; border-radius: 8px; border: none; background: linear-gradient(135deg, #9d50bb, #6e48aa); color: white; font-weight: 600; cursor: pointer;">Create Account</button>
                    </div>
                    <div class="login-options" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; color:#aaa; font-size:0.85rem;">
                        <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                            <input type="checkbox" id="remember-me" checked style="accent-color:var(--primary-orange);"> Stay Signed In
                        </label>
                        <a href="https://clerk.com" target="_blank" style="color:var(--primary-orange); text-decoration:none;">Need help?</a>
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

                    <!-- Admin Access Section (Dynamic Synchronization) -->
                    <div class="admin-dropdown-container" style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px; margin-top: 5px;">
                        <button class="admin-dropdown-btn" onclick="const content = this.nextElementSibling; content.style.display = content.style.display === 'block' ? 'none' : 'block';" style="background:transparent; border:none; color:var(--text-dim); cursor:pointer; font-size:0.8rem; width:100%; display:flex; justify-content:center; align-items:center; gap:5px;">
                            <span>🔑</span> Admin Terminal (Auth View)
                        </button>
                        <div class="admin-dropdown-content" style="display:none; margin-top:15px; padding:15px; background:rgba(0,0,0,0.3); border-radius:12px; border:1px solid rgba(157, 80, 187, 0.2);">
                            <input type="text" id="admin-login-email-alt" class="login-input" placeholder="Admin ID" style="margin-bottom:10px; padding:10px; font-size:0.9rem;" onkeypress="if(event.key==='Enter')window.App.handleAdminLogin('alt')">
                            <input type="password" id="admin-login-password-alt" class="login-input" placeholder="Secret Key" style="margin-bottom:10px; padding:10px; font-size:0.9rem;" onkeypress="if(event.key==='Enter')window.App.handleAdminLogin('alt')">
                            <label style="display:flex; align-items:center; gap:8px; margin-top:10px; font-size:0.8rem; color:#aaa;">
                                <input type="checkbox" id="admin-remember-me-alt" checked> Save Connection
                            </label>
                            <button class="login-submit" onclick="console.log('Alt Admin login button clicked!'); window.App.handleAdminLogin('alt')" style="margin-top:15px; width:100%; padding:10px; height:auto; font-size:0.9rem;">🔑 Enter</button>
                        </div>
                    </div>
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
        try {
            const emailInput = document.getElementById('login-email-input');
            const passwordInput = document.getElementById('login-password-input');
            const rememberMe = document.getElementById('remember-me')?.checked ?? true;
            
            const email = emailInput?.value.trim();
            const password = passwordInput?.value.trim();
            
            if (!email || !password) {
                this.showToast('Please enter both email and password', 'error');
                return;
            }
            
            if (!email.includes('@')) {
                 this.showToast('Please enter a valid email address', 'error');
                 return;
            }

            this.showToast('Connecting to consciousness...', 'info');
            const result = await this.services.auth.customSignIn(email, password, rememberMe);
            if (result.success) {
                // AuthService already dispatches event and syncs session
                this.showToast('Welcome back! ✨');
            } else {
                this.showToast(result.error || 'Sign in failed', 'error');
            }
        } catch (err) {
            console.error('Sign in handle error:', err);
            this.showToast('Sign in failed due to a system error', 'error');
        }
    }

    async handleCustomSignUp() {
        try {
            const emailInput = document.getElementById('signup-email-input');
            const passwordInput = document.getElementById('signup-password-input');
            const nameInput = document.getElementById('signup-name-input');
            
            const email = emailInput?.value.trim();
            const password = passwordInput?.value.trim();
            const name = nameInput?.value.trim();
            
            if (!email || !password || !name) {
                this.showToast('Please fill in all fields', 'error');
                return;
            }
            
            if (password.length < 8) {
                 this.showToast('Password must be at least 8 characters long', 'error');
                 return;
            }

            this.showToast('Establishing neural link...', 'info');
            const rememberMe = document.getElementById('remember-me')?.checked ?? true;
            const result = await this.services.auth.customSignUp(email, password, name, rememberMe);
            if (result.success) {
                this.showToast('Account created! Welcome to VibeHub ✨');
                // AuthService already dispatches event but let's be safe
                setTimeout(() => this.navigate('home', true), 500);
            } else {
                this.showToast(result.error || 'Sign up failed', 'error');
            }
        } catch (err) {
            console.error('Sign up handle error:', err);
            this.showToast('Account creation failed due to a system error', 'error');
        }
    }

    async handleAdminLogin(suffix = '') {
        console.log(`🚀 [DEBUG] handleAdminLogin called with suffix: "${suffix}"`);
        const idSuffix = suffix ? `-${suffix}` : '';
        const emailInput = document.getElementById(`admin-login-email${idSuffix}`);
        const passwordInput = document.getElementById(`admin-login-password${idSuffix}`);
        
        console.log(`🔍 [DEBUG] ID searched: admin-login-email${idSuffix}, Found: ${!!emailInput}`);
        console.log(`🔍 [DEBUG] ID searched: admin-login-password${idSuffix}, Found: ${!!passwordInput}`);
        
        const email = emailInput?.value.trim();
        const password = passwordInput?.value.trim();
        
        if (!email || !password) {
            this.showToast('Please enter admin credentials', 'error');
            return;
        }

        const rememberMe = document.getElementById(`admin-remember-me${idSuffix}`)?.checked ?? true;
        this.showToast('Authenticating Admin Terminal...', 'info');
        
        try {
            console.log('📡 Calling AuthService.login...');
            const result = await this.services.auth.login(email, password, true, rememberMe);
            
            if (result?.error === 'use_clerk') {
                this.showToast(result.message, 'error');
                return;
            }
            
            if (result?.error) {
                this.showToast(result.error, 'error');
                return;
            }

            if (!result || result.error) {
                this.showToast('Invalid admin credentials', 'error');
                return;
            }
            
            console.log('✅ Admin login response received:', !!result);
            
            // Note: services.auth.login now dispatches 'user-logged-in' event,
            // which VibeApp listens to (setupClerkListeners) to handle state update,
            // UI transitions, and real-time initialization.
            
        } catch (err) {
            console.error('Admin login handler error:', err);
            this.showToast('System synchronization failure', 'error');
        }
    }

    getCommunitiesHTML(communities) {
        return `
            <div class="view-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap: wrap; gap: 15px;">
                <div style="flex: 1; min-width: 200px;">
                    <h1 class="view-title">Communities</h1>
                    <p class="text-dim">Find your tribe. Link your mind.</p>
                </div>
                <button class="btn-primary" onclick="window.App.showCreateCommunityModal()" style="white-space: nowrap;">+ New Group</button>
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
        if (!userId) {
            this.showToast('User not found', 'error');
            return;
        }

        // If it's the current user, just go to the native profile view
        if (State.user && State.user.id === userId) {
            this.navigate('profile');
            return;
        }
        
        State.currentView = `user-${userId}`;
        const container = document.getElementById('view-container');
        if (container) container.innerHTML = Components.skeletonLoading();
        this.showToast(`Loading ${username}'s vibe...`);
        
        try {
            // Fetch resilient profile 
            const profileUser = await this.services.data.getUserProfile(userId);
            
            if (!profileUser) {
                if (container) {
                    container.innerHTML = `
                        <div class="view-header animate-fade" style="text-align:center; padding:100px 20px;">
                            <h2 style="color:var(--text-dim);">Profile M.I.A.</h2>
                            <p style="margin-top:10px;">The vibe of "@${username || userId}" has vanished or never existed.</p>
                            <button class="btn-secondary" onclick="window.App.navigate('home')" style="margin-top:20px;">Return Pulse</button>
                        </div>
                    `;
                }
                return;
            }

            // Fetch post count separately
            // Check for both exact UUID match and string literal match (for legacy)
            const { count: actualPostCount } = await window.supabaseClient
                .from('posts')
                .select('*', { count: 'exact', head: true })
                .or(`user_id.eq.${profileUser.id},user_id.eq."${profileUser.username}"`);
            
            profileUser.postCount = actualPostCount || 0;
            profileUser.vibeBoosts = profileUser.vibe_likes?.length || 0;
            profileUser.top8Friends = profileUser.top_8_friends || [];
            profileUser.reaction_stats = profileUser.reaction_stats || { given: {}, received: {} };
            profileUser.reactionScore = profileUser.vibe_score || 0;
            
            const userPosts = await this.services.data.getUserPosts(profileUser.id, profileUser.username);
            const friendStatus = State.user ? await this.services.data.getFriendshipStatus(State.user.id, profileUser.id) : 'none';
            const vibeMatchScore = (State.user && State.user.id !== profileUser.id) ? this.services.data.calculateVibeMatch(State.user, profileUser) : 100;
            
            // Resolve top 8 friends details
            let top8Data = [];
            if (profileUser.top8Friends.length > 0) {
                const { data } = await window.supabaseClient.from('users').select('id, username, name, avatar_url, reaction_stats, top_8_friends').in('id', profileUser.top8Friends);
                if (data) top8Data = data;
            }
            
            if (container) {
                container.innerHTML = await this.getProfileHTML(profileUser, userPosts, friendStatus, top8Data, vibeMatchScore);
                this.attachViewEvents();
                window.scrollTo(0, 0);
            }
        } catch (err) {
            console.error('Error viewing profile:', err);
            this.showToast('Vibe check failed', 'error');
        }
    }

    async boostVibe(targetUserId) {
        if (!State.user) {
            this.showToast('Please login to boost vibes!', 'error');
            return;
        }
        
        if (targetUserId === State.user.id) {
            this.showToast('You cannot boost your own vibe!', 'error');
            return;
        }
        
        this.showToast('Boosting vibe... ✨');
        
        const result = await this.services.data.boostUserVibe(targetUserId, State.user.id);
        
        if (result.success) {
            this.showToast(result.action === 'added' ? 'Vibe Boosted! ⚡' : 'Boost Removed', 'success');
            
            // Update counter in UI if visible
            const countEl = document.getElementById('vibe-boost-count');
            if (countEl) {
                let count = parseInt(countEl.innerText) || 0;
                count = result.action === 'added' ? count + 1 : Math.max(0, count - 1);
                countEl.innerText = count.toLocaleString();
            }
            
            // Reaction effect
            this.triggerReactionPopup(window.innerWidth / 2, window.innerHeight / 2, '✨');
        } else {
            this.showToast('Boost failed: ' + result.error, 'error');
        }
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

    getDisclaimerHTML() {
        return `
            <div class="view-header" style="display:flex; justify-content:space-between; align-items:center;">
                <h1 class="view-title">Disclaimer</h1>
                <button class="btn-secondary" onclick="window.App.navigate('home')">← Back</button>
            </div>
            <div class="glass-panel" style="padding:25px; margin-top:20px; line-height:1.6;">
                <p>VibeHub is a real-time interaction platform. We do not endorse or take responsibility for content posted by users.</p>
                <p style="margin-top:15px;">Your psychological safety is your own. Use the reporting tools if you encounter disruptive energy.</p>
                <p style="margin-top:15px;">Features like Sync Rooms and VibeStream rely on live data streams. We are not liable for any data loss or connection interruptions.</p>
            </div>
        `;
    }

    getPrivacyHTML() {
        return `
            <div class="view-header" style="display:flex; justify-content:space-between; align-items:center;">
                <h1 class="view-title">Privacy Policy</h1>
                <button class="btn-secondary" onclick="window.App.navigate('home')">← Back</button>
            </div>
            <div class="glass-panel" style="padding:25px; margin-top:20px; line-height:1.6;">
                <p><strong>Data Linking:</strong> We collect your interaction history (reactions, boosts) to optimize your vibe match and trending visibility.</p>
                <p style="margin-top:15px;"><strong>Media Storage:</strong> Live recorded audio and video responses are stored securely and associated with your link profile.</p>
                <p style="margin-top:15px;"><strong>Third Parties:</strong> We use Supabase and Clerk for identity and data integrity. Your data is never sold to outside advertising entities.</p>
            </div>
        `;
    }

    getBroadcastModeHTML(topic) {
        return `
            <div class="broadcast-mode animate-fade" style="position:relative; height:calc(100vh - 100px); background:#000; border-radius:24px; overflow:hidden;">
                <video id="broadcast-preview" autoplay muted style="width:100%; height:100%; object-fit:cover;"></video>
                
                <div class="broadcast-overlay" style="position:absolute; top:0; left:0; right:0; bottom:0; padding:20px; display:flex; flex-direction:column; justify-content:space-between; background:linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.6) 100%); pointer-events:none;">
                    
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; pointer-events:auto;">
                        <div class="glass-panel" style="padding:10px 20px; border-radius:30px; border:1px solid rgba(239, 68, 68, 0.5); display:flex; align-items:center; gap:10px;">
                            <span class="pulse-dot" style="background:#ef4444;"></span>
                            <span style="font-weight:800; color:#ef4444; letter-spacing:1px;">LIVE</span>
                            <span style="color:white; opacity:0.8;">| ${topic}</span>
                        </div>
                        <button class="btn-secondary" onclick="window.App.stopLiveStream()" style="background:rgba(239, 68, 68, 0.2); border-color:rgba(239, 68, 68, 0.4); color:#fff; border-radius:50%; width:44px; height:44px; display:flex; align-items:center; justify-content:center; padding:0;">✕</button>
                    </div>

                    <div style="display:flex; justify-content:space-between; align-items:flex-end; pointer-events:auto;">
                        <div class="glass-panel" style="padding:10px 15px; border-radius:20px; display:flex; align-items:center; gap:8px;">
                            <span style="font-size:1.2rem;">👥</span>
                            <span id="viewer-count" style="font-weight:bold; color:white;">24</span>
                        </div>
                        
                        <div style="display:flex; gap:10px;">
                            <button class="glass-panel" id="toggle-mic" onclick="window.App.toggleBroadcastMedia('audio')" style="width:50px; height:50px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.2rem; cursor:pointer;">🎤</button>
                            <button class="glass-panel" id="toggle-cam" onclick="window.App.toggleBroadcastMedia('video')" style="width:50px; height:50px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.2rem; cursor:pointer;">📹</button>
                        </div>
                    </div>
                </div>

                <div class="broadcast-interactions glass-panel" style="position:absolute; bottom:80px; left:20px; width:260px; max-height:200px; padding:15px; overflow-y:auto; font-size:0.85rem; background:rgba(0,0,0,0.4); pointer-events:auto;">
                    <div style="margin-bottom:8px;"><strong style="color:var(--accent-cyan);">system_bot:</strong> Neural link established. Enjoy your stream!</div>
                    <div id="stream-comments"></div>
                </div>
            </div>
        `;
    }

    toggleBroadcastMedia(type) {
        if (!this.localStream) return;
        const tracks = type === 'audio' ? this.localStream.getAudioTracks() : this.localStream.getVideoTracks();
        tracks.forEach(t => t.enabled = !t.enabled);
        
        const btn = document.getElementById(type === 'audio' ? 'toggle-mic' : 'toggle-cam');
        if (btn) {
            btn.style.background = tracks[0].enabled ? '' : 'rgba(239, 68, 68, 0.3)';
            btn.style.borderColor = tracks[0].enabled ? '' : 'rgba(239, 68, 68, 0.6)';
        }
        this.showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} ${tracks[0].enabled ? 'ON' : 'OFF'}`);
    }

    async stopLiveStream() {
        if (confirm("End your live session?")) {
            if (this.localStream) {
                this.localStream.getTracks().forEach(t => t.stop());
                this.localStream = null;
            }
            if (this._viewerInterval) clearInterval(this._viewerInterval);
            
            await this.services.video.endLive(State.user?.id);
            this.showToast('VibeStream Ended.');
            this.togglePostButton(true);
            this.navigate('vibestream', true);
        }
    }


    getAdminHTML(stats) {
        return `
            <div class="view-header animate-fade">
                <h1 class="view-title" style="background: linear-gradient(135deg, var(--accent-pink), var(--accent-cyan)); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Admin Portal</h1>
                <p class="text-dim">Unified Control Center for reality management.</p>
            </div>

            <div class="tabs scrollable-tabs" style="margin-bottom: 25px;">
                <button class="tab active" data-admin-tab="stats" onclick="window.App.switchAdminTab('stats')">📊 Stats</button>
                <button class="tab" data-admin-tab="moderation" onclick="window.App.switchAdminTab('moderation')">🛡️ Moderation</button>
                <button class="tab" data-admin-tab="ads" onclick="window.App.switchAdminTab('ads')">💰 Ad Manager</button>
                <button class="tab" data-admin-tab="neural" onclick="window.App.switchAdminTab('neural')">🧠 Neural Merge</button>
            </div>

            <div id="admin-tab-content">
                <!-- Content injected here by switchAdminTab -->
                <div id="admin-stats-view" class="admin-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px;">
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
                        <h3 class="text-dim">Platform Revenue</h3>
                        <p style="font-size: 2.5rem; font-weight:800; color: var(--accent-pink);">${stats?.revenue || '$0.00'}</p>
                    </div>
                </div>
            </div>
        `;
    }

    async switchAdminTab(tabId) {
        const container = document.getElementById('admin-tab-content');
        if (!container) return;

        // Update Tab Highlighting
        document.querySelectorAll('[data-admin-tab]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.adminTab === tabId);
        });

        switch(tabId) {
            case 'stats':
                const stats = await this.services.admin.getStats();
                container.innerHTML = `
                    <div class="admin-grid animate-slide-up" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px;">
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
                `;
                break;
            case 'moderation':
                container.innerHTML = `<div class="glass-panel animate-fade" style="padding:24px;"><p class="text-dim">Fetching reported vibrations...</p></div>`;
                const reports = await this.services.admin.getReportedPosts();
                container.innerHTML = `
                    <div class="moderation-view animate-slide-up">
                        <h3 style="margin-bottom:20px; color:var(--accent-pink);">Pending Reports</h3>
                        ${reports.length > 0 ? reports.map(r => `
                            <div class="glass-panel" style="padding:20px; margin-bottom:15px; border-left:4px solid var(--accent-pink);">
                                <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                                    <span style="font-weight:bold; color:var(--accent-cyan);">@${r.post?.username || 'unknown'}</span>
                                    <span class="text-dim" style="font-size:0.8rem;">Reason: ${r.reason}</span>
                                </div>
                                <p style="margin-bottom:15px;">"${r.post?.text || '[Media Content]'}"</p>
                                <div style="display:flex; gap:10px;">
                                    <button class="btn-secondary btn-sm" onclick="window.App.handleDeletePost('${r.post_id}')">🗑️ Delete</button>
                                    <button class="btn-secondary btn-sm" style="color:var(--accent-pink); border-color:var(--accent-pink);" onclick="window.App.handleBanUser('${r.post?.username}')">🚫 Ban User</button>
                                </div>
                            </div>
                        `).join('') : '<div class="glass-panel" style="padding:40px; text-align:center;"><p class="text-dim">No vibes reported. Good job!</p></div>'}
                    </div>
                `;
                break;
            case 'ads':
                container.innerHTML = `
                    <div class="ad-manager glass-panel animate-slide-up" style="padding:24px;">
                        <h3 style="margin-bottom:20px; color:var(--primary-orange);">Create Sponsored Vibe</h3>
                        <div style="display:flex; flex-direction:column; gap:15px;">
                            <div>
                                <label class="text-dim" style="font-size:0.8rem; display:block; margin-bottom:5px;">Ad Content / Message</label>
                                <textarea id="ad-content" class="login-input" placeholder="What should people see?"></textarea>
                            </div>
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px;">
                                <div>
                                    <label class="text-dim" style="font-size:0.8rem; display:block; margin-bottom:5px;">Media URL (Image/Video)</label>
                                    <input type="text" id="ad-media" class="login-input" placeholder="https://...">
                                </div>
                                <div>
                                    <label class="text-dim" style="font-size:0.8rem; display:block; margin-bottom:5px;">Target Destination URL</label>
                                    <input type="text" id="ad-link" class="login-input" placeholder="https://...">
                                </div>
                            </div>
                            <button class="btn-primary" onclick="window.App.submitAdPost()" style="margin-top:10px;">🚀 Launch Campaign</button>
                        </div>
                    </div>
                `;
                break;
            case 'neural':
                container.innerHTML = `
                    <div class="neural-merge glass-panel animate-slide-up" style="padding:24px; border-color:var(--primary-purple);">
                        <h3 style="margin-bottom:20px; color:var(--primary-purple);">Neural Data Sync</h3>
                        <p class="text-dim" style="margin-bottom:20px;">Link legacy admin vibrations (<code>yamasseetechnology@gmail.com</code>) to your unified identity (<code>KingKool23</code>). This process is irreversible.</p>
                        <div style="display:flex; flex-direction:column; gap:15px; max-width:400px;">
                            <input type="text" id="merge-legacy-email" class="login-input" value="yamasseetechnology@gmail.com" placeholder="Legacy Email">
                            <button class="btn-primary" style="background:var(--primary-purple);" onclick="window.App.triggerNeuralMerge()">⚡ Execute Merge</button>
                        </div>
                    </div>
                `;
                break;
        }
    }

    async triggerNeuralMerge() {
        const legacyEmail = document.getElementById('merge-legacy-email')?.value?.trim();
        if (!legacyEmail) {
            this.showToast('Legacy email required', 'error');
            return;
        }

        if (!confirm(`Warning: This will reassign all legacy vibes from ${legacyEmail} to KingKool23. Proceed?`)) return;

        this.showToast('Initiating Neural Merge...', 'info');
        try {
            const result = await this.services.admin.mergeAdminData(legacyEmail, 'KingKool23');
            if (result.success) {
                this.showToast(`Success! ${result.mergedPosts} vibes merged into reality. ✨`, 'success');
            }
        } catch (err) {
            this.showToast(`Merge Failed: ${err.message}`, 'error');
        }
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

    async handleReaction(postId, type) {
        if (!State.user) {
            this.showToast('Login to vibe!', 'info');
            return;
        }

        // --- Premium Animation ---
        const popup = document.createElement('div');
        const emojiMap = { cap: '🧢', wild: '🤯', like: '👍', dislike: '👎', heat: '🔥', admire: '🙏' };
        popup.innerHTML = emojiMap[type] || '✨';
        popup.style.cssText = `
            position: fixed;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%) scale(0.1);
            font-size: 100px;
            z-index: 10000;
            transition: all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.4);
            opacity: 0;
            pointer-events: none;
            filter: drop-shadow(0 0 30px rgba(157, 80, 187, 0.8));
        `;
        document.body.appendChild(popup);
        
        requestAnimationFrame(() => {
            popup.style.transform = 'translate(-50%, -50%) scale(5.5)';
            popup.style.opacity = '1';
        });

        setTimeout(() => {
            popup.style.transform = 'translate(-50%, -50%) scale(6.5)';
            popup.style.opacity = '0';
            setTimeout(() => popup.remove(), 600);
        }, 500);
        // --- End Animation ---

        // Spawn dramatic floating reaction animation
        const labelMap = { cap: 'CAP!', wild: 'WILD!', like: 'LIKED!', dislike: 'NAH!', heat: 'HEAT!', admire: 'RESPECT!' };
        const postCard = document.querySelector(`[data-id="${postId}"]`);
        if (postCard) {
            const btn = postCard.querySelector(`[data-type="${type}"]`);
            const rect = btn ? btn.getBoundingClientRect() : postCard.getBoundingClientRect();
            const floater = document.createElement('div');
            floater.className = 'reaction-pop';
            floater.innerHTML = `<span>${emojiMap[type] || '✨'}</span><span class="floating-reaction-text">${labelMap[type] || type.toUpperCase()}</span>`;
            floater.style.left = `${rect.left + rect.width / 2 - 20 + (Math.random() * 40 - 20)}px`;
            floater.style.top = `${rect.top + window.scrollY - 10}px`;
            document.body.appendChild(floater);
            setTimeout(() => floater.remove(), 1700);
        }

        const result = await this.services.data.addReaction(postId, State.user.id, type);
        if (result.success) {
            // Optimistically update the counter in the DOM
            if (postCard) {
                const btn = postCard.querySelector(`[data-type="${type}"] span`);
                if (btn) {
                    const currentCount = parseInt(btn.textContent || 0);
                    const isRemoving = btn.parentElement.classList.contains('active');
                    btn.textContent = isRemoving ? Math.max(0, currentCount - 1) : currentCount + 1;
                    btn.parentElement.classList.toggle('active');
                }
            }
        }
    }

    async handleDoubleTapReaction(postId, event) {
        if (!State.user) return;
        
        // Show animation
        const container = event.currentTarget;
        const heart = container.querySelector('.double-tap-heart');
        if (heart) {
            heart.classList.remove('animate');
            void heart.offsetWidth; // Trigger reflow
            heart.classList.add('animate');
        }

        // Trigger Heat vibe
        await this.handleReaction(postId, 'heat');
    }



    async handleFollow(targetUserId) {
        if (!State.user) {
            this.showToast('Login to follow!', 'info');
            return;
        }
        
        const result = await this.services.data.toggleFollow(targetUserId, State.user.id);
        if (result.success) {
            this.showToast(result.isFollowing ? 'Following!' : 'Unfollowed');
            // Refresh current view to update buttons
            this.renderView(State.currentView);
        } else {
            this.showToast(result.error || 'Failed to follow', 'error');
        }
    }

    toggleReactionPicker(postId, event) {
        event.stopPropagation();
        // Simple implementation: show a small overlay with more options
        const pickerHtml = `
            <div class="glass-panel reaction-picker animate-fade" style="position:fixed; top:${event.clientY - 60}px; left:${event.clientX - 50}px; display:flex; gap:10px; padding:10px; z-index:1000;">
                <button onclick="window.App.handleReaction('${postId}', 'admire'); this.parentElement.remove()">✨</button>
                <button onclick="window.App.handleReaction('${postId}', 'wild'); this.parentElement.remove()">🦁</button>
                <button onclick="window.App.handleReaction('${postId}', 'cap'); this.parentElement.remove()">🧢</button>
                <button onclick="window.App.handleReaction('${postId}', 'relate'); this.parentElement.remove()">🙏</button>
            </div>
        `;
        const picker = document.createElement('div');
        picker.innerHTML = pickerHtml;
        document.body.appendChild(picker.firstElementChild);
        
        // Close on click anywhere else
        const closePicker = () => {
            const p = document.querySelector('.reaction-picker');
            if (p) p.remove();
            document.removeEventListener('click', closePicker);
        };
        setTimeout(() => document.addEventListener('click', closePicker), 10);
    }

    async sharePost(postId) {
        const url = `${window.location.origin}/#post/${postId}`;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Check out this Vibe on VibeHub',
                    url: url
                });
            } catch (err) {
                console.log('Share failed:', err);
            }
        } else {
            await navigator.clipboard.writeText(url);
            this.showToast('Vibe link copied to clipboard! ⤴️');
        }
    }

    async handleAddFriend(userId) {
        if (!State.user) return this.showToast('Login to add friends!', 'info');
        const success = await this.services.data.sendFriendRequest(State.user.id, userId);
        if (success) {
            this.showToast('Friend request sent! 🤝');
            this.renderView(`user-${userId}`); // Refresh profile
        } else {
            this.showToast('Failed to send request.', 'error');
        }
    }

    async handleAcceptFriend(userId) {
        if (!State.user) return;
        const success = await this.services.data.respondToFriendRequest(State.user.id, userId, true);
        if (success) {
            this.showToast('Friend request accepted! ⚡');
            this.renderView(`user-${userId}`);
        } else {
            this.showToast('Failed to accept request.', 'error');
        }
    }

    async handleRejectFriend(userId) {
        if (!State.user) return;
        const success = await this.services.data.respondToFriendRequest(State.user.id, userId, false);
        if (success) {
            this.showToast('Friend request declined.');
            this.renderView(`user-${userId}`);
        } else {
            this.showToast('Failed to decline request.', 'error');
        }
    }

    async handleRemoveFriend(userId) {
        if (!State.user) return;
        if (!confirm('Are you sure you want to completely sever this link?')) return;
        const success = await this.services.data.removeFriend(State.user.id, userId);
        if (success) {
            this.showToast('Friend link severed.');
            this.renderView(`user-${userId}`);
        } else {
            this.showToast('Failed to remove friend.', 'error');
        }
    }

    async showTop8Modal() {
        if (!State.user) return;
        
        // Fetch all friends
        const friends = await this.services.data.getFriends(State.user.id);
        const currentTop8 = State.user.top_8_friends || [];
        
        // Build selection modal
        const modal = document.createElement('div');
        modal.className = 'modal-overlay top8-modal';
        modal.id = 'top8-picker-modal';
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; display:flex; justify-content:center; align-items:center; z-index:9000; background:rgba(0,0,0,0.8); backdrop-filter:blur(5px);';
        
        // We will maintain local state for picker
        window._tempTop8Selection = [...currentTop8];
        window.App._renderTop8PickerList = () => {
            const listContainer = document.getElementById('top8-friends-list');
            if (!listContainer) return;
            
            if (friends.length === 0) {
                listContainer.innerHTML = '<p class="text-dim" style="text-align:center; padding:40px;">You need to accept or add friends before selecting your Top 8!</p>';
                return;
            }
            
            listContainer.innerHTML = friends.map(f => {
                const isSelected = window._tempTop8Selection.includes(f.id);
                return `
                    <div class="glass-panel" style="display:flex; justify-content:space-between; align-items:center; padding:10px 15px; margin-bottom:10px; cursor:pointer; transition:all 0.3s; ${isSelected ? 'border-color:var(--accent-cyan); background:rgba(0,242,255,0.1);' : ''}" onclick="window.App._toggleTop8Selection('${f.id}')">
                        <div style="display:flex; align-items:center; gap:15px;">
                            <img src="${f.avatar}" style="width:40px; height:40px; border-radius:50%; object-fit:cover;">
                            <span>${f.displayName}</span>
                        </div>
                        <div style="font-size:1.5rem; color:${isSelected ? 'var(--accent-cyan)' : 'var(--text-dim)'}">${isSelected ? '✓' : '+'}</div>
                    </div>
                `;
            }).join('');
            
            document.getElementById('top8-count-display').innerText = `${window._tempTop8Selection.length} / 8`;
        };
        
        window.App._toggleTop8Selection = (friendId) => {
            const idx = window._tempTop8Selection.indexOf(friendId);
            if (idx > -1) {
                window._tempTop8Selection.splice(idx, 1);
            } else {
                if (window._tempTop8Selection.length >= 8) {
                    window.App.showToast('You can only select up to 8 vibes at once!', 'error');
                    return;
                }
                window._tempTop8Selection.push(friendId);
            }
            window.App._renderTop8PickerList();
        };

        window.App._saveTop8Selection = async () => {
            window.App.showToast('Saving Top 8...');
            const success = await window.App.services.data.updateTop8(State.user.id, window._tempTop8Selection);
            if (success) {
                window.App.showToast('Top 8 updated! 🌟', 'success');
                document.getElementById('top8-picker-modal').remove();
                window.App.renderView('profile'); // re-render profile to show new top 8 grid
            } else {
                window.App.showToast('Failed to save Top 8', 'error');
            }
        };

        modal.innerHTML = `
            <div class="glass-panel" style="width:90%; max-width:500px; max-height:80vh; display:flex; flex-direction:column; padding:0; overflow:hidden;">
                <div style="padding:20px; border-bottom:1px solid rgba(255,255,255,0.1); display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.5);">
                    <h2 style="margin:0; font-family:var(--font-display); color:var(--primary-orange);">Select Top 8</h2>
                    <span id="top8-count-display" style="font-weight:bold; color:var(--accent-cyan);">0 / 8</span>
                </div>
                <div id="top8-friends-list" style="padding:20px; overflow-y:auto; flex:1;"></div>
                <div style="padding:20px; border-top:1px solid rgba(255,255,255,0.1); display:flex; justify-content:flex-end; gap:10px; background:rgba(0,0,0,0.5);">
                    <button class="btn-secondary" onclick="document.getElementById('top8-picker-modal').remove()">Cancel</button>
                    <button class="btn-primary" onclick="window.App._saveTop8Selection()">Save Preferences</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        window.App._renderTop8PickerList();
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