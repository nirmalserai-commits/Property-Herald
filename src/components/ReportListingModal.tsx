import { useState } from 'react';
import { AlertTriangle, Flag, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Listing } from '../types/database';

interface ReportListingModalProps {
  listing: Listing;
  onClose: () => void;
}

export function ReportListingModal({ listing, onClose }: ReportListingModalProps) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [emailWarning, setEmailWarning] = useState('');

  const handleSubmit = async () => {
    if (reason.trim().length < 10) {
      setError('Please provide at least a few details so our compliance team can investigate.');
      return;
    }

    setSubmitting(true);
    setError('');
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setError('Please sign in before reporting a listing.');
      setSubmitting(false);
      return;
    }

    const { data, error: reportError } = await supabase.rpc('report_listing', {
      p_listing_id: listing.id,
      p_reason: reason.trim(),
      p_reporter_user_id: user.id,
      p_reporter_email: user.email ?? null,
      p_reporter_ip: null,
    });

    if (reportError || !data?.ok) {
      setError(reportError?.message || data?.error || 'We could not submit your report.');
      setSubmitting(false);
      return;
    }

    const { error: emailError } = await supabase.functions.invoke('compliance-suspension-email', {
      body: { profile_id: data.profile_id, report_reason: reason.trim() },
    });
    if (emailError) setEmailWarning('The report was accepted, but the compliance email could not be sent yet.');
    setSubmitted(true);
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/70 px-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-red-50 p-2 text-red-600"><Flag className="h-5 w-5" /></div>
            <div>
              <h2 className="font-serif text-xl font-bold text-navy">Report this listing</h2>
              <p className="mt-1 text-sm text-gray-500">{listing.title || listing.project_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-navy" aria-label="Close report form"><X className="h-5 w-5" /></button>
        </div>

        {submitted ? (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <div className="flex gap-2"><AlertTriangle className="h-5 w-5 shrink-0" /><p>Your report has been submitted. The account’s listings are hidden while our compliance team investigates.</p></div>
            {emailWarning && <p className="mt-3 text-xs text-amber-800">{emailWarning}</p>}
            <button onClick={onClose} className="mt-4 rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-cream">Done</button>
          </div>
        ) : (
          <>
            <p className="mt-5 text-sm leading-6 text-gray-600">Tell us why you believe this property may be fake, misleading, or unauthorized.</p>
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={5} placeholder="Describe what looks incorrect..." className="mt-4 w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-800 outline-none focus:border-gold focus:ring-2 focus:ring-gold/20" />
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100">Cancel</button>
              <button onClick={handleSubmit} disabled={submitting} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">{submitting ? 'Submitting…' : 'Submit report'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
