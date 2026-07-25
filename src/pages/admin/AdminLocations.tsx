import { useState, useEffect } from 'react';
import { AdminLayout, logAdminAction } from '../../components/AdminLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { Locality, City } from '../../types/database';
import { Plus, X, Save, MapPin, RefreshCw, CheckCircle, XCircle, Trash2 } from 'lucide-react';

export function AdminLocations() {
  const { user } = useAuth();
  const [cities, setCities] = useState<City[]>([]);
  const [localities, setLocalities] = useState<Locality[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'addCity' | 'addLocality' | null>(null);
  const [cityForm, setCityForm] = useState({ name: '', state: 'Maharashtra' });
  const [localityForm, setLocalityForm] = useState<Partial<Locality>>({ name: '', city_id: '', is_active: true });

  async function fetchData() {
    setLoading(true);
    const [{ data: cityData }, { data: locData }] = await Promise.all([
      supabase.from('cities').select('*').order('name'),
      supabase.from('localities').select('*, city:cities(*)').order('created_at', { ascending: false }),
    ]);
    if (cityData) setCities(cityData as City[]);
    if (locData) setLocalities(locData as Locality[]);
    setLoading(false);
  }
  useEffect(() => { fetchData(); }, []);

  async function handleAddCity() {
    if (!cityForm.name.trim()) return;
    const slug = cityForm.name.toLowerCase().replace(/\s+/g, '-');
    await supabase.from('cities').insert({ name: cityForm.name, state: cityForm.state, slug, is_active: true });
    if (user?.email) await logAdminAction(supabase, user.email, 'create_city', 'cities', undefined, { name: cityForm.name });
    setCityForm({ name: '', state: 'Maharashtra' }); setModal(null); fetchData();
  }

  async function handleAddLocality() {
    if (!localityForm.name?.trim() || !localityForm.city_id) return;
    await supabase.from('localities').insert({ name: localityForm.name, city_id: localityForm.city_id, is_active: true, is_verified: true, verified_by: user?.email });
    if (user?.email) await logAdminAction(supabase, user.email, 'create_locality', 'localities', undefined, { name: localityForm.name });
    setLocalityForm({ name: '', city_id: '', is_active: true }); setModal(null); fetchData();
  }

  async function handleVerify(loc: Locality) { await supabase.from('localities').update({ is_verified: !loc.is_verified, verified_by: !loc.is_verified ? user?.email : null }).eq('id', loc.id); fetchData(); }
  async function handleDeleteLocality(loc: Locality) { if (!confirm(`Delete ${loc.name}?`)) return; await supabase.from('localities').delete().eq('id', loc.id); fetchData(); }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-serif font-bold text-navy">Locations</h1><p className="text-sm text-gray-500 mt-1">Manage cities and localities</p></div>
          <div className="flex items-center gap-2">
            <button onClick={fetchData} className="p-2 text-gray-500 hover:text-navy rounded-lg hover:bg-gray-100"><RefreshCw className="w-4 h-4" /></button>
            <button onClick={() => setModal('addCity')} className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium"><Plus className="w-4 h-4" />City</button>
            <button onClick={() => setModal('addLocality')} className="flex items-center gap-2 px-4 py-2 bg-navy text-gold rounded-xl font-semibold text-sm border border-gold/20"><Plus className="w-4 h-4" />Locality</button>
          </div>
        </div>
        {loading ? <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="bg-white rounded-xl border h-16 animate-pulse" />)}</div> : (
          <div className="space-y-2">
            {localities.map(loc => (
              <div key={loc.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
                <MapPin className="w-4 h-4 text-gold/60" />
                <div className="flex-1"><p className="font-medium text-navy text-sm">{loc.name}</p><p className="text-xs text-gray-400">{loc.city?.name}, {loc.city?.state}</p></div>
                <button onClick={() => handleVerify(loc)} className={`p-2 rounded-lg ${loc.is_verified ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}>{loc.is_verified ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}</button>
                <button onClick={() => handleDeleteLocality(loc)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}
      </div>
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b"><h2 className="text-xl font-serif font-bold text-navy">{modal === 'addCity' ? 'Add City' : 'Add Locality'}</h2><button onClick={() => setModal(null)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button></div>
            <div className="p-6 space-y-4">
              {modal === 'addCity' ? (
                <>
                  <div><label className="text-sm font-medium text-gray-700">City Name</label><input type="text" value={cityForm.name} onChange={e => setCityForm(f => ({ ...f, name: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm" /></div>
                  <div><label className="text-sm font-medium text-gray-700">State</label><input type="text" value={cityForm.state} onChange={e => setCityForm(f => ({ ...f, state: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm" /></div>
                </>
              ) : (
                <>
                  <div><label className="text-sm font-medium text-gray-700">Locality Name</label><input type="text" value={localityForm.name ?? ''} onChange={e => setLocalityForm(f => ({ ...f, name: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm" /></div>
                  <div><label className="text-sm font-medium text-gray-700">City</label><select value={localityForm.city_id ?? ''} onChange={e => setLocalityForm(f => ({ ...f, city_id: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm"><option value="">Select city</option>{cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                </>
              )}
            </div>
            <div className="flex justify-end gap-3 p-6 border-t"><button onClick={() => setModal(null)} className="px-5 py-2 border border-gray-300 rounded-xl text-sm">Cancel</button><button onClick={modal === 'addCity' ? handleAddCity : handleAddLocality} className="flex items-center gap-2 px-5 py-2 bg-navy text-gold rounded-xl text-sm font-semibold border border-gold/20"><Save className="w-4 h-4" />Save</button></div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
