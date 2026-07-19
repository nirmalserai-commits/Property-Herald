import type { Persona } from '../pages/BoardroomPage';

interface VoiceProfile {
  pitch: number;
  rate: number;
  volume: number;
}

// Each persona sounds distinct: Neena warm & measured, Nora crisp, Nita bright & quick.
const PROFILES: Record<Persona, VoiceProfile> = {
  neena: { pitch: 0.85, rate: 0.92, volume: 1 },
  nora: { pitch: 1.0, rate: 1.06, volume: 1 },
  nita: { pitch: 1.2, rate: 1.12, volume: 1 },
};

const FEMALE_HINTS = ['female', 'woman', 'samantha', 'veena', 'kalpana', 'priya', 'tara', 'aria', 'jenny', 'zira', 'heera', 'rishi', 'google'];
const MALE_HINTS = ['male', 'man', 'david', 'ravi', 'hemant', 'alex', 'daniel', 'fred', 'george'];

function isFemaleVoice(v: SpeechSynthesisVoice): boolean {
  const n = v.name.toLowerCase();
  if (MALE_HINTS.some(h => n.includes(h))) return false;
  return FEMALE_HINTS.some(h => n.includes(h));
}

function isIndianLang(v: SpeechSynthesisVoice): boolean {
  return v.lang === 'en-IN' || v.lang === 'hi-IN' || v.lang.startsWith('en-IN') || v.lang.startsWith('hi-IN');
}

let assignments: Record<Persona, SpeechSynthesisVoice | null> = { neena: null, nora: null, nita: null };
let ready = false;

export function ttsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function sttSupported(): boolean {
  return typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
}

export function initVoices(): Promise<void> {
  return new Promise((resolve) => {
    if (!ttsSupported()) { resolve(); return; }

    const assign = () => {
      const all = window.speechSynthesis.getVoices();
      if (all.length === 0) return;

      const indianFemale = all.filter(v => isIndianLang(v) && isFemaleVoice(v));
      const indian = all.filter(v => isIndianLang(v));
      const enFemale = all.filter(v => v.lang.startsWith('en') && isFemaleVoice(v));
      const pool = [...indianFemale, ...indian, ...enFemale];

      if (pool.length >= 3) {
        assignments.neena = pool[0];
        assignments.nora = pool[1];
        assignments.nita = pool[2];
      } else if (pool.length === 2) {
        assignments.neena = pool[0];
        assignments.nora = pool[1];
        assignments.nita = pool[0];
      } else if (pool.length === 1) {
        assignments.neena = pool[0];
        assignments.nora = pool[0];
        assignments.nita = pool[0];
      }

      ready = true;
    };

    assign();
    if (ready) { resolve(); return; }

    window.speechSynthesis.onvoiceschanged = () => { assign(); resolve(); };
    setTimeout(() => { assign(); resolve(); }, 1500);
  });
}

let keepAlive: ReturnType<typeof setInterval> | null = null;

export function speak(text: string, persona: Persona): void {
  if (!ttsSupported()) return;

  const clean = text
    .replace(/[#*_`>~]/g, '')
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
    .replace(/\n+/g, '. ')
    .trim();
  if (!clean) return;

  window.speechSynthesis.cancel();

  const utter = new SpeechSynthesisUtterance(clean);
  const voice = assignments[persona];
  if (voice) { utter.voice = voice; utter.lang = voice.lang; }
  else { utter.lang = 'en-IN'; }

  const p = PROFILES[persona];
  utter.pitch = p.pitch;
  utter.rate = p.rate;
  utter.volume = p.volume;

  window.speechSynthesis.speak(utter);

  // Chrome bug: long speech pauses after ~15s. Periodic resume keeps it alive.
  if (keepAlive) clearInterval(keepAlive);
  keepAlive = setInterval(() => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.resume();
    } else {
      if (keepAlive) { clearInterval(keepAlive); keepAlive = null; }
    }
  }, 5000);
  utter.onend = () => { if (keepAlive) { clearInterval(keepAlive); keepAlive = null; } };
}

export function stopSpeaking(): void {
  if (!ttsSupported()) return;
  if (keepAlive) { clearInterval(keepAlive); keepAlive = null; }
  window.speechSynthesis.cancel();
}

export function isSpeaking(): boolean {
  return ttsSupported() && window.speechSynthesis.speaking;
}

// ── Speech-to-text ──────────────────────────────────────────────────────────

interface STTCallbacks {
  onInterim?: (text: string) => void;
  onFinal: (text: string) => void;
  onError?: (err: string) => void;
  onEnd?: () => void;
}

export function startListening(callbacks: STTCallbacks): () => void {
  const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
  if (!SR) { callbacks.onError?.('Speech recognition not supported on this browser'); return () => {}; }

  const rec = new SR();
  rec.lang = 'en-IN';
  rec.continuous = false;
  rec.interimResults = true;
  rec.maxAlternatives = 1;

  let finalTranscript = '';

  rec.onresult = (e: any) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) finalTranscript += t;
      else interim += t;
    }
    if (interim) callbacks.onInterim?.((finalTranscript + interim).trim());
  };
  rec.onerror = (e: any) => callbacks.onError?.(e.error || 'Recognition error');
  rec.onend = () => {
    callbacks.onFinal?.(finalTranscript.trim());
    callbacks.onEnd?.();
  };

  try { rec.start(); } catch {
    callbacks.onError?.('Could not start microphone');
    return () => {};
  }

  return () => { try { rec.stop(); } catch { /* already stopped */ } };
}
