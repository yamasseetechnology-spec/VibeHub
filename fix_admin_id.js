import { createClient } from '@supabase/supabase-js';

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
    const realId = authData.user.id;
    console.log("Auth success, ID:", realId);

    // Try to update users table
    const { data, error } = await supabase
        .from('users')
        .update({ id: realId })
        .eq('id', '00000000-0000-0000-0000-000000000001');
    
    if (error) {
        console.error("Update users table failed:", error);
    } else {
        console.log("Update users table success:", data);
    }
    
    // Also update posts... but cascading might have handled it. Let's see if we see errors.
}

run();
