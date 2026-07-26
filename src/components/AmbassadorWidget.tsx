import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Ambassador, ChatMessage } from '../types/database';
import { X, Send, Minimize2, ChevronDown, ArrowRight } from 'lucide-react';

const QUICK_REPLIES = [
  { label: 'Browse Properties', response: 'I would love to help you find properties! Head to our Directory to browse listings filtered by city, type, budget and more. Every listing is manually reviewed. Shall I tell you about our top corridors?' },
  { label: 'List My Business', response: 'Excellent! Property Herald is the premier platform for developers, agencies, and agents across India. Register as a developer or agent, list your properties, and connect directly with buyers via WhatsApp. Shall I walk you through the registration process?' },
  { label: 'Token Economy', response: 'Property Herald uses a token-based system that gives you full control over your marketing spend. Tokens power WhatsApp leads, featured listings, magazine ads, and more. 1 token = ₹20, with 5 bundles from Starter (100 tokens) to Enterprise (3,250 tokens). Would you like to see our bundle options?' },
  { label: 'Magazine Advertising', response: 'Our weekly digital magazine reaches 1,00,000+ property buyers. Advertising options include Half Page (60 tokens), Full Page (100 tokens), and Cover Page (250 tokens). The magazine is distributed via curated WhatsApp groups for maximum reach. Shall I tell you more?' },
  { label: 'SBI Home Loans', response: 'Every Property Herald listing comes with an integrated SBI Home Loan calculator. You can check your EMI instantly, compare rates across SBI, HDFC, and ICICI, and apply for pre-approval — all from within any listing page. Current SBI rates start from 8.5% p.a. Interested?' },
  { label: 'Speak to Expert', response: 'Of course! I will connect you with Nirmal Serai, Property Herald\'s founder. Please register on the platform and our team will reach out to you directly.' },
];

interface GuidedAnswer {
  dealType?: string;
  city?: string;
  budget?: string;
  propertyType?: string;
  timeline?: string;
  whatsapp?: string;
}

const GUIDED_QUESTIONS = [
  {
    id: 'dealType',
    question: 'What are you looking for?',
    options: ['Buy a Property', 'Rent a Property', 'Invest in Real Estate'],
    points: 15,
  },
  {
    id: 'city',
    question: 'Which city interests you most?',
    options: ['Mumbai', 'Pune', 'Thane / Navi Mumbai', 'Nashik', 'Other City'],
    points: 15,
  },
  {
    id: 'budget',
    question: "What's your budget range?",
    options: ['Under ₹50 Lakhs', '₹50L – ₹1 Crore', '₹1Cr – ₹2 Crore', '₹2Cr – ₹5 Crore', 'Above ₹5 Crore'],
    points: 20,
  },
  {
    id: 'propertyType',
    question: 'What type of property?',
    options: ['Residential', 'Commercial', 'Both / Not Sure'],
    points: 15,
  },
  {
    id: 'timeline',
    question: 'When do you plan to buy?',
    options: ['Immediately', 'Within 3 Months', 'Within 6 Months', 'Within 1 Year', 'Just Exploring'],
    points: 15,
  },
];

function calcScore(answers: GuidedAnswer, whatsappProvided: boolean): number {
  let score = 0;
  if (answers.dealType) score += 15;
  if (answers.city) score += 15;
  if (answers.budget) score += 20;
  if (answers.propertyType) score += 15;
  if (answers.timeline) score += 15;
  if (whatsappProvided) score += 20;
  return Math.min(100, score);
}

function detectAmbassadorLanguage(ambassadors: Ambassador[]): Ambassador | null {
  if (!ambassadors.length) return null;

  // Always prefer the designated customer-facing ambassador (Nora, R-02)
  const customerFacing = ambassadors
    .filter(a => a.active)
    .find(a => (a.assignment_rules as Record<string, unknown>)?.customer_facing === true);
  if (customerFacing) return customerFacing;

  // Fallback: browser language match among active ambassadors
  const browserLang = navigator.language?.toLowerCase() ?? 'en';
  const langCode = browserLang.split('-')[0];
  const matched = ambassadors
    .filter(a => a.active)
    .find(a => a.assignment_rules?.languages?.includes(langCode));
  if (matched) return matched;

  // Final fallback: first active ambassador marked fallback, then any active
  const fallback = ambassadors.find(a => a.active && a.assignment_rules?.fallback);
  return fallback ?? ambassadors.find(a => a.active) ?? null;
}

function sessionId(): string {
  const key = 'ph_session_id';
  let sid = sessionStorage.getItem(key);
  if (!sid) {
    sid = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem(key, sid);
  }
  return sid;
}

function visitorId(): string {
  const key = 'ph_visitor_id';
  let vid = localStorage.getItem(key);
  if (!vid) {
    vid = `v-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem(key, vid);
  }
  return vid;
}

export function AmbassadorWidget() {
  const { user } = useAuth();
  const [ambassadors, setAmbassadors] = useState<Ambassador[]>([]);
  const [active, setActive] = useState<Ambassador | null>(null);
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [intentScore, setIntentScore] = useState(0);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [noraRestMode, setNoraRestMode] = useState(false);

  // Guided mode state
  const [guidedMode, setGuidedMode] = useState(true);
  const [guidedStep, setGuidedStep] = useState(0); // 0 = not started, 1-5 = questions, 6 = whatsapp, 7 = done
  const [guidedAnswers, setGuidedAnswers] = useState<GuidedAnswer>({});
  const [whatsappInput, setWhatsappInput] = useState('');
  const [guidedComplete, setGuidedComplete] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check if guided mode was already completed
    const completed = localStorage.getItem('ph_guided_complete');
    if (completed) {
      setGuidedMode(false);
      setGuidedComplete(true);
    }
    // Check Nora Rest Mode
    supabase.from('site_flags').select('flag_value').eq('flag_name', 'nora_rest_mode').maybeSingle()
      .then(({ data }) => { if (data) setNoraRestMode((data as { flag_value: boolean }).flag_value); });
  }, []);

  useEffect(() => {
    supabase
      .from('ambassadors')
      .select('*')
      .eq('active', true)
      .order('sort_order')
      .then(({ data }) => {
        if (data && data.length > 0) {
          const list = data as Ambassador[];
          setAmbassadors(list);
          const chosen = detectAmbassadorLanguage(list);
          setActive(chosen);
        }
      });
  }, []);

  // Auto-open after 8s on first visit
  useEffect(() => {
    if (!active) return;
    const shown = sessionStorage.getItem('ph_widget_shown');
    if (shown) return;
    const t = setTimeout(() => {
      setOpen(true);
      sessionStorage.setItem('ph_widget_shown', '1');
    }, 8000);
    return () => clearTimeout(t);
  }, [active]);

  useEffect(() => {
    if (open && !minimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open, minimized, guidedStep]);

  useEffect(() => {
    if (open && !minimized && !guidedMode) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, minimized, guidedMode]);

  const initConversation = useCallback(async (amb: Ambassador) => {
    const greeting: ChatMessage = {
      role: 'ambassador',
      content: amb.greeting,
      timestamp: new Date().toISOString(),
    };
    setMessages([greeting]);

    const { data } = await supabase
      .from('ambassador_conversations')
      .insert({
        ambassador_id: amb.id,
        visitor_id: visitorId(),
        session_id: sessionId(),
        messages_json: [greeting],
        intent_score: 0,
        converted: false,
        escalated: false,
      })
      .select('id')
      .maybeSingle();

    if (data) setConversationId(data.id);

    await supabase.rpc('increment_ambassador_count', { p_ambassador_id: amb.id }).catch(() => {});
  }, []);

  const openChat = useCallback(async () => {
    if (!active) return;
    setOpen(true);
    setMinimized(false);

    if (messages.length === 0) {
      await initConversation(active);
      // If guided mode, kick off step 1
      if (guidedMode) {
        setGuidedStep(1);
      }
    }
  }, [active, messages.length, guidedMode, initConversation]);

  const handleGuidedAnswer = useCallback(async (questionId: string, answer: string) => {
    const newAnswers = { ...guidedAnswers, [questionId]: answer };
    setGuidedAnswers(newAnswers);

    const q = GUIDED_QUESTIONS.find(q => q.id === questionId);
    const userMsg: ChatMessage = {
      role: 'user',
      content: answer,
      timestamp: new Date().toISOString(),
    };
    const nextStep = guidedStep + 1;

    let ambassadorContent = '';
    if (nextStep <= 5) {
      const nextQ = GUIDED_QUESTIONS[nextStep - 1];
      ambassadorContent = nextQ.question;
    } else if (nextStep === 6) {
      ambassadorContent = 'Almost done! Share your WhatsApp number so our team can reach you with matching properties. (You can skip this step.)';
    }

    const ambassadorMsg: ChatMessage = {
      role: 'ambassador',
      content: ambassadorContent,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = nextStep <= 6
      ? [...messages, userMsg, ambassadorMsg]
      : [...messages, userMsg];

    setMessages(updatedMessages);

    const partialScore = calcScore(newAnswers, false);
    setIntentScore(partialScore);
    setGuidedStep(nextStep);

    if (conversationId && q) {
      await supabase
        .from('ambassador_conversations')
        .update({
          messages_json: updatedMessages,
          intent_score: partialScore,
        })
        .eq('id', conversationId);
    }
  }, [guidedAnswers, guidedStep, messages, conversationId]);

  const handleWhatsappSubmit = useCallback(async (skip = false) => {
    const wp = skip ? '' : whatsappInput.trim();
    const finalScore = calcScore(guidedAnswers, !skip && wp.length > 0);
    setIntentScore(finalScore);

    const completionMsg: ChatMessage = {
      role: 'ambassador',
      content: `Thanks! Based on your answers, your interest score is **${finalScore}/100**. I've noted your preferences — ${guidedAnswers.dealType?.toLowerCase() ?? 'property'} in **${guidedAnswers.city ?? 'your chosen city'}**, budget **${guidedAnswers.budget ?? 'flexible'}**. You can register as a buyer to unlock full listing access and get matched with verified developers!`,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = skip
      ? [...messages, completionMsg]
      : [...messages, { role: 'user' as const, content: wp, timestamp: new Date().toISOString() }, completionMsg];

    setMessages(updatedMessages);
    setGuidedStep(7);
    setGuidedMode(false);
    setGuidedComplete(true);
    localStorage.setItem('ph_guided_complete', '1');

    // Save buyer record to DB (anon insert)
    const budgetMap: Record<string, { min: number; max: number }> = {
      'Under ₹50 Lakhs': { min: 0, max: 5000000 },
      '₹50L – ₹1 Crore': { min: 5000000, max: 10000000 },
      '₹1Cr – ₹2 Crore': { min: 10000000, max: 20000000 },
      '₹2Cr – ₹5 Crore': { min: 20000000, max: 50000000 },
      'Above ₹5 Crore': { min: 50000000, max: 999999999 },
    };
    const budgetRange = guidedAnswers.budget ? budgetMap[guidedAnswers.budget] : null;

    const dealTypeMap: Record<string, string> = {
      'Buy a Property': 'buy',
      'Rent a Property': 'rent',
      'Invest in Real Estate': 'invest',
    };
    const propTypeMap: Record<string, string> = {
      'Residential': 'residential',
      'Commercial': 'commercial',
      'Both / Not Sure': 'both',
    };
    const timelineMap: Record<string, string> = {
      'Immediately': 'immediate',
      'Within 3 Months': '3_months',
      'Within 6 Months': '6_months',
      'Within 1 Year': '1_year',
      'Just Exploring': 'flexible',
    };

    await supabase.from('buyers').insert({
      full_name: '',
      email: '',
      phone: wp || '',
      city_preference: guidedAnswers.city ?? null,
      budget_label: guidedAnswers.budget ?? null,
      budget_min: budgetRange?.min ?? null,
      budget_max: budgetRange?.max ?? null,
      property_type: guidedAnswers.propertyType ? propTypeMap[guidedAnswers.propertyType] : null,
      deal_type: guidedAnswers.dealType ? dealTypeMap[guidedAnswers.dealType] : null,
      timeline: guidedAnswers.timeline ? timelineMap[guidedAnswers.timeline] : null,
      intent_score: finalScore,
      nora_conversation_id: conversationId ?? null,
      source: 'widget',
    }).catch(() => {});

    if (conversationId) {
      await supabase
        .from('ambassador_conversations')
        .update({
          messages_json: updatedMessages,
          intent_score: finalScore,
          escalated: finalScore >= 75,
        })
        .eq('id', conversationId);
    }
  }, [guidedAnswers, whatsappInput, messages, conversationId]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || !active) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };

    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setShowQuickReplies(false);
    setTyping(true);

    const newScore = Math.min(100, intentScore + 12);
    setIntentScore(newScore);

    let reply = "I'm here to help! What would you like to know about Property Herald?";
    try {
      const supabaseUrl = '/supabase';
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const res = await fetch(`${supabaseUrl}/functions/v1/nora-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ messages: updated, user_id: user?.id || null }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.reply) reply = data.reply;
      }
    } catch {
      // fallback to default reply
    }

    const ambassadorMsg: ChatMessage = {
      role: 'ambassador',
      content: reply,
      timestamp: new Date().toISOString(),
    };

    const finalMessages = [...updated, ambassadorMsg];
    setMessages(finalMessages);
    setTyping(false);

    if (finalMessages.filter(m => m.role === 'user').length % 3 === 0) {
      setShowQuickReplies(true);
    }

    if (conversationId) {
      await supabase
        .from('ambassador_conversations')
        .update({
          messages_json: finalMessages,
          intent_score: newScore,
          updated_at: new Date().toISOString(),
          escalated: newScore >= 75,
        })
        .eq('id', conversationId);
    }
  }, [active, messages, intentScore, conversationId]);

  if (!active || dismissed) return null;

  if (noraRestMode) {
    return (
      <div className="fixed bottom-4 right-4 z-50 max-w-xs">
        <div className="bg-white rounded-2xl shadow-2xl border border-gold/30 p-5 text-center">
          <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">💤</span>
          </div>
          <p className="text-sm text-gray-600">Nora is resting for a moment. Please email <a href="mailto:support@propertyherald.in" className="text-gold font-medium">support@propertyherald.in</a> and she will be back with you very soon.</p>
        </div>
      </div>
    );
  }

  const currentGuidedQuestion = guidedStep >= 1 && guidedStep <= 5 ? GUIDED_QUESTIONS[guidedStep - 1] : null;

  return (
    <>
      {/* Floating button */}
      {!open && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
          <div className="bg-navy text-cream text-sm px-4 py-2.5 rounded-2xl rounded-br-sm shadow-xl border border-gold/20 max-w-[220px] animate-fade-in relative">
            <button
              onClick={() => setDismissed(true)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-400 hover:bg-gray-500 rounded-full flex items-center justify-center transition-colors"
            >
              <X className="w-2.5 h-2.5 text-white" />
            </button>
            <p className="leading-snug">Hi! I'm <span className="text-gold font-semibold">{active.name}</span>. Need help finding quality properties?</p>
          </div>

          <button
            onClick={openChat}
            className="w-14 h-14 rounded-full bg-navy border-2 border-gold shadow-2xl flex items-center justify-center hover:scale-105 transition-all gold-glow group overflow-hidden"
            aria-label={`Chat with ${active.name}`}
          >
            {active.avatar_url ? (
              <img src={active.avatar_url} alt={active.name} className="w-full h-full rounded-full object-cover object-top" />
            ) : (
              <img src="/nora-chat.png.png" alt="Nora" className="w-full h-full rounded-full object-cover object-top" />
            )}
          </button>
        </div>
      )}

      {/* Chat panel */}
      {open && (
        <div className={`fixed bottom-6 right-6 z-50 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col transition-all duration-300 ${minimized ? 'h-14' : 'h-[560px]'}`}>
          {/* Header */}
          <div
            className="flex items-center gap-3 px-4 py-3 bg-navy rounded-t-2xl cursor-pointer select-none"
            onClick={() => setMinimized(m => !m)}
          >
            <div className="relative flex-shrink-0">
              <div className="w-9 h-9 rounded-full border-2 border-gold overflow-hidden">
                {active.avatar_url ? (
                  <img src={active.avatar_url} alt={active.name} className="w-full h-full object-cover object-top" />
                ) : (
                  <img src="/nora-chat.png.png" alt="Nora" className="w-full h-full object-cover object-top" />
                )}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-navy" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-cream font-semibold text-sm truncate">{active.name}</p>
              <p className="text-cream/50 text-xs truncate">
                {guidedMode && guidedStep >= 1 && guidedStep <= 6
                  ? `Question ${Math.min(guidedStep, 6)} of 6`
                  : `${active.language} · Property Herald`}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {minimized ? (
                <ChevronDown className="w-4 h-4 text-cream/60 rotate-180" />
              ) : (
                <>
                  <button
                    onClick={e => { e.stopPropagation(); setMinimized(true); }}
                    className="p-1 text-cream/60 hover:text-cream rounded transition-colors"
                    aria-label="Minimize"
                  >
                    <Minimize2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setOpen(false); }}
                    className="p-1 text-cream/60 hover:text-cream rounded transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {!minimized && (
            <>
              {/* Messages + Guided UI */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'ambassador' && (
                      <div className="w-7 h-7 rounded-full border-2 border-gold overflow-hidden mr-2 flex-shrink-0 mt-0.5">
                        <img src="/nora-chat.png.png" alt="Nora" className="w-full h-full object-cover object-top" />
                      </div>
                    )}
                    <div className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-navy text-cream rounded-br-sm'
                        : 'bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-100'
                    }`}>
                      {msg.content.split('**').map((part, j) =>
                        j % 2 === 1
                          ? <strong key={j} className={msg.role === 'user' ? 'text-gold' : 'text-navy'}>{part}</strong>
                          : <span key={j}>{part}</span>
                      )}
                    </div>
                  </div>
                ))}

                {/* Guided question options */}
                {guidedMode && currentGuidedQuestion && (
                  <div className="space-y-2 pt-1">
                    {currentGuidedQuestion.options.map(opt => (
                      <button
                        key={opt}
                        onClick={() => handleGuidedAnswer(currentGuidedQuestion.id, opt)}
                        className="w-full text-left px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-sm text-navy font-medium hover:border-gold/50 hover:bg-gold/5 transition-all flex items-center justify-between group shadow-sm"
                      >
                        {opt}
                        <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gold transition-colors flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Q6: WhatsApp input */}
                {guidedMode && guidedStep === 6 && (
                  <div className="space-y-2 pt-1">
                    <div className="flex gap-2">
                      <input
                        type="tel"
                        value={whatsappInput}
                        onChange={e => setWhatsappInput(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-navy outline-none focus:border-gold/50 bg-white"
                        autoFocus
                      />
                      <button
                        onClick={() => handleWhatsappSubmit(false)}
                        disabled={whatsappInput.trim().length < 7}
                        className="px-4 py-2.5 rounded-xl bg-navy text-cream text-sm font-medium hover:bg-navy/90 disabled:opacity-40 transition-all"
                      >
                        Submit
                      </button>
                    </div>
                    <button
                      onClick={() => handleWhatsappSubmit(true)}
                      className="text-xs text-gray-400 hover:text-gray-600 transition-colors underline underline-offset-2"
                    >
                      Skip this step
                    </button>
                  </div>
                )}

                {/* Guided complete — CTA */}
                {guidedComplete && guidedStep === 7 && (
                  <div className="bg-gradient-to-br from-navy/5 to-gold/10 rounded-2xl p-4 border border-gold/20 space-y-3">
                    <p className="text-xs text-gray-600">Register as a buyer to unlock matched listings, show apartment bookings, and priority developer access.</p>
                    <Link
                      to="/register/buyer"
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-navy text-cream rounded-xl text-sm font-semibold hover:bg-navy/90 transition-all"
                    >
                      Register as Buyer
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                )}

                {/* Free chat quick replies */}
                {!guidedMode && showQuickReplies && !typing && messages.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {QUICK_REPLIES.slice(0, 4).map(qr => (
                      <button
                        key={qr.label}
                        onClick={() => sendMessage(qr.label)}
                        className="text-xs px-3 py-1.5 rounded-full bg-navy/8 border border-navy/15 text-navy/70 hover:bg-gold/10 hover:border-gold/30 hover:text-navy transition-all font-medium"
                      >
                        {qr.label}
                      </button>
                    ))}
                  </div>
                )}

                {typing && (
                  <div className="flex justify-start">
                    <div className="w-7 h-7 rounded-full border-2 border-gold overflow-hidden mr-2 flex-shrink-0">
                      <img src="/nora-chat.png.png" alt="Nora" className="w-full h-full object-cover object-top" />
                    </div>
                    <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm border border-gray-100 flex items-center gap-1">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="w-2 h-2 bg-navy/40 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Chat input — always visible once widget is open */}
              <div className="px-3 pb-3 pt-2 bg-white rounded-b-2xl border-t border-gray-100">
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    if (!input.trim()) return;
                    // Typing a free-text message exits guided mode immediately
                    if (guidedMode) {
                      setGuidedMode(false);
                      setGuidedComplete(true);
                      localStorage.setItem('ph_guided_complete', '1');
                    }
                    sendMessage(input);
                  }}
                  className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-200 focus-within:border-gold/40 transition-colors"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder={guidedMode ? `Or type a question for ${active.name}…` : `Ask ${active.name}…`}
                    className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none min-w-0"
                    disabled={typing}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || typing}
                    className="flex-shrink-0 w-8 h-8 rounded-lg bg-navy flex items-center justify-center hover:bg-navy/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <Send className="w-3.5 h-3.5 text-gold" />
                  </button>
                </form>
                <p className="text-[10px] text-gray-400 text-center mt-1.5">Powered by Claude AI</p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
