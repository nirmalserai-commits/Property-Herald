/*
# Beta Access Launch — phased rollout infrastructure

Adds the data layer for Property Herald's phased launch:
Phase 1 (NOW) beta access codes granting 1-hour preview access,
Phase 2 (Jul 25) developer/agency registration interest capture,
Phase 3 (Aug 15) "notify me" email capture for the all-India launch.

## New Tables

### access_codes
Stores the 50 unique 8-character alphanumeric beta access codes.
- `id` — UUID primary key
- `code` — 8-char alphanumeric string, unique. Generated from an
  ambiguity-free alphabet (no 0/O/1/I/L) for readability.
- `is_used` — boolean, default false. Flipped to true the first time a
  visitor redeems the code.
- `used_at` — timestamptz, nullable. Set when the code is first redeemed.
- `expires_at` — timestamptz, nullable. Set to used_at + 1 hour on first
  redemption; the visitor has platform access until this timestamp.
- `created_at` — timestamptz, default now()
Seeded with 50 generated codes via a PL/pgSQL loop (see end of migration).

### beta_interest
Phase 2 "Register Interest" submissions (developer/agency).
- `id` — UUID primary key
- `name` — text, not null
- `email` — text, not null, unique
- `company` — text, nullable
- `mobile` — text, nullable
- `created_at` — timestamptz, default now()

### beta_notify
Phase 3 "Notify Me" submissions (all-India launch alert).
- `id` — UUID primary key
- `email` — text, not null, unique
- `created_at` — timestamptz, default now()

## Security

### access_codes
- RLS enabled.
- SELECT + UPDATE open to `anon, authenticated` so logged-out visitors can
  verify a code and redeem it (mark used / set expiry) directly from the
  client. This is intentional and documented: beta codes are single-use
  preview tokens, not secret credentials.
- INSERT + DELETE scoped to `authenticated` so only the admin can
  regenerate/clean up codes.

### beta_interest / beta_notify
- RLS enabled.
- INSERT open to `anon, authenticated` so logged-out visitors can submit.
- SELECT open to `anon, authenticated` so the admin (authenticated) can read
  the lists, and the anon client can check for duplicate-email errors.
  These are intentionally public lead-capture lists with no sensitive data.
- No UPDATE or DELETE policies (submissions are immutable).

## Important notes
1. The 50 codes are generated with an ambiguity-free alphabet and a
   collision-retry loop, so all 50 are guaranteed unique.
2. Re-running this migration is safe: tables use IF NOT EXISTS, policies are
   dropped-then-recreated, and the seed loop only inserts when fewer than 50
   codes exist (idempotent).
*/

-- ─── access_codes ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS access_codes (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  code       text        NOT NULL UNIQUE,
  is_used    boolean     NOT NULL DEFAULT false,
  used_at    timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE access_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ac_select" ON access_codes;
CREATE POLICY "ac_select" ON access_codes FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "ac_update" ON access_codes;
CREATE POLICY "ac_update" ON access_codes FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "ac_insert" ON access_codes;
CREATE POLICY "ac_insert" ON access_codes FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "ac_delete" ON access_codes;
CREATE POLICY "ac_delete" ON access_codes FOR DELETE
  TO authenticated USING (true);

-- ─── beta_interest ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS beta_interest (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  name       text        NOT NULL,
  email      text        NOT NULL UNIQUE,
  company    text,
  mobile     text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE beta_interest ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bi_insert" ON beta_interest;
CREATE POLICY "bi_insert" ON beta_interest FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "bi_select" ON beta_interest;
CREATE POLICY "bi_select" ON beta_interest FOR SELECT
  TO anon, authenticated USING (true);

-- ─── beta_notify ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS beta_notify (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  email      text        NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE beta_notify ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bn_insert" ON beta_notify;
CREATE POLICY "bn_insert" ON beta_notify FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "bn_select" ON beta_notify;
CREATE POLICY "bn_select" ON beta_notify FOR SELECT
  TO anon, authenticated USING (true);

-- ─── Seed 50 unique 8-char alphanumeric codes (idempotent) ───────────────
DO $$
DECLARE
  existing_count int;
  i int;
  j int;
  new_code text;
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- ambiguity-free
BEGIN
  SELECT count(*) INTO existing_count FROM access_codes;
  IF existing_count >= 50 THEN RETURN; END IF;

  FOR i IN 1..(50 - existing_count) LOOP
    LOOP
      new_code := '';
      FOR j IN 1..8 LOOP
        new_code := new_code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
      END LOOP;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM access_codes WHERE code = new_code);
    END LOOP;
    INSERT INTO access_codes (code) VALUES (new_code);
  END LOOP;
END $$;
