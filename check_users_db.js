
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://osfqlabtuqpynqcdmwff.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zZnFsYWJ0dXFweW5xY2Rtd2ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5ODQ3OTEsImV4cCI6MjA4NzU2MDc5MX0.LXZ-lbLiarXHSSlu8NXi0c_uvIVFxh8mw6amXGJAwtA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
    console.log("Checking users...");
    
    // Check if user 'TestUser' exists
    try {
        const { data, error } = await supabase.from('users').select('*').eq('username', 'TestUser');
        if (error) {
            console.error("Error fetching users:", error.message);
        } else {
            console.log("Users found:", data.length);
        }
    } catch (e) {
        console.error("Exception:", e);
    }
}

checkUsers();
