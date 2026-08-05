import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { Listing, Lead, Profile, City, MarketTrack } from '../types/database';
import {
  Building2, Users, TrendingUp, Phone, Mail, Flame, Plus, Edit3,
  Save, Upload, X, Check, Clock, Coins, Image as ImageIcon, Eye, Sparkle,
} from 'lucide-react';

type Tab = 'overview' | 'projects' | 'leads' | 'profile' | 'tokens' | 'sales-offer';

const EMIRATES = ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain'];
const VIEWS = ['Sea View', 'Garden View', 'Golf Course View', 'City View', 'Pool View', 'Standard/No Specific View'];
const PROPERTY_TYPES = ['Residential', 'Commercial'];
const DEAL_TYPES = ['Buy', 'Rent'];

interface ListingForm {
  title: string;
  description: string;
  price: string;
  property_type: string;
  property_view: string;
  contact_phone: string;
  city_id: string;
  emirate: string;
  photos: string[];
  is_off_plan: boolean;
  escrow_account_status: string;
  escrow_account_number: string;
  rera_qr_code: string;
}

const EMPTY_FORM: ListingForm = {
  title: '', description: '', price: '', property_type: 'Residential', property_view: '',
  contact_phone: '', city_id: '', emirate: '', photos: [], is_off_plan: false,
  escrow_account_status: '', escrow_account_number: '', rera_qr_code: '',
};

export function DeveloperDashboardPage() {
  const { user, profile } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [listings, setListings] = useState<Listing[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ListingForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [crmExpired, setCrmExpired] = useState(false);
  const [profileForm, setProfileForm] = useState({ business_name: '', phone: '', city_id: '', logo_url: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [tokenCosts, setTokenCosts] = useState<Record<string, number>>({});

  const marketTrack: MarketTrack = (profile?.market_track as MarketTrack) ?? 'india';
  const isDubai = marketTrack === 'dubai';
  const currency = isDubai ? 'AED' : 'INR';
  const currencySymbol = isDubai ? 'AED' : '₹';

  const fetchData = useCallback(async () => {
    if (!user) return;
    const [listRes, leadRes, cityRes, walletRes, costRes] = await Promise.all([
      supabase.from('listings').select('*, city:cities(*)').eq('profile_id', user.id).order('created_at', { ascending: false }),
      supabase.from('leads').select('*, listing:listings(*)').eq('owner_id', user.id).order('created_at', { ascending: false }),
      supabase.from('cities').select('*').eq('is_active', true).order('name'),
      supabase.from('token_wallets').select('balance').eq('user_id', user.id).maybeSingle(),
      supabase.from('site_config').select('key,value').in('key', ['sales_offer_short_tokens','sales_offer_detailed_tokens','sales_offer_ultra_tokens','vam_full_bundle_tokens','vam_naksha_tokens','vam_meeting_fixing_tokens','vam_sequence_tokens']),
    ]);
    if (listRes.data) setListings(listRes.data as Listing[]);
    if (leadRes.data) setLeads(leadRes.data as Lead[]);
    if (cityRes.data) setCities(cityRes.data as City[]);
    if (walletRes.data) setWalletBalance((walletRes.data as { balance: number }).balance);
    if (costRes.data) {
      const map: Record<string, number> = {};
      (costRes.data as { key: string; value: string }[]).forEach(c => { map[c.key] = parseInt(c.value, 10) || 0; });
      setTokenCosts(map);
    }

    // Check CRM expiry
    if (profile?.crm_expires_at) {
      setCrmExpired(new Date(profile.crm_expires_at) < new Date());
    }

    setProfileForm({
      business_name: profile?.business_name ?? '',
      phone: profile?.phone ?? '',
      city_id: profile?.city_id ?? '',
      logo_url: profile?.logo_url ?? '',
    });

    setLoading(false);
  }, [user, profile]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (!user) return null;

  const totalViews = listings.reduce((sum, l) => sum + (l.views_count || 0), 0);
  const highIntentLeads = leads.filter(l => l.intent_score >= 70).length;

  async function handlePhotoUpload(file: File) {
    if (!user) return;
    setUploading(true);
    const path = `listings/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from('assets').upload(path, file);
    if (!upErr) {
      const { data: pub } = supabase.storage.from('assets').getPublicUrl(path);
      setForm(f => ({ ...f, photos: [...f.photos, pub.publicUrl] }));
    }
    setUploading(false);
  }

  async function handleSubmitListing() {
    if (!user) return;
    setError(null);

    if (!form.title.trim() || !form.description.trim() || !form.price) {
      setError('Title, description, and price are required.');
      return;
    }

    if (isDubai && !form.emirate) {
      setError('Please select an Emirate.');
      return;
    }
    if (!isDubai && !form.city_id) {
      setError('Please select a city.');
      return;
    }

    if (isDubai && form.is_off_plan) {
      if (!form.escrow_account_status || !form.escrow_account_number) {
        setError('Escrow account status and number are required for off-plan Dubai properties.');
        return;
      }
    }

    if (isDubai && form.emirate === 'Dubai' && !form.rera_qr_code) {
      setError('RERA QR code is required for listings in Dubai emirate.');
      return;
    }

    setSubmitting(true);
    const insertData: Record<string, unknown> = {
      title: form.title,
      description: form.description,
      price: parseInt(form.price),
      property_types: [form.property_type],
      deal_types: DEAL_TYPES,
      profile_id: user.id,
      moderation_status: 'pending',
      approval_level: 'pending',
      is_active: false,
      market_track: marketTrack,
      property_view: form.property_view || null,
      contact_phone: form.contact_phone || null,
      photos: form.photos.length > 0 ? form.photos : null,
      is_dubai: isDubai,
      emirate: isDubai ? form.emirate : null,
      escrow_account_status: form.is_off_plan ? form.escrow_account_status : null,
      escrow_account_number: form.is_off_plan ? form.escrow_account_number : null,
      rera_qr_code: isDubai && form.emirate === 'Dubai' ? form.rera_qr_code : null,
    };

    if (!isDubai) {
      insertData.city_id = form.city_id;
    }

    const { error: insErr } = await supabase.from('listings').insert(insertData);
    if (insErr) {
      setError(insErr.message);
    } else {
      setSuccess('Listing submitted! It will appear once approved by admin.');
      setForm(EMPTY_FORM);
      setShowForm(false);
      fetchData();
    }
    setSubmitting(false);
  }

  async function handleSaveProfile() {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase.from('profiles').update({
      business_name: profileForm.business_name,
      phone: profileForm.phone,
      city_id: profileForm.city_id || null,
    }).eq('id', user.id);
    if (!error) setSuccess('Profile updated.');
    setSavingProfile(false);
  }

  async function handleRenewCrm(days: number) {
    if (!user) return;
    const { data: rateData } = await supabase.from('site_config').select('value').eq('key', 'crm_monthly_rate_tokens').maybeSingle();
    const rate = parseInt(rateData?.value ?? '2');
    const cost = Math.ceil((days / 30) * rate);

    if (walletBalance !== null && walletBalance < cost) {
      setError(`Insufficient tokens. CRM renewal for ${days} days costs ${cost} tokens.`);
      return;
    }

    const { error: burnErr } = await supabase.rpc('burn_tokens', { p_user_id: user.id, p_amount: cost, p_reason: `CRM renewal ${days} days` });
    if (burnErr) {
      setError('Failed to deduct tokens. Please try again.');
      return;
    }

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);
    const { error: profErr } = await supabase.from('profiles').update({ crm_expires_at: expiryDate.toISOString() }).eq('id', user.id);
    if (!profErr) {
      setCrmExpired(false);
      setSuccess(`CRM access renewed for ${days} days! ${cost} tokens deducted.`);
      fetchData();
    }
  }

  async function updateLeadStatus(leadId: string, status: string) {
    const { error } = await supabase.from('leads').update({ status }).eq('id', leadId);
    if (!error) fetchData();
  }

  async function updateLeadNotes(leadId: string, notes: string) {
    const { error } = await supabase.from('leads').update({ notes }).eq('id', leadId);
    if (!error) fetchData();
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'projects', label: 'My Projects' },
    { id: 'leads', label: 'Leads/CRM' },
    { id: 'profile', label: 'Profile' },
    { id: 'tokens', label: 'Tokens' },
    { id: 'sales-offer', label: 'Sales Offers' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-navy text-cream py-10 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-serif font-bold text-gold">Developer Dashboard</h1>
              <p className="text-cream/50 text-sm mt-1">
                {profile?.business_name ?? 'Manage your projects'} · {isDubai ? 'Dubai Track' : 'India Track'} · {currencySymbol} wallet
              </p>
            </div>
            {walletBalance !== null && (
              <div className="bg-gold/10 border border-gold/30 rounded-xl px-5 py-3 text-center">
                <p className="text-xs text-cream/50 uppercase tracking-wider">Balance</p>
                <p className="text-2xl font-bold text-gold">{walletBalance}</p>
                <p className="text-xs text-cream/40">tokens</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-6 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${tab === t.id ? 'bg-white text-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {error && <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>}
        {success && <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700">{success}</div>}

        {/* Overview */}
        {tab === 'overview' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat icon={Building2} label="Total Projects" value={listings.length} />
            <Stat icon={Users} label="Total Leads" value={leads.length} />
            <Stat icon={Flame} label="High Intent Leads" value={highIntentLeads} />
            <Stat icon={TrendingUp} label="Total Views" value={totalViews} />
          </div>
        )}

        {/* My Projects */}
        {tab === 'projects' && (
          <div className="space-y-4">
            {!showForm && (
              <button onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-navy text-cream rounded-xl text-sm font-medium hover:bg-navy-800 transition-colors">
                <Plus className="w-4 h-4" /> Submit New Listing
              </button>
            )}

            {showForm && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif font-bold text-navy text-lg">New Listing</h3>
                  <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <FormField label="Title *">
                  <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    className="input-field" placeholder="e.g. 3BHK Sea View Apartment" />
                </FormField>

                <FormField label="Description *">
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={3} className="input-field resize-none" placeholder="Describe your property..." />
                </FormField>

                <div className="grid grid-cols-2 gap-4">
                  <FormField label={`Price (${currency}) *`}>
                    <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                      className="input-field" placeholder={isDubai ? 'AED amount' : 'INR amount'} />
                  </FormField>

                  <FormField label="Property Type">
                    <select value={form.property_type} onChange={e => setForm(f => ({ ...f, property_type: e.target.value }))}
                      className="input-field">
                      {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </FormField>
                </div>

                <FormField label="View">
                  <select value={form.property_view} onChange={e => setForm(f => ({ ...f, property_view: e.target.value }))}
                    className="input-field">
                    <option value="">Select a view...</option>
                    {VIEWS.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </FormField>

                {/* Geography: India = City, Dubai = Emirates */}
                {!isDubai ? (
                  <FormField label="City *">
                    <select value={form.city_id} onChange={e => setForm(f => ({ ...f, city_id: e.target.value }))}
                      className="input-field">
                      <option value="">Select city...</option>
                      {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </FormField>
                ) : (
                  <FormField label="Emirate *">
                    <select value={form.emirate} onChange={e => setForm(f => ({ ...f, emirate: e.target.value }))}
                      className="input-field">
                      <option value="">Select emirate...</option>
                      {EMIRATES.map(em => <option key={em} value={em}>{em}</option>)}
                    </select>
                  </FormField>
                )}

                <FormField label="Contact Phone">
                  <input type="text" value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))}
                    className="input-field" placeholder="Phone number for enquiries" />
                </FormField>

                {/* Photos */}
                <FormField label="Photos">
                  <div className="space-y-2">
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-gold/50 hover:bg-gold/5 transition-all">
                      {uploading ? <span className="text-sm text-gray-500">Uploading...</span> : (
                        <>
                          <ImageIcon className="w-5 h-5 text-gray-400 mb-1" />
                          <span className="text-sm text-gray-500">Click to upload photos</span>
                        </>
                      )}
                      <input type="file" accept="image/*" multiple className="hidden" onChange={async e => {
                        const files = Array.from(e.target.files ?? []);
                        for (const file of files) await handlePhotoUpload(file);
                      }} />
                    </label>
                    {form.photos.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {form.photos.map((url, i) => (
                          <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                            <img src={url} alt="" className="w-full h-full object-cover" />
                            <button onClick={() => setForm(f => ({ ...f, photos: f.photos.filter((_, j) => j !== i) }))}
                              className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center text-white">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </FormField>

                {/* Dubai off-plan fields */}
                {isDubai && (
                  <div className="space-y-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <label className="flex items-center gap-2 text-sm font-medium text-navy">
                      <input type="checkbox" checked={form.is_off_plan} onChange={e => setForm(f => ({ ...f, is_off_plan: e.target.checked }))}
                        className="rounded" />
                      Off-plan property
                    </label>

                    {form.is_off_plan && (
                      <div className="grid grid-cols-2 gap-4">
                        <FormField label="Escrow Account Status *">
                          <select value={form.escrow_account_status} onChange={e => setForm(f => ({ ...f, escrow_account_status: e.target.value }))}
                            className="input-field">
                            <option value="">Select status...</option>
                            <option value="Open">Open</option>
                            <option value="Active">Active</option>
                            <option value="Closed">Closed</option>
                          </select>
                        </FormField>
                        <FormField label="Escrow Account Number *">
                          <input type="text" value={form.escrow_account_number} onChange={e => setForm(f => ({ ...f, escrow_account_number: e.target.value }))}
                            className="input-field" placeholder="Escrow account number" />
                        </FormField>
                      </div>
                    )}

                    {form.emirate === 'Dubai' && (
                      <FormField label="RERA QR Code URL *">
                        <input type="text" value={form.rera_qr_code} onChange={e => setForm(f => ({ ...f, rera_qr_code: e.target.value }))}
                          className="input-field" placeholder="RERA-issued QR code URL" />
                      </FormField>
                    )}
                  </div>
                )}

                <button onClick={handleSubmitListing} disabled={submitting}
                  className="px-6 py-2.5 bg-gold text-navy rounded-xl text-sm font-bold hover:bg-gold-400 disabled:opacity-50 transition-colors flex items-center gap-2">
                  {submitting ? <span className="w-4 h-4 border-2 border-navy border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                  Submit Listing
                </button>
              </div>
            )}

            {/* Existing listings */}
            <div className="space-y-3">
              {listings.length === 0 && !showForm ? (
                <p className="text-gray-500 text-center py-12">No projects yet. Click "Submit New Listing" to create one.</p>
              ) : listings.map(l => (
                <div key={l.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-navy">{l.title}</h3>
                    <p className="text-xs text-gray-400">
                      {l.city?.name ?? l.emirate ?? '—'}
                      {l.property_view ? ` · ${l.property_view}` : ''}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    l.moderation_status === 'approved' ? 'bg-green-50 text-green-700' :
                    l.moderation_status === 'rejected' ? 'bg-red-50 text-red-600' :
                    'bg-amber-50 text-amber-700'
                  }`}>{l.moderation_status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Leads/CRM */}
        {tab === 'leads' && (
          <div className="space-y-4">
            {crmExpired && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                <h3 className="font-serif font-bold text-navy mb-1">CRM Access Expired</h3>
                <p className="text-sm text-gray-600 mb-3">Renew to continue managing your leads.</p>
                <div className="flex gap-2">
                  <button onClick={() => handleRenewCrm(30)} className="px-4 py-2 bg-navy text-cream rounded-lg text-sm font-medium hover:bg-navy-800">Renew 30 days</button>
                  <button onClick={() => handleRenewCrm(90)} className="px-4 py-2 bg-navy text-cream rounded-lg text-sm font-medium hover:bg-navy-800">Renew 90 days</button>
                  <button onClick={() => handleRenewCrm(180)} className="px-4 py-2 bg-navy text-cream rounded-lg text-sm font-medium hover:bg-navy-800">Renew 180 days</button>
                </div>
              </div>
            )}
            {leads.length === 0 ? (
              <p className="text-gray-500 text-center py-12">No leads yet.</p>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Phone</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Intent</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Comfort Hours</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {leads.map(l => (
                      <LeadRow key={l.id} lead={l} onStatusChange={updateLeadStatus} onNotesChange={updateLeadNotes} tokenCosts={tokenCosts} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Profile */}
        {tab === 'profile' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 max-w-lg">
            <h3 className="font-serif font-bold text-navy text-lg">Profile</h3>
            <FormField label="Company Name">
              <input type="text" value={profileForm.business_name} onChange={e => setProfileForm(f => ({ ...f, business_name: e.target.value }))} className="input-field" />
            </FormField>
            <FormField label="Phone">
              <input type="text" value={profileForm.phone} onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))} className="input-field" />
            </FormField>
            {!isDubai && (
              <FormField label="City">
                <select value={profileForm.city_id} onChange={e => setProfileForm(f => ({ ...f, city_id: e.target.value }))} className="input-field">
                  <option value="">Select city...</option>
                  {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </FormField>
            )}
            <button onClick={handleSaveProfile} disabled={savingProfile}
              className="px-6 py-2.5 bg-navy text-cream rounded-xl text-sm font-medium hover:bg-navy-800 disabled:opacity-50 transition-colors flex items-center gap-2">
              {savingProfile ? <span className="w-4 h-4 border-2 border-cream border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
              Save Profile
            </button>
          </div>
        )}

        {/* Tokens */}
        {tab === 'tokens' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="font-serif font-bold text-navy text-lg mb-4">Token Wallet</h3>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gold/10 border border-gold/30 rounded-2xl flex items-center justify-center">
                  <Coins className="w-8 h-8 text-gold" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-navy">{walletBalance ?? 0}</p>
                  <p className="text-sm text-gray-500">tokens available</p>
                </div>
                <a href="/tokens" className="ml-auto px-4 py-2 bg-navy text-cream rounded-xl text-sm font-medium hover:bg-navy-800 transition-colors">
                  Buy Tokens
                </a>
              </div>
              <p className="text-xs text-gray-400 mt-3">1 token = {currencySymbol}{isDubai ? '2' : '20'} · {currency} wallet</p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="font-serif font-bold text-navy text-lg mb-4">CRM Access</h3>
              {profile?.crm_expires_at && !crmExpired ? (
                <p className="text-sm text-gray-600">CRM access active until {new Date(profile.crm_expires_at).toLocaleDateString('en-IN')}</p>
              ) : (
                <p className="text-sm text-gray-600 mb-3">No active CRM access.</p>
              )}
              <div className="flex gap-2 mt-3">
                <button onClick={() => handleRenewCrm(30)} className="px-4 py-2 bg-navy text-cream rounded-lg text-sm font-medium hover:bg-navy-800">Renew 30 days (2 tokens)</button>
                <button onClick={() => handleRenewCrm(90)} className="px-4 py-2 bg-navy text-cream rounded-lg text-sm font-medium hover:bg-navy-800">Renew 90 days (6 tokens)</button>
                <button onClick={() => handleRenewCrm(180)} className="px-4 py-2 bg-navy text-cream rounded-lg text-sm font-medium hover:bg-navy-800">Renew 180 days (12 tokens)</button>
              </div>
            </div>
          </div>
        )}
        {/* Sales Offer Generator */}
        {tab === 'sales-offer' && (
          <SalesOfferGenerator listings={listings} walletBalance={walletBalance} onRefresh={fetchData} tokenCosts={tokenCosts} />
        )}
      </div>
    </div>
  );
}

function SalesOfferGenerator({ listings, walletBalance, onRefresh, tokenCosts }: { listings: Listing[]; walletBalance: number | null; onRefresh: () => void; tokenCosts: Record<string, number> }) {
  const { user } = useAuth();
  const [selectedListing, setSelectedListing] = useState<string>('');
  const [edition, setEdition] = useState<'short' | 'detailed' | 'ultra'>('short');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const editionCosts: Record<string, number> = {
    short: tokenCosts['sales_offer_short_tokens'] ?? 1,
    detailed: tokenCosts['sales_offer_detailed_tokens'] ?? 2,
    ultra: tokenCosts['sales_offer_ultra_tokens'] ?? 3,
  };
  const cost = editionCosts[edition];

  async function handleGenerate() {
    if (!user || !selectedListing) return;
    setError(null);

    if (walletBalance !== null && walletBalance < cost) {
      setError(`Insufficient tokens. ${edition} edition costs ${cost} tokens.`);
      return;
    }

    setGenerating(true);
    const { error: burnErr } = await supabase.rpc('burn_tokens', { p_user_id: user.id, p_amount: cost, p_reason: `Sales Offer ${edition}` });
    if (burnErr) {
      setError('Failed to deduct tokens.');
      setGenerating(false);
      return;
    }

    const listing = listings.find(l => l.id === selectedListing);
    if (listing) {
      const offer = generateOfferText(listing, edition);
      setResult(offer);
      // Log to admin CRM (market intelligence)
      await supabase.from('leads').insert({
        name: 'Sales Offer Generation',
        phone: '-',
        message: `Generated ${edition} sales offer for: ${listing.title}`,
        source: 'sales_offer_generator',
        owner_id: user.id,
      }).catch(() => {});
    }
    setGenerating(false);
    onRefresh();
  }

  const approvedListings = listings.filter(l => l.moderation_status === 'approved');

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <h3 className="font-serif font-bold text-navy text-lg">Sales Offer Generator</h3>
        <p className="text-sm text-gray-500">Generate instant pitch documents for your listings. Token cost: Short ({editionCosts.short}) · Detailed ({editionCosts.detailed}) · Ultra Detailed ({editionCosts.ultra}, includes Naksha Report).</p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Listing</label>
          <select value={selectedListing} onChange={e => setSelectedListing(e.target.value)} className="input-field">
            <option value="">Choose a listing...</option>
            {approvedListings.map(l => (
              <option key={l.id} value={l.id}>{l.title}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Edition</label>
          <div className="grid grid-cols-3 gap-3">
            {(['short', 'detailed', 'ultra'] as const).map(ed => (
              <button key={ed} onClick={() => setEdition(ed)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${edition === ed ? 'border-navy bg-navy/3' : 'border-gray-200 hover:border-gray-300'}`}>
                <p className="font-semibold text-navy text-sm capitalize">{ed === 'ultra' ? 'Ultra Detailed' : ed}</p>
                <p className="text-xs text-gold mt-0.5">{editionCosts[ed]} token{editionCosts[ed] > 1 ? 's' : ''}</p>
              </button>
            ))}
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>}

        <button onClick={handleGenerate} disabled={generating || !selectedListing}
          className="px-6 py-2.5 bg-gold text-navy rounded-xl text-sm font-bold hover:bg-gold-400 disabled:opacity-50 transition-colors flex items-center gap-2">
          {generating ? <span className="w-4 h-4 border-2 border-navy border-t-transparent rounded-full animate-spin" /> : <Sparkle className="w-4 h-4" />}
          Generate Offer ({cost} tokens)
        </button>
      </div>

      {result && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif font-bold text-navy text-lg">Generated Offer</h3>
            <button onClick={() => { navigator.clipboard.writeText(result); }} className="text-xs text-gold hover:underline">Copy to clipboard</button>
          </div>
          <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">{result}</div>
        </div>
      )}
    </div>
  );
}

function generateOfferText(listing: Listing, edition: 'short' | 'detailed' | 'ultra'): string {
  const price = listing.price ? `₹${listing.price.toLocaleString('en-IN')}` : 'Price on request';
  const view = listing.property_view ? ` | View: ${listing.property_view}` : '';
  const location = listing.city?.name ?? listing.emirate ?? 'Prime location';

  let text = `PROPERTY PITCH — ${listing.title}\n`;
  text += `${location}${view} | ${price}\n\n`;
  text += `${listing.description ?? ''}\n\n`;

  if (edition !== 'short') {
    text += `DETAILED FEATURES:\n`;
    text += `- Property Type: ${listing.property_types?.join(', ') ?? 'Residential'}\n`;
    text += `- View: ${listing.property_view ?? 'Standard'}\n`;
    if (listing.size_sqft) text += `- Size: ${listing.size_sqft} sqft\n`;
    if (listing.ownership_type) text += `- Ownership: ${listing.ownership_type}\n`;
    text += `\n`;
  }

  if (edition === 'ultra') {
    text += `NAKSHA REPORT (included):\n`;
    text += `Full area intelligence report with locality data, connectivity, and infrastructure analysis.\n`;
    text += `\n`;
  }

  text += `CONTACT:\n`;
  text += `Phone: ${listing.contact_phone ?? 'Available on request'}\n`;
  text += `\nGenerated by Property Herald — India's AI-powered property platform.`;

  return text;
}

function LeadRow({ lead, onStatusChange, onNotesChange, tokenCosts }: { lead: Lead; onStatusChange: (id: string, status: string) => void; onNotesChange: (id: string, notes: string) => void; tokenCosts: Record<string, number> }) {
  const { user } = useAuth();
  const [showDetail, setShowDetail] = useState(false);
  const [notes, setNotes] = useState(lead.notes ?? '');

  const vamCosts: Record<string, number> = {
    'follow-up': tokenCosts['vam_full_bundle_tokens'] ?? 10,
    'naksha': tokenCosts['vam_naksha_tokens'] ?? 1,
    'meeting': tokenCosts['vam_meeting_fixing_tokens'] ?? 5,
    'sequence': tokenCosts['vam_sequence_tokens'] ?? 10,
  };

  const intentLabel = lead.intent_score >= 70 ? 'High Intent' : lead.intent_score >= 40 ? 'Moderate Intent' : 'Early Signal';
  const intentColor = lead.intent_score >= 70 ? 'bg-red-50 text-red-600' : lead.intent_score >= 40 ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-500';

  async function handleVamAction(leadId: string, action: string) {
    if (!user) return;
    const cost = vamCosts[action] ?? 0;
    const { error } = await supabase.rpc('burn_tokens', { p_user_id: user.id, p_amount: cost, p_reason: `VAM: ${action} for lead ${leadId}` });
    if (error) {
      alert('Failed to deduct tokens. Please check your balance.');
      return;
    }
    await supabase.from('leads').update({ notes: `${lead.notes ?? ''}\n[VAM] ${action} requested at ${new Date().toLocaleString('en-IN')}` }).eq('id', leadId);
    alert(`${action} queued successfully! ${cost} tokens deducted.`);
  }

  return (
    <>
      <tr className="hover:bg-gray-50">
        <td className="px-4 py-3 font-medium text-navy">{lead.preferred_name ?? lead.name}</td>
        <td className="px-4 py-3 text-gray-600">{lead.phone}</td>
        <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${intentColor}`}>{intentLabel}</span></td>
        <td className="px-4 py-3 text-gray-600 text-xs">{lead.comfort_hours ?? '—'}</td>
        <td className="px-4 py-3">
          <select value={lead.status} onChange={e => onStatusChange(lead.id, e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-gold/50">
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="converted">Converted</option>
            <option value="lost">Lost</option>
          </select>
        </td>
        <td className="px-4 py-3">
          <button onClick={() => setShowDetail(!showDetail)} className="text-xs text-gold hover:underline">
            {showDetail ? 'Hide' : 'View'}
          </button>
        </td>
      </tr>
      {showDetail && (
        <tr className="bg-amber-50/50">
          <td colSpan={6} className="px-4 py-4">
            <div className="space-y-3">
              {lead.message && <p className="text-sm text-gray-600"><strong>Message:</strong> {lead.message}</p>}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} onBlur={() => onNotesChange(lead.id, notes)}
                  rows={2} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-gold/50 resize-none"
                  placeholder="Add notes about this lead..." />
              </div>
              {lead.comfort_hours && (
                <p className="text-sm text-navy bg-gold/5 px-3 py-2 rounded-lg">
                  <Clock className="w-3.5 h-3.5 inline mr-1.5 text-gold" />
                  Call at their preferred time — {lead.comfort_hours}. AI never misses it.
                </p>
              )}
              {/* VAM add-on buttons (Section 5.4/12) */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                <button onClick={() => handleVamAction(lead.id, 'follow-up')} className="px-3 py-1.5 bg-navy text-cream rounded-lg text-xs font-medium hover:bg-navy-800">
                  Request AI follow-up ({vamCosts['follow-up']} tokens)
                </button>
                <button onClick={() => handleVamAction(lead.id, 'naksha')} className="px-3 py-1.5 bg-gold/10 text-gold border border-gold/30 rounded-lg text-xs font-medium hover:bg-gold/20">
                  Order Naksha Report ({vamCosts['naksha']} token{vamCosts['naksha'] > 1 ? 's' : ''})
                </button>
                <button onClick={() => handleVamAction(lead.id, 'meeting')} className="px-3 py-1.5 bg-navy/10 text-navy border border-navy/20 rounded-lg text-xs font-medium hover:bg-navy/20">
                  Meeting Fixing ({vamCosts['meeting']} tokens)
                </button>
                <button onClick={() => handleVamAction(lead.id, 'sequence')} className="px-3 py-1.5 bg-navy/10 text-navy border border-navy/20 rounded-lg text-xs font-medium hover:bg-navy/20">
                  Start Follow-Up Sequence ({vamCosts['sequence']} tokens)
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
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

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
