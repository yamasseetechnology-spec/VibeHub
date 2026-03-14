
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://osfqlabtuqpynqcdmwff.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zZnFsYWJ0dXFweW5xY2Rtd2ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5ODQ3OTEsImV4cCI6MjA4NzU2MDc5MX0.LXZ-lbLiarXHSSlu8NXi0c_uvIVFxh8mw6amXGJAwtA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMessages() {
    console.log("Checking messages for admin...");
    
    // Get admin ID
    const { data: admin } = await supabase
        .from('users')
        .select('id')
        .eq('username', 'KingKool23')
        .single();
    
    if (!admin) {
        console.error("Admin not found");
        return;
    }
    
    // Fetch messages where receiver_id is admin
    const { data: messages, error: mErr } = await supabase
        .from('messages')
        .select('*')
        .eq('receiver_id', admin.id);
    
    if (mErr) console.error("Message fetch error:", mErr);
    else console.log("Admin has " + messages.length + " messages. First message:", messages[0]);
    
    // Fetch notifications
    const { data: notifications, error: nErr } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', admin.id);
        
    if (nErr) console.error("Notification fetch error:", nErr);
    else console.log("Admin has " + notifications.length + " notifications.");
}

checkMessages();
