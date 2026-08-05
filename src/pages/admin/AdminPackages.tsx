import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { AdminLayout, logAdminAction } from '../../components/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import type { Package, PackageItem } from '../../types/database';
import { Plus, Edit3, Trash2, X, Save, ToggleLeft, ToggleRight, ArrowRight, ArrowLeft, Check } from 'lucide-react';

const ITEM_TYPES: { value: PackageItem['item_type']; label: string }[] = [
  { value: 'premium_listings', label: 'Premium Listings' },
  { value: 'brochure_languages', label: 'Brochure Languages' },
  { value: 'banners', label: 'Banners' },
  { value: 'videos', label: 'Videos' },
  { value: 'crm_days', label: 'CRM Days' },
  { value: 'token_bonus', label: 'Token Bonus' },
  { value: 'custom_line', label: 'Custom Line' },
];

const EMPTY_PKG: Omit<Package, 'id' | 'created_at' | 'updated_at'> = {
  name: '', audience: 'developer', price_tokens: 0, billing_type: 'one_time',
  contents: [], market_track: 'both', active: true,
};

export function AdminPackages() {
  const { user } = useAuth();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Omit<Package, 'id' | 'created_at' | 'updated_at'>>(EMPTY_PKG);
  const [saving, setSaving] = useState(false);

  const fetchPackages = useCallback(async () => {
    const { data } = await supabase.from('packages').select('*').order('created_at', { ascending: false });
    setPackages((data ?? []) as Package[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPackages(); }, [fetchPackages]);

  function openBuilder() {
    setForm(EMPTY_PKG);
    setEditId(null);
    setStep(1);
    setBuilderOpen(true);
  }

  function openEdit(pkg: Package) {
    setForm({ name: pkg.name, audience: pkg.audience, price_tokens: pkg.price_tokens, billing_type: pkg.billing_type, contents: pkg.contents, market_track: pkg.market_track, active: pkg.active });
    setEditId(pkg.id);
    setStep(1);
    setBuilderOpen(true);
  }

  function addItem() {
    setForm(f => ({ ...f, contents: [...f.contents, { item_type: 'premium_listings', quantity: 1 }] }));
  }

  function updateItem(idx: number, item: PackageItem) {
    setForm(f => ({ ...f, contents: f.contents.map((c, i) => i === idx ? item : c) }));
  }

  function removeItem(idx: number) {
    setForm(f => ({ ...f, contents: f.contents.filter((_, i) => i !== idx) }));
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    if (editId) {
      const { error } = await supabase.from('packages').update({ ...form, updated_at: new Date().toISOString() }).eq('id', editId);
      if (!error && user) await logAdminAction(supabase, user.email!, 'update_package', 'packages', editId, { name: form.name });
    } else {
      const { error } = await supabase.from('packages').insert(form);
      if (!error && user) await logAdminAction(supabase, user.email!, 'create_package', 'packages', undefined, { name: form.name });
    }
    setSaving(false);
    setBuilderOpen(false);
    fetchPackages();
  }

  async function toggleActive(pkg: Package) {
    const { error } = await supabase.from('packages').update({ active: !pkg.active, updated_at: new Date().toISOString() }).eq('id', pkg.id);
    if (!error && user) await logAdminAction(supabase, user.email!, 'toggle_package', 'packages', pkg.id, { active: !pkg.active });
    fetchPackages();
  }

  async function handleDelete(pkg: Package) {
    if (!confirm(`Delete package "${pkg.name}"?`)) return;
    const { error } = await supabase.from('packages').delete().eq('id', pkg.id);
    if (!error && user) await logAdminAction(supabase, user.email!, 'delete_package', 'packages', pkg.id, { name: pkg.name });
    fetchPackages();
  }

  function renderContentsPreview(contents: PackageItem[]): string {
    return contents.map(c => {
      const typeLabel = ITEM_TYPES.find(t => t.value === c.item_type)?.label ?? c.item_type;
      return `${c.quantity} ${typeLabel}`;
    }).join(', ') || 'No contents';
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{packages.length} packages</p>
          <button onClick={openBuilder} className="flex items-center gap-2 px-4 py-2.5 bg-navy text-cream rounded-xl text-sm font-medium hover:bg-navy-800">
            <Plus className="w-4 h-4" /> Build Package
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Name', 'Audience', 'Price', 'Billing', 'Contents', 'Track', 'Active', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : packages.map(pkg => (
                <tr key={pkg.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-navy">{pkg.name}</td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{pkg.audience}</td>
                  <td className="px-4 py-3 text-gray-600">{pkg.price_tokens} tokens</td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{pkg.billing_type.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs max-w-xs truncate">{renderContentsPreview(pkg.contents)}</td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{pkg.market_track}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(pkg)} className="text-gray-400 hover:text-gold">
                      {pkg.active ? <ToggleRight className="w-6 h-6 text-green-500" /> : <ToggleLeft className="w-6 h-6" />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => openEdit(pkg)} className="p-1.5 rounded-lg hover:bg-gold/10 text-gray-400 hover:text-gold"><Edit3 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(pkg)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && packages.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">No packages yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Package Builder Modal */}
      {builderOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-bold text-navy text-lg">
                {editId ? 'Edit Package' : 'Build Package'} — Step {step} of 4
              </h3>
              <button onClick={() => setBuilderOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4].map(s => (
                <div key={s} className={`flex-1 h-1.5 rounded-full ${s <= step ? 'bg-gold' : 'bg-gray-200'}`} />
              ))}
            </div>

            {/* Step 1: Basics */}
            {step === 1 && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Package Name</label>
                  <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" placeholder="e.g. Silver" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Audience</label>
                  <select value={form.audience} onChange={e => setForm(f => ({ ...f, audience: e.target.value as 'developer' | 'agent' | 'both' }))} className="input-field">
                    <option value="developer">Developer</option>
                    <option value="agent">Agent</option>
                    <option value="both">Both</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Market Track</label>
                  <select value={form.market_track} onChange={e => setForm(f => ({ ...f, market_track: e.target.value as 'india' | 'dubai' | 'both' }))} className="input-field">
                    <option value="both">Both</option>
                    <option value="india">India</option>
                    <option value="dubai">Dubai</option>
                  </select>
                </div>
              </div>
            )}

            {/* Step 2: Contents */}
            {step === 2 && (
              <div className="space-y-3">
                <button onClick={addItem} className="flex items-center gap-2 px-3 py-2 bg-gold/10 text-gold rounded-lg text-sm font-medium hover:bg-gold/20">
                  <Plus className="w-4 h-4" /> Add Line Item
                </button>
                {form.contents.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <select value={item.item_type} onChange={e => updateItem(idx, { ...item, item_type: e.target.value as PackageItem['item_type'] })} className="input-field flex-1">
                      {ITEM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <input type="number" value={item.quantity} onChange={e => updateItem(idx, { ...item, quantity: parseInt(e.target.value) || 0 })} className="input-field w-20" />
                    <button onClick={() => removeItem(idx)} className="p-2 text-gray-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                  </div>
                ))}
                {form.contents.length === 0 && <p className="text-sm text-gray-400">No items yet. Add one to get started.</p>}
              </div>
            )}

            {/* Step 3: Pricing */}
            {step === 3 && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Price (tokens)</label>
                  <input type="number" value={form.price_tokens} onChange={e => setForm(f => ({ ...f, price_tokens: parseInt(e.target.value) || 0 }))} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Billing Type</label>
                  <select value={form.billing_type} onChange={e => setForm(f => ({ ...f, billing_type: e.target.value as 'one_time' | 'recurring_manual' }))} className="input-field">
                    <option value="one_time">One Time</option>
                    <option value="recurring_manual">Recurring (Manual Renewal)</option>
                  </select>
                </div>
              </div>
            )}

            {/* Step 4: Preview & Save */}
            {step === 4 && (
              <div className="space-y-3">
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <h4 className="font-serif font-bold text-navy">{form.name}</h4>
                  <p className="text-2xl font-bold text-gold">{form.price_tokens} tokens</p>
                  <p className="text-sm text-gray-600 capitalize">{form.audience} · {form.billing_type.replace('_', ' ')}</p>
                  <div className="text-sm text-gray-700 pt-2 border-t border-gray-200">
                    <p className="font-medium mb-1">Contents:</p>
                    <p>{renderContentsPreview(form.contents)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-2">
              <button onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1}
                className="flex items-center gap-1 px-4 py-2 text-sm text-gray-600 hover:text-navy disabled:opacity-30">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              {step < 4 ? (
                <button onClick={() => setStep(s => Math.min(4, s + 1))} disabled={step === 1 && !form.name.trim()}
                  className="flex items-center gap-1 px-4 py-2 bg-navy text-cream rounded-xl text-sm font-medium hover:bg-navy-800 disabled:opacity-50">
                  Next <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button onClick={handleSave} disabled={saving || !form.name.trim()}
                  className="flex items-center gap-1 px-4 py-2 bg-gold text-navy rounded-xl text-sm font-bold hover:bg-gold-400 disabled:opacity-50">
                  {saving ? <span className="w-4 h-4 border-2 border-navy border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                  Save Package
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
