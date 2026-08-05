/*
# Dossier 6-A: Create burn_tokens RPC function

Used by Developer Dashboard for CRM renewal and token-charged services.
Deducts tokens from the user's wallet and logs the transaction.

## Parameters:
- p_user_id (uuid) — the user whose wallet to deduct from
- p_amount (integer) — number of tokens to burn
- p_reason (text) — reason for the burn (e.g. "CRM renewal 30 days")

## Behavior:
- Checks if wallet has sufficient balance; returns error if not.
- Deducts from balance.
- Inserts a token_transactions record.
- Returns { success: boolean, error: text | null }
*/

CREATE OR REPLACE FUNCTION burn_tokens(p_user_id uuid, p_amount integer, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_balance integer;
BEGIN
  SELECT balance INTO current_balance FROM token_wallets WHERE user_id = p_user_id FOR UPDATE;

  IF current_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;

  IF current_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient tokens');
  END IF;

  UPDATE token_wallets SET balance = balance - p_amount, updated_at = now() WHERE user_id = p_user_id;

  INSERT INTO token_transactions (user_id, type, amount, reason, created_at)
  VALUES (p_user_id, 'burn', p_amount, p_reason, now());

  RETURN jsonb_build_object('success', true, 'error', null);
END;
$$;

GRANT EXECUTE ON FUNCTION burn_tokens TO authenticated;