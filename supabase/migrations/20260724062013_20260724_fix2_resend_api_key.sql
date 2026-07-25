/*
# Fix 2 — Store RESEND_API_KEY in vault for edge function access

1. Security
- Stores the RESEND_API_KEY as a vault secret so edge functions can access it via Deno.env.get("RESEND_API_KEY")
2. Notes
- The daily-neena-digest edge function already reads this key from the environment
- Vault secrets are automatically exposed as environment variables to edge functions
*/

SELECT vault.create_secret(
  're_hCTBUx6u_DsPJPT79rZo6D7iu4CRBe28S',
  'RESEND_API_KEY',
  'Resend API key for transactional email (daily Neena digest)'
);
