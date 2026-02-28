// Square webhook receiver to finalize beta signups
import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }
  // Basic payload extraction; replace with proper signature verification per Square docs
  const event = req.body;
  const type = event?.type;
  const data = event?.data;
  if (!data || type !== 'payment.updated' || data.object?.payment?.status !== 'COMPLETED') {
    res.status(200).send('ignored');
    return;
  }
  const pending_id = data.object.payment.note || null;
  const amount = data.object.payment?.amount_money?.amount ? data.object.payment.amount_money.amount / 100 : 0;
  if (!pending_id) {
    res.status(200).send('no_pending_id');
    return;
  }
  try {
    await supabase.rpc('process_beta_payment', {
      pending_signup_id: pending_id,
      p_amount: amount,
      p_payment_note: data.object.payment?.id || ''
    });
    res.status(200).send('ok');
  } catch (e) {
    res.status(500).send('error');
  }
}
