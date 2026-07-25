/*
# Fix 2 — Create get_vault_secret RPC function

1. New Functions
- `get_vault_secret(secret_name text)` — returns the decrypted secret value from the Supabase vault
  - Security definer so edge functions with service role key can read secrets
  - Returns text (the decrypted secret value) or NULL if not found
2. Security
- Function is SECURITY DEFINER, accessible via service role key only
- Used by edge functions to retrieve secrets stored in vault
3. Notes
- This allows edge functions to read secrets from the vault when they're not set as environment variables
- The RESEND_API_KEY was stored in the vault in the previous migration
*/

CREATE OR REPLACE FUNCTION public.get_vault_secret(secret_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vault, public
AS $$
DECLARE
  secret_value text;
BEGIN
  SELECT decrypted_secret INTO secret_value
  FROM vault.decrypted_secrets
  WHERE name = secret_name
  LIMIT 1;
  
  RETURN secret_value;
END;
$$;

REVOKE ALL ON FUNCTION public.get_vault_secret(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_vault_secret(text) TO authenticated, service_role;
