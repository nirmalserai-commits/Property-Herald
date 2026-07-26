import { useState, useEffect } from 'react';
import { AdminLayout, logAdminAction } from '../../components/AdminLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { DaughterPicture } from '../../types/database';
import { Upload, RefreshCw, User, Check } from 'lucide-react';

export function AdminDaughterPictures() {
  const { user } = useAuth();
  const [members, setMembers] = useState<DaughterPicture[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchMembers() {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('daughter_pictures')
      .select('*')
      .order('display_order');
    if (fetchError) setError(fetchError.message);
    if (data) setMembers(data as DaughterPicture[]);
    setLoading(false);
  }

  useEffect(() => { fetchMembers(); }, []);

  async function handleUpload(member: DaughterPicture, file: File) {
    setUploadingId(member.id);
    setError(null);
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const safeName = member.daughter_name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const path = `Team/${safeName}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('Assets')
      .upload(path, file, { cacheControl: '3600', upsert: false });

    if (uploadError) {
      setError(`Upload failed for ${member.display_name}: ${uploadError.message}`);
      setUploadingId(null);
      return;
    }

    const { data: urlData } = supabase.storage.from('Assets').getPublicUrl(path);
    const publicUrl = urlData.publicUrl;

    const { error: updateError } = await supabase
      .from('daughter_pictures')
      .update({ profile_picture_url: publicUrl })
      .eq('id', member.id);

    if (updateError) {
      setError(`Save failed for ${member.display_name}: ${updateError.message}`);
      setUploadingId(null);
      return;
    }

    if (user?.email) {
      await logAdminAction(supabase, user.email, 'update_team_photo', 'daughter_pictures', member.id, { url: publicUrl });
    }

    setMembers(prev => prev.map(m => m.id === member.id ? { ...m, profile_picture_url: publicUrl } : m));
    setUploadingId(null);
    setSavedId(member.id);
    setTimeout(() => setSavedId(prev => prev === member.id ? null : prev), 2000);
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif font-bold text-navy">Team Photos</h1>
            <p className="text-sm text-gray-500 mt-1">Upload a profile photo for each of the 15 team members</p>
          </div>
          <button onClick={fetchMembers} className="p-2 text-gray-500 hover:text-navy rounded-lg hover:bg-gray-100" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[1,2,3,4,5].map(i => <div key={i} className="bg-white rounded-xl border h-56 animate-pulse" />)}
          </div>
        ) : members.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
            No team members found in the database.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {members.map(m => (
              <div key={m.id} className="bg-white rounded-xl border border-gray-200 p-4 text-center flex flex-col items-center">
                <div className="w-24 h-24 rounded-full mx-auto bg-gray-100 overflow-hidden border-2 border-gold/30 flex items-center justify-center mb-3">
                  {m.profile_picture_url ? (
                    <img src={m.profile_picture_url} alt={m.display_name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-gray-300" />
                  )}
                </div>
                <p className="font-serif font-bold text-navy text-sm">{m.display_name}</p>
                {m.pod_title && <p className="text-xs text-gold mt-0.5 mb-3">{m.pod_title}</p>}
                <label className="cursor-pointer mt-auto">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(m, f); e.currentTarget.value = ''; }}
                    className="hidden"
                  />
                  <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    uploadingId === m.id ? 'bg-gray-100 text-gray-400'
                    : savedId === m.id ? 'bg-green-50 text-green-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}>
                    {uploadingId === m.id ? 'Uploading…'
                      : savedId === m.id ? <><Check className="w-3 h-3" />Saved</>
                      : <><Upload className="w-3 h-3" />{m.profile_picture_url ? 'Replace' : 'Upload'}</>}
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
