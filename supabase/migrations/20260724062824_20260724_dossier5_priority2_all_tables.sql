/*
# Dossier 5 — Priority 2: All new database tables (fixed)

1. New Tables
- `localities` — localities linked to cities, with verification workflow
- `hall_of_fame` — 59 daughters directory cards
- `naksha_reports` — locality report purchases
- `conversation_memory` — cross-session memory for Nora/Nita/Neena
- `crm_leads` — lead records from all sources
- `crm_interactions` — lead interactions/follow-ups
- `crm_follow_ups` — scheduled follow-up reminders
- `greetings_vouchers` — voucher campaigns by developers
- `registrations` — Coming Soon page registrations
- `site_flags` — platform-wide toggles
- `neighbourhood_data` — Naksha report data per locality
- `daughter_pictures` — Meet Our Team admin management
2. Modified Tables
- `profiles` — add founding partner/agency fields
3. Data
- Pre-populate localities for Mumbai, Navi Mumbai, Thane, Pune
- Add 7 UAE emirates to cities table
- Seed 15 homepage daughters
- Seed site flags and config values
4. Security
- RLS on all new tables
*/

-- ============================================================================
-- 1. LOCALITIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS localities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id uuid REFERENCES cities(id) ON DELETE CASCADE,
  name text NOT NULL,
  state text,
  is_active boolean DEFAULT false,
  is_verified boolean DEFAULT false,
  submitted_by uuid REFERENCES profiles(id),
  verified_by text DEFAULT 'Naksha',
  rejection_reason text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE localities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_localities" ON localities;
CREATE POLICY "public_read_localities" ON localities FOR SELECT
  TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "admin_select_all_localities" ON localities;
CREATE POLICY "admin_select_all_localities" ON localities FOR SELECT
  TO authenticated USING ((auth.jwt() ->> 'email') = 'nirmalserai@gmail.com');

DROP POLICY IF EXISTS "admin_insert_localities" ON localities;
CREATE POLICY "admin_insert_localities" ON localities FOR INSERT
  TO authenticated WITH CHECK ((auth.jwt() ->> 'email') = 'nirmalserai@gmail.com');

DROP POLICY IF EXISTS "owner_insert_locality" ON localities;
CREATE POLICY "owner_insert_locality" ON localities FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = submitted_by);

DROP POLICY IF EXISTS "admin_update_localities" ON localities;
CREATE POLICY "admin_update_localities" ON localities FOR UPDATE
  TO authenticated USING ((auth.jwt() ->> 'email') = 'nirmalserai@gmail.com')
  WITH CHECK ((auth.jwt() ->> 'email') = 'nirmalserai@gmail.com');

DROP POLICY IF EXISTS "admin_delete_localities" ON localities;
CREATE POLICY "admin_delete_localities" ON localities FOR DELETE
  TO authenticated USING ((auth.jwt() ->> 'email') = 'nirmalserai@gmail.com');

-- ============================================================================
-- 2. HALL OF FAME TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS hall_of_fame (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  job_title text NOT NULL,
  position text,
  pod_name text,
  profile_picture_url text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hall_of_fame ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_hall_of_fame" ON hall_of_fame;
CREATE POLICY "public_read_hall_of_fame" ON hall_of_fame FOR SELECT
  TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "admin_insert_hall_of_fame" ON hall_of_fame;
CREATE POLICY "admin_insert_hall_of_fame" ON hall_of_fame FOR INSERT
  TO authenticated WITH CHECK ((auth.jwt() ->> 'email') = 'nirmalserai@gmail.com');

DROP POLICY IF EXISTS "admin_update_hall_of_fame" ON hall_of_fame;
CREATE POLICY "admin_update_hall_of_fame" ON hall_of_fame FOR UPDATE
  TO authenticated USING ((auth.jwt() ->> 'email') = 'nirmalserai@gmail.com')
  WITH CHECK ((auth.jwt() ->> 'email') = 'nirmalserai@gmail.com');

DROP POLICY IF EXISTS "admin_delete_hall_of_fame" ON hall_of_fame;
CREATE POLICY "admin_delete_hall_of_fame" ON hall_of_fame FOR DELETE
  TO authenticated USING ((auth.jwt() ->> 'email') = 'nirmalserai@gmail.com');

-- ============================================================================
-- 3. NAKSHA REPORTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS naksha_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  locality_id uuid REFERENCES localities(id) ON DELETE SET NULL,
  report_data jsonb,
  generated_at timestamptz DEFAULT now(),
  purchased_by uuid REFERENCES profiles(id),
  payment_method text CHECK (payment_method IN ('tokens','upi','razorpay')),
  tokens_charged integer DEFAULT 1,
  amount_charged decimal DEFAULT 20.00,
  payment_confirmed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE naksha_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_select_naksha_reports" ON naksha_reports;
CREATE POLICY "owner_select_naksha_reports" ON naksha_reports FOR SELECT
  TO authenticated USING (auth.uid() = purchased_by);

DROP POLICY IF EXISTS "owner_insert_naksha_reports" ON naksha_reports;
CREATE POLICY "owner_insert_naksha_reports" ON naksha_reports FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = purchased_by);

DROP POLICY IF EXISTS "owner_update_naksha_reports" ON naksha_reports;
CREATE POLICY "owner_update_naksha_reports" ON naksha_reports FOR UPDATE
  TO authenticated USING (auth.uid() = purchased_by)
  WITH CHECK (auth.uid() = purchased_by);

DROP POLICY IF EXISTS "admin_select_naksha_reports" ON naksha_reports;
CREATE POLICY "admin_select_naksha_reports" ON naksha_reports FOR SELECT
  TO authenticated USING ((auth.jwt() ->> 'email') = 'nirmalserai@gmail.com');

-- ============================================================================
-- 4. CONVERSATION MEMORY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS conversation_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  daughter_name text NOT NULL CHECK (daughter_name IN ('nora','nita','neena')),
  summary_text text,
  last_updated timestamptz DEFAULT now(),
  message_count integer DEFAULT 0,
  UNIQUE(user_id, daughter_name)
);

ALTER TABLE conversation_memory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_select_conversation_memory" ON conversation_memory;
CREATE POLICY "owner_select_conversation_memory" ON conversation_memory FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "owner_insert_conversation_memory" ON conversation_memory;
CREATE POLICY "owner_insert_conversation_memory" ON conversation_memory FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "owner_update_conversation_memory" ON conversation_memory;
CREATE POLICY "owner_update_conversation_memory" ON conversation_memory FOR UPDATE
  TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 5. CRM TABLES
-- ============================================================================
CREATE TABLE IF NOT EXISTS crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  buyer_name text,
  buyer_email text,
  buyer_phone text,
  source text CHECK (source IN ('nora','direct_enquiry','whatsapp_click','call_click','banner_click','walk_in','manual')),
  listing_id uuid REFERENCES listings(id) ON DELETE SET NULL,
  nora_conversation_summary text,
  intent_score integer DEFAULT 0,
  lead_quality text CHECK (lead_quality IN ('hot','warm','cold')) DEFAULT 'cold',
  status text CHECK (status IN ('new','contacted','site_visit_scheduled','site_visit_done','negotiating','converted','lost')) DEFAULT 'new',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE crm_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_select_crm_leads" ON crm_leads;
CREATE POLICY "owner_select_crm_leads" ON crm_leads FOR SELECT
  TO authenticated USING (auth.uid() = developer_id);

DROP POLICY IF EXISTS "owner_insert_crm_leads" ON crm_leads;
CREATE POLICY "owner_insert_crm_leads" ON crm_leads FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = developer_id);

DROP POLICY IF EXISTS "owner_update_crm_leads" ON crm_leads;
CREATE POLICY "owner_update_crm_leads" ON crm_leads FOR UPDATE
  TO authenticated USING (auth.uid() = developer_id)
  WITH CHECK (auth.uid() = developer_id);

DROP POLICY IF EXISTS "owner_delete_crm_leads" ON crm_leads;
CREATE POLICY "owner_delete_crm_leads" ON crm_leads FOR DELETE
  TO authenticated USING (auth.uid() = developer_id);

DROP POLICY IF EXISTS "admin_select_crm_leads" ON crm_leads;
CREATE POLICY "admin_select_crm_leads" ON crm_leads FOR SELECT
  TO authenticated USING ((auth.jwt() ->> 'email') = 'nirmalserai@gmail.com');

CREATE TABLE IF NOT EXISTS crm_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES crm_leads(id) ON DELETE CASCADE,
  interaction_type text,
  interaction_notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE crm_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_select_crm_interactions" ON crm_interactions;
CREATE POLICY "owner_select_crm_interactions" ON crm_interactions FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM crm_leads WHERE crm_leads.id = crm_interactions.lead_id AND crm_leads.developer_id = auth.uid())
  );

DROP POLICY IF EXISTS "owner_insert_crm_interactions" ON crm_interactions;
CREATE POLICY "owner_insert_crm_interactions" ON crm_interactions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM crm_leads WHERE crm_leads.id = crm_interactions.lead_id AND crm_leads.developer_id = auth.uid())
  );

DROP POLICY IF EXISTS "admin_select_crm_interactions" ON crm_interactions;
CREATE POLICY "admin_select_crm_interactions" ON crm_interactions FOR SELECT
  TO authenticated USING ((auth.jwt() ->> 'email') = 'nirmalserai@gmail.com');

CREATE TABLE IF NOT EXISTS crm_follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES crm_leads(id) ON DELETE CASCADE,
  reminder_date timestamptz,
  reminder_note text,
  is_completed boolean DEFAULT false,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE crm_follow_ups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_select_crm_follow_ups" ON crm_follow_ups;
CREATE POLICY "owner_select_crm_follow_ups" ON crm_follow_ups FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM crm_leads WHERE crm_leads.id = crm_follow_ups.lead_id AND crm_leads.developer_id = auth.uid())
  );

DROP POLICY IF EXISTS "owner_insert_crm_follow_ups" ON crm_follow_ups;
CREATE POLICY "owner_insert_crm_follow_ups" ON crm_follow_ups FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM crm_leads WHERE crm_leads.id = crm_follow_ups.lead_id AND crm_leads.developer_id = auth.uid())
  );

DROP POLICY IF EXISTS "owner_update_crm_follow_ups" ON crm_follow_ups;
CREATE POLICY "owner_update_crm_follow_ups" ON crm_follow_ups FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM crm_leads WHERE crm_leads.id = crm_follow_ups.lead_id AND crm_leads.developer_id = auth.uid())
  );

DROP POLICY IF EXISTS "admin_select_crm_follow_ups" ON crm_follow_ups;
CREATE POLICY "admin_select_crm_follow_ups" ON crm_follow_ups FOR SELECT
  TO authenticated USING ((auth.jwt() ->> 'email') = 'nirmalserai@gmail.com');

-- ============================================================================
-- 6. GREETINGS VOUCHERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS greetings_vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  voucher_type text NOT NULL CHECK (voucher_type IN ('birthday','diwali','ganpati','independence_day','eid','christmas','new_year','developer_anniversary','new_project_launch','custom')),
  custom_message text,
  discount_value text,
  recipient_count integer DEFAULT 0,
  tokens_charged integer DEFAULT 0,
  delivery_region text CHECK (delivery_region IN ('india','dubai')) DEFAULT 'india',
  delivery_report jsonb,
  status text DEFAULT 'draft',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE greetings_vouchers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_select_greetings_vouchers" ON greetings_vouchers;
CREATE POLICY "owner_select_greetings_vouchers" ON greetings_vouchers FOR SELECT
  TO authenticated USING (auth.uid() = developer_id);

DROP POLICY IF EXISTS "owner_insert_greetings_vouchers" ON greetings_vouchers;
CREATE POLICY "owner_insert_greetings_vouchers" ON greetings_vouchers FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = developer_id);

DROP POLICY IF EXISTS "owner_update_greetings_vouchers" ON greetings_vouchers;
CREATE POLICY "owner_update_greetings_vouchers" ON greetings_vouchers FOR UPDATE
  TO authenticated USING (auth.uid() = developer_id)
  WITH CHECK (auth.uid() = developer_id);

DROP POLICY IF EXISTS "admin_select_greetings_vouchers" ON greetings_vouchers;
CREATE POLICY "admin_select_greetings_vouchers" ON greetings_vouchers FOR SELECT
  TO authenticated USING ((auth.jwt() ->> 'email') = 'nirmalserai@gmail.com');

-- ============================================================================
-- 7. REGISTRATIONS TABLE (Coming Soon page)
-- ============================================================================
CREATE TABLE IF NOT EXISTS registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  role text CHECK (role IN ('developer','real_estate_agency','individual_agent','buyer')),
  city text,
  agree_updates boolean DEFAULT false,
  status text DEFAULT 'pending',
  approved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_insert_registrations" ON registrations;
CREATE POLICY "public_insert_registrations" ON registrations FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_select_registrations" ON registrations;
CREATE POLICY "admin_select_registrations" ON registrations FOR SELECT
  TO authenticated USING ((auth.jwt() ->> 'email') = 'nirmalserai@gmail.com');

DROP POLICY IF EXISTS "admin_update_registrations" ON registrations;
CREATE POLICY "admin_update_registrations" ON registrations FOR UPDATE
  TO authenticated USING ((auth.jwt() ->> 'email') = 'nirmalserai@gmail.com')
  WITH CHECK ((auth.jwt() ->> 'email') = 'nirmalserai@gmail.com');

DROP POLICY IF EXISTS "admin_delete_registrations" ON registrations;
CREATE POLICY "admin_delete_registrations" ON registrations FOR DELETE
  TO authenticated USING ((auth.jwt() ->> 'email') = 'nirmalserai@gmail.com');

-- ============================================================================
-- 8. SITE FLAGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS site_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_name text NOT NULL UNIQUE,
  flag_value boolean DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE site_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_site_flags" ON site_flags;
CREATE POLICY "public_read_site_flags" ON site_flags FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_update_site_flags" ON site_flags;
CREATE POLICY "admin_update_site_flags" ON site_flags FOR UPDATE
  TO authenticated USING ((auth.jwt() ->> 'email') = 'nirmalserai@gmail.com')
  WITH CHECK ((auth.jwt() ->> 'email') = 'nirmalserai@gmail.com');

DROP POLICY IF EXISTS "admin_insert_site_flags" ON site_flags;
CREATE POLICY "admin_insert_site_flags" ON site_flags FOR INSERT
  TO authenticated WITH CHECK ((auth.jwt() ->> 'email') = 'nirmalserai@gmail.com');

INSERT INTO site_flags (flag_name, flag_value) VALUES
  ('coming_soon_mode', true),
  ('maintenance_mode', false),
  ('nora_rest_mode', false),
  ('founding_partner_open', true),
  ('founding_agency_open', true)
ON CONFLICT (flag_name) DO NOTHING;

-- ============================================================================
-- 9. PROFILES — Add founding partner fields
-- ============================================================================
DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN is_founding_partner boolean DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN founding_partner_since timestamptz;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN founding_partner_tokens_loaded boolean DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN free_subscription_until timestamptz;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN free_tokens_expiry timestamptz;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN is_founding_agency boolean DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- ============================================================================
-- 10. ADD UAE EMIRATES TO CITIES TABLE
-- ============================================================================
INSERT INTO cities (name, slug, state, is_active)
SELECT * FROM (VALUES
  ('Dubai', 'dubai', 'UAE', true),
  ('Abu Dhabi', 'abu-dhabi', 'UAE', true),
  ('Sharjah', 'sharjah', 'UAE', true),
  ('Ajman', 'ajman', 'UAE', true),
  ('Ras Al Khaimah', 'ras-al-khaimah', 'UAE', true),
  ('Fujairah', 'fujairah', 'UAE', true),
  ('Umm Al Quwain', 'umm-al-quwain', 'UAE', true)
) AS v(name, slug, state, is_active)
WHERE NOT EXISTS (SELECT 1 FROM cities WHERE slug = v.slug);

-- ============================================================================
-- 11. PRE-POPULATE LOCALITIES
-- ============================================================================
INSERT INTO localities (city_id, name, state, is_active, is_verified)
SELECT c.id, v.name, 'Maharashtra', true, true
FROM cities c, (VALUES
  ('Bandra'), ('Andheri'), ('Juhu'), ('Worli'), ('Lower Parel'),
  ('Powai'), ('Malad'), ('Borivali'), ('Kandivali'), ('Goregaon'),
  ('Vikhroli'), ('Kurla'), ('Dadar'), ('Parel'), ('Chembur'),
  ('Mulund'), ('Bhandup'), ('Thane West'), ('Ghodbunder Road')
) AS v(name)
WHERE c.slug = 'mumbai' AND NOT EXISTS (
  SELECT 1 FROM localities l WHERE l.city_id = c.id AND l.name = v.name
);

INSERT INTO localities (city_id, name, state, is_active, is_verified)
SELECT c.id, v.name, 'Maharashtra', true, true
FROM cities c, (VALUES
  ('Kharghar'), ('Vashi'), ('Belapur'), ('Nerul'), ('Seawoods'),
  ('Panvel'), ('Ulwe'), ('Dronagiri'), ('Kamothe'), ('Kalamboli'),
  ('Airoli'), ('Ghansoli'), ('Kopar Khairane'), ('Sanpada'), ('Turbhe')
) AS v(name)
WHERE c.slug = 'navi-mumbai' AND NOT EXISTS (
  SELECT 1 FROM localities l WHERE l.city_id = c.id AND l.name = v.name
);

INSERT INTO localities (city_id, name, state, is_active, is_verified)
SELECT c.id, v.name, 'Maharashtra', true, true
FROM cities c, (VALUES
  ('Thane West'), ('Thane East'), ('Majiwada'), ('Manpada'),
  ('Ghodbunder Road'), ('Kolshet'), ('Brahmand'), ('Vartak Nagar'),
  ('Wagle Estate'), ('Balkum')
) AS v(name)
WHERE c.slug = 'thane' AND NOT EXISTS (
  SELECT 1 FROM localities l WHERE l.city_id = c.id AND l.name = v.name
);

INSERT INTO localities (city_id, name, state, is_active, is_verified)
SELECT c.id, v.name, 'Maharashtra', true, true
FROM cities c, (VALUES
  ('Hinjewadi'), ('Baner'), ('Balewadi'), ('Kothrud'), ('Wakad'),
  ('Pimple Saudagar'), ('Viman Nagar'), ('Koregaon Park'), ('Kalyani Nagar'),
  ('Hadapsar'), ('Kharadi'), ('Magarpatta'), ('Aundh'), ('Shivajinagar'), ('Deccan')
) AS v(name)
WHERE c.slug = 'pune' AND NOT EXISTS (
  SELECT 1 FROM localities l WHERE l.city_id = c.id AND l.name = v.name
);

-- ============================================================================
-- 12. NEIGHBOURHOOD DATA TABLE (for Naksha reports)
-- ============================================================================
CREATE TABLE IF NOT EXISTS neighbourhood_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  locality_id uuid REFERENCES localities(id) ON DELETE CASCADE,
  overview jsonb,
  connectivity jsonb,
  social_infrastructure jsonb,
  lifestyle jsonb,
  places_of_worship jsonb,
  infrastructure_rating text,
  connectivity_score integer,
  naksha_verdict text,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(locality_id)
);

ALTER TABLE neighbourhood_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_neighbourhood_data" ON neighbourhood_data;
CREATE POLICY "public_read_neighbourhood_data" ON neighbourhood_data FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_write_neighbourhood_data" ON neighbourhood_data;
CREATE POLICY "admin_write_neighbourhood_data" ON neighbourhood_data FOR INSERT
  TO authenticated WITH CHECK ((auth.jwt() ->> 'email') = 'nirmalserai@gmail.com');

DROP POLICY IF EXISTS "admin_update_neighbourhood_data" ON neighbourhood_data;
CREATE POLICY "admin_update_neighbourhood_data" ON neighbourhood_data FOR UPDATE
  TO authenticated USING ((auth.jwt() ->> 'email') = 'nirmalserai@gmail.com')
  WITH CHECK ((auth.jwt() ->> 'email') = 'nirmalserai@gmail.com');

-- ============================================================================
-- 13. DAUGHTER PICTURES TABLE (for Meet Our Team admin management)
-- ============================================================================
CREATE TABLE IF NOT EXISTS daughter_pictures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daughter_name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  pod_title text NOT NULL,
  profile_picture_url text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE daughter_pictures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_daughter_pictures" ON daughter_pictures;
CREATE POLICY "public_read_daughter_pictures" ON daughter_pictures FOR SELECT
  TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "admin_update_daughter_pictures" ON daughter_pictures;
CREATE POLICY "admin_update_daughter_pictures" ON daughter_pictures FOR UPDATE
  TO authenticated USING ((auth.jwt() ->> 'email') = 'nirmalserai@gmail.com')
  WITH CHECK ((auth.jwt() ->> 'email') = 'nirmalserai@gmail.com');

DROP POLICY IF EXISTS "admin_insert_daughter_pictures" ON daughter_pictures;
CREATE POLICY "admin_insert_daughter_pictures" ON daughter_pictures FOR INSERT
  TO authenticated WITH CHECK ((auth.jwt() ->> 'email') = 'nirmalserai@gmail.com');

INSERT INTO daughter_pictures (daughter_name, display_name, pod_title, display_order, is_active)
VALUES
  ('nora', 'Nora', 'Royal Family, COO', 1, true),
  ('nita', 'Nita', 'Royal Family, CoS', 2, true),
  ('nicole', 'Nicole', 'Core India Ops', 3, true),
  ('nancy', 'Nancy', 'Core India Ops', 4, true),
  ('namrata', 'Namrata', 'Core India Ops', 5, true),
  ('navika', 'Navika', 'STF Navi Mumbai Commander', 6, true),
  ('nimisha', 'Nimisha', 'STF Navi Mumbai 2', 7, true),
  ('nishita', 'Nishita', 'STF Navi Mumbai 3', 8, true),
  ('nazia', 'Nazia', 'International, Dubai Head', 9, true),
  ('naameshwari', 'Naameshwari', 'International, NYC Desk', 10, true),
  ('neetu', 'Neetu', 'NGFC, Home Loans', 11, true),
  ('neelu', 'Neelu', 'NGFC, Insurance', 12, true),
  ('nakshatra', 'Nakshatra', 'Social Media Cell Head', 13, true),
  ('navya', 'Navya', 'Culture & Wellbeing, Chief Innovation Officer', 14, true),
  ('naksha', 'Naksha', 'Geography & Maps, Locality Intelligence', 15, true)
ON CONFLICT (daughter_name) DO NOTHING;

-- ============================================================================
-- 14. SITE CONFIG VALUES
-- ============================================================================
INSERT INTO site_config (key, value)
VALUES ('aed_to_usd_rate', '3.67')
ON CONFLICT (key) DO NOTHING;

INSERT INTO site_config (key, value)
VALUES ('naksha_report_price', '20')
ON CONFLICT (key) DO NOTHING;

INSERT INTO site_config (key, value)
VALUES ('naksha_report_tokens', '1')
ON CONFLICT (key) DO NOTHING;
