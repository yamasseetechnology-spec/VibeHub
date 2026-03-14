
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://osfqlabtuqpynqcdmwff.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zZnFsYWJ0dXFweW5xY2Rtd2ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5ODQ3OTEsImV4cCI6MjA4NzU2MDc5MX0.LXZ-lbLiarXHSSlu8NXi0c_uvIVFxh8mw6amXGJAwtA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function forceLoadSampleData() {
    console.log("Forcing load of sample data...");
    
    const sampleUsers = [
        { id: 'u1', username: 'echo_mind', email: 'echo@vibehub.com', name: 'Echo Mind', role: 'user' },
        { id: 'u2', username: 'cyber_soul', email: 'cyber@vibehub.com', name: 'Cyber Soul', role: 'user' }
    ];
    
    // UPSERT users
    for (const user of sampleUsers) {
        await supabase.from('users').upsert([user]);
    }

    const samplePosts = [
        { id: crypto.randomUUID(), user_id: 'u1', username: 'echo_mind', text: 'The geometry of thought is fascinating.', created_at: new Date().toISOString() },
        { id: crypto.randomUUID(), user_id: 'u2', username: 'cyber_soul', text: 'Neon dreams in a digital world. 🏙️✨', created_at: new Date().toISOString() }
    ];
    
    const { error } = await supabase.from('posts').insert(samplePosts);
    if (error) console.error("Error inserting posts:", error);
    else console.log("Sample posts inserted!");
}

forceLoadSampleData();
