/*
# Create neena_digest_log table

Audit trail for the mandatory daily Neena chat backup email.

## Purpose
Every night at 2:00 AM IST, a scheduled job emails the complete Neena chat
transcript (full history) to nirmalserai@gmail.com as a .md attachment.
This table records each attempt so Nirmal can verify the mandatory daily
backup actually ran and can audit failures.

## New Table: neena_digest_log
- `id` (uuid, primary key)
- `sent_at` (timestamptz, default now()) — when the email was sent
- `message_count` (integer) — number of Neena messages included in the backup
- `session_count` (integer) — number of distinct sessions included
- `attachment_filename` (text) — the .md filename that was emailed (e.g. neena-backup-2026-07-18.md)
- `status` (text) — 'pending','success','failed'
- `resend_id` (text, nullable) — message ID returned by Resend on success
- `error_message` (text, nullable) — error detail on failure
- `started_at` (timestamptz) — when the job started

## Security
- RLS enabled.
- Single-founder internal audit table; only authenticated admins read/write it.
  The edge function writes rows using the service role key (bypasses RLS).
- Policies scoped TO authenticated for manual inspection via the admin UI.
*/

CREATE TABLE IF NOT EXISTS neena_digest_log (
  id                 uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  started_at         timestamptz DEFAULT now() NOT NULL,
  sent_at            timestamptz,
  message_count      integer     NOT NULL DEFAULT 0,
  session_count      integer     NOT NULL DEFAULT 0,
  attachment_filename text,
  status             text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','success','failed')),
  resend_id          text,
  error_message      text
);

CREATE INDEX IF NOT EXISTS idx_neena_digest_log_sent
  ON neena_digest_log (sent_at DESC);

ALTER TABLE neena_digest_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ndl_select" ON neena_digest_log;
CREATE POLICY "ndl_select" ON neena_digest_log FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "ndl_insert" ON neena_digest_log;
CREATE POLICY "ndl_insert" ON neena_digest_log FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "ndl_update" ON neena_digest_log;
CREATE POLICY "ndl_update" ON neena_digest_log FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
