import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { City, Listing, Profile } from '../types/database';
import { MapPin, Star, MessageCircle, Building2, Users, Sparkles, Search, ChevronDown, X, Phone, Globe, Award, Home, Briefcase, ShoppingCart, Key } from 'lucide-react';

type ListingWithProfile = Listing & { profile: Profile; city: City };

export function DirectoryPage() {
  const { citySlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [cities, setCities] = useState<City[]>([]);
  const [listings, setListings] = useState<ListingWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCity, setSelectedCity] = useState<string>(citySlug || 'mumbai');
  const [selectedType, setSelectedType] = useState<string>(searchParams.get('type') || '');
  const [selectedPropertyType, setSelectedPropertyType] = useState<string>(searchParams.get('property_type') || '');
  const [selectedDealType, setSelectedDealType] = useState<string>(searchParams.get('deal') || '');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    supabase.from('cities').select('*').order('name').then(({ data }) => { if (data) setCities(data as City[]); });
  }, []);

  useEffect(() => {
    async function fetchListings() {
      setLoading(true);
      let query = supabase
        .from('listings').select('*, profile:profiles(*), city:cities(*)')
        .eq('is_active', true).order('is_featured', { ascending: false }).order('created_at', { ascending: false });

      if (citySlug) {
        const { data: cityData } = await supabase.from('cities').select('id').eq('slug', citySlug).single();
        if (cityData) query = query.eq('city_id', cityData.id);
      }
      if (selectedType) query = query.filter('profile.business_type', 'eq', selectedType);

      const { data, error } = await query;
      if (data && !error) setListings(data as ListingWithProfile[]);
      setLoading(false);
    }
    fetchListings();
  }, [citySlug, selectedType]);

  const filteredListings = listings.filter((listing) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!listing.title?.toLowerCase().includes(q) && !listing.profile?.business_name?.toLowerCase().includes(q) && !listing.city?.name?.toLowerCase().includes(q)) return false;
    }
    if (selectedPropertyType && !listing.property_types?.includes(selectedPropertyType as never)) return false;
    if (selectedDealType && !listing.deal_types?.includes(selectedDealType as never)) return false;
    return true;
  });

  const currentCity = citySlug ? cities.find((c) => c.slug === citySlug) : null;

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <div className="bg-navy text-cream py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl md:text-4xl font-serif font-bold mb-4">
            {currentCity ? `${currentCity.name} Real Estate Directory` : 'Real Estate Directory'}
          </h1>
          <p className="text-cream/70 text-lg max-w-2xl mx-auto">
            Find trusted builders, agents, and agencies {currentCity ? `in ${currentCity.name}` : 'across India'} — Residential & Commercial, Buy & Rent
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-8 border border-gold/15">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="text" placeholder="Search by name, city or keyword..." value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gold/50 focus:border-gold/50 outline-none" />
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select value={selectedCity} onChange={(e) => { setSelectedCity(e.target.value); if (e.target.value) window.location.href = `/directory/${e.target.value}`; }}
                className="w-full pl-10 pr-8 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gold/50 outline-none appearance-none bg-white text-sm">
                <option value="">All Cities</option>
                {cities.map((city) => (<option key={city.id} value={city.slug}>{city.name}</option>))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative">
              <Home className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select value={selectedPropertyType} onChange={(e) => setSelectedPropertyType(e.target.value)}
                className="w-full pl-10 pr-8 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gold/50 outline-none appearance-none bg-white text-sm">
                <option value="">All Properties</option>
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative">
              <ShoppingCart className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select value={selectedDealType} onChange={(e) => setSelectedDealType(e.target.value)}
                className="w-full pl-10 pr-8 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gold/50 outline-none appearance-none bg-white text-sm">
                <option value="">Buy or Rent</option>
                <option value="buy">Buy</option>
                <option value="rent">Rent</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            {[
              { value: 'developer', label: 'Developers & Builders', icon: Building2 },
              { value: 'agency', label: 'Agencies', icon: Users },
              { value: 'agent', label: 'Agents', icon: Sparkles },
            ].map(({ value, label, icon: Icon }) => (
              <button key={value} onClick={() => setSelectedType(selectedType === value ? '' : value)}
                className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedType === value
                    ? 'bg-navy text-cream'
                    : 'bg-cream border border-gold/20 text-navy hover:border-gold/50'
                }`}>
                <Icon className="w-4 h-4 mr-2" />{label}
              </button>
            ))}
            {(selectedCity || selectedType || selectedPropertyType || selectedDealType) && (
              <button onClick={() => { setSelectedCity(''); setSelectedType(''); setSelectedPropertyType(''); setSelectedDealType(''); setSearchParams({}); window.location.href = '/directory'; }}
                className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium text-burgundy hover:bg-burgundy/5 border border-burgundy/20">
                <X className="w-4 h-4 mr-2" />Clear All
              </button>
            )}
          </div>
        </div>

        <div className="mb-6">
          <p className="text-warm-gray">
            Showing <span className="font-semibold text-navy">{filteredListings.length}</span> listings
            {currentCity && <span> in <span className="font-semibold text-navy">{currentCity.name}</span></span>}
          </p>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl p-6 animate-pulse border border-gold/10">
                <div className="h-14 bg-cream rounded mb-4" />
                <div className="h-4 bg-cream rounded mb-2 w-3/4" />
                <div className="h-4 bg-cream rounded w-1/2 mb-4" />
                <div className="h-10 bg-cream rounded" />
              </div>
            ))}
          </div>
        ) : filteredListings.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            {filteredListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-xl border border-gold/15">
            <Building2 className="w-16 h-16 text-gold/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-navy mb-2">No Listings Found</h3>
            <p className="text-warm-gray mb-6">Try adjusting your filters or search terms</p>
            <Link to="/register" className="btn-gold">List Your Business</Link>
          </div>
        )}
      </div>
    </div>
  );
}

function ListingCard({ listing }: { listing: ListingWithProfile }) {
  const [showContact, setShowContact] = useState(false);
  const profile = listing.profile;
  const hasProfile = !!profile;

  const typeLabels: Record<string, string> = {
    developer: 'Developer & Builder',
    agency: 'Real Estate Agency',
    agent: 'Property Agent',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all border border-gold/10 overflow-hidden">
      <div className="p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-16 h-16 bg-gold/10 rounded-xl flex items-center justify-center flex-shrink-0 border border-gold/20">
            {profile?.business_type === 'developer' ? <Building2 className="w-8 h-8 text-gold" /> :
             profile?.business_type === 'agency' ? <Users className="w-8 h-8 text-gold" /> :
             <Sparkles className="w-8 h-8 text-gold" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="text-lg font-serif font-semibold text-navy truncate">{profile?.business_name ?? listing.title ?? 'Details unavailable'}</h3>
              {listing.is_featured && (
                <span className="inline-flex items-center px-2 py-1 bg-gold/10 text-gold text-xs font-medium rounded border border-gold/25 flex-shrink-0">
                  <Award className="w-3 h-3 mr-1" />Featured
                </span>
              )}
            </div>
            <p className="text-sm text-warm-gray mb-2">{hasProfile ? (typeLabels[profile!.business_type] ?? 'Real Estate Professional') : 'Listing awaiting profile'}</p>
            <div className="flex items-center flex-wrap gap-2">
              {profile?.is_verified && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gold/10 text-gold border border-gold/25">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  Gold Member
                </span>
              )}
              <span className="flex items-center text-sm text-warm-gray">
                <MapPin className="w-3.5 h-3.5 mr-1 text-gold/60" />{listing.city?.name ?? 'Location unavailable'}{listing.city?.state ? `, ${listing.city.state}` : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Property/deal type tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {listing.property_types?.map((pt) => (
            <span key={pt} className="px-2.5 py-1 rounded-full text-xs font-medium bg-navy/8 text-navy border border-navy/10">
              {pt === 'residential' ? <Home className="w-3 h-3 inline mr-1" /> : <Briefcase className="w-3 h-3 inline mr-1" />}
              {pt.charAt(0).toUpperCase() + pt.slice(1)}
            </span>
          ))}
          {listing.deal_types?.map((dt) => (
            <span key={dt} className="px-2.5 py-1 rounded-full text-xs font-medium bg-gold/8 text-warm-gray border border-gold/20">
              {dt === 'buy' ? <ShoppingCart className="w-3 h-3 inline mr-1" /> : <Key className="w-3 h-3 inline mr-1" />}
              {dt.charAt(0).toUpperCase() + dt.slice(1)}
            </span>
          ))}
          {listing.is_hot && (
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-burgundy/10 text-burgundy border border-burgundy/20 font-display uppercase tracking-wide">
              🔥 Hot
            </span>
          )}
        </div>

        <p className="text-warm-gray text-sm mb-4 line-clamp-2">{listing.description || profile?.description || 'Professional real estate services'}</p>

        <div className="flex items-center gap-4 mb-4 text-sm text-warm-gray">
          {listing.rating > 0 && (
            <span className="flex items-center">
              <Star className="w-4 h-4 text-gold fill-current mr-1" />
              <span className="font-medium text-navy">{listing.rating.toFixed(1)}</span>
            </span>
          )}
          {listing.projects_completed > 0 && <span>{listing.projects_completed} projects</span>}
          {listing.years_experience > 0 && <span>{listing.years_experience} yrs exp</span>}
        </div>

        <div className="flex gap-2">
          {profile?.whatsapp_number ? (
            <a href={`https://wa.me/${profile.whatsapp_number.replace(/\D/g, '')}?text=${encodeURIComponent('Hi, I found your listing on Property Herald and I am interested in your services.')}`}
              target="_blank" rel="noopener noreferrer"
              onClick={() => {
                supabase.functions.invoke('whatsapp-lead-click', {
                  body: { listing_id: listing.id, profile_id: listing.profile_id },
                }).catch(() => {});
              }}
              className="flex-1 btn-whatsapp">
              <MessageCircle className="w-4 h-4 mr-2" />WhatsApp
            </a>
          ) : (
            <span className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-gray-100 text-gray-400 text-sm font-medium rounded-lg">
              <MessageCircle className="w-4 h-4 mr-2" />WhatsApp unavailable
            </span>
          )}
          <button onClick={() => setShowContact(!showContact)}
            className={`inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors border ${
              showContact
                ? 'bg-navy text-cream border-navy'
                : 'bg-cream border-gold/25 text-navy hover:bg-gold/5 hover:border-gold/50'
            }`}>
            <Phone className="w-4 h-4" />
          </button>
          {profile?.website_url && (
            <a href={profile.website_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-4 py-2.5 border border-gold/20 text-warm-gray text-sm font-medium rounded-lg hover:bg-gold/5 hover:border-gold/40 transition-colors">
              <Globe className="w-4 h-4" />
            </a>
          )}
        </div>

        {showContact && (
          <div className="mt-4 p-3 bg-gold/5 border border-gold/15 rounded-lg">
            <p className="text-sm text-warm-gray"><span className="font-medium text-navy">Phone:</span> {profile?.phone ?? 'Details unavailable'}</p>
            <p className="text-sm text-warm-gray mt-1"><span className="font-medium text-navy">Contact:</span> {profile?.contact_person ?? 'Details unavailable'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
