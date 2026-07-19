import { useState, useEffect } from 'react';
import { AdminLayout, logAdminAction } from '../../components/AdminLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { Banner } from '../../types/database';
import {
  Image, Plus, Edit3, Trash2, Eye, ToggleLeft, ToggleRight,
  X, Save, RefreshCw, Monitor, MousePointer, Calendar,
  ExternalLink, Filter,
} from 'lucide-react';

const POSITIONS: { value: Banner['position']; label: string; desc: string }[] = [
  { value: 'homepage_hero',    label: 'Homepage Hero',    desc: 'Full-width above the fold — maximum visibility' },
  { value: 'directory_top',   label: 'Directory Top',    desc: 'Banner at top of directory listing page' },
  { value: 'magazine_section',label: 'Magazine Section', desc: 'Banner in the magazine section' },
  { value: 'sidebar',         label: 'Sidebar',          desc: 'Right-column on listing detail pages' },
  { value: 'corridor',        label: 'Corridor',         desc: 'City-specific corridor banners' },
  { value: 'footer_strip',    label: 'Footer Strip',     desc: 'Full-width strip above footer' },
];

const AUDIENCES = [
  { value: 'all',        label: 'All Visitors' },
  { value: 'logged_in',  label: 'Logged-in Users' },
  { value: 'developers', label: 'Developers Only' },
  { value: 'buyers',     label: 'Buyers Only' },
];

const EMPTY_FORM: Partial<Banner> = {
  name: '',
  position: 'homepage_hero',
  image_url: '',
  headline: '',
  subheadline: '',
  cta_text: '',
  cta_url: '',
  target_audience: 'all',
  corridor_city: '',
  active_from: '',
  active_to: '',
  active: true,
};

export function AdminBanners() {
  const { user } = useAuth();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<'add' | 'edit' | 'preview' | null>(null);
  const [selected, setSelected] = useState<Banner | null>(null);
  const [form, setForm] = useState<Partial<Banner>>(EMPTY_FORM);
  const [filterPos, setFilterPos] = useState<string>('all');

  async function fetchBanners() {
    setLoading(true);
    const { data } = await supabase
      .from('banners')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setBanners(data as Banner[]);
    setLoading(false);
  }

  useEffect(() => { fetchBanners(); }, []);

  function openAdd() {
    setForm({ ...EMPTY_FORM });
    setSelected(null);
    setModal('add');
  }

  function openEdit(b: Banner) {
    setForm({
      ...b,
      active_from: b.active_from ? b.active_from.slice(0, 16) : '',
      active_to: b.active_to ? b.active_to.slice(0, 16) : '',
    });
    setSelected(b);
    setModal('edit');
  }

  async function handleSave() {
    if (!form.name?.trim() || !form.image_url?.trim()) return;
    setSaving(true);

    const payload = {
      name: form.name,
      position: form.position,
      image_url: form.image_url,
      headline: form.headline || null,
      subheadline: form.subheadline || null,
      cta_text: form.cta_text || null,
      cta_url: form.cta_url || null,
      target_audience: form.target_audience ?? 'all',
      corridor_city: form.corridor_city || null,
      active_from: form.active_from ? new Date(form.active_from).toISOString() : null,
      active_to: form.active_to ? new Date(form.active_to).toISOString() : null,
      active: form.active ?? true,
    };

    if (modal === 'add') {
      const { data, error } = await supabase.from('banners').insert(payload).select('id').maybeSingle();
      if (!error && data && user?.email) {
        await logAdminAction(supabase, user.email, 'create_banner', 'banners', data.id, { name: form.name, position: form.position });
      }
    } else if (modal === 'edit' && selected) {
      const { error } = await supabase
        .from('banners')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', selected.id);
      if (!error && user?.email) {
        await logAdminAction(supabase, user.email, 'update_banner', 'banners', selected.id, { name: form.name });
      }
    }

    setSaving(false);
    setModal(null);
    fetchBanners();
  }

  async function handleToggle(b: Banner) {
    await supabase.from('banners').update({ active: !b.active, updated_at: new Date().toISOString() }).eq('id', b.id);
    if (user?.email) {
      await logAdminAction(supabase, user.email, b.active ? 'deactivate_banner' : 'activate_banner', 'banners', b.id);
    }
    fetchBanners();
  }

  async function handleDelete(b: Banner) {
    if (!confirm(`Delete banner "${b.name}"?`)) return;
    await supabase.from('banners').delete().eq('id', b.id);
    if (user?.email) {
      await logAdminAction(supabase, user.email, 'delete_banner', 'banners', b.id, { name: b.name });
    }
    fetchBanners();
  }

  const filtered = filterPos === 'all' ? banners : banners.filter(b => b.position === filterPos);
  const activeBanners = banners.filter(b => b.active).length;
  const totalImpressions = banners.reduce((s, b) => s + b.impressions, 0);
  const totalClicks = banners.reduce((s, b) => s + b.clicks, 0);
  const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0';

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif font-bold text-navy">Banner Management</h1>
            <p className="text-sm text-gray-500 mt-1">Manage promotional banners across all platform positions — upload, schedule, and track performance</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => { fetchBanners(); }} className="p-2 text-gray-500 hover:text-navy rounded-lg hover:bg-gray-100 transition-colors" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-navy text-gold rounded-xl font-semibold text-sm hover:bg-navy/90 transition-colors border border-gold/20">
              <Plus className="w-4 h-4" />Add Banner
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Banners', value: banners.length, icon: Image, color: 'text-navy' },
            { label: 'Active', value: activeBanners, icon: ToggleRight, color: 'text-green-600' },
            { label: 'Total Impressions', value: totalImpressions.toLocaleString(), icon: Monitor, color: 'text-blue-600' },
            { label: 'Click-Through Rate', value: `${ctr}%`, icon: MousePointer, color: 'text-gold' },
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

        {/* Position filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-gray-400" />
          {[{ value: 'all', label: 'All' }, ...POSITIONS.map(p => ({ value: p.value, label: p.label }))].map(p => (
            <button
              key={p.value}
              onClick={() => setFilterPos(p.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterPos === p.value ? 'bg-navy text-gold border border-gold/20' : 'bg-white text-gray-600 border border-gray-200 hover:border-navy/30'}`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Banner table */}
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="bg-white rounded-xl border border-gray-200 h-20 animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Image className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No banners yet</p>
            <button onClick={openAdd} className="mt-4 text-sm text-navy font-semibold hover:underline">Add your first banner</button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Banner</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Position</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Audience</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Performance</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(b => (
                  <tr key={b.id} className={`hover:bg-gray-50 transition-colors ${!b.active ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-10 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0">
                          <img src={b.image_url} alt={b.name} className="w-full h-full object-cover"
                            onError={e => { (e.target as HTMLImageElement).src = ''; }}
                          />
                        </div>
                        <div>
                          <p className="font-semibold text-navy">{b.name}</p>
                          {b.headline && <p className="text-xs text-gray-400 truncate max-w-[200px]">{b.headline}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium capitalize">
                        {POSITIONS.find(p => p.value === b.position)?.label ?? b.position}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-gray-500 capitalize">{b.target_audience}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span><Monitor className="w-3 h-3 inline mr-1" />{b.impressions.toLocaleString()}</span>
                        <span><MousePointer className="w-3 h-3 inline mr-1" />{b.clicks}</span>
                        <span className="text-gold font-medium">
                          {b.impressions > 0 ? `${((b.clicks / b.impressions) * 100).toFixed(1)}%` : '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${b.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${b.active ? 'bg-green-500' : 'bg-gray-400'}`} />
                          {b.active ? 'Active' : 'Inactive'}
                        </span>
                        {(b.active_from || b.active_to) && (
                          <span className="text-[10px] text-gray-400 flex items-center gap-1">
                            <Calendar className="w-2.5 h-2.5" />
                            {b.active_from ? new Date(b.active_from).toLocaleDateString('en-IN') : '∞'} → {b.active_to ? new Date(b.active_to).toLocaleDateString('en-IN') : '∞'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => { setSelected(b); setModal('preview'); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Preview">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEdit(b)} className="p-1.5 text-gray-400 hover:text-navy hover:bg-gray-100 rounded-lg transition-colors" title="Edit">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleToggle(b)} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Toggle">
                          {b.active ? <ToggleRight className="w-4 h-4 text-green-600" /> : <ToggleLeft className="w-4 h-4" />}
                        </button>
                        <button onClick={() => handleDelete(b)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Position coverage grid */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-base font-serif font-bold text-navy mb-4">Position Coverage</h2>
          <div className="grid md:grid-cols-3 gap-3">
            {POSITIONS.map(pos => {
              const count = banners.filter(b => b.position === pos.value && b.active).length;
              return (
                <div key={pos.value} className={`p-4 rounded-xl border ${count > 0 ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-navy">{pos.label}</p>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${count > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {count} active
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{pos.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-serif font-bold text-navy">{modal === 'add' ? 'Add Banner' : 'Edit Banner'}</h2>
              <button onClick={() => setModal(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid md:grid-cols-2 gap-4">
                <FormField label="Banner Name *">
                  <input type="text" value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Mumbai Dev Week Hero" className="input-field" />
                </FormField>
                <FormField label="Position *">
                  <select value={form.position ?? 'homepage_hero'} onChange={e => setForm(f => ({ ...f, position: e.target.value as Banner['position'] }))} className="input-field">
                    {POSITIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </FormField>
              </div>

              <FormField label="Banner Image URL *">
                <input type="url" value={form.image_url ?? ''} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://images.pexels.com/..." className="input-field" />
                {form.image_url && (
                  <div className="mt-2 h-28 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                    <img src={form.image_url} alt="Preview" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  </div>
                )}
              </FormField>

              <div className="grid md:grid-cols-2 gap-4">
                <FormField label="Headline">
                  <input type="text" value={form.headline ?? ''} onChange={e => setForm(f => ({ ...f, headline: e.target.value }))} placeholder="e.g. Mumbai's Finest Properties" className="input-field" />
                </FormField>
                <FormField label="Subheadline">
                  <input type="text" value={form.subheadline ?? ''} onChange={e => setForm(f => ({ ...f, subheadline: e.target.value }))} placeholder="Supporting text" className="input-field" />
                </FormField>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <FormField label="CTA Button Text">
                  <input type="text" value={form.cta_text ?? ''} onChange={e => setForm(f => ({ ...f, cta_text: e.target.value }))} placeholder="e.g. View Properties" className="input-field" />
                </FormField>
                <FormField label="CTA Destination URL">
                  <input type="url" value={form.cta_url ?? ''} onChange={e => setForm(f => ({ ...f, cta_url: e.target.value }))} placeholder="https://..." className="input-field" />
                </FormField>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <FormField label="Target Audience">
                  <select value={form.target_audience ?? 'all'} onChange={e => setForm(f => ({ ...f, target_audience: e.target.value as Banner['target_audience'] }))} className="input-field">
                    {AUDIENCES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                  </select>
                </FormField>
                {form.position === 'corridor' && (
                  <FormField label="Corridor City">
                    <input type="text" value={form.corridor_city ?? ''} onChange={e => setForm(f => ({ ...f, corridor_city: e.target.value }))} placeholder="e.g. Mumbai" className="input-field" />
                  </FormField>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <FormField label="Active From">
                  <input type="datetime-local" value={form.active_from ?? ''} onChange={e => setForm(f => ({ ...f, active_from: e.target.value }))} className="input-field" />
                </FormField>
                <FormField label="Active To">
                  <input type="datetime-local" value={form.active_to ?? ''} onChange={e => setForm(f => ({ ...f, active_to: e.target.value }))} className="input-field" />
                </FormField>
              </div>

              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={form.active ?? true} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="sr-only peer" />
                  <div className="w-10 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-navy" />
                </label>
                <span className="text-sm text-gray-700">Active (visible to visitors)</span>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button onClick={() => setModal(null)} className="px-5 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.name?.trim() || !form.image_url?.trim()} className="flex items-center gap-2 px-5 py-2 bg-navy text-gold rounded-xl text-sm font-semibold hover:bg-navy/90 disabled:opacity-50 transition-colors border border-gold/20">
                <Save className="w-4 h-4" />{saving ? 'Saving…' : modal === 'add' ? 'Add Banner' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {modal === 'preview' && selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="text-lg font-serif font-bold text-navy">Banner Preview — {selected.name}</h2>
              <button onClick={() => setModal(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-5">
              <div className="rounded-xl overflow-hidden border border-gray-200 relative">
                <img src={selected.image_url} alt={selected.name} className="w-full h-64 object-cover" />
                {(selected.headline || selected.cta_text) && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end p-6">
                    <div>
                      {selected.headline && <h3 className="text-white text-xl font-serif font-bold mb-1">{selected.headline}</h3>}
                      {selected.subheadline && <p className="text-white/80 text-sm mb-3">{selected.subheadline}</p>}
                      {selected.cta_text && (
                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-gold text-navy text-sm font-bold rounded-lg">
                          {selected.cta_text} <ExternalLink className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-400 mb-1">Position</p><p className="font-medium text-navy capitalize">{selected.position.replace('_', ' ')}</p></div>
                <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-400 mb-1">Audience</p><p className="font-medium text-navy capitalize">{selected.target_audience}</p></div>
                <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-400 mb-1">CTR</p><p className="font-medium text-navy">{selected.impressions > 0 ? `${((selected.clicks / selected.impressions) * 100).toFixed(1)}%` : '—'}</p></div>
              </div>
            </div>
            <div className="px-5 pb-5">
              <button onClick={() => { setModal(null); openEdit(selected); }} className="w-full py-2.5 bg-navy text-gold rounded-xl font-semibold text-sm hover:bg-navy/90 transition-colors border border-gold/20 flex items-center justify-center gap-2">
                <Edit3 className="w-4 h-4" />Edit Banner
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}
