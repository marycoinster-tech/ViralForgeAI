import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Zap, Sparkles, Flame, Swords, Dna, CalendarDays, ArrowRight, Star, Bolt } from 'lucide-react';
import viralforgerMascot from '@/assets/viralforger-mascot.png';

export function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border/40 sticky top-0 z-50 bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between px-4 max-w-6xl mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="h-5 w-5 text-primary-foreground" fill="currentColor" />
            </div>
            <h1 className="text-xl font-black text-gradient">ViralForge AI</h1>
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <Link to="/app">
                <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-bold">
                  <Sparkles className="h-4 w-4" />
                  Open App
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" className="font-semibold">Sign in</Button>
                </Link>
                <Link to="/signup">
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold">
                    Get Started Free
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="container px-4 pt-16 pb-12 max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left */}
            <div className="space-y-6 animate-fade-in">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-xs font-bold text-primary uppercase tracking-wide">
                <Flame className="h-3.5 w-3.5" />
                AI Content Engine for Gen Z
              </div>

              <h1 className="text-5xl sm:text-6xl font-black tracking-tight leading-[1.05]">
                Go <span className="text-gradient">Viral</span>
                <br />in Seconds ⚡
              </h1>

              <p className="text-lg text-muted-foreground leading-relaxed max-w-md">
                Stop overthinking. Get scroll-stopping hooks, viral scripts, Gen Z captions, and trending hashtags — all in one shot.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link to={user ? '/app' : '/signup'}>
                  <Button size="lg" className="h-12 px-7 text-base font-black bg-primary text-primary-foreground hover:bg-primary/90 glow-primary gap-2">
                    Start For Free
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to={user ? '/app/hook-battle' : '/signup'}>
                  <Button size="lg" variant="outline" className="h-12 px-7 text-base font-bold gap-2 electric-border">
                    <Swords className="h-4 w-4 text-primary" />
                    Hook Battle
                  </Button>
                </Link>
              </div>

              <div className="flex items-center gap-4 pt-2">
                <div className="flex -space-x-2">
                  {['#FFE500','#FF6B6B','#4ECDC4','#A8E6CF'].map((c,i) => (
                    <div key={i} className="h-7 w-7 rounded-full border-2 border-background flex items-center justify-center text-xs font-black" style={{ background: c }}>
                      {['Z','G','C','A'][i]}
                    </div>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground">
                  <span className="font-black text-foreground">10,000+</span> creators going viral
                </div>
                <div className="flex items-center gap-0.5">
                  {[1,2,3,4,5].map(i => <Star key={i} className="h-3 w-3 fill-primary text-primary" />)}
                </div>
              </div>
            </div>

            {/* Right — mascot card */}
            <div className="flex justify-center lg:justify-end animate-slide-up">
              <div className="relative">
                <div className="w-72 h-72 rounded-3xl bg-primary flex items-center justify-center shadow-2xl glow-primary overflow-hidden">
                  <img
                    src={viralforgerMascot}
                    alt="ViralForger AI Mascot"
                    className="w-64 h-64 object-contain animate-spark-float"
                  />
                </div>
                {/* Floating badges */}
                <div className="absolute -top-4 -right-4 bg-card border electric-border-strong rounded-xl px-3 py-2 shadow-lg animate-bounce-in">
                  <div className="text-xs font-black text-primary">⚡ HOOK GENERATED</div>
                  <div className="text-[10px] text-muted-foreground">0.3s response</div>
                </div>
                <div className="absolute -bottom-4 -left-4 bg-primary rounded-xl px-3 py-2 shadow-lg animate-bounce-in" style={{ animationDelay: '0.2s' }}>
                  <div className="text-xs font-black text-primary-foreground">🔥 Viral Score: 94</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Cards */}
        <section className="container px-4 pb-16 max-w-6xl mx-auto">
          <div className="grid sm:grid-cols-3 gap-5">
            <div className="rounded-2xl p-6 space-y-3 border border-border/50 bg-card hover:electric-border-strong transition-all group">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-colors">
                <Flame className="h-5 w-5 text-primary group-hover:text-primary-foreground transition-colors" />
              </div>
              <h3 className="font-black text-base">Scroll-Stopping Hooks</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Hooks that grab attention in 0.5 seconds. Powered by real viral psychology and Gen Z language patterns.
              </p>
            </div>
            <div className="rounded-2xl p-6 space-y-3 border border-border/50 bg-card hover:electric-border-strong transition-all group">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-colors">
                <Dna className="h-5 w-5 text-primary group-hover:text-primary-foreground transition-colors" />
              </div>
              <h3 className="font-black text-base">Viral DNA Decoder</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Reverse-engineer any viral video and get your own version for your niche. Know exactly why it blew up.
              </p>
            </div>
            <div className="rounded-2xl p-6 space-y-3 border border-border/50 bg-card hover:electric-border-strong transition-all group">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-colors">
                <CalendarDays className="h-5 w-5 text-primary group-hover:text-primary-foreground transition-colors" />
              </div>
              <h3 className="font-black text-base">Content Calendar</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Schedule posts, get optimal posting time suggestions, and never miss a drop again.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/40 py-6 px-4 bg-card/30">
        <div className="container max-w-6xl mx-auto text-center text-sm text-muted-foreground">
          <div className="flex items-center justify-center gap-2">
            <Zap className="h-4 w-4 text-primary" fill="currentColor" />
            <span>Built for creators who want to win — ViralForge AI © 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
