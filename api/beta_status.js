import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
export default async function handler(req, res) {
  const { data, error, count } = await supabase.from('users').select('*', { count: 'exact' });
  res.status(200).json({ total_users: count || 0 });
}
