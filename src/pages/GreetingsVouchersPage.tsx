import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { GreetingsVoucher } from '../types/database';
import { Gift, Send, Coins } from 'lucide-react';

const VOUCHER_TYPES: { value: GreetingsVoucher['voucher_type']; label: string }[] = [
  { value: 'birthday', label: 'Birthday' }, { value: 'diwali', label: 'Diwali' }, { value: 'ganpati', label: 'Ganpati' },
  { value: 'independence_day', label: 'Independence Day' }, { value: 'eid', label: 'Eid' }, { value: 'christmas', label: 'Christmas' },
  { value: 'new_year', label: 'New Year' }, { value: 'developer_anniversary', label: 'Developer Anniversary' },
  { value: 'new_project_launch', label: 'New Project Launch' }, { value: 'custom', label: 'Custom' },
];

export function GreetingsVouchersPage() {
  const { user } = useAuth();
  const [vouchers, setVouchers] = useState<GreetingsVoucher[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<GreetingsVoucher>>({ voucher_type: 'birthday', delivery_region: 'india', discount_value: '', custom_message: '', recipient_count: 0 });
  const [sending, setSending] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase.from('greetings_vouchers').select('*').eq('developer_id', user.id).order('created_at', { ascending: false }).then(({ data }) => { if (data) setVouchers(data as GreetingsVoucher[]); });
    supabase.from('token_wallets').select('balance').eq('user_id', user.id).maybeSingle().then(({ data }) => { if (data) setWalletBalance((data as { balance: number }).balance); });
  }, [user]);

  const tokenCost = form.delivery_region === 'india' ? Math.ceil((form.recipient_count || 0) / 2) : (form.recipient_count || 0);

  async function handleSend() {
    if (!user || !form.recipient_count) return;
    setSending(true);
    const { data } = await supabase.from('greetings_vouchers').insert({
      developer_id: user.id, voucher_type: form.voucher_type, custom_message: form.custom_message || null,
      discount_value: form.discount_value || null, recipient_count: form.recipient_count, tokens_charged: tokenCost,
      delivery_region: form.delivery_region, status: 'sent',
    }).select('*').maybeSingle();
    if (data) { setVouchers([data as GreetingsVoucher, ...vouchers]); setShowForm(false); }
    setSending(false);
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-navy text-cream py-12 px-4">
        <div className="max-w-5xl mx-auto"><div className="flex items-center gap-3"><Gift className="w-8 h-8 text-gold" /><h1 className="text-3xl font-serif font-bold text-gold">Greetings Vouchers</h1></div><p className="text-cream/60 mt-2">Wish your buyers on every occasion</p></div>
      </div>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-200"><div className="text-xl font-bold text-navy">{walletBalance}</div><div className="text-xs text-gray-500">Tokens Available</div></div>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-navy text-gold rounded-xl font-semibold text-sm border border-gold/20"><Send className="w-4 h-4" />New Voucher</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-5"><h3 className="font-bold text-navy mb-2">India Pricing</h3><p className="text-sm text-gray-600">1 token = greet 2 people</p><p className="text-sm text-gray-600">Rs 10 per person greeted</p></div>
          <div className="bg-white rounded-xl border border-gray-200 p-5"><h3 className="font-bold text-navy mb-2">Dubai Pricing</h3><p className="text-sm text-gray-600">1 token = greet 1 person</p><p className="text-sm text-gray-600">Rs 20 per person greeted</p></div>
        </div>
        {vouchers.length === 0 ? <div className="text-center py-16"><Gift className="w-12 h-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-500">No vouchers sent yet.</p></div> : (
          <div className="space-y-2">{vouchers.map(v => <div key={v.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4"><Gift className="w-5 h-5 text-gold/60" /><div className="flex-1"><p className="font-medium text-navy capitalize">{v.voucher_type.replace(/_/g,' ')}</p><p className="text-xs text-gray-400">{v.recipient_count} recipients • {v.tokens_charged} tokens • {v.delivery_region}</p></div><span className="px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs">{v.status}</span></div>)}</div>
        )}
        {showForm && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b"><h2 className="text-xl font-serif font-bold text-navy">Create Greeting Voucher</h2></div>
              <div className="p-6 space-y-4">
                <div><label className="text-sm font-medium text-gray-700">Voucher Type</label><select value={form.voucher_type} onChange={e => setForm(f => ({ ...f, voucher_type: e.target.value as GreetingsVoucher['voucher_type'] }))} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm">{VOUCHER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
                <div><label className="text-sm font-medium text-gray-700">Discount Value</label><input type="text" value={form.discount_value ?? ''} onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm" placeholder="e.g. Rs 1 lakh off" /></div>
                <div><label className="text-sm font-medium text-gray-700">Custom Message</label><textarea value={form.custom_message ?? ''} onChange={e => setForm(f => ({ ...f, custom_message: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm" rows={3} /></div>
                <div><label className="text-sm font-medium text-gray-700">Delivery Region</label><select value={form.delivery_region} onChange={e => setForm(f => ({ ...f, delivery_region: e.target.value as 'india' | 'dubai' }))} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm"><option value="india">India (1 token = 2 people)</option><option value="dubai">Dubai (1 token = 1 person)</option></select></div>
                <div><label className="text-sm font-medium text-gray-700">Number of Recipients</label><input type="number" value={form.recipient_count ?? 0} onChange={e => setForm(f => ({ ...f, recipient_count: parseInt(e.target.value) }))} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm" min={1} /></div>
                <div className="p-4 bg-gold/10 border border-gold/20 rounded-xl"><div className="flex items-center gap-2"><Coins className="w-5 h-5 text-gold" /><span className="font-bold text-navy">Token Cost: {tokenCost}</span></div><p className="text-xs text-gray-500 mt-1">Wallet: {walletBalance} tokens</p></div>
              </div>
              <div className="flex justify-end gap-3 p-6 border-t"><button onClick={() => setShowForm(false)} className="px-5 py-2 border border-gray-300 rounded-xl text-sm">Cancel</button><button onClick={handleSend} disabled={sending || !form.recipient_count || walletBalance < tokenCost} className="flex items-center gap-2 px-5 py-2 bg-navy text-gold rounded-xl text-sm font-semibold disabled:opacity-50 border border-gold/20"><Send className="w-4 h-4" />{sending?'Sending…':'Send'}</button></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
