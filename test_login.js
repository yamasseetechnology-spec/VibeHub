
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://osfqlabtuqpynqcdmwff.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zZnFsYWJ0dXFweW5xY2Rtd2ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5ODQ3OTEsImV4cCI6MjA4NzU2MDc5MX0.LXZ-lbLiarXHSSlu8NXi0c_uvIVFxh8mw6amXGJAwtA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLogin() {
    console.log("Testing sign in...");
    const { data, error } = await supabase.auth.signInWithPassword({
        email: 'test_user_1773440072006@example.com',
        password: 'Password123!'
    });
    
    if (error) {
        console.error("Login failed:", error.message);
    } else {
        console.log("Login success! User:", data.user.id);
        
        // Fetch posts for this user
        const { data: posts, error: postsErr } = await supabase
            .from('posts')
            .select('*')
            .eq('user_id', data.user.id);
        
        if (postsErr) console.error("Error fetching user posts:", postsErr);
        else console.log("Fetched " + posts.length + " posts for this user.");
    }
}

testLogin();
