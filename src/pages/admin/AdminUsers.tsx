import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { AdminLayout, logAdminAction } from '../../components/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import type { Profile, TokenWallet, TokenTransaction } from '../../types/database';
import { Search, ChevronDown, Gift, Ban, CheckCircle, X, History, ChevronLeft, ChevronRight, KeyRound, Copy } from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

interface UserRow extends Profile {
  wallet?: TokenWallet;
}

const PAGE_SIZE = 20;

export function AdminUsers() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [grantModal, setGrantModal] = useState<UserRow | null>(null);
  const [grantAmount, setGrantAmount] = useState('');
  const [grantReason, setGrantReason] = useState('');

  const [txModal, setTxModal] = useState<{ user: UserRow; txs: TokenTransaction[] } | null>(null);
  const [resetModal, setResetModal] = useState<UserRow | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetCopied, setResetCopied] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetDone, setResetDone] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('profiles').select('*, city:cities(*)', { count: 'exact' });
    if (search) q = q.ilike('business_name', `%${search}%`);
    q = q.order('created_at', { ascending: false }).range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    const { data, count } = await q;
    if (!data) { setLoading(false); return; }

    const walletRes = await supabase.from('token_wallets').select('*').in('user_id', data.map(d => d.id));
    const wallets = walletRes.data ?? [];
    setUsers(data.map(p => ({ ...p, wallet: wallets.find(w => w.user_id === p.id) })));
    setTotal(count ?? 0);
    setLoading(false);
  }, [page, search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function toggleSuspend(u: UserRow) {
    setActionLoading(u.id);
    const newStatus = !u.is_active;
    const { error: err } = await supabase.from('profiles').update({
      is_active: newStatus,
      account_status: newStatus ? 'active' : 'suspended',
    }).eq('id', u.id);
    if (!err) {
      await logAdminAction(supabase, user!.email!, newStatus ? 'reactivate_user' : 'suspend_user', 'profiles', u.id, { business_name: u.business_name });
      fetchUsers();
    }
    setActionLoading(null);
  }

  async function handleGrantTokens() {
    if (!grantModal || !grantAmount || !grantReason) return;
    setActionLoading(grantModal.id);
    const amount = parseInt(grantAmount, 10);
    if (isNaN(amount) || amount <= 0) { setError('Invalid amount'); setActionLoading(null); return; }
    const { data, error: err } = await supabase.rpc('admin_grant_tokens', {
      p_user_id: grantModal.id,
      p_amount: amount,
      p_reason: grantReason,
    });
    if (err || !data?.success) {
      setError(err?.message || data?.error || 'Failed to grant tokens');
    } else {
      await logAdminAction(supabase, user!.email!, 'grant_tokens', 'token_wallets', grantModal.id, { amount, reason: grantReason });
      setGrantModal(null);
      setGrantAmount('');
      setGrantReason('');
      fetchUsers();
    }
    setActionLoading(null);
  }

  async function openTxHistory(u: UserRow) {
    const { data } = await supabase.from('token_transactions').select('*').eq('user_id', u.id).order('created_at', { ascending: false }).limit(50);
    setTxModal({ user: u, txs: data ?? [] });
  }

  function genPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#';
    let p = '';
    const arr = new Uint32Array(12);
    crypto.getRandomValues(arr);
    for (let i = 0; i < 12; i++) p += chars[arr[i] % chars.length];
    return p;
  }

  function openResetModal(u: UserRow) {
    setResetModal(u);
    setNewPassword(genPassword());
    setResetError('');
    setResetDone('');
    setResetCopied(false);
  }

  async function handleResetPassword() {
    if (!resetModal || !newPassword) return;
    if (newPassword.length < 6) { setResetError('Password must be at least 6 characters'); return; }
    setActionLoading(resetModal.id);
    setResetError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${supabaseUrl}/functions/v1/admin-reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({ user_id: resetModal.id, new_password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setResetError(data.error || 'Failed to reset password');
      } else {
        await logAdminAction(supabase, user!.email!, 'reset_user_password', 'auth.users', resetModal.id, { email: resetModal.email });
        setResetDone('Password updated. Share the temporary password with the user securely.');
      }
    } catch (e: any) {
      setResetError(e.message || 'Network error');
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {error && (
          <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <X className="w-4 h-4 flex-shrink-0" />
            {error}
            <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search by business name..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
            />
          </div>
          <p className="text-sm text-gray-500">{total} total users</p>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Business', 'Email', 'Type', 'Tokens', 'Joined', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-display font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}><td colSpan={7} className="px-4 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                  ))
                ) : users.map(u => (
                  <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${!u.is_active ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-navy">{u.business_name}</div>
                      <div className="text-xs text-gray-400">{u.contact_person}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-navy/8 text-navy rounded text-xs font-medium capitalize">{u.business_type}</span>
                    </td>
                    <td className="px-4 py-3 font-display font-bold text-navy">
                      {u.wallet?.balance?.toLocaleString() ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(u.created_at).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${u.is_active ? 'bg-gold/10 text-gold border border-gold/25' : 'bg-red-100 text-red-600'}`}>
                        {u.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openResetModal(u)}
                          title="Reset password"
                          className="p-1.5 rounded-lg hover:bg-navy/10 text-gray-500 hover:text-navy transition-colors"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openTxHistory(u)}
                          title="Transaction history"
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-navy transition-colors"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setGrantModal(u)}
                          title="Grant tokens"
                          className="p-1.5 rounded-lg hover:bg-gold/10 text-gray-500 hover:text-gold transition-colors"
                        >
                          <Gift className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => toggleSuspend(u)}
                          disabled={actionLoading === u.id}
                          title={u.is_active ? 'Suspend' : 'Reactivate'}
                          className={`p-1.5 rounded-lg transition-colors ${u.is_active ? 'hover:bg-red-50 text-gray-500 hover:text-red-600' : 'hover:bg-gold/10 text-gray-500 hover:text-gold'}`}
                        >
                          {u.is_active ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium">{page + 1}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PAGE_SIZE >= total} className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Export */}
        <button
          onClick={() => {
            const csv = ['Business,Email,Type,Tokens,Joined,Status',
              ...users.map(u => `"${u.business_name}","${u.email}",${u.business_type},${u.wallet?.balance ?? 0},${new Date(u.created_at).toLocaleDateString()},${u.is_active ? 'Active' : 'Suspended'}`)
            ].join('\n');
            const a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
            a.download = `users_${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
          }}
          className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-2"
        >
          <ChevronDown className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Grant Tokens Modal */}
      {grantModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-serif font-bold text-navy text-lg mb-1">Grant Bonus Tokens</h3>
            <p className="text-sm text-gray-500 mb-5">To: {grantModal.business_name}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Token Amount</label>
                <input type="number" min="1" value={grantAmount} onChange={e => setGrantAmount(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
                  placeholder="e.g. 50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason</label>
                <input type="text" value={grantReason} onChange={e => setGrantReason(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
                  placeholder="e.g. Welcome bonus, Support credit..." />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setGrantModal(null)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleGrantTokens} disabled={!grantAmount || !grantReason || !!actionLoading} className="flex-1 px-4 py-2.5 bg-navy text-cream rounded-xl text-sm font-display font-semibold disabled:opacity-50 hover:bg-navy/90 transition-colors">
                {actionLoading ? 'Granting...' : 'Grant Tokens'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction History Modal */}
      {txModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-navy">Transaction History</h3>
                <p className="text-sm text-gray-400">{txModal.user.business_name}</p>
              </div>
              <button onClick={() => setTxModal(null)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50">
                  <tr>
                    {['Date', 'Type', 'Amount', 'Reason', 'Balance After'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {txModal.txs.map(tx => (
                    <tr key={tx.id}>
                      <td className="px-4 py-3 text-xs text-gray-500">{new Date(tx.created_at).toLocaleDateString('en-IN')}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${tx.type === 'purchase' || tx.type === 'bonus' ? 'bg-gold/10 text-gold' : 'bg-red-100 text-red-600'}`}>{tx.type}</span></td>
                      <td className={`px-4 py-3 font-bold font-display ${tx.amount > 0 ? 'text-gold' : 'text-red-600'}`}>{tx.amount > 0 ? '+' : ''}{tx.amount}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{tx.reason}</td>
                      <td className="px-4 py-3 font-display font-semibold text-navy">{tx.balance_after}</td>
                    </tr>
                  ))}
                  {txModal.txs.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">No transactions yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-navy">Reset Password</h3>
                <p className="text-sm text-gray-400">{resetModal.email}</p>
              </div>
              <button onClick={() => setResetModal(null)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              {resetDone ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-green-50 rounded-xl">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-green-800">{resetDone}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Temporary password:</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 font-mono text-navy font-bold tracking-wide break-all">{newPassword}</code>
                      <button
                        onClick={() => { navigator.clipboard?.writeText(newPassword); setResetCopied(true); setTimeout(() => setResetCopied(false), 1500); }}
                        className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors flex-shrink-0"
                        title="Copy"
                      >
                        {resetCopied ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <button onClick={() => setResetModal(null)} className="w-full px-4 py-2.5 bg-navy text-cream rounded-xl text-sm font-display font-semibold hover:bg-navy/90 transition-colors">
                    Done
                  </button>
                </div>
              ) : (
                <>
                  {resetError && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-sm text-red-700">
                      <X className="w-4 h-4 flex-shrink-0" /> {resetError}
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">New temporary password</label>
                    <div className="flex items-center gap-2">
                      <input
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl font-mono text-sm focus:ring-2 focus:ring-gold/40 focus:border-gold/60 outline-none"
                      />
                      <button
                        onClick={() => { navigator.clipboard?.writeText(newPassword); setResetCopied(true); setTimeout(() => setResetCopied(false), 1500); }}
                        className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors flex-shrink-0"
                        title="Copy"
                      >
                        {resetCopied ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => setNewPassword(genPassword())}
                        className="px-3 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500 text-xs font-semibold transition-colors flex-shrink-0"
                      >
                        New
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={handleResetPassword}
                    disabled={!!actionLoading || newPassword.length < 6}
                    className="w-full px-4 py-2.5 bg-navy text-cream rounded-xl text-sm font-display font-semibold disabled:opacity-50 hover:bg-navy/90 transition-colors"
                  >
                    {actionLoading ? 'Resetting...' : 'Reset Password'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
