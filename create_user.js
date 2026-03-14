
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://osfqlabtuqpynqcdmwff.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zZnFsYWJ0dXFweW5xY2Rtd2ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5ODQ3OTEsImV4cCI6MjA4NzU2MDc5MX0.LXZ-lbLiarXHSSlu8NXi0c_uvIVFxh8mw6amXGJAwtA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createUser() {
    const email = 'test_user_' + Date.now() + '@example.com';
    const password = 'Password123!';
    
    console.log("Registering user:", email);
    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
            data: { full_name: 'Test User' }
        }
    });

    if (error) {
        console.error("Signup error:", error);
    } else {
        console.log("Signup success:", data.user.id);
        
        // Also ensure user record exists
        const { error: userErr } = await supabase.from('users').insert([{
            id: data.user.id,
            email: email,
            username: 'test_user',
            name: 'Test User',
            role: 'user'
        }]);
        if (userErr) console.error("User insert error:", userErr);
        else console.log("User record created");
    }
}

createUser();
