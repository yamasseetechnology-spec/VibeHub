// Public beta signup API
// Expects { email: string, metadata: object }
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const { email, metadata } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Email required' });
    return;
  }
  try {
    const { data, error } = await supabase.rpc('enforce_beta_signup_and_convert', {
      p_email: email,
      p_metadata: metadata || null
    });
    if (error) {
      res.status(400).json({ error: error.message, details: data });
      return;
    }
    const pending_signup_id = data?.[0]?.pending_signup_id;
    const convert = data?.[0]?.convert;
    const message = data?.[0]?.message;
    res.status(200).json({ pending_signup_id, convert, message });
  } catch (e) {
    res.status(500).json({ error: 'Internal error', details: String(e) });
  }
}
