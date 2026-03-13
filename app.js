/**
 * VIBEHUB CORE ENGINE
 * Futuristic Social Media Framework
 * Prepared for Supabase Integration
 */
import { AuthService, DataService, VideoService, ChatService, AdminService } from './services.js';
import { Components, Views } from './components.js';

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
window.State = State;

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
            this.setupAuthListeners();

            const authPromise = this.services.auth.initAuth();
            
            let progress = 0;
            const timerFill = document.getElementById('timer-fill');
            const progressInterval = setInterval(() => {
                progress += Math.random() * 8;
                if (progress > 90) progress = 90;
                if (timerFill) timerFill.style.width = `${progress}%`;
            }, 150);

            await Promise.race([
                authPromise,
                new Promise(resolve => setTimeout(resolve, 3500))
            ]);
            
            clearInterval(progressInterval);
            if (timerFill) timerFill.style.width = '100%';
            console.log("Auth initialization step complete.");

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
            
            // Initialize Mood Glow for persisted user
            this.initMoodGlow();
            
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

    setupAuthListeners() {
        // Auth service emits events when user logs in/out via Supabase

        // Listen for user logged in event from AuthService
        window.addEventListener('user-logged-in', (e) => {
            // Debounce: prevent duplicate login processing for same user in same session
            // This can happen when signUp both returns a user AND triggers onAuthStateChange
            const newUserId = e.detail?.id;
            if (State.user && State.user.id === newUserId && this._lastLoginId === newUserId) {
                console.log('Duplicate login event for same user, skipping.');
                return;
            }
            this._lastLoginId = newUserId;
            
            console.log('User logged in:', e.detail);
            State.user = e.detail;
            this.updateAdminAccess();
            
            // Hide login screen immediately
            const login = document.getElementById('login-screen');
            if (login) {
                login.style.opacity = '0';
                login.style.visibility = 'hidden';
            }
            
            // Also hide loading screen if still visible
            const loading = document.getElementById('loading-screen');
            if (loading) {
                loading.style.opacity = '0';
                loading.style.visibility = 'hidden';
            }
            
            // Show main app
            const appElem = document.getElementById('app');
            if (appElem) {
                appElem.classList.remove('hidden');
                appElem.style.display = 'grid';
                appElem.style.opacity = '1';
            }

            this.enableRealTimeSubscriptions();
            this.initializeLiveSub();
            
            // Initialize Mood Glow for logged in user
            this.initMoodGlow();
            
            // Clear any stale/empty posts cache from the disconnected state
            if (this.services.data && this.services.data.cache) {
                this.services.data.cache.clearPostsCache();
            }
            
            window.history.replaceState({ view: 'home' }, '', '#home');
            this.navigate('home', true);
            this.showToast(`Welcome, ${e.detail.displayName}! ✨`);
        });

        // Listen for user logged out event
        window.addEventListener('user-logged-out', () => {
            console.log('User logged out');
            State.user = null;
            this._lastLoginId = null; // Reset so re-login works
            this.disableRealTimeSubscriptions();
            
            // Remove Mood Glow when logging out
            this.removeMoodGlow();
            
            // Properly hide the app shell and show the original login screen
            const appElem = document.getElementById('app');
            if (appElem) {
                appElem.classList.add('hidden');
                appElem.style.display = 'none';
                appElem.style.opacity = '0';
            }
            
            // Show the original login screen from index.html
            const loginScreen = document.getElementById('login-screen');
            if (loginScreen) {
                loginScreen.style.opacity = '1';
                loginScreen.style.visibility = 'visible';
                
                // Reset login form to sign-in mode
                const loginFields = document.getElementById('login-form-fields');
                const signupFields = document.getElementById('signup-form-fields');
                const toggleBtn = document.getElementById('toggle-auth-btn');
                const title = document.querySelector('.login-title');
                if (loginFields) loginFields.style.display = 'block';
                if (signupFields) signupFields.style.display = 'none';
                if (toggleBtn) toggleBtn.innerText = 'Need an account? Sign Up';
                if (title) title.innerText = 'Welcome Back';
                
                // Clear any previous input values
                const inputs = loginScreen.querySelectorAll('input[type="email"], input[type="password"], input[type="text"]');
                inputs.forEach(input => { input.value = ''; });
            }
            
            // Close admin dropdown if open
            const adminDropdown = document.getElementById('admin-dropdown');
            if (adminDropdown) adminDropdown.classList.remove('active');
            
            this.initLoginParticles();
            window.history.replaceState(null, '', '#login');
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
                        container.innerHTML = liveStreams.length > 0 ? liveStreams.map(l => Components.liveStreamCard(l)).join('') : '<p class="text-dim">No one is live yet.</p>';
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
        
        console.log('📡 Enabling enhanced real-time subscriptions...');
        
        // Subscribe to new posts, updates, and deletions
        this.postsChannel = this.services.data.subscribeToPosts((event) => {
            console.log('Posts event:', event);
            if (event.type === 'new_post') {
                // Add new post to top of timeline with engagement scoring
                this.handleNewPost(event.data);
            } else if (event.type === 'post_updated') {
                // Update existing post (e.g., reaction counts changed)
                this.handlePostUpdated(event.data);
            } else if (event.type === 'post_deleted') {
                // Remove post from timeline
                this.handlePostDeleted(event.data);
            }
        });

        // Subscribe to reactions for instant updates
        this.reactionsChannel = this.services.data.subscribeToReactions((event) => {
            console.log('Reaction event:', event);
            if (event.type === 'new_reaction') {
                this.handleNewReaction(event.data);
            } else if (event.type === 'reaction_removed') {
                this.handleReactionRemoved(event.data);
            }
        });

        // Subscribe to user profile updates
        this.userUpdatesChannel = this.services.data.subscribeToUserUpdates((event) => {
            console.log('User update event:', event);
            this.handleUserUpdated(event.data);
        });

        // Subscribe to Top 8 changes
        this.top8Channel = this.services.data.subscribeToTop8Updates((event) => {
            console.log('Top 8 event:', event);
            this.handleTop8Updated(event);
        });

        // Subscribe to comments
        this.commentsChannel = this.services.data.subscribeToComments((event) => {
            console.log('Comment event:', event);
            if (event.type === 'new_comment') {
                this.handleNewComment(event.data);
            }
        });

        // Subscribe to vibe boosts
        this.vibeBoostsChannel = this.services.data.subscribeToVibeBoosts((event) => {
            console.log('Vibe boost event:', event);
            this.handleVibeBoostUpdated(event);
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
        // Disable all enhanced real-time channels
        const channels = [
            this.postsChannel,
            this.reactionsChannel,
            this.userUpdatesChannel,
            this.top8Channel,
            this.commentsChannel,
            this.vibeBoostsChannel,
            this.notificationsChannel
        ];
        
        channels.forEach(channel => {
            if (channel && window.supabaseClient) {
                window.supabaseClient.removeChannel(channel);
            }
        });
        
        // Clear channel references
        this.postsChannel = null;
        this.reactionsChannel = null;
        this.userUpdatesChannel = null;
        this.top8Channel = null;
        this.commentsChannel = null;
        this.vibeBoostsChannel = null;
        this.notificationsChannel = null;
        
        console.log('Enhanced real-time subscriptions disabled');
    }

    handleOnlineStatus(isOnline) {
        const offlineBanner = document.getElementById('offline-banner');
        if (!offlineBanner && !isOnline) {
            // Create offline banner
            const banner = document.createElement('div');
            banner.id = 'offline-banner';
            banner.className = 'offline-banner';
            banner.innerHTML = Components.offlineBanner();
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

    async handleNotificationClick(notificationId, type, relatedId) {
        try {
            // Mark notification as read
            await this.services.data.markNotificationRead(notificationId);
            
            // Update local state
            const notification = State.notifications.find(n => n.id === notificationId);
            if (notification) {
                notification.read = true;
                this.updateNotificationBadge();
            }
            
            // Handle navigation based on notification type
            switch (type) {
                case 'like':
                if (relatedId) {
                    this.viewPost(relatedId);
                    this.showToast('Viewing the post you liked! ✨');
                }
                break;
                case 'comment':
                    if (relatedId) {
                        this.viewPost(relatedId);
                        this.showCommentModal(relatedId);
                        this.showToast('Viewing the post with new comment! 💬');
                    }
                    break;
                case 'follow':
                    if (relatedId) {
                        this.viewUserProfile(relatedId);
                        this.showToast('Viewing your new follower! 👤');
                    }
                    break;
                case 'vibe_boost':
                    if (relatedId) {
                        this.viewUserProfile(relatedId);
                        this.showToast('Viewing the user who boosted your vibe! ✨');
                    }
                    break;
                case 'mention':
                    if (relatedId) {
                        this.viewPost(relatedId);
                        this.showToast('Viewing the post where you were mentioned! 📢');
                    }
                    break;
                default:
                    this.navigate('notifications');
                    break;
            }
        } catch (error) {
            console.error('Error handling notification click:', error);
            this.showToast('Failed to handle notification', 'error');
        }
    }

    async markNotificationRead(notificationId) {
        try {
            await this.services.data.markNotificationRead(notificationId);
            
            // Update local state
            const notification = State.notifications.find(n => n.id === notificationId);
            if (notification) {
                notification.read = true;
                this.updateNotificationBadge();
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }

    async markAllNotificationsRead() {
        try {
            if (State.user) {
                await this.services.data.markNotificationsRead(State.user.id);
                
                // Update local state
                State.notifications.forEach(n => n.read = true);
                this.updateNotificationBadge();
                
                this.showToast('All notifications marked as read! ✅');
            }
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            this.showToast('Failed to mark notifications as read', 'error');
        }
    }

    async deleteNotification(notificationId) {
        try {
            // Delete from database
            if (window.supabaseClient) {
                await window.supabaseClient
                    .from('notifications')
                    .delete()
                    .eq('id', notificationId);
            }
            
            // Remove from local state
            State.notifications = State.notifications.filter(n => n.id !== notificationId);
            this.updateNotificationBadge();
            
            // Refresh notifications view if active
            if (State.currentView === 'notifications') {
                this.renderView('notifications', true);
            }
            
            this.showToast('Notification deleted! 🗑️');
        } catch (error) {
            console.error('Error deleting notification:', error);
            this.showToast('Failed to delete notification', 'error');
        }
    }

    async refreshNotifications() {
        try {
            if (State.user) {
                const notifications = await this.services.data.getNotifications(State.user.id);
                State.notifications = notifications;
                this.updateNotificationBadge();
                
                if (State.currentView === 'notifications') {
                    this.renderView('notifications', true);
                }
                
                this.showToast('Notifications refreshed! 🔄');
            }
        } catch (error) {
            console.error('Error refreshing notifications:', error);
            this.showToast('Failed to refresh notifications', 'error');
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
                    this.initLoginParticles();
                    
                    if (app) {
                        app.classList.add('hidden');
                        app.style.opacity = '0';
                    }
                } else if (app) {
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

    async handleReaction(postId, type) {
        if (!State.user) {
            this.showToast('Please login to react!', 'error');
            return;
        }

        const postEl = document.querySelector(`[data-id="${postId}"]`);
        const btn = postEl?.querySelector(`.reaction-btn[data-type="${type}"]`);
        
        // Optimistic UI update
        if (btn) {
            const countEl = btn.querySelector('.count');
            let count = parseInt(countEl.innerText);
            if (btn.classList.contains('active')) {
                btn.classList.remove('active');
                count = Math.max(0, count - 1);
            } else {
                btn.classList.add('active');
                count++;
                
                // Trigger animation based on type
                this.triggerReactionAnimation(btn, type);
            }
            countEl.innerText = count;
        }

        try {
            const result = await this.services.data.addReaction(postId, State.user.id, type);
            if (!result.success) {
                this.showToast('Sync failed: ' + result.error, 'error');
                // Revert UI on failure (simple reload for now)
                this.renderView(State.currentView, false);
            }
        } catch (e) {
            console.error('Reaction error:', e);
        }
    }

    triggerReactionAnimation(el, type) {
        // Simple scale and glow animations applied via classes in CSS
        el.classList.add('vibe-reacting');
        if (type === 'heat') el.classList.add('burn-anim');
        if (type === 'wild') el.classList.add('shake-anim');
        if (type === 'cap') el.classList.add('cap-anim');
        
        setTimeout(() => {
            el.classList.remove('vibe-reacting', 'burn-anim', 'shake-anim', 'cap-anim');
        }, 800);
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
        
        menu.innerHTML = Components.postMenu(postId, State.user && State.user.isSuperAdmin);

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

    async handlePostVideo(input) {
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
            
            // Check video duration and process with compression
            const video = document.createElement('video');
            video.src = url;
            video.onloadedmetadata = async () => {
                if (video.duration > 30) {
                    this.showToast('Optimizing video to 30 seconds...', 'info');
                    try {
                        const compressedVideo = await this.compressVideo(file, 30);
                        this.showVideoPreview(compressedVideo, preview, clearBtn);
                        
                        const savings = ((file.size - compressedVideo.size) / file.size * 100).toFixed(1);
                        this.showToast(`Video optimized! Saved ${savings}% space ✨`, 'success');
                    } catch (error) {
                        console.error('Video compression failed:', error);
                        this.showToast('Video optimization failed, using original', 'error');
                        this.clearMediaPreview();
                    }
                } else {
                    // Video is already under 30 seconds, still compress for optimization
                    this.showToast('Optimizing video...', 'info');
                    try {
                        const compressedVideo = await this.compressVideo(file, video.duration);
                        this.showVideoPreview(compressedVideo, preview, clearBtn);
                        
                        const savings = ((file.size - compressedVideo.size) / file.size * 100).toFixed(1);
                        this.showToast(`Video optimized! Saved ${savings}% space ✨`, 'success');
                    } catch (error) {
                        console.error('Video compression failed:', error);
                        // Fallback to original video
                        this.showVideoPreview(file, preview, clearBtn);
                    }
                }
            };
        }
    }

    showVideoPreview(videoFile, preview, clearBtn) {
        const url = URL.createObjectURL(videoFile);
        preview.innerHTML = `<video src="${url}" controls style="max-height:200px;border-radius:8px;margin-top:8px;width:100%;"></video>`;
        this._pendingMediaFile = videoFile;
        this._pendingMediaType = 'video';
        if (clearBtn) clearBtn.style.display = 'inline-flex';
    }

    async compressVideo(file, maxDuration = 30) {
        // Check if FFmpeg.wasm is loaded
        if (!window.FFmpeg) {
            await this.loadFFmpeg();
        }

        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.src = URL.createObjectURL(file);
            video.onloadedmetadata = async () => {
                try {
                    const ffmpeg = window.FFmpeg;
                    await ffmpeg.load();
                    
                    // Write input file to FFmpeg virtual file system
                    const inputFileName = `input_${Date.now()}.mp4`;
                    const outputFileName = `output_${Date.now()}.mp4`;
                    
                    await ffmpeg.writeFile(inputFileName, new Uint8Array(await this.fileToArrayBuffer(file)));
                    
                    // Calculate target duration
                    const targetDuration = Math.min(video.duration, maxDuration);
                    
                    // Build FFmpeg command for compression and trimming
                    const ffmpegCommand = [
                        '-i', inputFileName,
                        '-t', targetDuration.toString(),
                        '-c:v', 'libx264',
                        '-preset', 'medium',
                        '-crf', '28',
                        '-c:a', 'aac',
                        '-b:a', '128k',
                        '-vf', 'scale=1280:720', // Limit to 720p for size
                        '-r', '30', // 30fps
                        outputFileName
                    ];
                    
                    // Run FFmpeg command
                    await ffmpeg.exec(ffmpegCommand);
                    
                    // Read the compressed video
                    const outputData = await ffmpeg.readFile(outputFileName);
                    const compressedBlob = new Blob([outputData.buffer], { type: 'video/mp4' });
                    const compressedFile = new File([compressedBlob], this.generateOptimizedFilename(file.name, 'mp4'), {
                        type: 'video/mp4',
                        lastModified: Date.now()
                    });
                    
                    // Clean up virtual files
                    await ffmpeg.deleteFile(inputFileName);
                    await ffmpeg.deleteFile(outputFileName);
                    
                    resolve(compressedFile);
                } catch (error) {
                    console.error('FFmpeg compression error:', error);
                    reject(error);
                }
            };
            video.onerror = () => reject(new Error('Failed to load video metadata'));
        });
    }

    async loadFFmpeg() {
        return new Promise((resolve, reject) => {
            // Load FFmpeg.wasm script if not already loaded
            if (window.FFmpeg) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://unpkg.com/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js';
            script.onload = () => {
                // Initialize FFmpeg
                window.FFmpeg.createFFmpeg({ log: true }).then(ffmpeg => {
                    window.FFmpeg = ffmpeg;
                    resolve();
                }).catch(reject);
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async fileToArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
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
            this.showToast('Optimizing image...', 'info');
            const reader = new FileReader();
            reader.onload = async (e) => {
                const img = new Image();
                img.onload = async () => {
                    // Enhanced image compression
                    const compressedFile = await this.compressImageAdvanced(img, file);
                    
                    preview.innerHTML = `<img src="${URL.createObjectURL(compressedFile)}" style="max-height:200px;border-radius:8px;margin-top:8px;width:100%;object-fit:cover;">`;
                    this._pendingMediaFile = compressedFile;
                    this._pendingMediaType = 'image';
                    if (clearBtn) clearBtn.style.display = 'inline-flex';
                    
                    // Show compression savings
                    const savings = ((file.size - compressedFile.size) / file.size * 100).toFixed(1);
                    this.showToast(`Image optimized! Saved ${savings}% space`, 'success');
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }

    compressImageAdvanced(img, originalFile) {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        // Calculate optimal dimensions
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
        
        // Enable image smoothing for better quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Smart quality and format determination
        const originalSize = originalFile.size;
        let quality = this.calculateOptimalQuality(originalSize, width, height);
        let format = this.determineBestFormat(originalFile.type);

        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                const compressedFile = new File([blob], this.generateOptimizedFilename(originalFile.name, format), {
                    type: `image/${format}`,
                    lastModified: Date.now()
                });
                resolve(compressedFile);
            }, `image/${format}`, quality);
        });
    }

    calculateOptimalQuality(originalSize, width, height) {
        const pixelCount = width * height;
        
        // Smart quality based on image size and pixel count
        if (originalSize > 5 * 1024 * 1024) { // Large files
            return pixelCount > 1000000 ? 0.65 : 0.75;
        } else if (originalSize > 1 * 1024 * 1024) { // Medium files
            return pixelCount > 500000 ? 0.75 : 0.85;
        } else { // Small files
            return pixelCount > 200000 ? 0.85 : 0.9;
        }
    }

    determineBestFormat(originalType) {
        // Prefer WebP for better compression, fallback to JPEG
        const supportsWebP = document.createElement('canvas').toDataURL('image/webp').indexOf('data:image/webp') === 0;
        
        if (supportsWebP && (originalType === 'image/jpeg' || originalType === 'image/png')) {
            return 'webp';
        }
        return 'jpeg';
    }

    generateOptimizedFilename(originalName, format) {
        const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
        return `${nameWithoutExt}_optimized.${format}`;
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
        content.innerHTML = Components.postModal();
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
            user_avatar: State.user.profilePhoto,
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
        
        // Check if post actually saved - result is null when Supabase insert failed
        if (!result || !result.id) {
            console.error('Post failed to save - addPost returned:', result);
            this.showToast('Failed to save your vibe. Please try again!', 'error');
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
            id: result.id,
            userId: State.user.id,
            displayName: State.user.displayName,
            handle: State.user.username,
            avatar: State.user.profilePhoto,
            content: text || '',
            media: result.media_url || '',
            mediaType: result.media_type || mediaType,
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
            await this.services.data.cache.clearPostsCache();
        } else {
            this.navigate('home', true);
        }
        
        if (State.user) {
            this.showToast('Welcome back to VibeHub! ', 'success');
            this.services.data.cache.clearPostsCache();
            this.initMoodGlow(); // Initialize Mood Glow
        } else {
            this.navigate('home', true);
        }
        
        if (State.user) {
            this.services.data.notifications.requestPermission();
        }
    }

    togglePostMenu(postId, event) {
        event.stopPropagation();
        
        // Close all other post menus
        document.querySelectorAll('.post-menu').forEach(menu => {
            if (menu.id !== `post-menu-${postId}`) {
                menu.style.display = 'none';
            }
        });
        
        // Toggle current menu
        const menu = document.getElementById(`post-menu-${postId}`);
        if (menu) {
            menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
        }
        
        // Close menu when clicking outside
        const closeHandler = (e) => {
            if (!e.target.closest('.post-actions')) {
                if (menu) menu.style.display = 'none';
                document.removeEventListener('click', closeHandler);
            }
        };
        setTimeout(() => document.addEventListener('click', closeHandler), 100);
    }

    async handleEditPost(postId) {
        if (!State.user) {
            this.showToast('Please login to edit posts', 'error');
            return;
        }
        
        try {
            // Get current post data
            const { data: post } = await window.supabaseClient
                .from('posts')
                .select('*')
                .eq('id', postId)
                .single();
                
            if (!post) {
                this.showToast('Post not found', 'error');
                return;
            }
            
            // Verify user owns the post
            if (post.user_id !== State.user.id && !State.user.isSuperAdmin) {
                this.showToast('You can only edit your own posts', 'error');
                return;
            }
            
            // Show edit modal
            this.showEditPostModal(post);
        } catch (error) {
            console.error('Error preparing post edit:', error);
            this.showToast('Failed to load post for editing', 'error');
        }
    }

    showEditPostModal(post) {
        const modal = document.getElementById('modal-container');
        const content = document.getElementById('modal-content');
        if (!modal || !content) return;
        
        modal.classList.remove('hidden');
        content.innerHTML = `
            <div class="glass-panel" style="max-width: 600px; margin: 20px auto; padding: 30px;">
                <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 style="margin: 0; color: var(--text-main);">Edit Vibe</h2>
                    <button onclick="window.App.closeEditPostModal()" style="background: none; border: none; color: var(--text-muted); font-size: 1.5rem; cursor: pointer;">×</button>
                </div>
                
                <div class="edit-post-form">
                    <textarea id="edit-post-text" placeholder="Share your vibe..." style="width: 100%; min-height: 120px; background: var(--bg-glass); border: 1px solid var(--border-light); border-radius: 12px; padding: 15px; color: var(--text-main); resize: vertical; font-family: inherit; font-size: 1rem;">${post.text || ''}</textarea>
                    
                    <div style="margin-top: 20px; display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; gap: 10px;">
                            ${post.media_url ? `
                                <div style="position: relative;">
                                    ${post.media_type === 'image' ? 
                                        `<img src="${post.media_url}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;">` :
                                        `<video src="${post.media_url}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;"></video>`
                                    }
                                    <button onclick="window.App.removeEditMedia()" style="position: absolute; top: -5px; right: -5px; background: var(--accent-red); color: white; border: none; border-radius: 50%; width: 20px; height: 20px; cursor: pointer; font-size: 12px;">×</button>
                                </div>
                            ` : ''}
                            <input type="file" id="edit-post-media" accept="image/*,video/*" style="display: none;">
                            <button onclick="document.getElementById('edit-post-media').click()" class="btn-secondary" style="padding: 8px 16px; font-size: 0.9rem;">📎 Add Media</button>
                        </div>
                        
                        <div style="display: flex; gap: 10px;">
                            <button onclick="window.App.closeEditPostModal()" class="btn-secondary">Cancel</button>
                            <button onclick="window.App.saveEditedPost('${post.id}')" class="btn-primary">Save Changes</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Store current post data
        this._editingPost = post;
        this._editingMediaFile = null;
        this._editingMediaType = null;
        
        // Setup media input handler
        const mediaInput = document.getElementById('edit-post-media');
        if (mediaInput) {
            mediaInput.addEventListener('change', (e) => this.handleEditMediaChange(e));
        }
    }

    handleEditMediaChange(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Validate file
        if (file.size > 100 * 1024 * 1024) {
            this.showToast('Media must be under 100MB', 'error');
            return;
        }
        
        this._editingMediaFile = file;
        this._editingMediaType = file.type.includes('video') ? 'video' : 'image';
        
        // Show preview
        const preview = document.querySelector('.edit-post-form .media-preview');
        if (preview) preview.remove();
        
        const previewDiv = document.createElement('div');
        previewDiv.className = 'media-preview';
        previewDiv.style.cssText = 'margin-top: 15px; position: relative;';
        previewDiv.innerHTML = `
            ${this._editingMediaType === 'image' ? 
                `<img src="${URL.createObjectURL(file)}" style="max-width: 200px; max-height: 200px; border-radius: 8px;">` :
                `<video src="${URL.createObjectURL(file)}" style="max-width: 200px; max-height: 200px; border-radius: 8px;" controls></video>`
            }
            <button onclick="window.App.removeEditMedia()" style="position: absolute; top: -5px; right: -5px; background: var(--accent-red); color: white; border: none; border-radius: 50%; width: 20px; height: 20px; cursor: pointer; font-size: 12px;">×</button>
        `;
        
        document.querySelector('.edit-post-form').insertBefore(previewDiv, document.querySelector('.edit-post-form > div:last-child'));
    }

    removeEditMedia() {
        this._editingMediaFile = null;
        this._editingMediaType = null;
        const preview = document.querySelector('.media-preview');
        if (preview) preview.remove();
        document.getElementById('edit-post-media').value = '';
    }

    async saveEditedPost(postId) {
        const text = document.getElementById('edit-post-text').value;
        
        if (!text.trim() && !this._editingMediaFile && !this._editingPost.media_url) {
            this.showToast('Post cannot be empty', 'error');
            return;
        }
        
        this.showToast('Saving changes...', 'info');
        
        try {
            let mediaUrl = this._editingPost.media_url;
            let mediaType = this._editingPost.media_type;
            
            // Handle new media upload
            if (this._editingMediaFile) {
                const uploadResult = this._editingMediaType === 'video' ? 
                    await this.services.data.media.uploadVideo(this._editingMediaFile) :
                    await this.services.data.media.uploadImage(this._editingMediaFile);
                    
                if (uploadResult) {
                    mediaUrl = uploadResult.url;
                    mediaType = this._editingMediaType;
                }
            }
            
            // Update the post
            const result = await this.services.data.editPost(postId, text, mediaUrl, mediaType);
            
            if (result.success) {
                this.showToast('Post updated successfully! ✨', 'success');
                this.closeEditPostModal();
                
                // Refresh timeline if visible
                if (State.currentView === 'home') {
                    this.navigate('home', true);
                }
            } else {
                this.showToast('Failed to update post: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Error saving edited post:', error);
            this.showToast('Failed to save changes', 'error');
        }
    }

    closeEditPostModal() {
        const modal = document.getElementById('modal-container');
        if (modal) modal.classList.add('hidden');
        this._editingPost = null;
        this._editingMediaFile = null;
        this._editingMediaType = null;
    }

    async handleDeletePost(postId) {
        if (!State.user) {
            this.showToast('Please login to delete posts', 'error');
            return;
        }
        
        // Confirm deletion
        if (!confirm('Are you sure you want to delete this vibe? This action cannot be undone.')) {
            return;
        }
        
        try {
            this.showToast('Deleting post...', 'info');
            
            const result = await this.services.data.deletePost(postId);
            
            if (result.success) {
                this.showToast('Post deleted successfully', 'success');
                
                // Remove post from DOM if visible
                const postElement = document.querySelector(`[data-post-id="${postId}"]`);
                if (postElement) {
                    postElement.style.opacity = '0';
                    postElement.style.transform = 'translateY(-20px)';
                    setTimeout(() => postElement.remove(), 300);
                }
                
                // Refresh timeline if visible
                if (State.currentView === 'home') {
                    setTimeout(() => this.navigate('home', true), 500);
                }
            } else {
                this.showToast('Failed to delete post: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Error deleting post:', error);
            this.showToast('Failed to delete post', 'error');
        }
    }

    async showCommentModal(postId) {
        const modal = document.getElementById('modal-container');
        const content = document.getElementById('modal-content');
        if (!modal || !content) return;
        
        // Fetch comments from DataService
        const comments = await this.services.data.getComments(postId);
        
        modal.classList.remove('hidden');
        content.innerHTML = Components.commentModal(postId, this.renderCommentsHTML(comments));
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
                                <button onclick="window.App.reactToComment('${c.id}','like')" style="background:none; border:none; cursor:pointer; font-size:0.75rem; color:var(--text-muted);">⚡</button>
                                <button onclick="window.App.reactToComment('${c.id}','heat')" style="background:none; border:none; cursor:pointer; font-size:0.75rem; color:var(--text-muted);">🔥</button>
                                <button onclick="window.App.reactToComment('${c.id}','wild')" style="background:none; border:none; cursor:pointer; font-size:0.75rem; color:var(--text-muted);">😲</button>
                                <button onclick="window.App.reactToComment('${c.id}','cap')" style="background:none; border:none; cursor:pointer; font-size:0.75rem; color:var(--text-muted);">🧢</button>
                                <button onclick="window.App.reactToComment('${c.id}','admire')" style="background:none; border:none; cursor:pointer; font-size:0.75rem; color:var(--text-muted);">✨</button>
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
                this.showToast("Audio comment posted! ");
            };

            mediaRecorder.start();
        } catch (err) {
            console.error("Audio recording failed:", err);
            let msg = "Microphone access denied. Please allow it in device settings.";
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                msg = "Microphone access denied. Please allow it in device settings.";
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                msg = "No microphone found on this device.";
            }
            this.showToast(msg, 'error');
        }
    }

    async handleVideoCommentUpload(input, postId) {
        const file = input.files[0];
        if (!file) return;
        
        this.showToast("Optimizing video comment...");
        try {
            const compressedVideo = await this.compressVideo(file, 15); // 15 second max for comments
            const result = await this.services.data.media.uploadVideo(compressedVideo);
            const videoUrl = result?.url;
            
            if (videoUrl) {
                await this.services.data.addComment(postId, {
                    userId: State.user?.username || 'guest',
                    displayName: State.user?.displayName || 'Guest',
                    type: 'video',
                    videoUrl: videoUrl
                });
                this.showCommentModal(postId);
                this.showToast("Video comment uploaded! ");
            }
        } catch (err) {
            console.error('Video compression failed:', err);
            // Fallback to original
            this.showToast("Uploading original video...");
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
                    this.showToast("Video comment uploaded! ");
                }
            } catch (fallbackErr) {
                this.showToast("Upload failed: " + fallbackErr.message, 'error');
            }
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
        
        modal.innerHTML = Components.streamSetupModal(modalId);
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
                container.innerHTML = Views.broadcastMode(topic || "Vibing");
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
                    // Use engagement ranking algorithm with user context for personalized feed
                    const postsData = await this.services.data.getRankedPosts('all', null, State.user);
                    const adsData = await this.services.data.getAds();
                    
                    if (!postsData || postsData.length === 0) {
                        // Retry once for new users or slow loads
                        setTimeout(async () => {
                            const retryPosts = await this.services.data.getRankedPosts('all', null, State.user);
                            const retryAds = await this.services.data.getAds();
                            if (retryPosts && retryPosts.length > 0) {
                                container.innerHTML = Views.home(this.interleaveAds(retryPosts, retryAds));
                            }
                        }, 1000);
                    }
                    container.innerHTML = Views.home(this.interleaveAds(Array.isArray(postsData) ? postsData : [], adsData));
                    break;
                case 'explore':
                    await this.renderExploreView();
                    break;
                case 'vibestream':
                    const videos = await this.services.video.getVibeStream();
                    const liveStreams = await this.services.video.getLiveStreams();
                    container.innerHTML = Views.vibeStream(videos, liveStreams);
                    break;
                case 'syncrooms':
                    const rooms = await this.services.chat.getSyncRooms();
                    container.innerHTML = Views.syncRooms(rooms);
                    break;
                case 'profile':
                    const userPosts = State.user ? await this.services.data.getUserPosts(State.user.id, State.user.username) : [];
                    container.innerHTML = Views.profile(State.user, userPosts);
                    break;
                case 'login':
                case 'register':
                    container.innerHTML = Views.auth(view);
                    break;
                case 'messages':
                    const dms = await this.services.chat.getMessages();
                    container.innerHTML = Views.messages(dms);
                    break;
                case 'notifications':
                    const notifs = State.user ? await this.services.data.getNotifications(State.user.id) : [];
                    container.innerHTML = Views.notifications(notifs);
                    // Mark as read after rendering
                    if (State.user) this.services.data.markNotificationsRead(State.user.id);
                    break;
                case 'friends':
                    const friends = await this.services.data.getFriends(State.user?.id);
                    const friendsPosts = await this.services.data.getFriendsPosts(State.user?.id);
                    container.innerHTML = Views.friends(friends, friendsPosts);
                    break;
                case 'guidelines':
                    container.innerHTML = Views.guidelines();
                    break;
                case 'disclaimer':
                    container.innerHTML = Views.disclaimer();
                    break;
                case 'privacy':
                    container.innerHTML = Views.privacy();
                    break;
                case 'settings':
                    container.innerHTML = Views.settings();
                    break;
                case 'search':
                    container.innerHTML = Views.search();
                    break;
                case 'admin':
                    try {
                        if (State.user && (State.user.isSuperAdmin || State.user.username === 'KingKool23')) {
                            const stats = this.services.admin?.getStats ? await this.services.admin.getStats() : { users: 0, posts: 0 };
                            container.innerHTML = Components.admin(stats);
                        } else {
                            container.innerHTML = '<div class="view-header"><h1 class="view-title">Access Denied</h1><p class="text-dim">Admin only.</p></div>';
                        }
                    } catch (err) {
                        console.error('Admin panel error:', err);
                        container.innerHTML = '<div class="view-header"><h1 class="view-title">Admin Panel</h1><p>Loading...</p></div>';
                    }
                    break;
                case 'communities':
                    const communities = await this.services.data.getCommunities();
                    container.innerHTML = Views.communities(communities);
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

    interleaveAds(posts, ads) {
        if (!ads || ads.length === 0) return posts;
        const result = [];
        let adIndex = 0;
        for (let i = 0; i < posts.length; i++) {
            result.push(posts[i]);
            // Inject an ad every 20 posts
            if ((i + 1) % 20 === 0 && ads.length > 0) {
                const ad = ads[adIndex % ads.length];
                result.push({ ...ad, isAd: true });
                adIndex++;
            }
        }
        // If there are fewer than 20 posts but we have ads, inject one at the end if it's the home feed
        if (posts.length > 0 && posts.length < 20 && ads.length > 0 && State.currentView === 'home') {
             result.push({ ...ads[0], isAd: true });
        }
        return result;
    }

    showSkeletons() {
        const container = document.getElementById('view-container');
        if (!container) return;
        container.innerHTML = Components.skeletonLoading();
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

        
container.scrollTop = 0;
}
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
            <div class="profile-container animate-fade">
                <div class="profile-banner">
                    <img src="${banner}" alt="Banner">
                    <div class="profile-ranking-badge">
                        <span class="rank-icon">🏆</span>
                        <span class="rank-value">Top 1%</span>
                    </div>
                </div>
                <div class="profile-content">
                    <div class="profile-header">
                        <div class="profile-avatar-wrapper">
                            <img src="${avatar}" class="profile-avatar" alt="${displayName}">
                            ${isOwnProfile ? '' : `<div class="vibe-match-ring" style="--match:${vibeMatchScore}%" title="Vibe Match: ${vibeMatchScore}%"></div>`}
                        </div>
                        <div class="profile-info" style="text-align:center;">
                            <h1 class="view-title" style="margin-bottom:0; display:flex; align-items:center; justify-content:center; gap:10px;">
                                ${displayName}
                                ${user.verified ? '<span class="verified-check">✅</span>' : ''}
                            </h1>
                            <p class="handle" style="margin-top:2px; color:var(--primary-purple-bright);">@${username}</p>
                            <p class="bio" style="margin-top:10px; max-width:600px; margin-left:auto; margin-right:auto;">${bio}</p>
                            
                            <div class="profile-badges" style="justify-content:center; margin-top:15px;">
                                ${this.generateBadges(user)}
                            </div>
                        </div>
                        <div class="profile-actions-bar" style="display:flex; gap:12px; margin-top:20px; justify-content:center; width:100%;">
                            ${isOwnProfile ? 
                                `<button class="btn-secondary" onclick="window.App.showEditProfileModal()" style="min-width:140px;">Edit Profile</button>` : 
                                `
                                    ${friendButtonHTML}
                                    <button class="btn-primary" onclick="window.App.boostVibe('${user.id}')" style="background:linear-gradient(135deg, var(--primary-purple), var(--accent-magenta)); border:none; min-width:120px;">
                                        Boost ✨
                                    </button>
                                    <button class="btn-secondary" onclick="window.App.navigate('messages')" style="min-width:100px;">Message</button>
                                `
                            }
                        </div>
                    </div>
                    <div class="profile-stats glass-panel">
                        <div class="stat-item"><span class="stat-value">${(user.followersCount || 0).toLocaleString()}</span><span class="stat-label">Followers</span></div>
                        <div class="stat-item"><span class="stat-value">${(user.followingCount || 0).toLocaleString()}</span><span class="stat-label">Following</span></div>
                        <div class="stat-item"><span class="stat-value">${(user.postCount || 0).toLocaleString()}</span><span class="stat-label">Posts</span></div>
                        ${!isOwnProfile && window.State.user ? `<div class="stat-item"><span class="stat-value" style="color:${vibeMatchScore >= 80 ? 'var(--accent-neon-green)' : vibeMatchScore >= 50 ? 'var(--primary-orange)' : 'var(--accent-pink)'}">${vibeMatchScore}%</span><span class="stat-label">Vibe Match</span></div>` : ''}
                        <div class="stat-item"><span class="stat-value" id="vibe-boost-count">${(user.vibeBoosts || 0).toLocaleString()}</span><span class="stat-label">Vibe Level</span></div>
                    </div>
                    
                    <div class="top-vibes-section" style="margin-top:40px; padding: 20px; background: rgba(0,0,0,0.2); border-radius: 20px; border: 1px solid rgba(255,255,255,0.05);">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                            <h3 class="section-title" style="margin:0;">⭐ Top Inner Circle</h3>
                            ${isOwnProfile ? `<button class="btn-secondary btn-sm" onclick="window.App.showTop8Modal()" style="font-size:0.7rem;">Manage Inner Circle</button>` : ''}
                        </div>
                        <div class="top-vibes-grid" style="display:grid; grid-template-columns: repeat(3, 1fr); gap:15px;">
                            ${[0, 1, 2].map(i => {
                                const friend = top8Data[i];
                                if (friend) {
                                    return `
                                    <div class="vibe-img-card spotlight" onclick="window.App.viewUserProfile('${friend.id}', '${friend.username}')" style="position:relative;">
                                        <div class="spotlight-rank">${i+1}</div>
                                        <img src="${friend.avatar_url || 'https://i.pravatar.cc/150'}" loading="lazy" style="width:100%; aspect-ratio:1; border-radius:50%; object-fit:cover; border:3px solid var(--primary-orange);">
                                        <div style="font-size:0.85rem; margin-top:8px; font-weight:700; color:white;">${friend.name || friend.username}</div>
                                        <div style="font-size:0.7rem; color:var(--text-dim);">@${friend.username}</div>
                                    </div>`;
                                } else {
                                    return `
                                    <div class="vibe-img-card empty-top8" style="opacity:0.3; ${isOwnProfile ? 'cursor:pointer;' : ''}" ${isOwnProfile ? 'onclick="window.App.showTop8Modal()"' : ''}>
                                        <div style="width:100%; aspect-ratio:1; border-radius:50%; background:rgba(255,255,255,0.05); border:2px dashed rgba(255,255,255,0.2); display:flex; align-items:center; justify-content:center; font-size:1.5rem; color:rgba(255,255,255,0.3);">+</div>
                                        <div style="font-size:0.75rem; margin-top:5px; color:var(--text-dim);">Empty Vibe</div>
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

                        ${(State.user?.isSuperAdmin || State.user?.username === 'KingKool23') ? `
                        <div class="edit-field admin-field" style="padding: 10px; border: 1px dashed var(--primary-purple); border-radius: 8px; margin-top: 10px;">
                            <label class="edit-label" style="color:var(--primary-purple); display:flex; align-items:center; gap:8px;">
                                <input type="checkbox" id="edit-verified" ${user.verified ? 'checked' : ''} style="width:auto; cursor:pointer;"> 
                                🔐 Verified Account Status
                            </label>
                            <p class="text-dim" style="font-size:0.75rem; margin-top:5px;">Admin only: Toggle official verification badge.</p>
                        </div>
                        ` : ''}
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
            saveBtn.innerHTML = '<span class="spinner-mini"></span> Optimizing...';
        }

        try {
            this.showToast(`Optimizing ${type}...`, 'info');
            
            // Process and optimize the image
            let optimizedFile;
            if (type === 'banner') {
                optimizedFile = await this.autoFitBanner(file);
            } else {
                // Avatar optimization with square dimensions
                optimizedFile = await this.optimizeAvatar(file);
            }
            
            // Folder mapping for ImageKit (avatar or banner)
            const folder = type === 'avatar' ? 'profiles/avatars' : 'profiles/banners';
            const result = await this.services.data.media.uploadImage(optimizedFile, folder);
            
            if (result && result.url) {
                document.getElementById(hiddenInputId).value = result.url;
                if (previewImg) {
                    previewImg.src = result.url;
                    previewImg.style.opacity = '1';
                    previewImg.style.filter = 'none';
                }
                
                // Show optimization savings
                const savings = ((file.size - optimizedFile.size) / file.size * 100).toFixed(1);
                this.showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} optimized! Saved ${savings}% space ✨`, 'success');
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

    async autoFitBanner(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    
                    // Banner dimensions (16:5 aspect ratio)
                    const BANNER_WIDTH = 1500;
                    const BANNER_HEIGHT = 500;
                    
                    // Calculate crop and resize
                    const sourceAspect = img.width / img.height;
                    const targetAspect = BANNER_WIDTH / BANNER_HEIGHT;
                    
                    let sourceX = 0, sourceY = 0, sourceWidth = img.width, sourceHeight = img.height;
                    
                    if (sourceAspect > targetAspect) {
                        // Image is wider - crop sides
                        sourceWidth = img.height * targetAspect;
                        sourceX = (img.width - sourceWidth) / 2;
                    } else {
                        // Image is taller - crop top/bottom
                        sourceHeight = img.width / targetAspect;
                        sourceY = (img.height - sourceHeight) / 2;
                    }
                    
                    canvas.width = BANNER_WIDTH;
                    canvas.height = BANNER_HEIGHT;
                    const ctx = canvas.getContext('2d');
                    
                    // High quality rendering
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, BANNER_WIDTH, BANNER_HEIGHT);
                    
                    // Convert to optimized blob
                    canvas.toBlob((blob) => {
                        const optimizedFile = new File([blob], this.generateOptimizedFilename(file.name, 'jpeg'), {
                            type: 'image/jpeg',
                            lastModified: Date.now()
                        });
                        resolve(optimizedFile);
                    }, 'image/jpeg', 0.85);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    async optimizeAvatar(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    
                    // Avatar dimensions (square)
                    const AVATAR_SIZE = 400;
                    
                    // Calculate crop and resize
                    const size = Math.min(img.width, img.height);
                    const sourceX = (img.width - size) / 2;
                    const sourceY = (img.height - size) / 2;
                    
                    canvas.width = AVATAR_SIZE;
                    canvas.height = AVATAR_SIZE;
                    const ctx = canvas.getContext('2d');
                    
                    // High quality rendering
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, sourceX, sourceY, size, size, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
                    
                    // Convert to optimized blob
                    canvas.toBlob((blob) => {
                        const optimizedFile = new File([blob], this.generateOptimizedFilename(file.name, 'jpeg'), {
                            type: 'image/jpeg',
                            lastModified: Date.now()
                        });
                        resolve(optimizedFile);
                    }, 'image/jpeg', 0.9);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
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

        // Admin-only fields
        if (State.user?.isSuperAdmin || State.user?.username === 'KingKool23') {
            const verified = document.getElementById('edit-verified')?.checked;
            if (verified !== undefined) updates.verified = verified;
        }
        
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
                    this.renderView('profile', true);
                }
                
                // If we are on a feed view, refresh the posts to show updated avatars
                const feedViews = ['home', 'trending', 'we-vibin', 'friends'];
                if (feedViews.includes(State.currentView)) {
                    this.renderView(State.currentView, true);
                }
            }
        } catch (e) {
            console.error('Profile sync error:', e);
            this.showToast('Profile sync failed. Check connection.', 'error');
        } finally {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = 'Sync Profile';
            }
        }
    }

    async openDM(userId, username) {
        if (!State.user) {
            this.showToast('Please login to send messages', 'error');
            return;
        }
        
        // Navigate to messages and open conversation with this user
        this.navigate('messages');
        
        // Wait for messages view to load, then open conversation
        setTimeout(() => {
            this.startConversation(userId, username);
        }, 500);
    }

    async startConversation(userId, username) {
        if (!State.user) return;
        
        try {
            // Create or get existing conversation
            const conversationId = [State.user.id, userId].sort().join('_');
            
            // Check if conversation already exists by trying to fetch messages
            const existingMessages = await this.services.chat.getMessages(conversationId);
            
            // Display conversation view
            this.showConversationView(userId, username, existingMessages || []);
        } catch (error) {
            console.error('Error starting conversation:', error);
            this.showToast('Failed to start conversation', 'error');
        }
    }

    showConversationView(userId, username, messages) {
        const container = document.getElementById('view-container');
        if (!container) return;
        
        container.innerHTML = `
            <div class="conversation-view glass-panel" style="height: calc(100vh - 120px); display: flex; flex-direction: column;">
                <div class="conversation-header" style="padding: 15px; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; gap: 10px;">
                    <button class="btn-secondary" onclick="window.App.navigate('messages')" style="padding: 5px 10px;">← Back</button>
                    <img src="https://i.pravatar.cc/100?u=${userId}" style="width: 40px; height: 40px; border-radius: 50%;">
                    <div>
                        <div style="font-weight: bold;">${username}</div>
                        <div style="font-size: 0.8rem; color: var(--text-dim);">Direct Message</div>
                    </div>
                </div>
                
                <div class="conversation-messages" id="conversation-messages" style="flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 10px;">
                    ${messages.map(msg => this.renderMessage(msg)).join('')}
                </div>
                
                <div class="conversation-input" style="padding: 15px; border-top: 1px solid rgba(255,255,255,0.1);">
                    <div style="display: flex; gap: 10px;">
                        <input type="text" id="dm-input" class="login-input" placeholder="Type a message..." style="flex: 1;" onkeypress="if(event.key==='Enter') window.App.sendDirectMessage('${userId}', '${username}')">
                        <button class="btn-primary" onclick="window.App.sendDirectMessage('${userId}', '${username}')" style="padding: 10px 20px;">Send</button>
                    </div>
                </div>
            </div>
        `;
        
        // Scroll to bottom
        const messagesContainer = document.getElementById('conversation-messages');
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    renderMessage(message) {
        const isOwn = State.user && message.sender_id === State.user.id;
        const time = new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        return `
            <div class="message-bubble ${isOwn ? 'sent' : 'received'}" style="
                display: flex;
                ${isOwn ? 'justify-content: flex-end;' : 'justify-content: flex-start;'}
                margin-bottom: 10px;
            ">
                <div style="
                    max-width: 70%;
                    padding: 10px 15px;
                    border-radius: 18px;
                    background: ${isOwn ? 'var(--primary-purple)' : 'rgba(255,255,255,0.1)'};
                    color: white;
                    word-wrap: break-word;
                ">
                    <div>${message.text}</div>
                    <div style="font-size: 0.7rem; opacity: 0.7; margin-top: 5px;">${time}</div>
                </div>
            </div>
        `;
    }

    async sendDirectMessage(userId, username) {
        const input = document.getElementById('dm-input');
        const text = input?.value.trim();
        
        if (!text || !State.user) return;
        
        try {
            const message = await this.services.chat.sendMessage(userId, text, State.user);
            if (message) {
                // Add message to conversation view
                const messagesContainer = document.getElementById('conversation-messages');
                if (messagesContainer) {
                    const messageHTML = this.renderMessage({
                        ...message,
                        sender_id: State.user.id
                    });
                    messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }
                
                // Clear input
                input.value = '';
                
                this.showToast('Message sent! ✨');
            } else {
                this.showToast('Failed to send message', 'error');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            this.showToast('Failed to send message', 'error');
        }
    }

    generateBadges(user) {
        const badges = [];
        
        // Use the same logic as DataService.calculateUserBadges for consistency
        if (user.verified) badges.push({ label: 'Verified', class: 'badge-verified' });
        
        // Calculate from reaction stats
        const statsStr = user.reaction_stats || '{"given": {}, "received": {}}';
        let stats = { given: {}, received: {} };
        try { stats = typeof statsStr === 'string' ? JSON.parse(statsStr) : statsStr; } catch(e) {}
        let totalReceived = Object.values(stats.received || {}).reduce((sum, val) => sum + (val || 0), 0);
        const vibeLikesCount = user.vibe_likes?.length || (user.vibe_likes_count || 0);
        const totalVibeScore = totalReceived + vibeLikesCount;
        
        // Award badges based on thresholds
        if (totalVibeScore >= 1000) badges.push({ label: 'Vibe Legend', class: 'badge-legend' });
        else if (totalVibeScore >= 500) badges.push({ label: 'Vibe Master', class: 'badge-master' });
        else if (vibeLikesCount >= 50) badges.push({ label: 'Viber', class: 'badge-viber' });
        
        if (user.role === 'admin' || user.is_admin) badges.push({ label: 'Admin', class: 'badge-admin' });
        
        // Additional achievement badges
        const postCount = user.postCount || 0;
        const followersCount = user.followersCount || 0;
        
        if (postCount >= 50) badges.push({ label: 'Content Creator', class: 'badge-creator' });
        if (followersCount >= 100) badges.push({ label: 'Popular', class: 'badge-popular' });
        if (followersCount >= 1000) badges.push({ label: 'Influencer', class: 'badge-influencer' });
        
        return badges.length > 0 ? badges.map(b => `<span class="user-badge ${b.class}">${b.label}</span>`).join(' ') : '<span class="text-dim">No badges yet</span>';
    }

    getAuthHTML(mode) {
        return Views.auth(mode);
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
                if (result.user) {
                    // User was auto-confirmed and signed in
                    this.showToast('Account created! Welcome to VibeHub ✨');
                    // The user-logged-in event from syncUserSession will handle navigation.
                    // However, give the event a moment to fire, then ensure we navigate.
                    setTimeout(() => {
                        if (State.user && State.user.id) {
                            // Event already handled navigation - we're good
                            return;
                        }
                        // Fallback: manually trigger the navigation in case event was missed
                        State.user = result.user;
                        if (result.user?.id) this._lastLoginId = result.user.id;
                        this.updateAdminAccess();
                        const login = document.getElementById('login-screen');
                        if (login) { login.style.opacity = '0'; login.style.visibility = 'hidden'; }
                        const appElem = document.getElementById('app');
                        if (appElem) { appElem.classList.remove('hidden'); appElem.style.display = 'grid'; appElem.style.opacity = '1'; }
                        this.navigate('home', true);
                    }, 500);
                } else if (result.message) {
                    // Email confirmation required
                    this.showToast(result.message, 'info');
                } else {
                    this.showToast('Account created! Welcome to VibeHub ✨');
                }
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
            
            // Immediately sync state and force app access since event listener debounce might drop it
            State.user = result;
            if (result.id) this._lastLoginId = result.id;
            
            this.updateAdminAccess();
            
            const login = document.getElementById('login-screen');
            if (login) {
                login.style.opacity = '0';
                login.style.visibility = 'hidden';
            }
            
            const loading = document.getElementById('loading-screen');
            if (loading) {
                loading.style.opacity = '0';
                loading.style.visibility = 'hidden';
            }
            
            const appElem = document.getElementById('app');
            if (appElem) {
                appElem.classList.remove('hidden');
                appElem.style.display = 'grid';
                appElem.style.opacity = '1';
            }

            this.enableRealTimeSubscriptions();
            this.initializeLiveSub();
            
            if (this.services.data && this.services.data.cache) {
                this.services.data.cache.clearPostsCache();
            }
            
            window.history.replaceState({ view: 'home' }, '', '#home');
            this.navigate('home', true);
            this.showToast(`Welcome, ${result.displayName}! ✨`);
            
        } catch (err) {
            console.error('Admin login handler error:', err);
            this.showToast('System synchronization failure', 'error');
        }
    }

    getCommunitiesHTML(communities) {
        return Views.communities(communities);
    }

    showCreateCommunityModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'create-community-modal';
        modal.innerHTML = Components.createCommunityModal();
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
        
        container.innerHTML = Views.communityFeed(communityName, posts);
        this.attachViewEvents();
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
                container.innerHTML = Views.profile(profileUser, userPosts, friendStatus, top8Data, vibeMatchScore);
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

    switchAdminTab(tab) {
        // Toggle tab buttons
        document.querySelectorAll('[data-admin-tab]').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-admin-tab') === tab);
        });

        // Show/hide views
        const views = ['stats', 'users', 'moderation', 'ads', 'terminal', 'neural'];
        views.forEach(v => {
            const el = document.getElementById(`admin-${v}-view`);
            if (el) el.classList.toggle('hidden', v !== tab);
        });
        
        console.log(`Switched to admin tab: ${tab}`);
        
        // Load specific data if needed
        if (tab === 'moderation') this.loadAdminReports();
        if (tab === 'users') this.loadAdminUsers();
        if (tab === 'ads') this.loadAdminAds();
    }

    async loadAdminReports() {
        const list = document.getElementById('admin-reports-list');
        if (!list) return;
        // Mock data for now as per platform state
        list.innerHTML = `
            <div class="glass-panel" style="padding:15px; margin-bottom:10px; border-left:3px solid var(--accent-pink);">
                <strong>Report #842</strong> - Identity Vibe Violation
                <p class="text-dim" style="font-size:0.8rem;">Target User: @malicious_link_01</p>
                <div style="margin-top:10px; display:flex; gap:10px;">
                    <button class="btn-primary btn-sm" style="background:var(--accent-pink);">Restrict Sync</button>
                    <button class="btn-secondary btn-sm">Dismiss</button>
                </div>
            </div>
        `;
    }

    async loadAdminUsers() {
        const list = document.getElementById('admin-users-list');
        if (!list) return;
        
        try {
            const { data: users, error } = await window.supabaseClient.from('users').select('*').limit(20);
            if (error) throw error;
            
            list.innerHTML = `
                <div style="display:flex; flex-direction:column; gap:8px;">
                    ${users.map(u => `
                        <div class="glass-panel" style="padding:10px 15px; display:flex; justify-content:space-between; align-items:center;">
                            <div style="display:flex; align-items:center; gap:10px;">
                                <img src="${u.avatar_url || 'https://i.pravatar.cc/150'}" style="width:30px; height:30px; border-radius:50%;">
                                <span>@${u.username}</span>
                            </div>
                            <div style="display:flex; gap:8px;">
                                <span class="user-badge badge-truth" style="font-size:0.6rem;">${u.role?.toUpperCase() || 'USER'}</span>
                                <button class="btn-secondary btn-sm" style="color:var(--accent-pink); border-color:var(--accent-pink);" onclick="window.App.handleBanUser('${u.id}')">Ban</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } catch (e) {
            list.innerHTML = `<p class="text-error">Failed to sync users: ${e.message}</p>`;
        }
    }

    async loadAdminAds() {
        const list = document.getElementById('admin-ads-list');
        if (!list) return;
        
        try {
            const ads = await this.services.data.getAds();
            if (!ads || ads.length === 0) {
                list.innerHTML = '<p class="text-dim">No active ad campaigns.</p>';
                return;
            }
            
            list.innerHTML = ads.map(ad => `
                <div class="glass-panel" style="padding:15px; margin-bottom:10px; border-left:3px solid var(--primary-orange); display:flex; justify-content:space-between; align-items:center;">
                    <div style="flex:1;">
                        <p style="font-weight:bold; color:white;">${ad.content.substring(0, 100)}${ad.content.length > 100 ? '...' : ''}</p>
                        <p class="text-dim" style="font-size:0.75rem; margin-top:5px;">Link: <a href="${ad.link}" target="_blank" style="color:var(--accent-cyan);">${ad.link || 'Internal'}</a></p>
                    </div>
                    <button class="btn-secondary btn-sm" onclick="window.App.handleDeleteAd('${ad.id}')" style="color:var(--accent-pink); border-color:var(--accent-pink); padding:5px 12px;">Delete</button>
                </div>
            `).join('');
        } catch (e) {
            list.innerHTML = `<p class="text-error">Failed to sync ads: ${e.message}</p>`;
        }
    }

    async handleDeleteAd(adId) {
        if (!confirm('Are you sure you want to pull this campaign?')) return;
        
        const result = await this.services.admin.deleteAd(adId);
        if (result.success) {
            this.showToast('Ad campaign terminated.', 'success');
            this.loadAdminAds();
        } else {
            this.showToast(result.error || 'Failed to delete ad', 'error');
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
            this.loadAdminAds(); // Refresh the list
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
        const emojiMap = { cap: '🧢', wild: '🤯', like: '👍', dislike: '👎', heat: '🔥', admire: '🙏', relate: '🙏' }; // Added relate
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
        const labelMap = { cap: 'CAP!', wild: 'WILD!', like: 'LIKED!', dislike: 'NAH!', heat: 'HEAT!', admire: 'RESPECT!', relate: 'RELATE!' }; // Added relate
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
    
    executeTerminalCommand(command) {
        const input = document.getElementById('terminal-input');
        if (input) input.value = '';

        const output = document.getElementById('terminal-output');
        if (!output) return;

        const cmd = command.trim().toLowerCase();
        const response = (text) => {
            const line = document.createElement('div');
            line.textContent = `> ${text}`;
            output.appendChild(line);
            output.scrollTop = output.scrollHeight;
        };

        response(command);

        switch(cmd) {
            case 'help':
                response('Available commands:');
                response(' stats - Show quick platform statistics');
                response(' users - List active users');
                response(' reload - Refresh reality');
                response(' clear - Wipe terminal history');
                response(' ping - Check connection latency');
                break;
            case 'stats':
                response('Vibrational Density: 84%');
                response('Global Pulse: Synchronized');
                response('Neural Links: Stable');
                break;
            case 'ping':
                response('Pong! Latency: 42ms');
                break;
            case 'clear':
                output.innerHTML = '<div>[SYSTEM] Memory purged.</div>';
                break;
            case 'reload':
                response('Reloading reality...');
                setTimeout(() => window.location.reload(), 1000);
                break;
            default:
                response(`Error: Command '${cmd}' not found.`);
        }
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.App = new VibeApp();
});