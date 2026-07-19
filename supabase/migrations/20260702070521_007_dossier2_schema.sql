
/*
# Dossier 2 Schema — Property Herald Full Evolution

This migration adds all 14 new tables and supporting columns required by
Property Herald Dossier 2, covering the AI Ambassador System, Banner
Management, NRI Portal, Buyer Experience, Gamification, Content & Media,
Enterprise/Partnerships, and Admin Command Center expansions.

## New Tables (14)

1. `ambassadors` — AI ambassador panel (9 pre-seeded: Nora, Navneet, Naina,
   Namrata, Noon Moon, Nandani, Neha, Nazia, Nita)
2. `ambassador_conversations` — Per-session conversation log with intent scoring
   (0-100), escalation flag, conversion tracking
3. `banners` — Full banner CMS across 6 platform positions: homepage_hero,
   directory_top, magazine_section, sidebar, corridor, footer_strip
4. `sbi_ad_placements` — 6 SBI institutional ad placements pre-seeded (inactive
   by default). Separate from token economy — managed by admin agreement.
5. `buyer_passports` — Verified buyer profiles: budget range, timeline, location
   preferences, pre-approval status, verification badges
6. `property_journey` — 8-stage journey tracker per buyer+listing pair:
   discovered → interested → site_visit → negotiation → agreement →
   financing → registration → possession
7. `saved_searches` — Buyer saved filter sets with instant/daily/weekly alert
   frequency settings
8. `achievements` — 7 badge types awarded to developers/users:
   first_listing, verified_developer, 100_leads, cover_advertiser,
   top_developer_mumbai, royal_collection, nri_specialist
9. `referrals` — Referral tracking: referrer/referred pair, token rewards,
   status flow (pending → active → rewarded)
10. `live_events` — Property Herald LIVE virtual expo management: up to 8
    developer slots per event, buyer registrations, recording URL
11. `legal_partners` — Vetted real estate lawyers per city with specialisation,
    rating, and contact details
12. `design_partners` — Interior design partners: city, style specialty,
    portfolio URL, rating
13. `market_reports` — Weekly/monthly corridor intelligence reports: corridor,
    type, PDF URL, access tier gating
14. `neighbourhood_data` — Per-listing neighbourhood intel: schools, hospitals,
    transit, malls, business hubs, future infrastructure

## Modified Tables

- `profiles`: Added referral_code (unique 8-char), streak_count, streak_last_active,
  streak_bonus_claimed_at, referred_by (FK to self)
- `listings`: Added is_nri_ready boolean column
- `site_config`: Seeded 10 new gamification/feature keys

## Security

- All 14 new tables have RLS enabled with separate per-verb policies
- Public read (anon + authenticated): ambassadors, banners, sbi_ad_placements,
  achievements, live_events, legal_partners, design_partners, neighbourhood_data
- Authenticated read only: market_reports
- User-owned (auth.uid() ownership): buyer_passports, saved_searches,
  property_journey (buyer_id), referrals (referrer_id)
- Ambassador conversations: anon/authenticated can insert; select scoped to
  own user_id or admin
- Admin-only write on all management tables via (auth.jwt()->>'email') check

## Ambassador Seeds

9 N-Girls ambassadors pre-seeded with persona, greeting, language, and
assignment rules JSON. Nora is the fallback ambassador (fallback: true).

## SBI Ad Placement Seeds

All 6 SBI placement types pre-seeded with headlines and CTAs, inactive by
default — Nirmal activates them via the admin panel.

## Important Notes

1. buyer_passports.user_id and saved_searches.user_id DEFAULT auth.uid() so
   frontend inserts that omit user_id still satisfy WITH CHECK
2. referral_code on profiles is auto-generated as UPPER(first 8 chars of uuid)
3. streak columns track consecutive listing activity days for gamification
4. sbi_ad_placements uses placement_type as UNIQUE key — safe to re-run
5. All JSONB columns default to empty array or object — never null
*/

-- ──────────────────────────────────────────────────────────────────────────────
-- PROFILES — gamification columns
-- ──────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='profiles' AND column_name='referral_code'
  ) THEN
    ALTER TABLE profiles ADD COLUMN referral_code TEXT UNIQUE
      DEFAULT UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 8));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='profiles' AND column_name='streak_count'
  ) THEN
    ALTER TABLE profiles ADD COLUMN streak_count INTEGER NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='profiles' AND column_name='streak_last_active'
  ) THEN
    ALTER TABLE profiles ADD COLUMN streak_last_active DATE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='profiles' AND column_name='streak_bonus_claimed_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN streak_bonus_claimed_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='profiles' AND column_name='referred_by'
  ) THEN
    ALTER TABLE profiles ADD COLUMN referred_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- LISTINGS — NRI ready flag
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='is_nri_ready'
  ) THEN
    ALTER TABLE listings ADD COLUMN is_nri_ready BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END $$;


-- ──────────────────────────────────────────────────────────────────────────────
-- 1. AMBASSADORS
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ambassadors (
  id                 UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT    NOT NULL,
  language           TEXT    NOT NULL,
  voice_id           TEXT,
  persona            TEXT    NOT NULL DEFAULT '',
  greeting           TEXT    NOT NULL DEFAULT '',
  avatar_url         TEXT,
  active             BOOLEAN NOT NULL DEFAULT TRUE,
  assignment_rules   JSONB   NOT NULL DEFAULT '{}',
  conversation_count INTEGER NOT NULL DEFAULT 0,
  sort_order         INTEGER NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ambassadors_active ON ambassadors(active);

ALTER TABLE ambassadors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_ambassadors" ON ambassadors;
CREATE POLICY "public_read_ambassadors" ON ambassadors FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_ambassadors" ON ambassadors;
CREATE POLICY "admin_insert_ambassadors" ON ambassadors FOR INSERT
  TO authenticated WITH CHECK ((auth.jwt()->>'email') = 'nirmalserai@gmail.com');

DROP POLICY IF EXISTS "admin_update_ambassadors" ON ambassadors;
CREATE POLICY "admin_update_ambassadors" ON ambassadors FOR UPDATE
  TO authenticated
  USING  ((auth.jwt()->>'email') = 'nirmalserai@gmail.com')
  WITH CHECK ((auth.jwt()->>'email') = 'nirmalserai@gmail.com');

DROP POLICY IF EXISTS "admin_delete_ambassadors" ON ambassadors;
CREATE POLICY "admin_delete_ambassadors" ON ambassadors FOR DELETE
  TO authenticated USING ((auth.jwt()->>'email') = 'nirmalserai@gmail.com');

-- Seed the 9 N-Girls ambassadors
INSERT INTO ambassadors (name, language, persona, greeting, active, assignment_rules, sort_order) VALUES
  ('Nora', 'English + Hindi',
   'Warm, professional, knowledgeable about all Indian real estate corridors. Primary ambassador handling general visitors and developer inquiries.',
   'Namaste! I am Nora, your Property Herald guide. Whether you are looking for your dream home or exploring investment opportunities, I am here to help you discover verified, premium properties across India. How can I assist you today?',
   TRUE, '{"fallback": true, "languages": ["en", "hi"]}', 1),

  ('Navneet', 'Punjabi',
   'Energetic and warm, speaks Punjabi and Hindi fluently. Expert in Chandigarh, Punjab, and Haryana real estate corridors.',
   'Sat Sri Akal! Main Navneet haan, Property Herald di guide. Chandigarh, Punjab te Haryana de verified properties bare main taunu poori jaankari de sakdi haan. Dasao, ki haal hai?',
   TRUE, '{"languages": ["pa"], "corridors": ["chandigarh", "punjab", "haryana"]}', 2),

  ('Naina', 'Gujarati',
   'Courteous and business-minded, fluent in Gujarati and Hindi. Expert in Gujarat corridor properties in Surat, Ahmedabad, and Vadodara.',
   'Kem cho! Hu Naina chhu, Property Herald ni guide. Surat, Ahmedabad ane Vadodara na verified properties bare tamne madat karvani che. Shu hahu tamne madad kari shakhu?',
   TRUE, '{"languages": ["gu"], "corridors": ["surat", "ahmedabad", "vadodara"]}', 3),

  ('Namrata', 'Sindhi',
   'Graceful and community-focused, speaks Sindhi and Hindi. Specialist for Sindhi-speaking community property interests.',
   'Sat Sri Akal! Maan Namrata aahin, Property Herald ji guide. Aapjee community khaan verified properties jo pura jawaab de sakindhi aahin. Cha madad karaandhi aahin?',
   TRUE, '{"languages": ["sd"]}', 4),

  ('Noon Moon', 'Bengali',
   'Poetic and articulate, speaks Bengali and Hindi. Future Kolkata corridor specialist, handles all Bengali-speaking visitors.',
   'Nomoshkar! Ami Noon Moon, Property Herald-er guide. Kolkata ebong Paschim Banger verified properties somporkhe apnake sahajyo korte ami ekhane achhi. Kemon achhen apni?',
   TRUE, '{"languages": ["bn"], "corridors": ["kolkata"]}', 5),

  ('Nandani', 'Tamil',
   'Sophisticated and precise, fluent in Tamil and English. Handles Tamil Nadu visitors and future Southern Corridor launches.',
   'Vanakkam! Naan Nandani, Property Herald-in guide. Tamil Nadu-vil verified properties pathi ungalukkku thagaval tharugiren. Ungalukku eppadi udavi cheiyya mudiyum?',
   TRUE, '{"languages": ["ta"], "corridors": ["chennai", "coimbatore"]}', 6),

  ('Neha', 'Marathi',
   'Grounded, trustworthy, Maharashtra expert. Handles all Mumbai corridor visitors — the home territory of Property Herald.',
   'Namaskar! Mi Neha, Property Herald chi guide. Mumbai, Pune, Thane aani poorna Maharashtra madhil verified properties chi sampoorna mahiti mi tumhala deu shakte. Kasa madad karu?',
   TRUE, '{"languages": ["mr"], "corridors": ["mumbai", "pune", "thane", "nashik"]}', 7),

  ('Nazia', 'Urdu',
   'Refined and eloquent, speaks Urdu and Hindi. Serves Urdu-speaking visitors across all corridors.',
   'Assalam-o-alaikum! Main Nazia hoon, Property Herald ki guide. Aap ke liye verified properties ki poori jaankari main dene ke liye hamesha tayyar hoon. Kya main aap ki madad kar sakti hoon?',
   TRUE, '{"languages": ["ur"]}', 8),

  ('Nita', 'English',
   'Professional, formal, internationally savvy. Handles NRI visitors, corporate clients, and Dubai diaspora investors.',
   'Good day! I am Nita, Property Herald''s NRI and Corporate Relations Ambassador. I specialise in helping diaspora investors and corporate clients navigate premium verified Indian real estate. How may I assist you?',
   TRUE, '{"languages": ["en"], "audiences": ["nri", "corporate"]}', 9)
ON CONFLICT DO NOTHING;


-- ──────────────────────────────────────────────────────────────────────────────
-- 2. AMBASSADOR CONVERSATIONS
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ambassador_conversations (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  ambassador_id UUID    NOT NULL REFERENCES ambassadors(id) ON DELETE CASCADE,
  visitor_id    TEXT,
  user_id       UUID    REFERENCES profiles(id) ON DELETE SET NULL,
  session_id    TEXT    NOT NULL,
  messages_json JSONB   NOT NULL DEFAULT '[]',
  intent_score  INTEGER NOT NULL DEFAULT 0 CHECK (intent_score >= 0 AND intent_score <= 100),
  converted     BOOLEAN NOT NULL DEFAULT FALSE,
  escalated     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_amb_conv_ambassador_id ON ambassador_conversations(ambassador_id);
CREATE INDEX IF NOT EXISTS idx_amb_conv_user_id       ON ambassador_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_amb_conv_intent_score  ON ambassador_conversations(intent_score DESC);
CREATE INDEX IF NOT EXISTS idx_amb_conv_created_at    ON ambassador_conversations(created_at DESC);

ALTER TABLE ambassador_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone_insert_conversations" ON ambassador_conversations;
CREATE POLICY "anyone_insert_conversations" ON ambassador_conversations FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "select_own_or_admin_conversations" ON ambassador_conversations;
CREATE POLICY "select_own_or_admin_conversations" ON ambassador_conversations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR (auth.jwt()->>'email') = 'nirmalserai@gmail.com');

DROP POLICY IF EXISTS "admin_update_conversations" ON ambassador_conversations;
CREATE POLICY "admin_update_conversations" ON ambassador_conversations FOR UPDATE
  TO authenticated
  USING  ((auth.jwt()->>'email') = 'nirmalserai@gmail.com')
  WITH CHECK ((auth.jwt()->>'email') = 'nirmalserai@gmail.com');


-- ──────────────────────────────────────────────────────────────────────────────
-- 3. BANNERS
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS banners (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT    NOT NULL,
  position        TEXT    NOT NULL CHECK (position IN (
                    'homepage_hero','directory_top','magazine_section',
                    'sidebar','corridor','footer_strip')),
  image_url       TEXT    NOT NULL,
  headline        TEXT,
  subheadline     TEXT,
  cta_text        TEXT,
  cta_url         TEXT,
  target_audience TEXT    NOT NULL DEFAULT 'all'
                    CHECK (target_audience IN ('all','logged_in','developers','buyers')),
  corridor_city   TEXT,
  active_from     TIMESTAMPTZ,
  active_to       TIMESTAMPTZ,
  impressions     INTEGER NOT NULL DEFAULT 0,
  clicks          INTEGER NOT NULL DEFAULT 0,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_banners_position ON banners(position);
CREATE INDEX IF NOT EXISTS idx_banners_active    ON banners(active);

ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_banners" ON banners;
CREATE POLICY "public_read_banners" ON banners FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_banners" ON banners;
CREATE POLICY "admin_insert_banners" ON banners FOR INSERT
  TO authenticated WITH CHECK ((auth.jwt()->>'email') = 'nirmalserai@gmail.com');

DROP POLICY IF EXISTS "admin_update_banners" ON banners;
CREATE POLICY "admin_update_banners" ON banners FOR UPDATE
  TO authenticated
  USING  ((auth.jwt()->>'email') = 'nirmalserai@gmail.com')
  WITH CHECK ((auth.jwt()->>'email') = 'nirmalserai@gmail.com');

DROP POLICY IF EXISTS "admin_delete_banners" ON banners;
CREATE POLICY "admin_delete_banners" ON banners FOR DELETE
  TO authenticated USING ((auth.jwt()->>'email') = 'nirmalserai@gmail.com');


-- ──────────────────────────────────────────────────────────────────────────────
-- 4. SBI AD PLACEMENTS
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sbi_ad_placements (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_type TEXT    NOT NULL UNIQUE CHECK (placement_type IN (
                   'listing_strip','emi_calculator','magazine_full_page',
                   'homepage_card','nri_panel','print_cover')),
  headline       TEXT,
  subheadline    TEXT,
  creative_url   TEXT,
  cta_text       TEXT    DEFAULT 'Apply Now',
  cta_url        TEXT,
  active         BOOLEAN NOT NULL DEFAULT FALSE,
  impressions    INTEGER NOT NULL DEFAULT 0,
  clicks         INTEGER NOT NULL DEFAULT 0,
  last_updated   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sbi_ad_placements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_sbi_ads" ON sbi_ad_placements;
CREATE POLICY "public_read_sbi_ads" ON sbi_ad_placements FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_sbi_ads" ON sbi_ad_placements;
CREATE POLICY "admin_insert_sbi_ads" ON sbi_ad_placements FOR INSERT
  TO authenticated WITH CHECK ((auth.jwt()->>'email') = 'nirmalserai@gmail.com');

DROP POLICY IF EXISTS "admin_update_sbi_ads" ON sbi_ad_placements;
CREATE POLICY "admin_update_sbi_ads" ON sbi_ad_placements FOR UPDATE
  TO authenticated
  USING  ((auth.jwt()->>'email') = 'nirmalserai@gmail.com')
  WITH CHECK ((auth.jwt()->>'email') = 'nirmalserai@gmail.com');

DROP POLICY IF EXISTS "admin_delete_sbi_ads" ON sbi_ad_placements;
CREATE POLICY "admin_delete_sbi_ads" ON sbi_ad_placements FOR DELETE
  TO authenticated USING ((auth.jwt()->>'email') = 'nirmalserai@gmail.com');

-- Seed all 6 SBI placement slots (inactive by default — admin activates)
INSERT INTO sbi_ad_placements (placement_type, headline, subheadline, cta_text, cta_url, active) VALUES
  ('listing_strip',      'Get SBI Home Loan for This Property',
   'Competitive rates from 8.5% p.a. | Apply in 5 minutes',
   'Check Eligibility', 'https://sbi.co.in/homeloan', FALSE),

  ('emi_calculator',     'SBI Home Loan EMI Calculator',
   'Get accurate EMI based on live SBI rates',
   'Apply for Pre-Approval', 'https://sbi.co.in/homeloan', FALSE),

  ('magazine_full_page', 'SBI — Your Trusted Home Loan Partner',
   'Financing dreams across India since 1955',
   'Learn More', 'https://sbi.co.in', FALSE),

  ('homepage_card',      'SBI Home Loans',
   'India''s most trusted home loan provider',
   'Get Started', 'https://sbi.co.in/homeloan', FALSE),

  ('nri_panel',          'SBI NRI Banking',
   'NRE/NRO Accounts | Remittance | NRI Home Loans',
   'Open NRI Account', 'https://sbi.co.in/nri', FALSE),

  ('print_cover',        'SBI — Title Sponsor',
   'Property Herald Print Edition — Maximum Prestige Placement',
   'Visit SBI', 'https://sbi.co.in', FALSE)
ON CONFLICT (placement_type) DO NOTHING;


-- ──────────────────────────────────────────────────────────────────────────────
-- 5. BUYER PASSPORTS
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS buyer_passports (
  id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID    NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE
                        DEFAULT auth.uid(),
  budget_min          BIGINT,
  budget_max          BIGINT,
  timeline            TEXT    CHECK (timeline IN ('immediate','3_months','6_months','1_year')),
  locations_json      JSONB   NOT NULL DEFAULT '[]',
  property_type       TEXT    CHECK (property_type IN ('residential','commercial','buy','rent','invest')),
  pre_approval_status BOOLEAN NOT NULL DEFAULT FALSE,
  pre_approval_bank   TEXT,
  email_verified      BOOLEAN NOT NULL DEFAULT FALSE,
  phone_verified      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buyer_passports_user_id ON buyer_passports(user_id);

ALTER TABLE buyer_passports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_buyer_passport" ON buyer_passports;
CREATE POLICY "select_own_buyer_passport" ON buyer_passports FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR (auth.jwt()->>'email') = 'nirmalserai@gmail.com');

DROP POLICY IF EXISTS "insert_own_buyer_passport" ON buyer_passports;
CREATE POLICY "insert_own_buyer_passport" ON buyer_passports FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_buyer_passport" ON buyer_passports;
CREATE POLICY "update_own_buyer_passport" ON buyer_passports FOR UPDATE
  TO authenticated
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_buyer_passport" ON buyer_passports;
CREATE POLICY "delete_own_buyer_passport" ON buyer_passports FOR DELETE
  TO authenticated USING (auth.uid() = user_id);


-- ──────────────────────────────────────────────────────────────────────────────
-- 6. PROPERTY JOURNEY
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS property_journey (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id       UUID    NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  buyer_id         UUID    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stage            TEXT    NOT NULL DEFAULT 'discovered' CHECK (stage IN (
                     'discovered','interested','site_visit','negotiation',
                     'agreement','financing','registration','possession')),
  stage_updated_at TIMESTAMPTZ DEFAULT NOW(),
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(listing_id, buyer_id)
);

CREATE INDEX IF NOT EXISTS idx_property_journey_buyer_id   ON property_journey(buyer_id);
CREATE INDEX IF NOT EXISTS idx_property_journey_listing_id ON property_journey(listing_id);

ALTER TABLE property_journey ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_journey" ON property_journey;
CREATE POLICY "select_own_journey" ON property_journey FOR SELECT
  TO authenticated
  USING (auth.uid() = buyer_id OR (auth.jwt()->>'email') = 'nirmalserai@gmail.com');

DROP POLICY IF EXISTS "insert_own_journey" ON property_journey;
CREATE POLICY "insert_own_journey" ON property_journey FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "update_own_journey" ON property_journey;
CREATE POLICY "update_own_journey" ON property_journey FOR UPDATE
  TO authenticated
  USING  (auth.uid() = buyer_id)
  WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "delete_own_journey" ON property_journey;
CREATE POLICY "delete_own_journey" ON property_journey FOR DELETE
  TO authenticated USING (auth.uid() = buyer_id);


-- ──────────────────────────────────────────────────────────────────────────────
-- 7. SAVED SEARCHES
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_searches (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
                    DEFAULT auth.uid(),
  name            TEXT,
  filters_json    JSONB   NOT NULL DEFAULT '{}',
  alert_frequency TEXT    NOT NULL DEFAULT 'instant'
                    CHECK (alert_frequency IN ('instant','daily','weekly')),
  last_alerted_at TIMESTAMPTZ,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_active  ON saved_searches(active);

ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_saved_searches" ON saved_searches;
CREATE POLICY "select_own_saved_searches" ON saved_searches FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_saved_searches" ON saved_searches;
CREATE POLICY "insert_own_saved_searches" ON saved_searches FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_saved_searches" ON saved_searches;
CREATE POLICY "update_own_saved_searches" ON saved_searches FOR UPDATE
  TO authenticated
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_saved_searches" ON saved_searches;
CREATE POLICY "delete_own_saved_searches" ON saved_searches FOR DELETE
  TO authenticated USING (auth.uid() = user_id);


-- ──────────────────────────────────────────────────────────────────────────────
-- 8. ACHIEVEMENTS
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS achievements (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_type TEXT    NOT NULL CHECK (badge_type IN (
               'first_listing','verified_developer','100_leads',
               'cover_advertiser','top_developer_mumbai',
               'royal_collection','nri_specialist')),
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  listing_id UUID    REFERENCES listings(id) ON DELETE SET NULL,
  notes      TEXT,
  UNIQUE(user_id, badge_type)
);

CREATE INDEX IF NOT EXISTS idx_achievements_user_id    ON achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_badge_type ON achievements(badge_type);

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_achievements" ON achievements;
CREATE POLICY "public_read_achievements" ON achievements FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_achievements" ON achievements;
CREATE POLICY "admin_insert_achievements" ON achievements FOR INSERT
  TO authenticated WITH CHECK ((auth.jwt()->>'email') = 'nirmalserai@gmail.com');

DROP POLICY IF EXISTS "admin_update_achievements" ON achievements;
CREATE POLICY "admin_update_achievements" ON achievements FOR UPDATE
  TO authenticated
  USING  ((auth.jwt()->>'email') = 'nirmalserai@gmail.com')
  WITH CHECK ((auth.jwt()->>'email') = 'nirmalserai@gmail.com');

DROP POLICY IF EXISTS "admin_delete_achievements" ON achievements;
CREATE POLICY "admin_delete_achievements" ON achievements FOR DELETE
  TO authenticated USING ((auth.jwt()->>'email') = 'nirmalserai@gmail.com');


-- ──────────────────────────────────────────────────────────────────────────────
-- 9. REFERRALS
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id   UUID    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_id   UUID    NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  status        TEXT    NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','active','rewarded')),
  tokens_earned INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  rewarded_at   TIMESTAMPTZ,
  CONSTRAINT no_self_referral CHECK (referrer_id != referred_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON referrals(referred_id);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_referrals" ON referrals;
CREATE POLICY "select_own_referrals" ON referrals FOR SELECT
  TO authenticated
  USING (auth.uid() = referrer_id OR (auth.jwt()->>'email') = 'nirmalserai@gmail.com');

DROP POLICY IF EXISTS "insert_referrals" ON referrals;
CREATE POLICY "insert_referrals" ON referrals FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_referrals" ON referrals;
CREATE POLICY "admin_update_referrals" ON referrals FOR UPDATE
  TO authenticated
  USING  ((auth.jwt()->>'email') = 'nirmalserai@gmail.com')
  WITH CHECK ((auth.jwt()->>'email') = 'nirmalserai@gmail.com');

DROP POLICY IF EXISTS "admin_delete_referrals" ON referrals;
CREATE POLICY "admin_delete_referrals" ON referrals FOR DELETE
  TO authenticated USING ((auth.jwt()->>'email') = 'nirmalserai@gmail.com');


-- ──────────────────────────────────────────────────────────────────────────────
-- 10. LIVE EVENTS
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS live_events (
  id                        UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  title                     TEXT    NOT NULL,
  description               TEXT,
  event_date                TIMESTAMPTZ NOT NULL,
  duration_minutes          INTEGER NOT NULL DEFAULT 120,
  developer_slots_json      JSONB   NOT NULL DEFAULT '[]',
  buyer_registrations_json  JSONB   NOT NULL DEFAULT '[]',
  recording_url             TEXT,
  status                    TEXT    NOT NULL DEFAULT 'upcoming'
                              CHECK (status IN ('upcoming','live','completed','cancelled')),
  tokens_per_slot           INTEGER NOT NULL DEFAULT 500,
  max_developer_slots       INTEGER NOT NULL DEFAULT 8,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_live_events_event_date ON live_events(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_live_events_status     ON live_events(status);

ALTER TABLE live_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_live_events" ON live_events;
CREATE POLICY "public_read_live_events" ON live_events FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_live_events" ON live_events;
CREATE POLICY "admin_insert_live_events" ON live_events FOR INSERT
  TO authenticated WITH CHECK ((auth.jwt()->>'email') = 'nirmalserai@gmail.com');

DROP POLICY IF EXISTS "admin_update_live_events" ON live_events;
CREATE POLICY "admin_update_live_events" ON live_events FOR UPDATE
  TO authenticated
  USING  ((auth.jwt()->>'email') = 'nirmalserai@gmail.com')
  WITH CHECK ((auth.jwt()->>'email') = 'nirmalserai@gmail.com');

DROP POLICY IF EXISTS "admin_delete_live_events" ON live_events;
CREATE POLICY "admin_delete_live_events" ON live_events FOR DELETE
  TO authenticated USING ((auth.jwt()->>'email') = 'nirmalserai@gmail.com');


-- ──────────────────────────────────────────────────────────────────────────────
-- 11. LEGAL PARTNERS
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS legal_partners (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT         NOT NULL,
  firm_name      TEXT,
  city           TEXT         NOT NULL,
  specialisation TEXT[]       NOT NULL DEFAULT ARRAY['property_purchase'],
  contact_email  TEXT,
  contact_phone  TEXT,
  profile_url    TEXT,
  verified       BOOLEAN      NOT NULL DEFAULT FALSE,
  rating         NUMERIC(3,1) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  review_count   INTEGER      NOT NULL DEFAULT 0,
  active         BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legal_partners_city   ON legal_partners(city);
CREATE INDEX IF NOT EXISTS idx_legal_partners_active ON legal_partners(active);

ALTER TABLE legal_partners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_legal_partners" ON legal_partners;
CREATE POLICY "public_read_legal_partners" ON legal_partners FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_legal_partners" ON legal_partners;
CREATE POLICY "admin_insert_legal_partners" ON legal_partners FOR INSERT
  TO authenticated WITH CHECK ((auth.jwt()->>'email') = 'nirmalserai@gmail.com');

DROP POLICY IF EXISTS "admin_update_legal_partners" ON legal_partners;
CREATE POLICY "admin_update_legal_partners" ON legal_partners FOR UPDATE
  TO authenticated
  USING  ((auth.jwt()->>'email') = 'nirmalserai@gmail.com')
  WITH CHECK ((auth.jwt()->>'email') = 'nirmalserai@gmail.com');

DROP POLICY IF EXISTS "admin_delete_legal_partners" ON legal_partners;
CREATE POLICY "admin_delete_legal_partners" ON legal_partners FOR DELETE
  TO authenticated USING ((auth.jwt()->>'email') = 'nirmalserai@gmail.com');


-- ──────────────────────────────────────────────────────────────────────────────
-- 12. DESIGN PARTNERS
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS design_partners (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT         NOT NULL,
  firm_name       TEXT,
  city            TEXT         NOT NULL,
  style_specialty TEXT[]       NOT NULL DEFAULT ARRAY['contemporary'],
  portfolio_url   TEXT,
  contact_email   TEXT,
  contact_phone   TEXT,
  verified        BOOLEAN      NOT NULL DEFAULT FALSE,
  rating          NUMERIC(3,1) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  review_count    INTEGER      NOT NULL DEFAULT 0,
  active          BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_design_partners_city   ON design_partners(city);
CREATE INDEX IF NOT EXISTS idx_design_partners_active ON design_partners(active);

ALTER TABLE design_partners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_design_partners" ON design_partners;
CREATE POLICY "public_read_design_partners" ON design_partners FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_design_partners" ON design_partners;
CREATE POLICY "admin_insert_design_partners" ON design_partners FOR INSERT
  TO authenticated WITH CHECK ((auth.jwt()->>'email') = 'nirmalserai@gmail.com');

DROP POLICY IF EXISTS "admin_update_design_partners" ON design_partners;
CREATE POLICY "admin_update_design_partners" ON design_partners FOR UPDATE
  TO authenticated
  USING  ((auth.jwt()->>'email') = 'nirmalserai@gmail.com')
  WITH CHECK ((auth.jwt()->>'email') = 'nirmalserai@gmail.com');

DROP POLICY IF EXISTS "admin_delete_design_partners" ON design_partners;
CREATE POLICY "admin_delete_design_partners" ON design_partners FOR DELETE
  TO authenticated USING ((auth.jwt()->>'email') = 'nirmalserai@gmail.com');


-- ──────────────────────────────────────────────────────────────────────────────
-- 13. MARKET REPORTS
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS market_reports (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  corridor       TEXT    NOT NULL,
  report_type    TEXT    NOT NULL DEFAULT 'weekly'
                   CHECK (report_type IN ('weekly','monthly','special')),
  report_date    DATE    NOT NULL,
  title          TEXT    NOT NULL,
  data_json      JSONB   NOT NULL DEFAULT '{}',
  pdf_url        TEXT,
  access_tier    TEXT    NOT NULL DEFAULT 'power'
                   CHECK (access_tier IN ('all','power','premium','enterprise')),
  distributed_at TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_reports_corridor    ON market_reports(corridor);
CREATE INDEX IF NOT EXISTS idx_market_reports_report_date ON market_reports(report_date DESC);

ALTER TABLE market_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_market_reports" ON market_reports;
CREATE POLICY "authenticated_read_market_reports" ON market_reports FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_market_reports" ON market_reports;
CREATE POLICY "admin_insert_market_reports" ON market_reports FOR INSERT
  TO authenticated WITH CHECK ((auth.jwt()->>'email') = 'nirmalserai@gmail.com');

DROP POLICY IF EXISTS "admin_update_market_reports" ON market_reports;
CREATE POLICY "admin_update_market_reports" ON market_reports FOR UPDATE
  TO authenticated
  USING  ((auth.jwt()->>'email') = 'nirmalserai@gmail.com')
  WITH CHECK ((auth.jwt()->>'email') = 'nirmalserai@gmail.com');

DROP POLICY IF EXISTS "admin_delete_market_reports" ON market_reports;
CREATE POLICY "admin_delete_market_reports" ON market_reports FOR DELETE
  TO authenticated USING ((auth.jwt()->>'email') = 'nirmalserai@gmail.com');


-- ──────────────────────────────────────────────────────────────────────────────
-- 14. NEIGHBOURHOOD DATA
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS neighbourhood_data (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id        UUID    NOT NULL UNIQUE REFERENCES listings(id) ON DELETE CASCADE,
  schools_json      JSONB   NOT NULL DEFAULT '[]',
  hospitals_json    JSONB   NOT NULL DEFAULT '[]',
  transit_json      JSONB   NOT NULL DEFAULT '[]',
  malls_json        JSONB   NOT NULL DEFAULT '[]',
  business_json     JSONB   NOT NULL DEFAULT '[]',
  future_infra_json JSONB   NOT NULL DEFAULT '[]',
  last_updated      TIMESTAMPTZ DEFAULT NOW(),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_neighbourhood_data_listing_id ON neighbourhood_data(listing_id);

ALTER TABLE neighbourhood_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_neighbourhood_data" ON neighbourhood_data;
CREATE POLICY "public_read_neighbourhood_data" ON neighbourhood_data FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_neighbourhood_data" ON neighbourhood_data;
CREATE POLICY "admin_insert_neighbourhood_data" ON neighbourhood_data FOR INSERT
  TO authenticated WITH CHECK ((auth.jwt()->>'email') = 'nirmalserai@gmail.com');

DROP POLICY IF EXISTS "admin_update_neighbourhood_data" ON neighbourhood_data;
CREATE POLICY "admin_update_neighbourhood_data" ON neighbourhood_data FOR UPDATE
  TO authenticated
  USING  ((auth.jwt()->>'email') = 'nirmalserai@gmail.com')
  WITH CHECK ((auth.jwt()->>'email') = 'nirmalserai@gmail.com');

DROP POLICY IF EXISTS "admin_delete_neighbourhood_data" ON neighbourhood_data;
CREATE POLICY "admin_delete_neighbourhood_data" ON neighbourhood_data FOR DELETE
  TO authenticated USING ((auth.jwt()->>'email') = 'nirmalserai@gmail.com');


-- ──────────────────────────────────────────────────────────────────────────────
-- 15. SITE CONFIG — gamification & new feature keys
-- ──────────────────────────────────────────────────────────────────────────────
INSERT INTO site_config (key, value) VALUES
  ('live_event_slot_cost',     '500'),
  ('referral_bonus_percent',   '10'),
  ('streak_30day_bonus',       '25'),
  ('streak_90day_bonus',       '100'),
  ('streak_180day_bonus',      '250'),
  ('streak_annual_bonus',      '1000'),
  ('developer_welcome_tokens', '50'),
  ('sbi_home_loan_rate',       '8.50'),
  ('hdfc_home_loan_rate',      '8.75'),
  ('icici_home_loan_rate',     '8.65')
ON CONFLICT (key) DO NOTHING;
