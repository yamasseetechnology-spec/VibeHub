import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const dotenv = fs.readFileSync('.env', 'utf8');
const urlMatch = dotenv.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = dotenv.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

const SUPABASE_URL = urlMatch[1].trim();
const SUPABASE_ANON_KEY = keyMatch[1].trim();

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runTests() {
    console.log("=== VIBEHUB FEATURE VERIFICATION ===");
    
    // 1. Authenticate (using a test account or sign up a temporary one)
    const testEmail = `verify_${Date.now()}@gmail.com`;
    const testPassword = 'Password123!';
    
    console.log(`[TEST 1] Creating temporary test user: ${testEmail}`);
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
        options: {
            data: { full_name: 'Test Verify', username: `verify_${Date.now()}` }
        }
    });

    if (authError && !authData?.session) {
        console.error("❌ Authentication failed. Cannot verify downstream features.", authError.message);
        return;
    }
    
    // Fallback login if signup returns false but user was created
    let session = authData?.session;
    let user = authData?.user;
    
    if (!session) {
        const loginRes = await supabase.auth.signInWithPassword({
            email: testEmail,
            password: testPassword
        });
        session = loginRes.data?.session;
        user = loginRes.data?.user || user;
    }
    
    if (!session || !user) {
        console.error("❌ Failed to establish valid session.");
        return;
    }
    
    console.log(`✅ Authentication successful. User ID: ${user.id}`);
    
    // Set auth context for subsequent RLS queries
    
    // 2. Fetch Posts (See if user can read public posts)
    console.log("\n[TEST 2] Fetching timeline posts...");
    const { data: posts, error: fetchError } = await supabase.from('posts').select('*').limit(5);
    if (fetchError) {
        console.error("❌ Failed to read posts:", fetchError.message);
    } else {
        console.log(`✅ Successfully fetched ${posts.length} posts from timeline.`);
    }
    
    // 3. Create a Post
    console.log("\n[TEST 3] Creating a new post...");
    const newPost = {
        id: crypto.randomUUID(),
        user_id: user.id,
        username: user.user_metadata?.username || 'test_user',
        text: 'Automated verification post!',
        media_type: 'none',
        reactions: { like: [], cap: [], relate: [], wild: [], facts: [] },
        likes: [],
        dislikes: [],
        comments: []
    };
    
    let createdPostId = null;
    const { data: insertData, error: insertError } = await supabase.from('posts').insert([newPost]).select();
    if (insertError) {
        console.error("❌ Failed to create post:", insertError.message);
    } else {
        createdPostId = insertData[0]?.id;
        console.log(`✅ Successfully created post ID: ${createdPostId}`);
    }
    
    // 4. React to a Post
    if (createdPostId) {
        console.log("\n[TEST 4] Adding a like reaction to the post...");
        const { data: reactData, error: reactError } = await supabase.from('posts')
            .update({ likes: [user.id] })
            .eq('id', createdPostId)
            .select('likes');
            
        if (reactError) {
            console.error("❌ Failed to react to post:", reactError.message);
        } else {
            console.log(`✅ Successfully reacted! Likes count: ${reactData[0]?.likes?.length}`);
        }
        
        // 5. Add a comment
        console.log("\n[TEST 5] Adding a comment to the post...");
        const newComment = {
            post_id: createdPostId,
            user_id: user.id,
            username: user.user_metadata?.username || 'test_user',
            text: 'This is a test comment.'
        };
        const { data: commentData, error: commentError } = await supabase.from('comments').insert([newComment]).select();
        
        if (commentError) {
            console.error("❌ Failed to add comment:", commentError.message);
        } else {
            console.log(`✅ Successfully added comment ID: ${commentData[0]?.id}`);
        }
    } else {
        console.log("\n⚠️ Skipping reaction and comment tests because post creation failed.");
    }
    
    console.log("\n=== VERIFICATION COMPLETE ===");
}

runTests();
