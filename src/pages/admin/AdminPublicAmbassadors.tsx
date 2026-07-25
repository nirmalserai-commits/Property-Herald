import { useState, useEffect } from 'react';
import { AdminLayout, logAdminAction } from '../../components/AdminLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { PublicAmbassador, PublicAmbassadorType } from '../../types/database';
import { Plus, Edit3, Trash2, X, Save, Upload, MapPin, Users, RefreshCw, Eye, EyeOff } from 'lucide-react';

const TYPE_OPTIONS: { value: PublicAmbassadorType; label: string }[] = [{ value: 'developer', label: 'Developer' }, { value: 'agent', label: 'Agent' }, { value: 'community', label: 'Community' }];
const TYPE_LABELS: Record<PublicAmbassadorType, string> = { developer: 'Developer', agent: 'Agent', community: 'Community' };
const EMPTY: Partial<PublicAmbassador> = { name: '', city_region: '', ambassador_type: 'developer', profile_picture_url: '', is_active: true, display_order: 0 };

export function AdminPublicAmbassadors() {
  const { user } = useAuth();
  const [ambassadors, setAmbassadors] = useState<PublicAmbassador[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [selected, setSelected] = useState<PublicAmbassador | null>(null);
  const [form, setForm] = useState<Partial<PublicAmbassador>>(EMPTY);

  async function fetchAmbassadors() {
    setLoading(true);
    const { data } = await supabase.from('public_ambassadors').select('*').order('display_order');
    if (data) setAmbassadors(data as PublicAmbassador[]);
    setLoading(false);
  }
  useEffect(() => { fetchAmbassadors(); }, []);

  function openAdd() { setForm({ ...EMPTY, display_order: ambassadors.length + 1 }); setSelected(null); setModal('add'); }
  function openEdit(amb: PublicAmbassador) { setForm({ ...amb }); setSelected(amb); setModal('edit'); }

  async function handleUpload(file: File) {
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `ambassadors/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('assets').upload(path, file);
    if (!error) { const { data } = supabase.storage.from('assets').getPublicUrl(path); setForm(f => ({ ...f, profile_picture_url: data.publicUrl })); }
    setUploading(false);
  }

  async function handleSave() {
    if (!form.name?.trim() || !form.city_region?.trim()) return;
    setSaving(true);
    if (modal === 'add') {
      const { data } = await supabase.from('public_ambassadors').insert({ name: form.name, city_region: form.city_region, ambassador_type: form.ambassador_type, profile_picture_url: form.profile_picture_url || null, is_active: form.is_active ?? true, display_order: form.display_order ?? 0 }).select('id').maybeSingle();
      if (data && user?.email) await logAdminAction(supabase, user.email, 'create_public_ambassador', 'public_ambassadors', data.id, { name: form.name });
    } else if (selected) {
      await supabase.from('public_ambassadors').update({ name: form.name, city_region: form.city_region, ambassador_type: form.ambassador_type, profile_picture_url: form.profile_picture_url || null, is_active: form.is_active ?? true, display_order: form.display_order ?? 0, updated_at: new Date().toISOString() }).eq('id', selected.id);
      if (user?.email) await logAdminAction(supabase, user.email, 'update_public_ambassador', 'public_ambassadors', selected.id, { name: form.name });
    }
    setSaving(false); setModal(null); fetchAmbassadors();
  }

  async function handleToggle(amb: PublicAmbassador) { await supabase.from('public_ambassadors').update({ is_active: !amb.is_active, updated_at: new Date().toISOString() }).eq('id', amb.id); fetchAmbassadors(); }
  async function handleDelete(amb: PublicAmbassador) { if (!confirm(`Delete ${amb.name}?`)) return; await supabase.from('public_ambassadors').delete().eq('id', amb.id); fetchAmbassadors(); }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-serif font-bold text-navy">PH Ambassadors</h1><p className="text-sm text-gray-500 mt-1">Manage public ambassador profiles</p></div>
          <div className="flex items-center gap-3"><button onClick={fetchAmbassadors} className="p-2 text-gray-500 hover:text-navy rounded-lg hover:bg-gray-100"><RefreshCw className="w-4 h-4" /></button><button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-navy text-gold rounded-xl font-semibold text-sm border border-gold/20"><Plus className="w-4 h-4" />Add</button></div>
        </div>
        {loading ? <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">{[1,2,3].map(i => <div key={i} className="bg-white rounded-xl border h-48 animate-pulse" />)}</div> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {ambassadors.map(amb => (
              <div key={amb.id} className={`bg-white rounded-xl border ${amb.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
                <div className="p-4 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full border-2 border-gold/30 overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">{amb.profile_picture_url ? <img src={amb.profile_picture_url} alt={amb.name} className="w-full h-full object-cover" /> : <Users className="w-6 h-6 text-gray-300" />}</div>
                  <div className="flex-1 min-w-0"><h3 className="font-serif font-bold text-navy text-sm truncate">{amb.name}</h3><div className="flex items-center gap-1 text-xs text-gray-500"><MapPin className="w-3 h-3 text-gold/60" />{amb.city_region}</div><span className="inline-block mt-1 px-2 py-0.5 bg-gold/10 text-gold border border-gold/20 rounded-full text-xs">{TYPE_LABELS[amb.ambassador_type]}</span></div>
                </div>
                <div className="px-4 pb-3 flex items-center gap-1 border-t border-gray-50 pt-2">
                  <button onClick={() => openEdit(amb)} className="p-2 text-gray-400 hover:text-navy hover:bg-gray-100 rounded-lg"><Edit3 className="w-4 h-4" /></button>
                  <button onClick={() => handleToggle(amb)} className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg">{amb.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}</button>
                  <button onClick={() => handleDelete(amb)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b"><h2 className="text-xl font-serif font-bold text-navy">{modal === 'add' ? 'Add Ambassador' : 'Edit'}</h2><button onClick={() => setModal(null)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button></div>
            <div className="p-6 space-y-5">
              <div className="flex flex-col items-center gap-3">
                <div className="w-24 h-24 rounded-full border-2 border-gold/30 overflow-hidden bg-gray-100 flex items-center justify-center">{form.profile_picture_url ? <img src={form.profile_picture_url} alt="Preview" className="w-full h-full object-cover" /> : <Users className="w-10 h-10 text-gray-300" />}</div>
                <label className="cursor-pointer"><input type="file" accept="image/jpeg,image/png" onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} className="hidden" /><span className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"><Upload className="w-4 h-4" />{uploading ? 'Uploading…' : 'Upload Picture'}</span></label>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div><label className="text-sm font-medium text-gray-700">Name *</label><input type="text" value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">City / Region *</label><input type="text" value={form.city_region ?? ''} onChange={e => setForm(f => ({ ...f, city_region: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Type</label><select value={form.ambassador_type ?? 'developer'} onChange={e => setForm(f => ({ ...f, ambassador_type: e.target.value as PublicAmbassadorType }))} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm">{TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
                <div><label className="text-sm font-medium text-gray-700">Display Order</label><input type="number" value={form.display_order ?? 0} onChange={e => setForm(f => ({ ...f, display_order: parseInt(e.target.value) }))} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm" /></div>
              </div>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_active ?? true} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4 accent-navy" /> <span className="text-sm text-gray-700">Active</span></label>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t"><button onClick={() => setModal(null)} className="px-5 py-2 border border-gray-300 rounded-xl text-sm">Cancel</button><button onClick={handleSave} disabled={saving || !form.name?.trim() || !form.city_region?.trim()} className="flex items-center gap-2 px-5 py-2 bg-navy text-gold rounded-xl text-sm font-semibold disabled:opacity-50 border border-gold/20"><Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save'}</button></div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
