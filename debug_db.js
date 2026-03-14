
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://osfqlabtuqpynqcdmwff.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zZnFsYWJ0dXFweW5xY2Rtd2ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5ODQ3OTEsImV4cCI6MjA4NzU2MDc5MX0.LXZ-lbLiarXHSSlu8NXi0c_uvIVFxh8mw6amXGJAwtA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
    console.log("Checking tables...");
    
    // Try a simple select to test connection and table availability
    try {
        const { data, error } = await supabase.from('live_streams').select('*').limit(1);
        if (error) {
            console.error("Error fetching live_streams:", error.message);
        } else {
            console.log("live_streams table exists and is accessible.");
        }
    } catch (e) {
        console.error("Exception:", e);
    }
}

checkTables();
