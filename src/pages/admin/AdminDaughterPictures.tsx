import { useState, useEffect } from 'react';
import { AdminLayout, logAdminAction } from '../../components/AdminLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { DaughterPicture } from '../../types/database';
import { Upload, RefreshCw, Bot } from 'lucide-react';

export function AdminDaughterPictures() {
  const { user } = useAuth();
  const [daughters, setDaughters] = useState<DaughterPicture[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

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

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-serif font-bold text-navy">Team Pictures</h1><p className="text-sm text-gray-500 mt-1">Upload profile pictures for the 15 AI daughters</p></div>
          <button onClick={fetchDaughters} className="p-2 text-gray-500 hover:text-navy rounded-lg hover:bg-gray-100"><RefreshCw className="w-4 h-4" /></button>
        </div>
        {loading ? <div className="grid grid-cols-2 md:grid-cols-5 gap-4">{[1,2,3,4,5].map(i => <div key={i} className="bg-white rounded-xl border h-48 animate-pulse" />)}</div> : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {daughters.map(d => (
              <div key={d.id} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <div className="w-24 h-24 rounded-full mx-auto bg-gray-100 overflow-hidden border-2 border-gold/30 flex items-center justify-center mb-3">
                  {d.profile_picture_url ? <img src={d.profile_picture_url} alt={d.display_name} className="w-full h-full object-cover" /> : <Bot className="w-10 h-10 text-gray-300" />}
                </div>
                <p className="font-serif font-bold text-navy text-sm">{d.display_name}</p>
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
