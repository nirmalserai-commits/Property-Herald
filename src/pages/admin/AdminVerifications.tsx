import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { AdminLayout, logAdminAction } from '../../components/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import type { VerificationRequest } from '../../types/database';
import { CheckCircle, X, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-gold/10 text-gold',
  rejected: 'bg-red-100 text-red-600',
};

const PAGE_SIZE = 20;

export function AdminVerifications() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState<VerificationRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('verification_requests')
      .select('*, profile:profiles(business_name, email, contact_person, phone)', { count: 'exact' });
    if (filter !== 'all') q = q.eq('status', filter);
    q = q.order('created_at', { ascending: false }).range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    const { data, count } = await q;
    setRequests((data ?? []) as VerificationRequest[]);
    setTotal(count ?? 0);
    setLoading(false);
  }, [page, filter]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  async function handleApprove(req: VerificationRequest) {
    setActionLoading(req.id);
    const { error: reqErr } = await supabase.from('verification_requests').update({
      status: 'approved',
      reviewed_by: user!.email,
      reviewed_at: new Date().toISOString(),
    }).eq('id', req.id);

    if (!reqErr) {
      await supabase.from('profiles').update({ is_verified: true }).eq('id', req.user_id);
      await supabase.rpc('admin_grant_tokens', {
        p_user_id: req.user_id,
        p_amount: -5,
        p_reason: 'Verification badge activated (monthly fee deducted)',
      }).then(() => {});
      await logAdminAction(supabase, user!.email!, 'approve_verification', 'verification_requests', req.id, { user_id: req.user_id, type: req.type });
      fetchRequests();
    }
    setActionLoading(null);
  }

  async function handleReject() {
    if (!rejectModal || !rejectReason) return;
    setActionLoading(rejectModal.id);
    const { error } = await supabase.from('verification_requests').update({
      status: 'rejected',
      rejection_reason: rejectReason,
      reviewed_by: user!.email,
      reviewed_at: new Date().toISOString(),
    }).eq('id', rejectModal.id);
    if (!error) {
      await logAdminAction(supabase, user!.email!, 'reject_verification', 'verification_requests', rejectModal.id, { reason: rejectReason });
      fetchRequests();
    }
    setActionLoading(null);
    setRejectModal(null);
    setRejectReason('');
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Filter tabs */}
        <div className="flex items-center gap-3">
          <div className="flex rounded-xl border border-gray-200 overflow-hidden">
            {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
              <button key={f} onClick={() => { setFilter(f); setPage(0); }}
                className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors ${filter === f ? 'bg-navy text-cream' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                {f}
              </button>
            ))}
          </div>
          <p className="text-sm text-gray-500 ml-auto">{total} requests</p>
        </div>

        {/* Cards */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 h-32 animate-pulse border border-gray-100" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
            <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No {filter === 'all' ? '' : filter} verification requests</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map(req => (
              <div key={req.id} className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-serif font-bold text-navy">
                        {(req.profile as { business_name?: string })?.business_name ?? 'Unknown'}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[req.status]}`}>
                        {req.status}
                      </span>
                      <span className="px-2 py-0.5 bg-navy/8 text-navy rounded text-xs font-medium uppercase">{req.type}</span>
                    </div>
                    <p className="text-sm text-gray-500">{(req.profile as { email?: string })?.email} · {(req.profile as { phone?: string })?.phone}</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                      {req.rera_number && (
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">RERA No.</p>
                          <p className="text-sm font-mono font-semibold text-navy">{req.rera_number}</p>
                        </div>
                      )}
                      {req.gst_number && (
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">GST No.</p>
                          <p className="text-sm font-mono font-semibold text-navy">{req.gst_number}</p>
                        </div>
                      )}
                      {req.document_url && (
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Document</p>
                          <a href={req.document_url} target="_blank" rel="noopener noreferrer" className="text-sm text-navy font-semibold hover:text-gold transition-colors">View →</a>
                        </div>
                      )}
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Submitted</p>
                        <p className="text-sm text-navy font-semibold">{new Date(req.created_at).toLocaleDateString('en-IN')}</p>
                      </div>
                    </div>
                    {req.rejection_reason && (
                      <p className="mt-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                        Rejected: {req.rejection_reason}
                      </p>
                    )}
                  </div>

                  {req.status === 'pending' && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleApprove(req)}
                        disabled={actionLoading === req.id}
                        className="flex items-center gap-2 px-4 py-2 bg-navy text-cream rounded-xl text-sm font-display font-semibold hover:bg-navy/90 disabled:opacity-50 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />Approve
                      </button>
                      <button
                        onClick={() => setRejectModal(req)}
                        disabled={actionLoading === req.id}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-display font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
                      >
                        <X className="w-4 h-4" />Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-sm font-medium">{page + 1}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PAGE_SIZE >= total} className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-serif font-bold text-navy text-lg mb-1">Reject Verification Request</h3>
            <p className="text-sm text-gray-500 mb-5">{(rejectModal.profile as { business_name?: string })?.business_name}</p>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason for rejection</label>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} placeholder="e.g. Invalid RERA number, document unclear..."
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 resize-none" />
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setRejectModal(null); setRejectReason(''); }} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={handleReject} disabled={!rejectReason} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-display font-semibold disabled:opacity-50 hover:bg-red-700 transition-colors">Reject</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
