/*
# Create whatsapp_leads table

## Purpose
Records every WhatsApp Connect button click from the Directory page.
Powers the "Inquiries Processed" live stat on the Homepage.

## New Tables

### whatsapp_leads
Append-only log of WhatsApp lead clicks. Each row represents one visitor
clicking the WhatsApp button on a listing card.

Columns:
- id          — uuid primary key
- listing_id  — the listing that was clicked (nullable on listing deletion)
- profile_id  — the business owner who received the lead (nullable on profile deletion)
- created_at  — timestamp of the click

## Security

- RLS enabled.
- SELECT: open to anon + authenticated so the homepage anon-key client can
  count total inquiries for the platform stat.
- INSERT: authenticated only (edge function uses service role which bypasses RLS).
- No UPDATE or DELETE — this is an immutable audit log.

## Notes

1. ON DELETE SET NULL on both foreign keys preserves historical lead counts
   even if a listing or profile is later deleted.
2. The service-role edge function (whatsapp-lead-click) bypasses RLS on insert,
   so no explicit INSERT policy for anon is needed.
3. Index on profile_id supports per-owner lead analytics queries.
*/

CREATE TABLE IF NOT EXISTS whatsapp_leads (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  uuid        REFERENCES listings(id)  ON DELETE SET NULL,
  profile_id  uuid        REFERENCES profiles(id)  ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS whatsapp_leads_profile_id_idx ON whatsapp_leads(profile_id);
CREATE INDEX IF NOT EXISTS whatsapp_leads_listing_id_idx ON whatsapp_leads(listing_id);
CREATE INDEX IF NOT EXISTS whatsapp_leads_created_at_idx  ON whatsapp_leads(created_at DESC);

ALTER TABLE whatsapp_leads ENABLE ROW LEVEL SECURITY;

-- Public count for homepage stat (anon key)
DROP POLICY IF EXISTS "public_select_whatsapp_leads" ON whatsapp_leads;
CREATE POLICY "public_select_whatsapp_leads"
ON whatsapp_leads FOR SELECT
TO anon, authenticated
USING (true);

-- Authenticated insert (edge function uses service role, but kept for completeness)
DROP POLICY IF EXISTS "insert_whatsapp_leads" ON whatsapp_leads;
CREATE POLICY "insert_whatsapp_leads"
ON whatsapp_leads FOR INSERT
TO authenticated
WITH CHECK (true);
