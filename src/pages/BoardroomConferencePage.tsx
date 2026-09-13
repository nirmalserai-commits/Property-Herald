import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Send, Users, Crown, Shield, Brain, MapPin, Wrench, Check, X, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { Persona } from '../types/database';

const PERSONA_ICONS: Record<Persona, typeof Crown> = {
  neena: Crown, nora: Shield, nita: Brain, neetu: Shield, naksha: MapPin, noori: Wrench,
};

const PERSONA_COLORS: Record<Persona, string> = {
  neena: 'text-rose-300 bg-rose-900/40 border-rose-800/40',
  nora: 'text-amber-300 bg-amber-900/40 border-amber-800/40',
  nita: 'text-blue-300 bg-blue-900/40 border-blue-800/40',
  neetu: 'text-emerald-300 bg-emerald-900/40 border-emerald-800/40',
  naksha: 'text-orange-300 bg-orange-900/40 border-orange-800/40',
  noori: 'text-cyan-300 bg-cyan-900/40 border-cyan-800/40',
};

const AVAILABLE_PERSONAS: Persona[] = ['nora', 'nita', 'neetu', 'naksha', 'noori'];

interface ConferenceMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  speaker?: string;
}

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/boardroom-conference`;

export function BoardroomConferencePage() {
  const { session, loading: authLoading } = useAuth();
  const [selected, setSelected] = useState<Persona[]>(['nora', 'nita']);
  const [showSelector, setShowSelector] = useState(true);
  const [messages, setMessages] = useState<ConferenceMessage[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null);
  const [sessionId] = useState(() => crypto.randomUUID());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  function togglePersona(p: Persona) {
    setSelected(prev => {
      if (prev.includes(p)) return prev.filter(x => x !== p);
      if (prev.length >= 3) return prev;
      return [...prev, p];
    });
  }

  const send = useCallback(async (text: string) => {
    if (!text.trim() || typing || selected.length < 2) return;

    const userMsg: ConferenceMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
    };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setTyping(true);

    try {
      const res = await fetch(EDGE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          message: text,
          personas: selected,
          conversationHistory: history.map(m => ({
            role: m.role === 'ai' ? 'assistant' : 'user',
            content: m.content,
            speaker: m.speaker,
          })),
        }),
        signal: AbortSignal.timeout(90000),
      });

      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();

      const newMsgs: ConferenceMessage[] = [];
      for (const reply of data.replies || []) {
        setActiveSpeaker(reply.persona);
        await new Promise(r => setTimeout(r, 400));
        newMsgs.push({
          id: crypto.randomUUID(),
          role: 'ai',
          content: reply.reply,
          speaker: reply.persona,
        });
        setMessages([...history, ...newMsgs]);
      }
      setActiveSpeaker(null);
    } catch {
      setMessages([...history, {
        id: crypto.randomUUID(),
        role: 'ai',
        content: 'The boardroom is having connectivity issues. Please try again.',
      }]);
    } finally {
      setTyping(false);
    }
  }, [messages, typing, selected]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh] bg-gray-950">
        <div className="w-8 h-8 border-2 border-gray-700 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh] bg-gray-950 px-6">
        <div className="text-center">
          <Users className="w-16 h-16 text-amber-600 mx-auto mb-4" />
          <h1 className="text-white font-bold text-xl mb-2">Boardroom Access Required</h1>
          <a href="/login" className="inline-block px-8 py-3 bg-amber-700 hover:bg-amber-600 text-white rounded-xl text-sm font-semibold transition-all">
            Go to Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-gray-950 max-w-2xl mx-auto relative">
      {/* Persona hub navigation */}
      <div className="flex items-center gap-1 px-2 py-2 bg-gray-900 border-b border-gray-800 overflow-x-auto flex-shrink-0 scrollbar-hide">
        <Link to="/boardroom" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap bg-white/5 text-gray-500 hover:bg-white/10 hover:text-gray-300">
          <ArrowLeft className="w-3.5 h-3.5" />
          Hub
        </Link>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap bg-amber-900/40 text-amber-300 border border-amber-800/40">
          <Users className="w-3.5 h-3.5" />
          Conference
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-amber-950 to-gray-950 border-b border-amber-900/40 flex-shrink-0">
        <div className="w-10 h-10 rounded-xl bg-amber-900/80 border border-amber-600/50 flex items-center justify-center flex-shrink-0">
          <Users className="w-5 h-5 text-amber-300" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-white font-bold text-sm">Boardroom Conference</h2>
          <p className="text-amber-400/70 text-xs">
            {selected.length === 0
              ? 'Select attendees to begin'
              : `${selected.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' + ')} in session`}
          </p>
        </div>
        <button
          onClick={() => setShowSelector(s => !s)}
          className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200 transition-colors"
        >
          {showSelector ? 'Hide' : 'Attendees'}
        </button>
      </div>

      {/* Attendee selector */}
      {showSelector && (
        <div className="p-4 bg-gray-900 border-b border-gray-800 flex-shrink-0">
          <p className="text-xs text-gray-500 mb-3">Select 2-3 boardroom members for this session (free to change each time):</p>
          <div className="grid grid-cols-2 gap-2">
            {AVAILABLE_PERSONAS.map(p => {
              const Icon = PERSONA_ICONS[p];
              const active = selected.includes(p);
              return (
                <button
                  key={p}
                  onClick={() => togglePersona(p)}
                  className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-left ${
                    active
                      ? PERSONA_COLORS[p]
                      : 'bg-white/5 text-gray-500 border-gray-800 hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm font-medium capitalize">{p}</span>
                  {active && <Check className="w-3.5 h-3.5 ml-auto" />}
                </button>
              );
            })}
          </div>
          {selected.length < 2 && (
            <p className="text-xs text-amber-600 mt-2">Select at least 2 members to start the conference.</p>
          )}
          {selected.length > 0 && (
            <button
              onClick={() => { setShowSelector(false); }}
              className="w-full mt-3 py-2 rounded-lg bg-amber-800 hover:bg-amber-700 text-white text-sm font-semibold transition-colors"
            >
              Start Conference with {selected.length} Member{selected.length > 1 ? 's' : ''}
            </button>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && !typing && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-800 mx-auto mb-4" />
            <p className="text-gray-600 text-sm">
              {selected.length >= 2
                ? 'Address the boardroom — your message will be seen by all selected members.'
                : 'Select at least 2 boardroom members above to begin.'}
            </p>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'ai' && msg.speaker && (() => {
              const Icon = PERSONA_ICONS[msg.speaker as Persona];
              return <Icon className={`w-5 h-5 mt-1 mr-2 flex-shrink-0 ${PERSONA_COLORS[msg.speaker as Persona]?.split(' ')[0]}`} />;
            })()}
            <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm ${
              msg.role === 'user'
                ? 'bg-navy text-white rounded-br-sm'
                : msg.speaker
                  ? `${PERSONA_COLORS[msg.speaker as Persona] ?? 'bg-gray-800 text-gray-100'} rounded-bl-sm`
                  : 'bg-gray-800 text-gray-100 rounded-bl-sm'
            }`}>
              {msg.role === 'ai' && msg.speaker && (
                <p className="text-xs font-semibold mb-1 opacity-70 capitalize">{msg.speaker}</p>
              )}
              {msg.content}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex justify-start">
            {activeSpeaker && (() => {
              const Icon = PERSONA_ICONS[activeSpeaker as Persona];
              return <Icon className={`w-5 h-5 mt-1 mr-2 flex-shrink-0 animate-pulse ${PERSONA_COLORS[activeSpeaker as Persona]?.split(' ')[0]}`} />;
            })()}
            <div className="bg-gray-800 border border-gray-700/40 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-800 bg-gray-900 flex-shrink-0">
        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={selected.length >= 2 ? 'Address the boardroom…' : 'Select attendees first…'}
            disabled={selected.length < 2}
            className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 text-gray-100 placeholder-gray-600 rounded-xl text-[15px] outline-none focus:ring-2 focus:ring-amber-900/40 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || typing || selected.length < 2}
            className="w-11 h-11 flex-shrink-0 rounded-xl flex items-center justify-center text-gray-950 bg-amber-500 active:bg-amber-400 disabled:opacity-40 active:scale-95 transition-all"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
        <p className="text-[10px] text-gray-600 text-center mt-1.5">AI guidance only — not a binding quote or offer. Powered by Claude.</p>
      </div>
    </div>
  );
}
