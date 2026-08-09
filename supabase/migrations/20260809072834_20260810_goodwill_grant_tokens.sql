-- Tiered autonomous goodwill grants
-- Allows Nora to grant up to 10 tokens directly without escalating to admin approval.
-- SECURITY DEFINER with internal auth check — only callable by authenticated users
-- (Nora calls this from the server side via the nora-chat edge function using service role).

CREATE OR REPLACE FUNCTION public.support_grant_goodwill_tokens(
  p_user_id uuid,
  p_amount integer,
  p_reason text DEFAULT 'goodwill gesture'::text
)
RETURNS TABLE(success boolean, new_balance integer, error text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_balance INTEGER;
  v_new_balance INTEGER;
  v_total_granted_today INTEGER;
BEGIN
  -- Cap at 10 tokens per call
  IF p_amount > 10 THEN
    RETURN QUERY SELECT false, 0, 'Maximum 10 tokens per goodwill grant'::TEXT;
    RETURN;
  END IF;

  IF p_amount <= 0 THEN
    RETURN QUERY SELECT false, 0, 'Amount must be positive'::TEXT;
    RETURN;
  END IF;

  -- Check total granted today to prevent abuse (max 50 per day per user)
  SELECT COALESCE(SUM(tokens_purchased), 0) INTO v_total_granted_today
  FROM token_transactions
  WHERE developer_id = p_user_id
    AND bundle_name LIKE 'grant: goodwill%'
    AND created_at >= CURRENT_DATE;

  IF v_total_granted_today + p_amount > 50 THEN
    RETURN QUERY SELECT false, 0, 'Daily goodwill grant limit reached'::TEXT;
    RETURN;
  END IF;

  SELECT balance INTO v_balance FROM token_wallets WHERE user_id = p_user_id FOR UPDATE;
  IF v_balance IS NULL THEN
    SELECT token_balance INTO v_balance FROM developers WHERE id = p_user_id FOR UPDATE;
    IF v_balance IS NULL THEN
      -- Create wallet if it doesn't exist
      INSERT INTO token_wallets (user_id, balance, updated_at) VALUES (p_user_id, 0, now())
      ON CONFLICT (user_id) DO NOTHING;
      SELECT balance INTO v_balance FROM token_wallets WHERE user_id = p_user_id FOR UPDATE;
      IF v_balance IS NULL THEN
        RETURN QUERY SELECT false, 0, 'Wallet not found'::TEXT;
        RETURN;
      END IF;
    END IF;
  END IF;

  v_new_balance := v_balance + p_amount;
  UPDATE token_wallets SET balance = v_new_balance, updated_at = now() WHERE user_id = p_user_id;
  UPDATE developers SET token_balance = v_new_balance WHERE id = p_user_id;

  INSERT INTO token_transactions (developer_id, bundle_name, tokens_purchased, amount_paid, status)
  VALUES (p_user_id, 'grant: goodwill - ' || p_reason, p_amount, 0, 'completed');

  RETURN QUERY SELECT true, v_new_balance, NULL::TEXT;
  RETURN;
END;
$function$;

-- Only service_role and authenticated can call this (not anon)
REVOKE EXECUTE ON FUNCTION public.support_grant_goodwill_tokens(uuid, integer, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.support_grant_goodwill_tokens(uuid, integer, text) FROM PUBLIC;
