import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Zap, Mail, Lock, Loader2, ArrowRight, Sparkles, Swords, Dna, CalendarDays } from 'lucide-react';
import viralforgerMascot from '@/assets/viralforger-mascot.png';

const FEATURES = [
  { icon: <Sparkles className="h-4 w-4" />, text: 'AI hooks & viral scripts' },
  { icon: <Swords className="h-4 w-4" />, text: 'Hook Battle — 5 variations' },
  { icon: <Dna className="h-4 w-4" />, text: 'Viral DNA decoder' },
  { icon: <CalendarDays className="h-4 w-4" />, text: 'Content calendar' },
];

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
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
      toast({ title: 'Login failed', description: error.message, variant: 'destructive' });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel */}
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
              Welcome back,<br />creator ⚡
            </h2>
            <p className="text-primary-foreground/70 leading-relaxed">Your AI content engine is warmed up and ready to go viral.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-primary-foreground/10">
                <span className="text-primary-foreground/80">{f.icon}</span>
                <span className="text-xs font-semibold text-primary-foreground">{f.text}</span>
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
            <h2 className="text-3xl font-black">Sign in</h2>
            <p className="text-muted-foreground text-sm">Enter your credentials to continue creating</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-11" required disabled={loading} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 h-11" required disabled={loading} />
              </div>
            </div>
            <Button type="submit" className="w-full h-11 font-black bg-primary text-primary-foreground hover:bg-primary/90 gap-2" disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Signing in…</> : <>Sign in <ArrowRight className="h-4 w-4" /></>}
            </Button>
          </form>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">No account yet? </span>
            <Link to="/signup" className="text-primary font-black hover:underline">Sign up free</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
