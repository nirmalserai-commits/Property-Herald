/*
# Enable RLS on public.cities with correct policies

## Problem
RLS was disabled on public.cities, allowing anyone with the public anon key
(visible in frontend code) to read, write, modify, and delete every row.

## Fix
1. Enable Row Level Security on cities
2. Public SELECT (anon + authenticated) — city names populate dropdowns
   and filters for all visitors (register flow, directory filters, etc.)
3. Authenticated-only INSERT/UPDATE/DELETE — only logged-in admins can modify
   (admin routes are gated by email check in the app; database enforces
   that at minimum you must be authenticated to write)
*/

ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

-- Public read: anyone (including anon) can read city data
DROP POLICY IF EXISTS "public_select_cities" ON public.cities;
CREATE POLICY "public_select_cities"
ON public.cities FOR SELECT
TO anon, authenticated
USING (true);

-- Authenticated-only insert
DROP POLICY IF EXISTS "auth_insert_cities" ON public.cities;
CREATE POLICY "auth_insert_cities"
ON public.cities FOR INSERT
TO authenticated
WITH CHECK (true);

-- Authenticated-only update
DROP POLICY IF EXISTS "auth_update_cities" ON public.cities;
CREATE POLICY "auth_update_cities"
ON public.cities FOR UPDATE
TO authenticated
USING (true) WITH CHECK (true);

-- Authenticated-only delete
DROP POLICY IF EXISTS "auth_delete_cities" ON public.cities;
CREATE POLICY "auth_delete_cities"
ON public.cities FOR DELETE
TO authenticated
USING (true);
