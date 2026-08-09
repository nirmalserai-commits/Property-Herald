import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Sparkles } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
}

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/neetu-chat`;

export function NeetuChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [conversationStartedAt] = useState(() => new Date().toISOString());
  const [wrapUpNotice, setWrapUpNotice] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || typing) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
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
          conversationHistory: history.map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content })),
          conversationStartedAt,
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      const aiMsg: ChatMessage = { role: 'ai', content: data.reply || 'Sorry, I could not process that. Please try again.' };
      setMessages([...history, aiMsg]);
      if (data.shouldWrapUp) setWrapUpNotice(true);
    } catch {
      const errMsg: ChatMessage = { role: 'ai', content: 'I am having trouble connecting right now. Please try again in a moment.' };
      setMessages([...history, errMsg]);
    } finally {
      setTyping(false);
    }
  }, [messages, typing, conversationStartedAt]);

  function handleOpen() {
    if (!open) {
      setOpen(true);
      if (messages.length === 0) {
        setMessages([{ role: 'ai', content: 'Namaste! Main Neetu hoon, your Home Loans Specialist at Property Herald. I can help you understand your home loan options and pre-qualify you. What is your loan amount range?' }]);
      }
    } else {
      setOpen(false);
    }
  }

  const quickReplies = [
    'I want a home loan under ₹50L',
    'I need a loan above ₹50L',
    'What are current interest rates?',
    'Am I eligible for a home loan?',
  ];

  return (
    <>
      {/* Floating button */}
      <button
        onClick={handleOpen}
        className={`fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 ${open ? 'scale-0' : 'scale-100'}`}
        style={{ backgroundColor: '#0a1628' }}
      >
        <div className="relative">
          <MessageCircle className="w-6 h-6 text-white" />
          <Sparkles className="w-3 h-3 text-amber-400 absolute -top-1 -right-1" />
        </div>
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[calc(100vw-2.5rem)] max-w-sm h-[calc(100vh-7rem)] max-h-[600px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 p-4" style={{ backgroundColor: '#0a1628' }}>
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 flex-shrink-0" style={{ borderColor: '#c9a84c' }}>
              <img src="/nora-chat.png.png" alt="Neetu" className="w-full h-full object-cover object-top" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-bold text-sm">Neetu</h3>
              <p className="text-amber-400 text-xs">Home Loans Specialist · Online</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm ${
                  msg.role === 'user'
                    ? 'bg-navy text-white rounded-br-sm'
                    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            {wrapUpNotice && (
              <div className="text-center">
                <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full">
                  This conversation is wrapping up. Visit /home-loans to continue.
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick replies (show first 4 messages) */}
          {messages.length <= 1 && !typing && (
            <div className="px-4 pb-2 flex flex-wrap gap-2">
              {quickReplies.map(qr => (
                <button
                  key={qr}
                  onClick={() => sendMessage(qr)}
                  className="text-xs px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-600 hover:border-amber-400 hover:text-navy transition-colors"
                >
                  {qr}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-gray-100">
            <form
              onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
              className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-200 focus-within:border-amber-400/40 transition-colors"
            >
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask Neetu about home loans…"
                className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none min-w-0"
              />
              <button
                type="submit"
                disabled={!input.trim() || typing}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white disabled:opacity-40 transition-opacity"
                style={{ backgroundColor: '#0a1628' }}
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <p className="text-[10px] text-gray-400 text-center mt-1.5">AI guidance only — not a binding quote or offer. Powered by Claude.</p>
          </div>
        </div>
      )}
    </>
  );
}
