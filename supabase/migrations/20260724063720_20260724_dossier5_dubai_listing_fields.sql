/*
# Dossier 5 — Add is_dubai column to listings

1. Modified Tables
- `listings` — add is_dubai boolean to distinguish Dubai listings from India listings
2. Notes
- Dubai listings display AED/USD, India listings display INR
- Dubai listings have QR codes, trade licence, escrow fields
*/

DO $$ BEGIN
  ALTER TABLE listings ADD COLUMN is_dubai boolean DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE listings ADD COLUMN ownership_type text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE listings ADD COLUMN escrow_account_status text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE listings ADD COLUMN trade_licence_number text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE listings ADD COLUMN emirates_id text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE listings ADD COLUMN size_sqft integer;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
