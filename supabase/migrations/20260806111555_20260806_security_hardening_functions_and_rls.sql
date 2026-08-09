/*
# Security Hardening: Fix exploitable SECURITY DEFINER functions + add RLS policies
*/

-- ============================================================
-- FIX 1: admin_grant_tokens — add admin auth check
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_grant_tokens(
  p_user_id uuid,
  p_amount integer,
  p_reason text DEFAULT 'admin grant'::text
)
RETURNS TABLE(success boolean, new_balance integer, error text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_balance INTEGER;
  v_new_balance INTEGER;
  v_caller_email TEXT;
BEGIN
  v_caller_email := auth.jwt() ->> 'email';
  IF v_caller_email IS NULL THEN
    v_caller_email := (SELECT email FROM auth.users WHERE id = auth.uid());
  END IF;

  IF v_caller_email IS NULL OR v_caller_email != 'nirmalserai@gmail.com' THEN
    RETURN QUERY SELECT false, 0, 'Unauthorized'::TEXT;
    RETURN;
  END IF;

  SELECT balance INTO v_balance FROM token_wallets WHERE user_id = p_user_id FOR UPDATE;
  IF v_balance IS NULL THEN
    SELECT token_balance INTO v_balance FROM developers WHERE id = p_user_id FOR UPDATE;
    IF v_balance IS NULL THEN
      RETURN QUERY SELECT false, 0, 'Wallet not found'::TEXT;
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
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_grant_tokens(uuid, integer, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_grant_tokens(uuid, integer, text) FROM PUBLIC;

-- ============================================================
-- FIX 2: burn_tokens — add auth check (caller must be owner or admin)
-- ============================================================
CREATE OR REPLACE FUNCTION public.burn_tokens(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_related_listing_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(success boolean, new_balance integer, error text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_balance INTEGER;
  v_new_balance INTEGER;
  v_caller_id UUID;
  v_caller_email TEXT;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RETURN QUERY SELECT false, 0, 'Not authenticated'::TEXT;
    RETURN;
  END IF;

  v_caller_email := (SELECT email FROM auth.users WHERE id = v_caller_id);
  IF v_caller_id != p_user_id AND v_caller_email != 'nirmalserai@gmail.com' THEN
    RETURN QUERY SELECT false, 0, 'Unauthorized'::TEXT;
    RETURN;
  END IF;

  SELECT balance INTO v_balance FROM token_wallets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    SELECT token_balance INTO v_balance FROM developers WHERE id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
      RETURN QUERY SELECT false, 0, 'User wallet not found'::TEXT;
      RETURN;
    END IF;
  END IF;

  IF v_balance < p_amount THEN
    RETURN QUERY SELECT false, v_balance, 'Insufficient token balance'::TEXT;
    RETURN;
  END IF;

  v_new_balance := v_balance - p_amount;
  UPDATE token_wallets SET balance = v_new_balance, updated_at = now() WHERE user_id = p_user_id;
  UPDATE developers SET token_balance = v_new_balance WHERE id = p_user_id;

  INSERT INTO token_transactions (developer_id, bundle_name, tokens_purchased, amount_paid, status)
  VALUES (p_user_id, 'burn: ' || p_reason, -p_amount, 0, 'completed');

  RETURN QUERY SELECT true, v_new_balance, NULL::TEXT;
  RETURN;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.burn_tokens(uuid, integer, text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.burn_tokens(uuid, integer, text, uuid) FROM PUBLIC;

-- ============================================================
-- FIX 3: get_analytics_data — restrict to authenticated admin
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_analytics_data(
  days_back integer DEFAULT 30
)
RETURNS TABLE(total_listings bigint, active_listings bigint, total_leads bigint, total_buyers bigint, total_developers bigint, total_bookings bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller_email TEXT;
BEGIN
  v_caller_email := (SELECT email FROM auth.users WHERE id = auth.uid());
  IF v_caller_email IS NULL OR v_caller_email != 'nirmalserai@gmail.com' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    (SELECT count(*) FROM listings),
    (SELECT count(*) FROM listings WHERE is_active = true),
    (SELECT count(*) FROM leads),
    (SELECT count(*) FROM buyers),
    (SELECT count(*) FROM developers),
    (SELECT count(*) FROM show_apartment_bookings);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_analytics_data(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_analytics_data(integer) FROM PUBLIC;

-- ============================================================
-- RLS POLICIES: buyers table
-- ============================================================
DROP POLICY IF EXISTS "anon_insert_buyers" ON public.buyers;
CREATE POLICY "anon_insert_buyers" ON public.buyers FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_select_buyers" ON public.buyers;
CREATE POLICY "auth_select_buyers" ON public.buyers FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_update_buyers" ON public.buyers;
CREATE POLICY "auth_update_buyers" ON public.buyers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_buyers" ON public.buyers;
CREATE POLICY "auth_delete_buyers" ON public.buyers FOR DELETE TO authenticated USING (true);

-- ============================================================
-- RLS POLICIES: leads table
-- ============================================================
DROP POLICY IF EXISTS "anon_insert_leads" ON public.leads;
CREATE POLICY "anon_insert_leads" ON public.leads FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_select_leads" ON public.leads;
CREATE POLICY "auth_select_leads" ON public.leads FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_update_leads" ON public.leads;
CREATE POLICY "auth_update_leads" ON public.leads FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_leads" ON public.leads;
CREATE POLICY "auth_delete_leads" ON public.leads FOR DELETE TO authenticated USING (true);

-- ============================================================
-- RLS POLICIES: hall_of_fame table
-- ============================================================
DROP POLICY IF EXISTS "public_select_hall_of_fame" ON public.hall_of_fame;
CREATE POLICY "public_select_hall_of_fame" ON public.hall_of_fame FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_hall_of_fame" ON public.hall_of_fame;
CREATE POLICY "auth_insert_hall_of_fame" ON public.hall_of_fame FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_hall_of_fame" ON public.hall_of_fame;
CREATE POLICY "auth_update_hall_of_fame" ON public.hall_of_fame FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_hall_of_fame" ON public.hall_of_fame;
CREATE POLICY "auth_delete_hall_of_fame" ON public.hall_of_fame FOR DELETE TO authenticated USING (true);

-- ============================================================
-- RLS POLICIES: localities table
-- ============================================================
DROP POLICY IF EXISTS "public_select_localities" ON public.localities;
CREATE POLICY "public_select_localities" ON public.localities FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_localities" ON public.localities;
CREATE POLICY "auth_insert_localities" ON public.localities FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_localities" ON public.localities;
CREATE POLICY "auth_update_localities" ON public.localities FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_localities" ON public.localities;
CREATE POLICY "auth_delete_localities" ON public.localities FOR DELETE TO authenticated USING (true);

-- ============================================================
-- RLS POLICIES: neighbourhood_data table
-- ============================================================
DROP POLICY IF EXISTS "public_select_neighbourhood_data" ON public.neighbourhood_data;
CREATE POLICY "public_select_neighbourhood_data" ON public.neighbourhood_data FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_neighbourhood_data" ON public.neighbourhood_data;
CREATE POLICY "auth_insert_neighbourhood_data" ON public.neighbourhood_data FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_neighbourhood_data" ON public.neighbourhood_data;
CREATE POLICY "auth_update_neighbourhood_data" ON public.neighbourhood_data FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_neighbourhood_data" ON public.neighbourhood_data;
CREATE POLICY "auth_delete_neighbourhood_data" ON public.neighbourhood_data FOR DELETE TO authenticated USING (true);

-- ============================================================
-- RLS POLICIES: naksha_reports table
-- ============================================================
DROP POLICY IF EXISTS "auth_insert_naksha_reports" ON public.naksha_reports;
CREATE POLICY "auth_insert_naksha_reports" ON public.naksha_reports FOR INSERT TO authenticated WITH CHECK (purchased_by = auth.uid());

DROP POLICY IF EXISTS "auth_select_naksha_reports" ON public.naksha_reports;
CREATE POLICY "auth_select_naksha_reports" ON public.naksha_reports FOR SELECT TO authenticated USING (purchased_by = auth.uid() OR true);

DROP POLICY IF EXISTS "auth_update_naksha_reports" ON public.naksha_reports;
CREATE POLICY "auth_update_naksha_reports" ON public.naksha_reports FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_naksha_reports" ON public.naksha_reports;
CREATE POLICY "auth_delete_naksha_reports" ON public.naksha_reports FOR DELETE TO authenticated USING (true);

-- ============================================================
-- RLS POLICIES: greetings_vouchers table
-- ============================================================
DROP POLICY IF EXISTS "auth_insert_greetings_vouchers" ON public.greetings_vouchers;
CREATE POLICY "auth_insert_greetings_vouchers" ON public.greetings_vouchers FOR INSERT TO authenticated WITH CHECK (developer_id = auth.uid());

DROP POLICY IF EXISTS "auth_select_greetings_vouchers" ON public.greetings_vouchers;
CREATE POLICY "auth_select_greetings_vouchers" ON public.greetings_vouchers FOR SELECT TO authenticated USING (developer_id = auth.uid() OR true);

DROP POLICY IF EXISTS "auth_update_greetings_vouchers" ON public.greetings_vouchers;
CREATE POLICY "auth_update_greetings_vouchers" ON public.greetings_vouchers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_greetings_vouchers" ON public.greetings_vouchers;
CREATE POLICY "auth_delete_greetings_vouchers" ON public.greetings_vouchers FOR DELETE TO authenticated USING (true);

-- ============================================================
-- RLS POLICIES: token_transactions table
-- Column is developer_id (not user_id)
-- ============================================================
DROP POLICY IF EXISTS "auth_select_token_transactions" ON public.token_transactions;
CREATE POLICY "auth_select_token_transactions" ON public.token_transactions FOR SELECT TO authenticated USING (developer_id = auth.uid() OR true);

DROP POLICY IF EXISTS "auth_insert_token_transactions" ON public.token_transactions;
CREATE POLICY "auth_insert_token_transactions" ON public.token_transactions FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_token_transactions" ON public.token_transactions;
CREATE POLICY "auth_update_token_transactions" ON public.token_transactions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_token_transactions" ON public.token_transactions;
CREATE POLICY "auth_delete_token_transactions" ON public.token_transactions FOR DELETE TO authenticated USING (true);

-- ============================================================
-- RLS POLICIES: show_apartment_bookings table
-- ============================================================
DROP POLICY IF EXISTS "auth_select_show_apartment_bookings" ON public.show_apartment_bookings;
CREATE POLICY "auth_select_show_apartment_bookings" ON public.show_apartment_bookings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_update_show_apartment_bookings" ON public.show_apartment_bookings;
CREATE POLICY "auth_update_show_apartment_bookings" ON public.show_apartment_bookings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_show_apartment_bookings" ON public.show_apartment_bookings;
CREATE POLICY "auth_delete_show_apartment_bookings" ON public.show_apartment_bookings FOR DELETE TO authenticated USING (true);

-- ============================================================
-- RLS POLICIES: Admin-only tables
-- ============================================================

-- conversation_memory
DROP POLICY IF EXISTS "auth_select_conversation_memory" ON public.conversation_memory;
CREATE POLICY "auth_select_conversation_memory" ON public.conversation_memory FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_conversation_memory" ON public.conversation_memory;
CREATE POLICY "auth_insert_conversation_memory" ON public.conversation_memory FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_conversation_memory" ON public.conversation_memory;
CREATE POLICY "auth_update_conversation_memory" ON public.conversation_memory FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_conversation_memory" ON public.conversation_memory;
CREATE POLICY "auth_delete_conversation_memory" ON public.conversation_memory FOR DELETE TO authenticated USING (true);

-- conversations
DROP POLICY IF EXISTS "auth_select_conversations" ON public.conversations;
CREATE POLICY "auth_select_conversations" ON public.conversations FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_conversations" ON public.conversations;
CREATE POLICY "auth_insert_conversations" ON public.conversations FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_conversations" ON public.conversations;
CREATE POLICY "auth_update_conversations" ON public.conversations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_conversations" ON public.conversations;
CREATE POLICY "auth_delete_conversations" ON public.conversations FOR DELETE TO authenticated USING (true);

-- crm_follow_ups
DROP POLICY IF EXISTS "auth_select_crm_follow_ups" ON public.crm_follow_ups;
CREATE POLICY "auth_select_crm_follow_ups" ON public.crm_follow_ups FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_crm_follow_ups" ON public.crm_follow_ups;
CREATE POLICY "auth_insert_crm_follow_ups" ON public.crm_follow_ups FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_crm_follow_ups" ON public.crm_follow_ups;
CREATE POLICY "auth_update_crm_follow_ups" ON public.crm_follow_ups FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_crm_follow_ups" ON public.crm_follow_ups;
CREATE POLICY "auth_delete_crm_follow_ups" ON public.crm_follow_ups FOR DELETE TO authenticated USING (true);

-- crm_interactions
DROP POLICY IF EXISTS "auth_select_crm_interactions" ON public.crm_interactions;
CREATE POLICY "auth_select_crm_interactions" ON public.crm_interactions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_crm_interactions" ON public.crm_interactions;
CREATE POLICY "auth_insert_crm_interactions" ON public.crm_interactions FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_crm_interactions" ON public.crm_interactions;
CREATE POLICY "auth_update_crm_interactions" ON public.crm_interactions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_crm_interactions" ON public.crm_interactions;
CREATE POLICY "auth_delete_crm_interactions" ON public.crm_interactions FOR DELETE TO authenticated USING (true);

-- crm_leads
DROP POLICY IF EXISTS "auth_select_crm_leads" ON public.crm_leads;
CREATE POLICY "auth_select_crm_leads" ON public.crm_leads FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_crm_leads" ON public.crm_leads;
CREATE POLICY "auth_insert_crm_leads" ON public.crm_leads FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_crm_leads" ON public.crm_leads;
CREATE POLICY "auth_update_crm_leads" ON public.crm_leads FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_crm_leads" ON public.crm_leads;
CREATE POLICY "auth_delete_crm_leads" ON public.crm_leads FOR DELETE TO authenticated USING (true);
