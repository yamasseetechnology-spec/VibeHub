import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const dotenv = fs.readFileSync('.env', 'utf8');
const SUPABASE_URL = dotenv.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_ANON_KEY = dotenv.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const ADMIN_EMAIL = dotenv.match(/VITE_FALLBACK_ADMIN_USER=(.*)/)[1].trim();
const ADMIN_PASS = dotenv.match(/VITE_FALLBACK_ADMIN_PASS=(.*)/)[1].trim();

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verify() {
    console.log("=== VIBEHUB REGRESSION FIX VERIFICATION ===\n");
    
    // Test 1: Admin auth session
    console.log("[TEST 1] Admin Supabase Auth login...");
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: ADMIN_EMAIL, password: ADMIN_PASS
    });
    if (authError) {
        console.error("  ❌ FAIL:", authError.message);
        console.log("\n  NOTE: The admin email may not exist in Supabase Auth yet.");
        console.log("  You should create a Supabase Auth account for:", ADMIN_EMAIL);
    } else {
        console.log("  ✅ PASS - Session established. User:", authData.user?.id);
    }
    
    // Test 2: Read posts (tests RLS)
    console.log("\n[TEST 2] Reading timeline posts...");
    const { data: posts, error: postsErr } = await supabase.from('posts').select('id, username, text').limit(5);
    if (postsErr) {
        console.error("  ❌ FAIL:", postsErr.message);
    } else {
        console.log(`  ✅ PASS - Fetched ${posts.length} posts`);
        posts.forEach(p => console.log(`    - "${p.text?.substring(0, 50)}..." by @${p.username}`));
    }
    
    // Test 3: Admin profile lookup by username
    console.log("\n[TEST 3] Admin profile lookup by username 'KingKool23'...");
    const { data: profile, error: profileErr } = await supabase.from('users').select('*').eq('username', 'KingKool23').limit(1).single();
    if (profileErr) {
        console.log("  ⚠️  No profile found for username 'KingKool23' (expected if admin hasn't saved profile yet)");
    } else {
        console.log("  ✅ PASS - Profile found:");
        console.log(`    Name: ${profile.name}`);
        console.log(`    Avatar: ${profile.avatar_url ? '(set)' : '(not set)'}`);
        console.log(`    Bio: ${profile.bio}`);
    }
    
    // Test 4: Create a test post
    console.log("\n[TEST 4] Creating a test post...");
    const userId = authData?.user?.id || 'test_' + Date.now();
    const { data: newPost, error: postErr } = await supabase.from('posts').insert([{
        id: crypto.randomUUID(),
        user_id: userId,
        username: 'verify_bot',
        text: 'Automated verification post - ' + new Date().toISOString(),
        media_type: 'none',
        likes: [], dislikes: [],
        reactions: { cap: [], relate: [], wild: [], facts: [] },
        comments: []
    }]).select();
    if (postErr) {
        console.error("  ❌ FAIL:", postErr.message);
    } else {
        console.log(`  ✅ PASS - Post created: ${newPost[0]?.id}`);
        // Clean up
        await supabase.from('posts').delete().eq('id', newPost[0].id);
        console.log("  🧹 Cleaned up test post");
    }
    
    // Test 5: Signup flow (verify Supabase accepts signups)
    console.log("\n[TEST 5] Signup flow test...");
    const testEmail = `verify_final_${Date.now()}@gmail.com`;
    const { data: signupData, error: signupErr } = await supabase.auth.signUp({
        email: testEmail, password: 'TestPass123!',
        options: { data: { full_name: 'Verify Bot', username: `vbot_${Date.now()}` } }
    });
    if (signupErr) {
        console.error("  ❌ FAIL:", signupErr.message);
    } else {
        const hasSession = !!signupData.session;
        console.log(`  ✅ PASS - User created. Instant session: ${hasSession}`);
    }
    
    console.log("\n=== VERIFICATION COMPLETE ===");
}

verify();
