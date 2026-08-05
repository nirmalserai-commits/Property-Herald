/*
# Dossier 6-A: Fix burn_tokens RPC to match token_transactions schema

The token_transactions table has: type, amount, related_listing_id,
razorpay_payment_id, balance_after, created_at.
No 'reason' column — store the reason in razorpay_payment_id as a fallback
or skip it. Updated to use balance_after.
*/

CREATE OR REPLACE FUNCTION burn_tokens(p_user_id uuid, p_amount integer, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_balance integer;
  new_balance integer;
BEGIN
  SELECT balance INTO current_balance FROM token_wallets WHERE user_id = p_user_id FOR UPDATE;

  IF current_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;

  IF current_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient tokens');
  END IF;

  new_balance := current_balance - p_amount;

  UPDATE token_wallets SET balance = new_balance, updated_at = now() WHERE user_id = p_user_id;

  INSERT INTO token_transactions (user_id, type, amount, balance_after, created_at)
  VALUES (p_user_id, 'burn', p_amount, new_balance, now());

  RETURN jsonb_build_object('success', true, 'error', null);
END;
$$;

GRANT EXECUTE ON FUNCTION burn_tokens TO authenticated;