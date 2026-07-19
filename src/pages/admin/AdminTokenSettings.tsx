import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { AdminLayout, logAdminAction } from '../../components/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import type { SiteConfig, TokenBundle } from '../../types/database';
import { Save, AlertTriangle, Check, Edit3 } from 'lucide-react';

interface EditableConfig {
  token_rate_inr: string;
  verified_badge_cost: string;
  featured_listing_cost: string;
  hot_property_cost: string;
  whatsapp_lead_cost: string;
}

export function AdminTokenSettings() {
  const { user } = useAuth();
  const [config, setConfig] = useState<EditableConfig>({ token_rate_inr: '', verified_badge_cost: '', featured_listing_cost: '', hot_property_cost: '', whatsapp_lead_cost: '' });
  const [bundles, setBundles] = useState<TokenBundle[]>([]);
  const [editedBundles, setEditedBundles] = useState<Record<string, { price_inr: string; base_tokens: string; bonus_tokens: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: cfgData }, { data: bundleData }] = await Promise.all([
      supabase.from('site_config').select('*'),
      supabase.from('token_bundles').select('*').order('price_inr'),
    ]);
    if (cfgData) {
      const map = Object.fromEntries((cfgData as SiteConfig[]).map(c => [c.key, c.value]));
      setConfig({
        token_rate_inr: map.token_rate_inr ?? '20',
        verified_badge_cost: map.verified_badge_cost ?? '5',
        featured_listing_cost: map.featured_listing_cost ?? '10',
        hot_property_cost: map.hot_property_cost ?? '15',
        whatsapp_lead_cost: map.whatsapp_lead_cost ?? '2',
      });
    }
    if (bundleData) {
      setBundles(bundleData as TokenBundle[]);
      const init: typeof editedBundles = {};
      (bundleData as TokenBundle[]).forEach(b => {
        init[b.id] = { price_inr: String(b.price_inr), base_tokens: String(b.base_tokens), bonus_tokens: String(b.bonus_tokens) };
      });
      setEditedBundles(init);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleSave() {
    setSaving(true);
    const configEntries = Object.entries(config) as [string, string][];
    for (const [key, value] of configEntries) {
      await supabase.from('site_config').upsert({ key, value, updated_at: new Date().toISOString() });
    }
    for (const bundle of bundles) {
      const ed = editedBundles[bundle.id];
      if (!ed) continue;
      const base = parseInt(ed.base_tokens, 10);
      const bonus = parseInt(ed.bonus_tokens, 10);
      await supabase.from('token_bundles').update({
        price_inr: parseInt(ed.price_inr, 10),
        base_tokens: base,
        bonus_tokens: bonus,
        total_tokens: base + bonus,
      }).eq('id', bundle.id);
    }
    await logAdminAction(supabase, user!.email!, 'update_token_settings', 'site_config', undefined, { config, bundles: editedBundles });
    setSaving(false);
    setConfirm(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    fetchData();
  }

  const configFields = [
    { key: 'token_rate_inr' as const, label: 'Token Rate', unit: '₹ per token', desc: 'Base price of 1 token in INR' },
    { key: 'verified_badge_cost' as const, label: 'Verified Badge', unit: 'tokens / month', desc: 'Gold verification seal on profile' },
    { key: 'featured_listing_cost' as const, label: 'Featured Listing', unit: 'tokens / week', desc: 'Top placement in search results' },
    { key: 'hot_property_cost' as const, label: 'Hot Property Tag', unit: 'tokens / week', desc: '"Hot" badge with boosted visibility' },
    { key: 'whatsapp_lead_cost' as const, label: 'WhatsApp Lead Click', unit: 'tokens / click', desc: 'Charged per WhatsApp Connect click' },
  ];

  if (loading) return <AdminLayout><div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-navy border-t-transparent rounded-full animate-spin" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="max-w-3xl space-y-8">
        {saved && (
          <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
            <Check className="w-4 h-4" />Settings saved successfully and are live immediately.
          </div>
        )}

        {/* Feature Costs */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
            <h2 className="font-serif font-bold text-navy">Token Rate & Feature Costs</h2>
            <p className="text-sm text-gray-500 mt-0.5">Changes apply platform-wide instantly</p>
          </div>
          <div className="divide-y divide-gray-50">
            {configFields.map(({ key, label, unit, desc }) => (
              <div key={key} className="flex items-center gap-4 px-6 py-4">
                <div className="flex-1">
                  <p className="font-medium text-navy text-sm">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Edit3 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="number"
                      min="0"
                      value={config[key]}
                      onChange={e => setConfig(c => ({ ...c, [key]: e.target.value }))}
                      className="w-24 pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm text-right font-display font-bold focus:outline-none focus:ring-2 focus:ring-navy/20"
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-28">{unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bundle Pricing */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
            <h2 className="font-serif font-bold text-navy">Token Bundle Pricing</h2>
            <p className="text-sm text-gray-500 mt-0.5">Adjust bundle prices and token amounts</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Bundle', 'Price (₹)', 'Base Tokens', 'Bonus Tokens', 'Total'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {bundles.map(b => {
                  const ed = editedBundles[b.id] ?? { price_inr: String(b.price_inr), base_tokens: String(b.base_tokens), bonus_tokens: String(b.bonus_tokens) };
                  const total = (parseInt(ed.base_tokens, 10) || 0) + (parseInt(ed.bonus_tokens, 10) || 0);
                  return (
                    <tr key={b.id}>
                      <td className="px-4 py-3 font-medium text-navy">{b.name}</td>
                      {(['price_inr', 'base_tokens', 'bonus_tokens'] as const).map(field => (
                        <td key={field} className="px-4 py-3">
                          <input
                            type="number" min="0"
                            value={ed[field]}
                            onChange={e => setEditedBundles(prev => ({ ...prev, [b.id]: { ...ed, [field]: e.target.value } }))}
                            className="w-28 px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-display text-right focus:outline-none focus:ring-2 focus:ring-navy/20"
                          />
                        </td>
                      ))}
                      <td className="px-4 py-3 font-display font-bold text-navy">{isNaN(total) ? '—' : total.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Save button */}
        {!confirm ? (
          <button
            onClick={() => setConfirm(true)}
            className="flex items-center gap-2 px-6 py-3 bg-navy text-cream rounded-xl font-display font-semibold hover:bg-navy/90 transition-colors"
          >
            <Save className="w-4 h-4" />Save Changes
          </button>
        ) : (
          <div className="flex items-start gap-4 px-5 py-4 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-amber-800 text-sm">Confirm Platform-Wide Changes</p>
              <p className="text-amber-700 text-sm mt-0.5">These changes take effect immediately for all users. Are you sure?</p>
              <div className="flex gap-3 mt-4">
                <button onClick={() => setConfirm(false)} className="px-4 py-2 border border-amber-300 rounded-xl text-sm font-medium text-amber-700 hover:bg-amber-100 transition-colors">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-navy text-cream rounded-xl text-sm font-display font-semibold disabled:opacity-50 hover:bg-navy/90 transition-colors">
                  {saving ? 'Saving...' : 'Confirm & Save'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
