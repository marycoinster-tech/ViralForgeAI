import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Zap, Mail, Lock, User, Loader2, ArrowRight, Sparkles, CheckCircle } from 'lucide-react';
import viralforgerMascot from '@/assets/viralforger-mascot.png';

const ONBOARDING_PERKS = [
  '10 free credits to start',
  'Scroll-stopping hooks in seconds',
  'Gen Z captions that actually hit',
  'Hook Battle — 5 variations at once',
];

export function Signup() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'verify'>('email');
  const [loading, setLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login } = useAuth();
  const formStateRef = useRef({ email: '', username: '', password: '', otp: '', step: 'email' as 'email' | 'verify' });
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get('ref') || localStorage.getItem('viralforge_ref') || '';

  useEffect(() => {
    const savedState = localStorage.getItem('viralforge_signup_state');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setEmail(parsed.email || '');
        setUsername(parsed.username || '');
        setPassword(parsed.password || '');
        setOtp(parsed.otp || '');
        setStep(parsed.step || 'email');
        if (parsed.resendCountdown > 0) setResendCountdown(parsed.resendCountdown);
      } catch (e) {}
    }
    const refFromUrl = new URLSearchParams(window.location.search).get('ref');
    if (refFromUrl) localStorage.setItem('viralforge_ref', refFromUrl);
  }, []);

  useEffect(() => {
    formStateRef.current = { email, username, password, otp, step };
    localStorage.setItem('viralforge_signup_state', JSON.stringify({ email, username, password, otp, step, resendCountdown }));
  }, [email, username, password, otp, step, resendCountdown]);

  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
      if (error) throw error;
      toast({ title: 'Code sent! 📧', description: 'Check your email for the OTP' });
      setStep('verify');
      setResendCountdown(60);
    } catch (error: any) {
      toast({ title: 'Failed to send code', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCountdown > 0) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
      if (error) throw error;
      toast({ title: 'OTP resent! 📧' });
      setResendCountdown(60);
    } catch (error: any) {
      toast({ title: 'Failed to resend', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' });
      if (error) throw error;
      const { data: updateData, error: updateError } = await supabase.auth.updateUser({ password, data: { username } });
      if (updateError) throw updateError;
      if (updateData.user) {
        localStorage.removeItem('viralforge_signup_state');
        const storedRef = localStorage.getItem('viralforge_ref');
        if (storedRef) {
          try {
            const { data: refResult, error: refError } = await supabase.rpc('process_referral', {
              p_referrer_username: storedRef,
              p_referee_id: updateData.user.id,
            });
            if (!refError && refResult?.success) {
              toast({ title: '🎉 Referral bonus!', description: `You and ${storedRef} both got 3 bonus credits!` });
            }
          } catch (e) {}
          localStorage.removeItem('viralforge_ref');
        }
        login({
          id: updateData.user.id,
          email: updateData.user.email!,
          username: username || updateData.user.email!.split('@')[0],
          credits: 10,
        });
        navigate('/app');
      }
    } catch (error: any) {
      toast({ title: 'Signup failed', description: error.message, variant: 'destructive' });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel — marketing */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-primary">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary-foreground/15 flex items-center justify-center">
            <Zap className="h-5 w-5 text-primary-foreground" fill="currentColor" />
          </div>
          <span className="text-xl font-black text-primary-foreground">ViralForge AI</span>
        </div>

        <div className="space-y-8">
          <div className="flex justify-center">
            <img src={viralforgerMascot} alt="ViralForger" className="w-52 h-52 object-contain animate-spark-float" />
          </div>
          <div className="space-y-3">
            <h2 className="text-4xl font-black text-primary-foreground leading-tight">
              Your AI content<br />partner is ready ⚡
            </h2>
            <p className="text-primary-foreground/70 text-lg leading-relaxed">
              Join thousands of Gen Z creators going viral every day.
            </p>
          </div>
          <div className="space-y-3">
            {ONBOARDING_PERKS.map((perk, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-full bg-primary-foreground/20 flex items-center justify-center shrink-0">
                  <CheckCircle className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
                <span className="text-sm font-semibold text-primary-foreground">{perk}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-xs text-primary-foreground/50">© 2026 ViralForge AI</div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          {/* Mobile logo */}
          <div className="lg:hidden text-center space-y-2">
            <div className="flex justify-center">
              <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg glow-primary">
                <Zap className="h-7 w-7 text-primary-foreground" fill="currentColor" />
              </div>
            </div>
            <h1 className="text-2xl font-black text-gradient">ViralForge AI</h1>
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-black">{step === 'email' ? 'Create your account' : 'Verify & set up'}</h2>
            <p className="text-muted-foreground text-sm">
              {step === 'email' ? 'Start going viral for free — 10 credits on us' : `We sent a code to ${email}`}
            </p>
          </div>

          {referralCode && (
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-primary/10 electric-border">
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
              <p className="text-sm font-semibold text-primary">Referral bonus: You'll get 3 extra credits!</p>
            </div>
          )}

          <div className="space-y-4">
            {step === 'email' ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold">Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4.5 w-4.5 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-11"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 font-black bg-primary text-primary-foreground hover:bg-primary/90 gap-2" disabled={loading}>
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Sending code…</> : <>Continue <ArrowRight className="h-4 w-4" /></>}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyAndSignup} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold">Verification code</label>
                  <Input
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                    disabled={loading}
                    maxLength={6}
                    className="h-11 text-center text-xl font-black tracking-widest"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold">Username</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input type="text" placeholder="Your creator name" value={username} onChange={(e) => setUsername(e.target.value)} className="pl-9 h-11" required disabled={loading} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9 h-11" required disabled={loading} minLength={6} />
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 font-black bg-primary text-primary-foreground hover:bg-primary/90 gap-2" disabled={loading}>
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Creating account…</> : <>Create Account <ArrowRight className="h-4 w-4" /></>}
                </Button>
                <div className="flex items-center justify-between text-sm">
                  <button type="button" className="text-muted-foreground hover:text-foreground font-medium transition-colors" onClick={() => setStep('email')} disabled={loading}>← Back</button>
                  {resendCountdown > 0 ? (
                    <span className="text-muted-foreground text-xs">Resend in {resendCountdown}s</span>
                  ) : (
                    <button type="button" onClick={handleResendOtp} disabled={loading} className="text-primary font-bold hover:underline text-xs">Resend code</button>
                  )}
                </div>
              </form>
            )}

            <div className="text-center text-sm pt-2">
              <span className="text-muted-foreground">Already have an account? </span>
              <Link to="/login" className="text-primary font-black hover:underline">Sign in</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
