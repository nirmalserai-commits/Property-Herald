import { useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Listing, Profile, City } from '../types/database';
import { X, Calendar, Phone, Mail, MessageSquare, CheckCircle, AlertCircle, Clock } from 'lucide-react';

type ListingWithProfile = Listing & { profile: Profile; city: City };

interface Props {
  listing: ListingWithProfile;
  onClose: () => void;
}

export function ShowApartmentBookingModal({ listing, onClose }: Props) {
  const [form, setForm] = useState({
    buyer_name: '',
    buyer_phone: '',
    buyer_email: '',
    preferred_date: '',
    preferred_time: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.buyer_name.trim() || !form.buyer_phone.trim() || !form.preferred_date) {
      setError('Please fill in your name, phone, and preferred date.');
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: rpcError } = await supabase.rpc('book_showing', {
      p_listing_id: listing.id,
      p_buyer_name: form.buyer_name.trim(),
      p_buyer_phone: form.buyer_phone.trim(),
      p_buyer_email: form.buyer_email.trim() || null,
      p_preferred_date: form.preferred_date,
      p_preferred_time: form.preferred_time || null,
      p_message: form.message.trim() || null,
    });

    setLoading(false);

    if (rpcError) {
      if (rpcError.message?.includes('Insufficient tokens')) {
        setError('The developer does not have enough tokens to accept bookings at this time. Please contact them directly via WhatsApp.');
      } else if (rpcError.message?.includes('daily booking limit')) {
        setError('This listing has reached its daily booking limit. Please try again tomorrow or contact the developer directly via WhatsApp.');
      } else {
        setError('Something went wrong. Please try again or contact us directly.');
      }
      return;
    }

    if (data) {
      setSuccess(true);
      const msg = encodeURIComponent(
        `New showing request!\nProperty: ${listing.title}\nDeveloper: ${listing.profile?.business_name}\nBuyer: ${form.buyer_name}\nPhone: ${form.buyer_phone}\nDate: ${form.preferred_date}${form.preferred_time ? ` at ${form.preferred_time}` : ''}`
      );
      window.open(`https://wa.me/919819470970?text=${msg}`, '_blank');
    }
  }

  const TIME_SLOTS = [
    '10:00 AM', '11:00 AM', '12:00 PM',
    '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
  ];

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-navy px-5 py-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-cream font-semibold text-base">Book a Showing</h2>
            <p className="text-cream/60 text-xs mt-0.5 line-clamp-1">
              {listing.profile?.business_name} · {listing.city?.name}
            </p>
          </div>
          <button onClick={onClose} className="text-cream/60 hover:text-cream transition-colors flex-shrink-0 mt-0.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <div>
              <h3 className="font-semibold text-navy text-lg">Booking Confirmed!</h3>
              <p className="text-gray-500 text-sm mt-1">
                Your showing request has been sent to <strong>{listing.profile?.business_name}</strong>. They will contact you within 24 hours to confirm the appointment.
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-4 h-4 text-gold flex-shrink-0" />
                <span>{new Date(form.preferred_date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
              {form.preferred_time && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-4 h-4 text-gold flex-shrink-0" />
                  <span>{form.preferred_time}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-600">
                <Phone className="w-4 h-4 text-gold flex-shrink-0" />
                <span>{form.buyer_phone}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-full px-4 py-2.5 bg-navy text-cream rounded-xl text-sm font-semibold hover:bg-navy/90 transition-all"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
            {error && (
              <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-gray-600">Your Name <span className="text-red-400">*</span></label>
                <div className="relative">
                  <input
                    type="text"
                    value={form.buyer_name}
                    onChange={e => set('buyer_name', e.target.value)}
                    placeholder="Full name"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-navy outline-none focus:border-gold/50 transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600">Phone <span className="text-red-400">*</span></label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="tel"
                    value={form.buyer_phone}
                    onChange={e => set('buyer_phone', e.target.value)}
                    placeholder="+91 98765..."
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm text-navy outline-none focus:border-gold/50 transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600">Email <span className="text-gray-400 font-normal">(optional)</span></label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="email"
                    value={form.buyer_email}
                    onChange={e => set('buyer_email', e.target.value)}
                    placeholder="your@email.com"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm text-navy outline-none focus:border-gold/50 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600">Preferred Date <span className="text-red-400">*</span></label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="date"
                    value={form.preferred_date}
                    min={minDateStr}
                    onChange={e => set('preferred_date', e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm text-navy outline-none focus:border-gold/50 transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600">Preferred Time <span className="text-gray-400 font-normal">(optional)</span></label>
                <select
                  value={form.preferred_time}
                  onChange={e => set('preferred_time', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-navy outline-none focus:border-gold/50 transition-colors appearance-none"
                >
                  <option value="">Any time</option>
                  {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-gray-600">Message <span className="text-gray-400 font-normal">(optional)</span></label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 w-3.5 h-3.5 text-gray-400" />
                  <textarea
                    value={form.message}
                    onChange={e => set('message', e.target.value)}
                    placeholder="Any specific requirements or questions..."
                    rows={3}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm text-navy outline-none focus:border-gold/50 transition-colors resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-700 flex items-start gap-2">
              <span className="flex-shrink-0 mt-0.5">ℹ</span>
              <span>Booking a showing deducts <strong>5 tokens</strong> from the developer's account. The developer will confirm your appointment via phone or WhatsApp.</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-navy text-cream rounded-xl font-semibold text-sm hover:bg-navy/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-cream/30 border-t-cream rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4" />
                  Confirm Booking Request
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
