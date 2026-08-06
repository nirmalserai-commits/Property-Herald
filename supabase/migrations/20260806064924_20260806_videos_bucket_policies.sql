/*
# Storage policies for videos bucket

1. Security
- Public (anon) can SELECT (read) objects in the `videos` bucket — videos must play on the public site.
- Only authenticated (admin) can INSERT (upload) and DELETE objects.
- UPDATE not needed (we delete + re-upload to replace).
*/

DROP POLICY IF EXISTS "public_read_videos_bucket" ON storage.objects;
CREATE POLICY "public_read_videos_bucket"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'videos');

DROP POLICY IF EXISTS "auth_insert_videos_bucket" ON storage.objects;
CREATE POLICY "auth_insert_videos_bucket"
ON storage.objects FOR INSERT
TO authenticated WITH CHECK (bucket_id = 'videos');

DROP POLICY IF EXISTS "auth_delete_videos_bucket" ON storage.objects;
CREATE POLICY "auth_delete_videos_bucket"
ON storage.objects FOR DELETE
TO authenticated USING (bucket_id = 'videos');
