-- Create all missing RPC functions the frontend calls

-- ── submit_listing ──
CREATE OR REPLACE FUNCTION submit_listing(
  p_city_id INTEGER,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_specialties TEXT[] DEFAULT '{}',
  p_property_types TEXT[] DEFAULT '{}',
  p_deal_types TEXT[] DEFAULT '{}',
  p_years_experience INTEGER DEFAULT 0,
  p_projects_completed INTEGER DEFAULT 0
)
RETURNS TABLE (success BOOLEAN, listing_id UUID, error TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_listing_id UUID;
  v_balance INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Not authenticated';
    RETURN;
  END IF;

  -- Check balance
  SELECT balance INTO v_balance FROM token_wallets WHERE user_id = v_user_id FOR UPDATE;
  IF v_balance IS NULL THEN
    SELECT token_balance INTO v_balance FROM developers WHERE id = v_user_id FOR UPDATE;
  END IF;
  IF v_balance IS NULL OR v_balance < 25 THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Insufficient tokens (need 25)';
    RETURN;
  END IF;

  -- Deduct tokens
  UPDATE token_wallets SET balance = balance - 25, updated_at = now() WHERE user_id = v_user_id;
  UPDATE developers SET token_balance = token_balance - 25 WHERE id = v_user_id;

  -- Create listing
  INSERT INTO listings (
    title, city_id, description, specialties, property_types, deal_types,
    years_experience, projects_completed, developer_id, owner_id,
    moderation_status, is_active, status, created_at
  ) VALUES (
    p_title, p_city_id, p_description, p_specialties, p_property_types, p_deal_types,
    p_years_experience, p_projects_completed, v_user_id, v_user_id,
    'pending', false, 'pending', now()
  ) RETURNING id INTO v_listing_id;

  -- Log transaction
  INSERT INTO token_transactions (developer_id, bundle_name, tokens_purchased, amount_paid, status)
  VALUES (v_user_id, 'burn: listing submission', -25, 0, 'completed');

  RETURN QUERY SELECT true, v_listing_id, NULL::TEXT;
  RETURN;
END;
$$;
GRANT EXECUTE ON FUNCTION submit_listing(INTEGER, TEXT, TEXT, TEXT[], TEXT[], TEXT[], INTEGER, INTEGER) TO authenticated;

-- ── burn_own_tokens ──
CREATE OR REPLACE FUNCTION burn_own_tokens(
  p_amount INTEGER,
  p_reason TEXT
)
RETURNS TABLE (success BOOLEAN, new_balance INTEGER, error TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 0, 'Not authenticated';
    RETURN;
  END IF;

  SELECT balance INTO v_balance FROM token_wallets WHERE user_id = v_user_id FOR UPDATE;
  IF v_balance IS NULL THEN
    SELECT token_balance INTO v_balance FROM developers WHERE id = v_user_id FOR UPDATE;
  END IF;

  IF v_balance IS NULL THEN
    RETURN QUERY SELECT false, 0, 'Wallet not found';
    RETURN;
  END IF;

  IF v_balance < p_amount THEN
    RETURN QUERY SELECT false, v_balance, 'Insufficient balance';
    RETURN;
  END IF;

  v_new_balance := v_balance - p_amount;
  UPDATE token_wallets SET balance = v_new_balance, updated_at = now() WHERE user_id = v_user_id;
  UPDATE developers SET token_balance = v_new_balance WHERE id = v_user_id;

  INSERT INTO token_transactions (developer_id, bundle_name, tokens_purchased, amount_paid, status)
  VALUES (v_user_id, 'burn: ' || p_reason, -p_amount, 0, 'completed');

  RETURN QUERY SELECT true, v_new_balance, NULL::TEXT;
  RETURN;
END;
$$;
GRANT EXECUTE ON FUNCTION burn_own_tokens(INTEGER, TEXT) TO authenticated;

-- ── increment_ambassador_count ──
CREATE OR REPLACE FUNCTION increment_ambassador_count(p_ambassador_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE ambassadors SET conversation_count = conversation_count + 1 WHERE id = p_ambassador_id;
END;
$$;
GRANT EXECUTE ON FUNCTION increment_ambassador_count(UUID) TO authenticated;

-- ── book_showing ──
CREATE OR REPLACE FUNCTION book_showing(
  p_listing_id UUID,
  p_developer_id UUID,
  p_buyer_name TEXT,
  p_buyer_phone TEXT,
  p_buyer_email TEXT DEFAULT NULL,
  p_message TEXT DEFAULT NULL,
  p_scheduled_date TEXT DEFAULT NULL
)
RETURNS TABLE (success BOOLEAN, booking_id UUID, error TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id UUID;
BEGIN
  INSERT INTO show_apartment_bookings (
    listing_id, developer_id, buyer_name, buyer_phone, buyer_email,
    message, scheduled_date, status, created_at
  ) VALUES (
    p_listing_id, p_developer_id, p_buyer_name, p_buyer_phone, p_buyer_email,
    p_message, p_scheduled_date, 'pending', now()
  ) RETURNING id INTO v_booking_id;

  RETURN QUERY SELECT true, v_booking_id, NULL::TEXT;
  RETURN;
END;
$$;
GRANT EXECUTE ON FUNCTION book_showing(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- ── get_analytics_data ──
CREATE OR REPLACE FUNCTION get_analytics_data(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
  total_listings BIGINT,
  active_listings BIGINT,
  total_leads BIGINT,
  total_buyers BIGINT,
  total_developers BIGINT,
  total_bookings BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT count(*) FROM listings),
    (SELECT count(*) FROM listings WHERE is_active = true),
    (SELECT count(*) FROM leads),
    (SELECT count(*) FROM buyers),
    (SELECT count(*) FROM developers),
    (SELECT count(*) FROM show_apartment_bookings);
END;
$$;
GRANT EXECUTE ON FUNCTION get_analytics_data(INTEGER) TO authenticated;

-- ── admin_grant_tokens ──
CREATE OR REPLACE FUNCTION admin_grant_tokens(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT DEFAULT 'admin grant'
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
  SELECT balance INTO v_balance FROM token_wallets WHERE user_id = p_user_id FOR UPDATE;
  IF v_balance IS NULL THEN
    SELECT token_balance INTO v_balance FROM developers WHERE id = p_user_id FOR UPDATE;
    IF v_balance IS NULL THEN
      RETURN QUERY SELECT false, 0, 'Wallet not found';
      RETURN;
    END IF;
  END IF;

  v_new_balance := v_balance + p_amount;
  UPDATE token_wallets SET balance = v_new_balance, updated_at = now() WHERE user_id = p_user_id;
  UPDATE developers SET token_balance = v_new_balance WHERE id = p_user_id;

  INSERT INTO token_transactions (developer_id, bundle_name, tokens_purchased, amount_paid, status)
  VALUES (p_user_id, 'grant: ' || p_reason, p_amount, 0, 'completed');

  RETURN QUERY SELECT true, v_new_balance, NULL::TEXT;
  RETURN;
END;
$$;
GRANT EXECUTE ON FUNCTION admin_grant_tokens(UUID, INTEGER, TEXT) TO authenticated;
