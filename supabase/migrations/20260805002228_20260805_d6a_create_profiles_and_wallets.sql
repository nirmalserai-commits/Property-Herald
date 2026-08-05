-- Create profiles table (the entire frontend depends on this)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY,
  business_name TEXT,
  business_type TEXT DEFAULT 'developer',
  contact_person TEXT,
  phone TEXT,
  whatsapp_number TEXT DEFAULT '',
  email TEXT,
  address TEXT,
  city_id INTEGER REFERENCES cities(id),
  description TEXT,
  logo_url TEXT,
  website_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  subscription_end_date TIMESTAMPTZ,
  verified_badge_active BOOLEAN DEFAULT false,
  verified_badge_expires_at TIMESTAMPTZ,
  role TEXT,
  is_founding_partner BOOLEAN DEFAULT false,
  market_track TEXT NOT NULL DEFAULT 'india',
  account_status TEXT NOT NULL DEFAULT 'active',
  crm_expires_at TIMESTAMPTZ,
  wallet_currency TEXT NOT NULL DEFAULT 'INR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_all" ON profiles FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "profiles_insert_self" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_self" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_delete_self" ON profiles FOR DELETE TO authenticated USING (auth.uid() = id);

-- Auto-create profile on auth signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, business_name, contact_person)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'business_name', ''), COALESCE(NEW.raw_user_meta_data->>'contact_person', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── token_wallets table ──
CREATE TABLE IF NOT EXISTS token_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0,
  low_balance_alerted_at TIMESTAMPTZ,
  wallet_currency TEXT NOT NULL DEFAULT 'INR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE token_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wallets_select_own" ON token_wallets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "wallets_insert_own" ON token_wallets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "wallets_update_own" ON token_wallets FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "wallets_delete_own" ON token_wallets FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Auto-create wallet when profile is created
CREATE OR REPLACE FUNCTION handle_new_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.token_wallets (user_id, wallet_currency)
  VALUES (NEW.id, CASE WHEN NEW.market_track = 'dubai' THEN 'AED' ELSE 'INR' END)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_new_profile();
