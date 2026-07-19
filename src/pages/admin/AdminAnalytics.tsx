import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { AdminLayout } from '../../components/AdminLayout';
import type { AnalyticsDay } from '../../types/database';
import { TrendingUp, Users, Building2, Coins, ChevronDown } from 'lucide-react';

type Range = 7 | 30 | 90;

function BarChart({ data, valueKey, color }: { data: AnalyticsDay[]; valueKey: keyof AnalyticsDay; color: string }) {
  const values = data.map(d => Number(d[valueKey]));
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-0.5 h-24 w-full">
      {data.map((d, i) => {
        const h = Math.round((Number(d[valueKey]) / max) * 100);
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
            <div
              className={`w-full rounded-sm transition-all ${color} group-hover:opacity-80`}
              style={{ height: `${Math.max(h, 2)}%` }}
            />
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-navy text-cream text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
              {new Date(d.day).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}: {Number(d[valueKey]).toLocaleString()}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AdminAnalytics() {
  const [range, setRange] = useState<Range>(30);
  const [data, setData] = useState<AnalyticsDay[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: rows } = await supabase.rpc('get_analytics_data', { days_back: range });
    setData((rows ?? []) as AnalyticsDay[]);
    setLoading(false);
  }, [range]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totals = data.reduce(
    (acc, d) => ({ users: acc.users + Number(d.new_users), listings: acc.listings + Number(d.new_listings), revenue: acc.revenue + Number(d.revenue) }),
    { users: 0, listings: 0, revenue: 0 }
  );

  function exportCSV(table: 'users' | 'listings' | 'transactions') {
    const a = document.createElement('a');
    if (table === 'users' || table === 'listings') {
      const rows = ['Date,New Users,New Listings,Revenue (INR)', ...data.map(d => `${d.day},${d.new_users},${d.new_listings},${d.revenue}`)].join('\n');
      a.href = URL.createObjectURL(new Blob([rows], { type: 'text/csv' }));
    } else {
      supabase.from('token_transactions').select('*').order('created_at', { ascending: false }).limit(1000).then(({ data: txs }) => {
        const rows = ['Date,Type,Amount,Reason,User', ...(txs ?? []).map(t => `${t.created_at},${t.type},${t.amount},"${t.reason}",${t.user_id}`)].join('\n');
        a.href = URL.createObjectURL(new Blob([rows], { type: 'text/csv' }));
        a.download = `transactions_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        return;
      });
      return;
    }
    a.download = `analytics_${table}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex rounded-xl border border-gray-200 overflow-hidden">
            {([7, 30, 90] as Range[]).map(r => (
              <button key={r} onClick={() => setRange(r)}
                className={`px-5 py-2.5 text-sm font-medium transition-colors ${range === r ? 'bg-navy text-cream' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                {r}d
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {(['users', 'listings', 'transactions'] as const).map(t => (
              <button key={t} onClick={() => exportCSV(t)}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors capitalize">
                <ChevronDown className="w-3.5 h-3.5" />Export {t}
              </button>
            ))}
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: `New Users (${range}d)`, value: totals.users.toLocaleString(), icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
            { label: `New Listings (${range}d)`, value: totals.listings.toLocaleString(), icon: Building2, color: 'text-gold', bg: 'bg-gold/10' },
            { label: `Revenue (${range}d)`, value: `₹${totals.revenue.toLocaleString('en-IN')}`, icon: Coins, color: 'text-gold', bg: 'bg-gold/10' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-4`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <p className="text-2xl font-bold font-display text-navy">{value}</p>
              <p className="text-sm text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 h-48 animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: 'New Users', key: 'new_users' as const, color: 'bg-blue-400', icon: Users },
              { title: 'New Listings', key: 'new_listings' as const, color: 'bg-gold/60', icon: Building2 },
              { title: 'Revenue (₹)', key: 'revenue' as const, color: 'bg-yellow-400', icon: TrendingUp },
            ].map(({ title, key, color, icon: Icon }) => (
              <div key={key} className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Icon className="w-4 h-4 text-gray-400" />
                  <h3 className="font-display font-semibold text-navy text-sm">{title}</h3>
                </div>
                <BarChart data={data} valueKey={key} color={color} />
                <div className="flex justify-between mt-2 text-xs text-gray-400">
                  {data.length > 0 && (
                    <>
                      <span>{new Date(data[0].day).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                      <span>{new Date(data[data.length - 1].day).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Raw data table (last 14 days) */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="font-serif font-bold text-navy">Daily Breakdown</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Date', 'New Users', 'New Listings', 'Revenue (₹)'].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[...data].reverse().slice(0, 14).map(d => (
                  <tr key={d.day} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-navy">{new Date(d.day).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                    <td className="px-6 py-3 text-gray-700">{Number(d.new_users).toLocaleString()}</td>
                    <td className="px-6 py-3 text-gray-700">{Number(d.new_listings).toLocaleString()}</td>
                    <td className="px-6 py-3 font-display font-semibold text-navy">₹{Number(d.revenue).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
