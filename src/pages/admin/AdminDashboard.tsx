import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { AdminLayout } from '../../components/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import { Users, Building2, Coins, ShieldCheck, TrendingUp, UserPlus, Clock, RefreshCw, Calendar, Star, ChevronDown, ChevronUp, Bot, ToggleLeft, ToggleRight, MapPin, Shield, BookOpen, Home, Globe } from 'lucide-react';
import { EmergencyControls } from '../../components/EmergencyControls';

interface Metrics {
  totalUsers: number;
  totalListings: number;
  totalRevenue: number;
  activeSubscriptions: number;
  tokenBurn24h: number;
  newUsersToday: number;
  newListingsToday: number;
  pendingVerifications: number;
  totalBuyers: number;
  totalBookings: number;
}

interface Buyer {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  city_preference: string | null;
  budget_label: string | null;
  intent_score: number;
  deal_type: string | null;
  property_type: string | null;
  timeline: string | null;
  source: string;
  created_at: string;
}

interface Booking {
  id: string;
  buyer_name: string;
  buyer_phone: string;
  buyer_email: string | null;
  preferred_date: string;
  preferred_time: string | null;
  status: string;
  tokens_deducted: number;
  created_at: string;
  listing_id: string;
  developer_id: string;
}

interface IntentConversation {
  id: string;
  intent_score: number;
  converted: boolean;
  escalated: boolean;
  created_at: string;
  ambassador_id: string;
}

interface NGirl {
  id: string;
  name: string;
  persona: string;
  language: string;
  avatar_url: string | null;
  active: boolean;
  sort_order: number;
  assignment_rules: Record<string, unknown>;
}

type Tab = 'overview' | 'buyers' | 'bookings' | 'intent' | 'ngirls' | 'emergency';

export function AdminDashboard() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [tab, setTab] = useState<Tab>('overview');

  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [conversations, setConversations] = useState<IntentConversation[]>([]);
  const [tabLoading, setTabLoading] = useState(false);
  const [buyerSort, setBuyerSort] = useState<{ col: keyof Buyer; dir: 'asc' | 'desc' }>({ col: 'intent_score', dir: 'desc' });
  const [ngirls, setNgirls] = useState<NGirl[]>([]);
  const [ngirlsLoading, setNgirlsLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      { count: totalUsers },
      { count: totalListings },
      { data: revenueData },
      { count: activeSubscriptions },
      { data: burnData },
      { count: newUsersToday },
      { count: newListingsToday },
      { count: pendingVerifications },
      { count: totalBuyers },
      { count: totalBookings },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('listings').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('invoices').select('total_amount').eq('payment_status', 'Paid'),
      supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('token_transactions').select('amount').eq('type', 'burn').gte('created_at', yesterday.toISOString()),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
      supabase.from('listings').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
      supabase.from('verification_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('buyers').select('*', { count: 'exact', head: true }),
      supabase.from('show_apartment_bookings').select('*', { count: 'exact', head: true }),
    ]);

    const totalRevenue = revenueData?.reduce((sum, r) => sum + Number(r.total_amount), 0) ?? 0;
    const tokenBurn24h = burnData?.reduce((sum, t) => sum + Math.abs(t.amount), 0) ?? 0;

    setMetrics({
      totalUsers: totalUsers ?? 0,
      totalListings: totalListings ?? 0,
      totalRevenue,
      activeSubscriptions: activeSubscriptions ?? 0,
      tokenBurn24h,
      newUsersToday: newUsersToday ?? 0,
      newListingsToday: newListingsToday ?? 0,
      pendingVerifications: pendingVerifications ?? 0,
      totalBuyers: totalBuyers ?? 0,
      totalBookings: totalBookings ?? 0,
    });
    setLastRefresh(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  const fetchTabData = useCallback(async (t: Tab) => {
    if (t === 'overview') return;
    setTabLoading(true);
    if (t === 'buyers') {
      const { data } = await supabase
        .from('buyers')
        .select('id, full_name, email, phone, city_preference, budget_label, intent_score, deal_type, property_type, timeline, source, created_at')
        .order('intent_score', { ascending: false })
        .limit(100);
      if (data) setBuyers(data as Buyer[]);
    } else if (t === 'bookings') {
      const { data } = await supabase
        .from('show_apartment_bookings')
        .select('id, buyer_name, buyer_phone, buyer_email, preferred_date, preferred_time, status, tokens_deducted, created_at, listing_id, developer_id')
        .order('created_at', { ascending: false })
        .limit(100);
      if (data) setBookings(data as Booking[]);
    } else if (t === 'intent') {
      const { data } = await supabase
        .from('ambassador_conversations')
        .select('id, intent_score, converted, escalated, created_at, ambassador_id')
        .order('intent_score', { ascending: false })
        .limit(50);
      if (data) setConversations(data as IntentConversation[]);
    } else if (t === 'ngirls') {
      setNgirlsLoading(true);
      const { data } = await supabase
        .from('ambassadors')
        .select('id, name, persona, language, avatar_url, active, sort_order, assignment_rules')
        .order('sort_order');
      if (data) setNgirls(data as NGirl[]);
      setNgirlsLoading(false);
    }
    setTabLoading(false);
  }, []);

  useEffect(() => { fetchTabData(tab); }, [tab, fetchTabData]);

  const cards = metrics ? [
    { label: 'Total Developers', value: metrics.totalUsers.toLocaleString(), icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10', link: '/admin/users' },
    { label: 'Active Listings', value: metrics.totalListings.toLocaleString(), icon: Building2, color: 'text-gold', bg: 'bg-gold/10', link: '/admin/listings' },
    { label: 'Total Revenue', value: `₹${metrics.totalRevenue.toLocaleString('en-IN')}`, icon: TrendingUp, color: 'text-gold', bg: 'bg-gold/10', link: '/admin/analytics' },
    { label: 'Active Subscriptions', value: metrics.activeSubscriptions.toLocaleString(), icon: Coins, color: 'text-purple-400', bg: 'bg-purple-500/10', link: '/admin/users' },
    { label: 'Token Burn (24h)', value: metrics.tokenBurn24h.toLocaleString(), icon: Coins, color: 'text-orange-400', bg: 'bg-orange-500/10', link: '/admin/users' },
    { label: 'Registered Buyers', value: metrics.totalBuyers.toLocaleString(), icon: UserPlus, color: 'text-cyan-400', bg: 'bg-cyan-500/10', link: '#', onClick: () => setTab('buyers') },
    { label: 'Show Bookings', value: metrics.totalBookings.toLocaleString(), icon: Calendar, color: 'text-emerald-400', bg: 'bg-emerald-500/10', link: '#', onClick: () => setTab('bookings') },
    { label: 'Pending Verifications', value: metrics.pendingVerifications.toLocaleString(), icon: ShieldCheck, color: metrics.pendingVerifications > 0 ? 'text-amber-400' : 'text-gray-400', bg: metrics.pendingVerifications > 0 ? 'bg-amber-500/10' : 'bg-gray-500/10', link: '/admin/verifications', urgent: metrics.pendingVerifications > 0 },
  ] : [];

  const sortedBuyers = [...buyers].sort((a, b) => {
    const va = a[buyerSort.col] ?? '';
    const vb = b[buyerSort.col] ?? '';
    const cmp = va < vb ? -1 : va > vb ? 1 : 0;
    return buyerSort.dir === 'asc' ? cmp : -cmp;
  });

  function toggleSort(col: keyof Buyer) {
    setBuyerSort(s => s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'desc' });
  }

  async function toggleNGirl(id: string, currentActive: boolean) {
    setTogglingId(id);
    await supabase.from('ambassadors').update({ active: !currentActive }).eq('id', id);
    setNgirls(prev => prev.map(g => g.id === id ? { ...g, active: !currentActive } : g));
    setTogglingId(null);
  }

  function getPodLabel(girl: NGirl): string {
    const rules = girl.assignment_rules as Record<string, string>;
    if (rules?.pod_label) return rules.pod_label;
    if (rules?.pod) return rules.pod;
    return 'General';
  }

  function getPodCode(girl: NGirl): string {
    const rules = girl.assignment_rules as Record<string, string>;
    return rules?.pod_code ?? '?';
  }

  function getIdCode(girl: NGirl): string {
    const rules = girl.assignment_rules as Record<string, string>;
    return rules?.id_code ?? '';
  }

  function getTerritories(girl: NGirl): string {
    const rules = girl.assignment_rules as Record<string, string | string[]>;
    if (Array.isArray(rules?.territories)) return (rules.territories as string[]).join(', ');
    if (rules?.territory) return String(rules.territory);
    return '—';
  }

  function getReportsTo(girl: NGirl): string {
    const rules = girl.assignment_rules as Record<string, string>;
    return rules?.reports_to ?? '—';
  }

  function getPodIcon(podCode: string) {
    if (podCode === 'R' || podCode === 'L') return Shield;
    if (podCode === 'I') return Globe;
    if (podCode === 'CW' || podCode === 'SM' || podCode === 'PC') return BookOpen;
    if (podCode === 'D' || podCode === 'IF') return TrendingUp;
    if (podCode === 'AF') return Globe;
    return Bot;
  }

  const POD_ORDER = ['R','C','S','I','IF','CW','D','DF','PC','SM','AF','L','SR'];

  function SortIcon({ col }: { col: keyof Buyer }) {
    if (buyerSort.col !== col) return null;
    return buyerSort.dir === 'asc' ? <ChevronUp className="w-3 h-3 inline" /> : <ChevronDown className="w-3 h-3 inline" />;
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'buyers', label: `Buyers${metrics ? ` (${metrics.totalBuyers})` : ''}` },
    { id: 'bookings', label: `Bookings${metrics ? ` (${metrics.totalBookings})` : ''}` },
    { id: 'intent', label: 'Intent Leaders' },
    { id: 'ngirls', label: 'N-Girls Control' },
    { id: 'emergency', label: 'Emergency' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-gray-500 text-sm">Welcome back, {user?.email}</p>
          <button
            onClick={fetchMetrics}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-navy text-cream rounded-xl text-sm font-medium hover:bg-navy/90 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? 'bg-white text-navy shadow-sm' : 'text-gray-500 hover:text-navy'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Emergency tab */}
        {tab === 'emergency' && <EmergencyControls />}

        {/* Overview tab */}
        {tab === 'overview' && (
          <>
            {loading && !metrics ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl p-6 h-32 animate-pulse border border-gray-100" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {cards.map(({ label, value, icon: Icon, color, bg, link, urgent, onClick }) => (
                  <div
                    key={label}
                    onClick={onClick}
                    className={`${urgent ? 'border-amber-200' : 'border-gray-100'} ${onClick ? 'cursor-pointer' : ''}`}
                  >
                    {onClick ? (
                      <div className={`bg-white rounded-2xl p-6 border transition-all hover:shadow-md hover:-translate-y-0.5 group border-gray-100`}>
                        <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-4`}>
                          <Icon className={`w-5 h-5 ${color}`} />
                        </div>
                        <p className={`text-2xl font-bold font-display text-navy`}>{value}</p>
                        <p className="text-xs text-gray-500 mt-1 font-medium">{label}</p>
                      </div>
                    ) : (
                      <Link
                        to={link}
                        className={`bg-white rounded-2xl p-6 border transition-all hover:shadow-md hover:-translate-y-0.5 group block ${urgent ? 'border-amber-200' : 'border-gray-100'}`}
                      >
                        <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-4`}>
                          <Icon className={`w-5 h-5 ${color}`} />
                        </div>
                        <p className={`text-2xl font-bold font-display text-navy group-hover:${color} transition-colors`}>{value}</p>
                        <p className="text-xs text-gray-500 mt-1 font-medium">{label}</p>
                        {urgent && <div className="mt-2 w-2 h-2 bg-amber-400 rounded-full animate-pulse" />}
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-serif font-bold text-navy mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { to: '/admin/verifications', label: 'Review Verifications', icon: ShieldCheck },
                  { to: '/admin/listings', label: 'Moderate Listings', icon: Building2 },
                  { to: '/admin/broadcast', label: 'Send Broadcast', icon: Building2 },
                  { to: '/admin/token-settings', label: 'Edit Token Rates', icon: Coins },
                ].map(({ to, label, icon: Icon }) => (
                  <Link key={to} to={to} className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 hover:bg-navy hover:text-cream transition-all group text-sm font-medium text-navy">
                    <Icon className="w-4 h-4 text-gold group-hover:text-gold" />
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            <p className="text-xs text-gray-400 flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              Last refreshed: {lastRefresh.toLocaleTimeString()}
            </p>
          </>
        )}

        {/* Buyers tab */}
        {tab === 'buyers' && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-navy">Registered Buyers</h2>
              <span className="text-sm text-gray-500">{buyers.length} records</span>
            </div>
            {tabLoading ? (
              <div className="p-8 text-center">
                <div className="w-6 h-6 border-2 border-navy/20 border-t-navy rounded-full animate-spin mx-auto" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {([
                        ['full_name', 'Name'],
                        ['email', 'Email'],
                        ['phone', 'Phone'],
                        ['city_preference', 'City'],
                        ['budget_label', 'Budget'],
                        ['deal_type', 'Deal'],
                        ['timeline', 'Timeline'],
                        ['intent_score', 'Score'],
                        ['source', 'Source'],
                        ['created_at', 'Joined'],
                      ] as [keyof Buyer, string][]).map(([col, label]) => (
                        <th
                          key={col}
                          onClick={() => toggleSort(col)}
                          className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-navy transition-colors select-none"
                        >
                          {label} <SortIcon col={col} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {sortedBuyers.map(b => (
                      <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-navy whitespace-nowrap">{b.full_name || '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{b.email || '—'}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{b.phone || '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{b.city_preference || '—'}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">{b.budget_label || '—'}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full bg-navy/5 text-navy text-xs font-medium capitalize">{b.deal_type || '—'}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{b.timeline?.replace(/_/g, ' ') || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${b.intent_score >= 75 ? 'bg-green-500' : b.intent_score >= 50 ? 'bg-gold' : 'bg-gray-300'}`}
                                style={{ width: `${b.intent_score}%` }}
                              />
                            </div>
                            <span className={`text-xs font-bold ${b.intent_score >= 75 ? 'text-green-600' : b.intent_score >= 50 ? 'text-gold' : 'text-gray-400'}`}>
                              {b.intent_score}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium capitalize">{b.source}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                          {new Date(b.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                    {sortedBuyers.length === 0 && (
                      <tr>
                        <td colSpan={10} className="px-4 py-10 text-center text-gray-400 text-sm">No buyers registered yet</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Bookings tab */}
        {tab === 'bookings' && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-navy">Show Apartment Bookings</h2>
              <span className="text-sm text-gray-500">{bookings.length} records</span>
            </div>
            {tabLoading ? (
              <div className="p-8 text-center">
                <div className="w-6 h-6 border-2 border-navy/20 border-t-navy rounded-full animate-spin mx-auto" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {['Buyer', 'Phone', 'Email', 'Date', 'Time', 'Status', 'Tokens', 'Booked'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {bookings.map(b => (
                      <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-navy whitespace-nowrap">{b.buyer_name}</td>
                        <td className="px-4 py-3 text-gray-600">{b.buyer_phone}</td>
                        <td className="px-4 py-3 text-gray-600">{b.buyer_email || '—'}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {new Date(b.preferred_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{b.preferred_time || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                            b.status === 'confirmed' ? 'bg-green-50 text-green-700 border border-green-100' :
                            b.status === 'cancelled' ? 'bg-red-50 text-red-600 border border-red-100' :
                            b.status === 'completed' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                            'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}>{b.status}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-orange-600 font-semibold text-xs">-{b.tokens_deducted}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                          {new Date(b.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                    {bookings.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-10 text-center text-gray-400 text-sm">No bookings yet</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Intent Leaders tab */}
        {tab === 'intent' && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-navy">Top Intent Conversations</h2>
              <span className="text-sm text-gray-500">Sorted by intent score</span>
            </div>
            {tabLoading ? (
              <div className="p-8 text-center">
                <div className="w-6 h-6 border-2 border-navy/20 border-t-navy rounded-full animate-spin mx-auto" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {['Rank', 'Intent Score', 'Converted', 'Escalated', 'Started'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {conversations.map((c, i) => (
                      <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          {i < 3 ? (
                            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-gold/20 text-gold' : i === 1 ? 'bg-gray-200 text-gray-600' : 'bg-amber-100 text-amber-700'}`}>
                              {i + 1}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs pl-2">{i + 1}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${c.intent_score >= 75 ? 'bg-green-500' : c.intent_score >= 50 ? 'bg-gold' : 'bg-gray-300'}`}
                                style={{ width: `${c.intent_score}%` }}
                              />
                            </div>
                            <span className={`text-sm font-bold ${c.intent_score >= 75 ? 'text-green-600' : c.intent_score >= 50 ? 'text-gold' : 'text-gray-400'}`}>
                              {c.intent_score}
                            </span>
                            {i === 0 && <Star className="w-3.5 h-3.5 text-gold fill-gold" />}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.converted ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-gray-50 text-gray-500 border border-gray-100'}`}>
                            {c.converted ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.escalated ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-gray-50 text-gray-500 border border-gray-100'}`}>
                            {c.escalated ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                          {new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                    {conversations.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-gray-400 text-sm">No conversations yet</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* N-Girls Control Panel tab */}
        {tab === 'ngirls' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-navy">N-Girls Control Panel</h2>
                <p className="text-sm text-gray-500 mt-0.5">Manage AI assistant deployment — toggle each daughter ON or OFF by pod and territory</p>
              </div>
              <Link to="/admin/ambassadors" className="flex items-center gap-2 px-4 py-2 bg-navy text-cream rounded-xl text-sm font-medium hover:bg-navy/90 transition-colors">
                <Bot className="w-4 h-4" />Full Ambassador Settings
              </Link>
            </div>

            {ngirlsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 h-40 animate-pulse" />
                ))}
              </div>
            ) : ngirls.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <Bot className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium mb-1">No N-Girls configured yet</p>
                <p className="text-gray-400 text-sm mb-4">Add your first AI assistant daughter in Ambassador Settings</p>
                <Link to="/admin/ambassadors" className="inline-flex items-center gap-2 px-5 py-2.5 bg-navy text-cream rounded-xl text-sm font-medium hover:bg-navy/90 transition-colors">
                  <Bot className="w-4 h-4" />Go to Ambassador Settings
                </Link>
              </div>
            ) : (() => {
              const podCodes = POD_ORDER.filter(code =>
                ngirls.some(g => getPodCode(g) === code)
              );
              return (
                <div className="space-y-4">
                  {/* Summary strip */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                      <p className="text-2xl font-bold text-navy">{ngirls.length}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Total Daughters</p>
                    </div>
                    <div className="bg-green-50 rounded-2xl border border-green-100 p-4 text-center">
                      <p className="text-2xl font-bold text-green-700">{ngirls.filter(g => g.active).length}</p>
                      <p className="text-xs text-green-600 mt-0.5">Active (ON)</p>
                    </div>
                    <div className="bg-red-50 rounded-2xl border border-red-100 p-4 text-center">
                      <p className="text-2xl font-bold text-red-600">{ngirls.filter(g => !g.active).length}</p>
                      <p className="text-xs text-red-500 mt-0.5">Offline (OFF)</p>
                    </div>
                  </div>

                  {podCodes.map(podCode => {
                    const podGirls = ngirls.filter(g => getPodCode(g) === podCode).sort((a, b) => a.sort_order - b.sort_order);
                    const podLabel = getPodLabel(podGirls[0]);
                    const PodIcon = getPodIcon(podCode);
                    const allOn = podGirls.every(g => g.active);
                    const someOn = podGirls.some(g => g.active);
                    return (
                      <div key={podCode} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                        {/* Pod header */}
                        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-navy/8 flex items-center justify-center">
                              <PodIcon className="w-4 h-4 text-navy" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold text-navy text-sm">{podLabel}</h3>
                                <span className="px-1.5 py-0.5 rounded bg-navy/8 text-navy/60 text-xs font-mono font-semibold">{podCode}</span>
                              </div>
                              <p className="text-xs text-gray-400">{podGirls.length} daughter{podGirls.length !== 1 ? 's' : ''} · {podGirls.filter(g => g.active).length} active</p>
                            </div>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${allOn ? 'bg-green-50 text-green-700 border border-green-100' : someOn ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                            {allOn ? 'All Active' : someOn ? 'Partial' : 'All Offline'}
                          </span>
                        </div>

                        {/* Daughter rows */}
                        <div className="divide-y divide-gray-50">
                          {podGirls.map(girl => (
                            <div key={girl.id} className="px-5 py-3.5 flex items-center gap-3">
                              {/* Avatar */}
                              <div className="w-10 h-10 rounded-full border-2 border-gold/30 overflow-hidden flex-shrink-0 bg-navy/5 flex items-center justify-center">
                                {girl.avatar_url && girl.avatar_url !== '' ? (
                                  <img src={girl.avatar_url} alt={girl.name} className="w-full h-full object-cover object-top" />
                                ) : girl.name === 'Nora' ? (
                                  <img src="/nora-chat.png.png" alt={girl.name} className="w-full h-full object-cover object-top" />
                                ) : (
                                  <span className="text-xs font-bold text-navy/50">{girl.name.slice(0,2).toUpperCase()}</span>
                                )}
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-bold text-navy text-sm">{girl.name}</p>
                                  {getIdCode(girl) && (
                                    <span className="px-1.5 py-0.5 rounded bg-gold/10 text-gold/80 text-xs font-mono font-semibold">{getIdCode(girl)}</span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 truncate">{girl.persona}</p>
                                <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400 flex-wrap">
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                                    <span className="truncate max-w-[160px]">{getTerritories(girl)}</span>
                                  </span>
                                  <span className="hidden sm:inline text-gray-300">·</span>
                                  <span className="hidden sm:inline text-gray-400">→ {getReportsTo(girl)}</span>
                                </div>
                              </div>

                              {/* Toggle */}
                              <button
                                onClick={() => toggleNGirl(girl.id, girl.active)}
                                disabled={togglingId === girl.id}
                                title={girl.active ? 'Turn OFF' : 'Turn ON'}
                                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 ${
                                  girl.active
                                    ? 'bg-green-50 text-green-700 hover:bg-red-50 hover:text-red-600 border border-green-200 hover:border-red-200'
                                    : 'bg-red-50 text-red-600 hover:bg-green-50 hover:text-green-700 border border-red-200 hover:border-green-200'
                                }`}
                              >
                                {togglingId === girl.id ? (
                                  <div className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                                ) : girl.active ? (
                                  <ToggleRight className="w-4 h-4" />
                                ) : (
                                  <ToggleLeft className="w-4 h-4" />
                                )}
                                <span>{girl.active ? 'ON' : 'OFF'}</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
