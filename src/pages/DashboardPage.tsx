import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { Listing, Inquiry, MagazineAd, City, TokenWallet, TokenTransaction } from '../types/database';
import {
  Building2, Users, MessageCircle, BookOpen, Settings, Plus, TrendingUp, Eye,
  Phone, Calendar, CheckCircle, ChevronRight, Edit, Trash2, Coins, AlertTriangle,
  Star, Flame, Shield, Receipt, ArrowRight, X, Zap
} from 'lucide-react';

interface TokenCosts {
  verified_badge_cost: number;
  featured_listing_cost: number;
  hot_property_cost: number;
  whatsapp_lead_cost: number;
}

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtExpiry(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (d < new Date()) return 'Expired';
  return `Expires ${fmtDate(iso)}`;
}
function addDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}
function addMonths(months: number) {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

// ─── root component ─────────────────────────────────────────────────────────

export function DashboardPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [listings, setListings] = useState<Listing[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [magazineAds, setMagazineAds] = useState<MagazineAd[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [wallet, setWallet] = useState<TokenWallet | null>(null);
  const [transactions, setTransactions] = useState<TokenTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalViews: 0, totalInquiries: 0, newInquiries: 0, thisMonthInquiries: 0 });
  const [tokenCosts, setTokenCosts] = useState<TokenCosts>({
    verified_badge_cost: 5,
    featured_listing_cost: 10,
    hot_property_cost: 15,
    whatsapp_lead_cost: 2,
  });

  useEffect(() => {
    supabase.from('site_config')
      .select('key, value')
      .in('key', ['verified_badge_cost', 'featured_listing_cost', 'hot_property_cost', 'whatsapp_lead_cost'])
      .then(({ data }) => {
        if (data) {
          const map = Object.fromEntries(data.map(r => [r.key, Number(r.value)]));
          setTokenCosts(prev => ({ ...prev, ...map }));
        }
      });
  }, []);

  useEffect(() => { if (user) fetchData(); }, [user]);

  async function fetchData() {
    setLoading(true);
    const [
      { data: listingsData },
      { data: inquiriesData },
      { data: adsData },
      { data: citiesData },
      { data: walletData },
      { data: txData },
    ] = await Promise.all([
      supabase.from('listings').select('*, city:cities(*)').eq('profile_id', user!.id),
      supabase.from('inquiries').select('*, listing:listings(*)').eq('profile_id', user!.id).order('created_at', { ascending: false }),
      supabase.from('magazine_ads').select('*, magazine:magazines(*)').eq('profile_id', user!.id),
      supabase.from('cities').select('*').order('name'),
      supabase.from('token_wallets').select('*').eq('user_id', user!.id).maybeSingle(),
      supabase.from('token_transactions').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(10),
    ]);

    if (listingsData) setListings(listingsData as Listing[]);
    if (inquiriesData) {
      setInquiries(inquiriesData as Inquiry[]);
      const newInq = inquiriesData.filter(i => i.status === 'new').length;
      const thisMonth = inquiriesData.filter(i => {
        const d = new Date(i.created_at); const n = new Date();
        return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
      }).length;
      setStats({ totalViews: listingsData?.reduce((a, l) => a + (l.views_count || 0), 0) || 0, totalInquiries: inquiriesData.length, newInquiries: newInq, thisMonthInquiries: thisMonth });
    }
    if (adsData) setMagazineAds(adsData as MagazineAd[]);
    if (citiesData) setCities(citiesData as City[]);
    if (walletData) setWallet(walletData as TokenWallet);
    if (txData) setTransactions(txData as TokenTransaction[]);
    setLoading(false);
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="w-12 h-12 border-4 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.email === 'nirmalserai@gmail.com') return <Navigate to="/admin" replace />;

  const isLowBalance = wallet !== null && wallet.balance < 20;

  const tabs = [
    { id: 'overview',  label: 'Overview',      icon: TrendingUp },
    { id: 'wallet',    label: 'Token Wallet',   icon: Coins,    badge: isLowBalance ? '!' : undefined },
    { id: 'listings',  label: 'My Listings',    icon: Building2 },
    { id: 'inquiries', label: 'Inquiries',      icon: MessageCircle, badge: stats.newInquiries > 0 ? String(stats.newInquiries) : undefined },
    { id: 'magazine',  label: 'Magazine Ads',   icon: BookOpen },
    { id: 'settings',  label: 'Settings',       icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <div className="bg-navy py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <img src="/logo.png.png" alt="Property Herald" className="h-12 w-auto object-contain hidden sm:block"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <div>
                <h1 className="text-2xl font-serif font-bold text-cream">Welcome, {profile?.contact_person || 'Member'}</h1>
                <p className="text-cream/60 mt-0.5 text-sm">{profile?.business_name || 'Your Business'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {wallet !== null && (
                <Link to="/tokens"
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all ${
                    isLowBalance
                      ? 'bg-red-500/20 border-red-400/40 text-red-300 hover:bg-red-500/30'
                      : 'bg-gold/10 border-gold/30 text-gold hover:bg-gold/20'
                  }`}>
                  <Coins className="w-4 h-4" />
                  {wallet.balance} tokens
                  {isLowBalance && <AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
                </Link>
              )}
              <Link to="/directory" className="hidden sm:inline-flex items-center px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-medium text-cream transition-colors">
                <Eye className="w-4 h-4 mr-2" />View Directory
              </Link>
            </div>
          </div>

          {isLowBalance && (
            <div className="mt-4 flex items-center gap-3 px-4 py-3 bg-red-500/15 border border-red-400/30 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span className="text-sm text-red-200">
                Your token balance is low ({wallet?.balance} tokens). Top up now to keep listings and badges active.
              </span>
              <Link to="/tokens" className="ml-auto text-xs font-display font-bold text-gold border border-gold/40 px-3 py-1 rounded-lg hover:bg-gold/10 transition-colors whitespace-nowrap">
                Top Up
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar nav */}
          <div className="lg:w-56 flex-shrink-0">
            <nav className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gold/10">
              {tabs.map(({ id, label, icon: Icon, badge }) => (
                <button key={id} onClick={() => setActiveTab(id)}
                  className={`w-full flex items-center px-4 py-3.5 text-left transition-colors border-l-4 ${
                    activeTab === id
                      ? 'bg-navy/5 text-navy border-l-navy'
                      : 'text-warm-gray hover:bg-cream border-l-transparent'
                  }`}>
                  <Icon className="w-4 h-4 mr-3 flex-shrink-0" />
                  <span className="font-medium text-sm">{label}</span>
                  {badge && (
                    <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-bold ${
                      badge === '!' ? 'bg-red-100 text-red-600' : 'bg-red-500 text-white'
                    }`}>{badge}</span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex-1 min-w-0">
            {activeTab === 'overview'  && <OverviewTab stats={stats} listings={listings} inquiries={inquiries} wallet={wallet} />}
            {activeTab === 'wallet'    && <WalletTab wallet={wallet} transactions={transactions} tokenCosts={tokenCosts} onRefresh={fetchData} />}
            {activeTab === 'listings'  && <ListingsTab listings={listings} cities={cities} loading={loading} walletBalance={wallet?.balance ?? 0} tokenCosts={tokenCosts} onRefresh={fetchData} />}
            {activeTab === 'inquiries' && <InquiriesTab inquiries={inquiries} loading={loading} onRefresh={fetchData} />}
            {activeTab === 'magazine'  && <MagazineTab ads={magazineAds} loading={loading} />}
            {activeTab === 'settings'  && <SettingsTab profile={profile} user={user} wallet={wallet} tokenCosts={tokenCosts} onRefresh={fetchData} />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Overview ────────────────────────────────────────────────────────────────

function OverviewTab({ stats, listings, inquiries, wallet }: { stats: any; listings: Listing[]; inquiries: Inquiry[]; wallet: TokenWallet | null }) {
  const cards = [
    { label: 'Total Views',   value: stats.totalViews,          icon: Eye,           color: 'bg-navy' },
    { label: 'Total Inquiries', value: stats.totalInquiries,    icon: MessageCircle, color: 'bg-gold' },
    { label: 'New Inquiries', value: stats.newInquiries,        icon: TrendingUp,    color: 'bg-burgundy' },
    { label: 'This Month',    value: stats.thisMonthInquiries,  icon: Calendar,      color: 'bg-navy/70' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-serif font-bold text-navy">Dashboard Overview</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl p-6 border border-gold/10 shadow-sm">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${color}`}>
              <Icon className="w-5 h-5 text-cream" />
            </div>
            <p className="text-3xl font-bold font-display text-navy">{value}</p>
            <p className="text-sm text-warm-gray mt-1">{label}</p>
          </div>
        ))}
      </div>

      {wallet !== null && (
        <div className="bg-navy rounded-2xl p-6 border border-gold/20">
          <div className="flex items-center justify-between mb-1">
            <p className="text-cream/70 text-sm font-medium">Token Balance</p>
            <Link to="/tokens" className="text-gold text-xs font-semibold hover:underline">Buy More →</Link>
          </div>
          <p className="text-4xl font-bold font-display text-gold">{wallet.balance}</p>
          <p className="text-cream/50 text-xs mt-1">tokens available · 1 token = ₹20</p>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gold/10 shadow-sm">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-navy">Recent Inquiries</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {inquiries.slice(0, 5).map((inquiry) => (
              <div key={inquiry.id} className="p-4 flex items-start justify-between">
                <div>
                  <p className="font-medium text-navy text-sm">{inquiry.client_name}</p>
                  <p className="text-xs text-warm-gray">{inquiry.client_phone}</p>
                </div>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                  inquiry.status === 'new' ? 'bg-red-100 text-red-700' :
                  inquiry.status === 'contacted' ? 'bg-blue-100 text-blue-700' :
                  inquiry.status === 'converted' ? 'bg-gold/10 text-gold' : 'bg-gray-100 text-gray-600'
                }`}>{inquiry.status}</span>
              </div>
            ))}
            {inquiries.length === 0 && <div className="p-8 text-center text-warm-gray text-sm">No inquiries yet</div>}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gold/10 shadow-sm">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-navy">Active Listings</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {listings.filter(l => l.is_active).slice(0, 5).map((listing) => (
              <div key={listing.id} className="p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-navy text-sm truncate">{listing.title}</p>
                  <p className="text-xs text-warm-gray">{listing.views_count || 0} views</p>
                </div>
                <div className="flex gap-1">
                  {listing.is_featured && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs rounded font-medium">Featured</span>}
                  {listing.is_hot && <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded font-medium">Hot</span>}
                </div>
              </div>
            ))}
            {listings.length === 0 && <div className="p-8 text-center text-warm-gray text-sm">No listings yet</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Wallet ───────────────────────────────────────────────────────────────────

function WalletTab({ wallet, transactions, tokenCosts, onRefresh }: { wallet: TokenWallet | null; transactions: TokenTransaction[]; tokenCosts: TokenCosts; onRefresh: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-serif font-bold text-navy">Token Wallet</h2>
        <Link to="/tokens" className="flex items-center gap-2 px-4 py-2 bg-gold text-navy text-sm font-display font-bold rounded-xl hover:bg-gold-400 transition-colors">
          <Zap className="w-4 h-4" />Buy Tokens
        </Link>
      </div>

      {/* Balance card */}
      <div className="bg-navy rounded-2xl p-8 border border-gold/20">
        <p className="text-xs font-display font-semibold uppercase tracking-widest text-cream/60 mb-2">Current Balance</p>
        <p className="text-7xl font-bold font-display text-gold leading-none">{wallet?.balance ?? 0}</p>
        <p className="text-cream/50 text-sm mt-2">tokens · 1 token = ₹20</p>
        {wallet && wallet.balance < 20 && (
          <div className="mt-4 flex items-center gap-2 text-red-300 text-sm">
            <AlertTriangle className="w-4 h-4" />Low balance — top up to keep features active
          </div>
        )}
      </div>

      {/* Token usage reminder */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Verified Badge', cost: tokenCosts.verified_badge_cost, period: '/month', icon: Shield, color: 'text-blue-600 bg-blue-50' },
          { label: 'Featured Listing', cost: tokenCosts.featured_listing_cost, period: '/week', icon: Star, color: 'text-amber-600 bg-amber-50' },
          { label: 'Hot Property', cost: tokenCosts.hot_property_cost, period: '/week', icon: Flame, color: 'text-red-600 bg-red-50' },
          { label: 'WhatsApp Lead', cost: tokenCosts.whatsapp_lead_cost, period: '/click', icon: MessageCircle, color: 'text-gold bg-gold/5' },
        ].map(({ label, cost, period, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl p-4 border border-gray-100">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-xs text-warm-gray">{label}</p>
            <p className="font-bold text-navy text-sm">{cost} tokens<span className="text-warm-gray font-normal text-xs">{period}</span></p>
          </div>
        ))}
      </div>

      {/* Recent transactions */}
      <div className="bg-white rounded-2xl border border-gold/10 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-navy">Recent Transactions</h3>
          <span className="text-xs text-warm-gray">Last 10</span>
        </div>
        {transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-display font-semibold uppercase tracking-wider text-warm-gray">Date</th>
                  <th className="px-5 py-3 text-left text-xs font-display font-semibold uppercase tracking-wider text-warm-gray">Type</th>
                  <th className="px-5 py-3 text-left text-xs font-display font-semibold uppercase tracking-wider text-warm-gray hidden md:table-cell">Reason</th>
                  <th className="px-5 py-3 text-right text-xs font-display font-semibold uppercase tracking-wider text-warm-gray">Amount</th>
                  <th className="px-5 py-3 text-right text-xs font-display font-semibold uppercase tracking-wider text-warm-gray hidden sm:table-cell">Balance After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-warm-gray whitespace-nowrap">{fmtDate(tx.created_at)}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                        tx.type === 'purchase' ? 'bg-gold/10 text-gold' :
                        tx.type === 'burn'     ? 'bg-orange-100 text-orange-700' :
                        tx.type === 'bonus'    ? 'bg-blue-100 text-blue-700' :
                                                 'bg-gray-100 text-gray-600'
                      }`}>{tx.type}</span>
                    </td>
                    <td className="px-5 py-3 text-warm-gray text-xs hidden md:table-cell max-w-xs truncate">{tx.reason}</td>
                    <td className={`px-5 py-3 text-right font-bold font-display ${tx.amount > 0 ? 'text-gold' : 'text-orange-600'}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount}
                    </td>
                    <td className="px-5 py-3 text-right text-navy hidden sm:table-cell">{tx.balance_after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center">
            <Coins className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-warm-gray text-sm">No transactions yet</p>
            <Link to="/tokens" className="text-gold text-sm font-semibold mt-2 inline-block hover:underline">Buy your first tokens →</Link>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Listings ─────────────────────────────────────────────────────────────────

function ListingsTab({ listings, cities, loading, walletBalance, tokenCosts, onRefresh }: {
  listings: Listing[]; cities: City[]; loading: boolean; walletBalance: number; tokenCosts: TokenCosts; onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [tokenAction, setTokenAction] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<{ listingId: string; msg: string } | null>(null);
  const emptyForm = { title: '', city_id: '', description: '', specialties: '', years_experience: 0, projects_completed: 0, property_types: [] as string[], deal_types: [] as string[] };
  const [formData, setFormData] = useState(emptyForm);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const userId = (await supabase.auth.getUser()).data.user!.id;
    const data = { ...formData, profile_id: userId, specialties: formData.specialties.split(',').map(s => s.trim()).filter(Boolean) };
    if (editingListing) await supabase.from('listings').update(data).eq('id', editingListing.id);
    else await supabase.from('listings').insert(data);
    setShowForm(false); setEditingListing(null); setFormData(emptyForm); onRefresh();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this listing?')) { await supabase.from('listings').delete().eq('id', id); onRefresh(); }
  };

  async function activateFeature(listing: Listing, feature: 'featured' | 'hot') {
    const cost = feature === 'featured' ? tokenCosts.featured_listing_cost : tokenCosts.hot_property_cost;
    const label = feature === 'featured' ? `Featured Listing — 7 days` : `Hot Property Tag — 7 days`;

    if (walletBalance < cost) {
      setTokenError({ listingId: listing.id, msg: `Insufficient tokens. You need ${cost} tokens but have ${walletBalance}.` });
      return;
    }

    setTokenAction(listing.id + feature);
    setTokenError(null);

    const { data } = await supabase.rpc('burn_own_tokens', {
      p_amount: cost,
      p_reason: label,
      p_listing_id: listing.id,
    });

    if (!data?.success) {
      setTokenError({ listingId: listing.id, msg: data?.error || 'Token burn failed' });
      setTokenAction(null);
      return;
    }

    const expiry = addDays(7);
    const update = feature === 'featured'
      ? { is_featured: true, featured_expires_at: expiry }
      : { is_hot: true, hot_expires_at: expiry };

    await supabase.from('listings').update(update).eq('id', listing.id);
    setTokenAction(null);
    onRefresh();
  }

  async function deactivateFeature(listing: Listing, feature: 'featured' | 'hot') {
    const update = feature === 'featured'
      ? { is_featured: false, featured_expires_at: null }
      : { is_hot: false, hot_expires_at: null };
    await supabase.from('listings').update(update).eq('id', listing.id);
    onRefresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-serif font-bold text-navy">My Listings</h2>
        <button onClick={() => { setEditingListing(null); setFormData(emptyForm); setShowForm(true); }}
          className="inline-flex items-center px-4 py-2 bg-navy text-cream font-medium text-sm rounded-xl hover:bg-navy-800 transition-colors">
          <Plus className="w-4 h-4 mr-2" />Add Listing
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-serif font-bold text-navy mb-4">{editingListing ? 'Edit Listing' : 'Create New Listing'}</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-navy mb-1">Title *</label>
                  <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold/40 focus:border-gold/60 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy mb-1">City *</label>
                  <select value={formData.city_id} onChange={(e) => setFormData({ ...formData, city_id: e.target.value })} required
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold/40 outline-none bg-white">
                    <option value="">Select City</option>
                    {cities.map(city => (<option key={city.id} value={city.id}>{city.name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy mb-2">Property Types</label>
                  <div className="flex gap-3">
                    {['residential', 'commercial'].map((pt) => (
                      <button key={pt} type="button"
                        onClick={() => setFormData({ ...formData, property_types: formData.property_types.includes(pt) ? formData.property_types.filter(t => t !== pt) : [...formData.property_types, pt] })}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${formData.property_types.includes(pt) ? 'bg-navy text-cream' : 'bg-gray-100 text-warm-gray hover:bg-gray-200'}`}>
                        {pt}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy mb-2">Deal Types</label>
                  <div className="flex gap-3">
                    {['buy', 'rent'].map((dt) => (
                      <button key={dt} type="button"
                        onClick={() => setFormData({ ...formData, deal_types: formData.deal_types.includes(dt) ? formData.deal_types.filter(t => t !== dt) : [...formData.deal_types, dt] })}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${formData.deal_types.includes(dt) ? 'bg-navy text-cream' : 'bg-gray-100 text-warm-gray hover:bg-gray-200'}`}>
                        {dt}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy mb-1">Description</label>
                  <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold/40 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy mb-1">Specialties (comma-separated)</label>
                  <input type="text" value={formData.specialties} onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold/40 outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-navy mb-1">Years Experience</label>
                    <input type="number" value={formData.years_experience} onChange={(e) => setFormData({ ...formData, years_experience: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold/40 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy mb-1">Projects Completed</label>
                    <input type="number" value={formData.projects_completed} onChange={(e) => setFormData({ ...formData, projects_completed: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold/40 outline-none" />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-warm-gray hover:text-navy text-sm">Cancel</button>
                  <button type="submit" className="px-6 py-2 bg-navy text-cream font-medium rounded-xl hover:bg-navy-800 text-sm">{editingListing ? 'Update' : 'Create'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8"><div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin mx-auto" /></div>
      ) : listings.length > 0 ? (
        <div className="space-y-4">
          {listings.map((listing) => (
            <div key={listing.id} className="bg-white rounded-2xl border border-gold/10 shadow-sm p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold text-navy">{listing.title}</h3>
                    {listing.is_featured && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">★ Featured</span>}
                    {listing.is_hot && <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">🔥 Hot</span>}
                  </div>
                  <p className="text-warm-gray text-sm">{(listing as any).city?.name} · {listing.views_count || 0} views</p>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {listing.is_featured && listing.featured_expires_at && (
                      <span className="text-xs text-amber-600">{fmtExpiry(listing.featured_expires_at)}</span>
                    )}
                    {listing.is_hot && listing.hot_expires_at && (
                      <span className="text-xs text-red-600">{fmtExpiry(listing.hot_expires_at)}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => {
                    setEditingListing(listing);
                    setFormData({ title: listing.title, city_id: listing.city_id, description: listing.description || '', specialties: listing.specialties?.join(', ') || '', years_experience: listing.years_experience || 0, projects_completed: listing.projects_completed || 0, property_types: listing.property_types || [], deal_types: listing.deal_types || [] });
                    setShowForm(true);
                  }} className="p-2 text-warm-gray hover:text-navy hover:bg-navy/5 rounded-lg transition-colors"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(listing.id)} className="p-2 text-warm-gray hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>

              {tokenError?.listingId === listing.id && (
                <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <X className="w-4 h-4 flex-shrink-0" />{tokenError.msg}
                  <Link to="/tokens" className="ml-auto font-semibold underline whitespace-nowrap">Top Up</Link>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
                {/* Featured toggle */}
                {listing.is_featured ? (
                  <button onClick={() => deactivateFeature(listing, 'featured')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-semibold hover:bg-amber-200 transition-colors">
                    <Star className="w-3 h-3 fill-current" />Featured — Deactivate
                  </button>
                ) : (
                  <button
                    disabled={tokenAction === listing.id + 'featured'}
                    onClick={() => activateFeature(listing, 'featured')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-warm-gray rounded-lg text-xs font-semibold hover:bg-amber-50 hover:text-amber-700 transition-colors disabled:opacity-50">
                    {tokenAction === listing.id + 'featured' ? <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" /> : <Star className="w-3 h-3" />}
                    Feature ({tokenCosts.featured_listing_cost} tokens/week)
                  </button>
                )}

                {/* Hot toggle */}
                {listing.is_hot ? (
                  <button onClick={() => deactivateFeature(listing, 'hot')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-200 transition-colors">
                    <Flame className="w-3 h-3 fill-current" />Hot — Deactivate
                  </button>
                ) : (
                  <button
                    disabled={tokenAction === listing.id + 'hot'}
                    onClick={() => activateFeature(listing, 'hot')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-warm-gray rounded-lg text-xs font-semibold hover:bg-red-50 hover:text-red-700 transition-colors disabled:opacity-50">
                    {tokenAction === listing.id + 'hot' ? <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" /> : <Flame className="w-3 h-3" />}
                    Hot Property ({tokenCosts.hot_property_cost} tokens/week)
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gold/10 p-12 text-center">
          <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <p className="text-warm-gray mb-4 text-sm">No listings yet. Create your first listing to appear in the directory.</p>
          <button onClick={() => setShowForm(true)} className="inline-flex items-center px-4 py-2 bg-navy text-cream font-medium rounded-xl hover:bg-navy-800 text-sm">
            <Plus className="w-4 h-4 mr-2" />Add Your First Listing
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Inquiries ───────────────────────────────────────────────────────────────

function InquiriesTab({ inquiries, loading, onRefresh }: { inquiries: Inquiry[]; loading: boolean; onRefresh: () => void }) {
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const filteredInquiries = statusFilter ? inquiries.filter(i => i.status === statusFilter) : inquiries;

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('inquiries').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    onRefresh(); setSelectedInquiry(null);
  };

  const statusColors: Record<string, string> = {
    new: 'bg-red-100 text-red-700', contacted: 'bg-blue-100 text-blue-700',
    qualified: 'bg-navy/10 text-navy', converted: 'bg-gold/10 text-gold', lost: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-serif font-bold text-navy">Client Inquiries (CRM)</h2>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gold/40 outline-none bg-white text-navy">
          <option value="">All Status</option>
          {['new', 'contacted', 'qualified', 'converted', 'lost'].map(s => (<option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>))}
        </select>
      </div>

      {loading ? (<div className="text-center py-8"><div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin mx-auto" /></div>) :
       filteredInquiries.length > 0 ? (
        <div className="bg-white rounded-2xl border border-gold/10 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-display font-semibold uppercase tracking-wider text-warm-gray">Client</th>
                <th className="px-5 py-3 text-left text-xs font-display font-semibold uppercase tracking-wider text-warm-gray hidden sm:table-cell">Source</th>
                <th className="px-5 py-3 text-left text-xs font-display font-semibold uppercase tracking-wider text-warm-gray">Status</th>
                <th className="px-5 py-3 text-left text-xs font-display font-semibold uppercase tracking-wider text-warm-gray hidden md:table-cell">Date</th>
                <th className="px-5 py-3 text-right text-xs font-display font-semibold uppercase tracking-wider text-warm-gray">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredInquiries.map((inquiry) => (
                <tr key={inquiry.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4">
                    <p className="font-medium text-navy text-sm">{inquiry.client_name}</p>
                    <p className="text-xs text-warm-gray">{inquiry.client_phone}</p>
                  </td>
                  <td className="px-5 py-4 hidden sm:table-cell"><span className="capitalize text-warm-gray text-sm">{inquiry.source}</span></td>
                  <td className="px-5 py-4"><span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[inquiry.status]}`}>{inquiry.status}</span></td>
                  <td className="px-5 py-4 hidden md:table-cell text-xs text-warm-gray">{new Date(inquiry.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <a href={`https://wa.me/${inquiry.client_phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                        className="p-2 bg-royal-green/10 text-royal-green hover:bg-royal-green/20 rounded-lg transition-colors"><Phone className="w-4 h-4" /></a>
                      <button onClick={() => setSelectedInquiry(inquiry)} className="p-2 text-warm-gray hover:text-navy hover:bg-navy/5 rounded-lg transition-colors"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
       ) : (
        <div className="bg-white rounded-2xl border border-gold/10 p-12 text-center">
          <MessageCircle className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <p className="text-warm-gray text-sm">No inquiries found</p>
        </div>
       )}

      {selectedInquiry && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="p-6">
              <h3 className="text-lg font-serif font-bold text-navy mb-4">Inquiry Details</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-xs text-warm-gray uppercase font-display font-semibold mb-1">Client</p><p className="font-semibold text-navy">{selectedInquiry.client_name}</p></div>
                  <div><p className="text-xs text-warm-gray uppercase font-display font-semibold mb-1">Phone</p><p className="font-semibold text-navy">{selectedInquiry.client_phone}</p></div>
                </div>
                {selectedInquiry.client_email && <div><p className="text-xs text-warm-gray uppercase font-display font-semibold mb-1">Email</p><p className="font-semibold text-navy">{selectedInquiry.client_email}</p></div>}
                {selectedInquiry.message && <div><p className="text-xs text-warm-gray uppercase font-display font-semibold mb-1">Message</p><p className="text-warm-gray text-sm">{selectedInquiry.message}</p></div>}
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-sm font-medium text-navy mb-3">Update Status</p>
                  <div className="flex flex-wrap gap-2">
                    {['new', 'contacted', 'qualified', 'converted', 'lost'].map((status) => (
                      <button key={status} onClick={() => updateStatus(selectedInquiry.id, status)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${
                          selectedInquiry.status === status ? 'bg-navy text-cream' : 'bg-gray-100 text-warm-gray hover:bg-gray-200'
                        }`}>{status}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                <a href={`https://wa.me/${selectedInquiry.client_phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                  className="px-4 py-2 bg-royal-green text-white font-medium rounded-xl hover:opacity-90 flex items-center text-sm">
                  <Phone className="w-4 h-4 mr-2" />WhatsApp
                </a>
                <button onClick={() => setSelectedInquiry(null)} className="px-4 py-2 bg-gray-100 text-warm-gray font-medium rounded-xl hover:bg-gray-200 text-sm">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Magazine Ads ─────────────────────────────────────────────────────────────

function MagazineTab({ ads, loading }: { ads: MagazineAd[]; loading: boolean }) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-serif font-bold text-navy">Magazine Advertisements</h2>
      {loading ? (<div className="text-center py-8"><div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin mx-auto" /></div>) :
       ads.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-6">
          {ads.map((ad) => (
            <div key={ad.id} className="bg-white rounded-2xl border border-gold/10 shadow-sm overflow-hidden">
              <div className="aspect-video bg-gray-100 flex items-center justify-center">
                {ad.image_url ? <img src={ad.image_url} alt="Ad" className="w-full h-full object-cover" /> : <BookOpen className="w-12 h-12 text-gray-200" />}
              </div>
              <div className="p-4">
                <p className="font-medium text-navy text-sm">Issue #{(ad as any).magazine?.issue_number}</p>
                <p className="text-warm-gray text-xs capitalize">{ad.ad_type.replace('_', ' ')}</p>
                <p className="text-xs mt-1">{ad.is_paid ? <span className="text-gold font-medium">Paid</span> : <span className="text-amber-600 font-medium">Payment Pending</span>}</p>
              </div>
            </div>
          ))}
        </div>
       ) : (
        <div className="bg-white rounded-2xl border border-gold/10 p-12 text-center">
          <BookOpen className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <p className="text-warm-gray text-sm mb-4">No magazine ads yet. Contact us to advertise in the next issue.</p>
          <Link to="/magazine" className="inline-flex items-center px-4 py-2 bg-navy text-cream font-medium rounded-xl hover:bg-navy-800 text-sm">View Magazine</Link>
        </div>
       )}
    </div>
  );
}

// ─── Settings ─────────────────────────────────────────────────────────────────

function SettingsTab({ profile, user, wallet, tokenCosts, onRefresh }: { profile: any; user: any; wallet: TokenWallet | null; tokenCosts: TokenCosts; onRefresh: () => void }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [badgeAction, setBadgeAction] = useState(false);
  const [badgeError, setBadgeError] = useState('');
  const [formData, setFormData] = useState({
    business_name: profile?.business_name || '',
    contact_person: profile?.contact_person || '',
    phone: profile?.phone || '',
    whatsapp_number: profile?.whatsapp_number || '',
    description: profile?.description || '',
    website_url: profile?.website_url || '',
  });

  const handleSave = async () => {
    setSaving(true);
    await supabase.from('profiles').update(formData).eq('id', user.id);
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000); onRefresh();
  };

  async function activateVerifiedBadge() {
    const cost = tokenCosts.verified_badge_cost;
    if ((wallet?.balance ?? 0) < cost) {
      setBadgeError(`Insufficient tokens. Need ${cost}, have ${wallet?.balance ?? 0}.`);
      return;
    }
    setBadgeAction(true); setBadgeError('');
    const { data } = await supabase.rpc('burn_own_tokens', { p_amount: cost, p_reason: 'Verified Badge — 30 days' });
    if (!data?.success) { setBadgeError(data?.error || 'Failed'); setBadgeAction(false); return; }
    await supabase.from('profiles').update({ verified_badge_active: true, is_verified: true, verified_badge_expires_at: addMonths(1) }).eq('id', user.id);
    setBadgeAction(false);
    onRefresh();
  }

  async function deactivateVerifiedBadge() {
    await supabase.from('profiles').update({ verified_badge_active: false, is_verified: false, verified_badge_expires_at: null }).eq('id', user.id);
    onRefresh();
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-serif font-bold text-navy">Account Settings</h2>

      {/* Verified Badge */}
      <div className="bg-white rounded-2xl border border-gold/10 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${profile?.verified_badge_active ? 'bg-gold/10 border border-gold/40' : 'bg-gray-100'}`}>
              <Shield className={`w-5 h-5 ${profile?.verified_badge_active ? 'text-gold' : 'text-gray-400'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-navy">Verified Badge</h3>
              <p className="text-warm-gray text-xs mt-0.5">Gold seal displayed on your profile and all listings — costs {tokenCosts.verified_badge_cost} tokens/month</p>
            </div>
          </div>
          <div className="flex-shrink-0">
            {profile?.verified_badge_active ? (
              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-gold/10 border border-gold/30 text-gold text-xs font-semibold rounded-full mb-1">Active</span>
                {profile?.verified_badge_expires_at && (
                  <p className="text-xs text-warm-gray">{fmtExpiry(profile.verified_badge_expires_at)}</p>
                )}
                <button onClick={deactivateVerifiedBadge} className="mt-2 text-xs text-warm-gray underline hover:text-navy transition-colors">Deactivate</button>
              </div>
            ) : (
              <button onClick={activateVerifiedBadge} disabled={badgeAction}
                className="px-4 py-2 bg-gold text-navy text-sm font-display font-bold rounded-xl hover:bg-gold-400 transition-colors disabled:opacity-50">
                {badgeAction ? <span className="flex items-center gap-1.5"><span className="w-3 h-3 border-2 border-navy/30 border-t-navy rounded-full animate-spin" />Activating</span> : `Activate (${tokenCosts.verified_badge_cost} tokens)`}
              </button>
            )}
          </div>
        </div>
        {badgeError && <p className="mt-3 text-xs text-red-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{badgeError} <Link to="/tokens" className="underline font-semibold">Top Up</Link></p>}
      </div>

      {/* Profile form */}
      <div className="bg-white rounded-2xl border border-gold/10 shadow-sm p-6">
        <h3 className="font-semibold text-navy mb-4">Business Profile</h3>
        <div className="space-y-4">
          {[
            { label: 'Business Name', key: 'business_name', type: 'text' },
            { label: 'Contact Person', key: 'contact_person', type: 'text' },
            { label: 'Phone', key: 'phone', type: 'tel' },
            { label: 'WhatsApp Number', key: 'whatsapp_number', type: 'tel' },
            { label: 'Website URL', key: 'website_url', type: 'url' },
          ].map(({ label, key, type }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-navy mb-1">{label}</label>
              <input type={type} value={(formData as any)[key]} onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold/40 focus:border-gold/60 outline-none text-navy" />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-navy mb-1">Description</label>
            <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold/40 outline-none text-navy" />
          </div>
          <div className="pt-2">
            <button onClick={handleSave} disabled={saving}
              className="px-6 py-2.5 bg-navy text-cream font-medium rounded-xl hover:bg-navy-800 disabled:opacity-50 flex items-center gap-2 text-sm transition-colors">
              {saving ? <><span className="w-4 h-4 border-2 border-cream/30 border-t-cream rounded-full animate-spin" />Saving…</> :
               saved ? <><CheckCircle className="w-4 h-4 text-gold" />Saved!</> : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Verification */}
      <VerificationSection userId={user.id} />

      {/* Invoice history */}
      <InvoiceHistorySection userId={user.id} />
    </div>
  );
}

function VerificationSection({ userId }: { userId: string }) {
  const [existing, setExisting] = useState<{ status: string; type: string; rejection_reason: string | null; created_at: string } | null | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<'rera' | 'gst' | 'both'>('rera');
  const [reraNumber, setReraNumber] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    supabase.from('verification_requests').select('status, type, rejection_reason, created_at')
      .eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => setExisting(data));
  }, [userId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const payload: Record<string, string> = { user_id: userId, type };
    if (type === 'rera' || type === 'both') payload.rera_number = reraNumber;
    if (type === 'gst' || type === 'both') payload.gst_number = gstNumber;
    const { error } = await supabase.from('verification_requests').insert(payload);
    if (!error) {
      setSubmitted(true);
      setShowForm(false);
      setExisting({ status: 'pending', type, rejection_reason: null, created_at: new Date().toISOString() });
    }
    setSubmitting(false);
  }

  if (existing === undefined) return null;

  const statusBadge = existing ? {
    pending:  { label: 'Under Review', cls: 'bg-amber-100 text-amber-700' },
    approved: { label: 'Approved', cls: 'bg-gold/10 text-gold border border-gold/25' },
    rejected: { label: 'Rejected', cls: 'bg-red-100 text-red-600' },
  }[existing.status] : null;

  return (
    <div className="bg-white rounded-2xl border border-gold/10 shadow-sm p-6">
      <div className="flex items-start justify-between gap-4 mb-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-navy/5 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-navy/40" />
          </div>
          <div>
            <h3 className="font-semibold text-navy">Business Verification</h3>
            <p className="text-warm-gray text-xs mt-0.5">Submit RERA / GST credentials for the Admin to review and grant you the Verified badge</p>
          </div>
        </div>
        {statusBadge && (
          <span className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold ${statusBadge.cls}`}>
            {statusBadge.label}
          </span>
        )}
      </div>

      {submitted && (
        <div className="mt-3 px-3 py-2 bg-gold/5 border border-gold/20 rounded-lg text-sm text-gold font-medium">
          Verification request submitted. Our team will review within 2–3 business days.
        </div>
      )}

      {existing?.status === 'rejected' && existing.rejection_reason && (
        <div className="mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <span className="font-semibold">Reason: </span>{existing.rejection_reason}
        </div>
      )}

      {!existing && !showForm && (
        <button onClick={() => setShowForm(true)} className="mt-4 px-4 py-2 bg-navy text-cream text-sm font-display font-semibold rounded-xl hover:bg-navy/90 transition-colors">
          Apply for Verification
        </button>
      )}

      {existing?.status === 'rejected' && !showForm && (
        <button onClick={() => { setShowForm(true); setSubmitted(false); }} className="mt-4 px-4 py-2 bg-navy text-cream text-sm font-display font-semibold rounded-xl hover:bg-navy/90 transition-colors">
          Re-apply
        </button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4 border-t border-gray-100 pt-4">
          <div>
            <label className="block text-sm font-medium text-navy mb-2">Verification Type</label>
            <div className="flex gap-2">
              {([['rera', 'RERA Number'], ['gst', 'GST Number'], ['both', 'Both']] as const).map(([val, label]) => (
                <button key={val} type="button" onClick={() => setType(val)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${type === val ? 'bg-navy text-cream' : 'bg-gray-100 text-warm-gray hover:bg-gray-200'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {(type === 'rera' || type === 'both') && (
            <div>
              <label className="block text-sm font-medium text-navy mb-1">RERA Registration Number</label>
              <input type="text" value={reraNumber} onChange={e => setReraNumber(e.target.value)} required
                placeholder="e.g. MH/RERA/C51900000001"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gold/40 focus:border-gold/60 outline-none font-mono" />
            </div>
          )}
          {(type === 'gst' || type === 'both') && (
            <div>
              <label className="block text-sm font-medium text-navy mb-1">GST Number</label>
              <input type="text" value={gstNumber} onChange={e => setGstNumber(e.target.value)} required
                placeholder="e.g. 27AAPFU0939F1ZV"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gold/40 focus:border-gold/60 outline-none font-mono" />
            </div>
          )}
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="submit" disabled={submitting} className="px-5 py-2 bg-navy text-cream rounded-xl text-sm font-display font-semibold disabled:opacity-50 hover:bg-navy/90 transition-colors">
              {submitting ? 'Submitting…' : 'Submit for Review'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function InvoiceHistorySection({ userId }: { userId: string }) {
  const [invoices, setInvoices] = useState<{ id: string; invoice_number: string; date: string; total_amount: number; token_amount: number }[]>([]);

  useEffect(() => {
    supabase.from('invoices').select('id, invoice_number, date, total_amount, token_amount').eq('user_id', userId).order('created_at', { ascending: false }).limit(10)
      .then(({ data }) => { if (data) setInvoices(data); });
  }, [userId]);

  if (!invoices.length) return null;

  return (
    <div className="bg-white rounded-2xl border border-gold/10 shadow-sm p-6">
      <h3 className="font-semibold text-navy mb-4">Invoice History</h3>
      <div className="space-y-2">
        {invoices.map((inv) => (
          <div key={inv.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
            <div>
              <p className="text-sm font-medium text-navy">{inv.invoice_number}</p>
              <p className="text-xs text-warm-gray">{fmtDate(inv.date)} · {inv.token_amount} tokens</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-navy">₹{Number(inv.total_amount).toLocaleString('en-IN')}</span>
              <Link to={`/invoice/${inv.id}`}
                className="flex items-center gap-1 text-xs text-gold font-semibold hover:underline">
                <Receipt className="w-3 h-3" />View
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
