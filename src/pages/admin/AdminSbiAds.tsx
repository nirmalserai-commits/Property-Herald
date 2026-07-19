import { useState, useEffect } from 'react';
import { AdminLayout, logAdminAction } from '../../components/AdminLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { SbiAdPlacement } from '../../types/database';
import {
  Landmark, Edit3, Save, X, ToggleLeft, ToggleRight,
  Monitor, MousePointer, RefreshCw, ExternalLink, Info,
} from 'lucide-react';

const PLACEMENT_META: Record<string, { label: string; desc: string; page: string }> = {
  listing_strip:      { label: 'Listing Strip',        desc: 'Persistent strip across all listing detail pages', page: 'Every listing page' },
  emi_calculator:     { label: 'EMI Calculator',       desc: 'Embedded calculator in every listing', page: 'Every listing page' },
  magazine_full_page: { label: 'Magazine Full Page',   desc: 'Reserved full page in every digital magazine issue', page: 'Magazine section' },
  homepage_card:      { label: 'Homepage Feature Card', desc: 'Dedicated card in the homepage ecosystem section', page: 'Homepage' },
  nri_panel:          { label: 'NRI Banking Panel',    desc: 'In the NRI portal section', page: 'NRI portal' },
  print_cover:        { label: 'Print Edition Cover',  desc: 'SBI as title sponsor of quarterly print edition', page: 'Print edition' },
};

export function AdminSbiAds() {
  const { user } = useAuth();
  const [placements, setPlacements] = useState<SbiAdPlacement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<SbiAdPlacement>>({});

  async function fetchPlacements() {
    setLoading(true);
    const { data } = await supabase
      .from('sbi_ad_placements')
      .select('*')
      .order('placement_type');
    if (data) setPlacements(data as SbiAdPlacement[]);
    setLoading(false);
  }

  useEffect(() => { fetchPlacements(); }, []);

  async function handleToggle(p: SbiAdPlacement) {
    setSaving(p.id);
    await supabase
      .from('sbi_ad_placements')
      .update({ active: !p.active, last_updated: new Date().toISOString() })
      .eq('id', p.id);
    if (user?.email) {
      await logAdminAction(supabase, user.email, p.active ? 'deactivate_sbi_ad' : 'activate_sbi_ad', 'sbi_ad_placements', p.id, { placement: p.placement_type });
    }
    setSaving(null);
    fetchPlacements();
  }

  function openEdit(p: SbiAdPlacement) {
    setEditingId(p.id);
    setEditForm({ ...p });
  }

  async function handleSave(p: SbiAdPlacement) {
    setSaving(p.id);
    await supabase
      .from('sbi_ad_placements')
      .update({
        headline:     editForm.headline     ?? p.headline,
        subheadline:  editForm.subheadline  ?? p.subheadline,
        creative_url: editForm.creative_url ?? p.creative_url,
        cta_text:     editForm.cta_text     ?? p.cta_text,
        cta_url:      editForm.cta_url      ?? p.cta_url,
        last_updated: new Date().toISOString(),
      })
      .eq('id', p.id);
    if (user?.email) {
      await logAdminAction(supabase, user.email, 'update_sbi_ad', 'sbi_ad_placements', p.id, { placement: p.placement_type });
    }
    setEditingId(null);
    setSaving(null);
    fetchPlacements();
  }

  const activePlacements = placements.filter(p => p.active).length;
  const totalImpressions = placements.reduce((s, p) => s + p.impressions, 0);
  const totalClicks = placements.reduce((s, p) => s + p.clicks, 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Landmark className="w-6 h-6 text-navy" />
              <h1 className="text-2xl font-serif font-bold text-navy">SBI Ad Placements</h1>
            </div>
            <p className="text-sm text-gray-500">Institutional SBI advertising — managed separately from the token economy. Activate placements and update creatives.</p>
          </div>
          <button onClick={fetchPlacements} className="p-2 text-gray-500 hover:text-navy rounded-lg hover:bg-gray-100 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* SBI partnership notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-800">SBI Corporate Partnership</p>
            <p className="text-xs text-blue-600 mt-1">These placements are governed by a direct corporate agreement with SBI — not the token economy. Revenue is tracked separately as part of the SBI partnership revenue stream (est. ₹1,00,000+/month at scale).</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Active Placements', value: `${activePlacements}/6`, icon: ToggleRight, color: 'text-green-600' },
            { label: 'Total Impressions', value: totalImpressions.toLocaleString(), icon: Monitor, color: 'text-blue-600' },
            { label: 'Total Clicks', value: totalClicks.toLocaleString(), icon: MousePointer, color: 'text-gold' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl p-4 border border-gray-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center">
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <div className="text-xl font-bold text-navy font-display">{value}</div>
                <div className="text-xs text-gray-500">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Placement cards */}
        {loading ? (
          <div className="space-y-3">{[1,2,3,4,5,6].map(i => <div key={i} className="bg-white rounded-xl border border-gray-200 h-32 animate-pulse" />)}</div>
        ) : (
          <div className="space-y-4">
            {placements.map(p => {
              const meta = PLACEMENT_META[p.placement_type] ?? { label: p.placement_type, desc: '', page: '' };
              const isEditing = editingId === p.id;
              return (
                <div key={p.id} className={`bg-white rounded-xl border transition-all ${p.active ? 'border-green-200' : 'border-gray-200'}`}>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border ${p.active ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                          <Landmark className={`w-5 h-5 ${p.active ? 'text-blue-600' : 'text-gray-400'}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-serif font-bold text-navy">{meta.label}</h3>
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{meta.page}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 ${p.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${p.active ? 'bg-green-500' : 'bg-gray-400'}`} />
                              {p.active ? 'LIVE' : 'Off'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{meta.desc}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                            <span><Monitor className="w-3 h-3 inline mr-1" />{p.impressions.toLocaleString()} impressions</span>
                            <span><MousePointer className="w-3 h-3 inline mr-1" />{p.clicks} clicks</span>
                            {p.impressions > 0 && (
                              <span className="text-gold font-medium">{((p.clicks / p.impressions) * 100).toFixed(1)}% CTR</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!isEditing && (
                          <button onClick={() => openEdit(p)} className="p-2 text-gray-400 hover:text-navy hover:bg-gray-100 rounded-lg transition-colors" title="Edit creative">
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleToggle(p)}
                          disabled={saving === p.id}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${p.active ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'} disabled:opacity-50`}
                        >
                          {p.active ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                          {saving === p.id ? '…' : p.active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </div>

                    {/* Current creative */}
                    {!isEditing && (
                      <div className="mt-4 grid md:grid-cols-2 gap-3 text-xs">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-gray-400 mb-1 font-medium uppercase tracking-wider">Headline</p>
                          <p className="text-navy">{p.headline || <span className="italic text-gray-300">Not set</span>}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-gray-400 mb-1 font-medium uppercase tracking-wider">CTA</p>
                          <p className="text-navy">{p.cta_text || <span className="italic text-gray-300">Not set</span>}</p>
                          {p.cta_url && (
                            <a href={p.cta_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 mt-1">
                              {p.cta_url.slice(0, 40)}… <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Edit form */}
                    {isEditing && (
                      <div className="mt-4 border-t border-gray-100 pt-4 space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-gray-700">Headline</label>
                            <input type="text" value={editForm.headline ?? ''} onChange={e => setEditForm(f => ({ ...f, headline: e.target.value }))} className="input-field" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-gray-700">Subheadline</label>
                            <input type="text" value={editForm.subheadline ?? ''} onChange={e => setEditForm(f => ({ ...f, subheadline: e.target.value }))} className="input-field" />
                          </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-gray-700">CTA Button Text</label>
                            <input type="text" value={editForm.cta_text ?? ''} onChange={e => setEditForm(f => ({ ...f, cta_text: e.target.value }))} className="input-field" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-gray-700">CTA URL</label>
                            <input type="url" value={editForm.cta_url ?? ''} onChange={e => setEditForm(f => ({ ...f, cta_url: e.target.value }))} className="input-field" />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-gray-700">Creative Image URL</label>
                          <input type="url" value={editForm.creative_url ?? ''} onChange={e => setEditForm(f => ({ ...f, creative_url: e.target.value }))} placeholder="https://..." className="input-field" />
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={() => setEditingId(null)} className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2">
                            <X className="w-3.5 h-3.5" />Cancel
                          </button>
                          <button onClick={() => handleSave(p)} disabled={saving === p.id} className="px-4 py-2 bg-navy text-gold rounded-xl text-sm font-semibold hover:bg-navy/90 disabled:opacity-50 transition-colors border border-gold/20 flex items-center gap-2">
                            <Save className="w-3.5 h-3.5" />{saving === p.id ? 'Saving…' : 'Save Creative'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
