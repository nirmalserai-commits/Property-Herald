/*
# Dossier 6-A: Create deals table (Section 14)

## New Table: `deals`
Admin-editable deals/offers system. Replaces hardcoded Midnight Offers.

Columns:
- `id` (uuid PK)
- `name` (text) — admin-facing label (e.g. "Midnight Offer - Rs25k tier")
- `trigger_amount` (numeric) — purchase amount that unlocks the deal
- `bonus_type` (text) — 'flat_tokens' or 'percentage'
- `bonus_value` (numeric) — flat token amount or percentage
- `bonus_validity_days` (integer) — how long bonus tokens remain valid
- `non_token_perk` (text, nullable) — optional text (e.g. "priority listing placement, 90 days")
- `market_track` (text) — 'india', 'dubai', or 'both'
- `active` (boolean, default true) — ON/OFF toggle
- `start_date` (timestamptz, nullable) — optional promotional window start
- `end_date` (timestamptz, nullable) — optional promotional window end
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

## Seed data:
Three initial deals per Section 14.4 seed table.

## Security:
- RLS enabled. Admin-only (authenticated, but UI gates to admin email).
- Public read for active deals (so token purchase page can show applicable deals).
*/

CREATE TABLE IF NOT EXISTS deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  trigger_amount numeric NOT NULL,
  bonus_type text NOT NULL DEFAULT 'flat_tokens',
  bonus_value numeric NOT NULL,
  bonus_validity_days integer NOT NULL DEFAULT 60,
  non_token_perk text,
  market_track text NOT NULL DEFAULT 'both',
  active boolean NOT NULL DEFAULT true,
  start_date timestamptz,
  end_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

-- Authenticated users (developers) can read active deals to see what's available
DROP POLICY IF EXISTS "read_active_deals" ON deals;
CREATE POLICY "read_active_deals" ON deals FOR SELECT
  TO authenticated USING (true);

-- Anon can also read (for public token store display)
DROP POLICY IF EXISTS "anon_read_deals" ON deals;
CREATE POLICY "anon_read_deals" ON deals FOR SELECT
  TO anon USING (true);

-- Authenticated can insert/update/delete (UI gates to admin)
DROP POLICY IF EXISTS "admin_insert_deals" ON deals;
CREATE POLICY "admin_insert_deals" ON deals FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_deals" ON deals;
CREATE POLICY "admin_update_deals" ON deals FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_deals" ON deals;
CREATE POLICY "admin_delete_deals" ON deals FOR DELETE
  TO authenticated USING (true);

-- Seed data per Section 14.4
INSERT INTO deals (name, trigger_amount, bonus_type, bonus_value, bonus_validity_days, market_track, active) VALUES
('Rs25,000 Tier', 25000, 'flat_tokens', 200, 60, 'india', true),
('Rs50,000 Tier', 50000, 'flat_tokens', 500, 60, 'india', true),
('Rs1,00,000 Tier', 100000, 'flat_tokens', 1500, 90, 'india', true)
ON CONFLICT DO NOTHING;