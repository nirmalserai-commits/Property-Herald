import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Listing, City } from '../types/database';
import { MapPin, Building2 } from 'lucide-react';

export function DubaiPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('cities').select('*').eq('state', 'UAE').order('name')
      .then(({ data }) => { if (data) setCities(data as City[]); });
  }, []);

  useEffect(() => {
    let q = supabase.from('listings').select('*, profile:profiles(*), city:cities(*)').eq('is_active', true).eq('is_dubai', true).order('is_hot', { ascending: false }).order('is_featured', { ascending: false }).order('created_at', { ascending: false });
    if (selectedCity) q = q.eq('city_id', selectedCity);
    q.then(({ data }) => { if (data) setListings(data as Listing[]); setLoading(false); });
  }, [selectedCity]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-navy to-navy-800 text-cream py-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <span className="text-5xl block mb-4">🇦🇪</span>
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-gold mb-2">Dubai Properties</h1>
          <p className="text-cream/60">Premium UAE real estate — AED & USD pricing</p>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
          <button onClick={() => setSelectedCity('')} className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap ${!selectedCity ? 'bg-navy text-gold border border-gold/20' : 'bg-white text-gray-600 border border-gray-200 hover:border-gold/40'}`}>All Emirates</button>
          {cities.map(c => (
            <button key={c.id} onClick={() => setSelectedCity(c.id)} className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap ${selectedCity === c.id ? 'bg-navy text-gold border border-gold/20' : 'bg-white text-gray-600 border border-gray-200 hover:border-gold/40'}`}>{c.name}</button>
          ))}
        </div>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{[1,2,3,4,5,6].map(i => <div key={i} className="bg-white rounded-xl border h-64 animate-pulse" />)}</div>
        ) : listings.length === 0 ? (
          <div className="text-center py-20"><Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-500">Dubai listings coming soon.</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map(l => (
              <div key={l.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-gold/40 transition-all">
                <div className="p-5">
                  <h3 className="font-serif font-bold text-navy mb-1">{l.title}</h3>
                  {l.city && <div className="flex items-center gap-1 text-sm text-gray-500 mb-3"><MapPin className="w-3.5 h-3.5 text-gold/60" />{l.city.name}</div>}
                  {l.description && <p className="text-sm text-gray-600 line-clamp-2 mb-3">{l.description}</p>}
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    {l.size_sqft && <span>{l.size_sqft.toLocaleString()} sqft</span>}
                    {l.ownership_type && <span className="px-2 py-0.5 bg-gold/10 text-gold rounded-full">{l.ownership_type}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
