import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Handshake, Building2, CheckCircle, Clock, Users, TrendingUp } from 'lucide-react';

const LAUNCH_DATE = new Date('2026-08-15T00:00:00+05:30');

function useCountdown() {
  const [days, setDays] = useState(0);
  useEffect(() => {
    const i = setInterval(() => {
      const diff = LAUNCH_DATE.getTime() - Date.now();
      setDays(Math.max(0, Math.floor(diff / 86400000)));
    }, 1000);
    return () => clearInterval(i);
  }, []);
  return days;
}

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

export function FoundingPartnerPage() {
  const days = useCountdown();
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
        <div className="bg-gold/10 border border-gold/30 rounded-2xl p-6 text-center">
          <Clock className="w-6 h-6 text-gold mx-auto mb-2" />
          <p className="text-navy font-semibold">{days} days until launch</p>
          <p className="text-sm text-gray-500 mt-1">Founding Partner slots close on 15 August 2026</p>
        </div>
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
        {open && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
            <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
              <h2 className="text-xl font-serif font-bold text-navy mb-4">Founding Partner Application</h2>
              <p className="text-sm text-gray-500">Please email nirmal@propertyherald.in with your business details to apply.</p>
              <button onClick={() => setOpen(false)} className="w-full mt-4 bg-navy text-gold py-2 rounded-xl font-semibold border border-gold/20">Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function FoundingAgencyPage() {
  const days = useCountdown();
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
        <div className="bg-gold/10 border border-gold/30 rounded-2xl p-6 text-center">
          <Clock className="w-6 h-6 text-gold mx-auto mb-2" />
          <p className="text-navy font-semibold">{days} days until launch</p>
          <p className="text-sm text-gray-500 mt-1">Founding Agency slots close on 15 August 2026</p>
        </div>
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
        {open && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
            <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
              <h2 className="text-xl font-serif font-bold text-navy mb-4">Founding Agency Application</h2>
              <p className="text-sm text-gray-500">Please email nirmal@propertyherald.in with your agency details to apply.</p>
              <button onClick={() => setOpen(false)} className="w-full mt-4 bg-navy text-gold py-2 rounded-xl font-semibold border border-gold/20">Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
