/*
# Dossier 6-A: Add site_config keys for admin-editable pricing (Sections 5.8, 11, 12, 14.3, 18)

## New site_config entries (key-value):
- `crm_monthly_rate_tokens` = '2' — CRM renewal cost per 30 days (Section 5.8)
- `sales_offer_short_tokens` = '1' — Sales Offer Generator Short edition (Section 11)
- `sales_offer_detailed_tokens` = '2' — Sales Offer Generator Detailed edition
- `sales_offer_ultra_tokens` = '3' — Sales Offer Generator Ultra Detailed edition
- `vam_full_bundle_tokens` = '10' — VAM full bundle: 5 calls + meeting fixing (Section 12)
- `vam_meeting_fixing_tokens` = '5' — VAM standalone meeting fixing
- `influencer_video_first_tokens` = '40' — Influencer first video fee
- `influencer_video_extra_tokens` = '25' — Influencer additional video fee
- `influencer_monthly_block_tokens` = '100' — Influencer monthly exclusivity block
- `ambassador_cooldown_days` = '30' — Cooldown before competitor reassignment
- `aed_usd_rate` = '3.67' — AED to USD conversion rate (Section 17)
- `show_platform_stats` = 'false' — Toggle for public platform stats display (Section 15.1)
- `token_price_inr` = '20' — Price per token in INR (Section 14.3)
- `token_price_aed` = '2' — Price per token in AED (Section 18.2)

All admin-editable via the existing AdminTokenSettings pattern.
*/

INSERT INTO site_config (key, value, updated_at) VALUES
('crm_monthly_rate_tokens', '2', now()),
('sales_offer_short_tokens', '1', now()),
('sales_offer_detailed_tokens', '2', now()),
('sales_offer_ultra_tokens', '3', now()),
('vam_full_bundle_tokens', '10', now()),
('vam_meeting_fixing_tokens', '5', now()),
('influencer_video_first_tokens', '40', now()),
('influencer_video_extra_tokens', '25', now()),
('influencer_monthly_block_tokens', '100', now()),
('ambassador_cooldown_days', '30', now()),
('aed_usd_rate', '3.67', now()),
('show_platform_stats', 'false', now()),
('token_price_inr', '20', now()),
('token_price_aed', '2', now())
ON CONFLICT (key) DO NOTHING;