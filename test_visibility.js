
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://osfqlabtuqpynqcdmwff.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zZnFsYWJ0dXFweW5xY2Rtd2ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5ODQ3OTEsImV4cCI6MjA4NzU2MDc5MX0.LXZ-lbLiarXHSSlu8NXi0c_uvIVFxh8mw6amXGJAwtA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testVisibility() {
    console.log("Testing post visibility...");
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'test_user_1773440072006@example.com',
        password: 'Password123!'
    });
    
    if (authError) {
        console.error("Login failed:", authError.message);
        return;
    }
    
    // Fetch all posts as regular user
    const { data: posts, error: postsErr } = await supabase
        .from('posts')
        .select('*');
    
    if (postsErr) console.error("Error fetching all posts:", postsErr);
    else console.log("Fetched " + posts.length + " posts.");
}

testVisibility();
