/*
# Dossier 6-A: Set AED prices on existing token bundles (Section 18.2)

The existing bundles have different token counts than the dossier spec,
but the AED pricing follows the same ratio (AED price = INR price / 10).

Existing bundles:
- Starter: Rs2000 -> AED 200
- Growth: Rs5000 -> AED 500
- Power: Rs10000 -> AED 1000
- Premium: Rs20000 -> AED 2000
- Enterprise: Rs50000 -> AED 5000

Note: The dossier's bundle table (Rs200/10 -> Rs10000/500) doesn't match
existing data. We keep existing bundles and add AED prices proportionally.
Nirmal can adjust via admin panel at any time.
*/

UPDATE token_bundles SET price_aed = 200 WHERE name = 'Starter' AND price_aed IS NULL;
UPDATE token_bundles SET price_aed = 500 WHERE name = 'Growth' AND price_aed IS NULL;
UPDATE token_bundles SET price_aed = 1000 WHERE name = 'Power' AND price_aed IS NULL;
UPDATE token_bundles SET price_aed = 2000 WHERE name = 'Premium' AND price_aed IS NULL;
UPDATE token_bundles SET price_aed = 5000 WHERE name = 'Enterprise' AND price_aed IS NULL;