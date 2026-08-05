import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { AdminLayout, logAdminAction } from '../../components/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import type { Deal } from '../../types/database';
import { Plus, Edit3, Trash2, X, Save, ToggleLeft, ToggleRight } from 'lucide-react';

const EMPTY_DEAL: Omit<Deal, 'id' | 'created_at' | 'updated_at'> = {
  name: '', trigger_amount: 0, bonus_type: 'flat_tokens', bonus_value: 0,
  bonus_validity_days: 60, non_token_perk: '', market_track: 'both', active: true,
  start_date: null, end_date: null,
};

export function AdminDeals() {
  const { user } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [form, setForm] = useState<Omit<Deal, 'id' | 'created_at' | 'updated_at'>>(EMPTY_DEAL);
  const [saving, setSaving] = useState(false);

  const fetchDeals = useCallback(async () => {
    const { data } = await supabase.from('deals').select('*').order('created_at', { ascending: false });
    setDeals((data ?? []) as Deal[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchDeals(); }, [fetchDeals]);

  function openAdd() { setForm(EMPTY_DEAL); setModal('add'); }
  function openEdit(d: Deal) {
    setForm({ name: d.name, trigger_amount: d.trigger_amount, bonus_type: d.bonus_type, bonus_value: d.bonus_value, bonus_validity_days: d.bonus_validity_days, non_token_perk: d.non_token_perk, market_track: d.market_track, active: d.active, start_date: d.start_date, end_date: d.end_date });
    setModal('edit');
  }

  async function handleSave() {
    if (!form.name.trim() || !form.trigger_amount || !form.bonus_value) return;
    setSaving(true);
    if (modal === 'add') {
      const { error } = await supabase.from('deals').insert(form);
      if (!error && user) await logAdminAction(supabase, user.email!, 'create_deal', 'deals', undefined, { name: form.name });
    } else {
      const { error } = await supabase.from('deals').update({ ...form, updated_at: new Date().toISOString() }).eq('name', form.name);
      if (!error && user) await logAdminAction(supabase, user.email!, 'update_deal', 'deals', undefined, { name: form.name });
    }
    setSaving(false);
    setModal(null);
    fetchDeals();
  }

  async function toggleActive(d: Deal) {
    const { error } = await supabase.from('deals').update({ active: !d.active, updated_at: new Date().toISOString() }).eq('id', d.id);
    if (!error && user) await logAdminAction(supabase, user.email!, 'toggle_deal', 'deals', d.id, { active: !d.active });
    fetchDeals();
  }

  async function handleDelete(d: Deal) {
    if (!confirm(`Delete deal "${d.name}"?`)) return;
    const { error } = await supabase.from('deals').delete().eq('id', d.id);
    if (!error && user) await logAdminAction(supabase, user.email!, 'delete_deal', 'deals', d.id, { name: d.name });
    fetchDeals();
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{deals.length} deals</p>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 bg-navy text-cream rounded-xl text-sm font-medium hover:bg-navy-800">
            <Plus className="w-4 h-4" /> Add Deal
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Name', 'Trigger', 'Bonus', 'Validity', 'Track', 'Active', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : deals.map(d => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-navy">{d.name}</td>
                  <td className="px-4 py-3 text-gray-600">₹{d.trigger_amount.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {d.bonus_type === 'flat_tokens' ? `+${d.bonus_value} tokens` : `+${d.bonus_value}%`}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{d.bonus_validity_days} days</td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{d.market_track}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(d)} className="text-gray-400 hover:text-gold">
                      {d.active ? <ToggleRight className="w-6 h-6 text-green-500" /> : <ToggleLeft className="w-6 h-6" />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => openEdit(d)} className="p-1.5 rounded-lg hover:bg-gold/10 text-gray-400 hover:text-gold"><Edit3 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(d)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && deals.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No deals yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-bold text-navy text-lg">{modal === 'add' ? 'Add Deal' : 'Edit Deal'}</h3>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Deal Name</label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" placeholder="e.g. Midnight Offer - Rs25k tier" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Trigger Amount (₹)</label>
              <input type="number" value={form.trigger_amount} onChange={e => setForm(f => ({ ...f, trigger_amount: parseInt(e.target.value) || 0 }))} className="input-field" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Bonus Type</label>
                <select value={form.bonus_type} onChange={e => setForm(f => ({ ...f, bonus_type: e.target.value as 'flat_tokens' | 'percentage' }))} className="input-field">
                  <option value="flat_tokens">Flat Tokens</option>
                  <option value="percentage">Percentage</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Bonus Value</label>
                <input type="number" value={form.bonus_value} onChange={e => setForm(f => ({ ...f, bonus_value: parseInt(e.target.value) || 0 }))} className="input-field" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Bonus Validity (days)</label>
              <input type="number" value={form.bonus_validity_days} onChange={e => setForm(f => ({ ...f, bonus_validity_days: parseInt(e.target.value) || 60 }))} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Non-Token Perk (optional)</label>
              <input type="text" value={form.non_token_perk ?? ''} onChange={e => setForm(f => ({ ...f, non_token_perk: e.target.value }))} className="input-field" placeholder="e.g. priority listing placement, 90 days" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Market Track</label>
              <select value={form.market_track} onChange={e => setForm(f => ({ ...f, market_track: e.target.value as 'india' | 'dubai' | 'both' }))} className="input-field">
                <option value="both">Both</option>
                <option value="india">India</option>
                <option value="dubai">Dubai</option>
              </select>
            </div>
            <button onClick={handleSave} disabled={saving || !form.name.trim()}
              className="w-full px-4 py-2.5 bg-navy text-cream rounded-xl text-sm font-medium hover:bg-navy-800 disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <span className="w-4 h-4 border-2 border-cream border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
              {modal === 'add' ? 'Create Deal' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
