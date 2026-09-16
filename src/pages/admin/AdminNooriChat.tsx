import { useState, useRef, useEffect, useCallback } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import { Send, Wrench, RotateCcw, Terminal } from 'lucide-react';
import { boardroomChat } from '../../lib/boardroomChat';
import { loadChatHistory, saveMessage, resetSession, type StoredMessage } from '../../lib/chatMemory';

interface Msg { role: 'user' | 'ai'; content: string; }

const INTRO = "Systems check complete, Chief. I'm reading the codebase — what needs eyes today?";

function toMsgs(rows: StoredMessage[]): Msg[] {
  return rows.map(r => ({ role: r.role === 'assistant' ? 'ai' : 'user', content: r.content }));
}

export function AdminNooriChat() {
  const [messages, setMessages] = useState<Msg[]>([{ role: 'ai', content: INTRO }]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [retryLabel, setRetryLabel] = useState('');
  const [historyLoading, setHistoryLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typing]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await loadChatHistory('noori');
      if (cancelled) return;
      setHistoryLoading(false);
      if (rows.length > 0) setMessages(toMsgs(rows));
      else setMessages([{ role: 'ai', content: INTRO }]);
    })();
    return () => { cancelled = true; };
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || typing) return;

    const userMsg: Msg = { role: 'user', content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setTyping(true);
    setRetryLabel('');
    void saveMessage('noori', 'user', text);

    try {
      const reply = await boardroomChat(updated, 'noori', (attempt, max) => {
        if (attempt > 0) setRetryLabel(`Retrying… (${attempt}/${max})`);
      });
      setMessages(m => [...m, { role: 'ai', content: reply }]);
      void saveMessage('noori', 'assistant', reply);
    } catch {
      const fallback = 'Channel unavailable. Please try again in a moment.';
      setMessages(m => [...m, { role: 'ai', content: fallback }]);
      void saveMessage('noori', 'assistant', fallback);
    } finally {
      setTyping(false);
      setRetryLabel('');
    }
  }, [input, typing, messages]);

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  function reset() {
    resetSession('noori');
    setMessages([{ role: 'ai', content: INTRO }]);
    setInput('');
    setTyping(false);
  }

  return (
    <AdminLayout>
      <div className="flex flex-col h-[calc(100vh-130px)]">

        {/* Identity Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-cyan-800 to-cyan-700 rounded-t-2xl px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center shadow-lg">
                <Wrench className="w-7 h-7 text-cyan-200" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <h2 className="text-white font-bold text-xl">Noori</h2>
                  <span className="px-2 py-0.5 bg-white/10 text-white/80 text-xs font-mono rounded-full border border-white/15">R-06</span>
                  <span className="px-2 py-0.5 bg-cyan-900/40 text-cyan-200 text-xs font-bold tracking-widest rounded-full border border-cyan-400/30">ENGINEERING</span>
                </div>
                <p className="text-cyan-100 text-sm">Site Engineering · Platform &amp; Infrastructure</p>
                <p className="text-cyan-300 text-xs mt-0.5 flex items-center gap-1">
                  <Terminal className="w-3 h-3" />
                  Reports to Nirmal · Team calls him Chief
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 border border-white/20 rounded-full">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-xs font-semibold text-white">Online</span>
              </div>
              <button
                onClick={reset}
                title="Clear conversation"
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white/80 hover:text-white transition-all"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Responsibilities strip */}
          <div className="mt-4 flex flex-wrap gap-2">
            {['Architecture', 'Code Health', 'Deployments', 'Bug Triage', 'Technical Risk', 'Infra'].map(tag => (
              <span key={tag} className="px-2.5 py-1 bg-white/10 text-cyan-100 text-xs rounded-full border border-white/15">{tag}</span>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto bg-cyan-50/40 px-5 py-5 space-y-4">
          {historyLoading ? (
            <div className="flex justify-start">
              <div className="bg-white border border-cyan-100 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm">
                <div className="flex gap-1 items-center h-4">
                  {[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce opacity-70" style={{ animationDelay: `${i * 0.18}s` }} />)}
                </div>
              </div>
            </div>
          ) : messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'ai' && (
                <div className="w-8 h-8 rounded-full bg-cyan-100 border-2 border-cyan-300 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                  <Wrench className="w-3.5 h-3.5 text-cyan-600" />
                </div>
              )}
              <div className={`max-w-[72%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                m.role === 'ai'
                  ? 'bg-white border border-cyan-200 text-gray-800 rounded-tl-sm'
                  : 'bg-cyan-700 text-white rounded-tr-sm'
              }`}>
                {m.content}
              </div>
            </div>
          ))}
          {typing && (
            <div className="flex justify-start">
              <div className="w-8 h-8 rounded-full bg-cyan-100 border-2 border-cyan-300 flex items-center justify-center mr-2 flex-shrink-0">
                <Wrench className="w-3.5 h-3.5 text-cyan-600" />
              </div>
              <div className="bg-white border border-cyan-200 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm">
                {retryLabel ? (
                  <span className="text-xs text-cyan-500">{retryLabel}</span>
                ) : (
                  <div className="flex gap-1 items-center h-4">
                    {[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce opacity-70" style={{ animationDelay: `${i * 0.18}s` }} />)}
                  </div>
                )}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="flex-shrink-0 bg-white border-t border-cyan-100 px-4 py-4 rounded-b-2xl border border-cyan-200">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Message Noori (Site Engineering)…"
              disabled={typing}
              className="flex-1 px-4 py-2.5 rounded-xl border border-cyan-200 text-sm bg-white text-gray-800 placeholder-cyan-400 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 transition-all disabled:opacity-50"
            />
            <button
              onClick={send}
              disabled={!input.trim() || typing}
              className="w-10 h-10 bg-cyan-700 hover:bg-cyan-600 disabled:bg-cyan-200 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-400 text-center mt-2">Internal boardroom · Noori (Site Engineering) · Property Herald</p>
        </div>
      </div>
    </AdminLayout>
  );
}
