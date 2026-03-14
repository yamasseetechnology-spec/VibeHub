
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://osfqlabtuqpynqcdmwff.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zZnFsYWJ0dXFweW5xY2Rtd2ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5ODQ3OTEsImV4cCI6MjA4NzU2MDc5MX0.LXZ-lbLiarXHSSlu8NXi0c_uvIVFxh8mw6amXGJAwtA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPostsTable() {
    console.log("Checking posts...");
    
    // Check if table exists and has rows
    try {
        const { data, error, count } = await supabase.from('posts').select('*', { count: 'exact' });
        if (error) {
            console.error("Error fetching posts:", error.message);
        } else {
            console.log("Posts count:", count);
            console.log("First post:", data[0]);
        }
    } catch (e) {
        console.error("Exception:", e);
    }
}

checkPostsTable();
