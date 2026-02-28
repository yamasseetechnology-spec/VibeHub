-- Beta gating: enforce signup rule and conversion
-- Recreated with robust parameter handling to avoid rename issues
DROP FUNCTION IF EXISTS public.enforce_beta_signup_and_convert(TEXT, JSONB);
DROP FUNCTION IF EXISTS public.enforce_beta_signup_and_convert(p_email TEXT, p_metadata JSONB);

CREATE OR REPLACE FUNCTION public.enforce_beta_signup_and_convert(p_email TEXT, p_metadata JSONB)
RETURNS TABLE(pending_signup_id UUID, convert BOOLEAN, message TEXT) AS $$
DECLARE
  total_users INT;
  v_pending_id UUID;
BEGIN
  -- Count total registrations to determine if we can offer free signup
  SELECT COUNT(*) INTO total_users FROM users;
  IF total_users < 10 THEN
    -- Indicate frontend should proceed with standard signup flow (Supabase auth)
    RETURN QUERY SELECT NULL::UUID, FALSE, 'threshold_not_reached';
  ELSE
    INSERT INTO pending_beta_signups(email, metadata, status)
      VALUES (p_email, p_metadata, 'pending')
      RETURNING id INTO v_pending_id;
    RETURN QUERY SELECT v_pending_id, TRUE, 'pending_created';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Payment completion handler: converts a pending signup to a real user
DROP FUNCTION IF EXISTS public.process_beta_payment(p_pending_signup_id UUID, p_amount NUMERIC, p_payment_note TEXT);
CREATE OR REPLACE FUNCTION public.process_beta_payment(p_pending_signup_id UUID, p_amount NUMERIC, p_payment_note TEXT)
RETURNS VOID AS $$
DECLARE
  total_users INT;
  v_email TEXT;
  v_id UUID;
BEGIN
  -- Lock the pending row for update
  PERFORM 1 FROM pending_beta_signups WHERE id = p_pending_signup_id FOR UPDATE;
  -- Retrieve email for the pending signup
  SELECT email INTO v_email FROM pending_beta_signups WHERE id = p_pending_signup_id;
  -- Recount current registrations to enforce threshold under concurrency
  SELECT COUNT(*) INTO total_users FROM users;
  IF total_users >= 10 THEN
    UPDATE pending_beta_signups SET status = 'cancelled' WHERE id = p_pending_signup_id;
    RETURN;
  END IF;
  -- Create actual user
  INSERT INTO users(email, paid, paid_at) VALUES (v_email, TRUE, NOW()) RETURNING id INTO v_id;
  -- Mark as paid
  UPDATE pending_beta_signups SET status = 'paid' WHERE id = p_pending_signup_id;
  -- Log payment, prefer pending_signup_id if the column exists; fallback if not
  BEGIN
    INSERT INTO payments(pending_signup_id, amount, status, created_at) VALUES (p_pending_signup_id, p_amount, 'completed', NOW());
  EXCEPTION WHEN SQLSTATE '42703' THEN
    INSERT INTO payments(amount, status, created_at) VALUES (p_amount, 'completed', NOW());
  END;
END;
$$ LANGUAGE plpgsql;
