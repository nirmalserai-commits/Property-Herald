/*
# Create founding_partner_applications and homepage_leads tables

1. New Tables
- `founding_partner_applications`: stores manual-review applications submitted from the Founding Partner page.
  - id (uuid PK), name, email, phone, company, city, message, status (text, default 'pending'), created_at.
- `homepage_leads`: stores inquiries from the two hero pill buttons ("List your business" and "Comprehensive Project Marketing").
  - id (uuid PK), form_type (text: 'list_business' | 'project_marketing'), name, email, phone, company, message, status (text, default 'new'), created_at.

2. Security
- Enable RLS on both tables.
- This app HAS a sign-in screen but these forms are submitted by anonymous visitors (no login required to submit a lead/application).
- INSERT: allow anon + authenticated to insert (public submission forms).
- SELECT/UPDATE/DELETE: authenticated only (admin reviews and manages submissions).
*/

CREATE TABLE IF NOT EXISTS founding_partner_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  company text,
  city text,
  message text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE founding_partner_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_founding_partner_applications" ON founding_partner_applications;
CREATE POLICY "anon_insert_founding_partner_applications"
ON founding_partner_applications FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_select_founding_partner_applications" ON founding_partner_applications;
CREATE POLICY "auth_select_founding_partner_applications"
ON founding_partner_applications FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_update_founding_partner_applications" ON founding_partner_applications;
CREATE POLICY "auth_update_founding_partner_applications"
ON founding_partner_applications FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_founding_partner_applications" ON founding_partner_applications;
CREATE POLICY "auth_delete_founding_partner_applications"
ON founding_partner_applications FOR DELETE
TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS homepage_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_type text NOT NULL CHECK (form_type IN ('list_business', 'project_marketing')),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  company text,
  message text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE homepage_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_homepage_leads" ON homepage_leads;
CREATE POLICY "anon_insert_homepage_leads"
ON homepage_leads FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_select_homepage_leads" ON homepage_leads;
CREATE POLICY "auth_select_homepage_leads"
ON homepage_leads FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_update_homepage_leads" ON homepage_leads;
CREATE POLICY "auth_update_homepage_leads"
ON homepage_leads FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_homepage_leads" ON homepage_leads;
CREATE POLICY "auth_delete_homepage_leads"
ON homepage_leads FOR DELETE
TO authenticated USING (true);
