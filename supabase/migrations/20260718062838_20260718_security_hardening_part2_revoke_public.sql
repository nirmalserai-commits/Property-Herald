/*
# Security Hardening Part 2 — Remove PUBLIC EXECUTE on restricted RPCs

PostgreSQL grants EXECUTE to PUBLIC by default on function creation.
The previous migration revoked from anon/authenticated but left the
PUBLIC grant, so anon could still execute. This removes PUBLIC execute
on the five restricted functions and re-grants to authenticated only.
*/

REVOKE EXECUTE ON FUNCTION public.admin_grant_tokens(uuid, integer, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_analytics_data(integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.burn_own_tokens(integer, text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.submit_listing(uuid, text, text, text[], text[], text[], integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_wallet_on_profile() FROM PUBLIC;

-- Re-grant to authenticated (the revoke from PUBLIC removed it for them too)
GRANT EXECUTE ON FUNCTION public.admin_grant_tokens(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_analytics_data(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.burn_own_tokens(integer, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_listing(uuid, text, text, text[], text[], text[], integer, integer) TO authenticated;
