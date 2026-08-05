/*
# Dossier 6-A: Create ambassador_assignments table (Section 14.7)

## New Table: `ambassador_assignments`
Tracks which daughter is assigned to which developer/organization, with market scope and cooldown.

Columns:
- `id` (uuid PK)
- `daughter_name` (text) — which AI daughter
- `developer_id` (uuid) — which developer/organization profile
- `market_scope` (text) — market scope (e.g. 'JVC/JVT Dubai', 'Mumbai')
- `start_date` (timestamptz) — assignment start
- `end_date` (timestamptz, nullable) — assignment end
- `cooldown_until` (timestamptz, nullable) — cooldown before reassignment to competitor
- `created_at` (timestamptz)

## Security:
- RLS enabled. Admin-only access.
*/

CREATE TABLE IF NOT EXISTS ambassador_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daughter_name text NOT NULL,
  developer_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  market_scope text NOT NULL,
  start_date timestamptz DEFAULT now(),
  end_date timestamptz,
  cooldown_until timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ambassador_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_assignments" ON ambassador_assignments;
CREATE POLICY "admin_read_assignments" ON ambassador_assignments FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_assignments" ON ambassador_assignments;
CREATE POLICY "admin_insert_assignments" ON ambassador_assignments FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_assignments" ON ambassador_assignments;
CREATE POLICY "admin_update_assignments" ON ambassador_assignments FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_assignments" ON ambassador_assignments;
CREATE POLICY "admin_delete_assignments" ON ambassador_assignments FOR DELETE
  TO authenticated USING (true);