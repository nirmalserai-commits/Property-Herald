/*
# Boardroom attachments — storage bucket + attachments column

## Purpose
Allow Nirmal to attach files (PDFs, docs, text) and images to his boardroom
chat messages so Neena/Nora/Nita can read documents and see pictures he shares.
Files are stored in a private Supabase Storage bucket; the message row stores
a JSON array of attachment metadata so the UI can render them and the edge
function can fetch their content.

## Changes

### 1. New Storage Bucket: boardroom-attachments
- Private bucket (NOT public) — only authenticated admins should access.
- 10 MB file size limit enforced at the storage policy level where possible.

### 2. boardroom_chats: new column
- `attachments` (jsonb, nullable) — array of objects:
  { "url": signed-url, "path": storage-path, "name": filename,
    "type": mime, "kind": "image"|"file", "size": bytes }
  Null when a message has no attachments (backward compatible with all
  existing rows).

### 3. Storage policies
- SELECT/INSERT/UPDATE/DELETE scoped to authenticated users on
  boardroom-attachments bucket.

## Security
- RLS already enabled on boardroom_chats (unchanged).
- Storage bucket is private; access requires authenticated session.
- All existing rows keep working — the new column is nullable with no default.
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('boardroom-attachments', 'boardroom-attachments', false, 10485760)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: authenticated admins can manage objects in this bucket
DROP POLICY IF EXISTS "br_att_select" ON storage.objects;
CREATE POLICY "br_att_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'boardroom-attachments');

DROP POLICY IF EXISTS "br_att_insert" ON storage.objects;
CREATE POLICY "br_att_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'boardroom-attachments');

DROP POLICY IF EXISTS "br_att_update" ON storage.objects;
CREATE POLICY "br_att_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'boardroom-attachments')
  WITH CHECK (bucket_id = 'boardroom-attachments');

DROP POLICY IF EXISTS "br_att_delete" ON storage.objects;
CREATE POLICY "br_att_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'boardroom-attachments');

-- Add attachments column to boardroom_chats (nullable, backward compatible)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'boardroom_chats' AND column_name = 'attachments'
  ) THEN
    ALTER TABLE boardroom_chats ADD COLUMN attachments jsonb;
  END IF;
END $$;
