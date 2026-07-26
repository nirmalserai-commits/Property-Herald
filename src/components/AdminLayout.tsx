import { useEffect, useRef, ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  LayoutDashboard, Users, Building2, ShieldCheck, Coins,
  TrendingUp, Bell, LogOut, ArrowLeft, Shield, Bot, Image, Landmark,
  Video, Handshake, Brain, Lock, Mail, Award, MapPin, FolderOpen, UserCheck,
} from 'lucide-react';

const ADMIN_EMAIL = 'nirmalserai@gmail.com';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/admin/users', label: 'Users', icon: Users, exact: false },
  { to: '/admin/registrations', label: 'Registrations', icon: UserCheck, exact: false },
  { to: '/admin/listings', label: 'Listings', icon: Building2, exact: false },
  { to: '/admin/verifications', label: 'Verifications', icon: ShieldCheck, exact: false },
  { to: '/admin/locations', label: 'Locations', icon: MapPin, exact: false },
  { to: '/admin/hall-of-fame', label: 'Hall of Fame', icon: Award, exact: false },
  { to: '/admin/daughter-pictures', label: 'Team Pictures', icon: Bot, exact: false },
  { to: '/admin/assets', label: 'Assets Area', icon: FolderOpen, exact: false },
  { to: '/admin/token-settings', label: 'Token Settings', icon: Coins, exact: false },
  { to: '/admin/analytics', label: 'Analytics', icon: TrendingUp, exact: false },
  { to: '/admin/broadcast', label: 'Broadcast', icon: Bell, exact: false },
  { to: '/admin/ambassadors', label: 'AI Ambassadors', icon: Bot, exact: false },
  { to: '/admin/public-ambassadors', label: 'PH Ambassadors', icon: Award, exact: false },
  { to: '/admin/banners', label: 'Banners', icon: Image, exact: false },
  { to: '/admin/sbi-ads', label: 'SBI Ads', icon: Landmark, exact: false },
  { to: '/admin/live-events', label: 'LIVE Events', icon: Video, exact: false },
  { to: '/admin/partners', label: 'Partners', icon: Handshake, exact: false },
  { to: '/admin/boardroom', label: 'Boardroom', icon: Lock, exact: false },
  { to: '/admin/digest-log', label: 'Digest Log', icon: Mail, exact: false },
  { to: '/admin/nora', label: 'Nora (COO)', icon: Shield, exact: false },
  { to: '/admin/nita', label: 'Nita (CoS)', icon: Brain, exact: false },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const hiddenAtRef = useRef<number | null>(null);

  const isAdmin = user?.email === ADMIN_EMAIL;

  // Session timeout: only counts time the tab is hidden, not tab-switching.
  // On visibility hidden, record the timestamp. On visible, check elapsed time.
  // This prevents logging out admins who are simply working in another tab.
  useEffect(() => {
    if (!isAdmin) return;

    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = Date.now();
      } else {
        if (hiddenAtRef.current !== null) {
          const elapsed = Date.now() - hiddenAtRef.current;
          hiddenAtRef.current = null;
          if (elapsed > SESSION_TIMEOUT_MS) {
            signOut();
            navigate('/');
          }
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAdmin, signOut, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    navigate('/');
    return null;
  }

  const isActive = (item: typeof NAV[0]) =>
    item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-navy flex flex-col shadow-2xl">
        {/* Brand */}
        <div className="px-6 py-5 border-b border-gold/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gold/10 border border-gold/30 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-gold" />
            </div>
            <div>
              <p className="text-gold font-display font-bold text-sm tracking-wide">Admin Panel</p>
              <p className="text-cream/40 text-xs">Property Herald</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ to, label, icon: Icon, exact }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive({ to, label, icon: Icon, exact })
                  ? 'bg-gold/15 text-gold border border-gold/25'
                  : 'text-cream/60 hover:text-cream hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-gold/10 space-y-1">
          <Link to="/" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-cream/50 hover:text-cream hover:bg-white/5 transition-all">
            <ArrowLeft className="w-4 h-4" />Back to Site
          </Link>
          <button
            onClick={() => { signOut(); navigate('/'); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-cream/50 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-4 h-4" />Sign Out
          </button>
          <div className="px-4 pt-2">
            <p className="text-xs text-cream/30 truncate">{user.email}</p>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
          <div>
            {NAV.find(n => isActive(n)) && (
              <>
                <h1 className="text-xl font-serif font-bold text-navy">
                  {NAV.find(n => isActive(n))?.label}
                </h1>
                <p className="text-xs text-gray-400 mt-0.5">Property Herald Admin</p>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gold/10 rounded-full border border-gold/30">
            <div className="w-2 h-2 bg-gold rounded-full animate-pulse" />
            <span className="text-xs font-medium text-gold">Admin Session Active</span>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export async function logAdminAction(
  supabase: SupabaseClient,
  adminEmail: string,
  action: string,
  targetTable?: string,
  targetId?: string,
  details?: Record<string, unknown>
) {
  await supabase.from('admin_audit_log').insert({
    admin_email: adminEmail,
    action,
    target_table: targetTable ?? null,
    target_id: targetId ?? null,
    details: details ?? null,
  });
}
