import { useState, useEffect } from 'react';
import { AdminLayout, logAdminAction } from '../../components/AdminLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { DaughterPicture } from '../../types/database';
import { Upload, RefreshCw, Bot, Check, X } from 'lucide-react';

export function AdminDaughterPictures() {
  const { user } = useAuth();
  const [daughters, setDaughters] = useState<DaughterPicture[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  async function fetchDaughters() {
    setLoading(true);
    const { data } = await supabase.from('daughter_pictures').select('*').order('display_order');
    if (data) setDaughters(data as DaughterPicture[]);
    setLoading(false);
  }
  useEffect(() => { fetchDaughters(); }, []);

  async function handleUpload(daughterName: string, file: File) {
    setUploading(prev => ({ ...prev, [daughterName]: true }));
    const path = `daughters/${daughterName}-${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('assets').upload(path, file);
    if (!error) {
      const { data: urlData } = supabase.storage.from('assets').getPublicUrl(path);
      await supabase.from('daughter_pictures').update({ profile_picture_url: urlData.publicUrl, updated_at: new Date().toISOString() }).eq('daughter_name', daughterName);
      if (user?.email) await logAdminAction(supabase, user.email, 'update_daughter_picture', 'daughter_pictures', daughterName, { url: urlData.publicUrl });
      fetchDaughters();
    }
    setUploading(prev => ({ ...prev, [daughterName]: false }));
  }

  function startEdit(d: DaughterPicture) {
    setEditingId(d.id);
    setDraftName(d.display_name);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraftName('');
  }

  async function saveName(d: DaughterPicture) {
    const trimmed = draftName.trim();
    if (!trimmed || trimmed === d.display_name) { cancelEdit(); return; }
    setSavingId(d.id);
    const { error } = await supabase
      .from('daughter_pictures')
      .update({ display_name: trimmed, updated_at: new Date().toISOString() })
      .eq('id', d.id);
    if (!error) {
      if (user?.email) await logAdminAction(supabase, user.email, 'update_daughter_name', 'daughter_pictures', d.daughter_name, { old_name: d.display_name, new_name: trimmed });
      setDaughters(prev => prev.map(x => x.id === d.id ? { ...x, display_name: trimmed } : x));
    }
    setSavingId(null);
    cancelEdit();
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-serif font-bold text-navy">Team Photos</h1><p className="text-sm text-gray-500 mt-1">Edit names and upload profile pictures for the 15 team members</p></div>
          <button onClick={fetchDaughters} className="p-2 text-gray-500 hover:text-navy rounded-lg hover:bg-gray-100"><RefreshCw className="w-4 h-4" /></button>
        </div>
        {loading ? <div className="grid grid-cols-2 md:grid-cols-5 gap-4">{[1,2,3,4,5].map(i => <div key={i} className="bg-white rounded-xl border h-48 animate-pulse" />)}</div> : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {daughters.map(d => (
              <div key={d.id} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <div className="w-24 h-24 rounded-full mx-auto bg-gray-100 overflow-hidden border-2 border-gold/30 flex items-center justify-center mb-3">
                  {d.profile_picture_url ? <img src={d.profile_picture_url} alt={d.display_name} className="w-full h-full object-cover" /> : <Bot className="w-10 h-10 text-gray-300" />}
                </div>
                {editingId === d.id ? (
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <input
                      autoFocus
                      value={draftName}
                      onChange={e => setDraftName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveName(d); if (e.key === 'Escape') cancelEdit(); }}
                      disabled={savingId === d.id}
                      className="w-full text-sm font-serif font-bold text-navy text-center border border-gold/50 rounded px-1 py-0.5 focus:outline-none focus:border-gold"
                    />
                    <button onClick={() => saveName(d)} disabled={savingId === d.id} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Save name"><Check className="w-4 h-4" /></button>
                    <button onClick={cancelEdit} disabled={savingId === d.id} className="p-1 text-gray-400 hover:bg-gray-100 rounded" title="Cancel"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <button onClick={() => startEdit(d)} title="Click to edit name" className="block w-full mb-1">
                    <p className="font-serif font-bold text-navy text-sm hover:text-gold transition-colors">{d.display_name}</p>
                  </button>
                )}
                <p className="text-xs text-gray-400 mb-3">{d.pod_title}</p>
                <label className="cursor-pointer">
                  <input type="file" accept="image/jpeg,image/png" onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(d.daughter_name, f); }} className="hidden" />
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200">
                    {uploading[d.daughter_name] ? 'Uploading…' : <><Upload className="w-3 h-3" />Upload</>}
                  </span>
                </label>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
