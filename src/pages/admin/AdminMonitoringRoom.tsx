import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AdminLayout, logAdminAction } from '../../components/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { boardroomChat, type ChatMessage } from '../../lib/boardroomChat';
import { loadChatHistory, saveMessage, type StoredMessage } from '../../lib/chatMemory';
import {
  Activity, ShieldAlert, TrendingUp, Wrench, Send, X, Volume2, VolumeX, Maximize2, Minimize2,
  RefreshCw, Clock, BellOff, Terminal, MessageCircle, Eye,
} from 'lucide-react';

type State = 'green' | 'amber' | 'red' | 'grey';
type Board = 'systems' | 'security' | 'business';
type Source = 'db' | 'fingerprint' | 'edge' | 'manual';

interface Box {
  box_key: string; board: Board; grp: string; title: string; description: string; source: Source;
  unit: string; direction: 'high_bad' | 'low_bad'; amber: number | null; red: number | null;
  stale_minutes: number; age_based: boolean; sort: number; enabled: boolean;
}
interface Status {
  box_key: string; state: State; value: number | null; detail: string | null; checked_at: string | null;
  changed_at: string; last_done_at: string | null; ack_until: string | null; ack_note: string | null;
}
interface MonEvent { id: number; box_key: string; old_state: string | null; new_state: string; value: number | null; detail: string | null; at: string; }
interface Msg { role: 'user' | 'ai'; content: string; }
interface Eff { state: State; stale: boolean; acked: boolean; }

const BOARDS: { id: Board; label: string; icon: typeof Activity; blurb: string }[] = [
  { id: 'systems', label: 'Systems', icon: Activity, blurb: 'Is the machine running?' },
  { id: 'security', label: 'Security', icon: ShieldAlert, blurb: 'Is anyone attacking or changing things?' },
  { id: 'business', label: 'Business', icon: TrendingUp, blurb: 'How is the soft launch doing?' },
];

const SOURCE_LABEL: Record<Source, string> = {
  db: 'Automatic, from the database', fingerprint: 'Automatic change detector',
  edge: 'Automatic, from the outside checker', manual: 'You type it in',
};

const TILE: Record<State, string> = {
  green: 'bg-emerald-500/15 border-emerald-400/50 hover:bg-emerald-500/25',
  amber: 'bg-amber-500/25 border-amber-400 hover:bg-amber-500/35',
  red: 'bg-red-600/35 border-red-500 hover:bg-red-600/45',
  grey: 'bg-slate-700/30 border-slate-600/60 hover:bg-slate-700/50',
};
const DOT: Record<State, string> = {
  green: 'bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.6)]',
  amber: 'bg-amber-400 shadow-[0_0_8px_2px_rgba(251,191,36,0.6)]',
  red: 'bg-red-500 shadow-[0_0_10px_3px_rgba(239,68,68,0.8)] animate-pulse',
  grey: 'bg-slate-500',
};
const PILL: Record<State, string> = {
  green: 'bg-emerald-100 text-emerald-800', amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-800', grey: 'bg-slate-200 text-slate-700',
};

function ago(iso: string | null, now: number): string {
  if (!iso) return 'never';
  const m = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function fmtValue(b: Box, v: number | null): string {
  if (v === null || v === undefined) return '—';
  if (b.unit === 'bool') return v === 1 ? 'OK' : 'DOWN';
  if (b.unit === 'fp') return v === 1 ? 'CHANGED' : 'same';
  const n = Math.abs(v) >= 100 ? Math.round(v).toLocaleString('en-IN') : String(Math.round(v * 10) / 10);
  return b.unit ? `${n} ${b.unit}` : n;
}

function ruleText(b: Box): string {
  if (b.unit === 'bool') return 'Red when it is down.';
  if (b.unit === 'fp') return 'Red when it changes. Press Accept change after a change you made.';
  const cmp = b.direction === 'high_bad' ? '≥' : '≤';
  const parts: string[] = [];
  if (b.amber !== null) parts.push(`amber ${cmp} ${b.amber}`);
  if (b.red !== null) parts.push(`red ${cmp} ${b.red}`);
  if (!parts.length) return 'No alert rule, shown for information.';
  return `${parts.join(', ')}${b.unit ? ' ' + b.unit : ''}.`;
}

function effective(b: Box, s: Status | undefined, now: number): Eff {
  if (!s || !s.checked_at) return { state: 'grey', stale: false, acked: false };
  const limit = b.age_based ? 20 : b.stale_minutes;
  const stale = now - new Date(s.checked_at).getTime() > limit * 60000;
  if (stale) return { state: 'grey', stale: true, acked: false };
  const acked = (s.state === 'red' || s.state === 'amber') && !!s.ack_until && new Date(s.ack_until).getTime() > now;
  return { state: s.state, stale: false, acked };
}

function beep() {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine'; osc.frequency.value = 880; gain.gain.value = 0.08;
    osc.start(); osc.stop(ctx.currentTime + 0.35);
    setTimeout(() => void ctx.close(), 600);
  } catch { /* sound is optional */ }
}

export function AdminMonitoringRoom() {
  const { user } = useAuth();
  const adminEmail = user?.email ?? '';
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [board, setBoard] = useState<Board>('systems');
  const [selected, setSelected] = useState<string | null>(null);
  const [events, setEvents] = useState<MonEvent[]>([]);
  const [now, setNow] = useState(Date.now());
  const [lastFetch, setLastFetch] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [runNote, setRunNote] = useState('');
  const [sound, setSound] = useState(() => localStorage.getItem('ph_monitor_sound') === '1');
  const [isFull, setIsFull] = useState(false);
  const [paused, setPaused] = useState(false);
  const [showHidden, setShowHidden] = useState(false);

  const [chatOpen, setChatOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [typing, setTyping] = useState(false);
  const chatLoaded = useRef(false);
  const msgsRef = useRef<Msg[]>([]);
  msgsRef.current = msgs;
  const bottomRef = useRef<HTMLDivElement>(null);

  const wallRef = useRef<HTMLDivElement>(null);
  const prevReds = useRef<Set<string> | null>(null);
  const lastActivity = useRef(Date.now());
  const isFullRef = useRef(false);
  const soundRef = useRef(sound);
  soundRef.current = sound;
  isFullRef.current = isFull;

  const loadBoxes = useCallback(async () => {
    const { data, error } = await supabase.from('monitor_boxes').select('*').order('sort');
    if (error) { setLoadError(error.message); return; }
    setLoadError('');
    setBoxes((data ?? []) as Box[]);
  }, []);

  const loadStatuses = useCallback(async () => {
    const { data, error } = await supabase.from('monitor_status').select('*');
    if (error) { setLoadError(error.message); return; }
    const map: Record<string, Status> = {};
    for (const s of (data ?? []) as Status[]) map[s.box_key] = s;
    setStatuses(map);
    setLastFetch(Date.now());
    setNow(Date.now());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => { await loadBoxes(); await loadStatuses(); if (!cancelled) setLoaded(true); })();
    return () => { cancelled = true; };
  }, [loadBoxes, loadStatuses]);

  // Poll every 90 seconds while the tab is visible. Pauses after 20 idle minutes (not in wall mode).
  useEffect(() => {
    const bump = () => { lastActivity.current = Date.now(); };
    window.addEventListener('mousemove', bump); window.addEventListener('keydown', bump); window.addEventListener('click', bump);
    const id = window.setInterval(() => {
      setNow(Date.now());
      if (document.visibilityState !== 'visible') return;
      if (!isFullRef.current && Date.now() - lastActivity.current > 20 * 60000) { setPaused(true); return; }
      void loadStatuses();
    }, 90000);
    const onVis = () => { if (document.visibilityState === 'visible') { lastActivity.current = Date.now(); setPaused(false); void loadStatuses(); } };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('mousemove', bump); window.removeEventListener('keydown', bump); window.removeEventListener('click', bump);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [loadStatuses]);

  useEffect(() => {
    const onFs = () => setIsFull(document.fullscreenElement === wallRef.current && !!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const eff = useMemo(() => {
    const m: Record<string, Eff> = {};
    for (const b of boxes) m[b.box_key] = effective(b, statuses[b.box_key], now);
    return m;
  }, [boxes, statuses, now]);

  const activeBoxes = useMemo(() => boxes.filter(b => b.enabled), [boxes]);
  const hiddenBoxes = useMemo(() => boxes.filter(b => !b.enabled), [boxes]);

  const counts = useMemo(() => {
    const c: Record<Board | 'all', { red: number; amber: number; green: number; grey: number }> = {
      all: { red: 0, amber: 0, green: 0, grey: 0 }, systems: { red: 0, amber: 0, green: 0, grey: 0 },
      security: { red: 0, amber: 0, green: 0, grey: 0 }, business: { red: 0, amber: 0, green: 0, grey: 0 },
    };
    for (const b of activeBoxes) {
      const e = eff[b.box_key]; if (!e) continue;
      const st: State = e.acked ? 'grey' : e.state;
      c[b.board][st]++; c.all[st]++;
    }
    return c;
  }, [activeBoxes, eff]);

  // Tab title shows the red count; beep when a new red appears.
  useEffect(() => {
    const base = 'Monitoring Room';
    document.title = counts.all.red > 0 ? `(${counts.all.red}) ${base}` : base;
    return () => { document.title = 'Property Herald'; };
  }, [counts.all.red]);

  useEffect(() => {
    if (!loaded) return;
    const reds = new Set(activeBoxes.filter(b => eff[b.box_key]?.state === 'red' && !eff[b.box_key]?.acked).map(b => b.box_key));
    if (prevReds.current && soundRef.current) {
      for (const k of reds) if (!prevReds.current.has(k)) { beep(); break; }
    }
    prevReds.current = reds;
  }, [loaded, activeBoxes, eff]);

  const heartbeat = statuses['sys.checker_heartbeat'];
  const silentMin = heartbeat?.checked_at ? Math.round((now - new Date(heartbeat.checked_at).getTime()) / 60000) : null;
  const checkerSilent = loaded && boxes.length > 0 && (silentMin === null || silentMin > 20);

  // ---------- actions ----------
  const sel = selected ? boxes.find(b => b.box_key === selected) ?? null : null;
  const selStatus = selected ? statuses[selected] : undefined;

  const openBox = useCallback(async (key: string) => {
    setSelected(key); setEvents([]);
    const { data } = await supabase.from('monitor_events').select('*').eq('box_key', key).order('at', { ascending: false }).limit(15);
    setEvents((data ?? []) as MonEvent[]);
  }, []);

  async function runNow() {
    setBusy(true); setRunNote('');
    const { error } = await supabase.rpc('monitor_run_checks');
    const note: string[] = [];
    if (error) note.push(`Database checks: ${error.message}`);
    const ext = await supabase.functions.invoke('monitor-external');
    if (ext.error) note.push('Outside checks are not reachable yet (deploy monitor-external).');
    await loadStatuses();
    setRunNote(note.length ? note.join(' ') : 'Checks run.');
    setBusy(false);
  }

  async function ack(key: string, minutes: number) {
    const { error } = await supabase.rpc('monitor_ack', { p_key: key, p_minutes: minutes, p_note: null });
    if (!error) { await logAdminAction(supabase, adminEmail, minutes > 0 ? 'monitor_ack' : 'monitor_unack', 'monitor_boxes', key, { minutes }); await loadStatuses(); }
  }
  async function markDone(key: string) {
    const { error } = await supabase.rpc('monitor_mark_done', { p_key: key });
    if (!error) await loadStatuses();
  }
  async function acceptFp(key: string) {
    const { error } = await supabase.rpc('monitor_accept_fingerprint', { p_key: key });
    if (!error) { await logAdminAction(supabase, adminEmail, 'monitor_accept_change', 'monitor_boxes', key); await loadStatuses(); }
  }
  async function saveManual(key: string, value: number, detail: string) {
    const { error } = await supabase.rpc('monitor_apply', { p_key: key, p_value: value, p_detail: detail || null });
    if (!error) await loadStatuses();
    return error?.message ?? '';
  }
  async function saveRule(b: Box, amber: number | null, red: number | null) {
    const { error } = await supabase.from('monitor_boxes').update({ amber, red }).eq('box_key', b.box_key);
    if (error) return error.message;
    await logAdminAction(supabase, adminEmail, 'monitor_rule_change', 'monitor_boxes', b.box_key, { amber, red });
    await loadBoxes();
    await supabase.rpc('monitor_run_checks');
    const cur = statuses[b.box_key];
    if (b.source === 'manual' && !b.age_based && cur && cur.value !== null) await supabase.rpc('monitor_apply', { p_key: b.box_key, p_value: cur.value, p_detail: cur.detail });
    await loadStatuses();
    return '';
  }
  async function setEnabled(b: Box, enabled: boolean) {
    const { error } = await supabase.from('monitor_boxes').update({ enabled }).eq('box_key', b.box_key);
    if (!error) { await logAdminAction(supabase, adminEmail, enabled ? 'monitor_show_box' : 'monitor_hide_box', 'monitor_boxes', b.box_key); await loadBoxes(); if (!enabled) setSelected(null); }
  }

  function toggleSound() {
    const next = !sound; setSound(next); localStorage.setItem('ph_monitor_sound', next ? '1' : '0'); if (next) beep();
  }
  async function toggleWall() {
    if (document.fullscreenElement) { await document.exitFullscreen(); return; }
    await wallRef.current?.requestFullscreen?.();
  }

  // ---------- Noori ----------
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, typing, chatOpen]);

  const ensureChat = useCallback(async () => {
    if (chatLoaded.current) return;
    chatLoaded.current = true;
    const rows: StoredMessage[] = await loadChatHistory('noori');
    setMsgs(rows.slice(-12).map(r => ({ role: r.role === 'assistant' ? 'ai' : 'user', content: r.content })));
  }, []);

  const sendToNoori = useCallback(async (text: string) => {
    if (typing) return;
    setChatOpen(true);
    await ensureChat();
    const next: Msg[] = [...msgsRef.current, { role: 'user', content: text }];
    setMsgs(next); setTyping(true);
    void saveMessage('noori', 'user', text);
    try {
      const payload: ChatMessage[] = next.slice(-12).map(m => ({ role: m.role, content: m.content }));
      const reply = await boardroomChat(payload, 'noori');
      setMsgs(m => [...m, { role: 'ai', content: reply }]);
      void saveMessage('noori', 'assistant', reply);
    } catch {
      setMsgs(m => [...m, { role: 'ai', content: 'Channel unavailable. Please try again in a moment.' }]);
    } finally { setTyping(false); }
  }, [typing, ensureChat]);

  function boxLine(b: Box): string {
    const s = statuses[b.box_key]; const e = eff[b.box_key];
    return `${b.title} [${b.board}] ${e?.state ?? 'grey'}${e?.stale ? ' (stale)' : ''} value ${fmtValue(b, s?.value ?? null)}; rule: ${ruleText(b)}${s?.detail ? ' Detail: ' + s.detail : ''}`;
  }
  function briefMe() {
    const hot = activeBoxes.filter(b => { const e = eff[b.box_key]; return e && !e.acked && (e.state === 'red' || e.state === 'amber'); })
      .sort((a, b) => (eff[a.box_key].state === 'red' ? 0 : 1) - (eff[b.box_key].state === 'red' ? 0 : 1)).slice(0, 14);
    const stale = activeBoxes.filter(b => eff[b.box_key]?.stale).length;
    const body = hot.length ? hot.map(b => '- ' + boxLine(b)).join('\n') : 'Nothing is red or amber.';
    void sendToNoori(`[Monitoring Room shift brief] Board now: ${counts.all.red} red, ${counts.all.amber} amber, ${counts.all.green} green, ${counts.all.grey} grey (${stale} stale).\n${body}\nBrief me in plain words: what needs attention first, the likely cause, and the safest fix. Do not claim to have changed anything. Any change goes to me for approval.`);
  }
  function askAbout(b: Box) {
    const recent = events.slice(0, 4).map(e => `${e.old_state ?? '-'}→${e.new_state} ${new Date(e.at).toLocaleString('en-IN')}`).join('; ');
    setSelected(null);
    void sendToNoori(`[Monitoring Room] ${boxLine(b)}${recent ? '. Recent: ' + recent : ''}. What does this mean, what is the likely cause, and what is the safest fix? Do not change anything yourself; propose it for my approval.`);
  }

  // ---------- render ----------
  const boardBoxes = activeBoxes.filter(b => b.board === board);
  const groups: { name: string; items: Box[] }[] = [];
  for (const b of boardBoxes) {
    let g = groups.find(x => x.name === b.grp);
    if (!g) { g = { name: b.grp, items: [] }; groups.push(g); }
    g.items.push(b);
  }
  const redAll = counts.all.red;

  return (
    <AdminLayout>
      <div ref={wallRef} className={`bg-slate-950 rounded-2xl border border-slate-800 relative ${isFull ? 'h-screen overflow-auto rounded-none' : ''}`}>
        <div className="flex">
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="bg-gradient-to-r from-cyan-900 to-slate-900 rounded-t-2xl px-6 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center">
                    <Wrench className="w-6 h-6 text-cyan-200" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-white font-bold text-lg">Monitoring Room</h2>
                      <span className="px-2 py-0.5 bg-cyan-900/60 text-cyan-200 text-xs font-bold tracking-widest rounded-full border border-cyan-400/30">NOORI ON SHIFT</span>
                    </div>
                    <p className="text-cyan-200/80 text-xs flex items-center gap-1"><Terminal className="w-3 h-3" />Site Engineering watches the board · every fix waits for Chief&apos;s approval</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${redAll > 0 ? 'bg-red-600 text-white animate-pulse' : 'bg-emerald-600 text-white'}`}>
                    {redAll > 0 ? `${redAll} RED` : 'ALL CLEAR'}
                  </span>
                  <span className="px-2.5 py-1.5 rounded-full text-xs bg-amber-500/20 text-amber-200 border border-amber-400/30">{counts.all.amber} amber</span>
                  <span className="px-2.5 py-1.5 rounded-full text-xs bg-emerald-500/15 text-emerald-200 border border-emerald-400/30">{counts.all.green} green</span>
                  <span className="px-2.5 py-1.5 rounded-full text-xs bg-slate-600/30 text-slate-300 border border-slate-500/40">{counts.all.grey} grey</span>
                  <button onClick={briefMe} disabled={typing || !boxes.length} className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5" />Noori, brief me
                  </button>
                  <button onClick={runNow} disabled={busy} className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50">
                    <RefreshCw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} />Run checks now
                  </button>
                  <button onClick={toggleSound} title="Beep when a new red appears" className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white">
                    {sound ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </button>
                  <button onClick={() => setChatOpen(o => { if (!o) void ensureChat(); return !o; })} title="Talk to Noori" className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white">
                    <Wrench className="w-4 h-4" />
                  </button>
                  <button onClick={toggleWall} title="Wall mode (full screen)" className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white">
                    {isFull ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-cyan-200/60 mt-2 flex items-center gap-1">
                <Clock className="w-3 h-3" />Refreshed {lastFetch ? ago(new Date(lastFetch).toISOString(), now) : 'never'} · auto-refresh every 90 seconds while you are here{runNote ? ` · ${runNote}` : ''}
              </p>
            </div>

            {checkerSilent && (
              <div className="bg-red-700 text-white text-sm px-6 py-2.5 font-medium">
                The database checker has been silent {silentMin === null ? 'since install' : `for ${silentMin} minutes`}. Colours below may be out of date. Press Run checks now, or ask Noori to look at the schedule.
              </div>
            )}
            {paused && (
              <button onClick={() => { lastActivity.current = Date.now(); setPaused(false); void loadStatuses(); }} className="w-full bg-slate-700 text-slate-100 text-sm px-6 py-2 text-left">
                Auto-refresh paused after 20 idle minutes to save data. Click to resume.
              </button>
            )}
            {loadError && <div className="bg-amber-600 text-white text-sm px-6 py-2.5">Could not read the monitoring tables: {loadError}</div>}

            {/* Tabs */}
            <div className="flex gap-2 px-6 pt-4">
              {BOARDS.map(({ id, label, icon: Icon }) => {
                const c = counts[id];
                return (
                  <button key={id} onClick={() => setBoard(id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${board === id ? 'bg-cyan-600 text-white border-cyan-400' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}`}>
                    <Icon className="w-4 h-4" />{label}
                    {c.red > 0 && <span className="px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[10px]">{c.red}</span>}
                    {c.amber > 0 && <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-900 text-[10px]">{c.amber}</span>}
                  </button>
                );
              })}
            </div>
            <p className="px-6 pt-2 text-xs text-slate-400">{BOARDS.find(b => b.id === board)?.blurb} Click any box for its rule, history and actions.</p>

            {/* Wall */}
            <div className="px-6 pb-6 pt-3 space-y-5">
              {!loaded && <p className="text-slate-400 text-sm">Loading the board…</p>}
              {loaded && boxes.length === 0 && !loadError && (
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 text-slate-200 text-sm">
                  The board is empty because the monitoring tables are not installed yet. Run the monitoring_room.sql file once in Supabase, SQL Editor.
                </div>
              )}
              {loaded && boxes.length > 0 && boardBoxes.length === 0 && <p className="text-slate-400 text-sm">No boxes on this board.</p>}
              {groups.map(g => (
                <div key={g.name}>
                  <h3 className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-2">{g.name}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
                    {g.items.map(b => {
                      const e = eff[b.box_key]; const s = statuses[b.box_key];
                      const shown: State = e.acked ? 'grey' : e.state;
                      return (
                        <button key={b.box_key} onClick={() => void openBox(b.box_key)}
                          className={`text-left rounded-lg border p-2.5 transition-all min-h-[78px] ${TILE[shown]} ${e.acked ? 'opacity-70' : ''}`}>
                          <div className="flex items-start justify-between gap-1.5">
                            <span className="text-[11px] leading-tight font-semibold text-slate-100 line-clamp-2">{b.title}</span>
                            <span className={`mt-0.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${DOT[shown]}`} />
                          </div>
                          <div className={`mt-1.5 text-sm font-bold ${shown === 'red' ? 'text-red-200' : shown === 'amber' ? 'text-amber-200' : shown === 'green' ? 'text-emerald-200' : 'text-slate-400'}`}>
                            {e.stale ? 'stale' : e.acked ? 'acknowledged' : s && s.checked_at ? fmtValue(b, s.value) : 'no data'}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {b.age_based && s?.last_done_at ? `done ${ago(s.last_done_at, now)}` : s?.checked_at ? ago(s.checked_at, now) : b.source === 'manual' ? 'type a value' : 'waiting'}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {hiddenBoxes.length > 0 && (
                <div className="pt-2">
                  <button onClick={() => setShowHidden(h => !h)} className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" />{showHidden ? 'Hide' : 'Show'} {hiddenBoxes.length} hidden boxes
                  </button>
                  {showHidden && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {hiddenBoxes.map(b => (
                        <button key={b.box_key} onClick={() => void setEnabled(b, true)} className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-[11px] text-slate-300 hover:bg-slate-700">
                          + {b.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Noori panel */}
          {chatOpen && (
            <div className="w-[380px] flex-shrink-0 border-l border-slate-800 bg-slate-900 flex flex-col sticky top-0 self-start max-h-screen h-[calc(100vh-130px)]">
              <div className="px-4 py-3 bg-cyan-900 flex items-center justify-between rounded-tr-2xl">
                <div className="flex items-center gap-2 text-white">
                  <Wrench className="w-4 h-4 text-cyan-200" /><span className="font-bold text-sm">Noori</span>
                  <span className="text-[10px] text-cyan-200/80">Site Engineering</span>
                </div>
                <button onClick={() => setChatOpen(false)} className="text-cyan-100 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 text-sm">
                {msgs.length === 0 && !typing && <p className="text-slate-400 text-xs">Press Noori, brief me, or click a box and choose Ask Noori.</p>}
                {msgs.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[88%] px-3 py-2 rounded-2xl whitespace-pre-wrap leading-relaxed text-[13px] ${m.role === 'ai' ? 'bg-slate-800 text-slate-100 border border-slate-700 rounded-tl-sm' : 'bg-cyan-700 text-white rounded-tr-sm'}`}>
                      {m.role === 'user' && m.content.startsWith('[Monitoring Room') ? m.content.split('\n')[0].slice(0, 160) + (m.content.length > 160 ? '…' : '') : m.content}
                    </div>
                  </div>
                ))}
                {typing && <p className="text-xs text-cyan-300">Noori is checking…</p>}
                <div ref={bottomRef} />
              </div>
              <div className="p-3 border-t border-slate-800 flex gap-2">
                <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && chatInput.trim() && !typing) { void sendToNoori(chatInput.trim()); setChatInput(''); } }}
                  placeholder="Message Noori…" disabled={typing}
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-500" />
                <button onClick={() => { if (chatInput.trim() && !typing) { void sendToNoori(chatInput.trim()); setChatInput(''); } }} disabled={!chatInput.trim() || typing}
                  className="w-9 h-9 rounded-xl bg-cyan-700 hover:bg-cyan-600 disabled:bg-slate-700 text-white flex items-center justify-center"><Send className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </div>

        {/* Box drawer */}
        {sel && (
          <BoxDrawer
            box={sel} status={selStatus} eff={eff[sel.box_key]} events={events} now={now}
            onClose={() => setSelected(null)} onAsk={() => askAbout(sel)}
            onAck={(m) => void ack(sel.box_key, m)} onDone={() => void markDone(sel.box_key)}
            onAccept={() => void acceptFp(sel.box_key)} onManual={saveManual} onRule={saveRule}
            onHide={() => void setEnabled(sel, false)}
          />
        )}
      </div>
    </AdminLayout>
  );
}

interface DrawerProps {
  box: Box; status: Status | undefined; eff: Eff | undefined; events: MonEvent[]; now: number;
  onClose: () => void; onAsk: () => void; onAck: (minutes: number) => void; onDone: () => void; onAccept: () => void;
  onManual: (key: string, value: number, detail: string) => Promise<string>;
  onRule: (b: Box, amber: number | null, red: number | null) => Promise<string>;
  onHide: () => void;
}

function BoxDrawer({ box, status, eff, events, now, onClose, onAsk, onAck, onDone, onAccept, onManual, onRule, onHide }: DrawerProps) {
  const state: State = eff?.state ?? 'grey';
  const [val, setVal] = useState('');
  const [det, setDet] = useState('');
  const [amber, setAmber] = useState(box.amber === null ? '' : String(box.amber));
  const [red, setRed] = useState(box.red === null ? '' : String(box.red));
  const [note, setNote] = useState('');
  useEffect(() => {
    setAmber(box.amber === null ? '' : String(box.amber));
    setRed(box.red === null ? '' : String(box.red));
    setVal(''); setDet(''); setNote('');
  }, [box.box_key, box.amber, box.red]);

  const typed = box.source === 'manual' || box.source === 'edge';
  const acked = !!eff?.acked;
  const alerting = state === 'red' || state === 'amber';
  const isFp = box.source === 'fingerprint' || box.unit === 'fp';
  const num = (t: string): number | null => (t.trim() === '' || Number.isNaN(Number(t)) ? null : Number(t));

  return (
    <div className="absolute top-0 right-0 bottom-0 w-full sm:w-[420px] bg-white shadow-2xl z-20 overflow-y-auto rounded-r-2xl">
      <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-start justify-between gap-3">
        <div>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${PILL[state]}`}>{eff?.stale ? 'stale' : state}{acked ? ' · acknowledged' : ''}</span>
          <h3 className="font-bold text-navy text-lg mt-1.5 leading-tight">{box.title}</h3>
          <p className="text-xs text-gray-400">{box.grp} · {BOARDS.find(b => b.id === box.board)?.label}</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
      </div>

      <div className="px-5 py-4 space-y-5 text-sm text-gray-700">
        <p>{box.description}</p>
        <dl className="grid grid-cols-3 gap-y-2 text-xs">
          <dt className="text-gray-400">Now</dt><dd className="col-span-2 font-semibold text-gray-900">{status?.checked_at ? fmtValue(box, status.value) : 'no data yet'}</dd>
          <dt className="text-gray-400">Rule</dt><dd className="col-span-2">{ruleText(box)}</dd>
          <dt className="text-gray-400">Feed</dt><dd className="col-span-2">{SOURCE_LABEL[box.source]}</dd>
          <dt className="text-gray-400">Checked</dt><dd className="col-span-2">{ago(status?.checked_at ?? null, now)}{eff?.stale ? ' (too old, shown grey)' : ''}</dd>
          <dt className="text-gray-400">In this state</dt><dd className="col-span-2">{status ? ago(status.changed_at, now) : '—'}</dd>
          {status?.detail && (<><dt className="text-gray-400">Detail</dt><dd className="col-span-2">{status.detail}</dd></>)}
          {acked && status?.ack_until && (<><dt className="text-gray-400">Quiet until</dt><dd className="col-span-2">{new Date(status.ack_until).toLocaleString('en-IN')}</dd></>)}
        </dl>

        <button onClick={onAsk} className="w-full py-2.5 rounded-xl bg-cyan-700 hover:bg-cyan-600 text-white font-semibold flex items-center justify-center gap-2">
          <Wrench className="w-4 h-4" />Ask Noori about this
        </button>

        {isFp && state === 'red' && (
          <button onClick={onAccept} className="w-full py-2.5 rounded-xl border border-emerald-600 text-emerald-700 font-semibold hover:bg-emerald-50">
            Accept change (it was me)
          </button>
        )}

        {box.age_based && (
          <button onClick={onDone} className="w-full py-2.5 rounded-xl border border-cyan-700 text-cyan-800 font-semibold hover:bg-cyan-50">
            Mark done now
          </button>
        )}

        {typed && !box.age_based && box.unit !== 'fp' && (
          <div className="border border-gray-200 rounded-xl p-3 space-y-2">
            <p className="text-xs font-semibold text-gray-500">Type the latest value{box.unit && box.unit !== 'bool' ? ` (${box.unit})` : box.unit === 'bool' ? ' (1 = OK, 0 = down)' : ''}</p>
            <div className="flex gap-2">
              <input value={val} onChange={e => setVal(e.target.value)} placeholder="Value" inputMode="decimal" className="w-24 px-2.5 py-1.5 rounded-lg border border-gray-300 text-sm" />
              <input value={det} onChange={e => setDet(e.target.value)} placeholder="Note (optional)" className="flex-1 px-2.5 py-1.5 rounded-lg border border-gray-300 text-sm" />
            </div>
            <button disabled={num(val) === null}
              onClick={async () => { const n = num(val); if (n === null) return; const err = await onManual(box.box_key, n, det); setNote(err || 'Saved.'); if (!err) { setVal(''); setDet(''); } }}
              className="px-3 py-1.5 rounded-lg bg-navy text-white text-xs font-semibold disabled:opacity-40">Save value</button>
            {note && <p className="text-xs text-gray-500">{note}</p>}
          </div>
        )}

        {alerting && (
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1"><BellOff className="w-3.5 h-3.5" />Acknowledge (quiet this alert)</p>
            <div className="flex gap-2 flex-wrap">
              {[{ l: '1 hour', m: 60 }, { l: '4 hours', m: 240 }, { l: '24 hours', m: 1440 }].map(o => (
                <button key={o.m} onClick={() => onAck(o.m)} className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs hover:bg-gray-50">{o.l}</button>
              ))}
              {acked && <button onClick={() => onAck(0)} className="px-3 py-1.5 rounded-lg border border-red-300 text-red-600 text-xs hover:bg-red-50">Clear</button>}
            </div>
          </div>
        )}

        {box.unit !== 'bool' && box.unit !== 'fp' && !box.age_based && (
          <div className="border border-gray-200 rounded-xl p-3 space-y-2">
            <p className="text-xs font-semibold text-gray-500">Thresholds ({box.direction === 'high_bad' ? 'bad when high' : 'bad when low'})</p>
            <div className="flex gap-2 items-center">
              <label className="text-xs text-amber-700">Amber</label>
              <input value={amber} onChange={e => setAmber(e.target.value)} inputMode="decimal" className="w-20 px-2 py-1 rounded-lg border border-gray-300 text-sm" />
              <label className="text-xs text-red-700">Red</label>
              <input value={red} onChange={e => setRed(e.target.value)} inputMode="decimal" className="w-20 px-2 py-1 rounded-lg border border-gray-300 text-sm" />
              <button onClick={async () => { const err = await onRule(box, num(amber), num(red)); setNote(err || 'Rule saved.'); }} className="px-3 py-1.5 rounded-lg bg-navy text-white text-xs font-semibold">Save</button>
            </div>
          </div>
        )}
        {box.age_based && (
          <div className="border border-gray-200 rounded-xl p-3 space-y-2">
            <p className="text-xs font-semibold text-gray-500">Hours before amber and red</p>
            <div className="flex gap-2 items-center">
              <label className="text-xs text-amber-700">Amber</label>
              <input value={amber} onChange={e => setAmber(e.target.value)} inputMode="decimal" className="w-20 px-2 py-1 rounded-lg border border-gray-300 text-sm" />
              <label className="text-xs text-red-700">Red</label>
              <input value={red} onChange={e => setRed(e.target.value)} inputMode="decimal" className="w-20 px-2 py-1 rounded-lg border border-gray-300 text-sm" />
              <button onClick={async () => { const err = await onRule(box, num(amber), num(red)); setNote(err || 'Rule saved.'); }} className="px-3 py-1.5 rounded-lg bg-navy text-white text-xs font-semibold">Save</button>
            </div>
          </div>
        )}

        <div>
          <p className="text-xs font-semibold text-gray-500 mb-1.5">Recent alerts</p>
          {events.length === 0 ? <p className="text-xs text-gray-400">No amber or red events yet.</p> : (
            <ul className="space-y-1">
              {events.map(e => (
                <li key={e.id} className="text-xs text-gray-600 flex justify-between gap-2">
                  <span>{e.old_state ?? 'new'} → <b>{e.new_state}</b>{e.value !== null ? ` (${fmtValue(box, e.value)})` : ''}</span>
                  <span className="text-gray-400 whitespace-nowrap">{new Date(e.at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button onClick={onHide} className="text-xs text-gray-400 hover:text-gray-600 underline">Hide this box from the board</button>
      </div>
    </div>
  );
}
