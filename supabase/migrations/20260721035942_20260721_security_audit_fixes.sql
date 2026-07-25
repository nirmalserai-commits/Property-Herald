/*
# Security Audit Fixes — Revoke PUBLIC execute on SECURITY DEFINER functions

## Summary
Resolves the 7 "Security Definer Function Executable by Public" warnings
reported by the Supabase / Bolt security advisor. Each SECURITY DEFINER
function in the public schema inherits a default EXECUTE grant to the
PUBLIC role, which means the anon (unauthenticated) role can invoke it.
This migration REVOKEs that blanket grant from every SECURITY DEFINER
function. Explicit grants to `anon` and/or `authenticated` that were
already applied in migration 20260718_security_hardening remain in place,
so the application continues to work unchanged.

## Functions affected (7)
1.  admin_grant_tokens(uuid, integer, text)   — authenticated only
2.  book_showing(uuid, text, text, text, date, text, text) — anon + authenticated
3.  burn_own_tokens(integer, text, uuid)       — authenticated only
4.  create_wallet_on_profile()                 — trigger only (no role grants)
5.  get_analytics_data(integer)                — authenticated only
6.  increment_ambassador_count(uuid)          — authenticated only
7.  submit_listing(uuid, text, text, text[], text[], text[], integer, integer) — authenticated only

## What this does
- REVOKE EXECUTE ON FUNCTION ... FROM PUBLIC for each of the 7 functions.
- Does NOT touch existing anon/authenticated grants.
- Does NOT alter function bodies or search_path (already hardened).

## Notes
- Leaked password protection (the 8th warning) is an Auth config setting
  that cannot be toggled from a SQL migration; it must be enabled from the
  Bolt / Supabase dashboard under Authentication → Email →
  Prevent Leaked Passwords.
*/

REVOKE EXECUTE ON FUNCTION public.admin_grant_tokens(uuid, integer, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.book_showing(uuid, text, text, text, date, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.burn_own_tokens(integer, text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_wallet_on_profile() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_analytics_data(integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_ambassador_count(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.submit_listing(uuid, text, text, text[], text[], text[], integer, integer) FROM PUBLIC;
