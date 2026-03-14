
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://osfqlabtuqpynqcdmwff.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zZnFsYWJ0dXFweW5xY2Rtd2ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5ODQ3OTEsImV4cCI6MjA4NzU2MDc5MX0.LXZ-lbLiarXHSSlu8NXi0c_uvIVFxh8mw6amXGJAwtA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPosts() {
    console.log("Checking posts...");
    
    // Fetch all posts as regular user
    const { data: posts, error: pErr } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (pErr) {
        console.error("Posts fetch error:", pErr);
    } else {
        console.log("Fetched " + posts.length + " posts.");
        if (posts.length > 0) {
            console.log("First post:", posts[0]);
        } else {
            console.log("No posts found. Timeline empty.");
        }
    }
}

checkPosts();
