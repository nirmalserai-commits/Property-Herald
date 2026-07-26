/*
# Extend team_members table for full Team Pictures admin page

1. Table changes — team_members
- Add columns to match the Hall of Fame admin page structure:
  - job_title (text) — member's role/title (kept nullable since existing rows have `role`)
  - pod_name (text) — pod or group name
  - display_order (integer, default 1) — ordering for display
  - active (boolean, default true) — whether the member is shown publicly
  - photo_url (text) — URL to profile photo in the team-photos bucket
- Backfill new columns from existing data where possible:
  - job_title gets copied from `role` for existing rows
  - display_order gets copied from `position` for existing rows
  - photo_url gets copied from `image_url` for existing rows
  - active defaults to true for all existing rows
- All additions use IF NOT EXISTS guards via DO $$ blocks so the migration is idempotent.

2. Storage
- Create a public storage bucket named "team-photos" if it does not exist.
  This bucket holds team member profile photos uploaded from the admin page.

3. Security — team_members table
- Add a DELETE policy scoped to the admin email so the admin can remove members.
  (INSERT and UPDATE policies already exist from a prior migration.)
- The existing SELECT policy allows public read (USING true) which is fine —
  the homepage shows the team publicly.

4. Security — team-photos storage bucket
- Public read: anyone can view uploaded photos (anon + authenticated).
- Admin insert: only the admin email can upload to team-photos.
- Admin update: only the admin email can replace files in team-photos.
- Admin delete: only the admin email can delete files from team-photos.

5. Notes
- No data is deleted or modified destructively.
- Existing rows are preserved and backfilled.
- All statements are idempotent.
*/

-- 1. Add columns to team_members (idempotent)
DO $$ BEGIN
  ALTER TABLE team_members ADD COLUMN job_title text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE team_members ADD COLUMN pod_name text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE team_members ADD COLUMN display_order integer NOT NULL DEFAULT 1;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE team_members ADD COLUMN active boolean NOT NULL DEFAULT true;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE team_members ADD COLUMN photo_url text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- 2. Backfill new columns from existing data
UPDATE team_members SET job_title = role WHERE job_title IS NULL AND role IS NOT NULL;
UPDATE team_members SET display_order = position WHERE display_order = 1 AND position IS NOT NULL AND position > 1;
UPDATE team_members SET photo_url = image_url WHERE photo_url IS NULL AND image_url IS NOT NULL;

-- 3. Create team-photos storage bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('team-photos', 'team-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 4. team_members: admin DELETE policy
DROP POLICY IF EXISTS "admin_delete_team_members" ON team_members;
CREATE POLICY "admin_delete_team_members"
ON team_members FOR DELETE
TO authenticated
USING ((auth.jwt() ->> 'email') = 'nirmalserai@gmail.com');

-- 5. Storage policies for team-photos bucket

-- Public read
DROP POLICY IF EXISTS "public_read_team_photos" ON storage.objects;
CREATE POLICY "public_read_team_photos"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'team-photos');

-- Admin insert
DROP POLICY IF EXISTS "admin_insert_team_photos" ON storage.objects;
CREATE POLICY "admin_insert_team_photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'team-photos' AND (auth.jwt() ->> 'email') = 'nirmalserai@gmail.com');

-- Admin update
DROP POLICY IF EXISTS "admin_update_team_photos" ON storage.objects;
CREATE POLICY "admin_update_team_photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'team-photos' AND (auth.jwt() ->> 'email') = 'nirmalserai@gmail.com')
WITH CHECK (bucket_id = 'team-photos' AND (auth.jwt() ->> 'email') = 'nirmalserai@gmail.com');

-- Admin delete
DROP POLICY IF EXISTS "admin_delete_team_photos" ON storage.objects;
CREATE POLICY "admin_delete_team_photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'team-photos' AND (auth.jwt() ->> 'email') = 'nirmalserai@gmail.com');
