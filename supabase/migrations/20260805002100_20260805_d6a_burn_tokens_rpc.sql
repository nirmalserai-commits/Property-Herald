-- ── burn_tokens RPC ──
-- Deducts tokens from a developer's balance, logs the transaction, returns new balance
-- Usage: SELECT burn_tokens(developer_uuid, amount, reason_text, related_listing_uuid_or_null);

CREATE OR REPLACE FUNCTION burn_tokens(
  p_developer_id UUID,
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
  -- Get current balance
  SELECT token_balance INTO v_balance
  FROM developers
  WHERE id = p_developer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 'Developer not found';
    RETURN;
  END IF;

  IF v_balance < p_amount THEN
    RETURN QUERY SELECT false, v_balance, 'Insufficient token balance';
    RETURN;
  END IF;

  v_new_balance := v_balance - p_amount;

  -- Update balance
  UPDATE developers
  SET token_balance = v_new_balance
  WHERE id = p_developer_id;

  -- Log transaction
  INSERT INTO token_transactions (developer_id, bundle_name, tokens_purchased, amount_paid, status)
  VALUES (p_developer_id, 'burn: ' || p_reason, -p_amount, 0, 'completed');

  RETURN QUERY SELECT true, v_new_balance, NULL::TEXT;
  RETURN;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION burn_tokens(UUID, INTEGER, TEXT, UUID) TO authenticated;
