-- Add columns to listings that the frontend expects
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS profile_id UUID,
  ADD COLUMN IF NOT EXISTS city_id INTEGER REFERENCES cities(id),
  ADD COLUMN IF NOT EXISTS property_types TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS deal_types TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS price BIGINT,
  ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS moderation_reason TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_hot BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS hot_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS views_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS approval_level TEXT,
  ADD COLUMN IF NOT EXISTS is_dubai BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ownership_type TEXT,
  ADD COLUMN IF NOT EXISTS trade_licence_number TEXT,
  ADD COLUMN IF NOT EXISTS emirates_id TEXT,
  ADD COLUMN IF NOT EXISTS size_sqft INTEGER,
  ADD COLUMN IF NOT EXISTS specialties TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS projects_completed INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS years_experience INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Set title from project_name where title is null
UPDATE listings SET title = project_name WHERE title IS NULL AND project_name IS NOT NULL;
UPDATE listings SET title = 'Untitled Listing' WHERE title IS NULL;

-- Enable RLS on listings (should already be enabled, but ensure)
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

-- Drop old policies if any, recreate properly
DROP POLICY IF EXISTS "listings_select_all" ON listings;
DROP POLICY IF EXISTS "listings_insert_authenticated" ON listings;
DROP POLICY IF EXISTS "listings_update_authenticated" ON listings;
DROP POLICY IF EXISTS "listings_delete_authenticated" ON listings;

-- Public can read active/approved listings
CREATE POLICY "listings_select_all" ON listings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "listings_insert_authenticated" ON listings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "listings_update_authenticated" ON listings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "listings_delete_authenticated" ON listings FOR DELETE TO authenticated USING (true);
