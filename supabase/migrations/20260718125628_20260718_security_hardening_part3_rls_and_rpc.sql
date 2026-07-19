/*
# Security Hardening Part 3 — RLS policy + RPC execute tightening

## Summary
Resolves remaining security-advisor findings: RLS policies whose
USING/WITH CHECK are always true, and SECURITY DEFINER functions that
anon can execute.

## 1. RLS policy tightening (7 tables)

- access_codes.ac_update: was USING(true) WITH CHECK(true) for
  anon,authenticated — anyone could flip is_used / rewrite codes.
  No frontend code updates this table directly. Tightened to
  founder-only (email = nirmalserai@gmail.com), matching the existing
  ac_insert / ac_delete policies.
- beta_interest.bi_insert: replaced WITH CHECK(true) with a real
  validation (non-empty name + email). Public intake preserved.
- beta_notify.bn_insert: replaced WITH CHECK(true) with non-empty
  email check. Public intake preserved.
- buyers.anon_insert_buyers: replaced WITH CHECK(true) with
  (user_id IS NULL OR user_id = auth.uid()). The anonymous widget
  path (user_id NULL) and the authenticated register path
  (user_id = own id) both pass; a signed-in user can no longer insert
  a buyers row under someone else's user_id.
- newsletter_subscribers.anyone_can_subscribe: replaced WITH CHECK(true)
  with non-empty email check. Public subscribe preserved.
- show_apartment_bookings.anon_insert_bookings: DROPPED. The only insert
  path is the book_showing SECURITY DEFINER RPC (bypasses RLS as the
  postgres owner). Direct client inserts are now denied by RLS — the
  desired behavior, since all bookings must go through the RPC.
- whatsapp_leads.insert_whatsapp_leads: DROPPED. The only insert path is
  the whatsapp-lead-click edge function (service role, bypasses RLS).
  Direct client inserts are now denied by RLS.

## 2. RPC EXECUTE locks (2 functions)

- book_showing: REVOKE from anon + PUBLIC. Previously anon could call
  this SECURITY DEFINER function and drain a developer's token wallet
  by spamming booking requests (each call deducts 5 tokens from the
  listing's developer). Now authenticated-only. The booking modal
  requires a signed-in session; anon visitors can still browse listings
  but cannot submit bookings.
- increment_ambassador_count: REVOKE from anon + PUBLIC. Previously anon
  could inflate ambassador conversation counters. Now authenticated-only.

## 3. Functions reviewed and intentionally left as-is

- admin_grant_tokens, get_analytics_data: SECURITY DEFINER + executable
  by authenticated, with a hard internal gate
  (auth.jwt()->>'email' = 'nirmalserai@gmail.com'). Cannot revoke from
  authenticated (the founder signs in as an authenticated user to use
  the admin UI) and cannot switch to SECURITY INVOKER (the function
  reads/writes token_wallets + invoices across ALL users, which owner-
  scoped RLS would block). The email gate is the real authorization.
- burn_own_tokens, submit_listing: SECURITY DEFINER + authenticated-only
  with an internal auth.uid() ownership check — they only ever touch the
  caller's own wallet. SECURITY INVOKER would break them (RLS on
  token_wallets is owner-scoped). Correct as designed.

## 4. Leaked password protection (NOT in this migration)
HIBP compromised-password checking is a project-level Auth config flag
that is not writable from a SQL migration. It must be toggled in the
Supabase dashboard: Authentication > Providers > Email > "Check for
leaked passwords". No code change can enable it.

## Notes
- All DROP POLICY / CREATE POLICY pairs are idempotent.
- No data is deleted or rewritten; only policies + grants change.
*/

-- ═══ 1. RLS POLICY TIGHTENING ═══

-- access_codes: founder-only UPDATE (was wide open)
DROP POLICY IF EXISTS "ac_update" ON access_codes;
CREATE POLICY "ac_update" ON access_codes FOR UPDATE TO authenticated
  USING ((auth.jwt() ->> 'email') = 'nirmalserai@gmail.com')
  WITH CHECK ((auth.jwt() ->> 'email') = 'nirmalserai@gmail.com');

-- beta_interest: validate non-empty name + email (public intake preserved)
DROP POLICY IF EXISTS "bi_insert" ON beta_interest;
CREATE POLICY "bi_insert" ON beta_interest
  FOR INSERT TO anon, authenticated
  WITH CHECK (name IS NOT NULL AND name <> '' AND email IS NOT NULL AND email <> '');

-- beta_notify: validate non-empty email (public intake preserved)
DROP POLICY IF EXISTS "bn_insert" ON beta_notify;
CREATE POLICY "bn_insert" ON beta_notify
  FOR INSERT TO anon, authenticated
  WITH CHECK (email IS NOT NULL AND email <> '');

-- buyers: block cross-user impersonation (widget + register paths preserved)
DROP POLICY IF EXISTS "anon_insert_buyers" ON buyers;
CREATE POLICY "anon_insert_buyers" ON buyers
  FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- newsletter_subscribers: validate non-empty email (public subscribe preserved)
DROP POLICY IF EXISTS "anyone_can_subscribe" ON newsletter_subscribers;
CREATE POLICY "anyone_can_subscribe" ON newsletter_subscribers
  FOR INSERT TO anon, authenticated
  WITH CHECK (email IS NOT NULL AND email <> '');

-- show_apartment_bookings: drop anon insert — only the book_showing RPC inserts
DROP POLICY IF EXISTS "anon_insert_bookings" ON show_apartment_bookings;

-- whatsapp_leads: drop anon insert — only the edge function (service role) inserts
DROP POLICY IF EXISTS "insert_whatsapp_leads" ON whatsapp_leads;

-- ═══ 2. RPC EXECUTE LOCKS ═══

REVOKE EXECUTE ON FUNCTION public.book_showing(uuid, text, text, text, date, text, text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.book_showing(uuid, text, text, text, date, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.increment_ambassador_count(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_ambassador_count(uuid) TO authenticated;
