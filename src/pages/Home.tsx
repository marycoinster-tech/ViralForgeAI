import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Zap, Sparkles, Flame, Target } from 'lucide-react';

export function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b border-border/40 glass backdrop-blur">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" fill="currentColor" />
            <h1 className="text-xl font-black text-gradient">ViralForge AI</h1>
          </div>
          <div className="flex gap-2">
            <Link to="/login">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link to="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 container px-4 py-16 flex flex-col items-center justify-center">
        <div className="max-w-4xl text-center space-y-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-semibold text-primary mb-4">
            <Sparkles className="h-4 w-4" />
            AI-Powered Viral Content Generator
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight">
            Go <span className="text-gradient">Viral</span> in Seconds
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Stop overthinking your content. Get scroll-stopping hooks, viral scripts, and engagement-optimized captions. Built for Gen Z creators who want results.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link to="/signup">
              <Button size="lg" className="h-14 px-8 text-lg font-bold glow-primary">
                <Sparkles className="mr-2 h-5 w-5" />
                Start Creating Free
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg font-bold">
                Sign In
              </Button>
            </Link>
          </div>

          {/* Features */}
          <div className="grid sm:grid-cols-3 gap-6 pt-16">
            <div className="glass-card p-6 space-y-3">
              <Flame className="h-8 w-8 text-primary mx-auto" />
              <h3 className="font-bold">Scroll-Stopping Hooks</h3>
              <p className="text-sm text-muted-foreground">
                Hooks that grab attention in 0.5 seconds. Optimized for TikTok, Reels, and Shorts.
              </p>
            </div>

            <div className="glass-card p-6 space-y-3">
              <Target className="h-8 w-8 text-primary mx-auto" />
              <h3 className="font-bold">Viral Scripts</h3>
              <p className="text-sm text-muted-foreground">
                7-15 second scripts following proven viral formulas. No fluff, pure engagement.
              </p>
            </div>

            <div className="glass-card p-6 space-y-3">
              <Sparkles className="h-8 w-8 text-primary mx-auto" />
              <h3 className="font-bold">Gen Z Captions</h3>
              <p className="text-sm text-muted-foreground">
                Captions that actually sound human. No cringe corporate AI language.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-6 px-4">
        <div className="container text-center text-sm text-muted-foreground">
          <p>Built for creators who want to win. Made with 🔥 by ViralForge AI</p>
        </div>
      </footer>
    </div>
  );
}
