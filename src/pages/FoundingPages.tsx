import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Handshake, Building2, CheckCircle, Users, TrendingUp,
  Loader2, X,
} from 'lucide-react';

function Hero({ title, subtitle, icon: Icon }: { title: string; subtitle: string; icon: typeof Handshake }) {
  return (
    <div className="bg-navy text-cream py-12 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-gold/10 border border-gold/30 rounded-full mb-4">
          <Icon className="w-7 h-7 text-gold" />
        </div>
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-gold mb-2">{title}</h1>
        <p className="text-cream/60">{subtitle}</p>
      </div>
    </div>
  );
}

function Benefits({ items }: { items: { icon: typeof Users; title: string; desc: string }[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {items.map(({ icon: Icon, title, desc }) => (
        <div key={title} className="bg-white rounded-xl border border-gray-200 p-5">
          <Icon className="w-6 h-6 text-gold mb-3" />
          <h3 className="font-serif font-bold text-navy mb-1">{title}</h3>
          <p className="text-sm text-gray-500">{desc}</p>
        </div>
      ))}
    </div>
  );
}

interface ApplicationForm {
  name: string;
  email: string;
  phone: string;
  company: string;
  city: string;
  message: string;
}

function ApplicationModal({
  open, onClose, title,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
}) {
  const [form, setForm] = useState<ApplicationForm>({ name: '', email: '', phone: '', company: '', city: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    setSubmitting(true);
    setError('');
    const { error: insertError } = await supabase.from('founding_partner_applications').insert({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone?.trim() || null,
      company: form.company?.trim() || null,
      city: form.city?.trim() || null,
      message: form.message?.trim() || null,
    });
    setSubmitting(false);
    if (insertError) {
      setError('Something went wrong. Please try again or email us directly.');
      return;
    }
    setSubmitted(true);
  }

  function handleClose() {
    setForm({ name: '', email: '', phone: '', company: '', city: '', message: '' });
    setSubmitted(false);
    setError('');
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={handleClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-serif font-bold text-navy">{title}</h2>
          <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center">
            <div className="w-14 h-14 bg-green-50 border border-green-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-7 h-7 text-green-600" />
            </div>
            <h3 className="text-lg font-serif font-bold text-navy mb-2">Thank you — your application has been received.</h3>
            <p className="text-sm text-gray-500 mb-6">Our team will review your details and follow up shortly. We handle each application case by case, so please allow a few days for a personal response.</p>
            <button onClick={handleClose} className="w-full px-5 py-2.5 bg-navy text-gold rounded-xl font-semibold border border-gold/20 hover:bg-navy/90 transition-colors">
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Name *</label>
              <input
                type="text" required value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm mt-1 focus:ring-2 focus:ring-gold/30 focus:border-gold/40 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Email *</label>
              <input
                type="email" required value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm mt-1 focus:ring-2 focus:ring-gold/30 focus:border-gold/40 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Phone</label>
              <input
                type="tel" value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm mt-1 focus:ring-2 focus:ring-gold/30 focus:border-gold/40 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Company</label>
              <input
                type="text" value={form.company}
                onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm mt-1 focus:ring-2 focus:ring-gold/30 focus:border-gold/40 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">City</label>
              <input
                type="text" value={form.city}
                onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm mt-1 focus:ring-2 focus:ring-gold/30 focus:border-gold/40 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Message</label>
              <textarea
                rows={3} value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm mt-1 focus:ring-2 focus:ring-gold/30 focus:border-gold/40 outline-none resize-none"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit" disabled={submitting || !form.name.trim() || !form.email.trim()}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-navy text-gold rounded-xl font-semibold border border-gold/20 hover:bg-navy/90 transition-colors disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {submitting ? 'Submitting…' : 'Submit Application'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export function FoundingPartnerPage() {
  const [open, setOpen] = useState(false);
  const [flagOn, setFlagOn] = useState(true);

  useEffect(() => {
    supabase.from('site_flags').select('flag_value').eq('flag_name', 'founding_partner_open').maybeSingle()
      .then(({ data }) => { if (data) setFlagOn((data as { flag_value: boolean }).flag_value); });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Hero title="Founding Partner Programme" subtitle="Join Property Herald as a Founding Partner — limited slots" icon={Handshake} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <Benefits items={[
          { icon: TrendingUp, title: 'Premium Placement', desc: 'Top directory placement for 12 months' },
          { icon: Users, title: 'Priority Leads', desc: 'First access to buyer inquiries in your city' },
          { icon: CheckCircle, title: 'Verified Badge', desc: 'Founding Partner badge on all listings' },
        ]} />
        {flagOn ? (
          <button onClick={() => setOpen(true)} className="w-full bg-navy text-gold font-bold py-3 rounded-xl border border-gold/20 hover:bg-navy/90 transition-colors">
            Apply for Founding Partner
          </button>
        ) : (
          <p className="text-center text-gray-500 py-4">Founding Partner applications are currently closed.</p>
        )}
        <ApplicationModal open={open} onClose={() => setOpen(false)} title="Founding Partner Application" />
      </div>
    </div>
  );
}

export function FoundingAgencyPage() {
  const [open, setOpen] = useState(false);
  const [flagOn, setFlagOn] = useState(true);

  useEffect(() => {
    supabase.from('site_flags').select('flag_value').eq('flag_name', 'founding_agency_open').maybeSingle()
      .then(({ data }) => { if (data) setFlagOn((data as { flag_value: boolean }).flag_value); });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Hero title="Founding Agency Programme" subtitle="Exclusive early access for real estate agencies" icon={Building2} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <Benefits items={[
          { icon: Users, title: 'Unlimited Listings', desc: 'List unlimited properties for 12 months' },
          { icon: TrendingUp, title: 'Featured Placement', desc: 'Agency featured on directory homepage' },
          { icon: CheckCircle, title: 'Verified Badge', desc: 'Founding Agency badge for your team' },
        ]} />
        {flagOn ? (
          <button onClick={() => setOpen(true)} className="w-full bg-navy text-gold font-bold py-3 rounded-xl border border-gold/20 hover:bg-navy/90 transition-colors">
            Apply for Founding Agency
          </button>
        ) : (
          <p className="text-center text-gray-500 py-4">Founding Agency applications are currently closed.</p>
        )}
        <ApplicationModal open={open} onClose={() => setOpen(false)} title="Founding Agency Application" />
      </div>
    </div>
  );
}
