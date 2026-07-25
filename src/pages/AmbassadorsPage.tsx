import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { PublicAmbassador, PublicAmbassadorType } from '../types/database';
import { MapPin, Building2, User, Users, Award } from 'lucide-react';

const TYPE_LABELS: Record<PublicAmbassadorType, string> = {
  developer: 'Developer', agent: 'Agent', community: 'Community',
};
const TYPE_ICONS: Record<PublicAmbassadorType, typeof Building2> = {
  developer: Building2, agent: User, community: Users,
};
const TYPE_COLORS: Record<PublicAmbassadorType, string> = {
  developer: 'bg-blue-50 text-blue-700 border-blue-200',
  agent: 'bg-green-50 text-green-700 border-green-200',
  community: 'bg-amber-50 text-amber-700 border-amber-200',
};

export function AmbassadorsPage() {
  const [ambassadors, setAmbassadors] = useState<PublicAmbassador[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('public_ambassadors').select('*').eq('is_active', true).order('display_order')
      .then(({ data }) => { if (data) setAmbassadors(data as PublicAmbassador[]); setLoading(false); });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-navy text-cream py-16 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gold/10 border border-gold/30 rounded-full mb-6">
            <Award className="w-8 h-8 text-gold" />
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-cream mb-4">Property Herald Ambassadors</h1>
          <p className="text-lg text-cream/70 max-w-2xl mx-auto">Our champions spreading the word across India</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map(i => <div key={i} className="bg-white rounded-xl border h-64 animate-pulse" />)}
          </div>
        ) : ambassadors.length === 0 ? (
          <div className="text-center py-20"><Users className="w-12 h-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-500 text-lg">Ambassador profiles coming soon.</p></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {ambassadors.map(amb => {
              const Icon = TYPE_ICONS[amb.ambassador_type];
              return (
                <div key={amb.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden transition-all hover:shadow-lg hover:border-gold/40">
                  <div className="flex justify-center pt-8 pb-4">
                    <div className="w-24 h-24 rounded-full border-2 border-gold/30 overflow-hidden bg-gray-100 flex items-center justify-center">
                      {amb.profile_picture_url ? <img src={amb.profile_picture_url} alt={amb.name} className="w-full h-full object-cover object-center" /> : <Users className="w-10 h-10 text-gray-300" />}
                    </div>
                  </div>
                  <div className="px-6 pb-6 text-center">
                    <h3 className="text-lg font-serif font-bold text-navy mb-1">{amb.name}</h3>
                    <div className="flex items-center justify-center gap-1.5 text-sm text-gray-500 mb-3"><MapPin className="w-3.5 h-3.5 text-gold/60" />{amb.city_region}</div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${TYPE_COLORS[amb.ambassador_type]}`}><Icon className="w-3 h-3" />{TYPE_LABELS[amb.ambassador_type]}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
