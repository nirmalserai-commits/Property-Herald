import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { BuyerPassport } from '../types/database';
import {
  User, CheckCircle2, Clock, MapPin, Home, Shield,
  Save, Edit3, ChevronRight, Wallet, FileCheck,
} from 'lucide-react';

const LOCATIONS = ['Mumbai', 'Thane', 'Navi Mumbai', 'Pune', 'Hyderabad', 'Bengaluru', 'NCR', 'Ahmedabad', 'Chennai'];
const PROPERTY_TYPES = ['apartment', 'villa', 'plot', 'commercial', 'office', 'retail', 'warehouse', 'farm'] as const;
const TIMELINES = ['0-3 months', '3-6 months', '6-12 months', '1-2 years', '2+ years'] as const;
const APPROVAL_STATUSES = ['not_started', 'in_progress', 'approved', 'rejected'] as const;

function fmt(n: number) {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(0)} L`;
  return `₹${n.toLocaleString()}`;
}

export function BuyerPassportPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [passport, setPassport] = useState<BuyerPassport | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<BuyerPassport>>({
    budget_min: 2000000,
    budget_max: 8000000,
    timeline: '6-12 months',
    locations_json: [],
    property_type: 'apartment',
    pre_approval_status: 'not_started',
    pre_approval_bank: '',
    email_verified: false,
    phone_verified: false,
  });

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchPassport();
  }, [user]);

  async function fetchPassport() {
    setLoading(true);
    const { data } = await supabase
      .from('buyer_passports')
      .select('*')
      .eq('user_id', user!.id)
      .maybeSingle();
    if (data) {
      setPassport(data as BuyerPassport);
      setForm(data as BuyerPassport);
    } else {
      setEditing(true);
    }
    setLoading(false);
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    const payload = {
      user_id: user.id,
      budget_min: form.budget_min ?? 0,
      budget_max: form.budget_max ?? 0,
      timeline: form.timeline ?? '6-12 months',
      locations_json: form.locations_json ?? [],
      property_type: form.property_type ?? 'apartment',
      pre_approval_status: form.pre_approval_status ?? 'not_started',
      pre_approval_bank: form.pre_approval_bank ?? null,
      email_verified: form.email_verified ?? false,
      phone_verified: form.phone_verified ?? false,
    };
    if (passport) {
      await supabase.from('buyer_passports').update(payload).eq('id', passport.id);
    } else {
      await supabase.from('buyer_passports').insert(payload);
    }
    setSaving(false);
    setEditing(false);
    fetchPassport();
  }

  function toggleLocation(loc: string) {
    const locs = (form.locations_json as string[]) ?? [];
    setForm(f => ({
      ...f,
      locations_json: locs.includes(loc) ? locs.filter(l => l !== loc) : [...locs, loc],
    }));
  }

  const approvalStatusLabel: Record<string, { label: string; color: string }> = {
    not_started: { label: 'Not Started', color: 'text-gray-500' },
    in_progress: { label: 'In Progress', color: 'text-amber-600' },
    approved: { label: 'Approved', color: 'text-green-600' },
    rejected: { label: 'Rejected', color: 'text-red-600' },
  };

  const completionScore = () => {
    if (!form) return 0;
    let score = 0;
    if ((form.budget_min ?? 0) > 0) score += 20;
    if (((form.locations_json as string[]) ?? []).length > 0) score += 20;
    if (form.property_type) score += 15;
    if (form.timeline) score += 15;
    if (form.pre_approval_status && form.pre_approval_status !== 'not_started') score += 20;
    if (form.email_verified) score += 5;
    if (form.phone_verified) score += 5;
    return score;
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-cream flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-navy border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  const score = completionScore();
  const locs = (form.locations_json as string[]) ?? [];

  return (
    <Layout>
      <div className="min-h-screen bg-cream py-10 px-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-serif font-bold text-navy">Buyer Passport</h1>
              <p className="text-gray-500 text-sm mt-1">Your verified investment profile — shown to top agents.</p>
            </div>
            {!editing && (
              <button onClick={() => setEditing(true)} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                <Edit3 className="w-4 h-4" />Edit
              </button>
            )}
          </div>

          {/* Completion score */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-700">Profile Completion</span>
              <span className="text-2xl font-bold text-navy font-display">{score}%</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${score}%`, background: score >= 80 ? '#22c55e' : score >= 50 ? '#c9a84c' : '#e5e7eb' }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {score >= 80 ? 'Excellent! Agents will prioritise your enquiries.' : score >= 50 ? 'Good profile. Fill more details to get better matches.' : 'Complete your passport to unlock personalised listings.'}
            </p>
          </div>

          {/* Passport form / view */}
          <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
            {/* Budget */}
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Wallet className="w-4 h-4 text-gold" />
                <h3 className="font-semibold text-navy text-sm">Budget Range</h3>
              </div>
              {editing ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Minimum (₹)</label>
                    <input type="number" step={100000} value={form.budget_min ?? ''} onChange={e => setForm(f => ({ ...f, budget_min: Number(e.target.value) }))} className="input-field" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Maximum (₹)</label>
                    <input type="number" step={100000} value={form.budget_max ?? ''} onChange={e => setForm(f => ({ ...f, budget_max: Number(e.target.value) }))} className="input-field" />
                  </div>
                </div>
              ) : (
                <p className="text-navy font-semibold">{fmt(form.budget_min ?? 0)} – {fmt(form.budget_max ?? 0)}</p>
              )}
            </div>

            {/* Timeline */}
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-gold" />
                <h3 className="font-semibold text-navy text-sm">Purchase Timeline</h3>
              </div>
              {editing ? (
                <div className="flex flex-wrap gap-2">
                  {TIMELINES.map(t => (
                    <button key={t} onClick={() => setForm(f => ({ ...f, timeline: t }))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${form.timeline === t ? 'bg-navy text-gold border-navy' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-navy'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-navy font-semibold">{form.timeline}</p>
              )}
            </div>

            {/* Preferred locations */}
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-gold" />
                <h3 className="font-semibold text-navy text-sm">Preferred Locations</h3>
              </div>
              {editing ? (
                <div className="flex flex-wrap gap-2">
                  {LOCATIONS.map(loc => (
                    <button key={loc} onClick={() => toggleLocation(loc)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${locs.includes(loc) ? 'bg-navy text-gold border-navy' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-navy'}`}>
                      {loc}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {locs.length > 0 ? locs.map(l => (
                    <span key={l} className="px-3 py-1 bg-navy/10 text-navy rounded-xl text-xs font-medium">{l}</span>
                  )) : <p className="text-gray-400 text-sm italic">Not specified</p>}
                </div>
              )}
            </div>

            {/* Property type */}
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Home className="w-4 h-4 text-gold" />
                <h3 className="font-semibold text-navy text-sm">Property Type</h3>
              </div>
              {editing ? (
                <div className="flex flex-wrap gap-2">
                  {PROPERTY_TYPES.map(pt => (
                    <button key={pt} onClick={() => setForm(f => ({ ...f, property_type: pt }))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors capitalize ${form.property_type === pt ? 'bg-navy text-gold border-navy' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-navy'}`}>
                      {pt}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-navy font-semibold capitalize">{form.property_type}</p>
              )}
            </div>

            {/* Pre-approval */}
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <FileCheck className="w-4 h-4 text-gold" />
                <h3 className="font-semibold text-navy text-sm">Home Loan Pre-Approval</h3>
              </div>
              {editing ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {APPROVAL_STATUSES.map(s => (
                      <button key={s} onClick={() => setForm(f => ({ ...f, pre_approval_status: s }))}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors capitalize ${form.pre_approval_status === s ? 'bg-navy text-gold border-navy' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-navy'}`}>
                        {s.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                  <input type="text" value={form.pre_approval_bank ?? ''} onChange={e => setForm(f => ({ ...f, pre_approval_bank: e.target.value }))} placeholder="Bank name (optional)" className="input-field" />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className={`font-semibold text-sm capitalize ${approvalStatusLabel[form.pre_approval_status ?? 'not_started']?.color}`}>
                    {approvalStatusLabel[form.pre_approval_status ?? 'not_started']?.label}
                  </span>
                  {form.pre_approval_bank && <span className="text-gray-400 text-xs">via {form.pre_approval_bank}</span>}
                </div>
              )}
            </div>

            {/* Verification */}
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-gold" />
                <h3 className="font-semibold text-navy text-sm">Verification Status</h3>
              </div>
              {editing ? (
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={form.email_verified ?? false} onChange={e => setForm(f => ({ ...f, email_verified: e.target.checked }))} className="w-4 h-4 rounded accent-navy" />
                    <span className="text-sm text-gray-700">Email verified</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={form.phone_verified ?? false} onChange={e => setForm(f => ({ ...f, phone_verified: e.target.checked }))} className="w-4 h-4 rounded accent-navy" />
                    <span className="text-sm text-gray-700">Phone verified</span>
                  </label>
                </div>
              ) : (
                <div className="flex gap-4">
                  <span className={`flex items-center gap-1.5 text-sm ${form.email_verified ? 'text-green-600' : 'text-gray-400'}`}>
                    <CheckCircle2 className="w-4 h-4" />Email
                  </span>
                  <span className={`flex items-center gap-1.5 text-sm ${form.phone_verified ? 'text-green-600' : 'text-gray-400'}`}>
                    <CheckCircle2 className="w-4 h-4" />Phone
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Save / CTA */}
          {editing ? (
            <div className="flex items-center gap-3">
              {passport && (
                <button onClick={() => setEditing(false)} className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
              )}
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-navy text-gold rounded-xl text-sm font-bold hover:bg-navy/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                <Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save Passport'}
              </button>
            </div>
          ) : (
            <a href="/directory" className="flex items-center justify-center gap-2 py-3.5 bg-navy text-gold rounded-xl font-bold hover:bg-navy/90 transition-colors">
              Browse Matched Listings <ChevronRight className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    </Layout>
  );
}
