import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Layout } from '../components/Layout';
import { Copy, Check, Users, TrendingUp, Gift, User, Calendar } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ReferralRecord {
  id: string;
  referrer_id: string;
  referred_id: string;
  status: 'pending' | 'active' | 'rewarded';
  tokens_earned: number;
  rewarded_at: string | null;
  created_at: string;
}

interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  tokensEarned: number;
  pendingRewards: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function anonymizeUserId(id: string): string {
  if (!id || id.length < 4) return id;
  const last4 = id.slice(-4);
  return `****${last4}`;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function ReferralPage() {
  const { user, loading: authLoading } = useAuth();
  const [referralCode, setReferralCode] = useState('');
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [stats, setStats] = useState<ReferralStats>({
    totalReferrals: 0,
    activeReferrals: 0,
    tokensEarned: 0,
    pendingRewards: 0,
  });
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  // Fetch profile and referral code
  useEffect(() => {
    if (!user) return;

    const fetchProfileAndReferrals = async () => {
      setLoading(true);
      setError('');

      try {
        // Fetch user's referral code
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('referral_code, display_name')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) {
          console.error('Profile fetch error:', profileError);
          setError('Failed to load your referral code');
        }

        if (profileData?.referral_code) {
          setReferralCode(profileData.referral_code);
        }

        // Fetch all referrals for this user
        const { data: referralsData, error: referralsError } = await supabase
          .from('referrals')
          .select('*')
          .eq('referrer_id', user.id)
          .order('created_at', { ascending: false });

        if (referralsError) {
          console.error('Referrals fetch error:', referralsError);
          setError('Failed to load your referrals');
        }

        if (referralsData) {
          setReferrals(referralsData as ReferralRecord[]);

          // Calculate stats
          const totalReferrals = referralsData.length;
          const activeReferrals = referralsData.filter(
            (r) => r.status === 'active'
          ).length;
          const tokensEarned = referralsData.reduce(
            (sum, r) => sum + (r.tokens_earned || 0),
            0
          );
          const pendingRewards = referralsData.filter(
            (r) => r.status === 'pending'
          ).length;

          setStats({
            totalReferrals,
            activeReferrals,
            tokensEarned,
            pendingRewards,
          });
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('An error occurred. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndReferrals();
  }, [user]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="w-12 h-12 border-4 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const referralLink = referralCode
    ? `${window.location.origin}/register?ref=${referralCode}`
    : '';

  const handleCopyToClipboard = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-cream">
        {/* Hero Section */}
        <div className="bg-navy py-12 sm:py-16 lg:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold text-cream mb-4">
                Earn Tokens. Refer & Grow.
              </h1>
              <p className="text-lg text-cream/80 max-w-2xl mx-auto">
                Share your referral code with friends and colleagues. When they register and make
                their first token purchase, you'll earn 10% of their purchase as tokens.
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          {/* Error message */}
          {error && (
            <div className="mb-8 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Referral Code Card */}
          <div className="mb-12">
            <ReferralCodeCard
              referralCode={referralCode}
              referralLink={referralLink}
              copied={copied}
              onCopy={handleCopyToClipboard}
              loading={loading}
            />
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            <StatCard
              label="Total Referrals"
              value={stats.totalReferrals}
              icon={Users}
              color="bg-navy"
            />
            <StatCard
              label="Active Referrals"
              value={stats.activeReferrals}
              icon={TrendingUp}
              color="bg-gold"
            />
            <StatCard
              label="Tokens Earned"
              value={stats.tokensEarned}
              icon={Gift}
              color="bg-burgundy"
            />
            <StatCard
              label="Pending Rewards"
              value={stats.pendingRewards}
              icon={Users}
              color="bg-navy/70"
            />
          </div>

          {/* How It Works */}
          <div className="mb-12">
            <h2 className="text-2xl font-serif font-bold text-navy mb-8 text-center">
              How It Works
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <HowItWorksStep
                step={1}
                title="Copy Your Code"
                description="Your unique referral code is displayed above. Share it with friends, colleagues, and network partners via email, WhatsApp, or social media."
              />
              <HowItWorksStep
                step={2}
                title="Friend Registers & Buys"
                description="They use your code during registration, then purchase tokens to unlock premium features like verified badges and featured listings."
              />
              <HowItWorksStep
                step={3}
                title="You Earn 10%"
                description="We'll credit 10% of their first token purchase to your wallet as tokens, automatically. No caps, no limits."
              />
            </div>
          </div>

          {/* Referrals Table/List */}
          <div>
            <h2 className="text-2xl font-serif font-bold text-navy mb-6">
              Your Referrals
            </h2>
            {loading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin mx-auto" />
              </div>
            ) : referrals.length > 0 ? (
              <div className="bg-white rounded-2xl border border-gold/10 shadow-sm overflow-hidden">
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-display font-semibold uppercase tracking-wider text-warm-gray">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-display font-semibold uppercase tracking-wider text-warm-gray">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-display font-semibold uppercase tracking-wider text-warm-gray">
                          Tokens Earned
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-display font-semibold uppercase tracking-wider text-warm-gray">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {referrals.map((referral) => (
                        <tr key={referral.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center">
                                <User className="w-4 h-4 text-gold" />
                              </div>
                              <span className="font-mono text-sm text-navy">
                                {anonymizeUserId(referral.referred_id)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge status={referral.status} />
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-semibold text-gold">
                              {referral.tokens_earned}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-warm-gray text-xs">
                            {fmtDate(referral.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden divide-y divide-gray-50">
                  {referrals.map((referral) => (
                    <div key={referral.id} className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-gold" />
                          </div>
                          <span className="font-mono text-sm text-navy font-medium">
                            {anonymizeUserId(referral.referred_id)}
                          </span>
                        </div>
                        <StatusBadge status={referral.status} />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-warm-gray">
                          {fmtDate(referral.created_at)}
                        </span>
                        <span className="font-semibold text-gold">
                          {referral.tokens_earned} tokens
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gold/10 p-12 text-center">
                <Users className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <p className="text-warm-gray mb-4 text-sm">
                  No referrals yet. Start sharing your referral code to earn tokens!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

interface ReferralCodeCardProps {
  referralCode: string;
  referralLink: string;
  copied: boolean;
  onCopy: () => void;
  loading: boolean;
}

function ReferralCodeCard({
  referralCode,
  referralLink,
  copied,
  onCopy,
  loading,
}: ReferralCodeCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gold/20 shadow-sm p-8">
      <p className="text-xs font-display font-semibold uppercase tracking-widest text-warm-gray mb-4">
        Your Referral Code
      </p>

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <p className="text-5xl font-bold font-display text-navy tracking-wider">
            {loading ? (
              <span className="text-xl text-warm-gray">Loading...</span>
            ) : referralCode ? (
              referralCode
            ) : (
              <span className="text-xl text-warm-gray">No code available</span>
            )}
          </p>
        </div>
        <p className="text-sm text-warm-gray">
          Share this code with friends to earn token rewards
        </p>
      </div>

      {referralLink && (
        <div className="mb-6">
          <p className="text-xs font-medium text-warm-gray mb-2">Full Referral Link:</p>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 mb-3">
            <p className="text-xs text-navy font-mono break-all">{referralLink}</p>
          </div>
          <button
            onClick={onCopy}
            disabled={loading}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
              copied
                ? 'bg-gold/20 text-gold border border-gold/40'
                : 'bg-gold text-navy hover:bg-gold-400 border border-gold'
            } disabled:opacity-50`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied to Clipboard!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy Referral Link
              </>
            )}
          </button>
        </div>
      )}

      <div className="pt-6 border-t border-gray-100">
        <h3 className="text-sm font-semibold text-navy mb-3">Share Your Code</h3>
        <div className="flex gap-2 flex-wrap">
          {referralCode && (
            <>
              <a
                href={`https://wa.me/?text=Join%20Property%20Herald%20and%20start%20listing%20properties%20today!%20Use%20my%20referral%20code%20${referralCode}%20to%20get%20started%3A%20${encodeURIComponent(
                  referralLink
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-royal-green/10 text-royal-green rounded-lg text-xs font-medium hover:bg-royal-green/20 transition-colors"
              >
                WhatsApp
              </a>
              <a
                href={`mailto:?subject=Join Property Herald&body=Check out Property Herald! Use my referral code ${referralCode} and earn rewards. ${referralLink}`}
                className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
              >
                Email
              </a>
              <a
                href={`https://x.com/intent/tweet?text=Just%20joined%20Property%20Herald!%20Use%20my%20referral%20code%20${referralCode}%20and%20earn%20rewards.%20${encodeURIComponent(
                  referralLink
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-black/5 text-navy rounded-lg text-xs font-medium hover:bg-black/10 transition-colors"
              >
                Twitter/X
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gold/10 shadow-sm">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${color}`}>
        <Icon className="w-5 h-5 text-cream" />
      </div>
      <p className="text-3xl font-bold font-display text-navy">{value}</p>
      <p className="text-sm text-warm-gray mt-1">{label}</p>
    </div>
  );
}

interface HowItWorksStepProps {
  step: number;
  title: string;
  description: string;
}

function HowItWorksStep({ step, title, description }: HowItWorksStepProps) {
  return (
    <div className="bg-white rounded-2xl border border-gold/10 shadow-sm p-6">
      <div className="w-10 h-10 rounded-full bg-gold text-navy font-bold font-display flex items-center justify-center mb-4">
        {step}
      </div>
      <h3 className="text-lg font-semibold text-navy mb-2">{title}</h3>
      <p className="text-sm text-warm-gray leading-relaxed">{description}</p>
    </div>
  );
}

interface StatusBadgeProps {
  status: 'pending' | 'active' | 'rewarded';
}

function StatusBadge({ status }: StatusBadgeProps) {
  const statusStyles: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-700',
    active: 'bg-blue-100 text-blue-700',
    rewarded: 'bg-gold/10 text-gold border border-gold/30',
  };

  const statusLabels: Record<string, string> = {
    pending: 'Pending',
    active: 'Active',
    rewarded: 'Rewarded',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusStyles[status]}`}>
      {statusLabels[status]}
    </span>
  );
}
