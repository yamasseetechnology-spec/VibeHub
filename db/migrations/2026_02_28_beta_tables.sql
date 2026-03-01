-- Beta gating: beta10 free signups, then paid
-- Ensure pgcrypto extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Extend users table with beta/trial fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS paid BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Pending signups awaiting payment
CREATE TABLE IF NOT EXISTS pending_beta_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_id TEXT
);

-- Payments log (optional audit)
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pending_signup_id UUID REFERENCES pending_beta_signups(id),
  amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pending_beta_signups_email ON pending_beta_signups (email);
CREATE INDEX IF NOT EXISTS idx_payments_pending_signup ON payments (pending_signup_id);
