import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { City } from '../types/database';
import {
  User, Mail, Lock, Phone, MapPin, Home, Briefcase,
  ShoppingCart, Key, Clock, Check, AlertCircle, Sparkles, Eye, EyeOff,
} from 'lucide-react';

const BUDGET_OPTIONS = [
  { label: 'Under ₹50 Lakhs', min: 0, max: 5000000 },
  { label: '₹50L – ₹1 Crore', min: 5000000, max: 10000000 },
  { label: '₹1Cr – ₹2 Crore', min: 10000000, max: 20000000 },
  { label: '₹2Cr – ₹5 Crore', min: 20000000, max: 50000000 },
  { label: 'Above ₹5 Crore', min: 50000000, max: 999999999 },
];

const TIMELINE_OPTIONS = [
  { value: 'immediate', label: 'Immediately' },
  { value: '3_months',  label: 'Within 3 months' },
  { value: '6_months',  label: '3–6 months' },
  { value: '1_year',    label: '6–12 months' },
  { value: 'flexible',  label: '1 year+' },
];

export function BuyerRegisterPage() {
  const [step, setStep]       = useState(1);
  const [cities, setCities]   = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [done, setDone]       = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const navigate              = useNavigate();

  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', password: '', confirm: '',
    city_preference: '', budget_label: '', budget_min: 0, budget_max: 0,
    property_type: '' as '' | 'residential' | 'commercial' | 'both',
    deal_type: '' as '' | 'buy' | 'rent' | 'invest',
    timeline: '' as '' | 'immediate' | '3_months' | '6_months' | '1_year' | 'flexible',
  });

  useEffect(() => {
    supabase.from('cities').select('*').order('name')
      .then(({ data }) => { if (data) setCities(data as City[]); });
  }, []);

  const set = (f: string, v: unknown) => { setForm(p => ({ ...p, [f]: v })); setError(''); };

  const handleBudget = (opt: typeof BUDGET_OPTIONS[0]) => {
    setForm(p => ({ ...p, budget_label: opt.label, budget_min: opt.min, budget_max: opt.max }));
    setError('');
  };

  const validate1 = () => {
    if (!form.full_name.trim()) { setError('Please enter your full name'); return false; }
    if (!form.email.trim()) { setError('Email is required'); return false; }
    if (!form.phone.trim()) { setError('Phone number is required'); return false; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return false; }
    if (form.password !== form.confirm) { setError('Passwords do not match'); return false; }
    return true;
  };

  const validate2 = () => {
    if (!form.deal_type) { setError('Please select what you are looking for'); return false; }
    if (!form.budget_label) { setError('Please select a budget range'); return false; }
    if (!form.property_type) { setError('Please select a property type'); return false; }
    if (!form.timeline) { setError('Please select your timeline'); return false; }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate2()) return;
    setLoading(true);
    setError('');

    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    });

    if (signUpErr) {
      setError(signUpErr.message || 'Registration failed');
      setLoading(false);
      return;
    }

    const userId = signUpData.user?.id ?? null;

    const { error: buyerErr } = await supabase.from('buyers').insert({
      user_id:        userId,
      full_name:      form.full_name.trim(),
      email:          form.email.trim(),
      phone:          form.phone.trim(),
      city_preference: form.city_preference || null,
      budget_label:   form.budget_label,
      budget_min:     form.budget_min,
      budget_max:     form.budget_max,
      property_type:  form.property_type || null,
      deal_type:      form.deal_type || null,
      timeline:       form.timeline || null,
      intent_score:   75,
      source:         'registration',
    });

    if (buyerErr) {
      setError(buyerErr.message || 'Failed to save buyer profile');
      setLoading(false);
      return;
    }

    setDone(true);
    setLoading(false);
    setTimeout(() => navigate('/listings'), 2500);
  };

  if (done) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-gold/10 border-4 border-gold/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-gold" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-navy mb-3">You're registered!</h2>
          <p className="text-warm-gray mb-2">Welcome to Property Herald, {form.full_name.split(' ')[0]}.</p>
          <p className="text-warm-gray text-sm mb-6">Redirecting you to browse properties…</p>
          <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/">
            <img src="/logo.png.png" alt="Property Herald" className="h-20 w-auto mx-auto object-contain drop-shadow-2xl"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </Link>
          <h1 className="text-2xl font-serif font-bold text-cream mt-4">Register as a Buyer</h1>
          <p className="text-cream/60 mt-1 text-sm">Discover curated properties matched to your needs</p>
        </div>

        {/* Step indicator */}
        <div className="flex justify-center mb-8">
          {[{ n: 1, label: 'Account' }, { n: 2, label: 'Preferences' }].map(({ n, label }, idx) => (
            <div key={n} className="flex items-center">
              {idx > 0 && <div className={`w-16 h-0.5 mx-2 ${step > 1 ? 'bg-gold' : 'bg-cream/20'}`} />}
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                  step > n ? 'bg-gold text-navy' : step === n ? 'bg-gold text-navy ring-4 ring-gold/30' : 'bg-cream/10 text-cream/40'
                }`}>
                  {step > n ? <Check className="w-5 h-5" /> : n}
                </div>
                <span className={`text-xs mt-1 font-medium ${step >= n ? 'text-gold' : 'text-cream/40'}`}>{label}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {error && (
            <div className="flex items-center p-4 bg-red-50 text-red-700 rounded-xl mb-6">
              <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* ── STEP 1: Account Details ── */}
            {step === 1 && (
              <div className="space-y-5">
                <h2 className="text-xl font-serif font-bold text-navy mb-4">Your Account Details</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="text" value={form.full_name} onChange={e => set('full_name', e.target.value)}
                      placeholder="Your full name" required
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold/40 focus:border-gold/60 outline-none" />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                        placeholder="you@example.com" required
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold/40 focus:border-gold/60 outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone / WhatsApp *</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                        placeholder="+91 9876543210" required
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold/40 focus:border-gold/60 outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)}
                        placeholder="Min 6 characters" required
                        className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold/40 focus:border-gold/60 outline-none" />
                      <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password *</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input type={showConfirm ? 'text' : 'password'} value={form.confirm} onChange={e => set('confirm', e.target.value)}
                        placeholder="Re-enter password" required
                        className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold/40 focus:border-gold/60 outline-none" />
                      <button type="button" onClick={() => setShowConfirm(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <button type="button" onClick={() => { if (validate1()) setStep(2); }}
                    className="px-8 py-3 bg-navy text-cream font-display font-bold rounded-xl hover:bg-navy/90 transition-colors">
                    Continue →
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 2: Property Preferences ── */}
            {step === 2 && (
              <div className="space-y-6">
                <h2 className="text-xl font-serif font-bold text-navy mb-4">Your Property Preferences</h2>

                {/* What are you looking for */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">What are you looking for? *</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { v: 'buy',    l: 'Buy',    i: ShoppingCart },
                      { v: 'rent',   l: 'Rent',   i: Key },
                      { v: 'invest', l: 'Invest',  i: Briefcase },
                    ].map(({ v, l, i: Icon }) => (
                      <button key={v} type="button" onClick={() => set('deal_type', v)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                          form.deal_type === v ? 'border-navy bg-navy/5' : 'border-gray-200 hover:border-gray-300'
                        }`}>
                        <Icon className={`w-6 h-6 ${form.deal_type === v ? 'text-navy' : 'text-gray-400'}`} />
                        <span className={`text-sm font-medium ${form.deal_type === v ? 'text-navy' : 'text-gray-600'}`}>{l}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Budget */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Budget Range *</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {BUDGET_OPTIONS.map(opt => (
                      <button key={opt.label} type="button" onClick={() => handleBudget(opt)}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                          form.budget_label === opt.label ? 'border-navy bg-navy/5' : 'border-gray-200 hover:border-gray-300'
                        }`}>
                        <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                          form.budget_label === opt.label ? 'border-navy bg-navy' : 'border-gray-300'
                        }`}>
                          {form.budget_label === opt.label && <div className="w-2 h-2 bg-gold rounded-full" />}
                        </div>
                        <span className={`text-sm font-medium ${form.budget_label === opt.label ? 'text-navy' : 'text-gray-600'}`}>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Property Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Property Type *</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { v: 'residential', l: 'Residential', i: Home },
                      { v: 'commercial',  l: 'Commercial',  i: Briefcase },
                      { v: 'both',        l: 'Both',         i: Sparkles },
                    ].map(({ v, l, i: Icon }) => (
                      <button key={v} type="button" onClick={() => set('property_type', v)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                          form.property_type === v ? 'border-navy bg-navy/5' : 'border-gray-200 hover:border-gray-300'
                        }`}>
                        <Icon className={`w-6 h-6 ${form.property_type === v ? 'text-navy' : 'text-gray-400'}`} />
                        <span className={`text-sm font-medium ${form.property_type === v ? 'text-navy' : 'text-gray-600'}`}>{l}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Timeline */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">When do you plan to buy? *</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {TIMELINE_OPTIONS.map(({ value, label }) => (
                      <button key={value} type="button" onClick={() => set('timeline', value)}
                        className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                          form.timeline === value ? 'border-navy bg-navy/5' : 'border-gray-200 hover:border-gray-300'
                        }`}>
                        <Clock className={`w-4 h-4 ${form.timeline === value ? 'text-navy' : 'text-gray-400'}`} />
                        <span className={`text-sm font-medium ${form.timeline === value ? 'text-navy' : 'text-gray-600'}`}>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* City (optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Preferred City (optional)</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <select value={form.city_preference} onChange={e => set('city_preference', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold/40 outline-none appearance-none bg-white">
                      <option value="">Any city</option>
                      {cities.map(c => <option key={c.id} value={c.name}>{c.name}, {c.state}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex justify-between pt-2">
                  <button type="button" onClick={() => setStep(1)} className="px-6 py-3 text-warm-gray font-medium hover:text-navy transition-colors">← Back</button>
                  <button type="submit" disabled={loading}
                    className="px-8 py-3 bg-navy text-cream font-display font-bold rounded-xl hover:bg-navy/90 disabled:opacity-40 flex items-center gap-2 transition-colors">
                    {loading
                      ? <><div className="w-5 h-5 border-2 border-cream/30 border-t-cream rounded-full animate-spin" />Creating Account…</>
                      : <><Check className="w-5 h-5" />Complete Registration</>}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        <div className="mt-6 text-center space-y-2">
          <p className="text-cream/60 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-gold font-medium hover:text-gold/80 transition-colors">Sign In</Link>
          </p>
          <p className="text-cream/60 text-sm">
            Are you a developer or agent?{' '}
            <Link to="/register" className="text-gold font-medium hover:text-gold/80 transition-colors">List Your Business</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
