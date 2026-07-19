/*
# Enable pg_net and schedule nightly Neena digest email at 2:00 AM IST

## Purpose
Mandatory daily full backup of all Neena chat messages, emailed as a .md
attachment to nirmalserai@gmail.com. Runs every night at 2:00 AM IST.

## Schedule
- IST = UTC + 5:30, so 2:00 AM IST = 20:30 UTC (8:30 PM UTC, previous day).
- pg_cron uses UTC. Cron expression: '30 20 * * *' = minute 30, hour 20, every day.

## How it works
- pg_cron invokes the `daily-neena-digest` edge function via HTTP POST using pg_net.
- The edge function reads all Neena messages from boardroom_chats, builds a
  Markdown transcript, and emails it via Resend.
- Every run is logged in neena_digest_log (success or failure).

## Idempotency
- The job is unscheduled (if present) inside a DO block before being created so
  re-running this migration does not create duplicate schedules.
*/

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
COMMENT ON EXTENSION pg_net IS 'Enables HTTP calls from pg_cron jobs to invoke edge functions.';

DO $$
BEGIN
  BEGIN
    PERFORM cron.unschedule('neena-digest-nightly');
  EXCEPTION WHEN OTHERS THEN
    -- job doesn't exist yet; safe to ignore
    NULL;
  END;
END $$;

SELECT cron.schedule(
  'neena-digest-nightly',
  '30 20 * * *',
  $$
    SELECT net.http_post(
      url := 'https://xhpxrqkbqayhvqqpsxpx.supabase.co/functions/v1/daily-neena-digest',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
      ),
      body := '{}'::jsonb
    );
  $$
);
