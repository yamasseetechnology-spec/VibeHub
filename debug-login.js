// Debug script for Admin Login Verification
(function() {
    console.log("🛠️ Starting Admin Login Debug Verification...");

    // Mock inputs if they don't exist (e.g. if we are running in a headless-ish way or just want to test logic)
    const mockEmail = 'KingKool23';
    const mockPass = 'citawoo789';

    const emailInput = document.getElementById('admin-login-email');
    const passInput = document.getElementById('admin-login-password');

    if (emailInput && passInput) {
        emailInput.value = mockEmail;
        passInput.value = mockPass;
        console.log("✅ Credentials injected into form");
        
        // Intercept log to verify flow
        const originalLog = console.log;
        console.log = function(...args) {
            if (args[0]?.includes('AuthService.login')) {
                originalLog("✅ Flow reached AuthService.login");
            }
            if (args[0]?.includes('Admin session established')) {
                originalLog("🎉 SUCCESS: Admin session established!");
            }
            originalLog.apply(console, args);
        };

        // Trigger the login
        window.App.handleAdminLogin().then(() => {
            console.log("⚙️ Login operation completed.");
        }).catch(err => {
            console.error("❌ Login operation failed:", err);
        });
    } else {
        console.error("❌ Could not find admin login inputs. Is the login screen visible?");
    }
})();
