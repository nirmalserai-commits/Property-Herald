-- Fix book_showing RPC to match actual table columns and frontend parameters
DROP FUNCTION IF EXISTS book_showing(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION book_showing(
  p_listing_id UUID,
  p_buyer_name TEXT,
  p_buyer_phone TEXT,
  p_buyer_email TEXT DEFAULT NULL,
  p_preferred_date TEXT DEFAULT NULL,
  p_preferred_time TEXT DEFAULT NULL,
  p_message TEXT DEFAULT NULL
)
RETURNS TABLE (success BOOLEAN, booking_id UUID, error TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id UUID;
  v_developer_id UUID;
  v_balance INTEGER;
BEGIN
  -- Get developer_id from listing
  SELECT developer_id INTO v_developer_id FROM listings WHERE id = p_listing_id;
  IF v_developer_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Listing not found';
    RETURN;
  END IF;

  -- Check developer has tokens (5 token cost)
  SELECT token_balance INTO v_balance FROM developers WHERE id = v_developer_id FOR UPDATE;
  IF v_balance IS NULL THEN
    SELECT balance INTO v_balance FROM token_wallets WHERE user_id = v_developer_id FOR UPDATE;
  END IF;
  IF v_balance IS NULL OR v_balance < 5 THEN
    RAISE EXCEPTION 'Insufficient tokens';
  END IF;

  -- Deduct 5 tokens
  UPDATE developers SET token_balance = token_balance - 5 WHERE id = v_developer_id;
  UPDATE token_wallets SET balance = balance - 5, updated_at = now() WHERE user_id = v_developer_id;

  -- Create booking using actual table columns
  INSERT INTO show_apartment_bookings (
    listing_id, developer_id, appointment_date, appointment_time,
    notes, status, tokens_consumed, created_at
  ) VALUES (
    p_listing_id, v_developer_id, p_preferred_date, p_preferred_time,
    COALESCE(p_message, '') || CASE WHEN p_buyer_email IS NOT NULL THEN ' | email: ' || p_buyer_email ELSE '' END,
    'pending', 5, now()
  ) RETURNING id INTO v_booking_id;

  -- Log transaction
  INSERT INTO token_transactions (developer_id, bundle_name, tokens_purchased, amount_paid, status)
  VALUES (v_developer_id, 'burn: show apartment booking', -5, 0, 'completed');

  RETURN QUERY SELECT true, v_booking_id, NULL::TEXT;
  RETURN;
END;
$$;
GRANT EXECUTE ON FUNCTION book_showing(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
