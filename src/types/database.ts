export type Persona = 'neena' | 'nora' | 'nita';

export type PublicAmbassadorType = 'developer' | 'agent' | 'community';

export interface PublicAmbassador {
  id: string;
  name: string;
  city_region: string;
  ambassador_type: PublicAmbassadorType;
  profile_picture_url: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export type BusinessType = 'developer' | 'agency' | 'agent';
export type ModerationStatus = 'pending' | 'approved' | 'rejected' | 'flagged';
export type VerificationRequestStatus = 'pending' | 'approved' | 'rejected';
export type NotificationType = 'info' | 'warning' | 'success' | 'error';
export type NotificationAudience = 'all' | 'verified' | 'unverified';
export type InquiryStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
export type InquirySource = 'directory' | 'magazine' | 'website';
export type AdType = 'full_page' | 'half_page' | 'quarter_page';
export type PropertyType = 'residential' | 'commercial';
export type DealType = 'buy' | 'rent';
export type TokenTransactionType = 'purchase' | 'burn' | 'bonus' | 'refund';

export interface City {
  id: string;
  name: string;
  state: string;
  slug: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  property_type: PropertyType;
  created_at: string;
}

export type MarketTrack = 'india' | 'dubai';
export type AccountStatus = 'active' | 'suspended';

export interface Profile {
  id: string;
  business_name: string;
  business_type: BusinessType;
  contact_person: string;
  phone: string;
  whatsapp_number: string;
  email: string;
  address: string | null;
  city_id: string | null;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  is_verified: boolean;
  is_active: boolean;
  subscription_end_date: string | null;
  verified_badge_active: boolean;
  verified_badge_expires_at: string | null;
  role: string | null;
  is_founding_partner: boolean | null;
  market_track: MarketTrack;
  account_status: AccountStatus;
  crm_expires_at: string | null;
  wallet_currency: 'INR' | 'AED';
  created_at: string;
  updated_at: string;
  city?: City;
}

export interface Listing {
  id: string;
  profile_id: string;
  city_id: string;
  title: string;
  description: string | null;
  specialties: string[];
  property_types: PropertyType[];
  deal_types: DealType[];
  projects_completed: number;
  years_experience: number;
  rating: number;
  views_count: number;
  is_featured: boolean;
  is_hot: boolean;
  is_active: boolean;
  moderation_status: ModerationStatus;
  moderation_reason: string | null;
  featured_expires_at: string | null;
  hot_expires_at: string | null;
  is_dubai?: boolean;
  ownership_type?: string | null;
  escrow_account_status?: string | null;
  escrow_account_number?: string | null;
  rera_qr_code?: string | null;
  emirate?: string | null;
  trade_licence_number?: string | null;
  emirates_id?: string | null;
  size_sqft?: number | null;
  approval_level?: string | null;
  market_track?: MarketTrack;
  property_view?: string | null;
  contact_phone?: string | null;
  photos?: string[] | null;
  price?: number | null;
  price_min?: number | null;
  price_max?: number | null;
  created_at: string;
  updated_at: string;
  profile?: Profile;
  city?: City;
}

export interface Magazine {
  id: string;
  issue_number: number;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  flipbook_url: string | null;
  published_date: string | null;
  is_published: boolean;
  created_at: string;
}

export interface MagazineAd {
  id: string;
  magazine_id: string;
  profile_id: string | null;
  page_number: number;
  ad_type: AdType;
  image_url: string;
  whatsapp_link: string | null;
  website_link: string | null;
  price: number;
  is_paid: boolean;
  created_at: string;
  profile?: Profile;
  magazine?: Magazine;
}

export interface Inquiry {
  id: string;
  profile_id: string;
  listing_id: string | null;
  magazine_ad_id: string | null;
  client_name: string;
  client_phone: string;
  client_email: string | null;
  client_whatsapp: string | null;
  message: string | null;
  source: InquirySource;
  status: InquiryStatus;
  notes: string | null;
  follow_up_date: string | null;
  created_at: string;
  updated_at: string;
  listing?: Listing;
  magazine_ad?: MagazineAd;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_months: number;
  features: string[];
  is_active: boolean;
  created_at: string;
}

export interface Subscription {
  id: string;
  profile_id: string;
  plan_id: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  payment_status: 'pending' | 'paid' | 'failed';
  created_at: string;
  plan?: SubscriptionPlan;
}

export interface SiteConfig {
  key: string;
  value: string;
  updated_at: string;
}

export interface TokenBundle {
  id: string;
  name: string;
  base_tokens: number;
  bonus_tokens: number;
  total_tokens: number;
  price_inr: number;
  price_aed?: number | null;
  is_active: boolean;
  created_at: string;
}

export interface TokenWallet {
  id: string;
  user_id: string;
  balance: number;
  low_balance_alerted_at: string | null;
  wallet_currency?: 'INR' | 'AED';
  created_at: string;
  updated_at: string;
}

export interface TokenTransaction {
  id: string;
  user_id: string;
  type: TokenTransactionType;
  amount: number;
  reason: string;
  related_listing_id: string | null;
  razorpay_payment_id: string | null;
  balance_after: number;
  created_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  user_id: string;
  date: string;
  user_name: string;
  user_email: string;
  token_amount: number;
  price_per_token: number;
  subtotal: number;
  gst_rate: number;
  gst_amount: number;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  razorpay_payment_id: string | null;
  bundle_name: string | null;
  created_at: string;
}

export interface AdminAuditLog {
  id: string;
  admin_email: string;
  action: string;
  target_table: string | null;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface VerificationRequest {
  id: string;
  user_id: string;
  type: 'rera' | 'gst' | 'both';
  rera_number: string | null;
  gst_number: string | null;
  document_url: string | null;
  status: VerificationRequestStatus;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  profile?: Profile;
}

export interface Notification {
  id: string;
  user_id: string | null;
  title: string;
  message: string;
  type: NotificationType;
  audience: NotificationAudience;
  is_read: boolean;
  created_at: string;
}

export interface AnalyticsDay {
  day: string;
  new_users: number;
  new_listings: number;
  revenue: number;
}

export interface Ambassador {
  id: string;
  name: string;
  language: string;
  voice_id: string | null;
  persona: string;
  greeting: string;
  avatar_url: string | null;
  active: boolean;
  assignment_rules: {
    fallback?: boolean;
    languages?: string[];
    corridors?: string[];
    audiences?: string[];
  };
  conversation_count: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface AmbassadorConversation {
  id: string;
  ambassador_id: string;
  visitor_id: string | null;
  user_id: string | null;
  session_id: string;
  messages_json: ChatMessage[];
  intent_score: number;
  converted: boolean;
  escalated: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  role: 'ambassador' | 'user';
  content: string;
  timestamp: string;
}

export interface Banner {
  id: string;
  name: string;
  position: 'homepage_hero' | 'directory_top' | 'magazine_section' | 'sidebar' | 'corridor' | 'footer_strip';
  image_url: string;
  headline: string | null;
  subheadline: string | null;
  cta_text: string | null;
  cta_url: string | null;
  target_audience: 'all' | 'logged_in' | 'developers' | 'buyers';
  corridor_city: string | null;
  active_from: string | null;
  active_to: string | null;
  impressions: number;
  clicks: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SbiAdPlacement {
  id: string;
  placement_type: 'listing_strip' | 'emi_calculator' | 'magazine_full_page' | 'homepage_card' | 'nri_panel' | 'print_cover';
  headline: string | null;
  subheadline: string | null;
  creative_url: string | null;
  cta_text: string | null;
  cta_url: string | null;
  active: boolean;
  impressions: number;
  clicks: number;
  last_updated: string;
}

export interface BuyerPassport {
  id: string;
  user_id: string;
  budget_min: number | null;
  budget_max: number | null;
  timeline: 'immediate' | '3_months' | '6_months' | '1_year' | null;
  locations_json: string[];
  property_type: 'residential' | 'commercial' | 'buy' | 'rent' | 'invest' | null;
  pre_approval_status: boolean;
  pre_approval_bank: string | null;
  email_verified: boolean;
  phone_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Achievement {
  id: string;
  user_id: string;
  badge_type: 'first_listing' | 'verified_developer' | '100_leads' | 'cover_advertiser' | 'top_developer_mumbai' | 'royal_collection' | 'nri_specialist';
  awarded_at: string;
  listing_id: string | null;
  notes: string | null;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  status: 'pending' | 'active' | 'rewarded';
  tokens_earned: number;
  created_at: string;
  rewarded_at: string | null;
}

export interface LiveEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  duration_minutes: number;
  developer_slots_json: LiveEventSlot[];
  buyer_registrations_json: LiveEventRegistration[];
  recording_url: string | null;
  status: 'upcoming' | 'live' | 'completed' | 'cancelled';
  tokens_per_slot: number;
  max_developer_slots: number;
  created_at: string;
  updated_at: string;
}

export interface LiveEventSlot {
  developer_id: string;
  developer_name: string;
  slot_order: number;
  booked: boolean;
}

export interface LiveEventRegistration {
  buyer_id: string;
  buyer_name: string;
  registered_at: string;
}

export interface LegalPartner {
  id: string;
  name: string;
  firm_name: string | null;
  city: string;
  specialisation: string[];
  contact_email: string | null;
  contact_phone: string | null;
  profile_url: string | null;
  verified: boolean;
  rating: number;
  review_count: number;
  active: boolean;
  created_at: string;
}

export interface DesignPartner {
  id: string;
  name: string;
  firm_name: string | null;
  city: string;
  style_specialty: string[];
  portfolio_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  verified: boolean;
  rating: number;
  review_count: number;
  active: boolean;
  created_at: string;
}

export interface MarketReport {
  id: string;
  corridor: string;
  report_type: 'weekly' | 'monthly' | 'special';
  report_date: string;
  title: string;
  data_json: Record<string, unknown>;
  pdf_url: string | null;
  access_tier: 'all' | 'power' | 'premium' | 'enterprise';
  distributed_at: string | null;
  created_at: string;
}

export interface Buyer {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  phone: string;
  city_preference: string | null;
  budget_label: string | null;
  budget_min: number | null;
  budget_max: number | null;
  property_type: 'residential' | 'commercial' | 'both' | null;
  deal_type: 'buy' | 'rent' | 'invest' | 'both' | null;
  timeline: 'immediate' | '3_months' | '6_months' | '1_year' | 'flexible' | null;
  intent_score: number;
  nora_conversation_id: string | null;
  source: 'widget' | 'registration' | 'referral';
  created_at: string;
  updated_at: string;
}

export interface ShowApartmentBooking {
  id: string;
  listing_id: string;
  developer_id: string;
  buyer_name: string;
  buyer_phone: string;
  buyer_email: string | null;
  preferred_date: string;
  preferred_time: string | null;
  message: string | null;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  tokens_deducted: number;
  created_at: string;
  updated_at: string;
  listing?: Listing;
}

// Dossier 5 types

export interface Locality {
  id: string;
  city_id: string;
  name: string;
  state: string | null;
  is_active: boolean;
  is_verified: boolean;
  submitted_by: string | null;
  verified_by: string | null;
  rejection_reason: string | null;
  created_at: string;
  city?: City;
}

export interface HallOfFame {
  id: string;
  name: string;
  job_title: string;
  position: string | null;
  pod_name: string | null;
  profile_picture_url: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface NakshaReport {
  id: string;
  locality_id: string | null;
  report_data: Record<string, unknown> | null;
  generated_at: string;
  purchased_by: string;
  payment_method: 'tokens' | 'upi' | 'razorpay';
  tokens_charged: number;
  amount_charged: number;
  payment_confirmed: boolean;
  created_at: string;
}

export interface ConversationMemory {
  id: string;
  user_id: string;
  daughter_name: 'nora' | 'nita' | 'neena';
  summary_text: string | null;
  last_updated: string;
  message_count: number;
}

export interface CrmLead {
  id: string;
  developer_id: string;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  source: 'nora' | 'direct_enquiry' | 'whatsapp_click' | 'call_click' | 'banner_click' | 'walk_in' | 'manual';
  listing_id: string | null;
  nora_conversation_summary: string | null;
  intent_score: number;
  lead_quality: 'hot' | 'warm' | 'cold' | null;
  status: 'new' | 'contacted' | 'site_visit_scheduled' | 'site_visit_done' | 'negotiating' | 'converted' | 'lost';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmInteraction {
  id: string;
  lead_id: string;
  interaction_type: string | null;
  interaction_notes: string | null;
  created_by: string;
  created_at: string;
}

export interface CrmFollowUp {
  id: string;
  lead_id: string;
  reminder_date: string | null;
  reminder_note: string | null;
  is_completed: boolean;
  created_by: string;
  created_at: string;
}

export interface GreetingsVoucher {
  id: string;
  developer_id: string;
  voucher_type: 'birthday' | 'diwali' | 'ganpati' | 'independence_day' | 'eid' | 'christmas' | 'new_year' | 'developer_anniversary' | 'new_project_launch' | 'custom';
  custom_message: string | null;
  discount_value: string | null;
  recipient_count: number;
  tokens_charged: number;
  delivery_region: 'india' | 'dubai';
  delivery_report: Record<string, unknown> | null;
  status: string;
  created_at: string;
}

export interface Registration {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: 'developer' | 'real_estate_agency' | 'individual_agent' | 'buyer' | null;
  city: string | null;
  agree_updates: boolean;
  status: string;
  approved_at: string | null;
  created_at: string;
}

export interface SiteFlag {
  id: string;
  flag_name: string;
  flag_value: boolean;
  updated_at: string;
}

export interface NeighbourhoodData {
  id: string;
  locality_id: string;
  overview: Record<string, unknown> | null;
  connectivity: Record<string, unknown> | null;
  social_infrastructure: Record<string, unknown> | null;
  lifestyle: Record<string, unknown> | null;
  places_of_worship: Record<string, unknown> | null;
  infrastructure_rating: string | null;
  connectivity_score: number | null;
  naksha_verdict: string | null;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  position: number;
  name: string;
  role: string | null;
  image_url: string | null;
  job_title: string | null;
  pod_name: string | null;
  display_order: number;
  active: boolean;
  photo_url: string | null;
  created_at: string;
}

export interface DaughterPicture {
  id: string;
  daughter_name: string;
  display_name: string;
  pod_title: string;
  profile_picture_url: string | null;
  full_body_picture_url?: string | null;
  display_order: number;
  is_active: boolean;
  updated_at: string;
}

export interface Lead {
  id: string;
  listing_id: string | null;
  name: string;
  phone: string;
  email: string | null;
  message: string | null;
  created_at: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  source: string;
  notes: string | null;
  owner_id: string | null;
  assigned_to: string | null;
  intent_score: number;
  comfort_hours: string | null;
  preferred_name: string | null;
  listing?: Listing;
}

export type DealBonusType = 'flat_tokens' | 'percentage';

export interface Deal {
  id: string;
  name: string;
  trigger_amount: number;
  bonus_type: DealBonusType;
  bonus_value: number;
  bonus_validity_days: number;
  non_token_perk: string | null;
  market_track: 'india' | 'dubai' | 'both';
  active: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface PackageItem {
  item_type: 'premium_listings' | 'brochure_languages' | 'banners' | 'videos' | 'crm_days' | 'token_bonus' | 'custom_line';
  quantity: number;
}

export interface Package {
  id: string;
  name: string;
  audience: 'developer' | 'agent' | 'both';
  price_tokens: number;
  billing_type: 'one_time' | 'recurring_manual';
  contents: PackageItem[];
  market_track: 'india' | 'dubai' | 'both';
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AmbassadorAssignment {
  id: string;
  daughter_name: string;
  developer_id: string;
  market_scope: string;
  start_date: string;
  end_date: string | null;
  cooldown_until: string | null;
  created_at: string;
}
