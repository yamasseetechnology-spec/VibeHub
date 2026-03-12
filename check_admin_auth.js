import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://osfqlabtuqpynqcdmwff.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zZnFsYWJ0dXFweW5xY2Rtd2ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5ODQ3OTEsImV4cCI6MjA4NzU2MDc5MX0.LXZ-lbLiarXHSSlu8NXi0c_uvIVFxh8mw6amXGJAwtA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAdmin() {
    console.log("Checking Admin Auth in Supabase...");
    const email = 'yamasseetechnology@gmail.com';
    const password = 'citawoo789';

    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (loginError) {
        console.error("Login Failed:", loginError.message);
        console.log("Attempting to sign up admin...");
        
        const { data: signupData, error: signupError } = await supabase.auth.signUp({
            email,
            password
            // optionally autoConfirm: true if we had service role key but we only have anon
        });
        
        if (signupError) {
            console.error("Signup Failed:", signupError.message);
        } else {
            console.log("✅ Admin signed up successfully in Supabase Auth:", signupData.user?.id);
        }
    } else {
        console.log("✅ Admin login successful in Supabase Auth:", loginData.user?.id);
    }
}

checkAdmin();

