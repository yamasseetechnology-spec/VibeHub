// Simple test to verify VibeHub app loads without syntax errors
console.log("Testing VibeHub app initialization...");

// Test if essential classes are defined
function testInitialization() {
    try {
        console.log("AuthService defined:", typeof AuthService);
        console.log("DataService defined:", typeof DataService);
        console.log("VideoService defined:", typeof VideoService);
        console.log("ChatService defined:", typeof ChatService);
        console.log("AdminService defined:", typeof AdminService);
        console.log("VibeApp defined:", typeof VibeApp);
        
        console.log("✅ VibeHub app test completed");
        
    } catch (error) {
        console.error("❌ Test failed with error:", error);
    }
}

// Start testing after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        testInitialization();
    }, 1000);
});