
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://osfqlabtuqpynqcdmwff.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zZnFsYWJ0dXFweW5xY2Rtd2ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5ODQ3OTEsImV4cCI6MjA4NzU2MDc5MX0.LXZ-lbLiarXHSSlu8NXi0c_uvIVFxh8mw6amXGJAwtA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function sendMessage() {
    console.log("Sending message to admin...");
    // Regular user
    const { data: user } = await supabase.auth.signInWithPassword({
        email: 'test_user_1773440072006@example.com',
        password: 'Password123!'
    });
    
    if (!user.user) {
        console.error("Login failed");
        return;
    }

    // Get admin ID
    const { data: admin } = await supabase
        .from('users')
        .select('id')
        .eq('username', 'KingKool23')
        .single();
    
    // Insert message
    const { data, error } = await supabase
        .from('messages')
        .insert([{
            conversation_id: [user.user.id, admin.id].sort().join('_'),
            sender_id: user.user.id,
            sender_username: 'test_user',
            receiver_id: admin.id,
            text: 'KingKool23',
            read: false
        }]);
    
    if (error) console.error("Message send error:", error);
    else console.log("Message sent!");
}

sendMessage();
