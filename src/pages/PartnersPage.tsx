import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Layout } from '../components/Layout';
import { MapPin, Star, Mail, Phone, Globe, CheckCircle, MessageCircle, ChevronDown, X } from 'lucide-react';

interface LegalPartner {
  id: string;
  name: string;
  firm_name: string;
  city: string;
  specialisation: string[];
  contact_email: string;
  contact_phone: string;
  profile_url?: string;
  verified: boolean;
  rating: number;
  review_count: number;
  active: boolean;
  created_at: string;
}

interface DesignPartner {
  id: string;
  name: string;
  firm_name: string;
  city: string;
  style_specialty: string[];
  portfolio_url?: string;
  contact_email: string;
  contact_phone: string;
  verified: boolean;
  rating: number;
  review_count: number;
  active: boolean;
  created_at: string;
}

export function PartnersPage() {
  const [activeTab, setActiveTab] = useState<'legal' | 'design'>('legal');
  const [legalPartners, setLegalPartners] = useState<LegalPartner[]>([]);
  const [designPartners, setDesignPartners] = useState<DesignPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [cities, setCities] = useState<string[]>([]);
  const [whatsappEmail, setWhatsappEmail] = useState('');
  const [whatsappSubmitting, setWhatsappSubmitting] = useState(false);

  useEffect(() => {
    fetchPartners();
  }, []);

  async function fetchPartners() {
    setLoading(true);
    try {
      const [legalRes, designRes] = await Promise.all([
        supabase.from('legal_partners').select('*').eq('active', true).order('rating', { ascending: false }),
        supabase.from('design_partners').select('*').eq('active', true).order('rating', { ascending: false }),
      ]);

      const legal = (legalRes.data || []) as LegalPartner[];
      const design = (designRes.data || []) as DesignPartner[];

      setLegalPartners(legal);
      setDesignPartners(design);

      const allCities = Array.from(
        new Set([...legal.map((p) => p.city), ...design.map((p) => p.city)].filter(Boolean))
      ).sort();
      setCities(allCities);
    } catch (error) {
      console.error('Error fetching partners:', error);
    } finally {
      setLoading(false);
    }
  }

  const hasPartners = legalPartners.length > 0 || designPartners.length > 0;

  return (
    <Layout>
      <div className="min-h-screen bg-cream">
        {/* Hero Section */}
        <div className="bg-navy text-cream py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-5xl font-serif font-bold mb-6">Trusted Professional Partners</h1>
            <p className="text-cream/70 text-lg max-w-3xl mx-auto leading-relaxed">
              Our curated network of verified legal and interior design professionals, carefully selected to provide expert guidance and exceptional service to Property Herald's community.
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {!hasPartners && !loading ? (
            <ComingSoonState setWhatsappEmail={setWhatsappEmail} setWhatsappSubmitting={setWhatsappSubmitting} whatsappEmail={whatsappEmail} whatsappSubmitting={whatsappSubmitting} />
          ) : (
            <>
              {/* Tabs */}
              <div className="flex gap-2 mb-8 border-b border-gold/20">
                <button
                  onClick={() => setActiveTab('legal')}
                  className={`px-6 py-3 font-medium text-lg transition-colors border-b-2 ${
                    activeTab === 'legal'
                      ? 'border-gold text-navy'
                      : 'border-transparent text-cream/60 hover:text-cream'
                  }`}
                >
                  Legal Partners
                </button>
                <button
                  onClick={() => setActiveTab('design')}
                  className={`px-6 py-3 font-medium text-lg transition-colors border-b-2 ${
                    activeTab === 'design'
                      ? 'border-gold text-navy'
                      : 'border-transparent text-cream/60 hover:text-cream'
                  }`}
                >
                  Design Partners
                </button>
              </div>

              {/* City Filter */}
              {cities.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-3">
                    <MapPin className="w-5 h-5 text-gold" />
                    <span className="text-sm font-medium text-navy">Filter by City</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedCity('')}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        selectedCity === ''
                          ? 'bg-navy text-cream'
                          : 'bg-cream border border-gold/25 text-navy hover:border-gold/50'
                      }`}
                    >
                      All Cities
                    </button>
                    {cities.map((city) => (
                      <button
                        key={city}
                        onClick={() => setSelectedCity(city)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          selectedCity === city
                            ? 'bg-navy text-cream'
                            : 'bg-cream border border-gold/25 text-navy hover:border-gold/50'
                        }`}
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Partners Grid */}
              {loading ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="bg-white rounded-xl p-6 animate-pulse border border-gold/10">
                      <div className="h-6 bg-cream rounded mb-4 w-3/4" />
                      <div className="h-4 bg-cream rounded mb-2 w-1/2" />
                      <div className="h-4 bg-cream rounded mb-4 w-2/3" />
                      <div className="h-4 bg-cream rounded mb-4" />
                      <div className="h-10 bg-cream rounded" />
                    </div>
                  ))}
                </div>
              ) : activeTab === 'legal' ? (
                legalPartners.length === 0 ? (
                  <EmptyState type="legal" />
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {legalPartners
                      .filter((p) => !selectedCity || p.city === selectedCity)
                      .map((partner) => (
                        <LegalPartnerCard key={partner.id} partner={partner} />
                      ))}
                  </div>
                )
              ) : designPartners.length === 0 ? (
                <EmptyState type="design" />
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {designPartners
                    .filter((p) => !selectedCity || p.city === selectedCity)
                    .map((partner) => (
                      <DesignPartnerCard key={partner.id} partner={partner} />
                    ))}
                </div>
              )}
            </>
          )}

          {/* Become a Partner Section */}
          <div className="mt-20 bg-gradient-to-r from-navy via-navy-700 to-navy text-cream rounded-xl p-8 md:p-12 border border-gold/20">
            <div className="max-w-2xl">
              <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">Ready to Become a Partner?</h2>
              <p className="text-cream/70 text-lg mb-8">
                Join Property Herald's trusted network of professionals. We're actively onboarding legal experts and interior design specialists who share our commitment to excellence.
              </p>
              <a
                href="https://wa.me/919819470970?text=Hi%20I%20am%20interested%20in%20becoming%20a%20partner%20with%20Property%20Herald"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-8 py-3 bg-gold text-navy font-bold rounded-lg hover:bg-gold-400 transition-all shadow-lg"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                WhatsApp Us
              </a>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function LegalPartnerCard({ partner }: { partner: LegalPartner }) {
  return (
    <div className="bg-white rounded-xl p-6 border border-gold/15 hover:shadow-lg transition-all">
      <div className="mb-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="text-lg font-serif font-semibold text-navy">{partner.name}</h3>
            <p className="text-sm text-warm-gray">{partner.firm_name}</p>
          </div>
          {partner.verified && <CheckCircle className="w-5 h-5 text-gold flex-shrink-0" />}
        </div>

        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-gold/60" />
          <span className="inline-block px-3 py-1 bg-gold/10 text-navy text-xs font-medium rounded-full border border-gold/20">
            {partner.city}
          </span>
        </div>

        {partner.rating > 0 && (
          <div className="flex items-center gap-1 mb-4">
            <Star className="w-4 h-4 text-gold fill-gold" />
            <span className="font-medium text-navy text-sm">
              {partner.rating.toFixed(1)}
            </span>
            <span className="text-xs text-warm-gray">
              ({partner.review_count} {partner.review_count === 1 ? 'review' : 'reviews'})
            </span>
          </div>
        )}
      </div>

      {partner.specialisation.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {partner.specialisation.map((spec) => (
              <span key={spec} className="inline-block px-2.5 py-1 bg-navy/8 text-navy text-xs font-medium rounded-full border border-navy/10">
                {spec}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <a
          href={`mailto:${partner.contact_email}`}
          className="flex-1 inline-flex items-center justify-center px-3 py-2.5 bg-navy text-cream text-sm font-medium rounded-lg hover:bg-navy-700 transition-colors"
        >
          <Mail className="w-4 h-4 mr-1" />
          Email
        </a>
        <a
          href={`tel:${partner.contact_phone}`}
          className="flex-1 inline-flex items-center justify-center px-3 py-2.5 bg-gold/10 text-navy text-sm font-medium rounded-lg hover:bg-gold/20 transition-colors border border-gold/20"
        >
          <Phone className="w-4 h-4 mr-1" />
          Call
        </a>
      </div>

      {partner.profile_url && (
        <a
          href={partner.profile_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 w-full inline-flex items-center justify-center px-3 py-2.5 bg-cream text-navy text-sm font-medium rounded-lg hover:bg-gold/5 transition-colors border border-gold/15"
        >
          <Globe className="w-4 h-4 mr-1" />
          View Profile
        </a>
      )}
    </div>
  );
}

function DesignPartnerCard({ partner }: { partner: DesignPartner }) {
  return (
    <div className="bg-white rounded-xl p-6 border border-gold/15 hover:shadow-lg transition-all">
      <div className="mb-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="text-lg font-serif font-semibold text-navy">{partner.name}</h3>
            <p className="text-sm text-warm-gray">{partner.firm_name}</p>
          </div>
          {partner.verified && <CheckCircle className="w-5 h-5 text-gold flex-shrink-0" />}
        </div>

        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-gold/60" />
          <span className="inline-block px-3 py-1 bg-gold/10 text-navy text-xs font-medium rounded-full border border-gold/20">
            {partner.city}
          </span>
        </div>

        {partner.rating > 0 && (
          <div className="flex items-center gap-1 mb-4">
            <Star className="w-4 h-4 text-gold fill-gold" />
            <span className="font-medium text-navy text-sm">
              {partner.rating.toFixed(1)}
            </span>
            <span className="text-xs text-warm-gray">
              ({partner.review_count} {partner.review_count === 1 ? 'review' : 'reviews'})
            </span>
          </div>
        )}
      </div>

      {partner.style_specialty.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {partner.style_specialty.map((style) => (
              <span key={style} className="inline-block px-2.5 py-1 bg-navy/8 text-navy text-xs font-medium rounded-full border border-navy/10">
                {style}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {partner.portfolio_url && (
          <a
            href={partner.portfolio_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center px-3 py-2.5 bg-gold/10 text-navy text-sm font-medium rounded-lg hover:bg-gold/20 transition-colors border border-gold/20"
          >
            <Globe className="w-4 h-4 mr-1" />
            Portfolio
          </a>
        )}
        <a
          href={`mailto:${partner.contact_email}`}
          className="flex-1 inline-flex items-center justify-center px-3 py-2.5 bg-navy text-cream text-sm font-medium rounded-lg hover:bg-navy-700 transition-colors"
        >
          <Mail className="w-4 h-4 mr-1" />
          Email
        </a>
        <a
          href={`tel:${partner.contact_phone}`}
          className="flex-1 inline-flex items-center justify-center px-3 py-2.5 bg-gold/10 text-navy text-sm font-medium rounded-lg hover:bg-gold/20 transition-colors border border-gold/20"
        >
          <Phone className="w-4 h-4 mr-1" />
          Call
        </a>
      </div>
    </div>
  );
}

function EmptyState({ type }: { type: 'legal' | 'design' }) {
  return (
    <div className="text-center py-16 bg-white rounded-xl border border-gold/15">
      <div className="w-20 h-20 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-gold/20">
        <span className="text-3xl">📋</span>
      </div>
      <h3 className="text-2xl font-serif font-semibold text-navy mb-2">
        No {type === 'legal' ? 'Legal' : 'Design'} Partners Yet
      </h3>
      <p className="text-warm-gray mb-2">
        We're currently onboarding vetted {type === 'legal' ? 'legal' : 'design'} professionals.
      </p>
      <p className="text-cream/50 text-sm">Check back soon or reach out to become a partner!</p>
    </div>
  );
}

function ComingSoonState({
  setWhatsappEmail,
  setWhatsappSubmitting,
  whatsappEmail,
  whatsappSubmitting,
}: {
  setWhatsappEmail: (email: string) => void;
  setWhatsappSubmitting: (submitting: boolean) => void;
  whatsappEmail: string;
  whatsappSubmitting: boolean;
}) {
  async function handleWhatsappSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!whatsappEmail.trim()) return;

    setWhatsappSubmitting(true);
    try {
      await supabase.from('partner_applications').insert({
        email: whatsappEmail.trim(),
        status: 'pending',
      });
    } catch (error) {
      console.error('Error submitting application:', error);
    }
    setWhatsappSubmitting(false);
    setWhatsappEmail('');

    window.open(
      `https://wa.me/919819470970?text=Hi%20I%20am%20interested%20in%20becoming%20a%20partner%20with%20Property%20Herald.%20My%20email%20is%20${encodeURIComponent(whatsappEmail)}`,
      '_blank'
    );
  }

  return (
    <div className="text-center py-20">
      <div className="mb-8">
        <h2 className="text-4xl font-serif font-bold text-navy mb-4">Applications Open</h2>
        <p className="text-warm-gray text-lg max-w-2xl mx-auto">
          We're building our network of trusted legal and interior design partners. Early applicants get priority consideration.
        </p>
      </div>

      {/* Placeholder Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white rounded-xl p-6 border border-gold/15 animate-pulse">
            <div className="h-6 bg-cream rounded mb-4 w-3/4" />
            <div className="h-4 bg-cream rounded mb-2 w-1/2" />
            <div className="h-4 bg-cream rounded mb-4 w-2/3" />
            <div className="space-y-2">
              <div className="h-3 bg-cream rounded w-full" />
              <div className="h-3 bg-cream rounded w-5/6" />
            </div>
          </div>
        ))}
      </div>

      {/* Application Form */}
      <div className="max-w-md mx-auto bg-navy text-cream rounded-xl p-8 border border-gold/20">
        <h3 className="text-2xl font-serif font-bold mb-6">Interest in Joining?</h3>

        <form onSubmit={handleWhatsappSubmit} className="space-y-4 mb-6">
          <div>
            <input
              type="email"
              value={whatsappEmail}
              onChange={(e) => setWhatsappEmail(e.target.value)}
              placeholder="your@email.com"
              className="input-field text-navy"
              required
            />
          </div>

          <button
            type="submit"
            disabled={whatsappSubmitting || !whatsappEmail.trim()}
            className="w-full px-6 py-3 bg-gold text-navy font-bold rounded-lg hover:bg-gold-400 transition-all disabled:opacity-60 inline-flex items-center justify-center"
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            {whatsappSubmitting ? 'Sending...' : 'Chat on WhatsApp'}
          </button>
        </form>

        <p className="text-cream/60 text-sm">
          We'll connect with you via WhatsApp to discuss partnership opportunities.
        </p>
      </div>
    </div>
  );
}
