import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Locality, City, NakshaReport, NeighbourhoodData } from '../types/database';
import { MapPin, Coins, CreditCard, Smartphone, FileText, Download } from 'lucide-react';

export function NakshaReportPage() {
  const { user } = useAuth();
  const [cities, setCities] = useState<City[]>([]);
  const [localities, setLocalities] = useState<Locality[]>([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedLocality, setSelectedLocality] = useState('');
  const [report, setReport] = useState<NeighbourhoodData | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'tokens' | 'upi' | 'razorpay'>('tokens');
  const [paying, setPaying] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [reportPrice, setReportPrice] = useState(20);
  const [reportTokens, setReportTokens] = useState(1);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    supabase.from('cities').select('*').eq('is_active', true).order('name').then(({ data }) => { if (data) setCities(data as City[]); });
    supabase.from('site_config').select('key, value').in('key', ['naksha_report_price', 'naksha_report_tokens']).then(({ data }) => {
      if (data) data.forEach((c: { key: string; value: string }) => { if (c.key === 'naksha_report_price') setReportPrice(parseInt(c.value)); if (c.key === 'naksha_report_tokens') setReportTokens(parseInt(c.value)); });
    });
    if (user) supabase.from('token_wallets').select('balance').eq('user_id', user.id).maybeSingle().then(({ data }) => { if (data) setWalletBalance((data as { balance: number }).balance); });
  }, [user]);

  useEffect(() => {
    if (selectedCity) supabase.from('localities').select('*').eq('city_id', selectedCity).eq('is_active', true).order('name').then(({ data }) => { if (data) setLocalities(data as Locality[]); setSelectedLocality(''); });
  }, [selectedCity]);

  async function handlePayment() {
    if (!user || !selectedLocality) return;
    setPaying(true);
    if (paymentMethod === 'tokens' && walletBalance < reportTokens) { alert('Not enough tokens.'); setPaying(false); return; }
    if (paymentMethod === 'tokens') {
      await supabase.rpc('burn_own_tokens', { p_amount: reportTokens, p_reason: `Naksha Report` });
    }
    const { data: reportData } = await supabase.from('neighbourhood_data').select('*').eq('locality_id', selectedLocality).maybeSingle();
    const { data: purchaseData } = await supabase.from('naksha_reports').insert({
      locality_id: selectedLocality, report_data: reportData || null, purchased_by: user.id,
      payment_method: paymentMethod, tokens_charged: paymentMethod === 'tokens' ? reportTokens : 0,
      amount_charged: paymentMethod !== 'tokens' ? reportPrice : 0, payment_confirmed: true,
    }).select('*').maybeSingle();
    if (purchaseData) setShowReport(true);
    if (reportData) setReport(reportData as NeighbourhoodData);
    setPaying(false);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-navy text-cream py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gold/10 border border-gold/30 rounded-full mb-4">
            <MapPin className="w-7 h-7 text-gold" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-gold mb-2">Naksha Locality Report</h1>
          <p className="text-cream/60">Hyperlocal area intelligence — Rs {reportPrice}</p>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {!showReport ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8">
            <h2 className="text-xl font-serif font-bold text-navy mb-6">Select a locality</h2>
            <div className="space-y-4">
              <div><label className="text-sm font-medium text-gray-700 mb-1 block">City</label>
                <select value={selectedCity} onChange={e => setSelectedCity(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:border-gold focus:outline-none"><option value="">Select city</option>{cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
              </div>
              <div><label className="text-sm font-medium text-gray-700 mb-1 block">Locality</label>
                <select value={selectedLocality} onChange={e => setSelectedLocality(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:border-gold focus:outline-none" disabled={!selectedCity}><option value="">{selectedCity ? 'Select locality' : 'Select city first'}</option>{localities.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
              </div>
              {selectedLocality && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4 border-t">
                    {([{i:Coins,l:'Token',d:`${reportTokens} token`,s:paymentMethod==='tokens',o:()=>setPaymentMethod('tokens')},{i:Smartphone,l:'UPI',d:`Rs ${reportPrice}`,s:paymentMethod==='upi',o:()=>setPaymentMethod('upi')},{i:CreditCard,l:'Razorpay',d:`Rs ${reportPrice}`,s:paymentMethod==='razorpay',o:()=>setPaymentMethod('razorpay')}] as const).map(({i:Icon,l,d,s,o}) => (
                      <button key={l} onClick={o} className={`p-4 rounded-xl border-2 text-left ${s?'border-gold bg-gold/5':'border-gray-200'}`}><Icon className={`w-5 h-5 mb-2 ${s?'text-gold':'text-gray-400'}`} /><p className="font-medium text-navy text-sm">{l}</p><p className="text-xs text-gray-500">{d}</p></button>
                    ))}
                  </div>
                  <button onClick={handlePayment} disabled={paying} className="w-full mt-4 bg-gold text-navy font-bold py-3 rounded-xl hover:bg-gold/90 disabled:opacity-50">{paying?'Processing…':`Get Report — Rs ${reportPrice}`}</button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 p-8">
            <div className="flex items-center justify-between mb-6"><h2 className="text-xl font-serif font-bold text-navy">Naksha Report</h2><button className="flex items-center gap-2 px-4 py-2 bg-navy text-gold rounded-xl text-sm border border-gold/20"><Download className="w-4 h-4" />Download</button></div>
            {report ? (
              <div className="space-y-4">
                {[['Overview',report.overview],['Connectivity',report.connectivity],['Social Infrastructure',report.social_infrastructure],['Lifestyle',report.lifestyle],['Places of Worship',report.places_of_worship]].map(([title,data]) => (
                  <div key={title as string} className="p-4 bg-gray-50 rounded-xl"><h3 className="font-bold text-navy mb-2">{title as string}</h3><p className="text-sm text-gray-600">{data ? JSON.stringify(data) : 'Data not yet available'}</p></div>
                ))}
                <div className="p-4 bg-gold/10 border border-gold/20 rounded-xl"><h3 className="font-bold text-navy mb-2">Naksha's Verdict</h3><p className="text-gray-600">{report.naksha_verdict || 'Coming soon'}</p></div>
              </div>
            ) : <div className="text-center py-12"><FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-500">Report data is being compiled. Your purchase is recorded.</p></div>}
          </div>
        )}
      </div>
    </div>
  );
}
