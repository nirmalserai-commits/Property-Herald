/*
# Fix 3 — Create public ambassadors table for human ambassadors

1. New Tables
- `public_ambassadors` — human Property Herald ambassadors (Developers, Agents, Community members)
  - id (uuid, pk)
  - name (text, not null)
  - city_region (text, not null)
  - ambassador_type (text: 'developer' | 'agent' | 'community', not null)
  - profile_picture_url (text, nullable)
  - is_active (boolean, default true)
  - display_order (integer, default 0)
  - created_at (timestamptz, default now())
  - updated_at (timestamptz, default now())
2. Security
- RLS enabled
- Public SELECT for anon + authenticated (public page)
- Admin-only INSERT/UPDATE/DELETE (nirmalserai@gmail.com via JWT email check)
3. Storage
- Uses existing 'assets' bucket pattern; admin uploads to Supabase storage and stores URL
4. Notes
- Separate from the AI 'ambassadors' table which manages chat personas
- Idempotent: safe to re-run
*/

CREATE TABLE IF NOT EXISTS public_ambassadors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city_region text NOT NULL,
  ambassador_type text NOT NULL CHECK (ambassador_type IN ('developer', 'agent', 'community')),
  profile_picture_url text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public_ambassadors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_public_ambassadors" ON public_ambassadors;
CREATE POLICY "public_read_public_ambassadors"
ON public_ambassadors FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "admin_insert_public_ambassadors" ON public_ambassadors;
CREATE POLICY "admin_insert_public_ambassadors"
ON public_ambassadors FOR INSERT
TO authenticated
WITH CHECK ((auth.jwt() ->> 'email') = 'nirmalserai@gmail.com');

DROP POLICY IF EXISTS "admin_update_public_ambassadors" ON public_ambassadors;
CREATE POLICY "admin_update_public_ambassadors"
ON public_ambassadors FOR UPDATE
TO authenticated
USING ((auth.jwt() ->> 'email') = 'nirmalserai@gmail.com')
WITH CHECK ((auth.jwt() ->> 'email') = 'nirmalserai@gmail.com');

DROP POLICY IF EXISTS "admin_delete_public_ambassadors" ON public_ambassadors;
CREATE POLICY "admin_delete_public_ambassadors"
ON public_ambassadors FOR DELETE
TO authenticated
USING ((auth.jwt() ->> 'email') = 'nirmalserai@gmail.com');
