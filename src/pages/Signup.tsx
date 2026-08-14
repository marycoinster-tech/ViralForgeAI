import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  Zap, Mail, Lock, User, Loader2, ArrowRight,
  Sparkles, CheckCircle, Eye, EyeOff, AlertCircle,
} from 'lucide-react';
import viralforgerMascot from '@/assets/viralforger-mascot.png';

const PERKS = [
  '10 free credits to start',
  'Scroll-stopping hooks in seconds',
  'Gen Z captions that actually hit',
  'Hook Battle — 5 variations at once',
];

function parseSignupError(msg: string): { email?: string; otp?: string; password?: string; general?: string } {
  const m = msg.toLowerCase();
  if (m.includes('email already') || m.includes('already registered') || m.includes('already in use')) {
    return { email: 'This email is already registered. Sign in instead.' };
  }
  if (m.includes('invalid otp') || m.includes('token') || m.includes('expired') || m.includes('otp')) {
    return { otp: 'Invalid or expired code. Request a new one.' };
  }
  if (m.includes('password') && m.includes('short')) {
    return { password: 'Password must be at least 6 characters.' };
  }
  if (m.includes('rate limit') || m.includes('too many')) {
    return { general: 'Too many attempts. Please wait a minute.' };
  }
  return { general: msg };
}

export function Signup() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'verify'>('email');
  const [loading, setLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [errors, setErrors] = useState<{ email?: string; otp?: string; password?: string; general?: string }>({});
  const navigate = useNavigate();
  const { login } = useAuth();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get('ref') || localStorage.getItem('viralforge_ref') || '';

  const formStateRef = useRef({ email, username, password, otp, step });

  useEffect(() => {
    const saved = localStorage.getItem('viralforge_signup_state');
    if (saved) {
      try {
        const p = JSON.parse(saved);
        setEmail(p.email || '');
        setUsername(p.username || '');
        setOtp(p.otp || '');
        setStep(p.step || 'email');
        if (p.resendCountdown > 0) setResendCountdown(p.resendCountdown);
      } catch { /* ignore */ }
    }
    const refFromUrl = new URLSearchParams(window.location.search).get('ref');
    if (refFromUrl) localStorage.setItem('viralforge_ref', refFromUrl);
  }, []);

  useEffect(() => {
    formStateRef.current = { email, username, password, otp, step };
    localStorage.setItem('viralforge_signup_state', JSON.stringify({ email, username, otp, step, resendCountdown }));
  }, [email, username, otp, step, resendCountdown]);

  useEffect(() => {
    if (resendCountdown > 0) {
      const t = setTimeout(() => setResendCountdown(v => v - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendCountdown]);

  const passwordStrength = (): { label: string; color: string; pct: number } => {
    const p = password;
    if (!p) return { label: '', color: '', pct: 0 };
    let score = 0;
    if (p.length >= 6) score++;
    if (p.length >= 10) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    if (score <= 1) return { label: 'Weak', color: 'bg-red-500', pct: 25 };
    if (score <= 2) return { label: 'Fair', color: 'bg-amber-400', pct: 50 };
    if (score <= 3) return { label: 'Good', color: 'bg-yellow-400', pct: 75 };
    return { label: 'Strong', color: 'bg-green-500', pct: 100 };
  };

  const strength = passwordStrength();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
      if (error) throw error;
      setStep('verify');
      setResendCountdown(60);
    } catch (error: any) {
      setErrors(parseSignupError(error.message || ''));
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCountdown > 0) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
      if (error) throw error;
      setResendCountdown(60);
    } catch (error: any) {
      setErrors(parseSignupError(error.message || ''));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (password.length < 6) {
      setErrors({ password: 'Password must be at least 6 characters.' });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({ email: email.trim(), token: otp, type: 'email' });
      if (error) throw error;

      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        password,
        data: { username: username.trim() || email.split('@')[0] },
      });
      if (updateError) throw updateError;

      if (updateData.user) {
        localStorage.removeItem('viralforge_signup_state');
        const storedRef = localStorage.getItem('viralforge_ref');
        if (storedRef) {
          try {
            await supabase.rpc('process_referral', {
              p_referrer_username: storedRef,
              p_referee_id: updateData.user.id,
            });
          } catch { /* noop */ }
          localStorage.removeItem('viralforge_ref');
        }
        login({
          id: updateData.user.id,
          email: updateData.user.email!,
          username: username.trim() || updateData.user.email!.split('@')[0],
          credits: 10,
        });
        navigate('/app');
      }
    } catch (error: any) {
      setErrors(parseSignupError(error.message || ''));
    } finally {
      setLoading(false);
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
              Your AI content<br />partner is ready ⚡
            </h2>
            <p className="text-primary-foreground/70 text-sm leading-relaxed">
              Join thousands of Gen Z creators going viral every day.
            </p>
          </div>
          <div className="space-y-2.5">
            {PERKS.map((perk, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-5 w-5 rounded-full bg-primary-foreground/20 flex items-center justify-center shrink-0">
                  <CheckCircle className="h-3 w-3 text-primary-foreground" />
                </div>
                <span className="text-sm font-semibold text-primary-foreground">{perk}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-xs text-primary-foreground/50">© 2026 ViralForge AI</div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-5 sm:p-8 lg:p-12 min-w-0 overflow-y-auto">
        <div className="w-full max-w-sm space-y-5 animate-fade-in py-4">
          {/* Mobile logo */}
          <div className="lg:hidden text-center space-y-2">
            <div className="flex justify-center">
              <div className="h-11 w-11 rounded-2xl bg-primary flex items-center justify-center shadow-lg glow-primary">
                <Zap className="h-6 w-6 text-primary-foreground" fill="currentColor" />
              </div>
            </div>
            <h1 className="text-xl font-black text-gradient">ViralForge AI</h1>
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-black">
              {step === 'email' ? 'Create your account' : 'Verify & set up'}
            </h2>
            <p className="text-muted-foreground text-sm">
              {step === 'email'
                ? 'Start going viral — 10 credits on us'
                : `Code sent to ${email}`}
            </p>
          </div>

          {referralCode && (
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-primary/10 electric-border">
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
              <p className="text-xs font-semibold text-primary">Referral bonus: You'll get 3 extra credits!</p>
            </div>
          )}

          {errors.general && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errors.general}</span>
            </div>
          )}

          {step === 'email' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setErrors({}); }}
                    className={`pl-10 h-11 ${errors.email ? 'border-destructive' : ''}`}
                    required
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-destructive flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />{errors.email}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-11 font-black bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
                disabled={loading}
              >
                {loading
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Sending code…</>
                  : <>Continue <ArrowRight className="h-4 w-4" /></>}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              {/* OTP */}
              <div className="space-y-1.5">
                <label className="text-sm font-bold">Verification code</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="6-digit code"
                  value={otp}
                  onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '')); setErrors(prev => ({ ...prev, otp: undefined })); }}
                  required
                  disabled={loading}
                  maxLength={6}
                  className={`h-11 text-center text-xl font-black tracking-widest ${errors.otp ? 'border-destructive' : ''}`}
                  autoComplete="one-time-code"
                />
                {errors.otp && (
                  <p className="text-xs text-destructive flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />{errors.otp}
                  </p>
                )}
              </div>

              {/* Username */}
              <div className="space-y-1.5">
                <label className="text-sm font-bold">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="text"
                    placeholder="Your creator name"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-9 h-11"
                    required
                    disabled={loading}
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-sm font-bold">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min. 6 characters"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setErrors(prev => ({ ...prev, password: undefined })); }}
                    className={`pl-9 pr-11 h-11 ${errors.password ? 'border-destructive' : ''}`}
                    required
                    disabled={loading}
                    minLength={6}
                    autoComplete="new-password"
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

                {/* Password strength bar */}
                {password.length > 0 && (
                  <div className="space-y-1">
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                        style={{ width: `${strength.pct}%` }}
                      />
                    </div>
                    <p className={`text-xs font-semibold ${
                      strength.pct <= 25 ? 'text-red-500' :
                      strength.pct <= 50 ? 'text-amber-400' :
                      strength.pct <= 75 ? 'text-yellow-400' : 'text-green-500'
                    }`}>
                      {strength.label}
                    </p>
                  </div>
                )}

                {errors.password && (
                  <p className="text-xs text-destructive flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />{errors.password}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-11 font-black bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
                disabled={loading}
              >
                {loading
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Creating account…</>
                  : <>Create Account <ArrowRight className="h-4 w-4" /></>}
              </Button>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground font-medium transition-colors text-xs"
                  onClick={() => { setStep('email'); setErrors({}); }}
                  disabled={loading}
                >
                  ← Back
                </button>
                {resendCountdown > 0 ? (
                  <span className="text-muted-foreground text-xs">Resend in {resendCountdown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={loading}
                    className="text-primary font-bold hover:underline text-xs"
                  >
                    Resend code
                  </button>
                )}
              </div>
            </form>
          )}

          <div className="text-center text-sm pt-1">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link to="/login" className="text-primary font-black hover:underline">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
