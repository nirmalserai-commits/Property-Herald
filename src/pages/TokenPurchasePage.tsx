import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { TokenBundle, TokenWallet } from '../types/database';
import { Coins, Zap, Star, Crown, Building2, TrendingUp, Check, ArrowRight, AlertTriangle, CheckCircle, X, Receipt } from 'lucide-react';

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (response: Record<string, unknown>) => void) => void;
    };
  }
}

const BUNDLE_ICONS = [Coins, Zap, Star, Crown, Building2];
const BUNDLE_HIGHLIGHTS = ['', '', 'Most Popular', 'Best Value', 'Enterprise'];

export function TokenPurchasePage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [bundles, setBundles] = useState<TokenBundle[]>([]);
  const [wallet, setWallet] = useState<TokenWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ invoiceId: string; invoiceNumber: string; tokens: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [razorpayReady, setRazorpayReady] = useState(false);
  const [razorpayKey, setRazorpayKey] = useState<string | null>(null);

  const isDubai = (profile?.market_track as string) === 'dubai';
  const currency = isDubai ? 'AED' : 'INR';
  const currencySymbol = isDubai ? 'AED' : '₹';
  const tokenPrice = isDubai ? 2 : 20;

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchData();
    loadRazorpay();
    fetchRazorpayKey();
  }, [user]);

  async function fetchRazorpayKey() {
    const { data, error } = await supabase.functions.invoke('razorpay-config');
    if (!error && data?.key_id) setRazorpayKey(data.key_id);
  }

  async function fetchData() {
    const [{ data: bundleData }, { data: walletData }] = await Promise.all([
      supabase.from('token_bundles').select('*').eq('is_active', true).order('price_inr'),
      supabase.from('token_wallets').select('*').eq('user_id', user!.id).maybeSingle(),
    ]);
    if (bundleData) setBundles(bundleData as TokenBundle[]);
    if (walletData) setWallet(walletData as TokenWallet);
    setLoading(false);
  }

  function loadRazorpay() {
    if (window.Razorpay) { setRazorpayReady(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => setRazorpayReady(true);
    document.body.appendChild(script);
  }

  async function handlePurchase(bundle: TokenBundle) {
    if (!razorpayKey) {
      setError('Payment gateway not yet configured. Please contact the admin to complete Razorpay setup.');
      return;
    }
    setError(null);
    setPurchasing(bundle.id);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('razorpay-create-order', {
        body: { bundle_id: bundle.id },
      });

      if (fnError || data?.error) {
        throw new Error(data?.error || fnError?.message || 'Failed to create order');
      }

      const options = {
        key: razorpayKey,
        amount: data.amount,
        currency: data.currency,
        order_id: data.order_id,
        name: 'Property Herald',
        description: `${bundle.name} — ${bundle.total_tokens} Tokens`,
        image: '/logo.png.png',
        prefill: {
          name: profile?.contact_person || '',
          email: profile?.email || '',
          contact: profile?.phone || '',
        },
        theme: { color: '#0a1628' },
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          const { data: verifyData, error: verifyError } = await supabase.functions.invoke('razorpay-verify-payment', {
            body: {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              bundle_id: bundle.id,
              user_id: user!.id,
            },
          });

          if (verifyError || verifyData?.error) {
            setError('Payment received but verification failed. Please contact support with your payment ID: ' + response.razorpay_payment_id);
          } else {
            setSuccess({
              invoiceId: verifyData.invoice_id,
              invoiceNumber: verifyData.invoice_number,
              tokens: verifyData.tokens_credited,
            });
            fetchData();
          }
          setPurchasing(null);
        },
        modal: { ondismiss: () => setPurchasing(null) },
      };

      if (!data.order_id) {
        throw new Error('Order creation failed: no order ID returned. Check Razorpay credentials.');
      }

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response: { error: { description: string; reason: string; code: string } }) => {
        setError(
          `Payment failed: ${response.error.description || response.error.reason || response.error.code || 'Unknown error'}. ` +
          'If you see "refused to connect", ensure this domain is whitelisted in your Razorpay dashboard under Settings → Website/App Details.'
        );
        setPurchasing(null);
      });
      rzp.open();
    } catch (err) {
      setError((err as Error).message);
      setPurchasing(null);
    }
  }

  const isLowBalance = wallet !== null && wallet.balance < 20;

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <div className="bg-navy py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-gold/10 border border-gold/30 text-gold text-xs font-display font-semibold uppercase tracking-wider mb-3">
                <Coins className="w-3 h-3 mr-1.5" />Token Economy
              </div>
              <h1 className="text-3xl font-serif font-bold text-cream">Token Wallet</h1>
              <p className="text-cream/60 mt-1">1 Token = {currencySymbol}{tokenPrice} · Power your listings, badges, and lead tools</p>
            </div>
            {wallet !== null && (
              <div className={`rounded-2xl px-8 py-5 border text-center ${isLowBalance ? 'bg-burgundy/20 border-burgundy/40' : 'bg-gold/10 border-gold/30'}`}>
                <p className="text-xs font-display font-semibold uppercase tracking-wider text-cream/60 mb-1">Current Balance</p>
                <p className={`text-5xl font-bold font-display ${isLowBalance ? 'text-red-400' : 'text-gold'}`}>{wallet.balance}</p>
                <p className="text-xs text-cream/50 mt-1">tokens</p>
              </div>
            )}
          </div>

          {isLowBalance && (
            <div className="mt-6 flex items-center gap-3 px-5 py-3 bg-burgundy/20 border border-burgundy/40 rounded-xl text-cream/90">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <span className="text-sm">Your token balance is low. Top up now to keep your listings and badges active.</span>
            </div>
          )}
        </div>
      </div>

      {/* Bundles */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {!loading && !razorpayKey && (
          <div className="mb-8 flex items-start gap-3 px-5 py-4 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Payment gateway not configured</p>
              <p className="text-sm text-amber-700 mt-0.5">Razorpay keys have not been set up yet. Please contact the admin to enable live payments. Bundles are visible for preview.</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-8 flex items-start gap-3 px-5 py-4 bg-red-50 border border-red-200 rounded-xl">
            <X className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <h2 className="text-2xl font-serif font-bold text-navy mb-2">Choose a Token Bundle</h2>
        <p className="text-warm-gray mb-8">Larger bundles include bonus tokens — more tokens per rupee as you scale.</p>

        {loading ? (
          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-6 animate-pulse border border-gray-100 h-72" />
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
            {bundles.map((bundle, idx) => {
              const Icon = BUNDLE_ICONS[idx] || Coins;
              const highlight = BUNDLE_HIGHLIGHTS[idx];
              const price = isDubai ? (bundle.price_aed ?? 0) : bundle.price_inr;
              const perToken = (price / bundle.total_tokens).toFixed(2);
              const isPopular = highlight === 'Most Popular';
              const isBest = highlight === 'Best Value';
              return (
                <div key={bundle.id}
                  className={`relative rounded-2xl p-6 flex flex-col border transition-all hover:shadow-xl ${
                    isPopular
                      ? 'bg-navy border-gold/40 shadow-lg ring-1 ring-gold/30'
                      : isBest
                      ? 'bg-navy/95 border-gold/30 shadow-md'
                      : 'bg-white border-gray-200 hover:border-gold/40'
                  }`}>
                  {highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gold text-navy text-xs font-display font-bold rounded-full whitespace-nowrap">
                      {highlight}
                    </div>
                  )}

                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${isPopular || isBest ? 'bg-gold/10 border border-gold/30' : 'bg-navy/8 border border-navy/15'}`}>
                    <Icon className={`w-6 h-6 ${isPopular || isBest ? 'text-gold' : 'text-navy'}`} />
                  </div>

                  <p className={`text-xs font-display font-bold uppercase tracking-widest mb-1 ${isPopular || isBest ? 'text-gold/70' : 'text-warm-gray'}`}>{bundle.name}</p>
                  <p className={`text-3xl font-bold font-display mb-1 ${isPopular || isBest ? 'text-cream' : 'text-navy'}`}>{bundle.total_tokens.toLocaleString()}</p>
                  <p className={`text-xs mb-1 ${isPopular || isBest ? 'text-cream/50' : 'text-warm-gray'}`}>tokens</p>

                  {bundle.bonus_tokens > 0 && (
                    <div className="flex items-center gap-1 mb-3">
                      <span className="px-2 py-0.5 bg-gold/15 text-gold text-xs font-semibold rounded border border-gold/30">
                        +{bundle.bonus_tokens} FREE
                      </span>
                    </div>
                  )}

                  <div className="mt-auto pt-4 border-t border-current/10">
                    <p className={`text-xl font-bold font-display ${isPopular || isBest ? 'text-cream' : 'text-navy'}`}>
                      {currencySymbol}{price.toLocaleString('en-IN')}
                    </p>
                    <p className={`text-xs mt-0.5 ${isPopular || isBest ? 'text-cream/50' : 'text-warm-gray'}`}>
                      {currencySymbol}{perToken}/token
                    </p>
                  </div>

                  <button
                    onClick={() => handlePurchase(bundle)}
                    disabled={!razorpayReady || purchasing === bundle.id || !razorpayKey}
                    className={`mt-4 w-full py-2.5 rounded-xl text-sm font-display font-bold uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      isPopular
                        ? 'bg-gold text-navy hover:bg-gold-400'
                        : isBest
                        ? 'bg-gold/90 text-navy hover:bg-gold'
                        : 'bg-navy text-cream hover:bg-navy-800'
                    }`}>
                    {purchasing === bundle.id ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Processing
                      </span>
                    ) : (
                      'Buy Now'
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Token usage table */}
        <div className="mt-16 bg-white rounded-2xl border border-gold/20 overflow-hidden">
          <div className="px-6 py-5 border-b border-gold/10 bg-navy/3">
            <h3 className="font-serif font-bold text-navy text-lg">Token Burn Rates</h3>
            <p className="text-warm-gray text-sm mt-1">How tokens are consumed across Property Herald features</p>
          </div>
          <div className="divide-y divide-gray-100">
            {[
              { action: 'Verified Badge', cost: 5, period: 'Monthly', desc: 'Gold verification seal on your profile and all listings' },
              { action: 'Featured Listing', cost: 10, period: 'Weekly', desc: 'Listing appears at the top of search results' },
              { action: 'Hot Property Tag', cost: 15, period: 'Weekly', desc: '"Hot" badge on listing card with boosted visibility' },
              { action: 'WhatsApp Lead Click', cost: 2, period: 'Per click', desc: 'Charged to listing owner when visitor clicks WhatsApp Connect' },
            ].map(({ action, cost, period, desc }) => (
              <div key={action} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="font-medium text-navy text-sm">{action}</p>
                  <p className="text-warm-gray text-xs mt-0.5">{desc}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <span className="inline-block px-3 py-1 bg-navy text-gold text-sm font-bold font-display rounded-lg">{cost} tokens</span>
                  <p className="text-warm-gray text-xs mt-1">{period}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-navy font-semibold hover:text-gold transition-colors text-sm">
            ← Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Success Modal */}
      {success && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-cream rounded-2xl shadow-2xl max-w-md w-full p-8 text-center border border-gold/20">
            <div className="w-16 h-16 bg-gold/10 border-2 border-gold/40 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-gold" />
            </div>
            <h2 className="text-2xl font-serif font-bold text-navy mb-2">Payment Successful!</h2>
            <p className="text-warm-gray mb-2">{success.tokens} tokens have been added to your wallet.</p>
            <p className="text-xs text-warm-gray/60 mb-6">Invoice: {success.invoiceNumber}</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link to={`/invoice/${success.invoiceId}`}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-navy text-cream rounded-xl font-display font-semibold text-sm hover:bg-navy-800 transition-colors">
                <Receipt className="w-4 h-4" />View Invoice
              </Link>
              <button onClick={() => { setSuccess(null); navigate('/dashboard'); }}
                className="flex-1 px-5 py-3 bg-gold text-navy rounded-xl font-display font-semibold text-sm hover:bg-gold-400 transition-colors">
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
