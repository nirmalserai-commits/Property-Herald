/*
# submit_listing RPC

## Purpose
Atomic function to submit a new property listing while deducting 25 tokens from
the authenticated developer's wallet in a single transaction.

## Changes
1. New RPC `submit_listing(...)` — SECURITY DEFINER
   - Validates caller has an authenticated session (auth.uid() != null)
   - Checks caller has >= 25 tokens in their wallet
   - Inserts the listing into the `listings` table with moderation_status = 'pending'
   - Burns 25 tokens via the existing token_wallets / token_transactions tables
   - Returns JSON { success: bool, listing_id: uuid?, error: text? }

## Token deduction
Mirrors the pattern used by book_showing: directly updates token_wallets.balance
and inserts a token_transactions row with type = 'burn'.

## Permissions
GRANT EXECUTE to authenticated role only — anonymous users cannot submit listings.
*/

CREATE OR REPLACE FUNCTION submit_listing(
  p_city_id          UUID,
  p_title            TEXT,
  p_description      TEXT         DEFAULT NULL,
  p_specialties      TEXT[]       DEFAULT '{}',
  p_property_types   TEXT[]       DEFAULT '{}',
  p_deal_types       TEXT[]       DEFAULT '{}',
  p_projects_completed INTEGER    DEFAULT 0,
  p_years_experience INTEGER      DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id       UUID := auth.uid();
  v_wallet_balance INTEGER;
  v_new_balance    INTEGER;
  v_listing_id     UUID;
  v_cost           INTEGER := 25;
BEGIN
  -- Require authentication
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check wallet balance
  SELECT balance INTO v_wallet_balance
  FROM token_wallets
  WHERE user_id = v_user_id;

  IF v_wallet_balance IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Token wallet not found. Please contact support.');
  END IF;

  IF v_wallet_balance < v_cost THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient tokens. You need 25 tokens to submit a listing.');
  END IF;

  -- Deduct tokens
  v_new_balance := v_wallet_balance - v_cost;

  UPDATE token_wallets
  SET balance = v_new_balance, updated_at = now()
  WHERE user_id = v_user_id;

  -- Record transaction
  INSERT INTO token_transactions (user_id, type, amount, reason, balance_after)
  VALUES (v_user_id, 'burn', v_cost, 'Submit Listing', v_new_balance);

  -- Insert listing
  INSERT INTO listings (
    profile_id, city_id, title, description, specialties,
    property_types, deal_types, projects_completed, years_experience,
    moderation_status, is_active
  )
  VALUES (
    v_user_id, p_city_id, p_title, p_description, p_specialties,
    p_property_types, p_deal_types, p_projects_completed, p_years_experience,
    'pending', true
  )
  RETURNING id INTO v_listing_id;

  RETURN json_build_object('success', true, 'listing_id', v_listing_id, 'tokens_deducted', v_cost);
END;
$$;

GRANT EXECUTE ON FUNCTION submit_listing(UUID, TEXT, TEXT, TEXT[], TEXT[], TEXT[], INTEGER, INTEGER)
  TO authenticated;
