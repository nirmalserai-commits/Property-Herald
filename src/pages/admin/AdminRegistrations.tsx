import { useState, useEffect } from 'react';
import { AdminLayout, logAdminAction } from '../../components/AdminLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { Registration } from '../../types/database';
import { RefreshCw, CheckCircle, XCircle, UserCheck } from 'lucide-react';

export function AdminRegistrations() {
  const { user } = useAuth();
  const [regs, setRegs] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchRegs() {
    setLoading(true);
    const { data } = await supabase.from('registrations').select('*').order('created_at', { ascending: false });
    if (data) setRegs(data as Registration[]);
    setLoading(false);
  }
  useEffect(() => { fetchRegs(); }, []);

  async function handleApprove(r: Registration) {
    await supabase.from('registrations').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', r.id);
    if (user?.email) await logAdminAction(supabase, user.email, 'approve_registration', 'registrations', r.id, { email: r.email });
    fetchRegs();
  }

  async function handleReject(r: Registration) {
    await supabase.from('registrations').update({ status: 'rejected' }).eq('id', r.id);
    if (user?.email) await logAdminAction(supabase, user.email, 'reject_registration', 'registrations', r.id, { email: r.email });
    fetchRegs();
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-serif font-bold text-navy">Registrations</h1><p className="text-sm text-gray-500 mt-1">Coming Soon signups</p></div>
          <button onClick={fetchRegs} className="p-2 text-gray-500 hover:text-navy rounded-lg hover:bg-gray-100"><RefreshCw className="w-4 h-4" /></button>
        </div>
        {loading ? <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="bg-white rounded-xl border h-20 animate-pulse" />)}</div> : regs.length === 0 ? <div className="text-center py-16"><UserCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-500">No registrations yet.</p></div> : (
          <div className="space-y-2">
            {regs.map(r => (
              <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
                <div className="flex-1">
                  <p className="font-medium text-navy">{r.full_name}</p>
                  <p className="text-xs text-gray-400">{r.email} • {r.phone} • {r.role} {r.city && `• ${r.city}`}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs ${r.status === 'approved' ? 'bg-green-50 text-green-700' : r.status === 'rejected' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>{r.status}</span>
                {r.status === 'pending' && (<>
                  <button onClick={() => handleApprove(r)} className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"><CheckCircle className="w-4 h-4" /></button>
                  <button onClick={() => handleReject(r)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><XCircle className="w-4 h-4" /></button>
                </>)}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
