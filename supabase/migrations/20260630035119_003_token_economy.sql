
/*
# Token Economy Core Schema

Adds the complete token economy infrastructure to Property Herald.

## New Tables

1. `site_config`
   - Global key-value settings (token_rate_inr = 20, magazine_readers, low_balance_threshold)
   - Public read, admin-only writes (via service role)

2. `token_bundles`
   - 5 pre-seeded purchase packages (Starter → Enterprise)
   - Stores base_tokens, bonus_tokens, total_tokens, price_inr

3. `token_wallets`
   - One record per user, tracks current token balance
   - balance column has CHECK constraint (>= 0) preventing negative values
   - Auto-created via trigger when a profile is inserted
   - Existing profiles backfilled at 0

4. `token_transactions`
   - Immutable audit log of every token movement
   - type: purchase | burn | bonus | refund
   - amount: positive for credits, negative for debits
   - balance_after: snapshot of balance after the transaction

5. `invoices`
   - GST-compliant invoices generated per token purchase
   - invoice_number auto-generated as PH-YYYY-NNNN (sequential)
   - Stores subtotal, GST 18%, total, razorpay_payment_id

## Modified Tables

- `listings`: Added is_hot (boolean), featured_expires_at (timestamptz), hot_expires_at (timestamptz)
- `profiles`: Added verified_badge_active (boolean), verified_badge_expires_at (timestamptz)

## DB Functions

- `create_wallet_on_profile()`: Trigger function — creates wallet when profile inserted
- `generate_invoice_number()`: Returns next sequential invoice number PH-YYYY-NNNN
- `burn_own_tokens(amount, reason, listing_id)`: Atomically burns tokens from the calling user's wallet.
  Checks balance, updates wallet, logs transaction. Returns JSONB {success, balance, error}.
  Safe to call from authenticated frontend via supabase.rpc().

## Security

- All new tables have RLS enabled
- token_wallets: authenticated users select their own row only
- token_transactions: authenticated users select their own rows only
- invoices: authenticated users select their own rows only
- site_config, token_bundles: public read (anon + authenticated)
- No direct INSERT/UPDATE/DELETE allowed on wallets or transactions — use RPC or service role

## Important Notes

1. The balance CHECK (>= 0) constraint + FOR UPDATE lock in burn_own_tokens prevents overdrafts
2. Existing profiles are backfilled with empty wallets in this migration
3. Invoice numbers use a persistent Postgres sequence (invoice_number_seq); never resets
*/

-- ──────────────────────────────────────────────
-- 1. SITE CONFIG
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS site_config (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO site_config (key, value) VALUES
  ('token_rate_inr',        '20'),
  ('magazine_readers',      '100000'),
  ('low_balance_threshold', '20')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_site_config" ON site_config;
CREATE POLICY "public_read_site_config" ON site_config FOR SELECT
  TO anon, authenticated USING (true);


-- ──────────────────────────────────────────────
-- 2. TOKEN BUNDLES
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS token_bundles (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT    NOT NULL UNIQUE,
  base_tokens  INTEGER NOT NULL,
  bonus_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL,
  price_inr    INTEGER NOT NULL,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO token_bundles (name, base_tokens, bonus_tokens, total_tokens, price_inr) VALUES
  ('Starter',    100,   0,   100,  2000),
  ('Growth',     250,  25,   275,  5000),
  ('Power',      500, 100,   600, 10000),
  ('Premium',   1000, 250,  1250, 20000),
  ('Enterprise', 2500, 750, 3250, 50000)
ON CONFLICT (name) DO NOTHING;

ALTER TABLE token_bundles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_token_bundles" ON token_bundles;
CREATE POLICY "public_read_token_bundles" ON token_bundles FOR SELECT
  TO anon, authenticated USING (true);


-- ──────────────────────────────────────────────
-- 3. TOKEN WALLETS
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS token_wallets (
  id                    UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID    NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  balance               INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  low_balance_alerted_at TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_token_wallets_user_id ON token_wallets(user_id);

-- Backfill wallets for existing profiles
INSERT INTO token_wallets (user_id, balance)
SELECT id, 0 FROM profiles
ON CONFLICT (user_id) DO NOTHING;

ALTER TABLE token_wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_wallet" ON token_wallets;
CREATE POLICY "select_own_wallet" ON token_wallets FOR SELECT
  TO authenticated USING (auth.uid() = user_id);


-- ──────────────────────────────────────────────
-- 4. TOKEN TRANSACTIONS
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS token_transactions (
  id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type                TEXT    NOT NULL CHECK (type IN ('purchase', 'burn', 'bonus', 'refund')),
  amount              INTEGER NOT NULL,
  reason              TEXT    NOT NULL,
  related_listing_id  UUID    REFERENCES listings(id) ON DELETE SET NULL,
  razorpay_payment_id TEXT,
  balance_after       INTEGER NOT NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_token_txn_user_id    ON token_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_token_txn_created_at ON token_transactions(created_at DESC);

ALTER TABLE token_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_transactions" ON token_transactions;
CREATE POLICY "select_own_transactions" ON token_transactions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);


-- ──────────────────────────────────────────────
-- 5. INVOICES
-- ──────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN 'PH-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' || LPAD(nextval('invoice_number_seq')::TEXT, 4, '0');
END;
$$;

CREATE TABLE IF NOT EXISTS invoices (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number      TEXT          NOT NULL UNIQUE DEFAULT generate_invoice_number(),
  user_id             UUID          NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date                DATE          NOT NULL DEFAULT CURRENT_DATE,
  user_name           TEXT          NOT NULL,
  user_email          TEXT          NOT NULL,
  token_amount        INTEGER       NOT NULL,
  price_per_token     NUMERIC(10,2) NOT NULL DEFAULT 20,
  subtotal            NUMERIC(10,2) NOT NULL,
  gst_rate            NUMERIC(5,2)  NOT NULL DEFAULT 18,
  gst_amount          NUMERIC(10,2) NOT NULL,
  total_amount        NUMERIC(10,2) NOT NULL,
  payment_method      TEXT          NOT NULL DEFAULT 'Razorpay',
  payment_status      TEXT          NOT NULL DEFAULT 'Paid',
  razorpay_payment_id TEXT,
  bundle_name         TEXT,
  created_at          TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_invoices" ON invoices;
CREATE POLICY "select_own_invoices" ON invoices FOR SELECT
  TO authenticated USING (auth.uid() = user_id);


-- ──────────────────────────────────────────────
-- 6. ALTER LISTINGS — token-gated features
-- ──────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='is_hot') THEN
    ALTER TABLE listings ADD COLUMN is_hot BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='featured_expires_at') THEN
    ALTER TABLE listings ADD COLUMN featured_expires_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='hot_expires_at') THEN
    ALTER TABLE listings ADD COLUMN hot_expires_at TIMESTAMPTZ;
  END IF;
END $$;


-- ──────────────────────────────────────────────
-- 7. ALTER PROFILES — verified badge
-- ──────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='verified_badge_active') THEN
    ALTER TABLE profiles ADD COLUMN verified_badge_active BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='verified_badge_expires_at') THEN
    ALTER TABLE profiles ADD COLUMN verified_badge_expires_at TIMESTAMPTZ;
  END IF;
END $$;


-- ──────────────────────────────────────────────
-- 8. TRIGGER — auto-create wallet on profile insert
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_wallet_on_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO token_wallets (user_id, balance)
  VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_create_wallet ON profiles;
CREATE TRIGGER on_profile_created_create_wallet
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION create_wallet_on_profile();


-- ──────────────────────────────────────────────
-- 9. RPC — burn_own_tokens (atomic, from authenticated frontend)
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION burn_own_tokens(
  p_amount     INTEGER,
  p_reason     TEXT,
  p_listing_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id     UUID;
  v_balance     INTEGER;
  v_new_balance INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT balance INTO v_balance
  FROM token_wallets
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;

  IF v_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance',
                              'balance', v_balance, 'required', p_amount);
  END IF;

  v_new_balance := v_balance - p_amount;

  UPDATE token_wallets
  SET balance = v_new_balance, updated_at = NOW()
  WHERE user_id = v_user_id;

  INSERT INTO token_transactions (user_id, type, amount, reason, related_listing_id, balance_after)
  VALUES (v_user_id, 'burn', -p_amount, p_reason, p_listing_id, v_new_balance);

  RETURN jsonb_build_object('success', true, 'balance', v_new_balance);
END;
$$;

GRANT EXECUTE ON FUNCTION burn_own_tokens(INTEGER, TEXT, UUID) TO authenticated;
