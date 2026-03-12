import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://osfqlabtuqpynqcdmwff.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zZnFsYWJ0dXFweW5xY2Rtd2ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5ODQ3OTEsImV4cCI6MjA4NzU2MDc5MX0.LXZ-lbLiarXHSSlu8NXi0c_uvIVFxh8mw6amXGJAwtA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("Testing signInWithPassword...");
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'yamasseetechnology@gmail.com',
        password: 'citawoo789'
    });
    if (authError) {
        console.error("Auth failed:", authError.message);
        return;
    }
    console.log("Auth success, ID:", authData.user.id);
    
    const { data: posts, error: pErr } = await supabase
        .from('posts')
        .select('*')
        .limit(3);
    
    if (pErr) console.error(pErr);
    else console.log("Fetched " + posts.length + " posts from timeline.");
}

run();
