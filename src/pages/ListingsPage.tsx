import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { City, Listing, Profile } from '../types/database';
import { MapPin, Search, Filter, X, Calendar, Phone, Building2, Home, Briefcase, ChevronDown, Star, ArrowRight } from 'lucide-react';
import { ShowApartmentBookingModal } from '../components/ShowApartmentBookingModal';

type ListingWithProfile = Listing & { profile: Profile; city: City };

const BUDGET_OPTIONS = [
  { label: 'All Budgets', min: null, max: null },
  { label: 'Under ₹50 Lakhs', min: 0, max: 5000000 },
  { label: '₹50L – ₹1 Crore', min: 5000000, max: 10000000 },
  { label: '₹1Cr – ₹2 Crore', min: 10000000, max: 20000000 },
  { label: '₹2Cr – ₹5 Crore', min: 20000000, max: 50000000 },
  { label: 'Above ₹5 Crore', min: 50000000, max: null },
];

const PROPERTY_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
];

const DEAL_TYPES = [
  { value: '', label: 'Buy or Rent' },
  { value: 'buy', label: 'Buy' },
  { value: 'rent', label: 'Rent' },
];

export function ListingsPage() {
  const [cities, setCities] = useState<City[]>([]);
  const [listings, setListings] = useState<ListingWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCity, setSelectedCity] = useState('');
  const [selectedBudgetIdx, setSelectedBudgetIdx] = useState(0);
  const [selectedPropertyType, setSelectedPropertyType] = useState('');
  const [selectedDealType, setSelectedDealType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [bookingListing, setBookingListing] = useState<ListingWithProfile | null>(null);

  useEffect(() => {
    supabase.from('cities').select('*').order('name').then(({ data }) => {
      if (data) setCities(data as City[]);
    });
  }, []);

  useEffect(() => {
    async function fetchListings() {
      setLoading(true);

      let query = supabase
        .from('listings')
        .select('*, profile:profiles(*), city:cities(*)')
        .eq('is_active', true)
        .eq('moderation_status', 'approved')
        .neq('market_track', 'dubai')
        .order('is_hot', { ascending: false })
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false });

      if (selectedCity) {
        query = query.eq('city_id', selectedCity);
      }

      const budget = BUDGET_OPTIONS[selectedBudgetIdx];
      if (budget.min !== null) query = query.gte('price_min', budget.min);
      if (budget.max !== null) query = query.lte('price_min', budget.max);

      const { data, error } = await query;
      if (data && !error) setListings(data as ListingWithProfile[]);
      setLoading(false);
    }
    fetchListings();
  }, [selectedCity, selectedBudgetIdx]);

  const filteredListings = listings.filter(l => {
    if (selectedPropertyType && !l.property_types?.includes(selectedPropertyType as 'residential' | 'commercial')) return false;
    if (selectedDealType && !l.deal_types?.includes(selectedDealType as 'buy' | 'rent')) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !l.title?.toLowerCase().includes(q) &&
        !l.profile?.business_name?.toLowerCase().includes(q) &&
        !l.city?.name?.toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  const activeFilters = [
    selectedCity && cities.find(c => c.id === selectedCity)?.name,
    BUDGET_OPTIONS[selectedBudgetIdx].label !== 'All Budgets' && BUDGET_OPTIONS[selectedBudgetIdx].label,
    selectedPropertyType && PROPERTY_TYPES.find(t => t.value === selectedPropertyType)?.label,
    selectedDealType && DEAL_TYPES.find(t => t.value === selectedDealType)?.label,
  ].filter(Boolean) as string[];

  function clearFilters() {
    setSelectedCity('');
    setSelectedBudgetIdx(0);
    setSelectedPropertyType('');
    setSelectedDealType('');
    setSearchQuery('');
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Hero */}
      <div className="bg-navy py-14 px-6">
        <div className="max-w-5xl mx-auto text-center space-y-4">
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-cream">
            Find Your <span className="text-gold">Perfect Property</span>
          </h1>
          <p className="text-cream/60 text-base max-w-xl mx-auto">
            Browse premium listings from verified developers across India's top corridors.
          </p>

          {/* Search bar */}
          <div className="max-w-2xl mx-auto flex gap-2 pt-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by developer, project, or city..."
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white text-navy text-sm outline-none border border-transparent focus:border-gold/40 transition-colors"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
            <button
              onClick={() => setFiltersOpen(f => !f)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border transition-all ${filtersOpen ? 'bg-gold text-navy border-gold' : 'bg-white text-navy border-transparent hover:border-gold/30'}`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {activeFilters.length > 0 && (
                <span className="w-5 h-5 bg-navy text-cream rounded-full text-xs flex items-center justify-center font-bold">
                  {activeFilters.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Filter panel */}
      {filtersOpen && (
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-5xl mx-auto px-6 py-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* City */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">City</label>
                <div className="relative">
                  <select
                    value={selectedCity}
                    onChange={e => setSelectedCity(e.target.value)}
                    className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-gray-200 text-sm text-navy bg-white focus:border-gold/50 outline-none"
                  >
                    <option value="">All Cities</option>
                    {cities.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Budget */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Budget</label>
                <div className="relative">
                  <select
                    value={selectedBudgetIdx}
                    onChange={e => setSelectedBudgetIdx(Number(e.target.value))}
                    className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-gray-200 text-sm text-navy bg-white focus:border-gold/50 outline-none"
                  >
                    {BUDGET_OPTIONS.map((b, i) => (
                      <option key={i} value={i}>{b.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Property type */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</label>
                <div className="relative">
                  <select
                    value={selectedPropertyType}
                    onChange={e => setSelectedPropertyType(e.target.value)}
                    className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-gray-200 text-sm text-navy bg-white focus:border-gold/50 outline-none"
                  >
                    {PROPERTY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Deal type */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Deal</label>
                <div className="relative">
                  <select
                    value={selectedDealType}
                    onChange={e => setSelectedDealType(e.target.value)}
                    className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-gray-200 text-sm text-navy bg-white focus:border-gold/50 outline-none"
                  >
                    {DEAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {activeFilters.length > 0 && (
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                <span className="text-xs text-gray-500">Active:</span>
                {activeFilters.map(f => (
                  <span key={f} className="px-2.5 py-1 rounded-full bg-gold/10 text-navy text-xs font-medium border border-gold/20">{f}</span>
                ))}
                <button onClick={clearFilters} className="ml-auto text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1">
                  <X className="w-3 h-3" /> Clear all
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-500">
            {loading ? 'Loading...' : `${filteredListings.length} listing${filteredListings.length !== 1 ? 's' : ''} found`}
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse h-64" />
            ))}
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto" />
            <p className="text-gray-500 font-medium">No listings match your filters</p>
            <button onClick={clearFilters} className="text-sm text-gold hover:underline">Clear filters</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map(listing => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onBook={() => setBookingListing(listing)}
              />
            ))}
          </div>
        )}
      </div>

      {bookingListing && (
        <ShowApartmentBookingModal
          listing={bookingListing}
          onClose={() => setBookingListing(null)}
        />
      )}
    </div>
  );
}

function ListingCard({ listing, onBook }: { listing: ListingWithProfile; onBook: () => void }) {
  const profile = listing.profile;

  const priceFmt = (n: number | null) => {
    if (!n) return null;
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(0)}L`;
    return `₹${n.toLocaleString('en-IN')}`;
  };

  const priceMin = priceFmt(listing.price_min ?? null);
  const priceMax = priceFmt(listing.price_max ?? null);
  const priceDisplay = priceMin && priceMax ? `${priceMin} – ${priceMax}` : priceMin ?? priceMax ?? null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all overflow-hidden group flex flex-col">
      {/* Color band */}
      <div className="h-1.5 bg-gradient-to-r from-navy to-gold" />

      <div className="p-5 flex flex-col flex-1 gap-3">
        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {listing.is_featured && (
            <span className="px-2 py-0.5 rounded-full bg-gold/15 text-gold text-[10px] font-bold uppercase tracking-wider border border-gold/20 flex items-center gap-1">
              <Star className="w-2.5 h-2.5 fill-gold" /> Featured
            </span>
          )}
          {listing.is_hot && (
            <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-bold uppercase tracking-wider border border-red-100">
              Hot
            </span>
          )}
          {listing.property_types?.map(t => (
            <span key={t} className="px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 text-[10px] font-medium border border-gray-100 flex items-center gap-1">
              {t === 'residential' ? <Home className="w-2.5 h-2.5" /> : <Briefcase className="w-2.5 h-2.5" />}
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </span>
          ))}
        </div>

        {/* Title */}
        <div>
          <h3 className="font-semibold text-navy text-base leading-snug group-hover:text-gold/90 transition-colors">
            {listing.title}
          </h3>
          <p className="text-sm text-gray-500 mt-0.5 font-medium">{profile?.business_name}</p>
        </div>

        {/* Price */}
        {priceDisplay && (
          <p className="text-base font-bold text-navy">{priceDisplay}</p>
        )}

        {/* Location + experience */}
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-gold/70" />
            {listing.city?.name ?? '—'}
          </span>
          {listing.years_experience > 0 && (
            <span>{listing.years_experience}y exp.</span>
          )}
          {listing.projects_completed > 0 && (
            <span>{listing.projects_completed} projects</span>
          )}
        </div>

        {/* Description */}
        {listing.description && (
          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{listing.description}</p>
        )}

        {/* Deal types */}
        {listing.deal_types && listing.deal_types.length > 0 && (
          <div className="flex gap-1.5">
            {listing.deal_types.map(d => (
              <span key={d} className="px-2 py-0.5 rounded-full bg-navy/5 text-navy text-[10px] font-semibold uppercase tracking-wider">
                {d}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="mt-auto pt-3 border-t border-gray-50 flex gap-2">
          {profile?.whatsapp_number && (
            <a
              href={`https://wa.me/${profile.whatsapp_number.replace(/\D/g, '')}?text=Hi%2C+I%20found%20your%20listing%20on%20Property%20Herald%20and%20I'm%20interested.`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-50 text-green-700 text-xs font-semibold hover:bg-green-100 transition-all border border-green-100"
            >
              <Phone className="w-3.5 h-3.5" />
              WhatsApp
            </a>
          )}
          <button
            onClick={onBook}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-navy text-cream text-xs font-semibold hover:bg-navy/90 transition-all flex-1 justify-center"
          >
            <Calendar className="w-3.5 h-3.5" />
            Book a Showing
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
