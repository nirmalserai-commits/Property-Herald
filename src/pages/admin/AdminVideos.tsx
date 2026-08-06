import { useState, useEffect } from 'react';
import { AdminLayout, logAdminAction } from '../../components/AdminLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import {
  Plus, Edit3, Trash2, X, Save, Upload, Video as VideoIcon,
  RefreshCw, Eye, EyeOff, Loader2, Film, AlertCircle,
} from 'lucide-react';
import type { Video } from '../../types/database';

interface VideoForm {
  id?: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string;
  category: string;
  display_order: number;
  active: boolean;
}

const EMPTY: VideoForm = {
  title: '', description: '', video_url: '', thumbnail_url: '',
  category: '', display_order: 0, active: true,
};

export function AdminVideos() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [selected, setSelected] = useState<Video | null>(null);
  const [form, setForm] = useState<VideoForm>(EMPTY);

  async function fetchVideos() {
    setLoading(true);
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .order('display_order');
    if (error) {
      setErrorMsg('Failed to load videos: ' + error.message);
    } else if (data) {
      setVideos(data as Video[]);
      setErrorMsg('');
    }
    setLoading(false);
  }

  useEffect(() => { fetchVideos(); }, []);

  function openAdd() {
    setForm({ ...EMPTY, display_order: videos.length + 1 });
    setSelected(null);
    setUploadError('');
    setErrorMsg('');
    setModal('add');
  }

  function openEdit(v: Video) {
    setForm({
      id: v.id,
      title: v.title,
      description: v.description ?? '',
      video_url: v.video_url,
      thumbnail_url: v.thumbnail_url ?? '',
      category: v.category ?? '',
      display_order: v.display_order,
      active: v.active,
    });
    setSelected(v);
    setUploadError('');
    setErrorMsg('');
    setModal('edit');
  }

  async function handleVideoUpload(file: File) {
    if (!file) return;
    setUploadError('');
    setUploadProgress(0);

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'mp4';
    const path = `videos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage
      .from('videos')
      .upload(path, file, {
        onUpload: (e: { loaded: number; total: number }) => {
          if (e.total > 0) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        },
      });

    if (error) {
      setUploadError('Upload failed: ' + error.message);
      setUploadProgress(null);
      return;
    }

    const { data } = supabase.storage.from('videos').getPublicUrl(path);
    setForm(f => ({ ...f, video_url: data.publicUrl }));
    setUploadProgress(null);
  }

  async function handleThumbnailUpload(file: File) {
    setUploadingThumb(true);
    setUploadError('');
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `thumbnails/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('videos').upload(path, file);
    if (error) {
      setUploadError('Thumbnail upload failed: ' + error.message);
    } else {
      const { data } = supabase.storage.from('videos').getPublicUrl(path);
      setForm(f => ({ ...f, thumbnail_url: data.publicUrl }));
    }
    setUploadingThumb(false);
  }

  async function handleSave() {
    if (!form.title.trim() || !form.video_url.trim()) return;
    setSaving(true);
    setErrorMsg('');

    const payload = {
      title: form.title.trim(),
      description: form.description?.trim() || null,
      video_url: form.video_url.trim(),
      thumbnail_url: form.thumbnail_url?.trim() || null,
      category: form.category?.trim() || null,
      display_order: form.display_order ?? 0,
      active: form.active ?? true,
    };

    if (modal === 'add') {
      const { data, error } = await supabase
        .from('videos')
        .insert(payload)
        .select('id')
        .maybeSingle();
      if (error) {
        setErrorMsg('Save failed: ' + error.message);
        setSaving(false);
        return;
      }
      if (data && user?.email) {
        await logAdminAction(supabase, user.email, 'create_video', 'videos', data.id, { title: form.title });
      }
    } else if (selected?.id) {
      const { error } = await supabase
        .from('videos')
        .update(payload)
        .eq('id', selected.id);
      if (error) {
        setErrorMsg('Save failed: ' + error.message);
        setSaving(false);
        return;
      }
      if (user?.email) {
        await logAdminAction(supabase, user.email, 'update_video', 'videos', selected.id, { title: form.title });
      }
    }

    setSaving(false);
    setModal(null);
    fetchVideos();
  }

  async function handleToggle(v: Video) {
    const { error } = await supabase
      .from('videos')
      .update({ active: !v.active })
      .eq('id', v.id);
    if (error) {
      setErrorMsg('Toggle failed: ' + error.message);
    }
    fetchVideos();
  }

  async function extractStoragePath(url: string): Promise<string | null> {
    try {
      const u = new URL(url);
      const parts = u.pathname.split('/');
      const idx = parts.indexOf('videos');
      if (idx === -1) return null;
      return parts.slice(idx + 1).join('/');
    } catch {
      return null;
    }
  }

  async function handleDelete(v: Video) {
    if (!confirm(`Delete "${v.title}"? This removes the video file and the database record.`)) return;

    const filePath = await extractStoragePath(v.video_url);
    if (filePath) {
      await supabase.storage.from('videos').remove([filePath]);
    }
    if (v.thumbnail_url) {
      const thumbPath = await extractStoragePath(v.thumbnail_url);
      if (thumbPath) await supabase.storage.from('videos').remove([thumbPath]);
    }

    const { error } = await supabase.from('videos').delete().eq('id', v.id);
    if (error) {
      setErrorMsg('Delete failed: ' + error.message);
    } else if (user?.email) {
      await logAdminAction(supabase, user.email, 'delete_video', 'videos', v.id, { title: v.title });
    }
    fetchVideos();
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif font-bold text-navy">Videos</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage video gallery ({videos.length} videos)
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchVideos} className="p-2 text-gray-500 hover:text-navy rounded-lg hover:bg-gray-100">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 bg-navy text-gold rounded-xl font-semibold text-sm border border-gold/20"
            >
              <Plus className="w-4 h-4" />
              Add Video
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>{errorMsg}</p>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-xl border h-48 animate-pulse" />
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gold/10 border border-gold/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Film className="w-8 h-8 text-gold" />
            </div>
            <p className="text-gray-500 mb-4">No videos yet. Upload your first video to get started.</p>
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-navy text-gold rounded-xl font-semibold text-sm border border-gold/20"
            >
              <Plus className="w-4 h-4" />Add Video
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.map(v => (
              <div key={v.id} className={`bg-white rounded-xl border ${v.active ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
                <div className="aspect-video bg-gray-100 overflow-hidden rounded-t-xl relative">
                  {v.thumbnail_url ? (
                    <img src={v.thumbnail_url} alt={v.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <VideoIcon className="w-10 h-10 text-gray-300" />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity">
                    <VideoIcon className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="font-serif font-bold text-navy text-sm truncate">{v.title}</h3>
                  {v.category && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-gold/10 text-gold text-xs font-medium rounded-full">
                      {v.category}
                    </span>
                  )}
                  <p className="text-xs text-gray-400 mt-1">Order: {v.display_order}</p>
                </div>
                <div className="px-3 pb-3 flex items-center gap-1 border-t border-gray-50 pt-2">
                  <button onClick={() => openEdit(v)} className="p-2 text-gray-400 hover:text-navy hover:bg-gray-100 rounded-lg">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleToggle(v)} className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg">
                    {v.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button onClick={() => handleDelete(v)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
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
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
              <h2 className="text-xl font-serif font-bold text-navy">
                {modal === 'add' ? 'Add Video' : 'Edit Video'}
              </h2>
              <button onClick={() => setModal(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Video upload */}
              <div>
                <label className="text-sm font-medium text-gray-700">Video File (MP4 / MOV) *</label>
                {form.video_url ? (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
                    <VideoIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <p className="text-sm text-green-700 truncate flex-1">Video uploaded successfully</p>
                    {modal === 'edit' && (
                      <label className="cursor-pointer text-xs text-navy font-medium hover:underline">
                        Replace
                        <input type="file" accept="video/mp4,video/quicktime" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleVideoUpload(f); }} />
                      </label>
                    )}
                  </div>
                ) : (
                  <label className="mt-2 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-8 cursor-pointer hover:border-gold/50 transition-colors">
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500">Click to upload video</span>
                    <span className="text-xs text-gray-400 mt-1">MP4 or MOV, up to 1GB</span>
                    <input type="file" accept="video/mp4,video/quicktime" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleVideoUpload(f); }} />
                  </label>
                )}
                {uploadProgress !== null && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>Uploading…</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-gold transition-all" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Thumbnail upload */}
              <div>
                <label className="text-sm font-medium text-gray-700">Thumbnail Image (optional)</label>
                <div className="mt-2 flex items-center gap-3">
                  {form.thumbnail_url && (
                    <img src={form.thumbnail_url} alt="Thumbnail" className="w-20 h-14 object-cover rounded-lg border border-gray-200" />
                  )}
                  <label className="cursor-pointer">
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleThumbnailUpload(f); }} />
                    <span className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm">
                      <Upload className="w-4 h-4" />
                      {uploadingThumb ? 'Uploading…' : form.thumbnail_url ? 'Replace Thumbnail' : 'Upload Thumbnail'}
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Title *</label>
                <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm mt-1" />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Description</label>
                <textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm mt-1 resize-none" />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Category</label>
                <input type="text" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g., Project Walkthrough, Market Update, Testimonial" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm mt-1" />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Display Order</label>
                <input type="number" value={form.display_order} onChange={e => setForm(f => ({ ...f, display_order: parseInt(e.target.value) }))} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm mt-1" />
              </div>

              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="w-4 h-4 accent-navy" />
                <span className="text-sm text-gray-700">Active (visible on public site)</span>
              </label>

              {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
            </div>

            <div className="flex justify-end gap-3 p-6 border-t sticky bottom-0 bg-white">
              <button onClick={() => setModal(null)} className="px-5 py-2 border border-gray-300 rounded-xl text-sm">Cancel</button>
              <button
                onClick={handleSave}
                disabled={saving || !form.title.trim() || !form.video_url.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-navy text-gold rounded-xl text-sm font-semibold disabled:opacity-50 border border-gold/20"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
