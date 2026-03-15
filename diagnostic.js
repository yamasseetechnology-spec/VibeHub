/**
 * VIBEHUB DIAGNOSTIC UTILITY
 * Run this to verify connectivity, session state, and database counts.
 */

async function runVibeDiagnostics() {
    console.log("%c--- VIBEHUB RADICAL DIAGNOSTICS ---", "color: #9d50bb; font-size: 16px; font-weight: bold;");
    
    try {
        // 1. Check Supabase Client
        if (!window.App || !window.App.services) {
            console.error("❌ App or Services not initialized on window.App");
        } else {
            console.log("✅ App services found.");
        }

        const authService = window.App?.services?.auth;
        const supabase = authService?.supabaseClient || (await import('./services.js')).supabaseClient;

        if (!supabase) {
            console.error("❌ Supabase client NOT FOUND.");
            return;
        }

        // 2. Check Auth Session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
            console.error("❌ Session error:", sessionError);
        } else if (session) {
            console.log("✅ Authenticated as:", session.user.email);
            console.log("User ID:", session.user.id);
            
            // 3. Check Profile record
            const { data: profile } = await supabase.from('users').select('*').eq('id', session.user.id).maybeSingle();
            if (profile) {
                console.log("✅ Profile found in 'users' table:", profile);
                console.log("Role:", profile.role);
            } else {
                console.warn("⚠️ No profile record found in 'users' table for this ID.");
            }
        } else {
            console.warn("⚠️ No active session found.");
        }

        // 4. Check Table Counts
        console.log("Checking database records...");
        const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
        const { count: postCount } = await supabase.from('posts').select('*', { count: 'exact', head: true });
        
        console.log("Total Users in DB:", userCount);
        console.log("Total Posts in DB:", postCount);

        // 5. Check Home Feed Logic
        console.log("Attempting to fetch feed...");
        const { data: posts, error: postError } = await supabase
            .from('posts')
            .select(`*, users(id, username)`)
            .limit(5);
        
        if (postError) {
            console.error("❌ Error fetching posts:", postError);
        } else {
            console.log("✅ Raw posts fetched:", posts);
            if (posts.length === 0) {
                console.warn("⚠️ Database is CONNECTED but returned 0 posts.");
            }
        }

    } catch (err) {
        console.error("❌ Diagnostic crashed:", err);
    }
    
    console.log("%c--- DIAGNOSTIC COMPLETE ---", "color: #9d50bb; font-weight: bold;");
}

window.runVibeDiagnostics = runVibeDiagnostics;
console.log("Diagnostic tool ready. Run window.runVibeDiagnostics() in console.");
