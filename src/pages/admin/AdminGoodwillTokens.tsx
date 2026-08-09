import { useState, useEffect } from 'react';
import { AdminLayout, logAdminAction } from '../../components/AdminLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Coins, Search, Check, AlertCircle, RefreshCw } from 'lucide-react';

interface Developer {
  id: string;
  company_name: string | null;
  contact_name: string | null;
  email: string | null;
  token_balance: number | null;
}

interface GrantResult {
  success: boolean;
  new_balance: number;
  error: string | null;
}

export function AdminGoodwillTokens() {
  const { user } = useAuth();
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDev, setSelectedDev] = useState<Developer | null>(null);
  const [amount, setAmount] = useState(5);
  const [reason, setReason] = useState('goodwill gesture');
  const [granting, setGranting] = useState(false);
  const [result, setResult] = useState<GrantResult | null>(null);
  const [error, setError] = useState('');

  async function fetchDevelopers() {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('developers')
      .select('id, company_name, contact_name, email, token_balance')
      .order('created_at', { ascending: false });
    if (err) {
      setError('Failed to load developers: ' + err.message);
    } else if (data) {
      setDevelopers(data as Developer[]);
    }
    setLoading(false);
  }

  useEffect(() => { fetchDevelopers(); }, []);

  async function handleGrant() {
    if (!selectedDev || amount <= 0) return;
    setGranting(true);
    setResult(null);
    setError('');

    const { data, error: rpcError } = await supabase.rpc('admin_grant_tokens', {
      p_user_id: selectedDev.id,
      p_amount: amount,
      p_reason: reason,
    });

    if (rpcError) {
      setError(rpcError.message);
      setResult(null);
    } else if (data && data.length > 0) {
      const r = data[0] as GrantResult;
      setResult(r);
      if (r.success) {
        if (user?.email) {
          await logAdminAction(supabase, user.email, 'grant_goodwill_tokens', 'token_transactions', selectedDev.id, { amount, reason, new_balance: r.new_balance });
        }
        fetchDevelopers();
      }
    }

    setGranting(false);
  }

  const filtered = developers.filter(d => {
    const q = search.toLowerCase();
    return !q ||
      (d.company_name?.toLowerCase().includes(q) ?? false) ||
      (d.contact_name?.toLowerCase().includes(q) ?? false) ||
      (d.email?.toLowerCase().includes(q) ?? false);
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif font-bold text-navy flex items-center gap-2">
              <Coins className="w-6 h-6 text-gold" />
              Goodwill Token Credit
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Grant tokens to developers directly. Restricted to admin only.
            </p>
          </div>
          <button onClick={fetchDevelopers} className="p-2 text-gray-500 hover:text-navy rounded-lg hover:bg-gray-100">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {result && (
          <div className={`rounded-xl p-4 text-sm flex items-center gap-2 ${result.success ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
            {result.success ? <Check className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            {result.success
              ? `Successfully granted ${amount} tokens. New balance: ${result.new_balance}`
              : `Grant failed: ${result.error}`}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Developer list */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-200">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name, company, or email…"
                  className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400"
                />
              </div>
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-gray-400 text-sm">Loading developers…</div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">No developers found.</div>
              ) : (
                filtered.map(d => (
                  <button
                    key={d.id}
                    onClick={() => { setSelectedDev(d); setResult(null); }}
                    className={`w-full flex items-center justify-between p-4 border-b border-gray-50 text-left transition-colors hover:bg-gray-50 ${selectedDev?.id === d.id ? 'bg-amber-50 border-l-4 border-l-gold' : ''}`}
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-navy truncate">{d.contact_name || d.company_name || 'Unknown'}</p>
                      <p className="text-xs text-gray-400 truncate">{d.email || d.company_name || d.id.slice(0, 8)}</p>
                    </div>
                    <div className="flex-shrink-0 ml-3 text-right">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-gold bg-gold/10 px-2 py-1 rounded-full">
                        <Coins className="w-3 h-3" />
                        {d.token_balance ?? 0}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Grant panel */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            {selectedDev ? (
              <>
                <h3 className="font-serif font-bold text-navy mb-1">Grant Tokens</h3>
                <p className="text-sm text-gray-500 mb-6">
                  To: <strong className="text-navy">{selectedDev.contact_name || selectedDev.company_name || 'Unknown'}</strong>
                  {' · '}
                  Current balance: <strong className="text-gold">{selectedDev.token_balance ?? 0}</strong>
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount (tokens)</label>
                    <div className="flex items-center gap-2">
                      {[1, 5, 10, 25, 50, 100].map(preset => (
                        <button
                          key={preset}
                          onClick={() => setAmount(preset)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                            amount === preset
                              ? 'bg-navy text-gold border-navy'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-gold/40'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      value={amount}
                      onChange={e => setAmount(parseInt(e.target.value) || 0)}
                      min={1}
                      className="w-full mt-2 px-4 py-2.5 border border-gray-300 rounded-xl text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason</label>
                    <input
                      type="text"
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      placeholder="e.g. goodwill gesture, promotional credit, etc."
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm"
                    />
                  </div>

                  <button
                    onClick={handleGrant}
                    disabled={granting || amount <= 0}
                    className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: '#0a1628' }}
                  >
                    {granting ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Granting…</>
                    ) : (
                      <><Coins className="w-4 h-4" /> Grant {amount} Token{amount !== 1 ? 's' : ''}</>
                    )}
                  </button>

                  <p className="text-xs text-gray-400 text-center">
                    This action is logged and restricted to the admin account.
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <Coins className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-400 text-sm">Select a developer to grant tokens.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
