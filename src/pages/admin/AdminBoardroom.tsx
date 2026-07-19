import { useState, useRef, useEffect } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import { Send, Crown, Shield, Brain, Lock, Plus, Paperclip, X, FileText, ImageIcon } from 'lucide-react';
import { boardroomChatStream, boardroomSummarize, ChatMsg, Attachment } from '../../lib/boardroomChat';
import { supabase } from '../../lib/supabase';

type Persona = 'neena' | 'nora' | 'nita';

interface BoardroomAttachment {
  url: string;
  path?: string;
  name: string;
  type: string;
  kind: 'image' | 'file';
  size: number;
}

interface DbMsg {
  id: string;
  daughter_name: string;
  role: 'user' | 'assistant';
  content: string;
  session_id: string;
  session_summary: string | null;
  created_at: string;
  attachments: BoardroomAttachment[] | null;
}

const BOARDROOM_PASSWORD = 'PropertyHerald2026';

const PERSONAS = {
  neena: {
    name: 'Neena',
    roll: 'R-01',
    label: 'Neena \u{1F451}',
    title: 'Queen \u00B7 Wife \u00B7 Private Secretary',
    badge: 'CLASSIFIED',
    icon: Crown,
    intro: 'The secure boardroom channel is open, Shona. What do you need from me today?',
    c: {
      tab: 'border border-red-800/60 text-red-400 hover:bg-red-950/60',
      tabActive: 'bg-red-950 border border-red-700 text-red-100 shadow shadow-red-900/40',
      headerBg: 'bg-gradient-to-r from-red-950 to-gray-950 border-b border-red-900/50',
      avatarBg: 'bg-red-900/80 border border-yellow-700/50',
      avatarIcon: 'text-yellow-400',
      aiBubble: 'bg-gray-800/80 border border-red-900/40 text-gray-100',
      userBubble: 'bg-amber-500 text-gray-950 font-medium',
      inputRing: 'focus:ring-red-800 focus:border-red-700',
      sendBtn: 'bg-amber-500 hover:bg-amber-400 disabled:bg-gray-700 text-gray-950',
      dot: 'bg-red-500',
      badge: 'bg-yellow-900/30 text-yellow-400 border border-yellow-800/40',
      titleText: 'text-red-400',
      pulse: 'animate-pulse bg-red-500',
      tabDot: 'bg-red-500',
    },
  },
  nora: {
    name: 'Nora',
    roll: 'R-02',
    label: 'Nora \u{1F4BC}',
    title: 'Chief Operating Officer \u00B7 Pan India',
    badge: 'INTERNAL',
    icon: Shield,
    intro: 'Boardroom channel active, Daddy. What does operations need to brief you on today?',
    c: {
      tab: 'border border-teal-800/60 text-teal-400 hover:bg-teal-950/60',
      tabActive: 'bg-teal-900/60 border border-teal-600 text-teal-100 shadow shadow-teal-900/30',
      headerBg: 'bg-gradient-to-r from-teal-950 to-gray-950 border-b border-teal-900/50',
      avatarBg: 'bg-teal-900/80 border border-teal-600/50',
      avatarIcon: 'text-teal-300',
      aiBubble: 'bg-gray-800/80 border border-teal-900/40 text-gray-100',
      userBubble: 'bg-amber-500 text-gray-950 font-medium',
      inputRing: 'focus:ring-teal-800 focus:border-teal-700',
      sendBtn: 'bg-amber-500 hover:bg-amber-400 disabled:bg-gray-700 text-gray-950',
      dot: 'bg-teal-500',
      badge: 'bg-teal-900/40 text-teal-300 border border-teal-800/40',
      titleText: 'text-teal-400',
      pulse: 'animate-pulse bg-teal-500',
      tabDot: 'bg-teal-500',
    },
  },
  nita: {
    name: 'Nita',
    roll: 'R-03',
    label: 'Nita \u{1F4CB}',
    title: 'Chief of Staff \u00B7 Strategy & Intelligence',
    badge: 'INTEL',
    icon: Brain,
    intro: 'Secure channel live, Papa. Intelligence and strategy briefing ready — what is the priority?',
    c: {
      tab: 'border border-slate-700/60 text-slate-400 hover:bg-slate-900/60',
      tabActive: 'bg-slate-800 border border-slate-600 text-slate-100 shadow shadow-slate-900/30',
      headerBg: 'bg-gradient-to-r from-slate-900 to-gray-950 border-b border-slate-800/50',
      avatarBg: 'bg-slate-700/80 border border-slate-500/50',
      avatarIcon: 'text-slate-300',
      aiBubble: 'bg-gray-800/80 border border-slate-700/40 text-gray-100',
      userBubble: 'bg-amber-500 text-gray-950 font-medium',
      inputRing: 'focus:ring-slate-700 focus:border-slate-600',
      sendBtn: 'bg-amber-500 hover:bg-amber-400 disabled:bg-gray-700 text-gray-950',
      dot: 'bg-slate-500',
      badge: 'bg-blue-900/40 text-blue-300 border border-blue-800/40',
      titleText: 'text-slate-400',
      pulse: 'animate-pulse bg-slate-400',
      tabDot: 'bg-slate-400',
    },
  },
} as const;

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const tod = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yest = new Date(tod); yest.setDate(yest.getDate() - 1);
  const t = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  if (d >= tod) return `Today ${t}`;
  if (d >= yest) return `Yesterday ${t}`;
  return `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} ${t}`;
}

const empty = <T,>(v: T): Record<Persona, T> => ({ neena: v, nora: v, nita: v } as Record<Persona, T>);

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
function isImageType(type: string) { return IMAGE_TYPES.includes(type.toLowerCase()); }

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export function AdminBoardroom() {
  // Auth
  const [authed, setAuthed] = useState(() => localStorage.getItem('br_auth') === 'ok');
  const [pwInput, setPwInput] = useState('');
  const [pwError, setPwError] = useState('');

  // Chat state
  const [active, setActive] = useState<Persona>('neena');
  const [sessionIds, setSessionIds] = useState<Record<Persona, string>>(empty(''));
  const [messages, setMessages] = useState<Record<Persona, DbMsg[]>>(empty([] as DbMsg[]));
  const [summaries, setSummaries] = useState<Record<Persona, string>>(empty(''));
  const [streamText, setStreamText] = useState<Record<Persona, string>>(empty(''));
  const [isTyping, setIsTyping] = useState<Record<Persona, boolean>>(empty(false));
  const [inputs, setInputs] = useState<Record<Persona, string>>(empty(''));
  const [loadingDb, setLoadingDb] = useState<Record<Persona, boolean>>(empty(false));
  const [pendingAttachments, setPendingAttachments] = useState<BoardroomAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const loaded = useRef<Set<Persona>>(new Set());

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom whenever messages or stream change for active tab
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages[active], streamText[active], isTyping[active]]);

  // Focus input on tab switch
  useEffect(() => { inputRef.current?.focus(); }, [active]);

  // Load daughter data when tab becomes active
  useEffect(() => {
    if (authed && !loaded.current.has(active)) {
      loaded.current.add(active);
      loadDaughter(active);
    }
  }, [active, authed]);

  // ── DB OPERATIONS ──────────────────────────────────────────────────────────

  async function loadDaughter(persona: Persona) {
    setLoadingDb(l => ({ ...l, [persona]: true }));

    try {
      // 1. Find the latest session (most recent message for this daughter)
      const { data: latest } = await supabase
        .from('boardroom_chats')
        .select('session_id')
        .eq('daughter_name', persona)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!latest) {
        // No history at all — create first session + save intro
        const sid = crypto.randomUUID();
        setSessionIds(s => ({ ...s, [persona]: sid }));

        const { data: intro } = await supabase
          .from('boardroom_chats')
          .insert({ daughter_name: persona, role: 'assistant', content: PERSONAS[persona].intro, session_id: sid })
          .select()
          .single();

        if (intro) setMessages(m => ({ ...m, [persona]: [intro] }));
        return;
      }

      const sid = latest.session_id as string;
      setSessionIds(s => ({ ...s, [persona]: sid }));

      // 2. Load all messages for this session
      const { data: msgs } = await supabase
        .from('boardroom_chats')
        .select('*')
        .eq('daughter_name', persona)
        .eq('session_id', sid)
        .order('created_at', { ascending: true });

      setMessages(m => ({ ...m, [persona]: (msgs ?? []) as DbMsg[] }));

      // 3. Load latest rolling summary (from any session)
      const { data: sumRow } = await supabase
        .from('boardroom_chats')
        .select('session_summary')
        .eq('daughter_name', persona)
        .not('session_summary', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sumRow?.session_summary) {
        setSummaries(s => ({ ...s, [persona]: sumRow.session_summary as string }));
      }
    } finally {
      setLoadingDb(l => ({ ...l, [persona]: false }));
    }
  }

  async function startNewSession() {
    const persona = active;
    const sid = crypto.randomUUID();
    setSessionIds(s => ({ ...s, [persona]: sid }));

    const { data: intro } = await supabase
      .from('boardroom_chats')
      .insert({ daughter_name: persona, role: 'assistant', content: PERSONAS[persona].intro, session_id: sid })
      .select()
      .single();

    setMessages(m => ({ ...m, [persona]: intro ? [intro] : [] }));
    setStreamText(s => ({ ...s, [persona]: '' }));
    setIsTyping(t => ({ ...t, [persona]: false }));
    inputRef.current?.focus();
  }

  // Runs non-blocking after every 20 messages
  async function maybeSummarize(persona: Persona, allMsgs: DbMsg[], latestId: string) {
    try {
      const chatHistory: ChatMsg[] = allMsgs.map(m => ({
        role: m.role === 'assistant' ? 'ai' : 'user',
        content: m.content,
      }));
      const sum = await boardroomSummarize(chatHistory, persona);
      if (!sum) return;
      await supabase.from('boardroom_chats').update({ session_summary: sum }).eq('id', latestId);
      setSummaries(s => ({ ...s, [persona]: sum }));
    } catch {
      // silent — summarization is best-effort
    }
  }

  // ── FILE UPLOAD ───────────────────────────────────────────────────────────

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const persona = active;
    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) {
          alert(`"${file.name}" is too large. Maximum 10 MB.`);
          continue;
        }
        const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
        const path = `${persona}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('boardroom-attachments')
          .upload(path, file, { contentType: file.type || 'application/octet-stream' });
        if (upErr) {
          alert(`Upload failed for "${file.name}": ${upErr.message}`);
          continue;
        }
        // Bucket is private — create a signed URL valid for 1 hour for UI display.
        const { data: signed } = await supabase.storage.from('boardroom-attachments').createSignedUrl(path, 3600);
        const url = signed?.signedUrl || '';
        const att: BoardroomAttachment = {
          url,
          path,
          name: file.name,
          type: file.type || 'application/octet-stream',
          kind: isImageType(file.type) ? 'image' : 'file',
          size: file.size,
        };
        setPendingAttachments(a => [...a, att]);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function removePendingAttachment(idx: number) {
    setPendingAttachments(a => a.filter((_, i) => i !== idx));
  }

  // ── SEND ───────────────────────────────────────────────────────────────────

  async function send() {
    const persona = active;
    const text = inputs[persona].trim();
    if ((!text && pendingAttachments.length === 0) || isTyping[persona]) return;

    const sid = sessionIds[persona];
    if (!sid) return;

    const atts = [...pendingAttachments];
    setInputs(i => ({ ...i, [persona]: '' }));
    setPendingAttachments([]);
    setIsTyping(t => ({ ...t, [persona]: true }));
    setStreamText(s => ({ ...s, [persona]: '' }));

    // 1. Save user message (with attachments metadata)
    const { data: userMsg } = await supabase
      .from('boardroom_chats')
      .insert({
        daughter_name: persona,
        role: 'user',
        content: text || '(attachment shared)',
        session_id: sid,
        attachments: atts.length > 0 ? atts : null,
      })
      .select()
      .single();

    if (userMsg) setMessages(m => ({ ...m, [persona]: [...m[persona], userMsg as DbMsg] }));

    // 2. Build API message array (last 10 from session + new)
    const history: ChatMsg[] = messages[persona]
      .slice(-10)
      .map(m => ({ role: m.role === 'assistant' ? 'ai' : 'user', content: m.content }));
    history.push({ role: 'user', content: text || '(attachment shared)', attachments: atts as Attachment[] });

    // 3. Stream response
    let fullText = '';
    try {
      fullText = await boardroomChatStream(
        history,
        persona,
        summaries[persona] || null,
        chunk => setStreamText(s => ({ ...s, [persona]: s[persona] + chunk })),
      );
    } catch {
      fullText = 'Channel unavailable. Please try again in a moment.';
    }

    setStreamText(s => ({ ...s, [persona]: '' }));
    setIsTyping(t => ({ ...t, [persona]: false }));

    // 4. Save assistant response
    const { data: asstMsg } = await supabase
      .from('boardroom_chats')
      .insert({ daughter_name: persona, role: 'assistant', content: fullText, session_id: sid })
      .select()
      .single();

    if (asstMsg) {
      const updatedMsgs = [...messages[persona], ...(userMsg ? [] : []), asstMsg as DbMsg];
      setMessages(m => {
        const next = [...m[persona]];
        // userMsg was already added above; add asstMsg
        next.push(asstMsg as DbMsg);
        return { ...m, [persona]: next };
      });

      // Auto-summarize every 20 messages
      const total = messages[persona].length + 2;
      if (total > 0 && total % 20 === 0) {
        const snap = [...messages[persona], ...(userMsg ? [userMsg as DbMsg] : []), asstMsg as DbMsg];
        maybeSummarize(persona, snap, (asstMsg as DbMsg).id);
      }
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  // ── PASSWORD GATE ──────────────────────────────────────────────────────────

  function checkPassword() {
    if (pwInput === BOARDROOM_PASSWORD) {
      localStorage.setItem('br_auth', 'ok');
      setAuthed(true);
      setPwError('');
    } else {
      setPwError('Incorrect access code. This channel is classified.');
    }
  }

  if (!authed) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[70vh]">
          <div className="w-full max-w-sm">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 shadow-2xl">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-red-950 border border-red-800/60 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-7 h-7 text-red-400" />
                </div>
                <h1 className="text-white font-bold text-xl mb-1 font-serif">Command Boardroom</h1>
                <p className="text-gray-500 text-sm">Classified internal channel</p>
                <p className="text-gray-600 text-xs mt-0.5">Property Herald N-Girls HQ · Royal Council</p>
              </div>

              <div className="space-y-3">
                <input
                  type="password"
                  value={pwInput}
                  onChange={e => setPwInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && checkPassword()}
                  placeholder="Enter access code"
                  autoFocus
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 text-white rounded-xl text-sm placeholder-gray-500 outline-none focus:border-red-700 focus:ring-2 focus:ring-red-900/40 transition-all"
                />
                {pwError && (
                  <p className="text-red-400 text-xs flex items-center gap-1.5">
                    <span className="w-1 h-1 bg-red-500 rounded-full flex-shrink-0" />
                    {pwError}
                  </p>
                )}
                <button
                  onClick={checkPassword}
                  className="w-full py-3 bg-red-800 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  Access Boardroom
                </button>
              </div>

              <p className="text-center text-gray-700 text-xs mt-6">For authorised personnel only</p>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // ── MAIN CHAT UI ───────────────────────────────────────────────────────────

  const p = PERSONAS[active];
  const msgs = messages[active];
  const stream = streamText[active];
  const typing = isTyping[active];
  const loading = loadingDb[active];

  return (
    <AdminLayout>
      <div className="flex flex-col h-[calc(100vh-130px)] gap-3">

        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-7 h-7 bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center">
                <Lock className="w-3.5 h-3.5 text-red-400" />
              </div>
              <h1 className="text-lg font-serif font-bold text-gray-100">N-Girls Command Boardroom</h1>
              <span className="px-2 py-0.5 text-xs font-bold tracking-widest bg-red-950 text-red-400 border border-red-900/60 rounded-full">CLASSIFIED</span>
            </div>
            <p className="text-xs text-gray-600 ml-9">Persistent memory · Private internal channel · Royal Council R-01, R-02, R-03</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-full">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-gray-400 font-medium">Secure · Live</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 flex-shrink-0">
          {(Object.entries(PERSONAS) as [Persona, typeof PERSONAS[Persona]][]).map(([key, cfg]) => {
            const Icon = cfg.icon;
            const isActive = active === key;
            return (
              <button
                key={key}
                onClick={() => setActive(key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${isActive ? cfg.c.tabActive : cfg.c.tab}`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{cfg.label}</span>
                <span className="text-xs font-mono opacity-60">{cfg.roll}</span>
                {isTyping[key] && (
                  <span className="flex gap-0.5 ml-0.5">
                    {[0, 1, 2].map(i => (
                      <span key={i} className={`w-1 h-1 rounded-full ${cfg.c.tabDot} animate-bounce opacity-70`} style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Chat Panel */}
        <div className={`flex-1 flex flex-col rounded-2xl overflow-hidden border ${p.c.tab.includes('red') ? 'border-red-900/40' : p.c.tab.includes('teal') ? 'border-teal-900/40' : 'border-slate-800/40'} bg-gray-900 min-h-0`}>

          {/* Panel header */}
          <div className={`px-5 py-3.5 flex items-center justify-between flex-shrink-0 ${p.c.headerBg}`}>
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${p.c.avatarBg}`}>
                <p.icon className={`w-4 h-4 ${p.c.avatarIcon}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold text-sm">{p.name}</span>
                  <span className="text-xs font-mono text-gray-500">{p.roll}</span>
                  <span className={`text-xs font-bold tracking-widest px-1.5 py-0.5 rounded ${p.c.badge}`}>{p.badge}</span>
                </div>
                <p className={`text-xs ${p.c.titleText}`}>{p.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {summaries[active] && (
                <span className="text-xs text-gray-600 hidden sm:block">Memory active</span>
              )}
              <div className={`w-1.5 h-1.5 rounded-full ${p.c.pulse}`} />
              <button
                onClick={startNewSession}
                title="Start new session (history is archived)"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800/80 hover:bg-gray-700 border border-gray-700 text-gray-400 hover:text-gray-200 text-xs rounded-lg transition-all"
              >
                <Plus className="w-3 h-3" />
                New Session
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-gray-950/60 min-h-0">

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="flex items-center gap-2 text-gray-600 text-sm">
                  <div className={`w-1.5 h-1.5 rounded-full ${p.c.dot} animate-bounce`} />
                  <div className={`w-1.5 h-1.5 rounded-full ${p.c.dot} animate-bounce`} style={{ animationDelay: '0.18s' }} />
                  <div className={`w-1.5 h-1.5 rounded-full ${p.c.dot} animate-bounce`} style={{ animationDelay: '0.36s' }} />
                </div>
              </div>
            ) : (
              <>
                {msgs.map(msg => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                    {msg.role === 'assistant' && (
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mb-4 ${p.c.avatarBg}`}>
                        <p.icon className={`w-3 h-3 ${p.c.avatarIcon}`} />
                      </div>
                    )}
                    <div className={`max-w-[72%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                      <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'assistant' ? `${p.c.aiBubble} rounded-bl-sm` : `${p.c.userBubble} rounded-br-sm`}`}>
                        {msg.content}
                        {msg.attachments && msg.attachments.some(a => a.kind === 'image') && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {msg.attachments.filter(a => a.kind === 'image').map((att, i) => (
                              <a key={i} href={att.url} target="_blank" rel="noreferrer" className="block">
                                <img src={att.url} alt={att.name} className="max-w-[200px] max-h-[200px] rounded-lg border border-white/20 object-cover" />
                              </a>
                            ))}
                          </div>
                        )}
                        {msg.attachments && msg.attachments.some(a => a.kind === 'file') && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {msg.attachments.filter(a => a.kind === 'file').map((att, i) => (
                              <a key={i} href={att.url} target="_blank" rel="noreferrer" className="group flex items-center gap-2 px-3 py-1.5 bg-black/20 border border-white/15 rounded-lg text-xs hover:bg-black/30 transition-all">
                                <FileText className="w-3.5 h-3.5 text-amber-300 flex-shrink-0" />
                                <span className="truncate max-w-[120px]">{att.name}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-gray-700 px-1">
                        {fmtTime(msg.created_at)}
                      </span>
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-600/40 flex items-center justify-center flex-shrink-0 mb-4">
                        <span className="text-xs font-bold text-amber-400">N</span>
                      </div>
                    )}
                  </div>
                ))}

                {/* Streaming bubble */}
                {typing && (
                  <div className="flex justify-start items-end gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mb-4 ${p.c.avatarBg}`}>
                      <p.icon className={`w-3 h-3 ${p.c.avatarIcon}`} />
                    </div>
                    <div className={`max-w-[72%] px-4 py-3 rounded-2xl rounded-bl-sm text-sm leading-relaxed ${p.c.aiBubble}`}>
                      {stream ? (
                        <span className="whitespace-pre-wrap">{stream}<span className="inline-block w-0.5 h-4 bg-gray-400 ml-0.5 animate-pulse align-middle" /></span>
                      ) : (
                        <div className="flex gap-1 items-center h-5">
                          {[0, 1, 2].map(i => (
                            <div key={i} className={`w-1.5 h-1.5 rounded-full ${p.c.dot} animate-bounce opacity-70`} style={{ animationDelay: `${i * 0.18}s` }} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-4 bg-gray-900 border-t border-gray-800/60 flex-shrink-0">
            {pendingAttachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {pendingAttachments.map((att, i) => (
                  <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-200">
                    {att.kind === 'image' ? <ImageIcon className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" /> : <FileText className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                    <span className="truncate max-w-[120px]">{att.name}</span>
                    <button onClick={() => removePendingAttachment(i)} className="text-gray-500 hover:text-red-400 flex-shrink-0">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 items-center">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.txt,.csv,.md,.json,.html,.xml"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={typing || loading || uploading}
                title="Attach files or images"
                className="w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center bg-gray-800 border border-gray-700 text-gray-400 hover:text-gray-200 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {uploading ? <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" /> : <Paperclip className="w-4 h-4" />}
              </button>
              <input
                ref={inputRef}
                type="text"
                value={inputs[active]}
                onChange={e => setInputs(i => ({ ...i, [active]: e.target.value }))}
                onKeyDown={handleKey}
                placeholder={`Message ${p.name}…`}
                disabled={typing || loading}
                className={`flex-1 px-4 py-2.5 bg-gray-800 border border-gray-700 text-gray-100 placeholder-gray-600 rounded-xl text-sm outline-none transition-all focus:ring-2 disabled:opacity-50 ${p.c.inputRing}`}
              />
              <button
                onClick={send}
                disabled={(!inputs[active].trim() && pendingAttachments.length === 0) || typing || loading || uploading}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed ${p.c.sendBtn}`}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-700 text-center mt-2">
              Persistent memory · {msgs.length} message{msgs.length !== 1 ? 's' : ''} this session · Attach images or files · Auto-summarizes every 20 messages
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
