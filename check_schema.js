import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const dotenv = fs.readFileSync('.env', 'utf8');
const SUPABASE_URL = dotenv.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_ANON_KEY = dotenv.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
    const { data: posts, error: pErr } = await supabase.from('posts').select('*').limit(1);
    console.log("Posts table sample:");
    console.log(posts, pErr);
    
    const { data: notifs, error: nErr } = await supabase.from('notifications').select('*').limit(1);
    console.log("\nNotifications table sample:");
    console.log(notifs, nErr);
}
run();
