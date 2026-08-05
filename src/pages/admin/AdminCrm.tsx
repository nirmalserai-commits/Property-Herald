import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { AdminLayout, logAdminAction } from '../../components/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import type { Lead } from '../../types/database';
import { Search, ChevronLeft, ChevronRight, Clock, Flame, TrendingUp, Download, Phone, X } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-50 text-blue-600',
  contacted: 'bg-amber-50 text-amber-600',
  qualified: 'bg-purple-50 text-purple-600',
  converted: 'bg-green-50 text-green-700',
  lost: 'bg-red-50 text-red-600',
};

const PAGE_SIZE = 20;

export function AdminCrm() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('leads').select('*, listing:listings(*), owner:profiles(business_name, email)', { count: 'exact' });
    if (statusFilter !== 'all') q = q.eq('status', statusFilter);
    if (search) q = q.ilike('name', `%${search}%`);
    q = q.order('created_at', { ascending: false }).range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    const { data, count } = await q;
    setLeads((data ?? []) as Lead[]);
    setTotal(count ?? 0);
    setLoading(false);
  }, [page, statusFilter, search]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from('leads').update({ status }).eq('id', id);
    if (!error) {
      if (user) await logAdminAction(supabase, user.email!, 'update_lead_status', 'leads', id, { status });
      fetchLeads();
    }
  }

  function exportCsv() {
    const csv = ['Name,Phone,Email,Status,Source,Intent Score,Comfort Hours,Created', ...leads.map(l =>
      `"${l.preferred_name ?? l.name}","${l.phone}","${l.email ?? ''}","${l.status}","${l.source}",${l.intent_score},"${l.comfort_hours ?? ''}","${new Date(l.created_at).toLocaleDateString()}"`
    )].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `crm_leads_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search leads..." className="pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 w-64" />
          </div>
          <div className="flex rounded-xl border border-gray-200 overflow-hidden">
            {['all', 'new', 'contacted', 'qualified', 'converted', 'lost'].map(f => (
              <button key={f} onClick={() => { setStatusFilter(f); setPage(0); }}
                className={`px-3 py-2.5 text-sm font-medium capitalize transition-colors ${statusFilter === f ? 'bg-navy text-cream' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                {f}
              </button>
            ))}
          </div>
          <p className="text-sm text-gray-500 ml-auto">{total} leads</p>
          <button onClick={exportCsv} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Name', 'Phone', 'Developer/Agency', 'Intent', 'Comfort Hours', 'Status', 'Created', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}><td colSpan={8} className="px-4 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                  ))
                ) : leads.map(l => {
                  const intentLabel = l.intent_score >= 70 ? 'High Intent' : l.intent_score >= 40 ? 'Moderate Intent' : 'Early Signal';
                  const intentColor = l.intent_score >= 70 ? 'bg-red-50 text-red-600' : l.intent_score >= 40 ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-500';
                  return (
                    <tr key={l.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-navy">{l.preferred_name ?? l.name}</td>
                      <td className="px-4 py-3 text-gray-600">{l.phone}</td>
                      <td className="px-4 py-3 text-gray-600">{(l.owner as { business_name?: string })?.business_name ?? '—'}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${intentColor}`}>{intentLabel}</span></td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{l.comfort_hours ?? '—'}</td>
                      <td className="px-4 py-3">
                        <select value={l.status} onChange={e => updateStatus(l.id, e.target.value)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-gold/50 capitalize">
                          {['new', 'contacted', 'qualified', 'converted', 'lost'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">{new Date(l.created_at).toLocaleDateString('en-IN')}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => setDetailLead(l)} className="text-xs text-gold hover:underline">View</button>
                      </td>
                    </tr>
                  );
                })}
                {!loading && leads.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">No leads found</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-sm font-medium">{page + 1}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PAGE_SIZE >= total} className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </div>

      {/* Lead detail modal */}
      {detailLead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDetailLead(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif font-bold text-navy text-lg">{detailLead.preferred_name ?? detailLead.name}</h3>
              <button onClick={() => setDetailLead(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-gray-600"><Phone className="w-4 h-4 text-gold" />{detailLead.phone}</div>
              {detailLead.email && <div className="text-gray-600">{detailLead.email}</div>}
              {detailLead.message && <div className="bg-gray-50 rounded-lg p-3 text-gray-700">{detailLead.message}</div>}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500 uppercase">Intent:</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  detailLead.intent_score >= 70 ? 'bg-red-50 text-red-600' : detailLead.intent_score >= 40 ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-500'
                }`}>
                  {detailLead.intent_score >= 70 ? 'High Intent' : detailLead.intent_score >= 40 ? 'Moderate Intent' : 'Early Signal'} ({detailLead.intent_score})
                </span>
              </div>
              {detailLead.comfort_hours && (
                <div className="flex items-center gap-2 text-navy bg-gold/5 px-3 py-2 rounded-lg">
                  <Clock className="w-4 h-4 text-gold" />
                  Comfort window: {detailLead.comfort_hours}
                </div>
              )}
              <div className="text-xs text-gray-400">Source: {detailLead.source} · Created: {new Date(detailLead.created_at).toLocaleString('en-IN')}</div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
