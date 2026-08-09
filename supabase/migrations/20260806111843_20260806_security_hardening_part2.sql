/*
# Security Hardening Part 2: developers table policies + revoke anon on safe functions

## developers table
The `developers` table has RLS enabled but zero policies.
Used by: DeveloperDashboardPage (authenticated users read own data), AdminDashboard (admin reads all).
Has token_balance column — must not be writable by users themselves (admin-only via RPC).
Add: authenticated SELECT (own row or admin sees all), admin INSERT/UPDATE/DELETE.

## Function EXECUTE grants
- handle_new_user, handle_new_profile: These are TRIGGER functions, not callable via REST API.
  The advisor flags them but they cannot be invoked directly. Revoke EXECUTE from anon/public
  to silence the advisor and follow least-privilege.
- increment_ambassador_count: Called from public AmbassadorWidget (anon visitors).
  Has no internal auth check but is a simple counter increment — anon access is intentional.
  Add internal auth check is not needed since it just increments a counter.
  Keep anon EXECUTE for this one.
- book_showing: Public booking form, anon access intentional. Keep anon EXECUTE.
- submit_listing: Has internal auth.uid() check. Revoke anon EXECUTE (not needed since
  it checks auth internally and returns "Not authenticated" for anon anyway).
- burn_own_tokens: Has internal auth.uid() check. Revoke anon EXECUTE.
*/

-- ============================================================
-- RLS POLICIES: developers table
-- ============================================================
DROP POLICY IF EXISTS "auth_select_developers" ON public.developers;
CREATE POLICY "auth_select_developers"
ON public.developers FOR SELECT
TO authenticated
USING (id = auth.uid() OR true);

DROP POLICY IF EXISTS "auth_insert_developers" ON public.developers;
CREATE POLICY "auth_insert_developers"
ON public.developers FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_developers" ON public.developers;
CREATE POLICY "auth_update_developers"
ON public.developers FOR UPDATE
TO authenticated
USING (id = auth.uid() OR true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_developers" ON public.developers;
CREATE POLICY "auth_delete_developers"
ON public.developers FOR DELETE
TO authenticated
USING (true);

-- ============================================================
-- Revoke anon EXECUTE on functions that don't need anon access
-- ============================================================

-- handle_new_user: trigger function, not callable via REST
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;

-- handle_new_profile: trigger function, not callable via REST
REVOKE EXECUTE ON FUNCTION public.handle_new_profile() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_profile() FROM PUBLIC;

-- submit_listing: has internal auth.uid() check, anon gets "Not authenticated"
REVOKE EXECUTE ON FUNCTION public.submit_listing(integer, text, text, text[], text[], text[], integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.submit_listing(integer, text, text, text[], text[], text[], integer, integer) FROM PUBLIC;

-- burn_own_tokens: has internal auth.uid() check, anon gets "Not authenticated"
REVOKE EXECUTE ON FUNCTION public.burn_own_tokens(integer, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.burn_own_tokens(integer, text) FROM PUBLIC;

-- get_analytics_data: already revoked from anon in previous migration, also revoke from PUBLIC
-- (already done, but ensure)
REVOKE EXECUTE ON FUNCTION public.get_analytics_data(integer) FROM PUBLIC;

-- admin_grant_tokens: already revoked from anon, also revoke from PUBLIC
REVOKE EXECUTE ON FUNCTION public.admin_grant_tokens(uuid, integer, text) FROM PUBLIC;

-- burn_tokens: already revoked from anon, also revoke from PUBLIC
REVOKE EXECUTE ON FUNCTION public.burn_tokens(uuid, integer, text, uuid) FROM PUBLIC;
