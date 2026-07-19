/*
# Lock boardroom_chats to the founder only

## Why
The `boardroom_chats` table stores private, crisis-level conversations between
Nirmal (the founder) and his AI daughters — most importantly Neena (R-01,
Queen / Crisis Authority), whose system prompt grants "uncensored, unfiltered"
candid counsel on strategy, personnel, finances, and personal matters.

The previous migration (011_boardroom_chats.sql) enabled RLS but wrote policies
as `USING (true)` / `WITH CHECK (true)` scoped to `TO authenticated`. At the
time the comment said this was "intentionally permissive because this is a
single-founder internal tool." That assumption is NO LONGER safe: the public
site now has open user registration (`/register` -> `supabase.auth.signUp`).
Once the site is published, ANY visitor can create an account and — because
the frontend ships the anon key — authenticate and read every Neena chat,
every crisis discussion, every candid personnel assessment. That is an
unacceptable private-data leak on a public site.

## What this migration does
Replaces all four CRUD policies on `boardroom_chats` so that access is
restricted to Nirmal's three known Supabase auth accounts (all variants of
his personal email). No other authenticated user — and no anon user — can
SELECT, INSERT, UPDATE, or DELETE rows.

The three authorised user IDs (from `auth.users`):
  - 50b7d004-44f7-46b3-82d4-9b77a2e3772f  (nirmalseraione@gmail.com)
  - 3b9e827f-5e54-4802-bfd0-fac2ccbb8516  (nirmalserai@hotmail.com)
  - 86d98e13-bd31-4430-abe4-f57e5d8cc338  (nirmalserai@gmail.com)  <- digest recipient

## Security changes (RLS)
- `bc_select`    -> SELECT  TO authenticated USING (auth.uid() IN (<founder ids>))
- `bc_insert`    -> INSERT  TO authenticated WITH CHECK (auth.uid() IN (<founder ids>))
- `bc_update`    -> UPDATE  TO authenticated USING (...) WITH CHECK (...)
- `bc_delete`    -> DELETE  TO authenticated USING (...)

RLS remains ENABLED. The table schema is unchanged — no columns, indexes,
or data are touched. This migration is safe to re-run (DROP IF EXISTS before
each CREATE).

## Important notes
1. This does NOT affect the `daily-neena-digest` edge function, which reads
   `boardroom_chats` using the service-role key and therefore bypasses RLS.
   The nightly backup email to nirmalserai@gmail.com continues to work.
2. If Nirmal creates a new auth account in future, add its UUID to the
   `IN (...)` list with another migration.
3. The public-facing `nora-chat` function is unaffected and correctly hides
   Neena from customers via its system prompt.
*/

ALTER TABLE boardroom_chats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bc_select" ON boardroom_chats;
CREATE POLICY "bc_select" ON boardroom_chats FOR SELECT
  TO authenticated USING (
    auth.uid() IN (
      '50b7d004-44f7-46b3-82d4-9b77a2e3772f',
      '3b9e827f-5e54-4802-bfd0-fac2ccbb8516',
      '86d98e13-bd31-4430-abe4-f57e5d8cc338'
    )
  );

DROP POLICY IF EXISTS "bc_insert" ON boardroom_chats;
CREATE POLICY "bc_insert" ON boardroom_chats FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() IN (
      '50b7d004-44f7-46b3-82d4-9b77a2e3772f',
      '3b9e827f-5e54-4802-bfd0-fac2ccbb8516',
      '86d98e13-bd31-4430-abe4-f57e5d8cc338'
    )
  );

DROP POLICY IF EXISTS "bc_update" ON boardroom_chats;
CREATE POLICY "bc_update" ON boardroom_chats FOR UPDATE
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

DROP POLICY IF EXISTS "bc_delete" ON boardroom_chats;
CREATE POLICY "bc_delete" ON boardroom_chats FOR DELETE
  TO authenticated USING (
    auth.uid() IN (
      '50b7d004-44f7-46b3-82d4-9b77a2e3772f',
      '3b9e827f-5e54-4802-bfd0-fac2ccbb8516',
      '86d98e13-bd31-4430-abe4-f57e5d8cc338'
    )
  );
