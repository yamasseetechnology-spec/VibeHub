// Debug script for Admin Login Verification
(function() {
    console.log("🛠️ Starting Admin Login Debug Verification...");

    const checkAppReady = setInterval(() => {
        if (window.App && document.getElementById('admin-login-email')) {
            clearInterval(checkAppReady);
            runTests();
        }
    }, 1000);

    async function runTests() {
        const mockEmail = 'KingKool23';
        const mockPass = 'citawoo789';

        console.log("🔍 Checking for login forms...");
        const emailInput = document.getElementById('admin-login-email');
        const passInput = document.getElementById('admin-login-password');
        const emailInputAlt = document.getElementById('admin-login-email-alt');
        const passInputAlt = document.getElementById('admin-login-password-alt');

        console.log(`Primary form inputs: ${!!emailInput}, ${!!passInput}`);
        console.log(`Alt form inputs: ${!!emailInputAlt}, ${!!passInputAlt}`);

        if (emailInput && passInput) {
            emailInput.value = mockEmail;
            passInput.value = mockPass;
            console.log("✅ Primary credentials injected");
            console.log("🚀 Triggering primary admin login handle...");
            await window.App.handleAdminLogin();
        } else if (emailInputAlt && passInputAlt) {
            emailInputAlt.value = mockEmail;
            passInputAlt.value = mockPass;
            console.log("✅ Alt credentials injected");
            console.log("🚀 Triggering alt admin login handle...");
            await window.App.handleAdminLogin('alt');
        } else {
            console.error("❌ No admin login inputs found. Toggling dropdown...");
            const trigger = document.querySelector('.admin-dropdown-trigger');
            if (trigger) {
                trigger.click();
                setTimeout(runTests, 500);
            }
        }
    }
})();
