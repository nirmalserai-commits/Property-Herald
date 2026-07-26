import { useState, useEffect } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import { supabase } from '../../lib/supabase';
import { FolderOpen, Upload, Copy, Trash2, FileText, Image, Film, RefreshCw, Users, User } from 'lucide-react';

const TEAM_MEMBERS = [
  'Nirmal Serai', 'Rajesh Kumar', 'Priya Sharma', 'Amit Patel', 'Sneha Reddy',
  'Vikram Singh', 'Anita Desai', 'Rohan Mehta', 'Kavya Nair', 'Arjun Gupta',
  'Deepa Iyer', 'Sanjay Verma', 'Meera Joshi', 'Karan Malhotra', 'Pooja Bhat',
];

interface AssetFile { name: string; id: string; publicUrl: string; metadata: { size: number; mimetype: string } | null; }

export function AdminAssets() {
  const [files, setFiles] = useState<AssetFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [tab, setTab] = useState<'assets' | 'team'>('assets');
  const [teamPhotos, setTeamPhotos] = useState<Record<string, string>>({});
  const [teamLoading, setTeamLoading] = useState(false);
  const [uploadingMember, setUploadingMember] = useState<string | null>(null);

  async function fetchFiles() {
    setLoading(true);
    const { data, error } = await supabase.storage.from('assets').list('', { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });
    if (!error && data) {
      const mapped = data.filter(f => f.name).map(f => {
        const { data: urlData } = supabase.storage.from('assets').getPublicUrl(f.name);
        return { name: f.name, id: f.id, publicUrl: urlData.publicUrl, metadata: (f.metadata || null) as AssetFile['metadata'] };
      });
      setFiles(mapped);
    }
    setLoading(false);
  }
  useEffect(() => { fetchFiles(); }, []);

  async function fetchTeamPhotos() {
    const { data } = await supabase.from('site_config').select('key, value').like('key', 'team_photo_%');
    if (data) {
      const map: Record<string, string> = {};
      for (const row of data as { key: string; value: string }[]) {
        map[row.key.replace('team_photo_', '')] = row.value;
      }
      setTeamPhotos(map);
    }
  }
  useEffect(() => { fetchTeamPhotos(); }, []);

  async function handleUpload(file: File) {
    setUploading(true);
    const path = `${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('assets').upload(path, file);
    if (!error) fetchFiles();
    setUploading(false);
  }

  async function handleTeamUpload(name: string, file: File) {
    setUploadingMember(name);
    const path = `team/${Date.now()}-${file.name.replace(/\s/g, '_')}`;
    const { error } = await supabase.storage.from('assets').upload(path, file);
    if (error) { setUploadingMember(null); return; }
    const { data: urlData } = supabase.storage.from('assets').getPublicUrl(path);
    const key = `team_photo_${name}`;
    const { data: existing } = await supabase.from('site_config').select('key').eq('key', key).maybeSingle();
    if (existing) {
      await supabase.from('site_config').update({ value: urlData.publicUrl }).eq('key', key);
    } else {
      await supabase.from('site_config').insert({ key, value: urlData.publicUrl });
    }
    fetchTeamPhotos();
    setUploadingMember(null);
  }

  async function handleTeamDelete(name: string) {
    if (!confirm(`Remove ${name}'s photo?`)) return;
    const key = `team_photo_${name}`;
    await supabase.from('site_config').delete().eq('key', key);
    fetchTeamPhotos();
  }

  function copyUrl(url: string) { navigator.clipboard.writeText(url); setCopied(url); setTimeout(() => setCopied(null), 2000); }

  async function handleDelete(name: string) { if (!confirm('Delete this file?')) return; await supabase.storage.from('assets').remove([name]); fetchFiles(); }

  function getIcon(mime: string | undefined) { if (mime?.startsWith('image/')) return Image; if (mime?.startsWith('video/')) return Film; return FileText; }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-serif font-bold text-navy">Assets Area</h1><p className="text-sm text-gray-500 mt-1">Upload and manage media files</p></div>
          <button onClick={() => tab === 'assets' ? fetchFiles() : fetchTeamPhotos()} className="p-2 text-gray-500 hover:text-navy rounded-lg hover:bg-gray-100"><RefreshCw className="w-4 h-4" /></button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          <button onClick={() => setTab('assets')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'assets' ? 'border-gold text-navy' : 'border-transparent text-gray-500 hover:text-navy'}`}>
            <FolderOpen className="w-4 h-4 inline mr-1.5" />General Assets
          </button>
          <button onClick={() => setTab('team')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'team' ? 'border-gold text-navy' : 'border-transparent text-gray-500 hover:text-navy'}`}>
            <Users className="w-4 h-4 inline mr-1.5" />Team Photos
          </button>
        </div>

        {tab === 'assets' && (
          <>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-gold/40 transition-colors bg-gray-50">
              <input type="file" accept="image/jpeg,image/png,application/pdf,video/mp4" onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} className="hidden" />
              {uploading ? <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" /> : <><Upload className="w-8 h-8 text-gray-400 mb-2" /><p className="text-sm text-gray-500">Click to upload (JPG, PNG, PDF, MP4)</p></>}
            </label>
            {loading ? <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="bg-white rounded-xl border h-32 animate-pulse" />)}</div> : files.length === 0 ? <div className="text-center py-16"><FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-500">No files uploaded yet.</p></div> : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {files.map(f => { const Icon = getIcon(f.metadata?.mimetype); return (
                  <div key={f.id} className="bg-white rounded-xl border border-gray-200 p-4">
                    <Icon className="w-8 h-8 text-gold/60 mb-3" />
                    <p className="text-xs font-medium text-navy truncate mb-2">{f.name}</p>
                    <div className="flex items-center gap-1">
                      <button onClick={() => copyUrl(f.publicUrl)} className="p-1.5 text-gray-400 hover:text-navy hover:bg-gray-100 rounded-lg"><Copy className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(f.name)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                    {copied === f.publicUrl && <p className="text-xs text-green-600 mt-1">Copied!</p>}
                  </div>
                ); })}
              </div>
            )}
          </>
        )}

        {tab === 'team' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Upload photos for the "Meet Our Team" section on the homepage. Each member shows a circular photo with their name below.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
              {TEAM_MEMBERS.map((name) => {
                const photoUrl = teamPhotos[name];
                const isUploading = uploadingMember === name;
                return (
                  <div key={name} className="flex flex-col items-center bg-white rounded-xl border border-gray-200 p-4">
                    <div className="relative w-24 h-24 rounded-full border-2 border-gold/30 overflow-hidden bg-gray-100 mb-3">
                      {isUploading ? (
                        <div className="w-full h-full flex items-center justify-center"><div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" /></div>
                      ) : photoUrl ? (
                        <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><User className="w-8 h-8 text-gray-300" /></div>
                      )}
                    </div>
                    <p className="text-xs font-medium text-navy text-center mb-2">{name}</p>
                    <div className="flex items-center gap-1">
                      <label className="p-1.5 text-gray-400 hover:text-navy hover:bg-gray-100 rounded-lg cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleTeamUpload(name, f); }} />
                      </label>
                      {photoUrl && (
                        <button onClick={() => handleTeamDelete(name)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
