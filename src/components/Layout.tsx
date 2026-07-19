import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { Notification } from '../types/database';
import { AmbassadorWidget } from './AmbassadorWidget';
import { Home, Building2, BookOpen, Users, LogIn, LogOut, Menu, X, Sparkles, ChevronDown, MapPin, Mail, Instagram, MessageCircle, Linkedin, Shield, Info, AlertTriangle, CheckCircle, XCircle, Globe, Calculator, TrendingUp, Video, Handshake, Trophy, Gift, Heart } from 'lucide-react';

const ADMIN_EMAIL = 'nirmalserai@gmail.com';

export function Navbar() {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [navCities, setNavCities] = useState<{ name: string; slug: string }[]>([]);
  const isActive = (path: string) => location.pathname === path;
  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    supabase.from('cities').select('name, slug').order('name').limit(10)
      .then(({ data }) => {
        if (data) setNavCities(data);
      });
  }, []);

  const fetchNotification = useCallback(async () => {
    if (!user) return;
    const isVerified = profile?.is_verified ?? false;
    let q = supabase
      .from('notifications')
      .select('*')
      .is('user_id', null)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(1);
    // audience='all' always shows; 'verified' only for verified; 'unverified' only for unverified
    // We use OR logic: show if audience=all, OR audience matches user status
    const audienceFilter = isVerified ? `audience.eq.all,audience.eq.verified` : `audience.eq.all,audience.eq.unverified`;
    q = q.or(audienceFilter);
    const { data } = await q;
    if (data && data.length > 0) setNotification(data[0] as Notification);
  }, [user, profile?.is_verified]);

  useEffect(() => { fetchNotification(); }, [fetchNotification]);

  async function dismissNotification(id: string) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotification(null);
  }

  const NOTIF_STYLE: Record<string, { bar: string; icon: typeof Info }> = {
    info:    { bar: 'bg-blue-600',  icon: Info },
    success: { bar: 'bg-gold',      icon: CheckCircle },
    warning: { bar: 'bg-amber-500', icon: AlertTriangle },
    error:   { bar: 'bg-red-600',   icon: XCircle },
  };

  return (
    <nav className="sticky top-0 z-50 bg-navy shadow-lg border-b border-gold/20">
      {/* Notification banner */}
      {notification && (() => {
        const style = NOTIF_STYLE[notification.type] ?? NOTIF_STYLE.info;
        const BannerIcon = style.icon;
        return (
          <div className={`${style.bar} px-4 py-2.5 flex items-center gap-3`}>
            <BannerIcon className="w-4 h-4 text-white flex-shrink-0" />
            <div className="flex-1 text-white text-sm">
              <span className="font-semibold">{notification.title}</span>
              {notification.message && <span className="ml-2 opacity-90">{notification.message}</span>}
            </div>
            <button onClick={() => dismissNotification(notification.id)} className="text-white/70 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })()}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-18 py-2">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 flex-shrink-0">
            <img
              src="/logo.png.png"
              alt="Property Herald"
              className="h-14 w-auto object-contain drop-shadow-lg"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const fallback = target.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
            <div className="hidden items-center justify-center w-10 h-10 bg-gold rounded-lg">
              <span className="text-navy font-serif font-bold text-lg">PH</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-1">
            <Link to="/" className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              isActive('/') ? 'bg-gold/20 text-gold' : 'text-cream/80 hover:text-gold hover:bg-gold/10'
            }`}>
              <Home className="w-4 h-4 mr-2" />Home
            </Link>

            <div className="relative"
              onMouseEnter={() => setDirectoryOpen(true)}
              onMouseLeave={() => setDirectoryOpen(false)}>
              <Link to="/directory" className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive('/directory') ? 'bg-gold/20 text-gold' : 'text-cream/80 hover:text-gold hover:bg-gold/10'
              }`}>
                <Building2 className="w-4 h-4 mr-2" />Directory
                <ChevronDown className="w-3 h-3 ml-1" />
              </Link>
              {directoryOpen && (
                <div className="absolute top-full left-0 w-56 bg-navy-800 shadow-2xl rounded-xl border border-gold/20 py-2 z-50">
                  <div className="px-3 py-2 text-xs font-display font-semibold text-gold/60 uppercase tracking-widest">Browse by City</div>
                  {navCities.map((city) => (
                    <Link key={city.slug} to={`/directory/${city.slug}`}
                      className="flex items-center px-4 py-2 text-sm text-cream/80 hover:bg-gold/10 hover:text-gold transition-colors">
                      <MapPin className="w-3 h-3 mr-2 text-gold/50" />{city.name}
                    </Link>
                  ))}
                  <div className="border-t border-gold/20 mt-2 pt-2">
                    <Link to="/directory" className="flex items-center px-4 py-2 text-sm font-medium text-gold hover:bg-gold/10 transition-colors">
                      View Full Directory →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <Link to="/magazine" className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              isActive('/magazine') ? 'bg-gold/20 text-gold' : 'text-cream/80 hover:text-gold hover:bg-gold/10'
            }`}>
              <BookOpen className="w-4 h-4 mr-2" />Magazine
            </Link>

            <div className="relative"
              onMouseEnter={() => setMoreOpen(true)}
              onMouseLeave={() => setMoreOpen(false)}>
              <button className="flex items-center px-4 py-2 rounded-lg text-sm font-medium text-cream/80 hover:text-gold hover:bg-gold/10 transition-all">
                More <ChevronDown className="w-3 h-3 ml-1" />
              </button>
              {moreOpen && (
                <div className="absolute top-full left-0 w-56 bg-navy shadow-2xl rounded-xl border border-gold/20 py-2 z-50">
                  <div className="px-3 py-2 text-xs font-display font-semibold text-gold/60 uppercase tracking-widest">Tools</div>
                  <Link to="/emi-calculator" onClick={() => setMoreOpen(false)} className="flex items-center px-4 py-2 text-sm text-cream/80 hover:bg-gold/10 hover:text-gold transition-colors">
                    <Calculator className="w-3.5 h-3.5 mr-2 text-gold/50" />EMI Calculator
                  </Link>
                  <Link to="/nri-portal" onClick={() => setMoreOpen(false)} className="flex items-center px-4 py-2 text-sm text-cream/80 hover:bg-gold/10 hover:text-gold transition-colors">
                    <Globe className="w-3.5 h-3.5 mr-2 text-gold/50" />NRI Portal
                  </Link>
                  <Link to="/live-events" onClick={() => setMoreOpen(false)} className="flex items-center px-4 py-2 text-sm text-cream/80 hover:bg-gold/10 hover:text-gold transition-colors">
                    <Video className="w-3.5 h-3.5 mr-2 text-gold/50" />LIVE Events
                  </Link>
                  <Link to="/market-reports" onClick={() => setMoreOpen(false)} className="flex items-center px-4 py-2 text-sm text-cream/80 hover:bg-gold/10 hover:text-gold transition-colors">
                    <TrendingUp className="w-3.5 h-3.5 mr-2 text-gold/50" />Market Reports
                  </Link>
                  <Link to="/partners" onClick={() => setMoreOpen(false)} className="flex items-center px-4 py-2 text-sm text-cream/80 hover:bg-gold/10 hover:text-gold transition-colors">
                    <Handshake className="w-3.5 h-3.5 mr-2 text-gold/50" />Partners
                  </Link>
                  <Link to="/home-loans" onClick={() => setMoreOpen(false)} className="flex items-center px-4 py-2 text-sm text-cream/80 hover:bg-gold/10 hover:text-gold transition-colors">
                    <Heart className="w-3.5 h-3.5 mr-2 text-gold/50" />Home Loans
                  </Link>
                  <div className="border-t border-gold/20 mt-1 pt-1">
                    <div className="px-3 py-2 text-xs font-display font-semibold text-gold/60 uppercase tracking-widest">My Account</div>
                    <Link to="/buyer-passport" onClick={() => setMoreOpen(false)} className="flex items-center px-4 py-2 text-sm text-cream/80 hover:bg-gold/10 hover:text-gold transition-colors">
                      <Shield className="w-3.5 h-3.5 mr-2 text-gold/50" />Buyer Passport
                    </Link>
                    <Link to="/achievements" onClick={() => setMoreOpen(false)} className="flex items-center px-4 py-2 text-sm text-cream/80 hover:bg-gold/10 hover:text-gold transition-colors">
                      <Trophy className="w-3.5 h-3.5 mr-2 text-gold/50" />Achievements
                    </Link>
                    <Link to="/referral" onClick={() => setMoreOpen(false)} className="flex items-center px-4 py-2 text-sm text-cream/80 hover:bg-gold/10 hover:text-gold transition-colors">
                      <Gift className="w-3.5 h-3.5 mr-2 text-gold/50" />Refer & Earn
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <div className="w-px h-6 bg-gold/20 mx-2" />

            {user ? (
              <>
                <Link to="/dashboard" className="flex items-center px-4 py-2 rounded-lg text-sm font-medium text-cream/80 hover:text-gold hover:bg-gold/10 transition-all">
                  <Users className="w-4 h-4 mr-2" />Dashboard
                </Link>
                {isAdmin && (
                  <Link to="/admin" className="flex items-center px-4 py-2 rounded-lg text-sm font-medium text-gold/80 hover:text-gold hover:bg-gold/10 transition-all border border-gold/20">
                    <Shield className="w-4 h-4 mr-2" />Admin
                  </Link>
                )}
                <button onClick={signOut} className="flex items-center px-4 py-2 rounded-lg text-sm font-medium text-cream/80 hover:text-gold hover:bg-gold/10 transition-all">
                  <LogOut className="w-4 h-4 mr-2" />Sign Out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="flex items-center px-4 py-2 rounded-lg text-sm font-medium text-cream/80 hover:text-gold hover:bg-gold/10 transition-all">
                  <LogIn className="w-4 h-4 mr-2" />Login
                </Link>
                <Link to="/register" className="flex items-center px-5 py-2.5 rounded-lg text-sm font-display font-bold uppercase tracking-wider bg-gold text-navy hover:bg-gold-400 transition-all shadow-md hover:shadow-lg" style={{ letterSpacing: '0.06em' }}>
                  <Sparkles className="w-4 h-4 mr-2" />List Business
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 rounded-lg text-cream/80 hover:text-gold hover:bg-gold/10 transition-colors">
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-navy-800 border-t border-gold/20">
          <div className="px-4 py-3 space-y-1">
            {[
              { path: '/', label: 'Home', icon: Home },
              { path: '/directory', label: 'Directory', icon: Building2 },
              { path: '/magazine', label: 'Magazine', icon: BookOpen },
              { path: '/emi-calculator', label: 'EMI Calculator', icon: Calculator },
              { path: '/nri-portal', label: 'NRI Portal', icon: Globe },
              { path: '/live-events', label: 'LIVE Events', icon: Video },
              { path: '/market-reports', label: 'Market Reports', icon: TrendingUp },
              { path: '/partners', label: 'Partners', icon: Handshake },
              { path: '/home-loans', label: 'Home Loans', icon: Heart },
            ].map(({ path, label, icon: Icon }) => (
              <Link key={path} to={path} onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                  isActive(path) ? 'bg-gold/20 text-gold' : 'text-cream/80 hover:bg-gold/10 hover:text-gold'
                }`}>
                <Icon className="w-5 h-5 mr-3" />{label}
              </Link>
            ))}
            {user ? (
              <>
                <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} className="flex items-center px-4 py-3 rounded-lg text-base font-medium text-cream/80 hover:bg-gold/10 hover:text-gold transition-colors">
                  <Users className="w-5 h-5 mr-3" />Dashboard
                </Link>
                {isAdmin && (
                  <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className="flex items-center px-4 py-3 rounded-lg text-base font-medium text-gold/80 hover:bg-gold/10 hover:text-gold transition-colors border border-gold/20">
                    <Shield className="w-5 h-5 mr-3" />Admin Panel
                  </Link>
                )}
                <button onClick={() => { signOut(); setMobileMenuOpen(false); }} className="w-full flex items-center px-4 py-3 rounded-lg text-base font-medium text-cream/80 hover:bg-gold/10 hover:text-gold transition-colors">
                  <LogOut className="w-5 h-5 mr-3" />Sign Out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="flex items-center px-4 py-3 rounded-lg text-base font-medium text-cream/80 hover:bg-gold/10 hover:text-gold transition-colors">
                  <LogIn className="w-5 h-5 mr-3" />Login
                </Link>
                <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="flex items-center px-4 py-3 rounded-lg text-base font-display font-bold bg-gold text-navy">
                  <Sparkles className="w-5 h-5 mr-3" />List Your Business
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

export function Footer() {
  const [email, setEmail] = useState('');
  const [subState, setSubState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubState('loading');
    const { error } = await supabase.from('newsletter_subscribers').insert({ email: email.trim() });
    if (error && error.code !== '23505') {
      setSubState('error');
    } else {
      setSubState('done');
      setEmail('');
    }
    setTimeout(() => setSubState('idle'), 3500);
  }

  return (
    <footer className="bg-navy text-cream/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="mb-5">
              <img src="/logo.png.png" alt="Property Herald" className="h-16 w-auto object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
              <div className="hidden items-center space-x-2">
                <div className="w-10 h-10 bg-gold rounded-lg flex items-center justify-center">
                  <span className="text-navy font-serif font-bold text-lg">PH</span>
                </div>
                <div>
                  <span className="text-lg font-serif font-bold text-cream">Property</span>
                  <span className="text-lg font-serif font-bold text-gold">Herald</span>
                </div>
              </div>
            </div>
            <p className="text-sm text-cream/60 leading-relaxed mb-6">India's first curated, AI-powered real estate intelligence platform — connecting builders, agents, and agencies with property seekers nationwide.</p>
            <div className="flex space-x-3">
              {[
                { Icon: Instagram,    href: 'https://instagram.com/leapofai',           label: 'Instagram' },
                { Icon: MessageCircle, href: 'https://wa.me/919819470970',              label: 'WhatsApp' },
                { Icon: Linkedin,     href: 'https://linkedin.com/in/nirmalserai',      label: 'LinkedIn' },
              ].map(({ Icon, href, label }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg bg-navy-700 border border-gold/20 flex items-center justify-center text-gold/60 hover:text-gold hover:border-gold/50 transition-all"
                  aria-label={label}>
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-gold font-display font-semibold uppercase tracking-wider text-sm mb-5">Quick Links</h3>
            <ul className="space-y-3 text-sm">
              {[
                { to: '/directory', label: 'Property Directory' },
                { to: '/magazine', label: 'Magazine' },
                { to: '/register', label: 'List Your Business' },
                { to: '/login', label: 'Member Login' },
              ].map(({ to, label }) => (
                <li key={to}><Link to={to} className="text-cream/60 hover:text-gold transition-colors">{label}</Link></li>
              ))}
            </ul>
          </div>

          {/* Property Types */}
          <div>
            <h3 className="text-gold font-display font-semibold uppercase tracking-wider text-sm mb-5">Property Types</h3>
            <ul className="space-y-3 text-sm">
              {[
                { to: '/directory?property_type=residential', label: 'Residential' },
                { to: '/directory?property_type=commercial', label: 'Commercial' },
                { to: '/directory?deal=buy', label: 'Buy Property' },
                { to: '/directory?deal=rent', label: 'Rent Property' },
              ].map(({ to, label }) => (
                <li key={to}><Link to={to} className="text-cream/60 hover:text-gold transition-colors">{label}</Link></li>
              ))}
            </ul>
          </div>

          {/* Contact & Newsletter */}
          <div>
            <h3 className="text-gold font-display font-semibold uppercase tracking-wider text-sm mb-5">Contact</h3>
            <div className="space-y-3 text-sm mb-6">
              <a href="mailto:hello@propertyherald.in" className="flex items-center text-cream/60 hover:text-gold transition-colors">
                <Mail className="w-4 h-4 mr-2 text-gold/50" />hello@propertyherald.in
              </a>
            </div>
            <div>
              <p className="text-xs text-cream/50 uppercase tracking-wider font-display font-semibold mb-3">Newsletter</p>
              {subState === 'done' ? (
                <p className="text-sm text-gold font-medium">Subscribed! Thank you.</p>
              ) : (
                <form onSubmit={handleSubscribe} className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Your email"
                    className="flex-1 px-3 py-2 text-sm bg-navy-800 border border-gold/20 rounded-lg text-cream placeholder-cream/30 focus:outline-none focus:border-gold/50 transition-colors"
                  />
                  <button type="submit" disabled={subState === 'loading'} className="px-3 py-2 bg-gold text-navy text-sm font-bold rounded-lg hover:bg-gold-400 transition-colors disabled:opacity-60">
                    {subState === 'loading' ? '…' : 'Join'}
                  </button>
                </form>
              )}
              {subState === 'error' && <p className="text-xs text-red-400 mt-1">Something went wrong. Try again.</p>}
            </div>
          </div>
        </div>

        {/* Gold divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent mb-6" />

        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-cream/40">
          <p>© {new Date().getFullYear()} Property Herald. All rights reserved.</p>
          <p>India's Premier Real Estate Intelligence Platform</p>
        </div>
      </div>
    </footer>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <AmbassadorWidget />
    </div>
  );
}
