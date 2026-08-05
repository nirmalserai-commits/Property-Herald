/*
# Create public_ambassadors table and fix banners table schema

## 1. New Table: public_ambassadors
- Stores public-facing ambassador profiles shown on the Ambassadors page
- Columns: id, name, city_region, ambassador_type (developer/agent/community),
  profile_picture_url, is_active, display_order, created_at, updated_at
- RLS enabled: public can read active ambassadors, authenticated can CRUD

## 2. Fix banners table
- The existing banners table has an old schema (banner_type, file_url, token_cost, status)
  that does NOT match what the frontend expects (name, position, image_url, headline,
  subheadline, cta_text, cta_url, target_audience, corridor_city, active_from, active_to,
  impressions, clicks, active)
- Add all missing columns to the existing table (non-destructive — no drops)
- Recreate RLS policies to match the admin CRUD pattern

## Security
- public_ambassadors: anon+authenticated SELECT (public page), authenticated INSERT/UPDATE/DELETE (admin)
- banners: anon+authenticated SELECT (public display), authenticated INSERT/UPDATE/DELETE (admin)
*/

-- ── 1. Create public_ambassadors table ──
CREATE TABLE IF NOT EXISTS public_ambassadors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city_region TEXT NOT NULL DEFAULT '',
  ambassador_type TEXT NOT NULL DEFAULT 'developer' CHECK (ambassador_type IN ('developer', 'agent', 'community')),
  profile_picture_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public_ambassadors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pub_amb_select_all" ON public_ambassadors;
CREATE POLICY "pub_amb_select_all" ON public_ambassadors
  FOR SELECT TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "pub_amb_insert_auth" ON public_ambassadors;
CREATE POLICY "pub_amb_insert_auth" ON public_ambassadors
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "pub_amb_update_auth" ON public_ambassadors;
CREATE POLICY "pub_amb_update_auth" ON public_ambassadors
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "pub_amb_delete_auth" ON public_ambassadors;
CREATE POLICY "pub_amb_delete_auth" ON public_ambassadors
  FOR DELETE TO authenticated USING (true);

-- ── 2. Fix banners table: add missing columns ──
ALTER TABLE banners
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS position TEXT DEFAULT 'homepage_hero',
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS headline TEXT,
  ADD COLUMN IF NOT EXISTS subheadline TEXT,
  ADD COLUMN IF NOT EXISTS cta_text TEXT,
  ADD COLUMN IF NOT EXISTS cta_url TEXT,
  ADD COLUMN IF NOT EXISTS target_audience TEXT DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS corridor_city TEXT,
  ADD COLUMN IF NOT EXISTS active_from TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS active_to TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS impressions INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clicks INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Recreate RLS policies for banners
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "banners_select_all" ON banners;
CREATE POLICY "banners_select_all" ON banners
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "banners_insert_auth" ON banners;
CREATE POLICY "banners_insert_auth" ON banners
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "banners_update_auth" ON banners;
CREATE POLICY "banners_update_auth" ON banners
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "banners_delete_auth" ON banners;
CREATE POLICY "banners_delete_auth" ON banners
  FOR DELETE TO authenticated USING (true);
