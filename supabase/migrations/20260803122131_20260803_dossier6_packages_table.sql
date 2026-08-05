/*
# Dossier 6-A: Create packages table (Section 14.7)

## New Table: `packages`
Generic packages system for developer/agent bundles.

Columns:
- `id` (uuid PK)
- `name` (text) — admin-facing label
- `audience` (text) — 'developer', 'agent', or 'both'
- `price_tokens` (integer) — price in tokens
- `billing_type` (text) — 'one_time' or 'recurring_manual'
- `contents` (jsonb) — structured list of line items [{item_type, quantity}]
- `market_track` (text) — 'india', 'dubai', or 'both'
- `active` (boolean, default true) — ON/OFF toggle
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

## Seed packages per Section 14.7:
- Founding Project Bundle (Developer, 200 tokens)
- Agent Listing (Agent, 5 tokens)
- Silver (50 tokens), Gold (100 tokens), Platinum (200 tokens)

## Security:
- RLS enabled. Authenticated can read (to see available packages).
- Admin can CRUD (UI gates to admin email).
*/

CREATE TABLE IF NOT EXISTS packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  audience text NOT NULL DEFAULT 'both',
  price_tokens integer NOT NULL DEFAULT 0,
  billing_type text NOT NULL DEFAULT 'one_time',
  contents jsonb NOT NULL DEFAULT '[]'::jsonb,
  market_track text NOT NULL DEFAULT 'both',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_packages" ON packages;
CREATE POLICY "read_packages" ON packages FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "anon_read_packages" ON packages;
CREATE POLICY "anon_read_packages" ON packages FOR SELECT
  TO anon USING (true);

DROP POLICY IF EXISTS "admin_insert_packages" ON packages;
CREATE POLICY "admin_insert_packages" ON packages FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_packages" ON packages;
CREATE POLICY "admin_update_packages" ON packages FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_packages" ON packages;
CREATE POLICY "admin_delete_packages" ON packages FOR DELETE
  TO authenticated USING (true);

-- Seed packages
INSERT INTO packages (name, audience, price_tokens, billing_type, contents, market_track, active) VALUES
('Founding Project Bundle', 'developer', 200, 'one_time',
 '[{"item_type":"premium_listings","quantity":10},{"item_type":"brochure_languages","quantity":2},{"item_type":"videos","quantity":1},{"item_type":"banners","quantity":3}]'::jsonb,
 'both', true),
('Agent Listing', 'agent', 5, 'one_time',
 '[{"item_type":"premium_listings","quantity":1},{"item_type":"custom_line","quantity":0}]'::jsonb,
 'both', true),
('Silver', 'developer', 50, 'one_time',
 '[{"item_type":"premium_listings","quantity":3},{"item_type":"banners","quantity":1},{"item_type":"crm_days","quantity":30}]'::jsonb,
 'both', true),
('Gold', 'developer', 100, 'one_time',
 '[{"item_type":"premium_listings","quantity":6},{"item_type":"brochure_languages","quantity":1},{"item_type":"banners","quantity":2},{"item_type":"crm_days","quantity":90}]'::jsonb,
 'both', true),
('Platinum', 'developer', 200, 'one_time',
 '[{"item_type":"premium_listings","quantity":10},{"item_type":"brochure_languages","quantity":2},{"item_type":"videos","quantity":1},{"item_type":"banners","quantity":3}]'::jsonb,
 'both', true)
ON CONFLICT DO NOTHING;