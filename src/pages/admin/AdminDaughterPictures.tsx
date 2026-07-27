import { useState, useEffect } from 'react';
import { AdminLayout, logAdminAction } from '../../components/AdminLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Plus, Edit3, Trash2, X, Save, Upload, User, RefreshCw, Eye, EyeOff } from 'lucide-react';

const MAX_MEMBERS = 15;

interface DaughterPictureForm {
  id?: string;
  daughter_name: string;
  display_name: string;
  pod_title: string;
  profile_picture_url: string;
  display_order: number;
  is_active: boolean;
}

const EMPTY: DaughterPictureForm = {
  daughter_name: '', display_name: '', pod_title: '', profile_picture_url: '', display_order: 0, is_active: true,
};

export function AdminDaughterPictures() {
  const { user } = useAuth();
  const [members, setMembers] = useState<DaughterPictureForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [selected, setSelected] = useState<DaughterPictureForm | null>(null);
  const [form, setForm] = useState<DaughterPictureForm>(EMPTY);

  async function fetchMembers() {
    setLoading(true);
    const { data, error } = await supabase
      .from('daughter_pictures')
      .select('*')
      .order('display_order');
    if (error) {
      setErrorMsg('Failed to load team members: ' + error.message);
    } else if (data) {
      setMembers(data as DaughterPictureForm[]);
      setErrorMsg('');
    }
    setLoading(false);
  }

  useEffect(() => { fetchMembers(); }, []);

  function openAdd() {
    setForm({ ...EMPTY, display_order: members.length + 1 });
    setSelected(null);
    setUploadError('');
    setErrorMsg('');
    setModal('add');
  }

  function openEdit(m: DaughterPictureForm) {
    setForm({ ...m });
    setSelected(m);
    setUploadError('');
    setErrorMsg('');
    setModal('edit');
  }

  async function handleUpload(file: File) {
    setUploading(true);
    setUploadError('');
    const ext = file.name.split('.').pop();
    const path = `team/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('team-photos').upload(path, file);
    if (error) {
      setUploadError('Upload failed: ' + error.message);
    } else {
      const { data } = supabase.storage.from('team-photos').getPublicUrl(path);
      setForm(f => ({ ...f, profile_picture_url: data.publicUrl }));
    }
    setUploading(false);
  }

  async function handleSave() {
    if (!form.daughter_name?.trim() || !form.display_name?.trim()) return;
    setSaving(true);
    setErrorMsg('');

    const payload = {
      daughter_name: form.daughter_name,
      display_name: form.display_name,
      pod_title: form.pod_title,
      profile_picture_url: form.profile_picture_url || null,
      display_order: form.display_order ?? 0,
      is_active: form.is_active ?? true,
    };

    if (modal === 'add') {
      const { data, error } = await supabase
        .from('daughter_pictures')
        .insert(payload)
        .select('id')
        .maybeSingle();
      if (error) {
        setErrorMsg('Save failed: ' + error.message);
        setSaving(false);
        return;
      }
      if (data && user?.email) {
        await logAdminAction(supabase, user.email, 'create_daughter_picture', 'daughter_pictures', data.id, { name: form.display_name });
      }
    } else if (selected?.id) {
      const { error } = await supabase
        .from('daughter_pictures')
        .update(payload)
        .eq('id', selected.id);
      if (error) {
        setErrorMsg('Save failed: ' + error.message);
        setSaving(false);
        return;
      }
      if (user?.email) {
        await logAdminAction(supabase, user.email, 'update_daughter_picture', 'daughter_pictures', selected.id, { name: form.display_name });
      }
    }

    setSaving(false);
    setModal(null);
    fetchMembers();
  }

  async function handleToggle(m: DaughterPictureForm) {
    const { error } = await supabase
      .from('daughter_pictures')
      .update({ is_active: !m.is_active })
      .eq('id', m.id!);
    if (error) {
      setErrorMsg('Toggle failed: ' + error.message);
    }
    fetchMembers();
  }

  async function handleDelete(m: DaughterPictureForm) {
    if (!confirm(`Delete ${m.display_name}?`)) return;
    const { error } = await supabase
      .from('daughter_pictures')
      .delete()
      .eq('id', m.id!);
    if (error) {
      setErrorMsg('Delete failed: ' + error.message);
    } else if (user?.email) {
      await logAdminAction(supabase, user.email, 'delete_daughter_picture', 'daughter_pictures', m.id!, { name: m.display_name });
    }
    fetchMembers();
  }

  const atMax = members.length >= MAX_MEMBERS;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif font-bold text-navy">Team Pictures</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage team member photos ({members.length}/{MAX_MEMBERS})
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchMembers} className="p-2 text-gray-500 hover:text-navy rounded-lg hover:bg-gray-100">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={openAdd}
              disabled={atMax}
              className="flex items-center gap-2 px-4 py-2 bg-navy text-gold rounded-xl font-semibold text-sm border border-gold/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              {atMax ? 'Max 15 Reached' : 'Add Member'}
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-xl border h-64 animate-pulse" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gold/10 border border-gold/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-gold" />
            </div>
            <p className="text-gray-500 mb-4">No team members yet. Add your first member to get started.</p>
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-navy text-gold rounded-xl font-semibold text-sm border border-gold/20"
            >
              <Plus className="w-4 h-4" />Add Member
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {members.map(m => (
              <div key={m.id} className={`bg-white rounded-xl border ${m.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
                <div className="aspect-[3/5] bg-gray-100 overflow-hidden rounded-t-xl">
                  {m.profile_picture_url ? (
                    <img src={m.profile_picture_url} alt={m.display_name} className="w-full h-full object-cover object-center" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-8 h-8 text-gray-300" />
                    </div>
                  )}
                </div>
                <div className="p-3 text-center">
                  <h3 className="font-serif font-bold text-navy text-sm">{m.display_name}</h3>
                  <p className="text-xs text-gray-500">{m.pod_title}</p>
                </div>
                <div className="px-3 pb-3 flex items-center gap-1 border-t border-gray-50 pt-2">
                  <button onClick={() => openEdit(m)} className="p-2 text-gray-400 hover:text-navy hover:bg-gray-100 rounded-lg">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleToggle(m)} className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg">
                    {m.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button onClick={() => handleDelete(m)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-serif font-bold text-navy">
                {modal === 'add' ? 'Add Member' : 'Edit Member'}
              </h2>
              <button onClick={() => setModal(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex flex-col items-center gap-3">
                <div className="w-24 h-32 bg-gray-100 rounded-lg overflow-hidden border-2 border-gold/30 flex items-center justify-center">
                  {form.profile_picture_url ? (
                    <img src={form.profile_picture_url} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-gray-300" />
                  )}
                </div>
                <label className="cursor-pointer">
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} className="hidden" />
                  <span className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm">
                    <Upload className="w-4 h-4" />
                    {uploading ? 'Uploading…' : 'Upload Photo'}
                  </span>
                </label>
                {uploadError && (
                  <p className="text-sm text-red-600 text-center">{uploadError}</p>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Daughter Name *</label>
                  <input type="text" value={form.daughter_name ?? ''} onChange={e => setForm(f => ({ ...f, daughter_name: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Display Name *</label>
                  <input type="text" value={form.display_name ?? ''} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Pod Title</label>
                  <input type="text" value={form.pod_title ?? ''} onChange={e => setForm(f => ({ ...f, pod_title: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Display Order</label>
                  <input type="number" value={form.display_order ?? 0} onChange={e => setForm(f => ({ ...f, display_order: parseInt(e.target.value) }))} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm" />
                </div>
              </div>

              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.is_active ?? true} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4 accent-navy" />
                <span className="text-sm text-gray-700">Active</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t">
              <button onClick={() => setModal(null)} className="px-5 py-2 border border-gray-300 rounded-xl text-sm">Cancel</button>
              <button
                onClick={handleSave}
                disabled={saving || !form.daughter_name?.trim() || !form.display_name?.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-navy text-gold rounded-xl text-sm font-semibold disabled:opacity-50 border border-gold/20"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
