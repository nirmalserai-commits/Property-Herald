import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { AdminLayout, logAdminAction } from '../../components/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import type { Listing } from '../../types/database';
import { Search, Check, X, Flag, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

type Filter = 'all' | 'pending' | 'approved' | 'rejected' | 'flagged';

const STATUS_COLORS: Record<string, string> = {
  approved: 'bg-gold/10 text-gold',
  pending: 'bg-amber-100 text-amber-700',
  rejected: 'bg-red-100 text-red-600',
  flagged: 'bg-orange-100 text-orange-700',
};

const PAGE_SIZE = 20;

export function AdminListings() {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<Listing | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchListings = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('listings').select('*, profile:profiles(business_name, email, contact_person), city:cities(name)', { count: 'exact' });
    if (filter !== 'all') q = q.eq('moderation_status', filter);
    if (search) q = q.ilike('title', `%${search}%`);
    q = q.order('created_at', { ascending: false }).range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    const { data, count } = await q;
    setListings((data ?? []) as Listing[]);
    setTotal(count ?? 0);
    setLoading(false);
  }, [page, filter, search]);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  async function moderate(listing: Listing, status: 'approved' | 'rejected' | 'flagged', reason?: string) {
    setActionLoading(listing.id);
    const approvalLevel = status === 'approved' ? 'nirmal_approved' : status === 'rejected' ? 'rejected' : 'flagged';
    const { error } = await supabase.from('listings').update({
      moderation_status: status,
      moderation_reason: reason ?? null,
      is_active: status === 'approved',
      approval_level: approvalLevel,
    }).eq('id', listing.id);
    if (!error) {
      await logAdminAction(supabase, user!.email!, `${status}_listing`, 'listings', listing.id, { title: listing.title, reason });
      fetchListings();
    }
    setActionLoading(null);
    setRejectModal(null);
    setRejectReason('');
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search listings..."
              className="pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 w-64"
            />
          </div>
          <div className="flex rounded-xl border border-gray-200 overflow-hidden">
            {(['all', 'pending', 'approved', 'rejected', 'flagged'] as Filter[]).map(f => (
              <button key={f} onClick={() => { setFilter(f); setPage(0); }}
                className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors ${filter === f ? 'bg-navy text-cream' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                {f}
              </button>
            ))}
          </div>
          <p className="text-sm text-gray-500 ml-auto">{total} listings</p>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Listing', 'Owner', 'City', 'Status', 'Created', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-display font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}><td colSpan={6} className="px-4 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                  ))
                ) : listings.map(l => (
                  <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-navy max-w-xs truncate">{l.title}</div>
                      {l.moderation_reason && (
                        <div className="text-xs text-red-500 truncate max-w-xs">{l.moderation_reason}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-700">{(l.profile as { business_name?: string })?.business_name}</div>
                      <div className="text-xs text-gray-400">{(l.profile as { email?: string })?.email}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{(l.city as { name?: string })?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[l.moderation_status] ?? ''}`}>
                        {l.moderation_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{new Date(l.created_at).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {l.moderation_status !== 'approved' && (
                          <button
                            onClick={() => moderate(l, 'approved')}
                            disabled={actionLoading === l.id}
                            title="Approve"
                            className="p-1.5 rounded-lg hover:bg-gold/10 text-gray-400 hover:text-gold transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => setRejectModal(l)}
                          disabled={actionLoading === l.id}
                          title="Reject"
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => moderate(l, 'flagged')}
                          disabled={actionLoading === l.id}
                          title="Flag"
                          className="p-1.5 rounded-lg hover:bg-orange-50 text-gray-400 hover:text-orange-500 transition-colors"
                        >
                          <Flag className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && listings.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">No listings found</td></tr>
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

        <button
          onClick={() => {
            const csv = ['Title,Owner,City,Status,Created', ...listings.map(l =>
              `"${l.title}","${(l.profile as { business_name?: string })?.business_name ?? ''}","${(l.city as { name?: string })?.name ?? ''}",${l.moderation_status},${new Date(l.created_at).toLocaleDateString()}`
            )].join('\n');
            const a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
            a.download = `listings_${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
          }}
          className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-2"
        >
          <ChevronDown className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-serif font-bold text-navy text-lg mb-1">Reject Listing</h3>
            <p className="text-sm text-gray-500 mb-5 truncate">{rejectModal.title}</p>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Rejection Reason</label>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Explain why this listing is being rejected..."
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 resize-none"
            />
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setRejectModal(null); setRejectReason(''); }} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={() => moderate(rejectModal, 'rejected', rejectReason)} disabled={!rejectReason} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-display font-semibold disabled:opacity-50 hover:bg-red-700 transition-colors">
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
