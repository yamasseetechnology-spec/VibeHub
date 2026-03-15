/**
 * VIBEHUB EMERGENCY REPAIR UTILITY
 * Clears all local state, service workers, and caches.
 */

async function performHardReset() {
    console.log("Initiating Hard Reset...");
    
    // 1. Clear Storage
    localStorage.clear();
    sessionStorage.clear();
    console.log("Storage cleared.");

    // 2. Unregister Service Workers
    if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (let registration of registrations) {
            await registration.unregister();
        }
        console.log("Service Workers unregistered.");
    }

    // 3. Clear Caches
    if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (let cacheName of cacheNames) {
            await caches.delete(cacheName);
        }
        console.log("Caches deleted.");
    }

    // 4. Force Logout via Supabase (if possible)
    if (window.App && window.App.services && window.App.services.auth) {
        try {
            await window.App.services.auth.logout();
            console.log("Supabase logout successful.");
        } catch (e) {
            console.log("Supabase logout failed or already disconnected.");
        }
    }

    // 5. Reload with cache busting
    console.log("Reloading...");
    window.location.href = window.location.origin + window.location.pathname + '?v=' + Date.now();
}

// Global exposure
window.performHardReset = performHardReset;

console.log("VibeHub Repair Utility Loaded. Run window.performHardReset() if stuck.");
