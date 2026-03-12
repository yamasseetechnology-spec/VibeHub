import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const dotenv = fs.readFileSync('.env', 'utf8');
const SUPABASE_URL = dotenv.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_ANON_KEY = dotenv.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
    const { data: posts, error: pErr } = await supabase.from('posts').select('*').limit(1);
    console.log("Posts keys:", posts && posts.length > 0 ? Object.keys(posts[0]) : "none");
    
    const { data: notifs, error: nErr } = await supabase.from('notifications').select('*').limit(1);
    // if empty, let's insert a dummy one then log keys
    if (notifs && notifs.length === 0) {
        const { data: dummy, error: dummyErr } = await supabase.from('notifications').insert([{
            user_id: 'e6915a7d-762c-493e-ac17-8b9434563080',
            type: 'like'
        }]).select().single();
        console.log("Inserted dummy notification keys:", dummy ? Object.keys(dummy) : dummyErr);
        // clean up
        if (dummy) await supabase.from('notifications').delete().eq('id', dummy.id);
    } else {
        console.log("Notifications keys:", notifs && notifs.length > 0 ? Object.keys(notifs[0]) : nErr);
    }
}
run();
