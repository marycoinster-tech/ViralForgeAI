import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  Zap, Mail, Lock, Loader2, ArrowRight,
  Sparkles, Swords, CalendarDays, Eye, EyeOff, AlertCircle,
} from 'lucide-react';
import viralforgerMascot from '@/assets/viralforger-mascot.png';

const FEATURES = [
  { icon: <Sparkles className="h-4 w-4" />, text: 'AI hooks & viral scripts' },
  { icon: <Swords className="h-4 w-4" />, text: 'Hook Battle — 5 variations' },
  { icon: <CalendarDays className="h-4 w-4" />, text: 'Content calendar' },
  { icon: <Zap className="h-4 w-4" />, text: '10 free credits to start' },
];

function parseAuthError(msg: string): { email?: string; password?: string; general?: string } {
  const m = msg.toLowerCase();
  if (m.includes('invalid login credentials') || m.includes('invalid email or password')) {
    return { password: 'Incorrect password. Try again or reset it below.' };
  }
  if (m.includes('email not confirmed')) {
    return { email: 'Email not verified. Check your inbox.' };
  }
  if (m.includes('user not found') || m.includes('no user')) {
    return { email: 'No account found with this email.' };
  }
  if (m.includes('too many requests') || m.includes('rate limit')) {
    return { general: 'Too many attempts. Please wait a minute and try again.' };
  }
  return { general: msg };
}

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      if (data.user) {
        login({
          id: data.user.id,
          email: data.user.email!,
          username: data.user.user_metadata?.username || data.user.email!.split('@')[0],
          credits: 10,
        });
        navigate('/app');
      }
    } catch (error: any) {
      const parsed = parseAuthError(error.message || '');
      setErrors(parsed);
      if (parsed.password) setShowReset(true);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setResetSent(true);
    } catch (error: any) {
      setErrors({ general: error.message });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between p-10 bg-primary flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary-foreground/15 flex items-center justify-center">
            <Zap className="h-5 w-5 text-primary-foreground" fill="currentColor" />
          </div>
          <span className="text-xl font-black text-primary-foreground">ViralForge AI</span>
        </div>

        <div className="space-y-8">
          <div className="flex justify-center">
            <img src={viralforgerMascot} alt="ViralForger" className="w-44 h-44 object-contain animate-spark-float" />
          </div>
          <div className="space-y-3">
            <h2 className="text-3xl font-black text-primary-foreground leading-tight">
              Welcome back,<br />creator ⚡
            </h2>
            <p className="text-primary-foreground/70 text-sm leading-relaxed">
              Your AI content engine is warmed up and ready to go viral.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-primary-foreground/10">
                <span className="text-primary-foreground/80 shrink-0">{f.icon}</span>
                <span className="text-xs font-semibold text-primary-foreground">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-xs text-primary-foreground/50">© 2026 ViralForge AI</div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-5 sm:p-8 lg:p-12 min-w-0">
        <div className="w-full max-w-sm space-y-6 animate-fade-in">
          {/* Mobile logo */}
          <div className="lg:hidden text-center space-y-2">
            <div className="flex justify-center">
              <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg glow-primary">
                <Zap className="h-7 w-7 text-primary-foreground" fill="currentColor" />
              </div>
            </div>
            <h1 className="text-xl font-black text-gradient">ViralForge AI</h1>
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-black">Sign in</h2>
            <p className="text-muted-foreground text-sm">Enter your credentials to continue</p>
          </div>

          {/* General error */}
          {errors.general && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errors.general}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-bold">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrors(prev => ({ ...prev, email: undefined })); }}
                  className={`pl-10 h-11 ${errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  required
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
              {errors.email && (
                <p className="text-xs text-destructive flex items-center gap-1.5 mt-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-sm font-bold">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors(prev => ({ ...prev, password: undefined })); }}
                  className={`pl-10 pr-11 h-11 ${errors.password ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  required
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive flex items-center gap-1.5 mt-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {errors.password}
                </p>
              )}
            </div>

            {/* Reset password toggle */}
            {showReset && (
              <div className="animate-fade-in">
                {!resetSent ? (
                  <form onSubmit={handleResetPassword} className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground">
                      Enter your email and we'll send a reset link:
                    </p>
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        value={resetEmail || email}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="h-9 text-sm flex-1"
                        disabled={resetLoading}
                      />
                      <Button type="submit" size="sm" className="h-9 px-3 bg-primary text-primary-foreground" disabled={resetLoading}>
                        {resetLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Send'}
                      </Button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowReset(false)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <div className="p-3.5 rounded-xl bg-green-500/10 border border-green-500/30 text-xs text-green-400 font-semibold">
                    ✅ Reset link sent! Check your inbox.
                  </div>
                )}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 font-black bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
              disabled={loading}
            >
              {loading
                ? <><Loader2 className="h-4 w-4 animate-spin" />Signing in…</>
                : <>Sign in <ArrowRight className="h-4 w-4" /></>}
            </Button>
          </form>

          {!showReset && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => { setShowReset(true); setResetEmail(email); }}
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                Forgot password?
              </button>
            </div>
          )}

          <div className="text-center text-sm">
            <span className="text-muted-foreground">No account yet? </span>
            <Link to="/signup" className="text-primary font-black hover:underline">Sign up free</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
