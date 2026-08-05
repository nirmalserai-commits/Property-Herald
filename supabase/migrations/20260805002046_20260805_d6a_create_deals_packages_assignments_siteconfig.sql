-- ── deals table ──
CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  trigger_amount BIGINT NOT NULL DEFAULT 0,
  bonus_type TEXT NOT NULL DEFAULT 'flat_tokens' CHECK (bonus_type IN ('flat_tokens', 'percentage')),
  bonus_value INTEGER NOT NULL DEFAULT 0,
  bonus_validity_days INTEGER NOT NULL DEFAULT 60,
  non_token_perk TEXT,
  market_track TEXT NOT NULL DEFAULT 'both' CHECK (market_track IN ('india', 'dubai', 'both')),
  active BOOLEAN NOT NULL DEFAULT true,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deals_select_authenticated" ON deals FOR SELECT TO authenticated USING (true);
CREATE POLICY "deals_insert_authenticated" ON deals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "deals_update_authenticated" ON deals FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "deals_delete_authenticated" ON deals FOR DELETE TO authenticated USING (true);

-- ── packages table ──
CREATE TABLE IF NOT EXISTS packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT 'both' CHECK (audience IN ('developer', 'agent', 'both')),
  price_tokens INTEGER NOT NULL DEFAULT 0,
  billing_type TEXT NOT NULL DEFAULT 'one_time' CHECK (billing_type IN ('one_time', 'recurring_manual')),
  contents JSONB NOT NULL DEFAULT '[]'::jsonb,
  market_track TEXT NOT NULL DEFAULT 'both' CHECK (market_track IN ('india', 'dubai', 'both')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "packages_select_authenticated" ON packages FOR SELECT TO authenticated USING (true);
CREATE POLICY "packages_insert_authenticated" ON packages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "packages_update_authenticated" ON packages FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "packages_delete_authenticated" ON packages FOR DELETE TO authenticated USING (true);

-- ── ambassador_assignments table ──
CREATE TABLE IF NOT EXISTS ambassador_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daughter_name TEXT NOT NULL,
  developer_id UUID REFERENCES developers(id),
  market_scope TEXT NOT NULL DEFAULT 'india',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  cooldown_until DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE ambassador_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "amb_assign_select_authenticated" ON ambassador_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "amb_assign_insert_authenticated" ON ambassador_assignments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "amb_assign_update_authenticated" ON ambassador_assignments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "amb_assign_delete_authenticated" ON ambassador_assignments FOR DELETE TO authenticated USING (true);

-- ── site_config table (admin-editable key-value settings) ──
CREATE TABLE IF NOT EXISTS site_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_config_select_all" ON site_config FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "site_config_insert_authenticated" ON site_config FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "site_config_update_authenticated" ON site_config FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "site_config_delete_authenticated" ON site_config FOR DELETE TO authenticated USING (true);

-- ── site_flags table (maintenance mode, nora rest mode, etc.) ──
CREATE TABLE IF NOT EXISTS site_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_name TEXT NOT NULL UNIQUE,
  flag_value BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE site_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_flags_select_all" ON site_flags FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "site_flags_insert_authenticated" ON site_flags FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "site_flags_update_authenticated" ON site_flags FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "site_flags_delete_authenticated" ON site_flags FOR DELETE TO authenticated USING (true);

-- Seed default flags
INSERT INTO site_flags (flag_name, flag_value) VALUES
  ('maintenance_mode', false),
  ('nora_rest_mode', false),
  ('show_platform_stats', false)
ON CONFLICT (flag_name) DO NOTHING;
