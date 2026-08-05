import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { City } from '../types/database';
import {
  Building2, MapPin, FileText, Tag, ChevronRight, Loader,
  AlertCircle, CheckCircle, Coins,
} from 'lucide-react';

const PROPERTY_TYPES = ['residential', 'commercial'] as const;
const DEAL_TYPES = ['buy', 'rent'] as const;

const SUBMIT_COST = 25;

export function SubmitListingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cities, setCities] = useState<City[]>([]);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ listingId: string } | null>(null);

  const [marketTrack, setMarketTrack] = useState<'india' | 'dubai'>('india');
  const [form, setForm] = useState({
    title: '',
    city_id: '',
    emirate: '',
    description: '',
    specialties: '',
    property_types: [] as string[],
    deal_types: [] as string[],
    years_experience: '',
    projects_completed: '',
  });

  useEffect(() => {
    if (!user) { navigate('/login'); return; }

    Promise.all([
      supabase.from('cities').select('*').order('name'),
      supabase.from('token_wallets').select('balance').eq('user_id', user.id).maybeSingle(),
      supabase.from('profiles').select('market_track').eq('id', user.id).maybeSingle(),
    ]).then(([citiesRes, walletRes, profileRes]) => {
      if (citiesRes.data) setCities(citiesRes.data);
      if (walletRes.data) setWalletBalance(walletRes.data.balance);
      if (profileRes.data?.market_track === 'dubai') setMarketTrack('dubai');
      setLoading(false);
    });
  }, [user, navigate]);

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
    setError(null);
  }

  function toggleArray(field: 'property_types' | 'deal_types', value: string) {
    setForm(f => ({
      ...f,
      [field]: f[field].includes(value)
        ? f[field].filter(v => v !== value)
        : [...f[field], value],
    }));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required.'); return; }
    if (marketTrack === 'india' && !form.city_id) { setError('Please select a city.'); return; }
    if (marketTrack === 'dubai' && !form.emirate) { setError('Please select an emirate.'); return; }
    if (form.property_types.length === 0) { setError('Select at least one property type.'); return; }
    if (form.deal_types.length === 0) { setError('Select at least one deal type.'); return; }
    if (walletBalance !== null && walletBalance < SUBMIT_COST) {
      setError(`You need ${SUBMIT_COST} tokens to submit a listing. Your balance: ${walletBalance}. Please buy more tokens.`);
      return;
    }

    setSubmitting(true);
    setError(null);

    const { data, error: rpcError } = await supabase.rpc('submit_listing', {
      p_city_id: marketTrack === 'india' ? parseInt(form.city_id) : null,
      p_title: form.title.trim(),
      p_description: form.description.trim() || null,
      p_specialties: form.specialties.split(',').map(s => s.trim()).filter(Boolean),
      p_property_types: form.property_types,
      p_deal_types: form.deal_types,
      p_years_experience: parseInt(form.years_experience) || 0,
      p_projects_completed: parseInt(form.projects_completed) || 0,
    });

    // For Dubai listings, also set emirate and market_track on the listing
    if (data?.listing_id && marketTrack === 'dubai') {
      await supabase.from('listings').update({ emirate: form.emirate, market_track: 'dubai', is_dubai: true }).eq('id', data.listing_id);
    } else if (data?.listing_id && marketTrack === 'india') {
      await supabase.from('listings').update({ market_track: 'india' }).eq('id', data.listing_id);
    }

    setSubmitting(false);

    if (rpcError || !data?.success) {
      setError(data?.error || rpcError?.message || 'Submission failed. Please try again.');
      return;
    }

    setWalletBalance(prev => prev !== null ? prev - SUBMIT_COST : null);
    setSuccess({ listingId: data.listing_id });
  }

  if (!user) return null;

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-24">
          <Loader className="animate-spin" style={{ color: '#c9a84c' }} size={32} />
        </div>
      </Layout>
    );
  }

  if (success) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#fdf8f0' }}>
          <div className="bg-white rounded-2xl border-2 p-10 max-w-md w-full text-center shadow-lg" style={{ borderColor: '#c9a84c' }}>
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#0a1628' }}>Listing Submitted!</h2>
            <p className="text-gray-500 mb-2">
              Your listing is under review. Our team will approve it within 24-48 hours.
            </p>
            <p className="text-sm mb-8" style={{ color: '#c9a84c' }}>
              25 tokens deducted from your wallet
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90"
                style={{ backgroundColor: '#0a1628' }}
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => { setSuccess(null); setForm({ title: '', city_id: '', emirate: '', description: '', specialties: '', property_types: [], deal_types: [], years_experience: '', projects_completed: '' }); }}
                className="w-full py-3 rounded-xl font-semibold border-2 transition-all hover:border-opacity-80"
                style={{ borderColor: '#c9a84c', color: '#c9a84c' }}
              >
                Submit Another Listing
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const insufficientTokens = walletBalance !== null && walletBalance < SUBMIT_COST;

  return (
    <Layout>
      <div className="min-h-screen py-10 px-4" style={{ backgroundColor: '#fdf8f0' }}>
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Building2 style={{ color: '#0a1628' }} size={32} />
              <h1 className="text-4xl font-bold" style={{ color: '#0a1628' }}>Submit a Listing</h1>
            </div>
            <p className="text-gray-500">
              List your property on Property Herald. Costs{' '}
              <span className="font-semibold" style={{ color: '#c9a84c' }}>25 tokens</span> and goes live after admin approval.
            </p>
          </div>

          {/* Wallet balance */}
          <div
            className={`flex items-center justify-between rounded-xl border-2 px-5 py-4 mb-6 ${
              insufficientTokens ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <Coins size={20} style={{ color: '#c9a84c' }} />
              <div>
                <p className="text-sm text-gray-500">Token Balance</p>
                <p className="text-xl font-bold" style={{ color: '#0a1628' }}>
                  {walletBalance ?? '—'} tokens
                </p>
              </div>
            </div>
            {insufficientTokens ? (
              <button
                onClick={() => navigate('/tokens')}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
                style={{ backgroundColor: '#c9a84c' }}
              >
                Buy Tokens
              </button>
            ) : (
              <span className="text-sm text-gray-400">Cost: 25 tokens</span>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-7 shadow-sm space-y-6">
            {error && (
              <div className="flex items-start gap-2.5 p-4 bg-red-50 border border-red-100 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold" style={{ color: '#0a1628' }}>
                Listing Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="e.g. 3BHK Premium Apartments in Powai"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-gold/50 transition-colors"
                required
              />
            </div>

            {/* City */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold flex items-center gap-2" style={{ color: '#0a1628' }}>
                <MapPin size={15} style={{ color: '#c9a84c' }} />
                City <span className="text-red-400">*</span>
              </label>
              <select
                value={form.city_id}
                onChange={e => set('city_id', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-gold/50 transition-colors appearance-none"
                required
              >
                <option value="">Select city</option>
                {cities.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            {marketTrack === 'dubai' && (
              <div className="space-y-1.5">
                <label className="text-sm font-semibold flex items-center gap-2" style={{ color: '#0a1628' }}>
                  <MapPin size={15} style={{ color: '#c9a84c' }} />
                  Emirate <span className="text-red-400">*</span>
                </label>
                <select
                  value={form.emirate}
                  onChange={e => set('emirate', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-gold/50 transition-colors appearance-none"
                  required
                >
                  <option value="">Select emirate</option>
                  {['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain'].map(em => (
                    <option key={em} value={em}>{em}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Property types */}
            <div className="space-y-2">
              <label className="text-sm font-semibold" style={{ color: '#0a1628' }}>
                Property Type <span className="text-red-400">*</span>
              </label>
              <div className="flex gap-3">
                {PROPERTY_TYPES.map(pt => (
                  <button
                    key={pt}
                    type="button"
                    onClick={() => toggleArray('property_types', pt)}
                    className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold capitalize transition-all ${
                      form.property_types.includes(pt)
                        ? 'text-white border-transparent'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                    style={form.property_types.includes(pt) ? { backgroundColor: '#0a1628' } : {}}
                  >
                    {pt}
                  </button>
                ))}
              </div>
            </div>

            {/* Deal types */}
            <div className="space-y-2">
              <label className="text-sm font-semibold" style={{ color: '#0a1628' }}>
                Deal Type <span className="text-red-400">*</span>
              </label>
              <div className="flex gap-3">
                {DEAL_TYPES.map(dt => (
                  <button
                    key={dt}
                    type="button"
                    onClick={() => toggleArray('deal_types', dt)}
                    className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold capitalize transition-all ${
                      form.deal_types.includes(dt)
                        ? 'text-white border-transparent'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                    style={form.deal_types.includes(dt) ? { backgroundColor: '#0a1628' } : {}}
                  >
                    {dt}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold flex items-center gap-2" style={{ color: '#0a1628' }}>
                <FileText size={15} style={{ color: '#c9a84c' }} />
                Description
              </label>
              <textarea
                value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="Describe the property, amenities, location highlights..."
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-gold/50 transition-colors resize-none"
              />
            </div>

            {/* Specialties */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold flex items-center gap-2" style={{ color: '#0a1628' }}>
                <Tag size={15} style={{ color: '#c9a84c' }} />
                Specialties
              </label>
              <input
                type="text"
                value={form.specialties}
                onChange={e => set('specialties', e.target.value)}
                placeholder="e.g. Luxury, Sea-facing, RERA Approved (comma separated)"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-gold/50 transition-colors"
              />
            </div>

            {/* Experience + Projects */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold" style={{ color: '#0a1628' }}>Years Experience</label>
                <input
                  type="number"
                  min="0"
                  value={form.years_experience}
                  onChange={e => set('years_experience', e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-gold/50 transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold" style={{ color: '#0a1628' }}>Projects Completed</label>
                <input
                  type="number"
                  min="0"
                  value={form.projects_completed}
                  onChange={e => set('projects_completed', e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-gold/50 transition-colors"
                />
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-700 flex items-start gap-2">
              <span className="flex-shrink-0 mt-0.5">ℹ</span>
              <span>
                Submitting this listing will deduct <strong>25 tokens</strong> from your wallet. Your listing will be
                reviewed by our team and published within 24-48 hours. All listings must comply with RERA regulations.
              </span>
            </div>

            <button
              type="submit"
              disabled={submitting || insufficientTokens}
              className="w-full py-3.5 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
              style={{ backgroundColor: '#0a1628' }}
            >
              {submitting ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <ChevronRight className="w-4 h-4" />
                  Submit Listing (25 tokens)
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
