/*
# Allow 'skipped' status in neena_digest_log

RESEND_API_KEY is now optional. When the key is absent, the daily digest
edge function still gathers and logs the backup but skips the email send,
recording status='skipped' instead of failing. This relaxes the CHECK
constraint to accept the new status.
*/

ALTER TABLE neena_digest_log
  DROP CONSTRAINT IF EXISTS neena_digest_log_status_check;

ALTER TABLE neena_digest_log
  ADD CONSTRAINT neena_digest_log_status_check
  CHECK (status IN ('pending','success','failed','skipped'));
