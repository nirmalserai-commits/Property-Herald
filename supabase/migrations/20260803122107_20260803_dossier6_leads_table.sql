/*
# Dossier 6-A: Create leads table (Section 5)

## New Table: `leads`
CRM leads table — the core of the two-level CRM system.

Columns:
- `id` (uuid PK) — unique lead ID
- `listing_id` (uuid, nullable, FK to listings) — which listing this lead is about
- `name` (text, not null) — lead's name
- `phone` (text, not null) — lead's phone number
- `message` (text, nullable) — initial message from lead
- `created_at` (timestamptz, default now()) — when lead was created
- `status` (text, default 'new') — new | contacted | qualified | converted | lost
- `source` (text, default 'manual') — where the lead came from
- `notes` (text, nullable) — internal notes
- `owner_id` (uuid, nullable) — the developer/agent who owns this lead
- `assigned_to` (text, nullable) — who this lead is assigned to
- `intent_score` (integer, default 0) — 0-100 intent score, hidden from buyers
- `comfort_hours` (text, nullable) — preferred call hours
- `preferred_name` (text, nullable) — name the lead prefers
- `email` (text, nullable) — lead's email

## Security:
- RLS enabled.
- Developers can CRUD their own leads (owner_id = auth.uid()).
- Anon can INSERT (Nora creates leads from chat widget).
*/

CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES listings(id) ON DELETE SET NULL,
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  message text,
  created_at timestamptz DEFAULT now(),
  status text DEFAULT 'new',
  source text DEFAULT 'manual',
  notes text,
  owner_id uuid,
  assigned_to text,
  intent_score integer DEFAULT 0,
  comfort_hours text,
  preferred_name text
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_leads" ON leads;
CREATE POLICY "select_own_leads" ON leads FOR SELECT
  TO authenticated USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "insert_own_leads" ON leads;
CREATE POLICY "insert_own_leads" ON leads FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "update_own_leads" ON leads;
CREATE POLICY "update_own_leads" ON leads FOR UPDATE
  TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "delete_own_leads" ON leads;
CREATE POLICY "delete_own_leads" ON leads FOR DELETE
  TO authenticated USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "anon_insert_leads" ON leads;
CREATE POLICY "anon_insert_leads" ON leads FOR INSERT
  TO anon WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_leads_owner_id ON leads(owner_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);