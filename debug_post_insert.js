import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const dotenv = fs.readFileSync('.env', 'utf8');
const SUPABASE_URL = dotenv.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_ANON_KEY = dotenv.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
    console.log("=== Debugging Post Insertion ===");
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({ 
        email: 'yamasseetechnology@gmail.com', password: 'citawoo789' 
    });
    
    if (authErr) {
        console.error("Auth Error:", authErr);
        return;
    }
    
    let u1Id = authData.user.id;
    console.log("Logged in as:", u1Id);
    
    const postObj = {
        id: crypto.randomUUID(),
        user_id: u1Id,
        username: 'KingKool23',
        handle: 'KingKool23',
        text: 'Debugging insertion...',
        media_type: 'none'
    };
    
    console.log("Attempting to insert:", postObj);
    const { data, error } = await supabase.from('posts').insert([postObj]).select();
    
    console.log("\nResult:");
    console.log("Data:", data);
    console.log("Error:", error);
}

run();
