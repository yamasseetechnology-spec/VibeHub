
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://osfqlabtuqpynqcdmwff.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zZnFsYWJ0dXFweW5xY2Rtd2ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5ODQ3OTEsImV4cCI6MjA4NzU2MDc5MX0.LXZ-lbLiarXHSSlu8NXi0c_uvIVFxh8mw6amXGJAwtA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function populateUsers() {
    console.log("Populating missing users...");
    
    // 1. Get all unique user_ids
    const { data: posts } = await supabase.from('posts').select('user_id');
    const uniqueUserIds = [...new Set(posts.map(p => p.user_id))];
    
    // 2. Get existing users
    const { data: existingUsers } = await supabase.from('users').select('id, username');
    const existingIds = new Set(existingUsers.map(u => u.id));
    const existingUsernames = new Set(existingUsers.map(u => u.username));
    
    // 3. Create missing
    for (const userId of uniqueUserIds) {
        if (!userId) continue;
        
        // If it's a UUID, check if it's in existingIds. If it's a string, check existingUsernames.
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
        
        if (isUUID && existingIds.has(userId)) continue;
        if (!isUUID && existingUsernames.has(userId)) continue;
        
        console.log("Creating user for:", userId);
        
        // Create dummy user
        await supabase.from('users').insert([{
            id: isUUID ? userId : crypto.randomUUID(),
            username: isUUID ? 'user_' + userId.slice(0, 5) : userId,
            name: isUUID ? 'User ' + userId.slice(0, 5) : userId,
            role: 'user'
        }]);
    }
    console.log("Users populated!");
}

populateUsers();
