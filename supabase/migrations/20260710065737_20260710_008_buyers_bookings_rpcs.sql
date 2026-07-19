
/*
# Migration 008: Buyers, Show Apartment Bookings, Helper RPCs, Listing Price Fields

## New Tables

### 1. buyers
Stores buyer leads from two sources:
- Nora AI 6-question widget flow (anon visitors, no auth required)
- Buyer registration page /register/buyer (authenticated)

Columns: id, user_id (nullable FK auth.users), full_name, email, phone,
city_preference, budget_label, budget_min, budget_max,
property_type, deal_type, timeline, intent_score (0-100),
nora_conversation_id (FK ambassador_conversations), source, created_at, updated_at

### 2. show_apartment_bookings
Records show-apartment requests from buyers. Each booking atomically
deducts 5 tokens from the developer's wallet via the book_showing RPC.

Columns: id, listing_id (FK listings), developer_id (FK profiles),
buyer_name, buyer_phone, buyer_email, preferred_date, preferred_time,
message, status (pending/confirmed/cancelled/completed),
tokens_deducted (always 5), created_at, updated_at

## Modified Tables

### listings
Added price_min and price_max (BIGINT, nullable) — property price range in INR.
Existing listings unaffected (both default to NULL).

## New Functions

### increment_ambassador_count(p_ambassador_id)
SECURITY DEFINER — increments conversation_count on an ambassador row.
Called by the AmbassadorWidget each time a conversation is opened.

### book_showing(...)
SECURITY DEFINER — atomic booking + token deduction:
1. Looks up developer (profile_id) from the listing
2. Verifies developer has ≥ 5 tokens in token_wallets
3. Inserts the show_apartment_bookings record
4. Deducts 5 from token_wallets.balance
5. Inserts a 'burn' record in token_transactions
Returns new booking UUID. Raises exceptions for missing wallet or insufficient balance.

## Security

- buyers: anon + authenticated INSERT; SELECT scoped to own user_id or admin email
- show_apartment_bookings: anon + authenticated INSERT; SELECT scoped to admin only (buyers see via confirmation)
- RPCs: SECURITY DEFINER with explicit grants to anon and authenticated

## Notes
1. buyers.user_id defaults to auth.uid() so authenticated registrations auto-link
2. buyers.intent_score is CHECK 0–100
3. token_wallets.user_id = profiles.id = auth.users.id
*/

-- ─────────────────────────────────────────────
-- LISTINGS — add price range columns
-- ─────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='price_min'
  ) THEN
    ALTER TABLE listings ADD COLUMN price_min BIGINT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='price_max'
  ) THEN
    ALTER TABLE listings ADD COLUMN price_max BIGINT;
  END IF;
END $$;


-- ─────────────────────────────────────────────
-- 1. BUYERS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS buyers (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID         REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  full_name            TEXT         NOT NULL DEFAULT '',
  email                TEXT         NOT NULL DEFAULT '',
  phone                TEXT         NOT NULL DEFAULT '',
  city_preference      TEXT,
  budget_label         TEXT,
  budget_min           BIGINT,
  budget_max           BIGINT,
  property_type        TEXT         CHECK (property_type IN ('residential','commercial','both')),
  deal_type            TEXT         CHECK (deal_type IN ('buy','rent','invest','both')),
  timeline             TEXT         CHECK (timeline IN ('immediate','3_months','6_months','1_year','flexible')),
  intent_score         INTEGER      NOT NULL DEFAULT 0 CHECK (intent_score >= 0 AND intent_score <= 100),
  nora_conversation_id UUID         REFERENCES ambassador_conversations(id) ON DELETE SET NULL,
  source               TEXT         NOT NULL DEFAULT 'widget' CHECK (source IN ('widget','registration','referral')),
  created_at           TIMESTAMPTZ  DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buyers_user_id      ON buyers(user_id);
CREATE INDEX IF NOT EXISTS idx_buyers_email        ON buyers(email);
CREATE INDEX IF NOT EXISTS idx_buyers_intent_score ON buyers(intent_score DESC);
CREATE INDEX IF NOT EXISTS idx_buyers_created_at   ON buyers(created_at DESC);

ALTER TABLE buyers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_buyers" ON buyers;
CREATE POLICY "anon_insert_buyers" ON buyers FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "select_own_or_admin_buyers" ON buyers;
CREATE POLICY "select_own_or_admin_buyers" ON buyers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR (auth.jwt()->>'email') = 'nirmalserai@gmail.com');

DROP POLICY IF EXISTS "update_own_buyers" ON buyers;
CREATE POLICY "update_own_buyers" ON buyers FOR UPDATE
  TO authenticated
  USING  (auth.uid() = user_id OR (auth.jwt()->>'email') = 'nirmalserai@gmail.com')
  WITH CHECK (auth.uid() = user_id OR (auth.jwt()->>'email') = 'nirmalserai@gmail.com');

DROP POLICY IF EXISTS "admin_delete_buyers" ON buyers;
CREATE POLICY "admin_delete_buyers" ON buyers FOR DELETE
  TO authenticated USING ((auth.jwt()->>'email') = 'nirmalserai@gmail.com');


-- ─────────────────────────────────────────────
-- 2. SHOW APARTMENT BOOKINGS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS show_apartment_bookings (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id       UUID         NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  developer_id     UUID         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  buyer_name       TEXT         NOT NULL,
  buyer_phone      TEXT         NOT NULL,
  buyer_email      TEXT,
  preferred_date   DATE         NOT NULL,
  preferred_time   TEXT,
  message          TEXT,
  status           TEXT         NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','confirmed','cancelled','completed')),
  tokens_deducted  INTEGER      NOT NULL DEFAULT 5,
  created_at       TIMESTAMPTZ  DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sab_listing_id   ON show_apartment_bookings(listing_id);
CREATE INDEX IF NOT EXISTS idx_sab_developer_id ON show_apartment_bookings(developer_id);
CREATE INDEX IF NOT EXISTS idx_sab_created_at   ON show_apartment_bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sab_status       ON show_apartment_bookings(status);

ALTER TABLE show_apartment_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_bookings" ON show_apartment_bookings;
CREATE POLICY "anon_insert_bookings" ON show_apartment_bookings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_select_bookings" ON show_apartment_bookings;
CREATE POLICY "admin_select_bookings" ON show_apartment_bookings FOR SELECT
  TO authenticated
  USING ((auth.jwt()->>'email') = 'nirmalserai@gmail.com'
    OR auth.uid() = developer_id);

DROP POLICY IF EXISTS "admin_update_bookings" ON show_apartment_bookings;
CREATE POLICY "admin_update_bookings" ON show_apartment_bookings FOR UPDATE
  TO authenticated
  USING  ((auth.jwt()->>'email') = 'nirmalserai@gmail.com' OR auth.uid() = developer_id)
  WITH CHECK ((auth.jwt()->>'email') = 'nirmalserai@gmail.com' OR auth.uid() = developer_id);

DROP POLICY IF EXISTS "admin_delete_bookings" ON show_apartment_bookings;
CREATE POLICY "admin_delete_bookings" ON show_apartment_bookings FOR DELETE
  TO authenticated USING ((auth.jwt()->>'email') = 'nirmalserai@gmail.com');


-- ─────────────────────────────────────────────
-- RPC: increment_ambassador_count
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_ambassador_count(p_ambassador_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE ambassadors
  SET conversation_count = conversation_count + 1,
      updated_at = NOW()
  WHERE id = p_ambassador_id;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_ambassador_count(UUID) TO anon, authenticated;


-- ─────────────────────────────────────────────
-- RPC: book_showing — atomic booking + token deduction
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION book_showing(
  p_listing_id     UUID,
  p_buyer_name     TEXT,
  p_buyer_phone    TEXT,
  p_buyer_email    TEXT,
  p_preferred_date DATE,
  p_preferred_time TEXT,
  p_message        TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_developer_id  UUID;
  v_wallet_balance INTEGER;
  v_booking_id    UUID;
  v_new_balance   INTEGER;
BEGIN
  -- 1. Resolve developer from listing
  SELECT profile_id INTO v_developer_id
  FROM listings WHERE id = p_listing_id;

  IF v_developer_id IS NULL THEN
    RAISE EXCEPTION 'Listing not found';
  END IF;

  -- 2. Check token balance
  SELECT balance INTO v_wallet_balance
  FROM token_wallets WHERE user_id = v_developer_id;

  IF v_wallet_balance IS NULL THEN
    RAISE EXCEPTION 'Developer has no token wallet';
  END IF;

  IF v_wallet_balance < 5 THEN
    RAISE EXCEPTION 'Insufficient tokens — developer has % tokens, needs 5', v_wallet_balance;
  END IF;

  -- 3. Insert booking
  INSERT INTO show_apartment_bookings (
    listing_id, developer_id, buyer_name, buyer_phone, buyer_email,
    preferred_date, preferred_time, message, tokens_deducted
  ) VALUES (
    p_listing_id, v_developer_id, p_buyer_name, p_buyer_phone, p_buyer_email,
    p_preferred_date, p_preferred_time, p_message, 5
  ) RETURNING id INTO v_booking_id;

  -- 4. Deduct 5 tokens
  UPDATE token_wallets
  SET balance = balance - 5, updated_at = NOW()
  WHERE user_id = v_developer_id
  RETURNING balance INTO v_new_balance;

  -- 5. Record transaction
  INSERT INTO token_transactions (user_id, type, amount, reason, related_listing_id, balance_after)
  VALUES (v_developer_id, 'burn', -5, 'Show apartment booking', p_listing_id, v_new_balance);

  RETURN v_booking_id;
END;
$$;

GRANT EXECUTE ON FUNCTION book_showing(UUID, TEXT, TEXT, TEXT, DATE, TEXT, TEXT)
  TO anon, authenticated;
