import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { City, Magazine, DaughterPicture } from '../types/database';
import {
  Building2, Users, BookOpen, ArrowRight, MapPin,
  TrendingUp, Sparkles, Check, Bot, ChevronDown,
  Globe, Zap, Award, MessageCircle, Sparkle, Handshake, User,
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

// ─── Meet Our Team (dynamic from daughter_pictures table) ───

function MeetOurTeam() {
  const [daughters, setDaughters] = useState<DaughterPicture[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDaughters() {
      const { data } = await supabase
        .from('daughter_pictures')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      if (data) setDaughters(data as DaughterPicture[]);
      setLoading(false);
    }
    fetchDaughters();
  }, []);

  return (
    <section className="py-16 bg-gradient-to-b from-cream to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-navy/8 border border-gold/30 text-navy text-sm font-display font-semibold uppercase tracking-wider mb-4">
            <Users className="w-4 h-4 mr-2 text-gold" />Our People
          </div>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-navy mb-2">Meet Our Team</h2>
          <p className="text-warm-gray text-lg">The people building India's first AI-powered real estate platform</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-6">
          {loading ? (
            [1,2,3,4,5,6].map(i => (
              <div key={i} className="flex flex-col items-center">
                <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-gray-200 animate-pulse mb-3" />
                <div className="h-4 w-20 bg-gray-200 animate-pulse rounded mb-1" />
                <div className="h-3 w-16 bg-gray-200 animate-pulse rounded" />
              </div>
            ))
          ) : daughters.map((d) => (
            <div key={d.id} className="flex flex-col items-center group">
              <div className="relative w-24 h-24 md:w-28 md:h-28 rounded-full border-2 border-gold/30 overflow-hidden bg-gradient-to-br from-navy/10 to-gold/10 mb-3 transition-all group-hover:border-gold/60 group-hover:shadow-lg">
                {d.profile_picture_url ? (
                  <img
                    src={d.profile_picture_url}
                    alt={d.display_name}
                    className="w-full h-full object-cover"
                    style={{ objectPosition: 'top' }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-2xl font-serif font-bold text-navy/30">
                      {d.display_name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
              <h3 className="font-serif font-bold text-navy text-sm text-center capitalize">
                {d.daughter_name}
              </h3>
              <p className="text-xs text-gold mt-0.5 text-center">{d.display_name}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HomePage() {
  const [cities, setCities] = useState<City[]>([]);
  const [recentMagazines, setRecentMagazines] = useState<Magazine[]>([]);
  const [stats, setStats] = useState<LiveStats>({ cities: null, members: null, magazineReaders: null, inquiries: null });
  const [corridorCounts, setCorridorCounts] = useState<CorridorCounts>({ maharashtra: 0, gujarat: 0, ncr: 0, karnataka: 0 });
  const [daughters, setDaughters] = useState<DaughterPicture[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchData() {
      const [
        { data: citiesData },
        { data: magazinesData },
        { count: cityCount },
        { count: memberCount },
        { data: siteConfigData },
        { data: allCitiesForCorridors },
        { data: listingCityData },
        { data: daughterData },
      ] = await Promise.all([
        supabase.from('cities').select('*').order('name'),
        supabase.from('magazines').select('*').eq('is_published', true).order('issue_number', { ascending: false }).limit(3),
        supabase.from('cities').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('site_config').select('key, value').in('key', ['magazine_readers']),
        supabase.from('cities').select('id, state'),
        supabase.from('listings').select('city_id').eq('is_active', true),
        supabase.from('daughter_pictures').select('*').eq('is_active', true).order('display_order'),
      ]);

      if (citiesData) setCities(citiesData as City[]);
      if (magazinesData) setRecentMagazines(magazinesData as Magazine[]);
      if (daughterData) setDaughters(daughterData as DaughterPicture[]);

      const magazineReaders = (siteConfigData ?? []).find((c: { key: string; value: string }) => c.key === 'magazine_readers')?.value ?? null;

      // Try whatsapp_leads table for inquiry count
      let inquiryCount: number | null = null;
      try {
        const { count, error } = await supabase.from('whatsapp_leads').select('*', { count: 'exact', head: true });
        if (!error) inquiryCount = count;
      } catch {
        inquiryCount = null;
      }

      setStats({
        cities: cityCount ?? 0,
        members: memberCount ?? 0,
        magazineReaders: magazineReaders ? Number(magazineReaders).toLocaleString('en-IN') + '+' : null,
        inquiries: inquiryCount,
      });

      // Compute corridor counts from all active listings
      if (allCitiesForCorridors && listingCityData) {
        const cityStateMap: Record<string, string> = {};
        for (const c of (allCitiesForCorridors as { id: string; state: string }[])) {
          cityStateMap[c.id] = c.state;
        }
        const ld = listingCityData as { city_id: string }[];
        setCorridorCounts({
          maharashtra: ld.filter(l => cityStateMap[l.city_id] === 'Maharashtra').length,
          gujarat:     ld.filter(l => cityStateMap[l.city_id] === 'Gujarat').length,
          ncr:         ld.filter(l => ['Delhi', 'Haryana', 'Uttar Pradesh'].includes(cityStateMap[l.city_id])).length,
          karnataka:   ld.filter(l => cityStateMap[l.city_id] === 'Karnataka').length,
        });
      }

      setLoading(false);
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

  const fmtStat = (val: number | null, suffix = '') => {
    if (val === null) return '...';
    if (val === 0) return 'Launching';
    if (val >= 1000) return `${(val / 1000).toFixed(1)}K+`;
    return `${val}${suffix}`;
  };

  const liveStats = [
    { label: 'Cities Covered',     value: stats.cities !== null ? (stats.cities === 0 ? 'Launching' : `${stats.cities}+`) : '...', icon: MapPin },
    { label: 'Registered Members', value: fmtStat(stats.members),                                                                    icon: Users },
    { label: 'Magazine Readers',   value: stats.magazineReaders ?? 'Coming Soon',                                                     icon: BookOpen },
    { label: 'Inquiries Processed',value: stats.inquiries !== null ? (stats.inquiries === 0 ? 'Coming Soon' : fmtStat(stats.inquiries)) : 'Coming Soon', icon: MessageCircle },
  ];

  return (
    <div className="bg-cream">

      {/* ═══ SCROLL 1: HERO ═══ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center geo-pattern overflow-hidden bg-cream">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[600px] rounded-full bg-gold/5 blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center px-4 w-full max-w-5xl mx-auto">
          {/* Logo — 50vh desktop, 40vh mobile */}
          <div className="relative mb-8 flex items-center justify-center">
            <div className="absolute inset-[-2px] rounded-3xl gold-glow opacity-50" />
            <img
              src="/logo.png.png"
              alt="Property Herald"
              className="relative h-[40vh] md:h-[50vh] w-auto object-contain drop-shadow-2xl"
              style={{ maxWidth: '80vw' }}
              onError={(e) => {
                const t = e.target as HTMLImageElement;
                t.style.display = 'none';
                const fb = t.nextElementSibling as HTMLElement;
                if (fb) fb.style.display = 'flex';
              }}
            />
            <div className="hidden h-[40vh] md:h-[50vh] w-auto aspect-square items-center justify-center bg-navy rounded-3xl border-4 border-gold/40 p-12 gold-glow">
              <div className="text-center">
                <div className="text-7xl md:text-9xl font-serif font-black text-gold leading-none">PH</div>
                <div className="mt-2 font-display font-bold tracking-widest text-cream/80 text-lg uppercase">Property Herald</div>
              </div>
            </div>
          </div>

          {/* Badge */}
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-navy/8 border border-gold/30 text-warm-gray text-sm font-medium mb-5">
            <TrendingUp className="w-4 h-4 mr-2 text-gold" />
            India's Premier Real Estate Intelligence Platform
          </div>

          {/* H1 */}
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-serif font-bold text-navy leading-tight mb-4 text-balance">
            Discover. Connect.<br />
            <span className="text-gold">Grow.</span>
          </h1>

          {/* Subheadline */}
          <p className="text-warm-gray text-lg md:text-xl max-w-2xl leading-relaxed mb-10 font-sans">
            India's first curated, AI-powered real estate directory — connecting buyers with trusted builders, agents, and agencies across the nation.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
            <Link to="/directory" className="btn-primary">
              <Building2 className="w-5 h-5 mr-2" />Explore Listings
            </Link>
            <Link to="/register" className="btn-gold">
              <Sparkles className="w-5 h-5 mr-2" />List Your Business
            </Link>
          </div>

          {/* Live stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-3xl">
            {liveStats.map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-navy rounded-xl p-4 border border-gold/20 text-center">
                <Icon className="w-5 h-5 text-gold mx-auto mb-2" />
                <div className="text-xl md:text-2xl font-bold text-gold font-display leading-tight">{value}</div>
                <div className="text-xs text-cream/60 mt-1 font-sans">{label}</div>
              </div>
            ))}
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

      {/* ═══ TAGLINE ═══ */}
      <section className="bg-navy py-8 text-center">
        <h2 className="text-2xl md:text-4xl font-serif font-bold text-gold tracking-wide">
          India. Intelligence. Integrity.
        </h2>
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

      {/* ═══ MEET OUR TEAM ═══ */}
      <MeetOurTeam />

      {/* ═══ MEET OUR AI TEAM ═══ */}
      <section className="py-16 bg-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-navy/8 border border-gold/30 text-navy text-sm font-display font-semibold uppercase tracking-wider mb-4">
              <Sparkle className="w-4 h-4 mr-2 text-gold" />Our AI Team
            </div>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-navy mb-2">Meet Our AI Team</h2>
            <p className="text-warm-gray text-lg">59 AI daughters transforming Indian real estate</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {daughters.length > 0 ? daughters.map(d => (
              <div key={d.id} className="bg-white rounded-xl border border-gray-200 p-4 text-center transition-all hover:border-gold/40 hover:shadow-md">
                <div className="w-16 h-16 rounded-full border-2 border-gold/30 overflow-hidden bg-gray-100 mx-auto mb-3 flex items-center justify-center">
                  {d.profile_picture_url ? (
                    <img src={d.profile_picture_url} alt={d.display_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-navy/10 to-gold/10 flex items-center justify-center">
                      <span className="text-xl font-serif font-bold text-navy/30">{d.display_name.charAt(0)}</span>
                    </div>
                  )}
                </div>
                <h3 className="font-serif font-bold text-navy text-sm">{d.display_name}</h3>
                <p className="text-xs text-gold mt-0.5">{d.pod_title}</p>
              </div>
            )) : (
              // Fallback hardcoded 15 daughters when DB is empty
              [
                { name: 'Nora', pod: 'Royal Family, COO' },
                { name: 'Nita', pod: 'Royal Family, CoS' },
                { name: 'Nicole', pod: 'Core India Ops' },
                { name: 'Nancy', pod: 'Core India Ops' },
                { name: 'Namrata', pod: 'Core India Ops' },
                { name: 'Navika', pod: 'STF Navi Mumbai Commander' },
                { name: 'Nimisha', pod: 'STF Navi Mumbai 2' },
                { name: 'Nishita', pod: 'STF Navi Mumbai 3' },
                { name: 'Nazia', pod: 'International, Dubai Head' },
                { name: 'Naameshwari', pod: 'International, NYC Desk' },
                { name: 'Neetu', pod: 'NGFC, Home Loans' },
                { name: 'Neelu', pod: 'NGFC, Insurance' },
                { name: 'Nakshatra', pod: 'Social Media Cell Head' },
                { name: 'Navya', pod: 'Culture & Wellbeing, CIO' },
                { name: 'Naksha', pod: 'Geography & Maps' },
              ].map((d, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 text-center transition-all hover:border-gold/40 hover:shadow-md">
                  <div className="w-16 h-16 rounded-full border-2 border-gold/30 bg-gray-100 mx-auto mb-3 flex items-center justify-center">
                    <span className="text-xl font-serif font-bold text-navy/30">{d.name.charAt(0)}</span>
                  </div>
                  <h3 className="font-serif font-bold text-navy text-sm">{d.name}</h3>
                  <p className="text-xs text-gold mt-0.5">{d.pod}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

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

    </div>
  );
}
