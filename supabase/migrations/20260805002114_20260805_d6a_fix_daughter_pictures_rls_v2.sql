-- Add full_body_picture_url column for expanded card display
ALTER TABLE daughter_pictures
  ADD COLUMN IF NOT EXISTS full_body_picture_url TEXT;

-- Now enable RLS and apply policies
ALTER TABLE daughter_pictures ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "daughter_pictures_select_all" ON daughter_pictures;
DROP POLICY IF EXISTS "daughter_pictures_insert_authenticated" ON daughter_pictures;
DROP POLICY IF EXISTS "daughter_pictures_update_authenticated" ON daughter_pictures;
DROP POLICY IF EXISTS "daughter_pictures_delete_authenticated" ON daughter_pictures;

-- Public can SELECT only active rows (pod_title is in the table but we 
-- filter it out at the query level in the frontend by not selecting it)
CREATE POLICY "daughter_pictures_select_all" ON daughter_pictures
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- Authenticated can do CRUD
CREATE POLICY "daughter_pictures_insert_authenticated" ON daughter_pictures
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "daughter_pictures_update_authenticated" ON daughter_pictures
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "daughter_pictures_delete_authenticated" ON daughter_pictures
  FOR DELETE TO authenticated USING (true);
