import { useState } from 'react';
import { Layout } from '../components/Layout';
import {
  Globe, ShieldCheck, Calculator, FileText, Building2,
  TrendingUp, Phone, IndianRupee, ChevronDown, ChevronRight,
  CheckCircle2, AlertTriangle, Star, Landmark,
} from 'lucide-react';

interface FxRates {
  aed: number;
  usd: number;
  gbp: number;
  eur: number;
}

// Approximate live-ish rates (static for display; in production fetch from edge fn)
const FX: FxRates = { aed: 22.8, usd: 83.8, gbp: 107.2, eur: 91.4 };

function inrTo(inr: number, currency: keyof FxRates) {
  return (inr / FX[currency]).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

const CORRIDORS = [
  { name: 'Mumbai–Thane–Kalyan', yield: '4.2–5.8%', cap: '₹45L–₹3.2Cr', trend: '+12%', hot: true },
  { name: 'Pune–PCMC Corridor', yield: '4.8–6.2%', cap: '₹32L–₹2.1Cr', trend: '+18%', hot: true },
  { name: 'Hyderabad IT Corridor', yield: '5.1–6.8%', cap: '₹28L–₹1.8Cr', trend: '+22%', hot: false },
  { name: 'Bengaluru East–North', yield: '4.5–6.0%', cap: '₹35L–₹2.5Cr', trend: '+15%', hot: false },
  { name: 'NCR–Noida Expressway', yield: '3.8–5.2%', cap: '₹40L–₹2.8Cr', trend: '+9%', hot: false },
  { name: 'Ahmedabad–GIFT City', yield: '5.2–7.1%', cap: '₹22L–₹1.4Cr', trend: '+28%', hot: true },
];

const FEMA_FAQS = [
  {
    q: 'Can an NRI purchase residential property in India?',
    a: 'Yes. NRIs and OCIs can freely purchase residential and commercial properties in India under FEMA regulations. No RBI permission is required for such purchases. Payments must be made through NRE/NRO/FCNR accounts or remittance from abroad.',
  },
  {
    q: 'How many properties can an NRI own in India?',
    a: 'There is no limit on the number of residential or commercial properties an NRI can own. Agricultural land, plantation property, and farmhouses however require RBI approval.',
  },
  {
    q: 'Can NRI repatriate sale proceeds back abroad?',
    a: 'Yes, up to the amount of foreign exchange equivalent used for the original purchase, or up to USD 1 million per financial year from NRO account after tax deductions. Repatriation of funds from NRE account is fully free.',
  },
  {
    q: 'What is TDS on property sale by an NRI?',
    a: 'TDS is deducted at 20% (plus surcharge and cess) on long-term capital gains and 30% on short-term gains. The buyer is responsible for deducting and depositing TDS. An NRI can apply for a lower TDS certificate from the Income Tax department.',
  },
  {
    q: 'Can an NRI get a home loan in India?',
    a: 'Yes. Most major banks including SBI, HDFC, and ICICI offer NRI home loans. EMI must be paid from NRE/NRO accounts. Loan amounts up to ₹1 Cr and above are available depending on income profile.',
  },
  {
    q: 'What documents does an NRI need to buy property?',
    a: 'Passport & visa, PAN card, OCI card (if applicable), NRE/NRO bank account details, proof of income (salary slips or IT returns), and POA (Power of Attorney) if purchasing remotely through a representative.',
  },
];

const BANKS_NRI = [
  { name: 'SBI NRI Home Loan', rate: '8.50', features: ['Up to 30yr tenure', 'No processing fee for NRI', 'EMI in NRE/NRO'], color: 'blue' },
  { name: 'HDFC NRI Loan', rate: '8.75', features: ['Doorstep service abroad', 'Top-up available', 'Online account access'], color: 'red' },
  { name: 'ICICI NRI Home Loan', rate: '8.65', features: ['Pre-approved for select NRIs', 'Flexible repayment', 'Joint loan option'], color: 'orange' },
];

export function NriPortalPage() {
  const [priceInr, setPriceInr] = useState(5000000);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <Layout>
      <div className="min-h-screen bg-cream">
        {/* Hero */}
        <div className="relative overflow-hidden bg-navy text-white py-20 px-4">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-8 left-8 w-72 h-72 bg-gold rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-400 rounded-full blur-3xl" />
          </div>
          <div className="relative max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gold/15 border border-gold/30 rounded-full text-gold text-xs font-semibold mb-5">
              <Globe className="w-3.5 h-3.5" />
              NRI Investment Portal
            </div>
            <h1 className="text-5xl font-serif font-bold mb-4">
              Invest in India.<br />
              <span className="text-gold">From Anywhere in the World.</span>
            </h1>
            <p className="text-cream/70 text-xl max-w-2xl mx-auto mb-8">
              Property Herald is India's most trusted NRI real estate intelligence platform. Verified listings, FEMA compliance guidance, multi-currency pricing, and direct founder access.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <a href="/directory" className="bg-gold text-navy px-8 py-3.5 rounded-xl font-bold hover:bg-gold/90 transition-colors">
                Browse Verified Listings
              </a>
              <a href="/emi-calculator" className="border border-white/30 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-white/10 transition-colors">
                EMI Calculator
              </a>
            </div>
          </div>
        </div>

        {/* Trust bar */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-5xl mx-auto px-4 py-5 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { icon: ShieldCheck, label: 'RERA Verified', sub: 'All listings' },
              { icon: Globe, label: 'Multi-Currency', sub: 'INR, AED, USD, GBP' },
              { icon: FileText, label: 'FEMA Guidance', sub: 'Compliance ready' },
              { icon: Phone, label: 'Dubai Connect', sub: 'Direct founder access' },
            ].map(({ icon: Icon, label, sub }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <Icon className="w-5 h-5 text-gold" />
                <p className="text-sm font-semibold text-navy">{label}</p>
                <p className="text-xs text-gray-500">{sub}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-12 space-y-16">

          {/* Currency converter */}
          <section>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-serif font-bold text-navy mb-2">Multi-Currency Price View</h2>
              <p className="text-gray-500">See any property price in your home currency instantly.</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="mb-5">
                <label className="text-sm font-semibold text-gray-700 block mb-2">Property Price (INR)</label>
                <div className="flex items-center gap-3">
                  <IndianRupee className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <input
                    type="range" min={1000000} max={100000000} step={500000}
                    value={priceInr}
                    onChange={e => setPriceInr(Number(e.target.value))}
                    className="flex-1 accent-navy"
                  />
                  <input
                    type="number"
                    value={priceInr}
                    onChange={e => setPriceInr(Number(e.target.value))}
                    className="w-36 input-field text-right"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(Object.keys(FX) as (keyof FxRates)[]).map(cur => (
                  <div key={cur} className="bg-gray-50 rounded-xl p-4 text-center border border-gray-100">
                    <p className="text-xs text-gray-400 uppercase font-semibold mb-1">{cur.toUpperCase()}</p>
                    <p className="text-xl font-bold text-navy font-display">
                      {cur === 'aed' ? 'AED' : cur === 'usd' ? '$' : cur === 'gbp' ? '£' : '€'}
                      {inrTo(priceInr, cur)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">₹1 = {FX[cur].toFixed(2)} {cur.toUpperCase()}/INR</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3 text-center flex items-center justify-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Indicative rates only. Verify with your bank before transacting.
              </p>
            </div>
          </section>

          {/* Top investment corridors */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-serif font-bold text-navy mb-1">Top NRI Investment Corridors</h2>
                <p className="text-gray-500">High-yield opportunities tracked by Property Herald's research desk.</p>
              </div>
              <a href="/directory" className="text-sm font-semibold text-gold hover:text-navy transition-colors flex items-center gap-1">
                View All <ChevronRight className="w-4 h-4" />
              </a>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {CORRIDORS.map(c => (
                <div key={c.name} className={`bg-white rounded-2xl border p-5 flex items-center justify-between hover:shadow-md transition-shadow ${c.hot ? 'border-gold/40' : 'border-gray-200'}`}>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-navy text-sm">{c.name}</p>
                      {c.hot && <span className="px-2 py-0.5 bg-gold/15 text-gold text-xs rounded-full font-semibold">HOT</span>}
                    </div>
                    <p className="text-xs text-gray-500">Ticket: {c.cap}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-navy font-display">{c.yield}</p>
                    <p className="text-xs text-green-600 font-semibold flex items-center gap-1 justify-end">
                      <TrendingUp className="w-3 h-3" />{c.trend} YoY
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* NRI Home Loans */}
          <section>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-serif font-bold text-navy mb-2">NRI Home Loan Rates</h2>
              <p className="text-gray-500">Leading banks offering NRI home loans — as of July 2026.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {BANKS_NRI.map(b => (
                <div key={b.name} className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl bg-${b.color}-50 border border-${b.color}-200 flex items-center justify-center`}>
                      <Landmark className={`w-5 h-5 text-${b.color}-600`} />
                    </div>
                    <div>
                      <p className="font-semibold text-navy text-sm">{b.name}</p>
                      <p className={`text-lg font-bold text-${b.color}-600 font-display`}>{b.rate}% p.a.</p>
                    </div>
                  </div>
                  <ul className="space-y-1.5">
                    {b.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />{f}
                      </li>
                    ))}
                  </ul>
                  <a href="/emi-calculator" className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                    <Calculator className="w-3.5 h-3.5" />Calculate EMI
                  </a>
                </div>
              ))}
            </div>
          </section>

          {/* FEMA FAQ */}
          <section>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-serif font-bold text-navy mb-2">FEMA Compliance FAQ</h2>
              <p className="text-gray-500">Your most important questions answered. Always verify with a qualified CA or legal advisor.</p>
            </div>
            <div className="space-y-3">
              {FEMA_FAQS.map((item, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between px-6 py-4 text-left"
                  >
                    <span className="font-semibold text-navy text-sm pr-4">{item.q}</span>
                    {openFaq === i ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                  </button>
                  {openFaq === i && (
                    <div className="px-6 pb-5 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-4">
                      {item.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">This FAQ is for informational purposes only and does not constitute legal or financial advice. Always consult a qualified CA, FEMA advisor, or legal expert before making investment decisions.</p>
            </div>
          </section>

          {/* Founder connect CTA */}
          <section className="bg-navy rounded-3xl p-10 text-center text-white relative overflow-hidden">
            <div className="absolute inset-0 opacity-5">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-gold rounded-full blur-3xl" />
            </div>
            <div className="relative">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gold/15 border border-gold/30 rounded-full text-gold text-xs font-semibold mb-5">
                <Star className="w-3.5 h-3.5" />
                Direct Founder Access
              </div>
              <h2 className="text-3xl font-serif font-bold mb-3">Talk to Nirmal Directly</h2>
              <p className="text-cream/70 text-lg max-w-xl mx-auto mb-8">
                Property Herald's founder has direct Dubai market connections. For NRI investors looking for curated opportunities, get in touch for a personal consultation.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <a
                  href="https://wa.me/91XXXXXXXXXX"
                  className="inline-flex items-center gap-2 bg-[#25D366] text-white px-8 py-3.5 rounded-xl font-bold hover:bg-[#20c35d] transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  WhatsApp Nirmal
                </a>
                <a href="/directory" className="inline-flex items-center gap-2 border border-white/30 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-white/10 transition-colors">
                  <Building2 className="w-4 h-4" />
                  Browse NRI-Ready Listings
                </a>
              </div>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}
