import { useState, useRef, useEffect, useCallback } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import { Send, Search, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ToolCall { tool: string; args: Record<string, unknown>; result: unknown; }
interface Msg { role: 'user' | 'ai'; content: string; toolCalls?: ToolCall[]; }

const INTRO = "Audit mode active, Chief. Read-only access to live data and code — ask me to check anything.";

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/noori-audit`;

const EXAMPLE_PROMPTS = [
  'Give me a platform health snapshot',
  'Check the last 10 token transactions for anything odd',
  'Look up the listing called ABC',
];

export function NooriAuditPage() {
  const { session } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([{ role: 'ai', content: INTRO }]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typing]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || typing) return;

    if (!session?.access_token) {
      setMessages(m => [...m, { role: 'user', content: trimmed }, { role: 'ai', content: 'No active session found — please refresh and sign in again.' }]);
      return;
    }

    const updated: Msg[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(updated);
    setInput('');
    setTyping(true);

    try {
      const res = await fetch(EDGE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          message: trimmed,
          conversationHistory: updated.map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content })),
        }),
        signal: AbortSignal.timeout(45000),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Error ${res.status}`);
      }

      const data = await res.json();
      setMessages(m => [...m, { role: 'ai', content: data.reply || 'No response.', toolCalls: data.tool_calls || [] }]);
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'unknown error';
      setMessages(m => [...m, { role: 'ai', content: `Audit check failed: ${detail}. Try again.` }]);
    } finally {
      setTyping(false);
    }
  }, [messages, typing, session]);

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
  }

  return (
    <AdminLayout>
      <div className="flex flex-col h-[calc(100vh-130px)]">

        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-amber-800 to-amber-700 rounded-t-2xl px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center shadow-lg">
              <ShieldAlert className="w-7 h-7 text-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h2 className="text-white font-bold text-xl">Noori — Audit Mode</h2>
                <span className="px-2 py-0.5 bg-amber-900/40 text-amber-200 text-xs font-bold tracking-widest rounded-full border border-amber-400/30">READ-ONLY</span>
              </div>
              <p className="text-amber-100 text-sm">Live database + code checks · No write access, anywhere</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map(p => (
              <button
                key={p}
                onClick={() => send(p)}
                disabled={typing}
                className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-amber-100 text-xs rounded-full border border-white/15 transition-all disabled:opacity-50"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto bg-amber-50/40 px-5 py-5 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'ai' && (
                <div className="w-8 h-8 rounded-full bg-amber-100 border-2 border-amber-300 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                  <Search className="w-3.5 h-3.5 text-amber-600" />
                </div>
              )}
              <div className="max-w-[78%]">
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                  m.role === 'ai'
                    ? 'bg-white border border-amber-200 text-gray-800 rounded-tl-sm'
                    : 'bg-amber-700 text-white rounded-tr-sm'
                }`}>
                  {m.content}
                </div>
                {m.toolCalls && m.toolCalls.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {m.toolCalls.map((tc, j) => (
                      <span key={j} className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[11px] rounded-full border border-amber-200">
                        checked: {tc.tool}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {typing && (
            <div className="flex justify-start">
              <div className="w-8 h-8 rounded-full bg-amber-100 border-2 border-amber-300 flex items-center justify-center mr-2 flex-shrink-0">
                <Search className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <div className="bg-white border border-amber-200 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm">
                <div className="flex gap-1 items-center h-4">
                  {[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce opacity-70" style={{ animationDelay: `${i * 0.18}s` }} />)}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="flex-shrink-0 bg-white border-t border-amber-100 px-4 py-4 rounded-b-2xl border border-amber-200">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask Noori to check something…"
              disabled={typing}
              className="flex-1 px-4 py-2.5 rounded-xl border border-amber-200 text-sm bg-white text-gray-800 placeholder-amber-400 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all disabled:opacity-50"
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || typing}
              className="w-10 h-10 bg-amber-700 hover:bg-amber-600 disabled:bg-amber-200 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-400 text-center mt-2">Read-only audit · Noori · Property Herald</p>
        </div>
      </div>
    </AdminLayout>
  );
}
