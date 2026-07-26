/*
# Create Assets storage bucket and add admin write policies for team_members

1. Storage
- Create a public storage bucket named "Assets" if it does not exist.
  This bucket holds team member profile photos uploaded from the admin panel
  and the homepage "Add Team Member" form.
- The bucket is public so that uploaded photo URLs are readable by all site visitors.

2. Security — team_members table
- The team_members table currently has only a SELECT policy (public read).
- Add INSERT and UPDATE policies scoped to the admin email (nirmalserai@gmail.com)
  so the admin can add new team members and update their photo URLs from the
  homepage "Add Team Member" form and the admin panel.

3. Security — storage bucket "Assets"
- Add storage policies so that:
  - Anyone (anon + authenticated) can READ objects from the Assets bucket
    (profile photos must be publicly visible on the homepage).
  - Only the admin email can INSERT and UPDATE objects in the Assets bucket
    (only admin should be able to upload photos).

4. Notes
- No data is modified or deleted.
- All policies are idempotent (DROP POLICY IF EXISTS before CREATE).
*/

-- 1. Create the Assets storage bucket (public) if it does not exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('Assets', 'Assets', true)
ON CONFLICT (id) DO NOTHING;

-- 2. team_members: admin INSERT policy
DROP POLICY IF EXISTS "admin_insert_team_members" ON team_members;
CREATE POLICY "admin_insert_team_members"
ON team_members FOR INSERT
TO authenticated
WITH CHECK ((auth.jwt() ->> 'email') = 'nirmalserai@gmail.com');

-- 3. team_members: admin UPDATE policy
DROP POLICY IF EXISTS "admin_update_team_members" ON team_members;
CREATE POLICY "admin_update_team_members"
ON team_members FOR UPDATE
TO authenticated
USING ((auth.jwt() ->> 'email') = 'nirmalserai@gmail.com')
WITH CHECK ((auth.jwt() ->> 'email') = 'nirmalserai@gmail.com');

-- 4. Storage policies for Assets bucket

-- Public read: anyone can view uploaded photos
DROP POLICY IF EXISTS "public_read_assets_bucket" ON storage.objects;
CREATE POLICY "public_read_assets_bucket"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'Assets');

-- Admin insert: only admin can upload to Assets
DROP POLICY IF EXISTS "admin_insert_assets_bucket" ON storage.objects;
CREATE POLICY "admin_insert_assets_bucket"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'Assets' AND (auth.jwt() ->> 'email') = 'nirmalserai@gmail.com');

-- Admin update: only admin can replace files in Assets
DROP POLICY IF EXISTS "admin_update_assets_bucket" ON storage.objects;
CREATE POLICY "admin_update_assets_bucket"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'Assets' AND (auth.jwt() ->> 'email') = 'nirmalserai@gmail.com')
WITH CHECK (bucket_id = 'Assets' AND (auth.jwt() ->> 'email') = 'nirmalserai@gmail.com');
