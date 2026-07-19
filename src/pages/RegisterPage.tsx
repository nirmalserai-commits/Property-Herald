import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { City } from '../types/database';
import {
  Building2, Users, Sparkles, Mail, Lock, Phone, MapPin, User,
  AlertCircle, Check, Home, Briefcase, ShoppingCart, Key, Eye, EyeOff, Zap,
} from 'lucide-react';

const TOKEN_BUNDLES = [
  { id: 'starter',    name: 'Starter',    tokens: 10,  price: 200,   desc: 'Perfect to explore the platform' },
  { id: 'growth',     name: 'Growth',     tokens: 50,  price: 1000,  desc: 'For agencies getting started' },
  { id: 'power',      name: 'Power',      tokens: 100, price: 2000,  desc: 'Most popular for developers', popular: true },
  { id: 'premium',    name: 'Premium',    tokens: 250, price: 5000,  desc: 'For high-volume listings' },
  { id: 'enterprise', name: 'Enterprise', tokens: 500, price: 10000, desc: 'Maximum reach and visibility' },
];

export function RegisterPage() {
  const [step, setStep] = useState(1);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { signUp, user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '', password: '', confirmPassword: '',
    business_name: '', business_type: '' as '' | 'developer' | 'agency' | 'agent',
    contact_person: '', phone: '', whatsapp_number: '', city_id: '',
    description: '', website_url: '',
    property_types: [] as string[], deal_types: [] as string[],
    selected_bundle: 'power',
  });

  useEffect(() => {
    supabase.from('cities').select('*').order('name')
      .then(({ data }) => { if (data) setCities(data as City[]); });
  }, []);

  useEffect(() => { if (user) navigate('/dashboard'); }, [user, navigate]);

  const set = (field: string, value: unknown) => { setFormData(prev => ({ ...prev, [field]: value })); setError(''); };
  const toggle = (field: 'property_types' | 'deal_types', value: string) => {
    setFormData(prev => ({ ...prev, [field]: prev[field].includes(value) ? prev[field].filter(v => v !== value) : [...prev[field], value] }));
  };

  const validate = () => {
    if (step === 1 && !formData.business_type) { setError('Please select your business type'); return false; }
    if (step === 2) {
      if (!formData.email || !formData.password) { setError('Email and password are required'); return false; }
      if (formData.password.length < 6) { setError('Password must be at least 6 characters'); return false; }
      if (formData.password !== formData.confirmPassword) { setError('Passwords do not match'); return false; }
      if (!formData.business_name || !formData.contact_person || !formData.phone || !formData.whatsapp_number || !formData.city_id) {
        setError('Please fill in all required fields'); return false;
      }
      if (formData.property_types.length === 0) { setError('Please select at least one property type'); return false; }
      if (formData.deal_types.length === 0) { setError('Please select at least one deal type'); return false; }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setError('');

    const { error: signUpError } = await signUp(formData.email, formData.password);
    if (signUpError) { setError(signUpError.message || 'Registration failed.'); setLoading(false); return; }

    const { data: { user: newUser } } = await supabase.auth.getUser();
    if (newUser) {
      await supabase.from('profiles').upsert({
        id: newUser.id,
        email: formData.email,
        business_name: formData.business_name,
        business_type: formData.business_type,
        contact_person: formData.contact_person,
        phone: formData.phone,
        whatsapp_number: formData.whatsapp_number,
        city_id: formData.city_id,
        description: formData.description || null,
        website_url: formData.website_url || null,
      });
    }

    navigate('/tokens');
  };

  const businessTypes = [
    { value: 'developer', label: 'Developer & Builder', icon: Building2, desc: 'Companies developing residential/commercial projects' },
    { value: 'agency',    label: 'Real Estate Agency',  icon: Users,     desc: 'Agencies with teams of property consultants' },
    { value: 'agent',     label: 'Property Agent',      icon: Sparkles,  desc: 'Individual agents and property consultants' },
  ] as const;

  const stepInfo = [{ n: 1, label: 'Type' }, { n: 2, label: 'Details' }, { n: 3, label: 'Plan' }];

  return (
    <div className="min-h-screen bg-navy py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/">
            <img src="/logo.png.png" alt="Property Herald" className="h-20 w-auto mx-auto object-contain drop-shadow-2xl"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </Link>
          <h1 className="text-2xl font-serif font-bold text-cream mt-4">List Your Business</h1>
          <p className="text-cream/60 mt-2">Join India's premier real estate directory</p>
        </div>

        {/* Step indicators */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-2">
            {stepInfo.map(({ n, label }, idx) => (
              <div key={n} className="flex items-center">
                {idx > 0 && <div className={`w-10 h-0.5 mx-2 ${step > idx ? 'bg-gold' : 'bg-cream/20'}`} />}
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
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {error && (
            <div className="flex items-center p-4 bg-red-50 text-red-700 rounded-xl mb-6">
              <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Step 1: Business Type */}
            {step === 1 && (
              <div>
                <h2 className="text-xl font-serif font-bold text-navy mb-6">Select Your Business Type</h2>
                <div className="space-y-4">
                  {businessTypes.map(({ value, label, icon: Icon, desc }) => (
                    <button key={value} type="button" onClick={() => set('business_type', value)}
                      className={`w-full flex items-center gap-4 p-5 rounded-xl border-2 transition-all text-left ${
                        formData.business_type === value
                          ? 'border-navy bg-navy/3 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        formData.business_type === value ? 'bg-navy' : 'bg-gray-100'
                      }`}>
                        <Icon className={`w-7 h-7 ${formData.business_type === value ? 'text-gold' : 'text-gray-400'}`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-navy">{label}</p>
                        <p className="text-sm text-warm-gray">{desc}</p>
                      </div>
                      {formData.business_type === value && (
                        <div className="w-6 h-6 bg-navy rounded-full flex items-center justify-center flex-shrink-0">
                          <Check className="w-4 h-4 text-gold" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <div className="mt-8 flex justify-end">
                  <button type="button" onClick={() => { if (validate()) setStep(2); }} disabled={!formData.business_type}
                    className="px-8 py-3 bg-navy text-cream font-display font-bold rounded-xl hover:bg-navy/90 disabled:opacity-40 transition-colors">
                    Continue →
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Details */}
            {step === 2 && (
              <div>
                <h2 className="text-xl font-serif font-bold text-navy mb-6">Business & Account Details</h2>
                <div className="space-y-5">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Property Types *</label>
                      <div className="space-y-2">
                        {[{ v: 'residential', l: 'Residential', i: Home }, { v: 'commercial', l: 'Commercial', i: Briefcase }].map(({ v, l, i: Icon }) => (
                          <button key={v} type="button" onClick={() => toggle('property_types', v)}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                              formData.property_types.includes(v) ? 'border-navy bg-navy/3' : 'border-gray-200 hover:border-gray-300'
                            }`}>
                            <Icon className={`w-5 h-5 ${formData.property_types.includes(v) ? 'text-navy' : 'text-gray-400'}`} />
                            <span className="font-medium text-navy text-sm flex-1 text-left">{l}</span>
                            {formData.property_types.includes(v) && <Check className="w-4 h-4 text-navy" />}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Deal Types *</label>
                      <div className="space-y-2">
                        {[{ v: 'buy', l: 'Buy / Sale', i: ShoppingCart }, { v: 'rent', l: 'Rent / Lease', i: Key }].map(({ v, l, i: Icon }) => (
                          <button key={v} type="button" onClick={() => toggle('deal_types', v)}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                              formData.deal_types.includes(v) ? 'border-navy bg-navy/3' : 'border-gray-200 hover:border-gray-300'
                            }`}>
                            <Icon className={`w-5 h-5 ${formData.deal_types.includes(v) ? 'text-navy' : 'text-gray-400'}`} />
                            <span className="font-medium text-navy text-sm flex-1 text-left">{l}</span>
                            {formData.deal_types.includes(v) && <Check className="w-4 h-4 text-navy" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type="email" value={formData.email} onChange={e => set('email', e.target.value)} required placeholder="you@example.com"
                          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold/40 focus:border-gold/60 outline-none" />
                      </div>
                    </div>
                    <div />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type={showPassword ? 'text' : 'password'} value={formData.password} onChange={e => set('password', e.target.value)} required placeholder="Min 6 characters"
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
                        <input type={showConfirm ? 'text' : 'password'} value={formData.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} required placeholder="Re-enter password"
                          className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold/40 focus:border-gold/60 outline-none" />
                        <button type="button" onClick={() => setShowConfirm(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Business Name *</label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input type="text" value={formData.business_name} onChange={e => set('business_name', e.target.value)} required placeholder="Your business name"
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold/40 focus:border-gold/60 outline-none" />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Contact Person *</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type="text" value={formData.contact_person} onChange={e => set('contact_person', e.target.value)} required placeholder="Your full name"
                          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold/40 focus:border-gold/60 outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <select value={formData.city_id} onChange={e => set('city_id', e.target.value)} required
                          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold/40 focus:border-gold/60 outline-none appearance-none bg-white">
                          <option value="">Select City</option>
                          {cities.map(city => <option key={city.id} value={city.id}>{city.name}, {city.state}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type="tel" value={formData.phone} onChange={e => set('phone', e.target.value)} required placeholder="+91 9876543210"
                          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold/40 focus:border-gold/60 outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">WhatsApp Number *</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type="tel" value={formData.whatsapp_number} onChange={e => set('whatsapp_number', e.target.value)} required placeholder="WhatsApp number"
                          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold/40 focus:border-gold/60 outline-none" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Business Description</label>
                    <textarea value={formData.description} onChange={e => set('description', e.target.value)}
                      placeholder="Tell potential clients about your services..." rows={3}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold/40 outline-none resize-none" />
                  </div>
                </div>

                <div className="mt-8 flex justify-between">
                  <button type="button" onClick={() => setStep(1)} className="px-6 py-3 text-warm-gray font-medium hover:text-navy transition-colors">← Back</button>
                  <button type="button" onClick={() => { if (validate()) setStep(3); }}
                    className="px-8 py-3 bg-navy text-cream font-display font-bold rounded-xl hover:bg-navy/90 transition-colors">
                    Continue →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Token Bundle */}
            {step === 3 && (
              <div>
                <h2 className="text-xl font-serif font-bold text-navy mb-1">Choose Your Starter Bundle</h2>
                <p className="text-warm-gray text-sm mb-6">1 token = ₹20 · Tokens never expire · Pay via Razorpay after registration</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
                  {TOKEN_BUNDLES.map(bundle => (
                    <button key={bundle.id} type="button" onClick={() => set('selected_bundle', bundle.id)}
                      className={`relative p-5 rounded-xl border-2 transition-all text-left ${
                        formData.selected_bundle === bundle.id
                          ? 'border-navy bg-navy/5 shadow-md'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                      {bundle.popular && (
                        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-gold text-navy text-xs font-bold rounded-full">Most Popular</span>
                      )}
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className={`w-4 h-4 ${formData.selected_bundle === bundle.id ? 'text-gold' : 'text-gray-400'}`} />
                        <h3 className="font-bold text-navy">{bundle.name}</h3>
                      </div>
                      <p className="text-2xl font-bold text-gold">₹{bundle.price.toLocaleString('en-IN')}</p>
                      <p className="text-sm font-semibold text-navy/70 mt-0.5">{bundle.tokens} tokens</p>
                      <p className="text-xs text-gray-500 mt-1">{bundle.desc}</p>
                      {formData.selected_bundle === bundle.id && (
                        <div className="absolute top-2.5 right-2.5 w-5 h-5 bg-navy rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-gold" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 mb-6">
                  <strong>How it works:</strong> Complete registration now, then pay for your chosen bundle via Razorpay on the next screen. Tokens are credited instantly after payment.
                </div>
                <div className="flex justify-between">
                  <button type="button" onClick={() => setStep(2)} className="px-6 py-3 text-warm-gray font-medium hover:text-navy transition-colors">← Back</button>
                  <button type="submit" disabled={loading}
                    className="px-8 py-3 bg-navy text-cream font-display font-bold rounded-xl hover:bg-navy/90 disabled:opacity-40 flex items-center gap-2 transition-colors">
                    {loading
                      ? <><div className="w-5 h-5 border-2 border-cream/30 border-t-cream rounded-full animate-spin" />Creating Account…</>
                      : <><Zap className="w-5 h-5" />Complete & Buy Tokens</>}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        <div className="mt-6 text-center">
          <p className="text-cream/60 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-gold font-medium hover:text-gold/80 transition-colors">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
