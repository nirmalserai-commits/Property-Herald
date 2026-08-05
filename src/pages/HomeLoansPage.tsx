import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Check, ChevronRight, MessageCircle, Shield, Star, Phone } from 'lucide-react';

const PARTNER_BANKS = [
  {
    name: 'SBI Home Loans',
    rate: '8.50%',
    logo: 'SBI',
    color: 'bg-blue-600',
    tagline: 'Lowest rates for salaried professionals',
  },
  {
    name: 'HDFC Ltd',
    rate: '8.70%',
    logo: 'HDFC',
    color: 'bg-red-600',
    tagline: 'Flexible repayment options',
  },
  {
    name: 'ICICI Bank',
    rate: '8.75%',
    logo: 'ICICI',
    color: 'bg-orange-500',
    tagline: 'Fast approval in 48 hours',
  },
  {
    name: 'Axis Bank',
    rate: '8.80%',
    logo: 'AXIS',
    color: 'bg-purple-700',
    tagline: 'Competitive rates with quick processing',
  },
  {
    name: 'Bank of Baroda',
    rate: '8.60%',
    logo: 'BOB',
    color: 'bg-amber-600',
    tagline: 'Trusted public sector bank with attractive home loan rates',
  },
  {
    name: 'LIC Housing Finance',
    rate: '8.65%',
    logo: 'LIC',
    color: 'bg-green-700',
    tagline: 'Trusted by 30 lakh families',
  },
];

const LOAN_STEPS = [
  { step: 1, title: 'Share Your Details', desc: 'Fill a short form — takes under 2 minutes' },
  { step: 2, title: 'Neetu Reviews', desc: 'Our AI assistant pre-qualifies your profile instantly' },
  { step: 3, title: 'Bank Match', desc: 'We match you with the best bank for your profile' },
  { step: 4, title: 'Get Pre-Approval', desc: 'Receive your home loan pre-approval letter' },
];

interface LeadForm {
  name: string;
  phone: string;
  email: string;
  loanAmount: string;
  city: string;
  employmentType: string;
}

export function HomeLoansPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'neetu' | 'neelu'>('neetu');
  const [form, setForm] = useState<LeadForm>({
    name: '', phone: '', email: '', loanAmount: '', city: '', employmentType: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function set(field: keyof LeadForm, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return;
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 800));
    setSubmitting(false);
    setSubmitted(true);
  }

  return (
    <Layout>
      <div className="min-h-screen" style={{ backgroundColor: '#fdf8f0' }}>
        {/* Hero */}
        <div className="bg-navy text-cream py-16 px-4">
          <div className="max-w-5xl mx-auto text-center">
            <p className="text-gold text-sm font-semibold tracking-widest uppercase mb-3">Naya Ghar Finance Centre</p>
            <h1 className="text-4xl md:text-5xl font-bold mb-3">Naya Ghar, Naya Sapna,<br />Naya Raasta</h1>
            <p className="text-cream/60 text-lg max-w-2xl mx-auto">
              Get pre-qualified for a home loan in 5 minutes. Our AI team connects you with India's leading banks — SBI, HDFC, ICICI, Axis, Bank of Baroda and LIC Housing Finance.
            </p>
          </div>
        </div>

        {/* N-Girl Tabs */}
        <div className="max-w-5xl mx-auto px-4 -mt-8">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="flex border-b border-gray-100">
              <button
                onClick={() => setActiveTab('neetu')}
                className={`flex-1 py-4 px-6 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'neetu'
                    ? 'bg-navy text-cream border-b-2 border-gold'
                    : 'text-gray-500 hover:text-navy hover:bg-gray-50'
                }`}
              >
                <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-gold/40 flex-shrink-0">
                  <img src="/nora-chat.png.png" alt="Neetu" className="w-full h-full object-cover" />
                </div>
                Neetu — Home Loans
              </button>
              <button
                onClick={() => setActiveTab('neelu')}
                className={`flex-1 py-4 px-6 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'neelu'
                    ? 'bg-navy text-cream border-b-2 border-gold'
                    : 'text-gray-500 hover:text-navy hover:bg-gray-50'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-green-100 border-2 border-green-300 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-green-600" />
                </div>
                Neelu — Insurance
              </button>
            </div>

            {activeTab === 'neetu' && (
              <div className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row gap-8">
                  {/* Neetu Profile */}
                  <div className="md:w-64 flex-shrink-0">
                    <div className="text-center p-6 rounded-2xl" style={{ backgroundColor: '#0a1628' }}>
                      <div className="w-24 h-24 rounded-full overflow-hidden border-4 mx-auto mb-4" style={{ borderColor: '#c9a84c' }}>
                        <img src="/nora-chat.png.png" alt="Neetu" className="w-full h-full object-cover" />
                      </div>
                      <h3 className="text-cream font-bold text-lg">Neetu</h3>
                      <p className="text-gold text-xs font-semibold mt-1 uppercase tracking-wider">Home Loans Specialist</p>
                      <p className="text-cream/50 text-xs mt-1">Forever 27 · Bilingual</p>
                      <div className="mt-4 flex items-center justify-center gap-1">
                        {[1,2,3,4,5].map(i => <Star key={i} className="w-3.5 h-3.5 text-gold fill-gold" />)}
                      </div>
                      <p className="text-cream/40 text-xs mt-1">4.9 / 5 · 2,847 pre-qualifications</p>
                      <div className="mt-4 p-3 bg-white/10 rounded-xl">
                        <p className="text-cream/80 text-xs italic leading-relaxed">
                          "Namaste! Main Neetu hoon. Aapka ghar ka sapna, mera kaam!"
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Lead Form or Success */}
                  <div className="flex-1">
                    {submitted ? (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Check className="w-8 h-8 text-green-500" />
                        </div>
                        <h3 className="text-xl font-bold mb-2" style={{ color: '#0a1628' }}>Neetu will call you back!</h3>
                        <p className="text-gray-500 mb-2">Thank you, {form.name}. We've received your details.</p>
                        <p className="text-sm text-gray-400 mb-6">Our team will reach out to <strong>{form.phone}</strong> within 2 hours to begin your pre-qualification.</p>
                        <button
                          onClick={() => navigate('/emi-calculator')}
                          className="px-6 py-3 rounded-xl text-sm font-semibold text-white"
                          style={{ backgroundColor: '#0a1628' }}
                        >
                          Calculate Your EMI
                        </button>
                      </div>
                    ) : (
                      <>
                        <h3 className="text-xl font-bold mb-1" style={{ color: '#0a1628' }}>Get Pre-Qualified in 5 Minutes</h3>
                        <p className="text-gray-500 text-sm mb-6">Fill in your details and Neetu will find the best loan for you.</p>
                        <form onSubmit={handleSubmit} className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Full Name *</label>
                              <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
                                placeholder="Your full name" required
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-gold/50 transition-colors" />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phone Number *</label>
                              <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                                placeholder="+91 98765 43210" required
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-gold/50 transition-colors" />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email</label>
                              <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                                placeholder="you@example.com"
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-gold/50 transition-colors" />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Loan Amount Required</label>
                              <select value={form.loanAmount} onChange={e => set('loanAmount', e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-gold/50 transition-colors appearance-none">
                                <option value="">Select range</option>
                                <option>Under ₹25 Lakhs</option>
                                <option>₹25L – ₹50L</option>
                                <option>₹50L – ₹1 Crore</option>
                                <option>₹1Cr – ₹2 Crore</option>
                                <option>Above ₹2 Crore</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1.5">City</label>
                              <select value={form.city} onChange={e => set('city', e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-gold/50 transition-colors appearance-none">
                                <option value="">Select city</option>
                                <option>Mumbai</option>
                                <option>Pune</option>
                                <option>Thane</option>
                                <option>Navi Mumbai</option>
                                <option>Nashik</option>
                                <option>Other</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Employment Type</label>
                              <select value={form.employmentType} onChange={e => set('employmentType', e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-gold/50 transition-colors appearance-none">
                                <option value="">Select type</option>
                                <option>Salaried</option>
                                <option>Self-Employed</option>
                                <option>Business Owner</option>
                                <option>NRI</option>
                              </select>
                            </div>
                          </div>
                          <button type="submit" disabled={submitting || !form.name.trim() || !form.phone.trim()}
                            className="w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
                            style={{ backgroundColor: '#0a1628' }}>
                            {submitting ? (
                              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Pre-qualifying…</>
                            ) : (
                              <><MessageCircle className="w-4 h-4" />Get Pre-Qualified Now</>
                            )}
                          </button>
                        </form>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'neelu' && (
              <div className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="md:w-64 flex-shrink-0">
                    <div className="text-center p-6 rounded-2xl bg-green-900">
                      <div className="w-24 h-24 rounded-full bg-green-100 border-4 border-green-400 flex items-center justify-center mx-auto mb-4">
                        <Shield className="w-10 h-10 text-green-600" />
                      </div>
                      <h3 className="text-white font-bold text-lg">Neelu</h3>
                      <p className="text-green-300 text-xs font-semibold mt-1 uppercase tracking-wider">Insurance Specialist</p>
                      <p className="text-white/50 text-xs mt-1">Forever 27 · Caring Expert</p>
                      <div className="mt-4 p-3 bg-white/10 rounded-xl">
                        <p className="text-white/80 text-xs italic leading-relaxed">
                          "Hi! I'm Neelu. Let me help protect your new home and family."
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-1" style={{ color: '#0a1628' }}>Home & Life Insurance</h3>
                    <p className="text-gray-500 text-sm mb-6">Protect your biggest investment. Neelu recommends the right cover for your property and family.</p>
                    <div className="grid sm:grid-cols-2 gap-4 mb-6">
                      {[
                        { title: 'Home Insurance', desc: 'Protect your property from fire, theft, and natural disasters', icon: '🏠' },
                        { title: 'Life Cover', desc: 'Ensure your family is covered if anything happens to you', icon: '❤️' },
                        { title: 'Critical Illness', desc: 'Coverage for serious health conditions during loan tenure', icon: '🏥' },
                        { title: 'EMI Protection', desc: 'Your EMIs continue to be paid if you lose your income', icon: '🛡️' },
                      ].map(item => (
                        <div key={item.title} className="p-4 rounded-xl border border-gray-200 bg-gray-50">
                          <div className="text-2xl mb-2">{item.icon}</div>
                          <h4 className="font-semibold text-sm mb-1" style={{ color: '#0a1628' }}>{item.title}</h4>
                          <p className="text-xs text-gray-500">{item.desc}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 border border-green-200">
                      <Phone className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-green-800">Talk to Neelu</p>
                        <p className="text-xs text-green-600">Submit your loan enquiry and Neelu will include the right insurance recommendation automatically.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Partner Banks */}
        <div className="max-w-5xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-center mb-2" style={{ color: '#0a1628' }}>Partner Banks</h2>
          <p className="text-center text-gray-500 text-sm mb-8">We work with India's most trusted home loan providers</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {PARTNER_BANKS.map(bank => (
              <div key={bank.name} className="bg-white rounded-2xl border border-gray-200 p-5 text-center shadow-sm hover:shadow-md transition-shadow">
                <div className={`w-12 h-12 ${bank.color} rounded-xl flex items-center justify-center mx-auto mb-3`}>
                  <span className="text-white font-bold text-xs">{bank.logo}</span>
                </div>
                <p className="font-bold text-sm mb-1" style={{ color: '#0a1628' }}>{bank.name}</p>
                <p className="text-xl font-bold" style={{ color: '#c9a84c' }}>{bank.rate}</p>
                <p className="text-xs text-gray-400 mt-0.5">p.a. onwards</p>
                <p className="text-xs text-gray-500 mt-2">{bank.tagline}</p>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="bg-navy py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-center text-cream mb-8">How It Works</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {LOAN_STEPS.map(item => (
                <div key={item.step} className="text-center">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-navy font-bold text-lg" style={{ backgroundColor: '#c9a84c' }}>
                    {item.step}
                  </div>
                  <h3 className="text-cream font-semibold text-sm mb-1">{item.title}</h3>
                  <p className="text-cream/50 text-xs">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Why NGFC */}
        <div className="max-w-4xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-center mb-8" style={{ color: '#0a1628' }}>Why Choose NGFC?</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { icon: '⚡', title: 'Instant Pre-Qualification', desc: 'Know your eligibility in 5 minutes, not days' },
              { icon: '🏦', title: '6 Partner Banks', desc: 'Compare rates across SBI, HDFC, ICICI, Axis, Bank of Baroda, and LIC HFL' },
              { icon: '🔒', title: 'Zero Cost to You', desc: 'Our service is completely free for home buyers' },
            ].map(item => (
              <div key={item.title} className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="font-bold mb-2" style={{ color: '#0a1628' }}>{item.title}</h3>
                <p className="text-gray-500 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <button
              onClick={() => { setActiveTab('neetu'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-white transition-all hover:opacity-90"
              style={{ backgroundColor: '#0a1628' }}
            >
              Get Started with Neetu
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
