import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Achievement } from '../types/database';
import {
  Trophy, Star, Shield, Flame, Globe, Crown,
  BookOpen, Coins, Lock, CheckCircle2,
} from 'lucide-react';

const BADGE_META: Record<string, {
  label: string; desc: string; icon: React.ElementType; color: string; bg: string; border: string;
}> = {
  early_adopter:    { label: 'Early Adopter',    desc: 'Among the first 500 registered users',       icon: Star,      color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  verified_pro:     { label: 'Verified Pro',      desc: 'Obtained the verified professional badge',   icon: Shield,    color: 'text-blue-600',  bg: 'bg-blue-50',  border: 'border-blue-200' },
  top_contributor:  { label: 'Top Contributor',   desc: 'Listed 10+ verified properties',             icon: Trophy,    color: 'text-gold',      bg: 'bg-gold/10',  border: 'border-gold/40' },
  streak_master:    { label: 'Streak Master',     desc: 'Maintained a 30-day login streak',           icon: Flame,     color: 'text-orange-600',bg: 'bg-orange-50',border: 'border-orange-200' },
  nri_specialist:   { label: 'NRI Specialist',    desc: 'Listed 3+ NRI-ready properties',             icon: Globe,     color: 'text-purple-600',bg: 'bg-purple-50',border: 'border-purple-200' },
  magazine_feature: { label: 'Magazine Feature',  desc: 'Featured in Property Herald magazine',       icon: BookOpen,  color: 'text-pink-600',  bg: 'bg-pink-50',  border: 'border-pink-200' },
  token_whale:      { label: 'Token Whale',       desc: 'Accumulated 500+ tokens in wallet',          icon: Coins,     color: 'text-emerald-600',bg:'bg-emerald-50',border:'border-emerald-200' },
};

export function AchievementsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    supabase
      .from('achievements')
      .select('*')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (data) setAchievements(data as Achievement[]);
        setLoading(false);
      });
  }, [user]);

  const earnedKeys = new Set(achievements.map(a => a.badge_type));
  const allBadges = Object.keys(BADGE_META);

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  return (
    <Layout>
      <div className="min-h-screen bg-cream py-10 px-4">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gold/15 border border-gold/30 rounded-full text-gold text-xs font-semibold mb-4">
              <Crown className="w-3.5 h-3.5" />
              Achievements
            </div>
            <h1 className="text-4xl font-serif font-bold text-navy mb-2">Your Badges</h1>
            <p className="text-gray-500">Earn badges by contributing to the Property Herald ecosystem.</p>
          </div>

          {/* Score card */}
          <div className="bg-navy rounded-2xl p-6 text-white text-center">
            <div className="text-5xl font-bold font-display text-gold mb-1">{earnedKeys.size}</div>
            <p className="text-cream/60 text-sm">of {allBadges.length} badges earned</p>
            <div className="mt-4 h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gold rounded-full transition-all" style={{ width: `${(earnedKeys.size / allBadges.length) * 100}%` }} />
            </div>
          </div>

          {/* Badge grid */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {allBadges.map(k => <div key={k} className="bg-white rounded-2xl border border-gray-200 h-40 animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {allBadges.map(key => {
                const meta = BADGE_META[key];
                const earned = earnedKeys.has(key);
                const achievement = achievements.find(a => a.badge_type === key);
                const Icon = meta.icon;
                return (
                  <div
                    key={key}
                    className={`rounded-2xl border p-5 flex flex-col items-center text-center transition-all ${
                      earned ? `${meta.bg} ${meta.border} shadow-sm` : 'bg-white border-gray-200 opacity-50 grayscale'
                    }`}
                  >
                    <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center mb-3 ${earned ? `${meta.bg} ${meta.border}` : 'bg-gray-100 border-gray-200'}`}>
                      {earned
                        ? <Icon className={`w-7 h-7 ${meta.color}`} />
                        : <Lock className="w-7 h-7 text-gray-300" />
                      }
                    </div>
                    <p className={`font-bold text-sm mb-1 ${earned ? 'text-navy' : 'text-gray-400'}`}>{meta.label}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{meta.desc}</p>
                    {earned && achievement && (
                      <div className="mt-3 flex items-center gap-1 text-xs text-green-600 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {fmtDate(achievement.awarded_at)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
