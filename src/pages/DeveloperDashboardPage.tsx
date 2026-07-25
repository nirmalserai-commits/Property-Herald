import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { Listing, CrmLead } from '../types/database';
import { Building2, Users, TrendingUp, Phone, Mail, Flame } from 'lucide-react';

type Tab = 'overview' | 'projects' | 'leads';

export function DeveloperDashboardPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [listings, setListings] = useState<Listing[]>([]);
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('listings').select('*, city:cities(*)').eq('profile_id', user.id).order('created_at', { ascending: false }),
      supabase.from('crm_leads').select('*').eq('developer_id', user.id).order('created_at', { ascending: false }),
    ]).then(([listRes, leadRes]) => {
      if (listRes.data) setListings(listRes.data as Listing[]);
      if (leadRes.data) setLeads(leadRes.data as CrmLead[]);
      setLoading(false);
    });
  }, [user]);

  if (!user) return null;

  const totalViews = listings.reduce((sum, l) => sum + (l.views_count || 0), 0);
  const hotLeads = leads.filter(l => l.lead_quality === 'hot').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-navy text-cream py-10 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-serif font-bold text-gold">Developer Dashboard</h1>
          <p className="text-cream/50 text-sm mt-1">Manage your projects and leads</p>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-6">
          {([{id:'overview',l:'Overview'},{id:'projects',l:'Projects'},{id:'leads',l:'Leads'}] as {id:Tab;l:string}[]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === t.id ? 'bg-white text-navy shadow-sm' : 'text-gray-500'}`}>{t.l}</button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat icon={Building2} label="Total Projects" value={listings.length} />
            <Stat icon={Users} label="Total Leads" value={leads.length} />
            <Stat icon={Flame} label="Hot Leads" value={hotLeads} />
            <Stat icon={TrendingUp} label="Total Views" value={totalViews} />
          </div>
        )}

        {tab === 'projects' && (
          <div className="space-y-3">
            {listings.length === 0 ? <p className="text-gray-500 text-center py-12">No projects yet.</p> : listings.map(l => (
              <div key={l.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
                <div><h3 className="font-medium text-navy">{l.title}</h3><p className="text-xs text-gray-400">{l.city?.name}</p></div>
                <span className={`px-2 py-1 rounded-full text-xs ${l.moderation_status === 'approved' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{l.moderation_status}</span>
              </div>
            ))}
          </div>
        )}

        {tab === 'leads' && (
          <div className="space-y-3">
            {leads.length === 0 ? <p className="text-gray-500 text-center py-12">No leads yet.</p> : leads.map(l => (
              <div key={l.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-navy">{l.buyer_name || 'Unknown'}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${l.lead_quality === 'hot' ? 'bg-red-50 text-red-600' : l.lead_quality === 'warm' ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-500'}`}>{l.lead_quality || 'unknown'}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  {l.buyer_phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{l.buyer_phone}</span>}
                  {l.buyer_email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{l.buyer_email}</span>}
                  <span className="capitalize">{l.source}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <Icon className="w-5 h-5 text-gold mb-2" />
      <div className="text-2xl font-bold text-navy">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}
