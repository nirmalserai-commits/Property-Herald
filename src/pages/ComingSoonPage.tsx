import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Clock, Mail, Phone, User, MapPin, CheckCircle, Loader2 } from 'lucide-react';

const LAUNCH_DATE = new Date('2026-08-15T00:00:00+05:30');

export function ComingSoonPage() {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', role: '', city: '', agree_updates: false });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = LAUNCH_DATE.getTime() - Date.now();
      if (diff <= 0) { setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 }); return; }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name || !form.email || !form.phone || !form.role) return;
    setSubmitting(true);
    await supabase.from('registrations').insert({
      full_name: form.full_name, email: form.email, phone: form.phone,
      role: form.role as 'developer' | 'real_estate_agency' | 'individual_agent' | 'buyer',
      city: form.city || null, agree_updates: form.agree_updates, status: 'pending',
    });
    setSubmitting(false); setSubmitted(true);
  }

  return (
    <div className="min-h-screen bg-navy flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full text-center">
        <img src="/logo.png.png" alt="Property Herald" className="h-20 w-auto mx-auto mb-8 object-contain"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        <h1 className="text-4xl md:text-6xl font-serif font-bold text-gold mb-4">Coming Soon</h1>
        <p className="text-lg text-cream/70 mb-2">India's first AI-powered real estate platform</p>
        <p className="text-sm text-cream/50 mb-8">India. Intelligence. Integrity.</p>

        <div className="grid grid-cols-4 gap-3 max-w-md mx-auto mb-10">
          {[{ v: timeLeft.days, l: 'Days' }, { v: timeLeft.hours, l: 'Hours' }, { v: timeLeft.minutes, l: 'Minutes' }, { v: timeLeft.seconds, l: 'Seconds' }].map(({ v, l }) => (
            <div key={l} className="bg-gold/10 border border-gold/30 rounded-xl p-3">
              <div className="text-2xl md:text-3xl font-bold text-gold font-mono">{String(v).padStart(2, '0')}</div>
              <div className="text-xs text-cream/50 uppercase tracking-wide mt-1">{l}</div>
            </div>
          ))}
        </div>

        {submitted ? (
          <div className="bg-gold/10 border border-gold/30 rounded-2xl p-8 max-w-md mx-auto">
            <CheckCircle className="w-12 h-12 text-gold mx-auto mb-4" />
            <h2 className="text-xl font-serif font-bold text-cream mb-2">You're on the list!</h2>
            <p className="text-cream/60 text-sm">We'll notify you the moment Property Herald goes live on 15 August 2026.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white/5 border border-gold/20 rounded-2xl p-6 max-w-md mx-auto space-y-4 text-left">
            <h2 className="text-lg font-serif font-bold text-cream text-center mb-2">Get Early Access</h2>
            <div className="relative">
              <User className="absolute left-3 top-3 w-4 h-4 text-cream/40" />
              <input type="text" required placeholder="Full Name" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} className="w-full pl-10 pr-4 py-2.5 bg-navy-800 border border-gold/20 rounded-xl text-cream placeholder:text-cream/30 text-sm focus:border-gold focus:outline-none" />
            </div>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-cream/40" />
              <input type="email" required placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full pl-10 pr-4 py-2.5 bg-navy-800 border border-gold/20 rounded-xl text-cream placeholder:text-cream/30 text-sm focus:border-gold focus:outline-none" />
            </div>
            <div className="relative">
              <Phone className="absolute left-3 top-3 w-4 h-4 text-cream/40" />
              <input type="tel" required placeholder="Phone (with country code)" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full pl-10 pr-4 py-2.5 bg-navy-800 border border-gold/20 rounded-xl text-cream placeholder:text-cream/30 text-sm focus:border-gold focus:outline-none" />
            </div>
            <select required value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="w-full px-4 py-2.5 bg-navy-800 border border-gold/20 rounded-xl text-cream text-sm focus:border-gold focus:outline-none">
              <option value="">Select your role</option>
              <option value="developer">Developer</option>
              <option value="real_estate_agency">Real Estate Agency</option>
              <option value="individual_agent">Individual Agent</option>
              <option value="buyer">Buyer</option>
            </select>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-4 h-4 text-cream/40" />
              <input type="text" placeholder="City (optional)" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className="w-full pl-10 pr-4 py-2.5 bg-navy-800 border border-gold/20 rounded-xl text-cream placeholder:text-cream/30 text-sm focus:border-gold focus:outline-none" />
            </div>
            <label className="flex items-center gap-2 text-sm text-cream/60">
              <input type="checkbox" checked={form.agree_updates} onChange={e => setForm(f => ({ ...f, agree_updates: e.target.checked }))} className="w-4 h-4 accent-gold" />
              I agree to receive updates from Property Herald
            </label>
            <button type="submit" disabled={submitting} className="w-full bg-gold text-navy font-bold py-3 rounded-xl hover:bg-gold/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : 'Notify Me at Launch'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export function MaintenancePage() {
  return (
    <div className="min-h-screen bg-navy flex flex-col items-center justify-center px-4">
      <div className="max-w-lg text-center">
        <div className="w-20 h-20 bg-gold/10 border border-gold/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock className="w-10 h-10 text-gold" />
        </div>
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-gold mb-4">Under Maintenance</h1>
        <p className="text-cream/60">Property Herald is temporarily offline for scheduled maintenance. We'll be back shortly.</p>
      </div>
    </div>
  );
}
