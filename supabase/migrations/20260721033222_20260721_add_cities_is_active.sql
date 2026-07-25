/*
# Add is_active column to cities

1. Modified Tables
- `cities`: add `is_active` boolean column, NOT NULL, default true so all
  existing rows are considered active.
2. Security
- No RLS policy changes. Existing SELECT policy for anon/authenticated
  remains unchanged; the new column is readable by anyone who can already
  read the table.
3. Notes
- Enables the developer/agent registration form to fetch only active cities
  via `.eq('is_active', true)`.
*/

ALTER TABLE cities
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
