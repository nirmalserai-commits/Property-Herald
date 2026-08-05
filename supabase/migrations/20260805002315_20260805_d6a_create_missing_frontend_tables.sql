-- Create missing tables the frontend depends on

-- ── notifications ──
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT NOT NULL DEFAULT 'info',
  audience TEXT NOT NULL DEFAULT 'all',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_select_all" ON notifications FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "notif_insert_auth" ON notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "notif_update_auth" ON notifications FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "notif_delete_auth" ON notifications FOR DELETE TO authenticated USING (true);

-- ── newsletter_subscribers ──
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "newsletter_insert_all" ON newsletter_subscribers FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "newsletter_select_auth" ON newsletter_subscribers FOR SELECT TO authenticated USING (true);

-- ── token_bundles ──
CREATE TABLE IF NOT EXISTS token_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  base_tokens INTEGER NOT NULL,
  bonus_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL,
  price_inr INTEGER NOT NULL,
  price_aed INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE token_bundles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bundles_select_all" ON token_bundles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "bundles_insert_auth" ON token_bundles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "bundles_update_auth" ON token_bundles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "bundles_delete_auth" ON token_bundles FOR DELETE TO authenticated USING (true);

-- Seed token bundles (Section 18)
INSERT INTO token_bundles (name, base_tokens, bonus_tokens, total_tokens, price_inr, price_aed, is_active) VALUES
  ('Starter', 10, 0, 10, 200, 20, true),
  ('Growth', 50, 0, 50, 1000, 100, true),
  ('Power', 100, 0, 100, 2000, 200, true),
  ('Premium', 250, 0, 250, 5000, 500, true),
  ('Enterprise', 500, 0, 500, 10000, 1000, true)
ON CONFLICT DO NOTHING;

-- ── invoices ──
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  user_name TEXT,
  user_email TEXT,
  token_amount INTEGER NOT NULL,
  price_per_token INTEGER NOT NULL,
  subtotal INTEGER NOT NULL,
  gst_rate NUMERIC DEFAULT 0,
  gst_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL,
  payment_method TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  razorpay_payment_id TEXT,
  bundle_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoices_select_own" ON invoices FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "invoices_insert_own" ON invoices FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "invoices_update_auth" ON invoices FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "invoices_delete_auth" ON invoices FOR DELETE TO authenticated USING (true);

-- ── verifications ──
CREATE TABLE IF NOT EXISTS verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'both',
  rera_number TEXT,
  gst_number TEXT,
  document_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "verif_select_own" ON verifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "verif_insert_own" ON verifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "verif_update_auth" ON verifications FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "verif_delete_auth" ON verifications FOR DELETE TO authenticated USING (true);

-- ── whatsapp_leads ──
CREATE TABLE IF NOT EXISTS whatsapp_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE whatsapp_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_leads_insert_all" ON whatsapp_leads FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "wa_leads_select_auth" ON whatsapp_leads FOR SELECT TO authenticated USING (true);

-- ── beta_access ──
CREATE TABLE IF NOT EXISTS beta_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE beta_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "beta_insert_all" ON beta_access FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "beta_select_auth" ON beta_access FOR SELECT TO authenticated USING (true);

-- ── registrations ──
CREATE TABLE IF NOT EXISTS registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT,
  email TEXT,
  phone TEXT,
  role TEXT,
  city TEXT,
  agree_updates BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reg_insert_all" ON registrations FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "reg_select_auth" ON registrations FOR SELECT TO authenticated USING (true);
CREATE POLICY "reg_update_auth" ON registrations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "reg_delete_auth" ON registrations FOR DELETE TO authenticated USING (true);
