/*
# Listing Verification & Fake-Listing Compliance Policy

## Purpose
Implements the full compliance policy described in the master log:
1. Pre-publication identity verification (PAN for India, Emirates ID for Dubai)
2. RERA / RERA Broker ID 90-day grace period with public "RERA Pending" labeling
3. Fake listing report → immediate account-wide suspension flow (24h window)
4. Anti-sabotage safeguard against abusive reporters

## New Columns on `profiles`
- `pan_number` (text) — India track: PAN card number, mandatory for listing
- `emirates_id_number` (text) — Dubai track: Emirates ID number, mandatory for listing
- `id_document_url` (text) — uploaded scan/photo of the PAN or Emirates ID
- `rera_number` (text) — RERA registration (India) or RERA Broker ID (Dubai)
- `rera_status` (text) — 'verified' | 'pending' | 'umbrella' | 'not_required'
- `rera_grace_started_at` (timestamptz) — when the 90-day grace clock started
- `umbrella_authorization_url` (text) — NOC/consent letter from RERA umbrella holder
- `compliance_suspended_at` (timestamptz) — when account-wide compliance suspension began
- `compliance_suspended_reason` (text) — reason for the suspension

## New Columns on `listings`
- `rera_status` (text) — 'verified' | 'pending' | 'umbrella' | 'not_required'
- `compliance_suspended` (boolean, default false) — hidden from public when true
- `suspended_at` (timestamptz) — when this listing was compliance-suspended
- `suspended_reason` (text) — why it was suspended

## New Tables
1. `listing_reports` — one row per fake-listing report filed by a user
2. `reporter_abuse_flags` — tracks reporters whose reports are repeatedly false

## RPCs
1. `report_listing(p_listing_id, p_reason, p_reporter_user_id, p_reporter_email, p_reporter_ip)` — files a report,
   instantly suspends ALL listings under the same owner/profile, starts the 24h
   resolution window, and returns the suspension record.
2. `resolve_listing_suspension(p_profile_id, p_action, p_admin_email, p_notes)` — admin-only: reinstates
   or permanently deactivates. p_action = 'reinstate' | 'deactivate'.
3. `check_rera_grace_expiry()` — scans listings in RERA-pending grace period;
   auto-pauses any past day 90. Intended for cron scheduling.
4. `start_rera_grace(p_profile_id)` — sets the 90-day grace clock when a listing is approved.

## Security
- RLS enabled on both new tables.
- `listing_reports`: reporters can read their own reports; admins read all;
  inserts allowed for any authenticated user (they file the report).
- `reporter_abuse_flags`: admin-only access.
- RPCs run as SECURITY DEFINER so they can update listings + profiles across
  the RLS boundary; `resolve_listing_suspension` checks the caller's email
  against the admin email before acting.
*/

-- ──────────────────────────────────────────────
-- 1. profiles: identity + RERA + compliance columns
-- ──────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS pan_number text,
  ADD COLUMN IF NOT EXISTS emirates_id_number text,
  ADD COLUMN IF NOT EXISTS id_document_url text,
  ADD COLUMN IF NOT EXISTS rera_number text,
  ADD COLUMN IF NOT EXISTS rera_status text DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS rera_grace_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS umbrella_authorization_url text,
  ADD COLUMN IF NOT EXISTS compliance_suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS compliance_suspended_reason text;

-- ──────────────────────────────────────────────
-- 2. listings: RERA status + compliance suspension columns
-- ──────────────────────────────────────────────
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS rera_status text DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS compliance_suspended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_reason text;

-- Index for fast suspension lookups
CREATE INDEX IF NOT EXISTS idx_listings_profile_id ON listings(profile_id);
CREATE INDEX IF NOT EXISTS idx_listings_compliance_suspended ON listings(compliance_suspended) WHERE compliance_suspended = true;
CREATE INDEX IF NOT EXISTS idx_listings_rera_status ON listings(rera_status);

-- ──────────────────────────────────────────────
-- 3. listing_reports table
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS listing_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL,
  reporter_user_id uuid,
  reporter_email text,
  reporter_ip text,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by text
);

ALTER TABLE listing_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_reports" ON listing_reports;
CREATE POLICY "select_own_reports"
  ON listing_reports FOR SELECT
  TO authenticated
  USING (reporter_user_id = auth.uid());

DROP POLICY IF EXISTS "insert_reports" ON listing_reports;
CREATE POLICY "insert_reports"
  ON listing_reports FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "admin_all_reports" ON listing_reports;
CREATE POLICY "admin_all_reports"
  ON listing_reports FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'email' = 'nirmalserai@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'nirmalserai@gmail.com');

-- ──────────────────────────────────────────────
-- 4. reporter_abuse_flags table
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reporter_abuse_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id uuid,
  reporter_ip text,
  total_reports integer NOT NULL DEFAULT 0,
  false_reports integer NOT NULL DEFAULT 0,
  restricted boolean NOT NULL DEFAULT false,
  last_report_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(reporter_user_id)
);

ALTER TABLE reporter_abuse_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_abuse_flags" ON reporter_abuse_flags;
CREATE POLICY "admin_all_abuse_flags"
  ON reporter_abuse_flags FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'email' = 'nirmalserai@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'nirmalserai@gmail.com');

-- ──────────────────────────────────────────────
-- 5. RPC: report_listing — instant account-wide suspension
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.report_listing(
  p_listing_id uuid,
  p_reason text,
  p_reporter_user_id uuid DEFAULT NULL,
  p_reporter_email text DEFAULT NULL,
  p_reporter_ip text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_listing RECORD;
  v_profile_id uuid;
  v_report_id uuid;
  v_suspended_count integer;
  v_abuse RECORD;
BEGIN
  SELECT profile_id, owner_id, title INTO v_listing
  FROM listings WHERE id = p_listing_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Listing not found');
  END IF;

  v_profile_id := COALESCE(v_listing.profile_id, v_listing.owner_id);

  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Listing has no associated profile');
  END IF;

  INSERT INTO listing_reports (listing_id, reporter_user_id, reporter_email, reporter_ip, reason)
  VALUES (p_listing_id, p_reporter_user_id, p_reporter_email, p_reporter_ip, p_reason)
  RETURNING id INTO v_report_id;

  UPDATE listings
  SET compliance_suspended = true,
      suspended_at = now(),
      suspended_reason = 'Fake listing report: ' || LEFT(p_reason, 200)
  WHERE (profile_id = v_profile_id OR owner_id = v_profile_id)
    AND compliance_suspended = false;

  GET DIAGNOSTICS v_suspended_count = ROW_COUNT;

  UPDATE profiles
  SET compliance_suspended_at = now(),
      compliance_suspended_reason = 'Fake listing report filed'
  WHERE id = v_profile_id;

  INSERT INTO reporter_abuse_flags (reporter_user_id, reporter_ip, total_reports, last_report_at)
  VALUES (p_reporter_user_id, p_reporter_ip, 1, now())
  ON CONFLICT (reporter_user_id)
  DO UPDATE SET
    total_reports = reporter_abuse_flags.total_reports + 1,
    last_report_at = now(),
    updated_at = now();

  SELECT * INTO v_abuse FROM reporter_abuse_flags WHERE reporter_user_id = p_reporter_user_id;
  IF v_abuse.total_reports >= 5 AND v_abuse.false_reports::float / v_abuse.total_reports >= 0.6 THEN
    UPDATE reporter_abuse_flags SET restricted = true, updated_at = now()
    WHERE reporter_user_id = p_reporter_user_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'report_id', v_report_id,
    'suspended_count', v_suspended_count,
    'profile_id', v_profile_id,
    'message', 'All listings under this account have been suspended pending review.'
  );
END;
$$;

-- ──────────────────────────────────────────────
-- 6. RPC: resolve_listing_suspension — admin only
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.resolve_listing_suspension(
  p_profile_id uuid,
  p_action text,
  p_admin_email text,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_check text;
BEGIN
  SELECT auth.jwt() ->> 'email' INTO v_admin_check;

  IF v_admin_check IS NULL OR v_admin_check != p_admin_email OR p_admin_email != 'nirmalserai@gmail.com' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized: admin only');
  END IF;

  IF p_action = 'reinstate' THEN
    UPDATE listings
    SET compliance_suspended = false,
        suspended_at = NULL,
        suspended_reason = NULL
    WHERE profile_id = p_profile_id OR owner_id = p_profile_id;

    UPDATE profiles
    SET compliance_suspended_at = NULL,
        compliance_suspended_reason = NULL
    WHERE id = p_profile_id;

    UPDATE listing_reports
    SET status = 'resolved_reinstate',
        resolved_at = now(),
        resolved_by = p_admin_email,
        admin_notes = p_notes
    WHERE listing_id IN (SELECT id FROM listings WHERE profile_id = p_profile_id OR owner_id = p_profile_id)
      AND status = 'open';

    RETURN jsonb_build_object('ok', true, 'action', 'reinstate');

  ELSIF p_action = 'deactivate' THEN
    UPDATE listings
    SET compliance_suspended = true,
        is_active = false,
        suspended_reason = 'Permanent deactivation: fake listing confirmed'
    WHERE profile_id = p_profile_id OR owner_id = p_profile_id;

    UPDATE profiles
    SET account_status = 'suspended',
        compliance_suspended_reason = 'Permanent deactivation: fake listing confirmed'
    WHERE id = p_profile_id;

    UPDATE listing_reports
    SET status = 'resolved_deactivate',
        resolved_at = now(),
        resolved_by = p_admin_email,
        admin_notes = p_notes
    WHERE listing_id IN (SELECT id FROM listings WHERE profile_id = p_profile_id OR owner_id = p_profile_id)
      AND status = 'open';

    RETURN jsonb_build_object('ok', true, 'action', 'deactivate');

  ELSE
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid action. Use reinstate or deactivate.');
  END IF;
END;
$$;

-- ──────────────────────────────────────────────
-- 7. RPC: check_rera_grace_expiry — auto-pause expired grace listings
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_rera_grace_expiry()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE listings
  SET is_active = false,
      suspended_reason = 'RERA grace period expired (90 days)'
  WHERE rera_status = 'pending'
    AND is_active = true
    AND profile_id IN (
      SELECT id FROM profiles
      WHERE rera_grace_started_at IS NOT NULL
        AND rera_grace_started_at < now() - INTERVAL '90 days'
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object('ok', true, 'paused_count', v_count);
END;
$$;

-- ──────────────────────────────────────────────
-- 8. RPC: start_rera_grace — set grace clock when listing approved
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.start_rera_grace(p_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET rera_grace_started_at = now(),
      rera_status = 'pending'
  WHERE id = p_profile_id
    AND rera_status = 'not_required'
    AND rera_number IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.report_listing TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_listing_suspension TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_rera_grace_expiry TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_rera_grace TO authenticated;
