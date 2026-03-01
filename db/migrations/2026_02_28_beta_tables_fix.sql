-- Ensure pending_beta_signups exists for beta gating
CREATE TABLE IF NOT EXISTS pending_beta_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_id TEXT
);
