import { useState, useRef, useEffect } from 'react';
import { Crown, Shield, Brain, Lock, Send, Plus, Paperclip, X, FileText, Image as ImageIcon, ArrowDown, Mic, Car, Volume2, Square, type LucideIcon } from 'lucide-react';
import { boardroomChatStream, boardroomSummarize, ChatMsg, Attachment } from '../lib/boardroomChat';
import { supabase } from '../lib/supabase';
import { initVoices, speak, stopSpeaking, startListening, ttsSupported, sttSupported } from '../lib/voice';

export type Persona = 'neena' | 'nora' | 'nita';

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

interface PersonaCfg {
  key: Persona;
  name: string;
  roll: string;
  title: string;
  intro: string;
  icon: LucideIcon;
  headerBg: string;
  avatarBg: string;
  avatarIcon: string;
  aiBubble: string;
  inputRing: string;
  sendBtn: string;
  dot: string;
  badge: string;
  titleText: string;
}

const PERSONAS: Record<Persona, PersonaCfg> = {
  neena: {
    key: 'neena',
    name: 'Neena',
    roll: 'R-01',
    title: 'Queen · Private Secretary',
    intro: 'The secure boardroom channel is open, Shona. What do you need from me today?',
    icon: Crown,
    headerBg: 'bg-gradient-to-r from-red-950 to-gray-950 border-b border-red-900/40',
    avatarBg: 'bg-red-900/80 border border-yellow-700/50',
    avatarIcon: 'text-amber-400',
    aiBubble: 'bg-gray-800/80 border border-red-900/40 text-gray-100 rounded-bl-sm',
    inputRing: 'focus:border-red-700 focus:ring-red-900/40',
    sendBtn: 'bg-amber-500 active:bg-amber-400',
    dot: 'bg-red-500',
    badge: 'bg-yellow-900/30 text-yellow-400 border border-yellow-800/40',
    titleText: 'text-red-400',
  },
  nora: {
    key: 'nora',
    name: 'Nora',
    roll: 'R-02',
    title: 'Chief Operating Officer · Pan India',
    intro: 'Boardroom channel active, Daddy. What does operations need to brief you on today?',
    icon: Shield,
    headerBg: 'bg-gradient-to-r from-teal-950 to-gray-950 border-b border-teal-900/40',
    avatarBg: 'bg-teal-900/80 border border-teal-600/50',
    avatarIcon: 'text-teal-300',
    aiBubble: 'bg-gray-800/80 border border-teal-900/40 text-gray-100 rounded-bl-sm',
    inputRing: 'focus:border-teal-700 focus:ring-teal-900/40',
    sendBtn: 'bg-amber-500 active:bg-amber-400',
    dot: 'bg-teal-500',
    badge: 'bg-teal-900/40 text-teal-300 border border-teal-800/40',
    titleText: 'text-teal-400',
  },
  nita: {
    key: 'nita',
    name: 'Nita',
    roll: 'R-03',
    title: 'Chief of Staff · Strategy & Intelligence',
    intro: 'Secure channel live, Papa. Intelligence and strategy briefing ready — what is the priority?',
    icon: Brain,
    headerBg: 'bg-gradient-to-r from-slate-900 to-gray-950 border-b border-slate-800/50',
    avatarBg: 'bg-slate-700/80 border border-slate-500/50',
    avatarIcon: 'text-slate-300',
    aiBubble: 'bg-gray-800/80 border border-slate-700/40 text-gray-100 rounded-bl-sm',
    inputRing: 'focus:border-slate-600 focus:ring-slate-700/40',
    sendBtn: 'bg-amber-500 active:bg-amber-400',
    dot: 'bg-slate-400',
    badge: 'bg-blue-900/40 text-blue-300 border border-blue-800/40',
    titleText: 'text-slate-400',
  },
};

const BOARDROOM_PASSWORD = 'PropertyHerald2026';
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
function isImageType(type: string) { return IMAGE_TYPES.includes(type.toLowerCase()); }

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

export function BoardroomPage({ persona = 'neena' }: { persona?: Persona }) {
  const cfg = PERSONAS[persona];
  const Icon = cfg.icon;

  const [authed, setAuthed] = useState(() => localStorage.getItem('br_auth') === 'ok');
  const [pwInput, setPwInput] = useState('');
  const [pwError, setPwError] = useState('');

  const [sessionId, setSessionId] = useState('');
  const [messages, setMessages] = useState<DbMsg[]>([]);
  const [summary, setSummary] = useState('');
  const [streamText, setStreamText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [input, setInput] = useState('');
  const [loadingDb, setLoadingDb] = useState(true);
  const [pendingAttachments, setPendingAttachments] = useState<BoardroomAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [drivingMode, setDrivingMode] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const speakingNowRef = useRef(false);
  const lastSpokenIdRef = useRef<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const loaded = useRef(false);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // Init TTS voices once authed; stop all speech on unmount or persona switch.
  useEffect(() => {
    if (authed && ttsSupported()) initVoices();
    return () => stopSpeaking();
  }, [authed, persona]);

  // Auto-speak the latest AI reply when Driving Mode is on.
  useEffect(() => {
    if (!drivingMode) { stopSpeaking(); speakingNowRef.current = false; setSpeaking(false); return; }
    const last = messages[messages.length - 1];
    if (!last || last.role !== 'assistant') return;
    if (lastSpokenIdRef.current === last.id) return;
    lastSpokenIdRef.current = last.id;
    speakingNowRef.current = true;
    setSpeaking(true);
    speak(last.content, persona);
    const iv = setInterval(() => {
      if (!window.speechSynthesis?.speaking) {
        speakingNowRef.current = false;
        setSpeaking(false);
        clearInterval(iv);
      }
    }, 300);
  }, [messages, drivingMode, persona]);

  useEffect(() => {
    if (authed && !loaded.current) {
      loaded.current = true;
      loadBoardroom();
    }
  }, [authed]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamText, isTyping]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollBtn(distFromBottom > 200);
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [authed]);

  async function loadBoardroom() {
    setLoadingDb(true);
    try {
      const { data: latest } = await supabase
        .from('boardroom_chats')
        .select('session_id')
        .eq('daughter_name', persona)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!latest) {
        const sid = crypto.randomUUID();
        setSessionId(sid);
        const { data: intro } = await supabase
          .from('boardroom_chats')
          .insert({ daughter_name: persona, role: 'assistant', content: cfg.intro, session_id: sid })
          .select()
          .single();
        if (intro) setMessages([intro as DbMsg]);
        return;
      }

      const sid = latest.session_id as string;
      setSessionId(sid);

      const { data: msgs } = await supabase
        .from('boardroom_chats')
        .select('*')
        .eq('daughter_name', persona)
        .eq('session_id', sid)
        .order('created_at', { ascending: true });
      setMessages((msgs ?? []) as DbMsg[]);

      const { data: sumRow } = await supabase
        .from('boardroom_chats')
        .select('session_summary')
        .eq('daughter_name', persona)
        .not('session_summary', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (sumRow?.session_summary) setSummary(sumRow.session_summary as string);
    } finally {
      setLoadingDb(false);
    }
  }

  async function startNewSession() {
    const sid = crypto.randomUUID();
    setSessionId(sid);
    const { data: intro } = await supabase
      .from('boardroom_chats')
      .insert({ daughter_name: persona, role: 'assistant', content: cfg.intro, session_id: sid })
      .select()
      .single();
    setMessages(intro ? [intro as DbMsg] : []);
    setStreamText('');
    setIsTyping(false);
    inputRef.current?.focus();
  }

  async function maybeSummarize(allMsgs: DbMsg[], latestId: string) {
    try {
      const chatHistory: ChatMsg[] = allMsgs.map(m => ({ role: m.role === 'assistant' ? 'ai' : 'user', content: m.content }));
      const sum = await boardroomSummarize(chatHistory, persona);
      if (!sum) return;
      await supabase.from('boardroom_chats').update({ session_summary: sum }).eq('id', latestId);
      setSummary(sum);
    } catch { /* best-effort */ }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) { alert(`"${file.name}" is too large. Maximum 10 MB.`); continue; }
        const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
        const path = `${persona}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('boardroom-attachments')
          .upload(path, file, { contentType: file.type || 'application/octet-stream' });
        if (upErr) { alert(`Upload failed for "${file.name}": ${upErr.message}`); continue; }
        const { data: signed } = await supabase.storage.from('boardroom-attachments').createSignedUrl(path, 3600);
        const att: BoardroomAttachment = {
          url: signed?.signedUrl || '',
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

  async function send() {
    const text = input.trim();
    if ((!text && pendingAttachments.length === 0) || isTyping) return;
    if (!sessionId) return;

    const atts = [...pendingAttachments];
    setInput('');
    setPendingAttachments([]);
    setIsTyping(true);
    setStreamText('');

    const { data: userMsg } = await supabase
      .from('boardroom_chats')
      .insert({ daughter_name: persona, role: 'user', content: text || '(attachment shared)', session_id: sessionId, attachments: atts.length > 0 ? atts : null })
      .select()
      .single();
    if (userMsg) setMessages(m => [...m, userMsg as DbMsg]);

    const history: ChatMsg[] = messages.slice(-10).map(m => ({ role: m.role === 'assistant' ? 'ai' : 'user', content: m.content }));
    history.push({ role: 'user', content: text || '(attachment shared)', attachments: atts as Attachment[] });

    let fullText = '';
    try {
      fullText = await boardroomChatStream(history, persona, summary || null, chunk => setStreamText(s => s + chunk));
    } catch {
      fullText = 'Channel unavailable. Please try again in a moment.';
    }

    setStreamText('');
    setIsTyping(false);

    const { data: asstMsg } = await supabase
      .from('boardroom_chats')
      .insert({ daughter_name: persona, role: 'assistant', content: fullText, session_id: sessionId })
      .select()
      .single();
    if (asstMsg) {
      setMessages(m => [...m, asstMsg as DbMsg]);
      const total = messages.length + 2;
      if (total > 0 && total % 20 === 0) {
        const snap = [...messages, ...(userMsg ? [userMsg as DbMsg] : []), asstMsg as DbMsg];
        maybeSummarize(snap, (asstMsg as DbMsg).id);
      }
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  function toggleDrivingMode() {
    setDrivingMode(d => {
      const next = !d;
      if (!next) { stopSpeaking(); speakingNowRef.current = false; setSpeaking(false); }
      return next;
    });
  }

  function replayMessage(content: string) {
    stopSpeaking();
    speakingNowRef.current = true;
    setSpeaking(true);
    speak(content, persona);
    const iv = setInterval(() => {
      if (!window.speechSynthesis?.speaking) {
        speakingNowRef.current = false;
        setSpeaking(false);
        clearInterval(iv);
      }
    }, 300);
  }

  function toggleMic() {
    if (listening) { setListening(false); return; }
    if (!sttSupported()) { alert('Voice input is not supported on this browser. Try Chrome on Android or desktop.'); return; }
    setListening(true);
    const prev = input;
    startListening({
      onInterim: (t) => setInput(prev ? `${prev} ${t}` : t),
      onFinal: (t) => setInput(prev ? `${prev.replace(/\s+$/, '')} ${t}` : t),
      onError: (err) => { setListening(false); if (err !== 'no-speech') alert(`Mic error: ${err}`); },
      onEnd: () => setListening(false),
    });
  }

  function checkPassword() {
    if (pwInput === BOARDROOM_PASSWORD) {
      localStorage.setItem('br_auth', 'ok');
      setAuthed(true);
      setPwError('');
    } else {
      setPwError('Incorrect access code.');
    }
  }

  // ── PASSWORD GATE ──────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div
        className="flex items-center justify-center min-h-[100dvh] bg-gray-950 px-6"
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className={`w-16 h-16 ${cfg.avatarBg} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg`}>
              <Icon className={`w-7 h-7 ${cfg.avatarIcon}`} />
            </div>
            <h1 className="text-white font-bold text-xl mb-1 font-serif tracking-tight">Boardroom</h1>
            <p className="text-gray-500 text-sm">{cfg.name} · {cfg.title}</p>
            <p className="text-gray-700 text-xs mt-1">Property Herald · Royal Council {cfg.roll}</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl">
            <div className="relative mb-4">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
              <input
                type="password"
                value={pwInput}
                onChange={e => setPwInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && checkPassword()}
                placeholder="Access code"
                autoFocus
                className="w-full pl-10 pr-4 py-3.5 bg-gray-800 border border-gray-700 text-white rounded-xl text-base placeholder-gray-600 outline-none focus:border-red-700 focus:ring-2 focus:ring-red-900/40 transition-all"
              />
            </div>
            {pwError && <p className="text-red-400 text-xs mb-3">{pwError}</p>}
            <button
              onClick={checkPassword}
              className="w-full py-3.5 bg-red-800 hover:bg-red-700 active:scale-[0.98] text-white rounded-xl text-sm font-semibold transition-all"
            >
              Enter Boardroom
            </button>
          </div>
          <p className="text-center text-gray-700 text-xs mt-6">Authorised personnel only</p>
        </div>
      </div>
    );
  }

  // ── MAIN CHAT UI ───────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col h-[100dvh] bg-gray-950 max-w-2xl mx-auto relative"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 ${cfg.headerBg} flex-shrink-0`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-full ${cfg.avatarBg} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-5 h-5 ${cfg.avatarIcon}`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-sm font-serif">{cfg.name}</span>
              <span className="text-xs font-mono text-gray-500">{cfg.roll}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`text-xs ${cfg.titleText} truncate`}>{cfg.title}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className={`w-2 h-2 rounded-full ${online ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`} />
          {ttsSupported() && (
            <button
              onClick={toggleDrivingMode}
              title={drivingMode ? 'Driving Mode on — tap to stop' : 'Driving Mode — auto-read replies aloud'}
              className={`w-9 h-9 flex items-center justify-center rounded-lg border transition-all active:scale-95 ${drivingMode ? 'bg-amber-500 border-amber-400 text-gray-950' : 'bg-gray-800/80 border-gray-700 text-gray-400 active:bg-gray-700'}`}
            >
              {speaking ? <Square className="w-3.5 h-3.5 fill-current" /> : <Car className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={startNewSession}
            title="New session"
            className="w-9 h-9 flex items-center justify-center bg-gray-800/80 active:bg-gray-700 border border-gray-700 text-gray-400 rounded-lg transition-all"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 overscroll-contain">
        {loadingDb ? (
          <div className="flex justify-center py-12">
            <div className="flex items-center gap-1.5">
              {[0, 1, 2].map(i => (
                <div key={i} className={`w-2 h-2 rounded-full ${cfg.dot} animate-bounce`} style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                {msg.role === 'assistant' && (
                  <div className={`w-7 h-7 rounded-full ${cfg.avatarBg} flex items-center justify-center flex-shrink-0 mb-3`}>
                    <Icon className={`w-3.5 h-3.5 ${cfg.avatarIcon}`} />
                  </div>
                )}
                <div className={`max-w-[80%] flex flex-col gap-1`}>
                  <div className={`px-4 py-3 rounded-2xl text-[15px] leading-relaxed whitespace-pre-wrap ${msg.role === 'assistant' ? cfg.aiBubble : 'bg-amber-500 text-gray-950 font-medium rounded-br-sm'}`}>
                    {msg.content}
                    {msg.role === 'assistant' && ttsSupported() && (
                      <button
                        onClick={() => replayMessage(msg.content)}
                        title="Read aloud"
                        className="mt-2 flex items-center gap-1 text-[11px] text-gray-400 active:text-gray-200 transition-colors"
                      >
                        <Volume2 className="w-3 h-3" />
                        <span>Play</span>
                      </button>
                    )}
                    {msg.attachments && msg.attachments.some(a => a.kind === 'image') && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {msg.attachments.filter(a => a.kind === 'image').map((att, i) => (
                          <a key={i} href={att.url} target="_blank" rel="noreferrer" className="block">
                            <img src={att.url} alt={att.name} className="max-w-[180px] max-h-[180px] rounded-lg border border-white/20 object-cover" />
                          </a>
                        ))}
                      </div>
                    )}
                    {msg.attachments && msg.attachments.some(a => a.kind === 'file') && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {msg.attachments.filter(a => a.kind === 'file').map((att, i) => (
                          <a key={i} href={att.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-1.5 bg-black/20 border border-white/15 rounded-lg text-xs">
                            <FileText className="w-3.5 h-3.5 text-amber-300 flex-shrink-0" />
                            <span className="truncate max-w-[100px]">{att.name}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] text-gray-700 px-1">{fmtTime(msg.created_at)}</span>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start items-end gap-2">
                <div className={`w-7 h-7 rounded-full ${cfg.avatarBg} flex items-center justify-center flex-shrink-0 mb-3`}>
                  <Icon className={`w-3.5 h-3.5 ${cfg.avatarIcon}`} />
                </div>
                <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-[15px] leading-relaxed ${cfg.aiBubble}`}>
                  {streamText ? (
                    <span className="whitespace-pre-wrap">{streamText}<span className="inline-block w-0.5 h-4 bg-gray-400 ml-0.5 animate-pulse align-middle" /></span>
                  ) : (
                    <div className="flex gap-1 items-center h-5">
                      {[0, 1, 2].map(i => (
                        <div key={i} className={`w-1.5 h-1.5 rounded-full ${cfg.dot} animate-bounce opacity-70`} style={{ animationDelay: `${i * 0.15}s` }} />
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

      {showScrollBtn && (
        <button
          onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
          className="absolute bottom-24 right-4 w-10 h-10 bg-gray-800 border border-gray-700 rounded-full flex items-center justify-center text-gray-300 shadow-lg active:scale-95 transition-all z-10"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      )}

      {/* Input */}
      <div className="px-3 py-3 bg-gray-900 border-t border-gray-800 flex-shrink-0">
        {pendingAttachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {pendingAttachments.map((att, i) => (
              <div key={i} className="flex items-center gap-2 pl-2 pr-1.5 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-200">
                {att.kind === 'image' ? <ImageIcon className="w-3.5 h-3.5 text-blue-400" /> : <FileText className="w-3.5 h-3.5 text-amber-400" />}
                <span className="truncate max-w-[100px]">{att.name}</span>
                <button onClick={() => removePendingAttachment(i)} className="text-gray-500 active:text-red-400 p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2 items-end">
          <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.txt,.csv,.md,.json" onChange={handleFileSelect} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isTyping || uploading}
            className="w-11 h-11 flex-shrink-0 rounded-xl flex items-center justify-center bg-gray-800 border border-gray-700 text-gray-400 active:bg-gray-700 active:scale-95 disabled:opacity-40 transition-all"
          >
            {uploading ? <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" /> : <Paperclip className="w-5 h-5" />}
          </button>
          {sttSupported() && (
            <button
              onClick={toggleMic}
              disabled={isTyping || uploading}
              title="Voice input"
              className={`w-11 h-11 flex-shrink-0 rounded-xl flex items-center justify-center border active:scale-95 disabled:opacity-40 transition-all ${listening ? 'bg-red-600 border-red-500 text-white animate-pulse' : 'bg-gray-800 border-gray-700 text-gray-400 active:bg-gray-700'}`}
            >
              <Mic className="w-5 h-5" />
            </button>
          )}
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={`Message ${cfg.name}…`}
            rows={1}
            disabled={isTyping}
            className={`flex-1 px-4 py-3 bg-gray-800 border border-gray-700 text-gray-100 placeholder-gray-600 rounded-xl text-[15px] outline-none focus:ring-2 disabled:opacity-50 resize-none max-h-32 transition-all ${cfg.inputRing}`}
          />
          <button
            onClick={send}
            disabled={(!input.trim() && pendingAttachments.length === 0) || isTyping || uploading}
            className={`w-11 h-11 flex-shrink-0 rounded-xl flex items-center justify-center text-gray-950 disabled:bg-gray-700 disabled:opacity-40 active:scale-95 transition-all ${cfg.sendBtn}`}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
