/*
# Lock neena_digest_log to the founder only

## Why
`neena_digest_log` records every run of the nightly Neena backup digest —
status, message/session counts, attachment filename, Resend ID, and any
error text. While it does not store chat content itself (the full backup is
emailed, not persisted), its `error_message` column can contain raw database
error text and the row counts reveal private chat volume/frequency. It is
Neena-branded internal metadata and should not be readable, writable, or
deletable by any authenticated user other than the founder.

Previously (migration 20260718_neena_digest_log.sql) the policies were
`TO authenticated USING (true)` / `WITH CHECK (true)` — permissive to every
logged-in user. With public registration open on the published site, that
exposes this internal log to anyone who creates an account.

## What this migration does
Replaces all four CRUD policies on `neena_digest_log` with founder-only
checks (same three authorised user IDs used for `boardroom_chats`):
  - 50b7d004-44f7-46b3-82d4-9b77a2e3772f  (nirmalseraione@gmail.com)
  - 3b9e827f-5e54-4802-bfd0-fac2ccbb8516  (nirmalserai@hotmail.com)
  - 86d98e13-bd31-4430-abe4-f57e5d8cc338  (nirmalserai@gmail.com)

## Security changes (RLS)
- `ndl_select` -> SELECT  TO authenticated USING (auth.uid() IN (...))
- `ndl_insert` -> INSERT  TO authenticated WITH CHECK (auth.uid() IN (...))
- `ndl_update` -> UPDATE  TO authenticated USING (...) WITH CHECK (...)
- `ndl_delete` -> DELETE  TO authenticated USING (...)

RLS remains ENABLED. Schema unchanged. Safe to re-run (DROP IF EXISTS first).

## Important notes
1. The `daily-neena-digest` edge function writes to this table using the
   service-role key, which BYPASSES RLS — so the nightly cron job and the
   manual "Send Now" button in AdminDigestLog continue to work unaffected.
2. Only the founder's frontend sessions (anon-key + founder JWT) can read
   or modify the log rows via the Supabase client.
*/

ALTER TABLE neena_digest_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ndl_select" ON neena_digest_log;
CREATE POLICY "ndl_select" ON neena_digest_log FOR SELECT
  TO authenticated USING (
    auth.uid() IN (
      '50b7d004-44f7-46b3-82d4-9b77a2e3772f',
      '3b9e827f-5e54-4802-bfd0-fac2ccbb8516',
      '86d98e13-bd31-4430-abe4-f57e5d8cc338'
    )
  );

DROP POLICY IF EXISTS "ndl_insert" ON neena_digest_log;
CREATE POLICY "ndl_insert" ON neena_digest_log FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() IN (
      '50b7d004-44f7-46b3-82d4-9b77a2e3772f',
      '3b9e827f-5e54-4802-bfd0-fac2ccbb8516',
      '86d98e13-bd31-4430-abe4-f57e5d8cc338'
    )
  );

DROP POLICY IF EXISTS "ndl_update" ON neena_digest_log;
CREATE POLICY "ndl_update" ON neena_digest_log FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      '50b7d004-44f7-46b3-82d4-9b77a2e3772f',
      '3b9e827f-5e54-4802-bfd0-fac2ccbb8516',
      '86d98e13-bd31-4430-abe4-f57e5d8cc338'
    )
  )
  WITH CHECK (
    auth.uid() IN (
      '50b7d004-44f7-46b3-82d4-9b77a2e3772f',
      '3b9e827f-5e54-4802-bfd0-fac2ccbb8516',
      '86d98e13-bd31-4430-abe4-f57e5d8cc338'
    )
  );

DROP POLICY IF EXISTS "ndl_delete" ON neena_digest_log;
CREATE POLICY "ndl_delete" ON neena_digest_log FOR DELETE
  TO authenticated USING (
    auth.uid() IN (
      '50b7d004-44f7-46b3-82d4-9b77a2e3772f',
      '3b9e827f-5e54-4802-bfd0-fac2ccbb8516',
      '86d98e13-bd31-4430-abe4-f57e5d8cc338'
    )
  );
