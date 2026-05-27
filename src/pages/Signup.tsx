import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Zap, Mail, Lock, User, Loader2 } from 'lucide-react';

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

  // Persist form state to survive page focus/blur
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
        if (parsed.resendCountdown > 0) {
          setResendCountdown(parsed.resendCountdown);
        }
      } catch (e) {
        console.error('Failed to restore signup state');
      }
    }

    // Persist referral code from URL to localStorage so it survives page reloads
    const refFromUrl = new URLSearchParams(window.location.search).get('ref');
    if (refFromUrl) {
      localStorage.setItem('viralforge_ref', refFromUrl);
    }
  }, []);

  // Save form state whenever it changes
  useEffect(() => {
    formStateRef.current = { email, username, password, otp, step };
    localStorage.setItem('viralforge_signup_state', JSON.stringify({
      email,
      username,
      password,
      otp,
      step,
      resendCountdown
    }));
  }, [email, username, password, otp, step, resendCountdown]);

  // Clear saved state on successful signup
  const clearSavedState = () => {
    localStorage.removeItem('viralforge_signup_state');
  };

  // Countdown timer for resend
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
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });

      if (error) throw error;

      toast({
        title: 'Verification code sent! 📧',
        description: 'Check your email for the OTP code',
      });

      setStep('verify');
      setResendCountdown(60);
    } catch (error: any) {
      toast({
        title: 'Failed to send code',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCountdown > 0) return;
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });

      if (error) throw error;

      toast({
        title: 'OTP resent! 📧',
        description: 'Check your email for a new verification code',
      });

      setResendCountdown(60);
    } catch (error: any) {
      toast({
        title: 'Failed to resend OTP',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Verify OTP
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email',
      });

      if (error) throw error;

      // Set password and username
      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        password,
        data: { username },
      });

      if (updateError) throw updateError;

      if (updateData.user) {
        // Clear saved state
        clearSavedState();

        // Process referral if a ref code was captured
        const storedRef = localStorage.getItem('viralforge_ref');
        if (storedRef) {
          try {
            const { data: refResult, error: refError } = await supabase.rpc('process_referral', {
              p_referrer_username: storedRef,
              p_referee_id: updateData.user.id,
            });
            if (!refError && refResult?.success) {
              console.log('Referral processed:', refResult);
              toast({
                title: '🎉 Referral bonus!',
                description: `You and ${storedRef} both received 3 bonus credits!`,
              });
            }
          } catch (e) {
            console.error('Referral processing failed (non-critical):', e);
          }
          localStorage.removeItem('viralforge_ref');
        }

        // Login with user data (AuthContext will handle profile creation)
        login({
          id: updateData.user.id,
          email: updateData.user.email!,
          username: username || updateData.user.email!.split('@')[0],
          credits: 10,
        });

        navigate('/app');
      }
    } catch (error: any) {
      toast({
        title: 'Signup failed',
        description: error.message,
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Zap className="h-12 w-12 text-primary animate-glow-pulse" fill="currentColor" />
              <div className="absolute inset-0 blur-2xl bg-primary/50 animate-pulse" />
            </div>
          </div>
          <h1 className="text-3xl font-black">
            <span className="text-gradient">ViralForge AI</span>
          </h1>
          <p className="text-muted-foreground">Start creating viral content</p>
        </div>

        {/* Signup Form */}
        <div className="glass-card p-8 space-y-6">
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-bold">Create account</h2>
            <p className="text-sm text-muted-foreground">
              {step === 'email' ? 'Enter your email to get started' : 'Verify your email and set password'}
            </p>
          </div>

          {step === 'email' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 font-semibold"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending code...
                  </>
                ) : (
                  'Continue with Email'
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyAndSignup} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Verification Code</label>
                <Input
                  type="text"
                  placeholder="Enter OTP from email"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  disabled={loading}
                  maxLength={6}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    disabled={loading}
                    minLength={6}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 font-semibold"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>

              <div className="space-y-3">
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setStep('email')}
                  disabled={loading}
                >
                  ← Back to email
                </Button>

                {/* Resend OTP */}
                <div className="text-center text-sm">
                  <span className="text-muted-foreground">Didn't receive the code? </span>
                  {resendCountdown > 0 ? (
                    <span className="text-muted-foreground font-semibold">
                      Resend in {resendCountdown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={loading}
                      className="text-primary font-semibold hover:underline disabled:opacity-50"
                    >
                      Resend OTP
                    </button>
                  )}
                </div>
              </div>
            </form>
          )}

          <div className="text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link to="/login" className="text-primary font-semibold hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
