import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { Invoice } from '../types/database';
import { Printer, ArrowLeft, Download } from 'lucide-react';

export function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id || !user) return;
    supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setInvoice(data as Invoice);
        else setNotFound(true);
        setLoading(false);
      });
  }, [id, user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="w-10 h-10 border-4 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !invoice) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-cream gap-4">
        <p className="text-navy font-semibold">Invoice not found or access denied.</p>
        <Link to="/dashboard" className="text-gold underline text-sm">Back to Dashboard</Link>
      </div>
    );
  }

  const invoiceDate = new Date(invoice.date).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      {/* Print controls — hidden when printing */}
      <div className="max-w-3xl mx-auto mb-6 flex items-center justify-between print:hidden">
        <Link to="/dashboard" className="flex items-center gap-2 text-navy font-medium hover:text-gold transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" />Back to Dashboard
        </Link>
        <div className="flex gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-5 py-2.5 bg-navy text-cream rounded-lg text-sm font-display font-semibold hover:bg-navy-800 transition-colors">
            <Printer className="w-4 h-4" />Print / Save PDF
          </button>
        </div>
      </div>

      {/* Invoice */}
      <div id="invoice-print" className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden print:shadow-none print:rounded-none">

        {/* Header band */}
        <div className="bg-navy px-8 py-8">
          <div className="flex items-start justify-between">
            <div>
              <img src="/logo.png.png" alt="Property Herald" className="h-14 w-auto object-contain mb-3"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <div className="text-cream/70 text-xs leading-relaxed">
                <p>Property Herald</p>
                <p>India's Premier Real Estate Intelligence Platform</p>
                <p>GSTIN: Applied For</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-gold text-xs font-display font-bold uppercase tracking-widest mb-1">Tax Invoice</p>
              <p className="text-cream text-2xl font-serif font-bold">{invoice.invoice_number}</p>
              <p className="text-cream/60 text-sm mt-1">{invoiceDate}</p>
              <div className="mt-3 inline-block px-3 py-1 bg-green-500/20 border border-green-500/40 rounded-full">
                <span className="text-green-400 text-xs font-semibold">{invoice.payment_status}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Gold divider */}
        <div className="h-1 bg-gradient-to-r from-transparent via-gold to-transparent" />

        {/* Body */}
        <div className="px-8 py-8">
          {/* Billed to */}
          <div className="mb-8">
            <p className="text-xs font-display font-semibold uppercase tracking-widest text-warm-gray mb-2">Billed To</p>
            <p className="font-semibold text-navy text-lg">{invoice.user_name}</p>
            <p className="text-warm-gray text-sm">{invoice.user_email}</p>
          </div>

          {/* Line items */}
          <div className="rounded-xl border border-gold/20 overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-navy/5 border-b border-gold/15">
                  <th className="text-left px-5 py-3 text-xs font-display font-semibold uppercase tracking-wider text-navy">Description</th>
                  <th className="text-right px-5 py-3 text-xs font-display font-semibold uppercase tracking-wider text-navy">Qty</th>
                  <th className="text-right px-5 py-3 text-xs font-display font-semibold uppercase tracking-wider text-navy">Rate</th>
                  <th className="text-right px-5 py-3 text-xs font-display font-semibold uppercase tracking-wider text-navy">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="px-5 py-4">
                    <p className="font-medium text-navy">
                      Property Herald Token Bundle
                      {invoice.bundle_name && <span className="text-warm-gray font-normal"> — {invoice.bundle_name}</span>}
                    </p>
                    <p className="text-xs text-warm-gray mt-0.5">Digital tokens for platform features (non-refundable)</p>
                  </td>
                  <td className="px-5 py-4 text-right text-navy">{invoice.token_amount.toLocaleString()}</td>
                  <td className="px-5 py-4 text-right text-navy">₹{Number(invoice.price_per_token).toFixed(2)}</td>
                  <td className="px-5 py-4 text-right font-semibold text-navy">₹{Number(invoice.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64">
              <div className="flex justify-between py-2 text-sm">
                <span className="text-warm-gray">Subtotal</span>
                <span className="text-navy">₹{Number(invoice.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between py-2 text-sm border-t border-gray-100">
                <span className="text-warm-gray">GST ({invoice.gst_rate}%)</span>
                <span className="text-navy">₹{Number(invoice.gst_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between py-3 border-t-2 border-navy/20 mt-1">
                <span className="font-bold text-navy">Total</span>
                <span className="font-bold text-navy text-lg">₹{Number(invoice.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Payment details */}
          <div className="mt-8 p-5 bg-navy/4 rounded-xl border border-navy/10">
            <p className="text-xs font-display font-semibold uppercase tracking-wider text-warm-gray mb-3">Payment Details</p>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <span className="text-warm-gray">Payment Method</span><span className="text-navy font-medium">{invoice.payment_method}</span>
              <span className="text-warm-gray">Payment Date</span><span className="text-navy font-medium">{invoiceDate}</span>
              {invoice.razorpay_payment_id && (
                <>
                  <span className="text-warm-gray">Transaction ID</span>
                  <span className="text-navy font-medium font-mono text-xs">{invoice.razorpay_payment_id}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 bg-navy/4 border-t border-gold/15 text-center">
          <p className="text-xs text-warm-gray">Thank you for your payment. Tokens have been credited to your Property Herald wallet.</p>
          <p className="text-xs text-warm-gray/60 mt-1">This is a computer-generated invoice. For support: hello@propertyherald.in</p>
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
