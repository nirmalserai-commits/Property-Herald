/*
# Dossier 6-A: Add Market Track, Listing Form Fields, CRM/Wallet Currency

## Changes to `profiles` table:
- `market_track` (text, default 'india') — India or Dubai track, set at registration
- `account_status` (text, default 'active') — active/suspended toggle for developer suspension (Section 21.2)
- `crm_expires_at` (timestamptz, nullable) — CRM access expiry timestamp (Section 5.8)
- `wallet_currency` (text, default 'INR') — INR or AED, derived from market_track (Section 18.3)

## Changes to `listings` table:
- `market_track` (text, default 'india') — which track this listing belongs to
- `property_view` (text, nullable) — View field (Sea View, Garden View, etc.) per Section 3.2
- `contact_phone` (text, nullable) — contact phone for listing
- `photos` (text[], nullable) — array of photo URLs
- `escrow_account_number` (text, nullable) — escrow account number for Dubai off-plan (Section 17.1)
- `rera_qr_code` (text, nullable) — RERA QR code URL, Dubai emirate only (Section 17.1)
- `emirate` (text, nullable) — which of the 7 Emirates (Dubai track only)
- `price` (bigint, nullable) — single price field for the listing form

## Changes to `token_bundles` table:
- `price_aed` (integer, nullable) — AED price for Dubai track bundles (Section 18.2)

## Changes to `token_wallets` table:
- `wallet_currency` (text, default 'INR') — INR or AED (Section 18.3)

## Notes:
- All additions are additive (ALTER TABLE ADD COLUMN), no data loss.
- `property_view` used instead of `view` (SQL reserved word).
- Existing listings keep their current values; new columns default gracefully.
*/

-- Profiles: add market_track, account_status, crm_expires_at, wallet_currency
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS market_track text DEFAULT 'india';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_status text DEFAULT 'active';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS crm_expires_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wallet_currency text DEFAULT 'INR';

-- Listings: add form fields
ALTER TABLE listings ADD COLUMN IF NOT EXISTS market_track text DEFAULT 'india';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS property_view text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS contact_phone text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS photos text[];
ALTER TABLE listings ADD COLUMN IF NOT EXISTS escrow_account_number text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS rera_qr_code text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS emirate text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS price bigint;

-- Token bundles: add AED price
ALTER TABLE token_bundles ADD COLUMN IF NOT EXISTS price_aed integer;

-- Token wallets: add wallet currency
ALTER TABLE token_wallets ADD COLUMN IF NOT EXISTS wallet_currency text DEFAULT 'INR';