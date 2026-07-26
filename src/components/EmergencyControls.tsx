import { useState, useEffect } from 'react';
import { logAdminAction } from './AdminLayout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { SiteFlag } from '../types/database';
import { Shield, AlertTriangle, Bot, Handshake, Building2, RefreshCw } from 'lucide-react';

export function EmergencyControls() {
  const { user } = useAuth();
  const [flags, setFlags] = useState<SiteFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  async function fetchFlags() {
    setLoading(true);
    const { data } = await supabase.from('site_flags').select('*').order('flag_name');
    if (data) setFlags(data as SiteFlag[]);
    setLoading(false);
  }
  useEffect(() => { fetchFlags(); }, []);

  async function toggleFlag(flag: SiteFlag) {
    setToggling(flag.flag_name);
    await supabase.from('site_flags').update({ flag_value: !flag.flag_value, updated_at: new Date().toISOString() }).eq('flag_name', flag.flag_name);
    if (user?.email) await logAdminAction(supabase, user.email, 'toggle_site_flag', 'site_flags', flag.flag_name, { value: !flag.flag_value });
    fetchFlags();
    setToggling(null);
  }

  const FLAG_META: Record<string, { icon: typeof Shield; label: string; desc: string; danger?: boolean }> = {
    maintenance_mode: { icon: AlertTriangle, label: 'Maintenance Mode', desc: 'Shows maintenance page to non-admins', danger: true },
    nora_rest_mode: { icon: Bot, label: 'Nora Rest Mode', desc: 'Disables Nora chat widget' },
    founding_partner_open: { icon: Handshake, label: 'Founding Partner Open', desc: 'Accepting founding partner applications' },
    founding_agency_open: { icon: Building2, label: 'Founding Agency Open', desc: 'Accepting founding agency applications' },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-serif font-bold text-navy">Emergency Controls</h2><p className="text-sm text-gray-500 mt-1">Toggle site-wide flags instantly</p></div>
        <button onClick={fetchFlags} disabled={loading} className="p-2 text-gray-500 hover:text-navy rounded-lg hover:bg-gray-100"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
      </div>
      {loading ? <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[1,2,3,4].map(i => <div key={i} className="bg-white rounded-xl border h-24 animate-pulse" />)}</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {flags.map(flag => {
            const meta = FLAG_META[flag.flag_name] || { icon: Shield, label: flag.flag_name, desc: '' };
            const Icon = meta.icon;
            return (
              <div key={flag.id} className={`bg-white rounded-xl border p-5 ${flag.flag_value && meta.danger ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${flag.flag_value ? 'bg-gold/10' : 'bg-gray-100'}`}><Icon className={`w-5 h-5 ${flag.flag_value ? 'text-gold' : 'text-gray-400'}`} /></div>
                    <div><p className="font-medium text-navy text-sm">{meta.label}</p><p className="text-xs text-gray-400">{meta.desc}</p></div>
                  </div>
                  <button onClick={() => toggleFlag(flag)} disabled={toggling === flag.flag_name} className={`relative w-12 h-6 rounded-full transition-colors ${flag.flag_value ? 'bg-gold' : 'bg-gray-300'} disabled:opacity-50`}>
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${flag.flag_value ? 'translate-x-6' : ''}`} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
