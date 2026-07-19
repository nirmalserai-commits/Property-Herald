/*
# Security Hardening — search_path, RLS, RPC execute locks

## Summary
Fixes the security advisor findings: mutable function search_path,
RLS policies that bypass security with USING/WITH CHECK (true), and
SECURITY DEFINER functions executable by the public. Leaked-password
protection is enabled separately via the Supabase dashboard (auth.config
is not writable from a migration).

## 1. Function search_path (8 functions)
generate_invoice_number, create_wallet_on_profile, burn_own_tokens,
admin_grant_tokens, get_analytics_data, increment_ambassador_count,
submit_listing, book_showing all get SET search_path TO public, pg_catalog.
Bodies unchanged.

## 2. RPC EXECUTE locks
- admin_grant_tokens, get_analytics_data: REVOKE from anon+authenticated,
  GRANT to authenticated (internal founder-email check remains the gate).
- burn_own_tokens, submit_listing: REVOKE from anon, GRANT authenticated
  (auth.uid() check inside; anon can never use them).
- create_wallet_on_profile: REVOKE from anon+authenticated (trigger only).
- increment_ambassador_count, book_showing: kept public (site widgets;
  no caller-supplied privileged data).

## 3. RLS tightening (10 tables)
- access_codes: INSERT/DELETE founder-only; UPDATE stays open (beta code
  redemption by anon visitors); SELECT public.
- ambassador_conversations: INSERT adds EXISTS check on ambassador_id.
- beta_interest, beta_notify, newsletter_subscribers, buyers,
  show_apartment_bookings, whatsapp_leads: intentional public intake —
  WITH CHECK (true) kept and documented.
- inquiries: INSERT requires profile_id = auth.uid().
- referrals: INSERT requires authenticated and the caller is either the
  referrer or the referred (the referred user creates the row at signup).
*/

-- ═══ 1. FUNCTION SEARCH PATH ═══

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text LANGUAGE plpgsql
SET search_path TO public, pg_catalog
AS $function$
BEGIN
  RETURN 'PH-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' || LPAD(nextval('invoice_number_seq')::TEXT, 4, '0');
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_wallet_on_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
BEGIN
  INSERT INTO token_wallets (user_id, balance)
  VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.burn_own_tokens(p_amount integer, p_reason text, p_listing_id uuid DEFAULT NULL::uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_user_id UUID; v_balance INTEGER; v_new_balance INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  SELECT balance INTO v_balance FROM token_wallets WHERE user_id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;
  IF v_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance', 'balance', v_balance, 'required', p_amount);
  END IF;
  v_new_balance := v_balance - p_amount;
  UPDATE token_wallets SET balance = v_new_balance, updated_at = NOW() WHERE user_id = v_user_id;
  INSERT INTO token_transactions (user_id, type, amount, reason, related_listing_id, balance_after)
  VALUES (v_user_id, 'burn', -p_amount, p_reason, p_listing_id, v_new_balance);
  RETURN jsonb_build_object('success', true, 'balance', v_new_balance);
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_grant_tokens(p_user_id uuid, p_amount integer, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_current_balance INTEGER; v_new_balance INTEGER;
BEGIN
  IF (auth.jwt()->>'email') != 'nirmalserai@gmail.com' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;
  SELECT balance INTO v_current_balance FROM token_wallets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;
  v_new_balance := v_current_balance + p_amount;
  UPDATE token_wallets SET balance = v_new_balance, updated_at = NOW() WHERE user_id = p_user_id;
  INSERT INTO token_transactions (user_id, type, amount, reason, balance_after)
  VALUES (p_user_id, 'bonus', p_amount, p_reason, v_new_balance);
  RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_analytics_data(days_back integer DEFAULT 30)
RETURNS TABLE(day date, new_users bigint, new_listings bigint, revenue numeric)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
BEGIN
  IF (auth.jwt()->>'email') != 'nirmalserai@gmail.com' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  RETURN QUERY
  WITH dates AS (
    SELECT generate_series(CURRENT_DATE - days_back, CURRENT_DATE, '1 day'::INTERVAL)::DATE AS d
  )
  SELECT
    dates.d AS day,
    COUNT(DISTINCT p.id)::BIGINT AS new_users,
    COUNT(DISTINCT l.id)::BIGINT AS new_listings,
    COALESCE(SUM(i.total_amount), 0)::NUMERIC AS revenue
  FROM dates
  LEFT JOIN profiles p ON p.created_at::DATE = dates.d
  LEFT JOIN listings  l ON l.created_at::DATE = dates.d
  LEFT JOIN invoices  i ON i.created_at::DATE = dates.d AND i.payment_status = 'Paid'
  GROUP BY dates.d ORDER BY dates.d;
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_ambassador_count(p_ambassador_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
BEGIN
  UPDATE ambassadors
  SET conversation_count = conversation_count + 1, updated_at = NOW()
  WHERE id = p_ambassador_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.submit_listing(
  p_city_id uuid, p_title text, p_description text DEFAULT NULL::text,
  p_specialties text[] DEFAULT '{}'::text[], p_property_types text[] DEFAULT '{}'::text[],
  p_deal_types text[] DEFAULT '{}'::text[], p_projects_completed integer DEFAULT 0,
  p_years_experience integer DEFAULT 0
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_wallet_balance INTEGER; v_new_balance INTEGER; v_listing_id UUID;
  v_cost INTEGER := 25;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  SELECT balance INTO v_wallet_balance FROM token_wallets WHERE user_id = v_user_id;
  IF v_wallet_balance IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Token wallet not found. Please contact support.');
  END IF;
  IF v_wallet_balance < v_cost THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient tokens. You need 25 tokens to submit a listing.');
  END IF;
  v_new_balance := v_wallet_balance - v_cost;
  UPDATE token_wallets SET balance = v_new_balance, updated_at = now() WHERE user_id = v_user_id;
  INSERT INTO token_transactions (user_id, type, amount, reason, balance_after)
  VALUES (v_user_id, 'burn', v_cost, 'Submit Listing', v_new_balance);
  INSERT INTO listings (
    profile_id, city_id, title, description, specialties,
    property_types, deal_types, projects_completed, years_experience,
    moderation_status, is_active
  ) VALUES (
    v_user_id, p_city_id, p_title, p_description, p_specialties,
    p_property_types, p_deal_types, p_projects_completed, p_years_experience,
    'pending', true
  ) RETURNING id INTO v_listing_id;
  RETURN json_build_object('success', true, 'listing_id', v_listing_id, 'tokens_deducted', v_cost);
END;
$function$;

CREATE OR REPLACE FUNCTION public.book_showing(
  p_listing_id uuid, p_buyer_name text, p_buyer_phone text, p_buyer_email text,
  p_preferred_date date, p_preferred_time text, p_message text
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_developer_id UUID; v_wallet_balance INTEGER; v_booking_id UUID; v_new_balance INTEGER;
BEGIN
  SELECT profile_id INTO v_developer_id FROM listings WHERE id = p_listing_id;
  IF v_developer_id IS NULL THEN RAISE EXCEPTION 'Listing not found'; END IF;
  SELECT balance INTO v_wallet_balance FROM token_wallets WHERE user_id = v_developer_id;
  IF v_wallet_balance IS NULL THEN RAISE EXCEPTION 'Developer has no token wallet'; END IF;
  IF v_wallet_balance < 5 THEN
    RAISE EXCEPTION 'Insufficient tokens — developer has % tokens, needs 5', v_wallet_balance;
  END IF;
  INSERT INTO show_apartment_bookings (
    listing_id, developer_id, buyer_name, buyer_phone, buyer_email,
    preferred_date, preferred_time, message, tokens_deducted
  ) VALUES (
    p_listing_id, v_developer_id, p_buyer_name, p_buyer_phone, p_buyer_email,
    p_preferred_date, p_preferred_time, p_message, 5
  ) RETURNING id INTO v_booking_id;
  UPDATE token_wallets SET balance = balance - 5, updated_at = NOW()
  WHERE user_id = v_developer_id RETURNING balance INTO v_new_balance;
  INSERT INTO token_transactions (user_id, type, amount, reason, related_listing_id, balance_after)
  VALUES (v_developer_id, 'burn', -5, 'Show apartment booking', p_listing_id, v_new_balance);
  RETURN v_booking_id;
END;
$function$;

-- ═══ 2. RPC EXECUTE LOCKS ═══

REVOKE EXECUTE ON FUNCTION public.admin_grant_tokens(uuid, integer, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_grant_tokens(uuid, integer, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_analytics_data(integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_analytics_data(integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.burn_own_tokens(integer, text, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.burn_own_tokens(integer, text, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.submit_listing(uuid, text, text, text[], text[], text[], integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.submit_listing(uuid, text, text, text[], text[], text[], integer, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.create_wallet_on_profile() FROM anon, authenticated;

-- ═══ 3. RLS TIGHTENING ═══

-- access_codes
DROP POLICY IF EXISTS "ac_delete" ON access_codes;
DROP POLICY IF EXISTS "ac_insert" ON access_codes;
DROP POLICY IF EXISTS "ac_update" ON access_codes;
DROP POLICY IF EXISTS "ac_select" ON access_codes;
CREATE POLICY "ac_select" ON access_codes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "ac_insert" ON access_codes FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() ->> 'email') = 'nirmalserai@gmail.com');
CREATE POLICY "ac_update" ON access_codes FOR UPDATE TO anon, authenticated
  USING (true) WITH CHECK (true);
CREATE POLICY "ac_delete" ON access_codes FOR DELETE TO authenticated
  USING ((auth.jwt() ->> 'email') = 'nirmalserai@gmail.com');

-- ambassador_conversations
DROP POLICY IF EXISTS "anyone_insert_conversations" ON ambassador_conversations;
CREATE POLICY "anyone_insert_conversations" ON ambassador_conversations
  FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM ambassadors WHERE ambassadors.id = ambassador_conversations.ambassador_id));

-- beta_interest (intentional public intake)
DROP POLICY IF EXISTS "bi_insert" ON beta_interest;
CREATE POLICY "bi_insert" ON beta_interest FOR INSERT TO anon, authenticated WITH CHECK (true);

-- beta_notify (intentional public intake)
DROP POLICY IF EXISTS "bn_insert" ON beta_notify;
CREATE POLICY "bn_insert" ON beta_notify FOR INSERT TO anon, authenticated WITH CHECK (true);

-- buyers (intentional public intake — widget + register)
DROP POLICY IF EXISTS "anon_insert_buyers" ON buyers;
CREATE POLICY "anon_insert_buyers" ON buyers FOR INSERT TO anon, authenticated WITH CHECK (true);

-- inquiries (signed-in developers only, must own the profile)
DROP POLICY IF EXISTS "inquiries_own_insert" ON inquiries;
CREATE POLICY "inquiries_own_insert" ON inquiries
  FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid());

-- newsletter_subscribers (intentional public intake)
DROP POLICY IF EXISTS "anyone_can_subscribe" ON newsletter_subscribers;
CREATE POLICY "anyone_can_subscribe" ON newsletter_subscribers
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- referrals (authenticated; caller is referrer or referred)
DROP POLICY IF EXISTS "insert_referrals" ON referrals;
CREATE POLICY "insert_referrals" ON referrals
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- show_apartment_bookings (intentional public intake)
DROP POLICY IF EXISTS "anon_insert_bookings" ON show_apartment_bookings;
CREATE POLICY "anon_insert_bookings" ON show_apartment_bookings
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- whatsapp_leads (service-role inserts; permissive fallback)
DROP POLICY IF EXISTS "insert_whatsapp_leads" ON whatsapp_leads;
CREATE POLICY "insert_whatsapp_leads" ON whatsapp_leads
  FOR INSERT TO anon, authenticated WITH CHECK (true);
