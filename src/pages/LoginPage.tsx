import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

export function LoginPage() {
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) { setError(`Login failed: ${error.message}`); setLoading(false); }
    else navigate(email === 'nirmalserai@gmail.com' ? '/admin' : '/dashboard');
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/dashboard`,
    });
    setLoading(false);
    if (error) setError(error.message);
    else setResetSent(true);
  };

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/">
            <img src="/logo.png.png" alt="Property Herald" className="h-24 w-auto mx-auto object-contain drop-shadow-2xl"
              onError={(e) => {
                const t = e.target as HTMLImageElement;
                t.style.display = 'none';
                const fb = t.nextElementSibling as HTMLElement;
                if (fb) fb.style.display = 'flex';
              }} />
            <div className="hidden w-16 h-16 bg-gold rounded-xl items-center justify-center mx-auto">
              <span className="text-navy font-serif font-bold text-2xl">PH</span>
            </div>
          </Link>
          <h1 className="text-2xl font-serif font-bold text-cream mt-6">
            {mode === 'login' ? 'Welcome Back' : 'Reset Password'}
          </h1>
          <p className="text-cream/60 mt-2">
            {mode === 'login' ? 'Sign in to your Property Herald account' : 'Enter your email to receive a reset link'}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {error && (
            <div className="flex items-center p-4 bg-red-50 text-red-700 rounded-xl mb-6">
              <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {resetSent ? (
            <div className="text-center py-4">
              <CheckCircle className="w-12 h-12 text-gold mx-auto mb-4" />
              <h3 className="font-serif font-bold text-navy text-lg mb-2">Check Your Email</h3>
              <p className="text-warm-gray text-sm mb-4">We've sent a password reset link to <strong>{email}</strong>. Check your inbox and follow the instructions.</p>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-left">
                <p className="text-xs text-amber-800">
                  <strong>Didn't arrive within 5 minutes?</strong> Email delivery can occasionally be delayed.
                  If you still haven't received it, email <a href="mailto:nirmalserai@gmail.com" className="font-semibold underline">nirmalserai@gmail.com</a> and we'll reset it for you right away.
                </p>
              </div>
              <button onClick={() => { setMode('login'); setResetSent(false); }} className="text-navy font-semibold text-sm hover:text-gold transition-colors">
                ← Back to Sign In
              </button>
            </div>
          ) : mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold/40 focus:border-gold/60 outline-none transition-all" />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                  <button type="button" onClick={() => { setMode('forgot'); setError(''); }} className="text-xs text-gold hover:text-gold/80 font-medium transition-colors">
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold/40 focus:border-gold/60 outline-none transition-all" />
                  <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 bg-navy text-cream font-display font-bold rounded-xl hover:bg-navy/90 transition-all disabled:opacity-50">
                {loading ? 'Signing in…' : 'Sign In to Property Herald'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleForgot} className="space-y-5">
              <div>
                <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input id="reset-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold/40 focus:border-gold/60 outline-none transition-all" />
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 bg-navy text-cream font-display font-bold rounded-xl hover:bg-navy/90 transition-all disabled:opacity-50">
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
              <button type="button" onClick={() => { setMode('login'); setError(''); }} className="w-full text-sm text-gray-500 hover:text-navy transition-colors">
                ← Back to Sign In
              </button>
            </form>
          )}

          {mode === 'login' && !resetSent && (
            <div className="mt-6 text-center border-t border-gray-100 pt-6">
              <p className="text-gray-600 text-sm">
                Don't have an account?{' '}
                <Link to="/register" className="text-navy font-semibold hover:text-gold transition-colors">Register Now</Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
