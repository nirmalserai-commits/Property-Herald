-- Drop old burn_tokens function first, then recreate with correct parameter name
DROP FUNCTION IF EXISTS burn_tokens(UUID, INTEGER, TEXT, UUID);

CREATE OR REPLACE FUNCTION burn_tokens(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT,
  p_related_listing_id UUID DEFAULT NULL
)
RETURNS TABLE (success BOOLEAN, new_balance INTEGER, error TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  SELECT balance INTO v_balance
  FROM token_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    SELECT token_balance INTO v_balance
    FROM developers
    WHERE id = p_user_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
      RETURN QUERY SELECT false, 0, 'User wallet not found';
      RETURN;
    END IF;
  END IF;

  IF v_balance < p_amount THEN
    RETURN QUERY SELECT false, v_balance, 'Insufficient token balance';
    RETURN;
  END IF;

  v_new_balance := v_balance - p_amount;

  UPDATE token_wallets SET balance = v_new_balance, updated_at = now()
  WHERE user_id = p_user_id;

  UPDATE developers SET token_balance = v_new_balance
  WHERE id = p_user_id;

  INSERT INTO token_transactions (developer_id, bundle_name, tokens_purchased, amount_paid, status)
  VALUES (p_user_id, 'burn: ' || p_reason, -p_amount, 0, 'completed');

  RETURN QUERY SELECT true, v_new_balance, NULL::TEXT;
  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION burn_tokens(UUID, INTEGER, TEXT, UUID) TO authenticated;
