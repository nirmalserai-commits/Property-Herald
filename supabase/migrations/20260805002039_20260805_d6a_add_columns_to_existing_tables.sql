-- Add market_track, account_status, crm_expires_at, wallet_currency to developers
ALTER TABLE developers
  ADD COLUMN IF NOT EXISTS market_track TEXT NOT NULL DEFAULT 'india',
  ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS crm_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS wallet_currency TEXT NOT NULL DEFAULT 'INR';

-- Add market_track, property_view, contact_phone, photos, emirate, escrow fields, rera_qr_code, owner_id to listings
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS market_track TEXT NOT NULL DEFAULT 'india',
  ADD COLUMN IF NOT EXISTS property_view TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS emirate TEXT,
  ADD COLUMN IF NOT EXISTS escrow_account_status TEXT,
  ADD COLUMN IF NOT EXISTS escrow_account_number TEXT,
  ADD COLUMN IF NOT EXISTS rera_qr_code TEXT,
  ADD COLUMN IF NOT EXISTS owner_id UUID;

-- Add preferred_name to leads
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS preferred_name TEXT;

-- Add customer_facing to ambassadors
ALTER TABLE ambassadors
  ADD COLUMN IF NOT EXISTS customer_facing BOOLEAN NOT NULL DEFAULT false;

-- Update existing Nora ambassador to be customer_facing
UPDATE ambassadors SET customer_facing = true WHERE name = 'Nora';

-- Add index on developers.market_track for filtering
CREATE INDEX IF NOT EXISTS idx_developers_market_track ON developers(market_track);
CREATE INDEX IF NOT EXISTS idx_listings_market_track ON listings(market_track);
CREATE INDEX IF NOT EXISTS idx_listings_owner_id ON listings(owner_id);
CREATE INDEX IF NOT EXISTS idx_listings_emirate ON listings(emirate);
