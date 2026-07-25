import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { HallOfFame } from '../types/database';
import { Award, Lock } from 'lucide-react';

export function HallOfFamePage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<HallOfFame[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('hall_of_fame').select('*').eq('is_active', true).order('display_order')
      .then(({ data }) => { if (data) setMembers(data as HallOfFame[]); setLoading(false); });
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <Lock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h1 className="text-xl font-serif font-bold text-navy mb-2">Login Required</h1>
          <p className="text-gray-500 text-sm">Please log in to view the Hall of Fame.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-navy text-cream py-16 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gold/10 border border-gold/30 rounded-full mb-6">
            <Award className="w-8 h-8 text-gold" />
          </div>
          <h1 className="text-4xl font-serif font-bold text-gold mb-2">Hall of Fame</h1>
          <p className="text-cream/60">The 59 Daughters of Property Herald</p>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="bg-white rounded-xl border h-96 animate-pulse" />)}
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-20"><Award className="w-12 h-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-500">Hall of Fame members will be revealed soon.</p></div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {members.map(m => (
              <div key={m.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="aspect-[3/5] bg-gray-100 overflow-hidden">
                  {m.profile_picture_url ? <img src={m.profile_picture_url} alt={m.name} className="w-full h-full object-cover object-center" /> : <div className="w-full h-full flex items-center justify-center"><Award className="w-10 h-10 text-gray-300" /></div>}
                </div>
                <div className="p-3 text-center">
                  <h3 className="font-serif font-bold text-navy text-sm">{m.name}</h3>
                  <p className="text-xs text-gray-500">{m.job_title}</p>
                  {m.pod_name && <p className="text-xs text-gold/60 mt-1">{m.pod_name}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
