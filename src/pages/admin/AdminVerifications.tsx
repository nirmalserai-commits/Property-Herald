import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { AdminLayout, logAdminAction } from '../../components/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import type { VerificationRequest } from '../../types/database';
import { CheckCircle, X, Clock, ChevronLeft, ChevronRight, FileCheck } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-gold/10 text-gold',
  rejected: 'bg-red-100 text-red-600',
};

const PAGE_SIZE = 20;

type IdentityProfile = {
  id: string;
  business_name: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  pan_number: string | null;
  emirates_id_number: string | null;
  id_document_url: string | null;
  identity_verified: boolean | null;
  updated_at: string;
};

export function AdminVerifications() {
  const { user } = useAuth();

  // ── Top-level: which verification type is being reviewed ──
  const [verificationType, setVerificationType] = useState<'business' | 'identity'>('business');

  // ── Business (RERA/GST) verification state — unchanged ──
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
      .from('verifications')
      .select('*, profile:profiles(business_name, email, contact_person, phone)', { count: 'exact' });
    if (filter !== 'all') q = q.eq('status', filter);
    q = q.order('created_at', { ascending: false }).range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    const { data, count } = await q;
    setRequests((data ?? []) as VerificationRequest[]);
    setTotal(count ?? 0);
    setLoading(false);
  }, [page, filter]);

  useEffect(() => { if (verificationType === 'business') fetchRequests(); }, [fetchRequests, verificationType]);

  async function handleApprove(req: VerificationRequest) {
    setActionLoading(req.id);
    const { error: reqErr } = await supabase.from('verifications').update({
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
      await logAdminAction(supabase, user!.email!, 'approve_verification', 'verifications', req.id, { user_id: req.user_id, type: req.type });
      fetchRequests();
    }
    setActionLoading(null);
  }

  async function handleReject() {
    if (!rejectModal || !rejectReason) return;
    setActionLoading(rejectModal.id);
    const { error } = await supabase.from('verifications').update({
      status: 'rejected',
      rejection_reason: rejectReason,
      reviewed_by: user!.email,
      reviewed_at: new Date().toISOString(),
    }).eq('id', rejectModal.id);
    if (!error) {
      await logAdminAction(supabase, user!.email!, 'reject_verification', 'verifications', rejectModal.id, { reason: rejectReason });
      fetchRequests();
    }
    setActionLoading(null);
    setRejectModal(null);
    setRejectReason('');
  }

  // ── Identity Documents (PAN / Emirates ID) state — NEW ──
  const [idProfiles, setIdProfiles] = useState<IdentityProfile[]>([]);
  const [idTotal, setIdTotal] = useState(0);
  const [idPage, setIdPage] = useState(0);
  const [idFilter, setIdFilter] = useState<'all' | 'pending' | 'approved'>('pending');
  const [idLoading, setIdLoading] = useState(true);
  const [idActionLoading, setIdActionLoading] = useState<string | null>(null);
  const [idRejectModal, setIdRejectModal] = useState<IdentityProfile | null>(null);

  const fetchIdentityProfiles = useCallback(async () => {
    setIdLoading(true);
    let q = supabase
      .from('profiles')
      .select('id, business_name, contact_person, email, phone, pan_number, emirates_id_number, id_document_url, identity_verified, updated_at', { count: 'exact' })
      .not('id_document_url', 'is', null);
    if (idFilter === 'pending') q = q.or('identity_verified.is.null,identity_verified.eq.false');
    if (idFilter === 'approved') q = q.eq('identity_verified', true);
    q = q.order('updated_at', { ascending: false }).range(idPage * PAGE_SIZE, idPage * PAGE_SIZE + PAGE_SIZE - 1);
    const { data, count } = await q;
    setIdProfiles((data ?? []) as IdentityProfile[]);
    setIdTotal(count ?? 0);
    setIdLoading(false);
  }, [idPage, idFilter]);

  useEffect(() => { if (verificationType === 'identity') fetchIdentityProfiles(); }, [fetchIdentityProfiles, verificationType]);

  async function handleApproveIdentity(p: IdentityProfile) {
    setIdActionLoading(p.id);
    const { error } = await supabase.from('profiles').update({ identity_verified: true }).eq('id', p.id);
    if (!error) {
      await logAdminAction(supabase, user!.email!, 'approve_identity', 'profiles', p.id, {
        document_type: p.emirates_id_number ? 'emirates_id' : 'pan',
      });
      fetchIdentityProfiles();
    }
    setIdActionLoading(null);
  }

  async function handleViewIdentityDoc(path: string) {
    const { data, error } = await supabase.storage.from('identity-documents').createSignedUrl(path, 300);
    if (error || !data?.signedUrl) {
      alert('Could not open document: ' + (error?.message ?? 'unknown error'));
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  }

  async function handleRejectIdentity() {
    if (!idRejectModal) return;
    setIdActionLoading(idRejectModal.id);
    const { error } = await supabase.from('profiles').update({ id_document_url: null }).eq('id', idRejectModal.id);
    if (!error) {
      await logAdminAction(supabase, user!.email!, 'reject_identity', 'profiles', idRejectModal.id, {});
      fetchIdentityProfiles();
    }
    setIdActionLoading(null);
    setIdRejectModal(null);
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Verification type toggle */}
        <div className="flex rounded-xl border border-gray-200 overflow-hidden w-fit">
          <button onClick={() => setVerificationType('business')}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${verificationType === 'business' ? 'bg-navy text-cream' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
            Business (RERA/GST)
          </button>
          <button onClick={() => setVerificationType('identity')}
            className={`px-4 py-2.5 text-sm font-medium transition-colors flex items-center gap-1.5 ${verificationType === 'identity' ? 'bg-navy text-cream' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
            <FileCheck className="w-4 h-4" />Identity Documents
          </button>
        </div>

        {verificationType === 'business' ? (
          <>
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
          </>
        ) : (
          <>
            {/* Identity Documents filter tabs */}
            <div className="flex items-center gap-3">
              <div className="flex rounded-xl border border-gray-200 overflow-hidden">
                {(['all', 'pending', 'approved'] as const).map(f => (
                  <button key={f} onClick={() => { setIdFilter(f); setIdPage(0); }}
                    className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors ${idFilter === f ? 'bg-navy text-cream' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                    {f}
                  </button>
                ))}
              </div>
              <p className="text-sm text-gray-500 ml-auto">{idTotal} submissions</p>
            </div>

            {idLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl p-6 h-32 animate-pulse border border-gray-100" />
                ))}
              </div>
            ) : idProfiles.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
                <FileCheck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No {idFilter === 'all' ? '' : idFilter} identity submissions</p>
              </div>
            ) : (
              <div className="space-y-4">
                {idProfiles.map(p => {
                  const isDubai = !!p.emirates_id_number;
                  const idLabel = isDubai ? 'Emirates ID' : 'PAN No.';
                  const idValue = isDubai ? p.emirates_id_number : p.pan_number;
                  const isApproved = !!p.identity_verified;
                  return (
                    <div key={p.id} className="bg-white rounded-2xl border border-gray-100 p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-serif font-bold text-navy">{p.business_name ?? p.contact_person ?? 'Unknown'}</h3>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${isApproved ? STATUS_COLORS.approved : STATUS_COLORS.pending}`}>
                              {isApproved ? 'approved' : 'pending'}
                            </span>
                            <span className="px-2 py-0.5 bg-navy/8 text-navy rounded text-xs font-medium uppercase">{isDubai ? 'Dubai' : 'India'}</span>
                          </div>
                          <p className="text-sm text-gray-500">{p.email} · {p.phone}</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                            {idValue && (
                              <div className="bg-gray-50 rounded-xl p-3">
                                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">{idLabel}</p>
                                <p className="text-sm font-mono font-semibold text-navy">{idValue}</p>
                              </div>
                            )}
                            {p.id_document_url && (
                              <div className="bg-gray-50 rounded-xl p-3">
                                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Document</p>
                                <button type="button" onClick={() => handleViewIdentityDoc(p.id_document_url!)} className="text-sm text-navy font-semibold hover:text-gold transition-colors">View →</button>
                              </div>
                            )}
                            <div className="bg-gray-50 rounded-xl p-3">
                              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Last Updated</p>
                              <p className="text-sm text-navy font-semibold">{new Date(p.updated_at).toLocaleDateString('en-IN')}</p>
                            </div>
                          </div>
                        </div>

                        {!isApproved && (
                          <div className="flex gap-2 flex-shrink-0">
                            <button
                              onClick={() => handleApproveIdentity(p)}
                              disabled={idActionLoading === p.id}
                              className="flex items-center gap-2 px-4 py-2 bg-navy text-cream rounded-xl text-sm font-display font-semibold hover:bg-navy/90 disabled:opacity-50 transition-colors"
                            >
                              <CheckCircle className="w-4 h-4" />Approve
                            </button>
                            <button
                              onClick={() => setIdRejectModal(p)}
                              disabled={idActionLoading === p.id}
                              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-display font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
                            >
                              <X className="w-4 h-4" />Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {idTotal > PAGE_SIZE && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">{idPage * PAGE_SIZE + 1}–{Math.min((idPage + 1) * PAGE_SIZE, idTotal)} of {idTotal}</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setIdPage(p => Math.max(0, p - 1))} disabled={idPage === 0} className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                  <span className="text-sm font-medium">{idPage + 1}</span>
                  <button onClick={() => setIdPage(p => p + 1)} disabled={(idPage + 1) * PAGE_SIZE >= idTotal} className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Reject Modal — Business */}
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

      {/* Reject Modal — Identity */}
      {idRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-serif font-bold text-navy text-lg mb-1">Reject Identity Document</h3>
            <p className="text-sm text-gray-500 mb-5">{idRejectModal.business_name ?? idRejectModal.contact_person}</p>
            <p className="text-sm text-gray-600 mb-5">This clears their uploaded document and asks them to resubmit. No reason is stored against the profile.</p>
            <div className="flex gap-3">
              <button onClick={() => setIdRejectModal(null)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={handleRejectIdentity} disabled={idActionLoading === idRejectModal.id} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-display font-semibold disabled:opacity-50 hover:bg-red-700 transition-colors">Reject & Clear</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
