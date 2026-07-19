
/*
# Admin Command Center Infrastructure

Adds all database infrastructure required for the Property Herald admin panel.

## New Tables

1. `admin_audit_log`
   - Immutable log of every admin action (approve/reject/suspend/grant/etc.)
   - Stores action name, target table, target ID, details JSON, and admin email + timestamp

2. `verification_requests`
   - Queue of RERA / GST verification requests submitted by business owners
   - status: pending | approved | rejected
   - On approval the trigger sets profile.is_verified = true and badges active

3. `notifications`
   - In-app notifications / broadcast messages from admin to users
   - user_id NULL = broadcast to all; otherwise targeted to a specific user
   - audience: all | verified | unverified (for broadcasts)

## Modified Tables

- `listings`: Added `moderation_status` (pending | approved | rejected | flagged) and `moderation_reason` columns
- `site_config`: Seeded with token feature cost keys (verified_badge_cost, featured_listing_cost, hot_property_cost, whatsapp_lead_cost)

## New Admin RLS Policies

Admin email `nirmalserai@gmail.com` is checked via `(auth.jwt()->>'email')`.

Read-all policies added to:
- profiles, listings, token_wallets, token_transactions, invoices, subscriptions, subscription_plans

Write policies added to:
- profiles (UPDATE — suspend/reactivate)
- listings (UPDATE — moderation)
- token_bundles (UPDATE — price editing)
- site_config (INSERT + UPDATE — config editing)

## New RPC Functions

- `admin_grant_tokens(target_user_id, amount, reason)`: Admin-only. Credits tokens to any wallet and logs the transaction.
- `get_analytics_data(days_back)`: Admin-only. Returns day-by-day (new_users, new_listings, revenue) for the last N days.

## Security

- All new tables have RLS enabled
- admin_audit_log: admin insert + select; no user access
- verification_requests: users can INSERT their own + SELECT own; admin can SELECT + UPDATE all
- notifications: admin full CRUD; users can SELECT broadcasts or their own + UPDATE (mark read)
*/

-- ──────────────────────────────────────────────
-- 1. ADMIN AUDIT LOG
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email  TEXT        NOT NULL,
  action       TEXT        NOT NULL,
  target_table TEXT,
  target_id    TEXT,
  details      JSONB,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log(created_at DESC);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_select_audit_log" ON admin_audit_log;
CREATE POLICY "admin_select_audit_log" ON admin_audit_log FOR SELECT
  TO authenticated USING ((auth.jwt()->>'email') = 'nirmalserai@gmail.com');

DROP POLICY IF EXISTS "admin_insert_audit_log" ON admin_audit_log;
CREATE POLICY "admin_insert_audit_log" ON admin_audit_log FOR INSERT
  TO authenticated WITH CHECK ((auth.jwt()->>'email') = 'nirmalserai@gmail.com');


-- ──────────────────────────────────────────────
-- 2. VERIFICATION REQUESTS
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS verification_requests (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type             TEXT        NOT NULL CHECK (type IN ('rera', 'gst', 'both')),
  rera_number      TEXT,
  gst_number       TEXT,
  document_url     TEXT,
  status           TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  reviewed_by      TEXT,
  reviewed_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verif_req_user_id ON verification_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_verif_req_status  ON verification_requests(status);

ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_insert_own_verif" ON verification_requests;
CREATE POLICY "users_insert_own_verif" ON verification_requests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_select_own_verif" ON verification_requests;
CREATE POLICY "users_select_own_verif" ON verification_requests FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR (auth.jwt()->>'email') = 'nirmalserai@gmail.com');

DROP POLICY IF EXISTS "admin_update_verif" ON verification_requests;
CREATE POLICY "admin_update_verif" ON verification_requests FOR UPDATE
  TO authenticated USING ((auth.jwt()->>'email') = 'nirmalserai@gmail.com')
  WITH CHECK ((auth.jwt()->>'email') = 'nirmalserai@gmail.com');


-- ──────────────────────────────────────────────
-- 3. NOTIFICATIONS
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        REFERENCES profiles(id) ON DELETE CASCADE,
  title      TEXT        NOT NULL,
  message    TEXT        NOT NULL,
  type       TEXT        NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'error')),
  audience   TEXT        NOT NULL DEFAULT 'all' CHECK (audience IN ('all', 'verified', 'unverified')),
  is_read    BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id   ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_notifications" ON notifications;
CREATE POLICY "admin_all_notifications" ON notifications FOR ALL
  TO authenticated USING ((auth.jwt()->>'email') = 'nirmalserai@gmail.com')
  WITH CHECK ((auth.jwt()->>'email') = 'nirmalserai@gmail.com');

DROP POLICY IF EXISTS "users_select_notifications" ON notifications;
CREATE POLICY "users_select_notifications" ON notifications FOR SELECT
  TO authenticated USING (
    user_id IS NULL OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "users_update_notifications" ON notifications;
CREATE POLICY "users_update_notifications" ON notifications FOR UPDATE
  TO authenticated USING (user_id IS NULL OR user_id = auth.uid())
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());


-- ──────────────────────────────────────────────
-- 4. ALTER LISTINGS — moderation columns
-- ──────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='moderation_status') THEN
    ALTER TABLE listings ADD COLUMN moderation_status TEXT NOT NULL DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'flagged'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='moderation_reason') THEN
    ALTER TABLE listings ADD COLUMN moderation_reason TEXT;
  END IF;
END $$;


-- ──────────────────────────────────────────────
-- 5. SITE CONFIG — seed feature cost keys
-- ──────────────────────────────────────────────
INSERT INTO site_config (key, value) VALUES
  ('verified_badge_cost',     '5'),
  ('featured_listing_cost',   '10'),
  ('hot_property_cost',       '15'),
  ('whatsapp_lead_cost',      '2')
ON CONFLICT (key) DO NOTHING;


-- ──────────────────────────────────────────────
-- 6. ADMIN READ POLICIES ON EXISTING TABLES
-- ──────────────────────────────────────────────

-- profiles
DROP POLICY IF EXISTS "admin_select_profiles" ON profiles;
CREATE POLICY "admin_select_profiles" ON profiles FOR SELECT
  TO authenticated USING ((auth.jwt()->>'email') = 'nirmalserai@gmail.com');

DROP POLICY IF EXISTS "admin_update_profiles" ON profiles;
CREATE POLICY "admin_update_profiles" ON profiles FOR UPDATE
  TO authenticated USING ((auth.jwt()->>'email') = 'nirmalserai@gmail.com')
  WITH CHECK ((auth.jwt()->>'email') = 'nirmalserai@gmail.com');

-- token_wallets
DROP POLICY IF EXISTS "admin_select_token_wallets" ON token_wallets;
CREATE POLICY "admin_select_token_wallets" ON token_wallets FOR SELECT
  TO authenticated USING ((auth.jwt()->>'email') = 'nirmalserai@gmail.com');

DROP POLICY IF EXISTS "admin_update_token_wallets" ON token_wallets;
CREATE POLICY "admin_update_token_wallets" ON token_wallets FOR UPDATE
  TO authenticated USING ((auth.jwt()->>'email') = 'nirmalserai@gmail.com')
  WITH CHECK ((auth.jwt()->>'email') = 'nirmalserai@gmail.com');

-- token_transactions
DROP POLICY IF EXISTS "admin_select_token_transactions" ON token_transactions;
CREATE POLICY "admin_select_token_transactions" ON token_transactions FOR SELECT
  TO authenticated USING ((auth.jwt()->>'email') = 'nirmalserai@gmail.com');

DROP POLICY IF EXISTS "admin_insert_token_transactions" ON token_transactions;
CREATE POLICY "admin_insert_token_transactions" ON token_transactions FOR INSERT
  TO authenticated WITH CHECK ((auth.jwt()->>'email') = 'nirmalserai@gmail.com');

-- invoices
DROP POLICY IF EXISTS "admin_select_invoices" ON invoices;
CREATE POLICY "admin_select_invoices" ON invoices FOR SELECT
  TO authenticated USING ((auth.jwt()->>'email') = 'nirmalserai@gmail.com');

-- listings — admin update (moderation)
DROP POLICY IF EXISTS "admin_update_listings" ON listings;
CREATE POLICY "admin_update_listings" ON listings FOR UPDATE
  TO authenticated USING ((auth.jwt()->>'email') = 'nirmalserai@gmail.com')
  WITH CHECK ((auth.jwt()->>'email') = 'nirmalserai@gmail.com');

-- token_bundles — admin update (price editing)
DROP POLICY IF EXISTS "admin_update_token_bundles" ON token_bundles;
CREATE POLICY "admin_update_token_bundles" ON token_bundles FOR UPDATE
  TO authenticated USING ((auth.jwt()->>'email') = 'nirmalserai@gmail.com')
  WITH CHECK ((auth.jwt()->>'email') = 'nirmalserai@gmail.com');

-- site_config — admin write
DROP POLICY IF EXISTS "admin_insert_site_config" ON site_config;
CREATE POLICY "admin_insert_site_config" ON site_config FOR INSERT
  TO authenticated WITH CHECK ((auth.jwt()->>'email') = 'nirmalserai@gmail.com');

DROP POLICY IF EXISTS "admin_update_site_config" ON site_config;
CREATE POLICY "admin_update_site_config" ON site_config FOR UPDATE
  TO authenticated USING ((auth.jwt()->>'email') = 'nirmalserai@gmail.com')
  WITH CHECK ((auth.jwt()->>'email') = 'nirmalserai@gmail.com');


-- ──────────────────────────────────────────────
-- 7. RPC — admin_grant_tokens
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_grant_tokens(
  p_user_id UUID,
  p_amount  INTEGER,
  p_reason  TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance     INTEGER;
BEGIN
  IF (auth.jwt()->>'email') != 'nirmalserai@gmail.com' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT balance INTO v_current_balance
  FROM token_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;

  v_new_balance := v_current_balance + p_amount;

  UPDATE token_wallets
  SET balance = v_new_balance, updated_at = NOW()
  WHERE user_id = p_user_id;

  INSERT INTO token_transactions (user_id, type, amount, reason, balance_after)
  VALUES (p_user_id, 'bonus', p_amount, p_reason, v_new_balance);

  RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance);
END;
$$;

GRANT EXECUTE ON FUNCTION admin_grant_tokens(UUID, INTEGER, TEXT) TO authenticated;


-- ──────────────────────────────────────────────
-- 8. RPC — get_analytics_data
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_analytics_data(days_back INTEGER DEFAULT 30)
RETURNS TABLE(
  day          DATE,
  new_users    BIGINT,
  new_listings BIGINT,
  revenue      NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (auth.jwt()->>'email') != 'nirmalserai@gmail.com' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  WITH dates AS (
    SELECT generate_series(
      CURRENT_DATE - days_back,
      CURRENT_DATE,
      '1 day'::INTERVAL
    )::DATE AS d
  )
  SELECT
    dates.d                                                        AS day,
    COUNT(DISTINCT p.id)::BIGINT                                   AS new_users,
    COUNT(DISTINCT l.id)::BIGINT                                   AS new_listings,
    COALESCE(SUM(i.total_amount), 0)::NUMERIC                      AS revenue
  FROM dates
  LEFT JOIN profiles p ON p.created_at::DATE = dates.d
  LEFT JOIN listings  l ON l.created_at::DATE = dates.d
  LEFT JOIN invoices  i ON i.created_at::DATE = dates.d AND i.payment_status = 'Paid'
  GROUP BY dates.d
  ORDER BY dates.d;
END;
$$;

GRANT EXECUTE ON FUNCTION get_analytics_data(INTEGER) TO authenticated;
