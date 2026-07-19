-- Enable pg_cron for scheduled edge function invocations (daily Neena digest at 2:00 AM IST).
-- pg_cron runs in the PostgreSQL scheduler; we use it to call an edge function via pg_net + supabase_functions.invoke.
-- Safe to re-run: CREATE EXTENSION IF NOT EXISTS.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
COMMENT ON EXTENSION pg_cron IS 'Enables scheduled jobs (daily Neena chat backup email).';
