/**
 * VIBEHUB DIAGNOSTIC UTILITY (Advanced)
 * Run this to verify connectivity, session state, and database counts.
 */

async function runVibeDiagnostics() {
    console.log("%c--- VIBEHUB DEEP AUDIT ---", "color: #9d50bb; font-size: 16px; font-weight: bold;");
    
    try {
        const authService = window.App?.services?.auth;
        const supabase = authService?.supabaseClient || (await import('./services.js')).supabaseClient;

        if (!supabase) {
            console.error("❌ Supabase client NOT FOUND. This indicates a major initialization error.");
            return;
        }

        // 1. Session Check
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
            console.error("❌ Session error:", sessionError);
        } else if (session) {
            console.log("✅ Logged in as:", session.user.email);
            
            // 2. Profile Check
            const { data: profile } = await supabase.from('users').select('*').eq('id', session.user.id).maybeSingle();
            if (profile) {
                console.log("✅ DB Profile found:", profile);
                console.log("Role:", profile.role);
            } else {
                console.warn("⚠️ No record in 'users' table. Trying to create one...");
                await authService.ensureProfileExists(session.user);
            }
        } else {
            console.warn("⚠️ No active session detected. Please log in.");
        }

        // 3. Database Integrity Check
        console.log("Querying Supabase visibility...");
        const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
        const { count: postCount } = await supabase.from('posts').select('*', { count: 'exact', head: true });
        
        console.log("Total Registered Users:", userCount);
        console.log("Total Posts in DB:", postCount);

        // 4. Feed Audit
        console.log("Verifying Timeline Query...");
        const { data: rawPosts, error: rawError } = await supabase.from('posts').select('*').limit(5);
        if (rawError) console.error("❌ Basic post fetch failed:", rawError);
        else console.log("✅ Manual raw fetch returned:", rawPosts.length, "posts.");

        const { data: joinedPosts, error: joinError } = await supabase.from('posts').select('*, users(*)').limit(5);
        if (joinError) console.error("❌ Joined post fetch failed:", joinError);
        else console.log("✅ Joined fetch returned:", joinedPosts.length, "posts.");

        if (postCount > 0 && joinedPosts?.length === 0) {
            console.error("🚨 VISIBILITY GAP: Posts exist in DB but aren't appearing in joined queries. Profile link mismatch suspected.");
        }

    } catch (err) {
        console.error("❌ Diagnostic crashed:", err);
    }
    
    console.log("%c--- AUDIT COMPLETE ---", "color: #9d50bb; font-weight: bold;");
}

window.runVibeDiagnostics = runVibeDiagnostics;
console.log("Audit tool ready. Run window.runVibeDiagnostics() in console.");
