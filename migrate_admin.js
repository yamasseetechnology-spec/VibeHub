import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://osfqlabtuqpynqcdmwff.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zZnFsYWJ0dXFweW5xY2Rtd2ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5ODQ3OTEsImV4cCI6MjA4NzU2MDc5MX0.LXZ-lbLiarXHSSlu8NXi0c_uvIVFxh8mw6amXGJAwtA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: oldUser, error: oldErr } = await supabase
        .from('users')
        .select('*')
        .eq('email', 'yamasseetechnology@gmail.com')
        .single();
    
    if (oldUser) {
        console.log("Found 0001 user, trying to recreate it with the real ID...");
        // Modify old user's email to not clash
        await supabase.from('users').update({ email: 'backup_' + oldUser.email }).eq('id', '00000000-0000-0000-0000-000000000001');

        // Create new user with proper ID
        oldUser.id = 'e6915a7d-762c-493e-ac17-8b9434563080';
        // Now insert
        const { data, error } = await supabase.from('users').insert([oldUser]);
        console.log("Insert result:", error ? error.message : "Success");
        
        // Try to update posts for this user
        const { data: pData, error: pErr } = await supabase.from('posts').update({ user_id: oldUser.id }).eq('user_id', '00000000-0000-0000-0000-000000000001');
        console.log("Posts update:", pErr ? pErr.message : "Success");
        
        // Also fix the timeline... Wait, timeline is built from posts. 
    } else {
        console.log("Could not fetch old user:", oldErr);
    }
}

run();
