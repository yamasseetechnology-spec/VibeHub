
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://osfqlabtuqpynqcdmwff.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zZnFsYWJ0dXFweW5xY2Rtd2ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5ODQ3OTEsImV4cCI6MjA4NzU2MDc5MX0.LXZ-lbLiarXHSSlu8NXi0c_uvIVFxh8mw6amXGJAwtA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAdminStatus() {
    console.log("Checking admin user...");
    
    // Check if user 'KingKool23' has role 'admin'
    try {
        const { data, error } = await supabase.from('users').select('username, role, is_admin').eq('username', 'KingKool23');
        if (error) {
            console.error("Error fetching admin:", error.message);
        } else {
            console.log("Admin record:", data);
        }
    } catch (e) {
        console.error("Exception:", e);
    }
}

checkAdminStatus();
