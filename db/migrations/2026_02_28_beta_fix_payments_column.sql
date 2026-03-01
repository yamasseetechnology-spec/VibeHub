-- Ensure payments has the pending_signup_id column for beta flow
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS pending_signup_id UUID REFERENCES pending_beta_signups(id);
