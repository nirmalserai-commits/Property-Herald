import { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { Calculator, TrendingDown, Building2, IndianRupee, Info } from 'lucide-react';

interface LoanRates {
  sbi: number;
  hdfc: number;
  icici: number;
}

interface AmortizationRow {
  month: number;
  emi: number;
  principal: number;
  interest: number;
  balance: number;
}

function calcEmi(principal: number, annualRate: number, tenureMonths: number): number {
  if (principal <= 0 || annualRate <= 0 || tenureMonths <= 0) return 0;
  const r = annualRate / 12 / 100;
  return (principal * r * Math.pow(1 + r, tenureMonths)) / (Math.pow(1 + r, tenureMonths) - 1);
}

function buildSchedule(principal: number, annualRate: number, tenureMonths: number): AmortizationRow[] {
  const r = annualRate / 12 / 100;
  const emi = calcEmi(principal, annualRate, tenureMonths);
  const rows: AmortizationRow[] = [];
  let balance = principal;
  for (let m = 1; m <= Math.min(tenureMonths, 360); m++) {
    const interest = balance * r;
    const principalPart = emi - interest;
    balance = Math.max(0, balance - principalPart);
    rows.push({ month: m, emi, principal: principalPart, interest, balance });
  }
  return rows;
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);
}

function fmtL(n: number) {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return `₹${fmt(n)}`;
}

const BANKS = [
  { key: 'sbi', name: 'SBI', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  { key: 'hdfc', name: 'HDFC', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
  { key: 'icici', name: 'ICICI', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
] as const;

export function EmiCalculatorPage() {
  const [rates, setRates] = useState<LoanRates>({ sbi: 8.5, hdfc: 8.75, icici: 8.65 });
  const [loanAmount, setLoanAmount] = useState(5000000);
  const [customRate, setCustomRate] = useState('');
  const [tenure, setTenure] = useState(20);
  const [selectedBank, setSelectedBank] = useState<keyof LoanRates>('sbi');
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleRows, setScheduleRows] = useState<AmortizationRow[]>([]);

  useEffect(() => {
    async function fetchRates() {
      const { data } = await supabase
        .from('site_config')
        .select('key, value')
        .in('key', ['sbi_home_loan_rate', 'hdfc_home_loan_rate', 'icici_home_loan_rate']);
      if (data) {
        const map: Record<string, number> = {};
        data.forEach(r => { map[r.key] = parseFloat(r.value); });
        setRates({
          sbi: map.sbi_home_loan_rate ?? 8.5,
          hdfc: map.hdfc_home_loan_rate ?? 8.75,
          icici: map.icici_home_loan_rate ?? 8.65,
        });
      }
    }
    fetchRates();
  }, []);

  const activeRate = customRate ? parseFloat(customRate) || rates[selectedBank] : rates[selectedBank];
  const emi = calcEmi(loanAmount, activeRate, tenure * 12);
  const totalPayment = emi * tenure * 12;
  const totalInterest = totalPayment - loanAmount;
  const interestPct = loanAmount > 0 ? (totalInterest / totalPayment) * 100 : 0;

  const handleShowSchedule = useCallback(() => {
    setScheduleRows(buildSchedule(loanAmount, activeRate, tenure * 12));
    setShowSchedule(true);
  }, [loanAmount, activeRate, tenure]);

  const LOAN_PRESETS = [2500000, 5000000, 7500000, 10000000, 15000000, 20000000];
  const TENURE_PRESETS = [5, 10, 15, 20, 25, 30];

  return (
    <Layout>
      <div className="min-h-screen bg-cream">
        {/* Hero */}
        <div className="bg-navy text-white py-14 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gold/15 border border-gold/30 rounded-full text-gold text-xs font-semibold mb-4">
              <Calculator className="w-3.5 h-3.5" />
              EMI Calculator
            </div>
            <h1 className="text-4xl font-serif font-bold mb-3">Home Loan EMI Calculator</h1>
            <p className="text-cream/70 text-lg max-w-xl mx-auto">
              Plan your property investment with live bank rates. Compare SBI, HDFC & ICICI in one place.
            </p>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
          {/* Bank selector */}
          <div className="grid grid-cols-3 gap-4">
            {BANKS.map(b => {
              const rate = rates[b.key];
              const bankEmi = calcEmi(loanAmount, rate, tenure * 12);
              const isSelected = selectedBank === b.key && !customRate;
              return (
                <button
                  key={b.key}
                  onClick={() => { setSelectedBank(b.key); setCustomRate(''); }}
                  className={`rounded-2xl border-2 p-4 text-left transition-all ${isSelected ? `${b.bg} ${b.border} shadow-md` : 'bg-white border-gray-200 hover:border-gray-300'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-bold text-sm ${isSelected ? b.color : 'text-gray-700'}`}>{b.name} Bank</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isSelected ? `${b.bg} ${b.color}` : 'bg-gray-100 text-gray-500'}`}>{rate}% p.a.</span>
                  </div>
                  <div className={`text-xl font-bold font-display ${isSelected ? b.color : 'text-gray-500'}`}>
                    ₹{fmt(Math.round(bankEmi))}
                    <span className="text-xs font-normal ml-1">/mo</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Controls */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
              {/* Loan amount */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-gray-700">Loan Amount</label>
                  <span className="text-navy font-bold text-lg font-display">{fmtL(loanAmount)}</span>
                </div>
                <input
                  type="range" min={500000} max={50000000} step={100000}
                  value={loanAmount}
                  onChange={e => setLoanAmount(Number(e.target.value))}
                  className="w-full accent-navy h-2 rounded-full"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>₹5 L</span><span>₹5 Cr</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {LOAN_PRESETS.map(p => (
                    <button key={p} onClick={() => setLoanAmount(p)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${loanAmount === p ? 'bg-navy text-gold' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {fmtL(p)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tenure */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-gray-700">Loan Tenure</label>
                  <span className="text-navy font-bold text-lg font-display">{tenure} yrs</span>
                </div>
                <input
                  type="range" min={1} max={30} step={1}
                  value={tenure}
                  onChange={e => setTenure(Number(e.target.value))}
                  className="w-full accent-navy h-2 rounded-full"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>1 yr</span><span>30 yrs</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {TENURE_PRESETS.map(t => (
                    <button key={t} onClick={() => setTenure(t)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${tenure === t ? 'bg-navy text-gold' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {t}Y
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom rate */}
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">Custom Interest Rate</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number" step="0.05" min="5" max="20"
                    value={customRate}
                    onChange={e => setCustomRate(e.target.value)}
                    placeholder={`${rates[selectedBank]} (bank default)`}
                    className="input-field flex-1"
                  />
                  <span className="text-gray-500 text-sm">% p.a.</span>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="space-y-4">
              {/* EMI card */}
              <div className="bg-navy rounded-2xl p-6 text-white">
                <p className="text-cream/60 text-sm mb-1">Monthly EMI</p>
                <div className="text-5xl font-bold font-display text-gold mb-1">
                  ₹{fmt(Math.round(emi))}
                </div>
                <p className="text-cream/50 text-xs">at {activeRate}% p.a. for {tenure} years</p>
              </div>

              {/* Breakdown */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
                <h3 className="font-semibold text-navy text-sm">Payment Breakdown</h3>
                {/* Bar */}
                <div className="h-3 rounded-full overflow-hidden bg-gray-100 flex">
                  <div className="bg-navy rounded-l-full transition-all" style={{ width: `${100 - interestPct}%` }} />
                  <div className="bg-gold rounded-r-full transition-all" style={{ width: `${interestPct}%` }} />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-navy inline-block" />Principal</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-gold inline-block" />Interest</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    { label: 'Principal Amount', value: fmtL(loanAmount), accent: false },
                    { label: 'Total Interest', value: fmtL(totalInterest), accent: true },
                    { label: 'Total Payment', value: fmtL(totalPayment), accent: false },
                    { label: 'Interest %', value: `${interestPct.toFixed(1)}%`, accent: true },
                  ].map(({ label, value, accent }) => (
                    <div key={label} className="bg-gray-50 rounded-xl p-3">
                      <p className="text-gray-500 text-xs mb-0.5">{label}</p>
                      <p className={`font-bold ${accent ? 'text-gold' : 'text-navy'}`}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* SBI NRI notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-blue-800">NRI Home Loan?</p>
                  <p className="text-xs text-blue-600 mt-0.5">SBI offers special NRI home loan rates. Visit our NRI Portal for FEMA compliance guidance and AED/USD pricing.</p>
                </div>
              </div>

              <button
                onClick={handleShowSchedule}
                className="w-full py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors"
              >
                <TrendingDown className="w-4 h-4" />View Full Amortisation Schedule
              </button>
            </div>
          </div>

          {/* Amortisation schedule */}
          {showSchedule && scheduleRows.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-serif font-bold text-navy">Amortisation Schedule</h3>
                <button onClick={() => setShowSchedule(false)} className="text-xs text-gray-400 hover:text-navy">Hide</button>
              </div>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      {['Month', 'EMI', 'Principal', 'Interest', 'Balance'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left font-semibold text-gray-600">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {scheduleRows.map(row => (
                      <tr key={row.month} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-500">{row.month}</td>
                        <td className="px-4 py-2 font-medium text-navy">₹{fmt(Math.round(row.emi))}</td>
                        <td className="px-4 py-2 text-navy">₹{fmt(Math.round(row.principal))}</td>
                        <td className="px-4 py-2 text-gold">₹{fmt(Math.round(row.interest))}</td>
                        <td className="px-4 py-2 text-gray-600">₹{fmt(Math.round(row.balance))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Neetu NGFC CTA */}
          <div className="bg-gradient-to-r from-navy to-navy/90 rounded-2xl p-7 flex flex-col sm:flex-row items-center gap-5 border border-gold/20 shadow-lg">
            <div className="flex-shrink-0">
              <div className="w-14 h-14 rounded-full border-2 border-gold/50 overflow-hidden">
                <img src="/nora-chat.png.png" alt="Neetu" className="w-full h-full object-cover" />
              </div>
            </div>
            <div className="flex-1 text-center sm:text-left">
              <p className="text-gold text-xs font-semibold uppercase tracking-widest mb-1">Naya Ghar Finance Centre</p>
              <h3 className="text-cream font-bold text-lg mb-1">Ready to apply? Let Neetu help you get pre-qualified in 5 minutes</h3>
              <p className="text-cream/60 text-sm">Namaste! Main Neetu hoon. Aapka ghar ka sapna, mera kaam!</p>
            </div>
            <a
              href="/home-loans"
              className="flex-shrink-0 flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-navy transition-all hover:opacity-90 whitespace-nowrap"
              style={{ backgroundColor: '#c9a84c' }}
            >
              Talk to Neetu
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </a>
          </div>

          {/* CTA */}
          <div className="bg-navy rounded-2xl p-8 text-center text-white">
            <Building2 className="w-8 h-8 text-gold mx-auto mb-3" />
            <h3 className="text-2xl font-serif font-bold mb-2">Ready to Find Your Property?</h3>
            <p className="text-cream/60 mb-6">Browse verified listings across India's top investment corridors.</p>
            <a href="/directory" className="inline-flex items-center gap-2 bg-gold text-navy px-8 py-3 rounded-xl font-semibold hover:bg-gold/90 transition-colors">
              <IndianRupee className="w-4 h-4" />Browse Properties
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
}
