/*
# Fix console errors: create magazines table + add slug column to cities

## 1. Create magazines table
- Referenced by HomePage and MagazinePage but does not exist in DB
- Columns match the Magazine TypeScript interface: id, issue_number, title, description,
  cover_image_url, flipbook_url, published_date, is_published, created_at
- RLS: public read (anon + authenticated), authenticated insert/update/delete (admin)

## 2. Add slug column to cities table
- Layout.tsx queries `cities.select('name, slug')` and DirectoryPage filters by slug
- The column is missing, causing a 400 error on every page load
- Non-destructive: ADD COLUMN IF NOT EXISTS

## Security
- magazines: anon+authenticated SELECT, authenticated INSERT/UPDATE/DELETE
- cities: no policy changes (existing RLS remains)
*/

-- ── 1. Create magazines table ──
CREATE TABLE IF NOT EXISTS magazines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_number INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  flipbook_url TEXT,
  published_date DATE,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE magazines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "magazines_select_all" ON magazines;
CREATE POLICY "magazines_select_all" ON magazines
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "magazines_insert_auth" ON magazines;
CREATE POLICY "magazines_insert_auth" ON magazines
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "magazines_update_auth" ON magazines;
CREATE POLICY "magazines_update_auth" ON magazines
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "magazines_delete_auth" ON magazines;
CREATE POLICY "magazines_delete_auth" ON magazines
  FOR DELETE TO authenticated USING (true);

-- ── 2. Add slug column to cities ──
ALTER TABLE cities ADD COLUMN IF NOT EXISTS slug TEXT;
