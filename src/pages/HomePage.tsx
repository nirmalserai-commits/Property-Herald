import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { City, Magazine, DaughterPicture } from '../types/database';
import {
  Building2, Users, BookOpen, ArrowRight, MapPin,
  TrendingUp, Sparkles, Check, Bot, ChevronDown,
  Globe, Zap, Award, MessageCircle, Sparkle, Handshake, User,
  Newspaper, Video, Landmark, GraduationCap, X, Loader2,
} from 'lucide-react';

interface LiveStats {
  cities: number | null;
  members: number | null;
  magazineReaders: string | null;
  inquiries: number | null;
}

interface CorridorCounts {
  maharashtra: number;
  gujarat: number;
  ncr: number;
  karnataka: number;
}

// ─── Hero Lead Form Modal ───

interface LeadFormState {
  name: string;
  email: string;
  phone: string;
  company: string;
  message: string;
}

function HeroLeadForm({
  open, onClose, formType,
}: {
  open: boolean;
  onClose: () => void;
  formType: 'list_business' | 'project_marketing';
}) {
  const [form, setForm] = useState<LeadFormState>({ name: '', email: '', phone: '', company: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const titles: Record<typeof formType, { title: string; subtitle: string }> = {
    list_business: {
      title: 'List Your Business',
      subtitle: "Tell us about your business and we'll get back to you within 48 hours.",
    },
    project_marketing: {
      title: 'Comprehensive Project Marketing',
      subtitle: 'Share your project details and our team will reach out to discuss a marketing plan.',
    },
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    setSubmitting(true);
    setError('');
    const { error: insertError } = await supabase.from('homepage_leads').insert({
      form_type: formType,
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone?.trim() || null,
      company: form.company?.trim() || null,
      message: form.message?.trim() || null,
    });
    setSubmitting(false);
    if (insertError) {
      setError('Something went wrong. Please try again or email us directly.');
      return;
    }
    setSubmitted(true);
  }

  function handleClose() {
    setForm({ name: '', email: '', phone: '', company: '', message: '' });
    setSubmitted(false);
    setError('');
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={handleClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-serif font-bold text-navy">{titles[formType].title}</h2>
            <p className="text-sm text-gray-500 mt-1">{titles[formType].subtitle}</p>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center">
            <div className="w-14 h-14 bg-green-50 border border-green-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7 text-green-600" />
            </div>
            <h3 className="text-lg font-serif font-bold text-navy mb-2">Thank you — we've received your request.</h3>
            <p className="text-sm text-gray-500 mb-6">Our team will review your details and follow up shortly. No commitment is required at this stage.</p>
            <button onClick={handleClose} className="w-full px-5 py-2.5 bg-navy text-gold rounded-xl font-semibold border border-gold/20 hover:bg-navy/90 transition-colors">
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Name *</label>
              <input
                type="text" required value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm mt-1 focus:ring-2 focus:ring-gold/30 focus:border-gold/40 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Email *</label>
              <input
                type="email" required value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm mt-1 focus:ring-2 focus:ring-gold/30 focus:border-gold/40 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Phone</label>
              <input
                type="tel" value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm mt-1 focus:ring-2 focus:ring-gold/30 focus:border-gold/40 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Company / Project</label>
              <input
                type="text" value={form.company}
                onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm mt-1 focus:ring-2 focus:ring-gold/30 focus:border-gold/40 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Message</label>
              <textarea
                rows={3} value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm mt-1 focus:ring-2 focus:ring-gold/30 focus:border-gold/40 outline-none resize-none"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit" disabled={submitting || !form.name.trim() || !form.email.trim()}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-navy text-gold rounded-xl font-semibold border border-gold/20 hover:bg-navy/90 transition-colors disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {submitting ? 'Submitting…' : 'Submit Request'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export function HomePage() {
  const [cities, setCities] = useState<City[]>([]);
  const [recentMagazines, setRecentMagazines] = useState<Magazine[]>([]);
  const [corridorCounts, setCorridorCounts] = useState<CorridorCounts>({ maharashtra: 0, gujarat: 0, ncr: 0, karnataka: 0 });
  const [daughters, setDaughters] = useState<DaughterPicture[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Hero form state
  const [leadForm, setLeadForm] = useState<{ open: boolean; type: 'list_business' | 'project_marketing' }>({ open: false, type: 'list_business' });

  useEffect(() => {
    async function safe<T>(p: Promise<{ data: T | null; error: unknown; count?: number | null }>): Promise<{ data: T | null; count: number | null }> {
      try {
        const r = await p;
        return { data: r.data, count: r.count ?? null };
      } catch {
        return { data: null, count: null };
      }
    }

    async function fetchData() {
      try {
        const [
          citiesRes,
          magazinesRes,
          corridorCitiesRes,
          listingCityRes,
          daughterRes,
        ] = await Promise.all([
          safe<City[]>(supabase.from('cities').select('*').order('name')),
          safe<Magazine[]>(supabase.from('magazines').select('*').eq('is_published', true).order('issue_number', { ascending: false }).limit(3)),
          safe<{ id: string; state: string }[]>(supabase.from('cities').select('id, state')),
          safe<{ city_id: string }[]>(supabase.from('listings').select('city_id').eq('is_active', true)),
          safe<DaughterPicture[]>(supabase.from('daughter_pictures').select('id,daughter_name,profile_picture_url,display_order,is_active').eq('is_active', true).order('display_order')),
        ]);

        if (citiesRes.data) setCities(citiesRes.data);
        if (magazinesRes.data) setRecentMagazines(magazinesRes.data);
        if (daughterRes.data) setDaughters(daughterRes.data);

        if (corridorCitiesRes.data && listingCityRes.data) {
          const cityStateMap: Record<string, string> = {};
          for (const c of corridorCitiesRes.data) {
            cityStateMap[c.id] = c.state;
          }
          const ld = listingCityRes.data;
          setCorridorCounts({
            maharashtra: ld.filter(l => cityStateMap[l.city_id] === 'Maharashtra').length,
            gujarat:     ld.filter(l => cityStateMap[l.city_id] === 'Gujarat').length,
            ncr:         ld.filter(l => ['Delhi', 'Haryana', 'Uttar Pradesh'].includes(cityStateMap[l.city_id])).length,
            karnataka:   ld.filter(l => cityStateMap[l.city_id] === 'Karnataka').length,
          });
        }

        setLoading(false);
      } catch {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const scrollToNext = () => scrollRef.current?.scrollIntoView({ behavior: 'smooth' });

  const corridors = [
    { name: 'Mumbai–Pune Corridor', states: 'Maharashtra', desc: "India's most active real estate belt — residential, commercial, and industrial", count: corridorCounts.maharashtra },
    { name: 'Gujarat Growth Zone', states: 'Gujarat', desc: 'GIFT City, Ahmedabad, Surat — emerging commercial and residential demand', count: corridorCounts.gujarat },
    { name: 'Delhi NCR Megaplex', states: 'Delhi, Haryana, UP', desc: "Gurgaon, Noida, Faridabad — capital region's premium real estate market", count: corridorCounts.ncr },
    { name: 'Bengaluru Tech Triangle', states: 'Karnataka', desc: "India's Silicon Valley — premium residential and IT park developments", count: corridorCounts.karnataka },
  ];

  const heroTiles = [
    { title: 'Press & Media', icon: Newspaper, link: '/magazine', comingSoon: false },
    { title: 'Our Videos', icon: Video, link: '/videos', comingSoon: false },
    { title: 'Home Loans', icon: Landmark, link: '/home-loans', comingSoon: false },
    { title: 'Real Estate Courses', icon: GraduationCap, link: '#', comingSoon: true },
  ];

  return (
    <div className="bg-cream">

      {/* ═══ HERO ═══ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center geo-pattern overflow-hidden bg-cream">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[600px] rounded-full bg-gold/5 blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center px-4 w-full max-w-5xl mx-auto py-16">

          {/* 1. Small text line above logo */}
          <p className="text-warm-gray text-sm md:text-base font-display font-medium uppercase tracking-widest mb-6">
            India's first curated, AI-powered Real Estate Portal
          </p>

          {/* 2. Logo — no container box */}
          <div className="relative mb-8 flex items-center justify-center">
            <img
              src="/logo.png.png"
              alt="Property Herald"
              className="relative h-[35vh] md:h-[42vh] w-auto object-contain drop-shadow-2xl"
              style={{ maxWidth: '70vw' }}
              onError={(e) => {
                const t = e.target as HTMLImageElement;
                t.style.display = 'none';
                const fb = t.nextElementSibling as HTMLElement;
                if (fb) fb.style.display = 'flex';
              }}
            />
            <div className="hidden h-[35vh] md:h-[42vh] w-auto aspect-square items-center justify-center">
              <div className="text-center">
                <div className="text-7xl md:text-9xl font-serif font-black text-gold leading-none">PH</div>
                <div className="mt-2 font-display font-bold tracking-widest text-cream/80 text-lg uppercase">Property Herald</div>
              </div>
            </div>
          </div>

          {/* 3. Two blocks flanking the logo — stacked on mobile, side by side on desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-3xl mb-8">
            <Link
              to="/directory"
              className="group relative overflow-hidden rounded-2xl border-2 border-gold/30 bg-gradient-to-br from-navy to-navy-800 hover:border-gold/60 hover:shadow-2xl transition-all duration-300 p-6 flex items-center justify-center text-center"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 rounded-full -translate-y-1/3 translate-x-1/3 group-hover:bg-gold/10 transition-colors" />
              <div className="relative flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <MapPin className="w-6 h-6 text-gold" />
                </div>
                <div className="text-left">
                  <h3 className="text-lg md:text-xl font-serif font-bold text-cream">Search India Property</h3>
                  <p className="text-cream/50 text-xs mt-0.5">Browse listings across India</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gold/40 group-hover:text-gold group-hover:translate-x-1 transition-all ml-auto" />
              </div>
            </Link>
            <Link
              to="/dubai"
              className="group relative overflow-hidden rounded-2xl border-2 border-gold/30 bg-gradient-to-br from-navy to-navy-800 hover:border-gold/60 hover:shadow-2xl transition-all duration-300 p-6 flex items-center justify-center text-center"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 rounded-full -translate-y-1/3 translate-x-1/3 group-hover:bg-gold/10 transition-colors" />
              <div className="relative flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <Globe className="w-6 h-6 text-gold" />
                </div>
                <div className="text-left">
                  <h3 className="text-lg md:text-xl font-serif font-bold text-cream">Search Dubai Property</h3>
                  <p className="text-cream/50 text-xs mt-0.5">Explore all 7 Emirates</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gold/40 group-hover:text-gold group-hover:translate-x-1 transition-all ml-auto" />
              </div>
            </Link>
          </div>

          {/* 4. Tagline — single line */}
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-serif font-bold text-navy leading-tight mb-8 text-balance">
            Discover. Connect. <span className="text-gold">Grow.</span>
          </h1>

          {/* 5. Four clickable tiles — one row on desktop, 2x2 on mobile */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-4xl mb-8">
            {heroTiles.map(({ title, icon: Icon, link, comingSoon }) => (
              <Link
                key={title}
                to={link}
                className="group relative bg-white rounded-2xl border border-gold/20 hover:border-gold/50 hover:shadow-xl transition-all p-6 flex flex-col items-center text-center"
              >
                {comingSoon && (
                  <span className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-gold text-navy text-[10px] font-bold rounded-full font-display uppercase tracking-wider">
                    Coming Soon
                  </span>
                )}
                <div className="w-12 h-12 rounded-xl bg-navy/8 border border-gold/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Icon className="w-6 h-6 text-gold" />
                </div>
                <h3 className="font-serif font-bold text-navy text-sm md:text-base leading-tight">{title}</h3>
              </Link>
            ))}
          </div>

          {/* 6. Text line */}
          <p className="text-navy text-lg md:text-xl font-serif font-semibold tracking-wide mb-8">
            India. Intelligence. Integrity.
          </p>

          {/* 7. Two pill buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="px-8 py-3.5 rounded-full bg-navy text-gold font-display font-bold uppercase tracking-wider shadow-lg hover:shadow-xl hover:bg-navy/90 transition-all border border-gold/20"
              style={{ letterSpacing: '0.06em' }}
            >
              List your business
            </Link>
            <button
              onClick={() => setLeadForm({ open: true, type: 'project_marketing' })}
              className="px-8 py-3.5 rounded-full bg-gold text-navy font-display font-bold uppercase tracking-wider shadow-lg hover:shadow-xl hover:bg-gold/90 transition-all border border-navy/10"
              style={{ letterSpacing: '0.06em' }}
            >
              Comprehensive Project Marketing
            </button>
          </div>

        </div>

        {/* Scroll arrow */}
        <button
          onClick={scrollToNext}
          className="scroll-indicator absolute bottom-8 left-1/2 flex flex-col items-center text-gold/70 hover:text-gold transition-colors"
          aria-label="Scroll down"
        >
          <span className="text-xs font-display font-semibold uppercase tracking-widest mb-2">Explore</span>
          <ChevronDown className="w-6 h-6" />
        </button>
      </section>

      {/* ═══ FOUNDING PARTNER PROGRAMME ═══ */}
      <section className="relative overflow-hidden bg-gradient-to-r from-gold via-gold-400 to-gold py-14">
        <div className="absolute inset-0 geo-pattern opacity-20" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-navy/90 border border-navy/40 text-gold text-sm font-display font-semibold uppercase tracking-wider mb-5">
            <Sparkles className="w-4 h-4 mr-2" />Founding Partner Programme
          </div>
          <h2 className="text-3xl md:text-5xl font-serif font-bold text-navy mb-4">
            Join as a Founding Partner
          </h2>
          <p className="text-navy/80 text-lg md:text-xl max-w-2xl mx-auto mb-8 font-sans">
            Become part of India's first AI-powered real estate platform
          </p>
          <Link to="/founding-partner" className="inline-flex items-center px-8 py-3.5 rounded-xl bg-navy text-gold font-display font-bold uppercase tracking-wider shadow-lg hover:shadow-xl hover:bg-navy/90 transition-all" style={{ letterSpacing: '0.06em' }}>
            <Handshake className="w-5 h-5 mr-2" />Join Now
          </Link>
        </div>
      </section>

      {/* ═══ MEET OUR AI TEAM ═══ */}
      <MeetOurAITeam daughters={daughters} loading={loading} />

      {/* ═══ PLATFORM STATS ═══ */}
      <PlatformStats />

      {/* ═══ SCROLL 2: ECOSYSTEM ═══ */}
      <section ref={scrollRef} className="py-24 bg-navy">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-gold/10 border border-gold/30 text-gold text-sm font-display font-semibold uppercase tracking-wider mb-6">
              The Ecosystem
            </div>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-cream mb-4">The Property Herald Ecosystem</h2>
            <div className="w-16 h-0.5 bg-gold mx-auto mb-4" />
            <p className="text-cream/60 max-w-2xl mx-auto text-lg leading-relaxed">
              Three powerful pillars designed to transform how India's real estate professionals connect, market, and grow.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                emoji: '🏛️',
                title: 'Verified Directory',
                desc: "India's most trusted curated property listings — every business manually reviewed with gold-seal verification.",
                features: ['Gold verification seal', 'WhatsApp lead routing', 'City & segment filters', 'Live listing analytics'],
                cta: 'Browse Directory', link: '/directory',
              },
              {
                emoji: '📰',
                title: 'Weekly Magazine',
                desc: 'Real estate intelligence across India\'s top corridors — distributed to 1 lakh+ curated buyers every week.',
                features: ['1,00,000+ weekly readers', 'WhatsApp-embedded ads', 'Full, half & quarter pages', '6-issue rolling archive'],
                cta: 'View Magazine', link: '/magazine',
              },
              {
                emoji: '🤖',
                title: 'Nora AI Ambassador',
                desc: 'Your personal AI real estate guide — available 24/7, qualifying leads and routing hot prospects to your WhatsApp.',
                features: ['Claude AI powered', 'Intent scoring 0–100', 'Hindi & English support', 'Launching Q4 2026'],
                cta: 'Coming Soon', link: '/register',
              },
            ].map(({ emoji, title, desc, features, cta, link }) => (
              <div key={title} className="bg-navy-800 rounded-2xl p-8 border border-gold/15 hover:border-gold/40 transition-all group">
                <div className="text-4xl mb-6">{emoji}</div>
                <h3 className="text-xl font-serif font-bold text-cream mb-3">{title}</h3>
                <p className="text-cream/60 text-sm leading-relaxed mb-6">{desc}</p>
                <ul className="space-y-2 mb-8">
                  {features.map((f) => (
                    <li key={f} className="flex items-center text-sm text-cream/70">
                      <Check className="w-4 h-4 text-gold mr-2 flex-shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <Link to={link} className="inline-flex items-center text-gold text-sm font-display font-semibold hover:gap-3 transition-all gap-2">
                  {cta} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SCROLL 3: CORRIDORS ═══ */}
      <section className="py-24 bg-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-navy/8 border border-gold/30 text-navy text-sm font-display font-semibold uppercase tracking-wider mb-6">
              <Globe className="w-4 h-4 mr-2 text-gold" />Prime Corridors
            </div>
            <h2 className="section-heading">India's Premier Real Estate Corridors</h2>
            <div className="w-16 h-0.5 bg-gold mx-auto mb-4" />
            <p className="text-warm-gray max-w-2xl mx-auto text-lg">
              India's most sought-after real estate markets — browse professionals by corridor
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {corridors.map(({ name, states, desc, count }) => (
              <Link key={name} to="/directory"
                className="group relative overflow-hidden rounded-2xl border border-gold/20 bg-white hover:border-gold/50 hover:shadow-xl transition-all p-8">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-gold/10 transition-colors" />
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-serif font-bold text-navy mb-1">{name}</h3>
                      <p className="text-xs font-display font-semibold text-gold uppercase tracking-wider">{states}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold font-display text-navy">
                        {loading ? '...' : count > 0 ? `${count}+` : 'Expanding'}
                      </div>
                      <div className="text-xs text-warm-gray">Listings</div>
                    </div>
                  </div>
                  <p className="text-warm-gray text-sm leading-relaxed mb-4">{desc}</p>
                  <div className="flex items-center text-gold text-sm font-semibold group-hover:gap-3 transition-all gap-2">
                    View Professionals <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {!loading && cities.length > 0 && (
            <div>
              <p className="text-center text-sm font-display font-semibold text-warm-gray uppercase tracking-widest mb-6">Browse All Cities</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {cities.slice(0, 12).map((city) => (
                  <Link key={city.id} to={`/directory/${city.slug}`}
                    className="flex items-center justify-center px-4 py-3 bg-white rounded-xl border border-gold/20 hover:border-gold/60 hover:bg-gold/5 transition-all group">
                    <MapPin className="w-3 h-3 text-gold/40 group-hover:text-gold mr-2 transition-colors" />
                    <span className="font-medium text-navy text-sm">{city.name}</span>
                  </Link>
                ))}
              </div>
              <div className="text-center mt-6">
                <Link to="/directory" className="inline-flex items-center gap-2 text-gold font-semibold text-sm hover:gap-3 transition-all">
                  View All Cities <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ═══ SCROLL 4: MAGAZINE ═══ */}
      <section className="py-24 bg-navy">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-gold/10 border border-gold/30 text-gold text-sm font-display font-semibold uppercase tracking-wider mb-6">
              <BookOpen className="w-4 h-4 mr-2" />Weekly Publication
            </div>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-cream mb-4">Latest Issues</h2>
            <div className="w-16 h-0.5 bg-gold mx-auto mb-4" />
            <p className="text-cream/60 max-w-xl mx-auto">
              Property Herald Magazine — reaching 1,00,000+ property buyers every week through curated WhatsApp groups
            </p>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => <div key={i} className="bg-navy-800 rounded-2xl aspect-[3/4] animate-pulse border border-gold/10" />)}
            </div>
          ) : recentMagazines.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-8">
              {recentMagazines.map((mag, i) => (
                <Link key={mag.id} to="/magazine"
                  className={`group relative rounded-2xl overflow-hidden border transition-all hover:scale-[1.02] hover:shadow-2xl ${i === 0 ? 'border-gold/40 shadow-gold/10 shadow-lg' : 'border-gold/15'}`}>
                  <div className="aspect-[3/4] bg-gradient-to-br from-navy-700 to-navy-900 flex items-center justify-center relative">
                    {mag.cover_image_url ? (
                      <img src={mag.cover_image_url} alt={mag.title} className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="text-center p-8">
                        {i === 0 && <div className="absolute top-4 right-4 px-2 py-1 bg-gold text-navy text-xs font-bold rounded font-display uppercase tracking-wider">Latest</div>}
                        <BookOpen className="w-12 h-12 text-gold/50 mx-auto mb-4" />
                        <div className="text-gold/60 text-sm font-display font-semibold uppercase tracking-wider mb-1">Issue #{mag.issue_number}</div>
                        <div className="text-cream text-lg font-serif font-bold">{mag.title}</div>
                      </div>
                    )}
                  </div>
                  <div className="bg-navy-800 p-5 border-t border-gold/15">
                    <p className="text-xs font-display font-semibold text-gold/60 uppercase tracking-wider mb-1">Issue #{mag.issue_number}</p>
                    <h3 className="font-serif font-bold text-cream text-base leading-tight">{mag.title}</h3>
                    <div className="flex items-center mt-3 text-gold text-sm font-semibold gap-2 group-hover:gap-3 transition-all">
                      Read Now <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-navy-800 rounded-2xl border border-gold/15">
              <BookOpen className="w-12 h-12 text-gold/30 mx-auto mb-4" />
              <p className="text-cream/60 mb-4">First issue coming soon</p>
              <Link to="/register" className="btn-gold text-sm py-2 px-5">Subscribe for Updates</Link>
            </div>
          )}

          <div className="text-center mt-10">
            <Link to="/magazine" className="btn-gold"><BookOpen className="w-5 h-5 mr-2" />View All Issues</Link>
          </div>

          {/* Ad callout */}
          <div className="mt-16 rounded-2xl border border-gold/25 bg-navy-800 p-8">
            <div className="grid md:grid-cols-3 gap-6 text-center">
              {[
                { size: 'Half Page', tokens: '60 tokens', desc: 'Great for individual agents' },
                { size: 'Full Page', tokens: '100 tokens', desc: 'Ideal for agencies' },
                { size: 'Cover Page', tokens: '250 tokens', desc: 'Maximum visibility' },
              ].map(({ size, tokens, desc }) => (
                <div key={size} className="p-5 rounded-xl bg-navy/60 border border-gold/15">
                  <div className="text-lg font-serif font-bold text-cream mb-1">{size}</div>
                  <div className="text-gold font-display font-bold text-sm mb-1">{tokens}</div>
                  <div className="text-cream/50 text-xs">{desc}</div>
                </div>
              ))}
            </div>
            <div className="text-center mt-6">
              <p className="text-cream/60 text-sm mb-4">Advertise in our magazine and reach 1,00,000+ property buyers</p>
              <Link to="/register" className="btn-gold text-sm py-2.5 px-6">
                <Zap className="w-4 h-4 mr-2" />Enquire About Advertising
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SCROLL 5: TESTIMONIALS ═══ */}
      <section className="py-24 bg-navy relative overflow-hidden">
        <div className="absolute inset-0 geo-pattern opacity-30" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-gold/10 border border-gold/30 text-gold text-sm font-display font-semibold uppercase tracking-wider mb-6">
              <Award className="w-4 h-4 mr-2" />Trusted by Professionals
            </div>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-cream mb-4">What Our Members Say</h2>
            <div className="w-16 h-0.5 bg-gold mx-auto" />
          </div>

          {/* Empty state — no fake testimonials */}
          <div className="max-w-xl mx-auto text-center">
            <div className="bg-navy-800 rounded-2xl border border-gold/20 p-12">
              <div className="w-16 h-16 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center mx-auto mb-6">
                <Award className="w-8 h-8 text-gold/50" />
              </div>
              <h3 className="text-xl font-serif font-bold text-cream mb-3">Member Voices Coming Soon</h3>
              <p className="text-cream/50 text-sm leading-relaxed mb-8">
                We're collecting verified reviews from our early members. Be among the first professionals to join Property Herald and share your story.
              </p>
              <Link to="/register" className="btn-gold">
                <Sparkles className="w-5 h-5 mr-2" />Join as a Founding Member
              </Link>
            </div>
          </div>

          <div className="mt-16 text-center">
            <p className="text-cream/60 text-lg mb-8 font-serif italic">
              "Join India's most trusted real estate intelligence platform"
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/register" className="btn-gold">
                <Sparkles className="w-5 h-5 mr-2" />List Your Business Today
              </Link>
              <Link to="/directory" className="btn-primary">
                <Building2 className="w-5 h-5 mr-2" />Explore Directory
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SCROLL 6 / AI TEASER ═══ */}
      <section className="py-20 bg-cream border-t border-gold/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-gold/10 blur-3xl" />
                <img
                  src="/ambassador.png"
                  alt="Nora — Property Herald AI Brand Ambassador"
                  className="relative w-full max-w-sm object-contain drop-shadow-2xl"
                  onError={(e) => {
                    const t = e.target as HTMLImageElement;
                    t.style.display = 'none';
                    const fb = t.nextElementSibling as HTMLElement;
                    if (fb) fb.style.display = 'flex';
                  }}
                />
                <div className="hidden w-64 h-64 rounded-full bg-navy border-4 border-gold/30 items-center justify-center gold-glow">
                  <Bot className="w-28 h-28 text-gold/60" />
                </div>
              </div>
            </div>
            <div>
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-navy/8 border border-gold/30 text-navy text-sm font-medium mb-6">
                <Bot className="w-4 h-4 mr-2 text-gold" />AI-Powered Growth Assistant
              </div>
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-navy mb-4">
                Meet Nora,<br /><span className="text-gold">Your AI Growth Manager</span>
              </h2>
              <p className="text-warm-gray text-lg mb-6 leading-relaxed">
                Powered by Claude AI and trained on 25+ years of Indian real estate expertise. Nora qualifies leads, scores buyer intent, and routes hot prospects to your WhatsApp — 24/7, in Hindi and English.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  'Lead qualification via WhatsApp — automated',
                  'Intent scoring 0–100 with instant escalation',
                  'Personalized property recommendations',
                  'Market trend analysis and pricing insights',
                  'Natural voice in Hindi & English via ElevenLabs',
                ].map((item) => (
                  <li key={item} className="flex items-center text-warm-gray text-sm">
                    <Check className="w-4 h-4 text-gold mr-3 flex-shrink-0" />{item}
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-4 p-4 bg-navy rounded-xl border border-gold/20">
                <div className="w-11 h-11 bg-gold/10 border border-gold/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-6 h-6 text-gold" />
                </div>
                <div>
                  <p className="font-semibold text-cream">Launching Q4 2026</p>
                  <p className="text-sm text-cream/50">Register now for early access</p>
                </div>
                <span className="ml-auto px-3 py-1 bg-gold text-navy text-xs font-bold rounded-full font-display uppercase">Coming Soon</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hero lead form modal */}
      <HeroLeadForm
        open={leadForm.open}
        formType={leadForm.type}
        onClose={() => setLeadForm(f => ({ ...f, open: false }))}
      />

    </div>
  );
}

function MeetOurAITeam({ daughters, loading }: { daughters: DaughterPicture[]; loading: boolean }) {
  return (
    <section className="py-16 bg-cream">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-navy/8 border border-gold/30 text-navy text-sm font-display font-semibold uppercase tracking-wider mb-4">
            <Sparkle className="w-4 h-4 mr-2 text-gold" />Our AI Team
          </div>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-navy mb-2">Meet Our AI Team</h2>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 animate-pulse" style={{ aspectRatio: '3/4' }} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {daughters.map(d => (
              <div key={d.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-hidden" style={{ aspectRatio: '3/4' }}>
                  {d.profile_picture_url ? (
                    <img
                      src={d.profile_picture_url}
                      alt={d.daughter_name ?? ''}
                      className="w-full h-full object-cover"
                      style={{ objectPosition: 'top center' }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-navy/10 to-gold/10 flex items-center justify-center">
                      <span className="text-2xl font-serif font-bold text-navy/30">{(d.daughter_name ?? '?').charAt(0)}</span>
                    </div>
                  )}
                </div>
                <div className="px-3 py-2.5 text-center">
                  <p className="font-serif font-bold text-navy text-sm capitalize">{d.daughter_name ?? ''}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function PlatformStats() {
  const [showStats, setShowStats] = useState(false);
  const [visitorCount, setVisitorCount] = useState<number | null>(null);
  const [offerCount, setOfferCount] = useState<number | null>(null);
  const [elephantRaise, setElephantRaise] = useState(false);

  useEffect(() => {
    supabase.from('site_config').select('value').eq('key', 'show_platform_stats').maybeSingle()
      .then(({ data }) => {
        if (data?.value === 'true') {
          setShowStats(true);
          Promise.all([
            supabase.from('site_config').select('value').eq('key', 'total_visitor_count').maybeSingle(),
            supabase.from('site_config').select('value').eq('key', 'total_sales_offers_generated').maybeSingle(),
          ]).then(([vis, off]) => {
            setVisitorCount(parseInt(vis.data?.value ?? '0'));
            setOfferCount(parseInt(off.data?.value ?? '0'));
          });
          setElephantRaise(true);
          const t = setTimeout(() => setElephantRaise(false), 2000);
          return () => clearTimeout(t);
        }
      });
  }, []);

  if (!showStats) return null;

  return (
    <section className="py-12 bg-navy">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <div className="flex items-center justify-center gap-8 md:gap-16">
          <div>
            <div className={`text-4xl mb-2 transition-transform duration-700 ${elephantRaise ? '-rotate-12 -translate-y-2 scale-110' : ''}`}>
              <img src="/logo.png.png" alt="" className="w-12 h-12 mx-auto object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
            <p className="text-3xl font-bold text-gold font-display">{visitorCount?.toLocaleString('en-IN') ?? '—'}</p>
            <p className="text-sm text-cream/60 uppercase tracking-wider">Total Visitors</p>
          </div>
          <div>
            <div className="text-4xl mb-2 text-gold">
              <TrendingUp className="w-10 h-10 mx-auto" />
            </div>
            <p className="text-3xl font-bold text-gold font-display">{offerCount?.toLocaleString('en-IN') ?? '—'}</p>
            <p className="text-sm text-cream/60 uppercase tracking-wider">Sales Offers Generated</p>
          </div>
        </div>
      </div>
    </section>
  );
}
