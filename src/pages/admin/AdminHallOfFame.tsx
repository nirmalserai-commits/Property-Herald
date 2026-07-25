import { useState, useEffect } from 'react';
import { AdminLayout, logAdminAction } from '../../components/AdminLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { HallOfFame } from '../../types/database';
import { Plus, Edit3, Trash2, X, Save, Upload, Award, RefreshCw, Eye, EyeOff } from 'lucide-react';

const EMPTY: Partial<HallOfFame> = { name: '', job_title: '', position: '', pod_name: '', profile_picture_url: '', display_order: 0, is_active: true };

export function AdminHallOfFame() {
  const { user } = useAuth();
  const [members, setMembers] = useState<HallOfFame[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [selected, setSelected] = useState<HallOfFame | null>(null);
  const [form, setForm] = useState<Partial<HallOfFame>>(EMPTY);

  async function fetchMembers() {
    setLoading(true);
    const { data } = await supabase.from('hall_of_fame').select('*').order('display_order');
    if (data) setMembers(data as HallOfFame[]);
    setLoading(false);
  }
  useEffect(() => { fetchMembers(); }, []);

  function openAdd() { setForm({ ...EMPTY, display_order: members.length + 1 }); setSelected(null); setModal('add'); }
  function openEdit(m: HallOfFame) { setForm({ ...m }); setSelected(m); setModal('edit'); }

  async function handleUpload(file: File) {
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `hall-of-fame/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('assets').upload(path, file);
    if (!error) { const { data } = supabase.storage.from('assets').getPublicUrl(path); setForm(f => ({ ...f, profile_picture_url: data.publicUrl })); }
    setUploading(false);
  }

  async function handleSave() {
    if (!form.name?.trim() || !form.job_title?.trim()) return;
    setSaving(true);
    if (modal === 'add') {
      const { data } = await supabase.from('hall_of_fame').insert({ name: form.name, job_title: form.job_title, position: form.position || null, pod_name: form.pod_name || null, profile_picture_url: form.profile_picture_url || null, display_order: form.display_order ?? 0, is_active: form.is_active ?? true }).select('id').maybeSingle();
      if (data && user?.email) await logAdminAction(supabase, user.email, 'create_hall_of_fame', 'hall_of_fame', data.id, { name: form.name });
    } else if (selected) {
      await supabase.from('hall_of_fame').update({ name: form.name, job_title: form.job_title, position: form.position || null, pod_name: form.pod_name || null, profile_picture_url: form.profile_picture_url || null, display_order: form.display_order ?? 0, is_active: form.is_active ?? true }).eq('id', selected.id);
      if (user?.email) await logAdminAction(supabase, user.email, 'update_hall_of_fame', 'hall_of_fame', selected.id, { name: form.name });
    }
    setSaving(false); setModal(null); fetchMembers();
  }

  async function handleToggle(m: HallOfFame) { await supabase.from('hall_of_fame').update({ is_active: !m.is_active }).eq('id', m.id); fetchMembers(); }
  async function handleDelete(m: HallOfFame) { if (!confirm(`Delete ${m.name}?`)) return; await supabase.from('hall_of_fame').delete().eq('id', m.id); fetchMembers(); }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-serif font-bold text-navy">Hall of Fame</h1><p className="text-sm text-gray-500 mt-1">Manage the 59 daughters directory</p></div>
          <div className="flex items-center gap-3"><button onClick={fetchMembers} className="p-2 text-gray-500 hover:text-navy rounded-lg hover:bg-gray-100"><RefreshCw className="w-4 h-4" /></button><button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-navy text-gold rounded-xl font-semibold text-sm border border-gold/20"><Plus className="w-4 h-4" />Add Member</button></div>
        </div>
        {loading ? <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="bg-white rounded-xl border h-64 animate-pulse" />)}</div> : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {members.map(m => (
              <div key={m.id} className={`bg-white rounded-xl border ${m.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
                <div className="aspect-[3/5] bg-gray-100 overflow-hidden rounded-t-xl">{m.profile_picture_url ? <img src={m.profile_picture_url} alt={m.name} className="w-full h-full object-cover object-center" /> : <div className="w-full h-full flex items-center justify-center"><Award className="w-8 h-8 text-gray-300" /></div>}</div>
                <div className="p-3 text-center"><h3 className="font-serif font-bold text-navy text-sm">{m.name}</h3><p className="text-xs text-gray-500">{m.job_title}</p>{m.pod_name && <p className="text-xs text-gold/60 mt-1">{m.pod_name}</p>}</div>
                <div className="px-3 pb-3 flex items-center gap-1 border-t border-gray-50 pt-2"><button onClick={() => openEdit(m)} className="p-2 text-gray-400 hover:text-navy hover:bg-gray-100 rounded-lg"><Edit3 className="w-4 h-4" /></button><button onClick={() => handleToggle(m)} className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg">{m.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}</button><button onClick={() => handleDelete(m)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button></div>
              </div>
            ))}
          </div>
        )}
      </div>
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b"><h2 className="text-xl font-serif font-bold text-navy">{modal === 'add' ? 'Add Member' : 'Edit Member'}</h2><button onClick={() => setModal(null)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button></div>
            <div className="p-6 space-y-4">
              <div className="flex flex-col items-center gap-3"><div className="w-24 h-32 bg-gray-100 rounded-lg overflow-hidden border-2 border-gold/30 flex items-center justify-center">{form.profile_picture_url ? <img src={form.profile_picture_url} alt="Preview" className="w-full h-full object-cover" /> : <Award className="w-8 h-8 text-gray-300" />}</div>
                <label className="cursor-pointer"><input type="file" accept="image/jpeg,image/png" onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} className="hidden" /><span className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm"><Upload className="w-4 h-4" />{uploading ? 'Uploading…' : 'Upload (216x360)'}</span></label></div>
              <div className="grid md:grid-cols-2 gap-4">
                <div><label className="text-sm font-medium text-gray-700">Name *</label><input type="text" value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Job Title *</label><input type="text" value={form.job_title ?? ''} onChange={e => setForm(f => ({ ...f, job_title: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Position</label><input type="text" value={form.position ?? ''} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Pod Name</label><input type="text" value={form.pod_name ?? ''} onChange={e => setForm(f => ({ ...f, pod_name: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Display Order</label><input type="number" value={form.display_order ?? 0} onChange={e => setForm(f => ({ ...f, display_order: parseInt(e.target.value) }))} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm" /></div>
              </div>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_active ?? true} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4 accent-navy" /> <span className="text-sm text-gray-700">Active</span></label>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t"><button onClick={() => setModal(null)} className="px-5 py-2 border border-gray-300 rounded-xl text-sm">Cancel</button><button onClick={handleSave} disabled={saving || !form.name?.trim() || !form.job_title?.trim()} className="flex items-center gap-2 px-5 py-2 bg-navy text-gold rounded-xl text-sm font-semibold disabled:opacity-50 border border-gold/20"><Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save'}</button></div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
