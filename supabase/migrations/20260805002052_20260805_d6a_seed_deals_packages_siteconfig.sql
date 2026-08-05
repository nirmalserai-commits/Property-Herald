-- ── Seed deals ──
INSERT INTO deals (name, trigger_amount, bonus_type, bonus_value, bonus_validity_days, non_token_perk, market_track, active) VALUES
  ('Midnight Offer — ₹25k tier', 25000, 'flat_tokens', 200, 60, NULL, 'india', true),
  ('Midnight Offer — ₹50k tier', 50000, 'flat_tokens', 500, 60, NULL, 'india', true),
  ('Midnight Offer — ₹1L tier', 100000, 'flat_tokens', 1500, 90, NULL, 'india', true)
ON CONFLICT DO NOTHING;

-- ── Seed packages ──
INSERT INTO packages (name, audience, price_tokens, billing_type, contents, market_track, active) VALUES
  (
    'Founding Project Bundle',
    'developer',
    200,
    'one_time',
    '[{"item_type":"brochure_languages","quantity":2},{"item_type":"videos","quantity":1},{"item_type":"banners","quantity":3},{"item_type":"premium_listings","quantity":10}]'::jsonb,
    'both',
    true
  ),
  (
    'Agent Listing',
    'agent',
    5,
    'one_time',
    '[{"item_type":"premium_listings","quantity":1},{"item_type":"custom_line","quantity":1}]'::jsonb,
    'both',
    true
  ),
  (
    'Silver',
    'both',
    50,
    'one_time',
    '[{"item_type":"premium_listings","quantity":3},{"item_type":"banners","quantity":1},{"item_type":"crm_days","quantity":30}]'::jsonb,
    'both',
    true
  ),
  (
    'Gold',
    'both',
    100,
    'one_time',
    '[{"item_type":"premium_listings","quantity":6},{"item_type":"brochure_languages","quantity":1},{"item_type":"banners","quantity":2},{"item_type":"crm_days","quantity":90}]'::jsonb,
    'both',
    true
  ),
  (
    'Platinum',
    'developer',
    200,
    'one_time',
    '[{"item_type":"premium_listings","quantity":10},{"item_type":"brochure_languages","quantity":2},{"item_type":"videos","quantity":1},{"item_type":"banners","quantity":3}]'::jsonb,
    'both',
    true
  )
ON CONFLICT DO NOTHING;

-- ── Seed site_config pricing keys ──
INSERT INTO site_config (key, value) VALUES
  ('token_price_inr', '20'),
  ('token_price_aed', '2'),
  ('aed_usd_rate', '3.67'),
  ('crm_monthly_rate_tokens', '2'),
  ('sales_offer_short_tokens', '1'),
  ('sales_offer_detailed_tokens', '2'),
  ('sales_offer_ultra_tokens', '3'),
  ('vam_full_bundle_tokens', '10'),
  ('vam_meeting_fixing_tokens', '5'),
  ('naksha_report_tokens', '20'),
  ('magazine_readers', '100000'),
  ('show_platform_stats', 'false'),
  ('total_visitor_count', '0'),
  ('total_sales_offers_generated', '0'),
  ('influencer_video_first_tokens', '40'),
  ('influencer_video_extra_tokens', '25'),
  ('influencer_monthly_exclusivity_tokens', '100'),
  ('ambassador_cooldown_days', '30')
ON CONFLICT (key) DO NOTHING;
