import { useState, useEffect } from 'react';
import { AdminLayout, logAdminAction } from '../../components/AdminLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { Ambassador } from '../../types/database';
import {
  Bot, Plus, Edit3, Trash2, Eye, EyeOff, Globe, MessageSquare,
  TrendingUp, Users, Star, X, Save, ChevronDown, ChevronUp,
  RefreshCw, BarChart3, Award,
} from 'lucide-react';

const EMPTY_FORM: Partial<Ambassador> = {
  name: '',
  language: '',
  voice_id: '',
  persona: '',
  greeting: '',
  avatar_url: '',
  active: true,
  assignment_rules: {},
  sort_order: 0,
};

export function AdminAmbassadors() {
  const { user } = useAuth();
  const [ambassadors, setAmbassadors] = useState<Ambassador[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<'add' | 'edit' | 'preview' | null>(null);
  const [selected, setSelected] = useState<Ambassador | null>(null);
  const [form, setForm] = useState<Partial<Ambassador>>(EMPTY_FORM);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [stats, setStats] = useState<Record<string, { total: number; avg_intent: number; converted: number }>>({});

  async function fetchAmbassadors() {
    setLoading(true);
    const { data } = await supabase
      .from('ambassadors')
      .select('*')
      .order('sort_order');
    if (data) setAmbassadors(data as Ambassador[]);
    setLoading(false);
  }

  async function fetchStats() {
    const { data } = await supabase
      .from('ambassador_conversations')
      .select('ambassador_id, intent_score, converted');
    if (!data) return;

    const map: Record<string, { total: number; avg_intent: number; converted: number }> = {};
    for (const row of data as { ambassador_id: string; intent_score: number; converted: boolean }[]) {
      if (!map[row.ambassador_id]) map[row.ambassador_id] = { total: 0, avg_intent: 0, converted: 0 };
      map[row.ambassador_id].total += 1;
      map[row.ambassador_id].avg_intent += row.intent_score;
      if (row.converted) map[row.ambassador_id].converted += 1;
    }
    // Compute averages
    for (const id of Object.keys(map)) {
      if (map[id].total > 0) {
        map[id].avg_intent = Math.round(map[id].avg_intent / map[id].total);
      }
    }
    setStats(map);
  }

  useEffect(() => {
    fetchAmbassadors();
    fetchStats();
  }, []);

  function openAdd() {
    setForm({ ...EMPTY_FORM, sort_order: ambassadors.length + 1 });
    setSelected(null);
    setModal('add');
  }

  function openEdit(amb: Ambassador) {
    setForm({ ...amb });
    setSelected(amb);
    setModal('edit');
  }

  function openPreview(amb: Ambassador) {
    setSelected(amb);
    setModal('preview');
  }

  async function handleSave() {
    if (!form.name?.trim() || !form.language?.trim() || !form.greeting?.trim()) return;
    setSaving(true);

    if (modal === 'add') {
      const { data, error } = await supabase
        .from('ambassadors')
        .insert({
          name: form.name,
          language: form.language,
          voice_id: form.voice_id || null,
          persona: form.persona || '',
          greeting: form.greeting,
          avatar_url: form.avatar_url || null,
          active: form.active ?? true,
          assignment_rules: form.assignment_rules || {},
          sort_order: form.sort_order ?? ambassadors.length + 1,
        })
        .select('id')
        .maybeSingle();

      if (!error && data && user?.email) {
        await logAdminAction(supabase, user.email, 'create_ambassador', 'ambassadors', data.id, { name: form.name });
      }
    } else if (modal === 'edit' && selected) {
      const { error } = await supabase
        .from('ambassadors')
        .update({
          name: form.name,
          language: form.language,
          voice_id: form.voice_id || null,
          persona: form.persona || '',
          greeting: form.greeting,
          avatar_url: form.avatar_url || null,
          active: form.active ?? true,
          assignment_rules: form.assignment_rules || {},
          sort_order: form.sort_order ?? selected.sort_order,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selected.id);

      if (!error && user?.email) {
        await logAdminAction(supabase, user.email, 'update_ambassador', 'ambassadors', selected.id, { name: form.name });
      }
    }

    setSaving(false);
    setModal(null);
    fetchAmbassadors();
  }

  async function handleToggleActive(amb: Ambassador) {
    await supabase
      .from('ambassadors')
      .update({ active: !amb.active, updated_at: new Date().toISOString() })
      .eq('id', amb.id);

    if (user?.email) {
      await logAdminAction(supabase, user.email, amb.active ? 'deactivate_ambassador' : 'activate_ambassador', 'ambassadors', amb.id);
    }
    fetchAmbassadors();
  }

  async function handleDelete(amb: Ambassador) {
    if (!confirm(`Permanently delete ambassador "${amb.name}"? This cannot be undone.`)) return;
    await supabase.from('ambassadors').delete().eq('id', amb.id);
    if (user?.email) {
      await logAdminAction(supabase, user.email, 'delete_ambassador', 'ambassadors', amb.id, { name: amb.name });
    }
    fetchAmbassadors();
  }

  const totalConversations = Object.values(stats).reduce((s, v) => s + v.total, 0);
  const totalConverted = Object.values(stats).reduce((s, v) => s + v.converted, 0);
  const conversionRate = totalConversations > 0 ? ((totalConverted / totalConversations) * 100).toFixed(1) : '0';

  return (
    <AdminLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif font-bold text-navy">AI Ambassador System</h1>
            <p className="text-sm text-gray-500 mt-1">Manage the N-Girls ambassador panel — language assignments, personas, greetings, and performance</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { fetchAmbassadors(); fetchStats(); }}
              className="p-2 text-gray-500 hover:text-navy rounded-lg hover:bg-gray-100 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 bg-navy text-gold rounded-xl font-semibold text-sm hover:bg-navy/90 transition-colors border border-gold/20"
            >
              <Plus className="w-4 h-4" />Add Ambassador
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Ambassadors', value: ambassadors.length, icon: Bot, color: 'text-navy' },
            { label: 'Active', value: ambassadors.filter(a => a.active).length, icon: Users, color: 'text-green-600' },
            { label: 'Total Conversations', value: totalConversations, icon: MessageSquare, color: 'text-blue-600' },
            { label: 'Conversion Rate', value: `${conversionRate}%`, icon: TrendingUp, color: 'text-gold' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl p-4 border border-gray-200 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <div className="text-xl font-bold text-navy font-display">{value}</div>
                <div className="text-xs text-gray-500">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Ambassador cards */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 h-24 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {ambassadors.map(amb => {
              const s = stats[amb.id] ?? { total: 0, avg_intent: 0, converted: 0 };
              const isExpanded = expandedId === amb.id;
              return (
                <div key={amb.id} className={`bg-white rounded-xl border transition-all ${amb.active ? 'border-gray-200' : 'border-gray-100 opacity-70'}`}>
                  <div className="p-4 flex items-center gap-4">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${amb.active ? 'bg-navy/5 border-navy/20' : 'bg-gray-50 border-gray-200'}`}>
                        {amb.avatar_url ? (
                          <img src={amb.avatar_url} alt={amb.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <Bot className={`w-6 h-6 ${amb.active ? 'text-navy/50' : 'text-gray-300'}`} />
                        )}
                      </div>
                      {amb.assignment_rules?.fallback && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-gold rounded-full flex items-center justify-center" title="Default fallback">
                          <Star className="w-2.5 h-2.5 text-navy" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-serif font-bold text-navy text-base">{amb.name}</h3>
                        <span className="px-2 py-0.5 bg-gold/10 text-gold border border-gold/20 rounded-full text-xs font-medium">
                          {amb.language}
                        </span>
                        {!amb.active && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs">Inactive</span>
                        )}
                        {amb.assignment_rules?.fallback && (
                          <span className="px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-medium">Fallback</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 truncate max-w-lg">{amb.persona}</p>
                    </div>

                    {/* Stats */}
                    <div className="hidden md:flex items-center gap-6 text-center">
                      <div>
                        <div className="text-sm font-bold text-navy">{s.total || amb.conversation_count || 0}</div>
                        <div className="text-xs text-gray-400">Conversations</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-navy">{s.avg_intent || 0}</div>
                        <div className="text-xs text-gray-400">Avg Intent</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-navy">
                          {s.total > 0 ? `${((s.converted / s.total) * 100).toFixed(0)}%` : '—'}
                        </div>
                        <div className="text-xs text-gray-400">Conversion</div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => openPreview(amb)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Preview widget"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEdit(amb)}
                        className="p-2 text-gray-400 hover:text-navy hover:bg-gray-100 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(amb)}
                        className={`p-2 rounded-lg transition-colors ${amb.active ? 'text-gray-400 hover:text-amber-600 hover:bg-amber-50' : 'text-gray-300 hover:text-green-600 hover:bg-green-50'}`}
                        title={amb.active ? 'Deactivate' : 'Activate'}
                      >
                        {amb.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      {!amb.assignment_rules?.fallback && (
                        <button
                          onClick={() => handleDelete(amb)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : amb.id)}
                        className="p-2 text-gray-400 hover:text-navy hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-gray-100 pt-4 grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Greeting</p>
                        <p className="text-sm text-gray-700 italic leading-relaxed">"{amb.greeting}"</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Assignment Rules</p>
                        <div className="flex flex-wrap gap-2">
                          {amb.assignment_rules?.languages?.map(l => (
                            <span key={l} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-mono">{l}</span>
                          ))}
                          {amb.assignment_rules?.corridors?.map(c => (
                            <span key={c} className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs font-mono">{c}</span>
                          ))}
                          {amb.assignment_rules?.audiences?.map(a => (
                            <span key={a} className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs font-mono">{a}</span>
                          ))}
                          {amb.assignment_rules?.fallback && (
                            <span className="px-2 py-1 bg-gold/10 text-gold rounded text-xs font-mono">fallback</span>
                          )}
                        </div>
                        {amb.voice_id && (
                          <p className="text-xs text-gray-500 mt-2">ElevenLabs Voice: <span className="font-mono text-navy">{amb.voice_id}</span></p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-serif font-bold text-navy">
                {modal === 'add' ? 'Add New Ambassador' : `Edit ${selected?.name}`}
              </h2>
              <button onClick={() => setModal(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Ambassador Name *">
                  <input
                    type="text"
                    value={form.name ?? ''}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Nora"
                    className="input-field"
                  />
                </Field>
                <Field label="Language *">
                  <input
                    type="text"
                    value={form.language ?? ''}
                    onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
                    placeholder="e.g. English + Hindi"
                    className="input-field"
                  />
                </Field>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <Field label="ElevenLabs Voice ID">
                  <input
                    type="text"
                    value={form.voice_id ?? ''}
                    onChange={e => setForm(f => ({ ...f, voice_id: e.target.value }))}
                    placeholder="e.g. EXAVITQu4vr4xnSDxMaL"
                    className="input-field font-mono text-sm"
                  />
                </Field>
                <Field label="Avatar Image URL">
                  <input
                    type="url"
                    value={form.avatar_url ?? ''}
                    onChange={e => setForm(f => ({ ...f, avatar_url: e.target.value }))}
                    placeholder="https://..."
                    className="input-field"
                  />
                </Field>
              </div>

              <Field label="Persona Description">
                <textarea
                  value={form.persona ?? ''}
                  onChange={e => setForm(f => ({ ...f, persona: e.target.value }))}
                  placeholder="Describe the ambassador's personality, expertise, and communication style..."
                  rows={3}
                  className="input-field resize-none"
                />
              </Field>

              <Field label="Greeting Message *">
                <textarea
                  value={form.greeting ?? ''}
                  onChange={e => setForm(f => ({ ...f, greeting: e.target.value }))}
                  placeholder="The first message visitors see when the chat opens..."
                  rows={4}
                  className="input-field resize-none"
                />
              </Field>

              <Field label="Assignment Rules (JSON)">
                <textarea
                  value={JSON.stringify(form.assignment_rules ?? {}, null, 2)}
                  onChange={e => {
                    try { setForm(f => ({ ...f, assignment_rules: JSON.parse(e.target.value) })); } catch {}
                  }}
                  rows={4}
                  className="input-field resize-none font-mono text-xs"
                  placeholder={'{\n  "languages": ["en", "hi"],\n  "corridors": ["mumbai"],\n  "fallback": false\n}'}
                />
                <p className="text-xs text-gray-400 mt-1">Keys: languages (ISO codes), corridors (city slugs), audiences (nri/corporate), fallback (boolean)</p>
              </Field>

              <div className="flex items-center gap-3">
                <Field label="Display Order">
                  <input
                    type="number"
                    value={form.sort_order ?? 0}
                    onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) }))}
                    min={1}
                    className="input-field w-24"
                  />
                </Field>
                <div className="flex items-center gap-2 mt-6">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.active ?? true}
                      onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-navy" />
                  </label>
                  <span className="text-sm text-gray-700">Active</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setModal(null)}
                className="px-5 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name?.trim() || !form.language?.trim() || !form.greeting?.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-navy text-gold rounded-xl text-sm font-semibold hover:bg-navy/90 disabled:opacity-50 transition-colors border border-gold/20"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving…' : modal === 'add' ? 'Add Ambassador' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {modal === 'preview' && selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="text-lg font-serif font-bold text-navy">Widget Preview — {selected.name}</h2>
              <button onClick={() => setModal(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-5">
              {/* Mock widget */}
              <div className="w-80 mx-auto bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-3 px-4 py-3 bg-navy">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center">
                      {selected.avatar_url ? (
                        <img src={selected.avatar_url} alt={selected.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <Bot className="w-5 h-5 text-gold" />
                      )}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-navy" />
                  </div>
                  <div>
                    <p className="text-cream font-semibold text-sm">{selected.name}</p>
                    <p className="text-cream/50 text-xs">{selected.language} · Property Herald</p>
                  </div>
                </div>
                {/* Greeting */}
                <div className="p-4 bg-gray-50 min-h-[120px]">
                  <div className="flex gap-2">
                    <div className="w-7 h-7 rounded-full bg-navy/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-3.5 h-3.5 text-navy/50" />
                    </div>
                    <div className="bg-white rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-xs text-gray-700 leading-relaxed shadow-sm border border-gray-100 max-w-[85%]">
                      {selected.greeting.length > 200 ? `${selected.greeting.substring(0, 200)}…` : selected.greeting}
                    </div>
                  </div>
                </div>
                {/* Input preview */}
                <div className="px-3 py-3 border-t border-gray-100 bg-white">
                  <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-200">
                    <span className="flex-1 text-sm text-gray-400">Ask {selected.name}…</span>
                    <div className="w-8 h-8 rounded-lg bg-navy flex items-center justify-center">
                      <Bot className="w-3.5 h-3.5 text-gold" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <div className="flex items-start gap-2">
                  <Globe className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">Assignment Rules</p>
                    <p className="text-xs text-blue-600 mt-1">
                      Languages: {selected.assignment_rules?.languages?.join(', ') || 'none'}<br />
                      Corridors: {selected.assignment_rules?.corridors?.join(', ') || 'all'}<br />
                      {selected.assignment_rules?.fallback && 'Default fallback: YES'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-5 pb-5">
              <button
                onClick={() => { setModal(null); openEdit(selected); }}
                className="w-full py-2.5 bg-navy text-gold rounded-xl font-semibold text-sm hover:bg-navy/90 transition-colors border border-gold/20 flex items-center justify-center gap-2"
              >
                <Edit3 className="w-4 h-4" />Edit This Ambassador
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Performance Panel */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-5">
          <BarChart3 className="w-5 h-5 text-navy" />
          <h2 className="text-lg font-serif font-bold text-navy">Ambassador Leaderboard</h2>
        </div>
        {ambassadors.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">No ambassador data yet</p>
        ) : (
          <div className="space-y-3">
            {[...ambassadors]
              .sort((a, b) => (stats[b.id]?.total ?? 0) - (stats[a.id]?.total ?? 0))
              .map((amb, idx) => {
                const s = stats[amb.id] ?? { total: 0, avg_intent: 0, converted: 0 };
                return (
                  <div key={amb.id} className="flex items-center gap-4">
                    <span className="w-6 text-sm font-bold text-gray-400 text-center">#{idx + 1}</span>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-navy/5 border border-navy/15 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-navy/40" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-navy truncate">{amb.name}</p>
                        <p className="text-xs text-gray-400 truncate">{amb.language}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-center flex-shrink-0">
                      <div>
                        <div className="text-sm font-bold text-navy">{s.total}</div>
                        <div className="text-xs text-gray-400">Chats</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-navy">{s.avg_intent}</div>
                        <div className="text-xs text-gray-400">Intent</div>
                      </div>
                      <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${amb.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${amb.active ? 'bg-green-500' : 'bg-gray-400'}`} />
                        {amb.active ? 'Live' : 'Off'}
                      </div>
                      {idx === 0 && s.total > 0 && (
                        <Award className="w-4 h-4 text-gold" title="Top performer" />
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}
