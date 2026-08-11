/*
# Enforce Listing Compliance at Publication

## Purpose
Moves the launch-blocking compliance controls from UI-only fields into the database.

## Profile changes
- Adds `identity_verified`, controlled by the compliance/admin workflow.
- India publication requires a verified PAN number and identity document.
- Dubai publication requires a verified Emirates ID number and identity document.

## Listing publication gate
- A listing cannot transition into active + approved status unless its profile has
  the required verified identity for its market track.
- A RERA-pending profile remains publishable during its 90-day grace period and
  the listing receives the public `pending` RERA status.
- Existing active listings are not rechecked on unrelated edits; the gate applies
  when a listing is first created as active/approved or transitions into that state.

## Report RPC hardening
- The report actor is taken from `auth.uid()` and the signed-in JWT, not from
  caller-supplied identity fields.
- Restricted reporters are rejected server-side.
- SECURITY DEFINER functions use a fixed public search path and do not allow anon
  execution.
*/

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS identity_verified boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.enforce_listing_compliance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile profiles%ROWTYPE;
  v_market_track text;
BEGIN
  IF NEW.is_active = true
     AND NEW.moderation_status = 'approved'
     AND (TG_OP = 'INSERT' OR OLD.is_active IS DISTINCT FROM true OR OLD.moderation_status IS DISTINCT FROM 'approved') THEN
    SELECT * INTO v_profile
    FROM public.profiles
    WHERE id = COALESCE(NEW.profile_id, NEW.owner_id);

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Listing compliance review required';
    END IF;

    v_market_track := COALESCE(NEW.market_track, v_profile.market_track);

    IF NOT v_profile.identity_verified THEN
      RAISE EXCEPTION 'Identity verification is required before publication';
    END IF;

    IF v_market_track = 'dubai' THEN
      IF NULLIF(trim(v_profile.emirates_id_number), '') IS NULL OR NULLIF(trim(v_profile.id_document_url), '') IS NULL THEN
        RAISE EXCEPTION 'A verified Emirates ID document is required before publication';
      END IF;
    ELSE
      IF NULLIF(trim(v_profile.pan_number), '') IS NULL OR NULLIF(trim(v_profile.id_document_url), '') IS NULL THEN
        RAISE EXCEPTION 'A verified PAN document is required before publication';
      END IF;
    END IF;

    IF v_profile.rera_status IN ('pending', 'umbrella') THEN
      NEW.rera_status := v_profile.rera_status;
    ELSIF v_profile.rera_status = 'verified' THEN
      NEW.rera_status := 'verified';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS listings_compliance_publication_gate ON public.listings;
CREATE TRIGGER listings_compliance_publication_gate
  BEFORE INSERT OR UPDATE OF is_active, moderation_status, profile_id, owner_id, market_track
  ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_listing_compliance();

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
SET search_path = public
AS $$
DECLARE
  v_listing RECORD;
  v_profile_id uuid;
  v_report_id uuid;
  v_suspended_count integer;
  v_abuse RECORD;
  v_actor uuid := auth.uid();
  v_actor_email text := auth.jwt() ->> 'email';
BEGIN
  IF v_actor IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sign-in required');
  END IF;

  SELECT * INTO v_abuse
  FROM public.reporter_abuse_flags
  WHERE reporter_user_id = v_actor;

  IF COALESCE(v_abuse.restricted, false) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Reporting access is restricted pending review');
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) < 10 OR length(p_reason) > 2000 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'A detailed report is required');
  END IF;

  SELECT profile_id, owner_id, title INTO v_listing
  FROM public.listings WHERE id = p_listing_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Listing not found');
  END IF;

  v_profile_id := COALESCE(v_listing.profile_id, v_listing.owner_id);
  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Listing cannot be reported');
  END IF;

  INSERT INTO public.listing_reports (listing_id, reporter_user_id, reporter_email, reporter_ip, reason)
  VALUES (p_listing_id, v_actor, v_actor_email, NULL, trim(p_reason))
  RETURNING id INTO v_report_id;

  UPDATE public.listings
  SET compliance_suspended = true,
      suspended_at = now(),
      suspended_reason = 'Fake listing report: ' || LEFT(trim(p_reason), 200)
  WHERE (profile_id = v_profile_id OR owner_id = v_profile_id)
    AND compliance_suspended = false;

  GET DIAGNOSTICS v_suspended_count = ROW_COUNT;

  UPDATE public.profiles
  SET compliance_suspended_at = now(),
      compliance_suspended_reason = 'Fake listing report filed'
  WHERE id = v_profile_id;

  INSERT INTO public.reporter_abuse_flags (reporter_user_id, reporter_ip, total_reports, last_report_at)
  VALUES (v_actor, NULL, 1, now())
  ON CONFLICT (reporter_user_id)
  DO UPDATE SET
    total_reports = public.reporter_abuse_flags.total_reports + 1,
    last_report_at = now(),
    updated_at = now();

  SELECT * INTO v_abuse FROM public.reporter_abuse_flags WHERE reporter_user_id = v_actor;
  IF v_abuse.total_reports >= 5 AND v_abuse.false_reports::float / v_abuse.total_reports >= 0.6 THEN
    UPDATE public.reporter_abuse_flags SET restricted = true, updated_at = now()
    WHERE reporter_user_id = v_actor;
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

REVOKE EXECUTE ON FUNCTION public.enforce_listing_compliance() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.report_listing(uuid, text, uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.report_listing(uuid, text, uuid, text, text) TO authenticated;
