import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import {
  Zap, Sparkles, Flame, Target, Swords, TrendingUp,
  ArrowRight, Dna, CalendarDays
} from 'lucide-react';

// ── Trending niches with heat data ───────────────────────────────────────────

const TRENDING_NICHES = [
  { niche: 'money',      emoji: '💰', heat: 98, tag: '#1 trending',    delta: '+12%',  color: 'from-green-500/20 to-emerald-500/10  border-green-500/40  text-green-300',  badge: 'bg-green-500/20 text-green-400' },
  { niche: 'ai & tech',  emoji: '🤖', heat: 94, tag: 'Exploding now',  delta: '+31%',  color: 'from-cyan-500/20  to-blue-500/10     border-cyan-500/40   text-cyan-300',   badge: 'bg-cyan-500/20  text-cyan-400' },
  { niche: 'gym',        emoji: '💪', heat: 89, tag: 'Hot this week',  delta: '+8%',   color: 'from-red-500/20   to-orange-500/10   border-red-500/40    text-red-300',    badge: 'bg-red-500/20   text-red-400' },
  { niche: 'anime',      emoji: '⚔️', heat: 87, tag: 'Always viral',  delta: '+5%',   color: 'from-violet-500/20 to-purple-500/10  border-violet-500/40 text-violet-300', badge: 'bg-violet-500/20 text-violet-400' },
  { niche: 'dating',     emoji: '💘', heat: 83, tag: 'Blowing up',     delta: '+19%',  color: 'from-pink-500/20  to-rose-500/10     border-pink-500/40   text-pink-300',   badge: 'bg-pink-500/20  text-pink-400' },
  { niche: 'storytime',  emoji: '🎙️', heat: 79, tag: 'Rising fast',   delta: '+14%',  color: 'from-amber-500/20 to-yellow-500/10   border-amber-500/40  text-amber-300',  badge: 'bg-amber-500/20 text-amber-400' },
  { niche: 'motivation', emoji: '🔥', heat: 75, tag: 'Consistent',    delta: '+3%',   color: 'from-orange-500/20 to-red-500/10     border-orange-500/40 text-orange-300', badge: 'bg-orange-500/20 text-orange-400' },
  { niche: 'gaming',     emoji: '🎮', heat: 71, tag: 'Steady climb',  delta: '+9%',   color: 'from-blue-500/20  to-indigo-500/10   border-blue-500/40   text-blue-300',   badge: 'bg-blue-500/20  text-blue-400' },
];

function HeatBar({ score }: { score: number }) {
  const color = score >= 90 ? 'from-red-500 to-orange-400' : score >= 75 ? 'from-amber-500 to-yellow-400' : 'from-blue-500 to-cyan-400';
  return (
    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden w-full">
      <div
        className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-700`}
        style={{ width: `${score}%` }}
      />
    </div>
  );
}

export function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [hoveredNiche, setHoveredNiche] = useState<string | null>(null);

  const handleNicheClick = (niche: string, action: 'battle' | 'generate') => {
    if (!user) {
      navigate('/signup');
      return;
    }
    if (action === 'battle') {
      navigate('/app/hook-battle', { state: { prefilledNiche: niche } });
    } else {
      navigate('/app', { state: { prefilledNiche: niche } });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b border-border/40 glass backdrop-blur sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" fill="currentColor" />
            <h1 className="text-xl font-black text-gradient">ViralForge AI</h1>
          </div>
          <div className="flex gap-2">
            {user ? (
              <Link to="/app">
                <Button className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Open App
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost">Sign in</Button>
                </Link>
                <Link to="/signup">
                  <Button>Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="container px-4 py-16 flex flex-col items-center justify-center">
          <div className="max-w-4xl text-center space-y-8 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-semibold text-primary">
              <Sparkles className="h-4 w-4" />
              AI-Powered Viral Content Generator
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight">
              Go <span className="text-gradient">Viral</span> in Seconds
            </h1>

            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Stop overthinking your content. Get scroll-stopping hooks, viral scripts, and engagement-optimized captions — built for Gen Z creators who want results.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link to={user ? '/app' : '/signup'}>
                <Button size="lg" className="h-14 px-8 text-lg font-bold glow-primary">
                  <Sparkles className="mr-2 h-5 w-5" />
                  Start Creating Free
                </Button>
              </Link>
              <Link to={user ? '/app/hook-battle' : '/signup'}>
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg font-bold gap-2">
                  <Swords className="h-5 w-5" />
                  Hook Battle
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* ── TRENDING NOW ──────────────────────────────────────────────── */}
        <section className="container px-4 pb-16">
          <div className="max-w-5xl mx-auto space-y-6">

            {/* Section header */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                  Live Trend Data
                </div>
                <h2 className="text-2xl md:text-3xl font-black">
                  🔥 Trending <span className="text-gradient">Right Now</span>
                </h2>
                <p className="text-sm text-muted-foreground">
                  Click any niche to instantly generate content or run a Hook Battle
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground/30 hidden sm:block" />
            </div>

            {/* Niche Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {TRENDING_NICHES.map((item) => {
                const isHovered = hoveredNiche === item.niche;
                return (
                  <div
                    key={item.niche}
                    onMouseEnter={() => setHoveredNiche(item.niche)}
                    onMouseLeave={() => setHoveredNiche(null)}
                    className={`relative glass-card p-4 border bg-gradient-to-br cursor-pointer transition-all duration-200 ${item.color} ${
                      isHovered ? 'scale-[1.02] shadow-lg' : 'hover:scale-[1.01]'
                    }`}
                  >
                    {/* Rank + badge */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl">{item.emoji}</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.badge}`}>
                          {item.delta}
                        </span>
                      </div>
                    </div>

                    {/* Niche name + tag */}
                    <p className="font-black text-base capitalize mb-0.5">{item.niche}</p>
                    <p className="text-[11px] opacity-70 mb-3">{item.tag}</p>

                    {/* Heat bar */}
                    <div className="space-y-1 mb-3">
                      <div className="flex justify-between text-[10px] opacity-60">
                        <span>Heat Score</span>
                        <span className="font-bold">{item.heat}/100</span>
                      </div>
                      <HeatBar score={item.heat} />
                    </div>

                    {/* Action buttons - revealed on hover */}
                    <div className={`grid grid-cols-2 gap-1.5 transition-all duration-200 ${
                      isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 pointer-events-none'
                    }`}>
                      <button
                        onClick={() => handleNicheClick(item.niche, 'battle')}
                        className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-background/50 hover:bg-background/80 text-[10px] font-bold transition-colors border border-white/10"
                      >
                        <Swords className="h-3 w-3" />
                        Hook Battle
                      </button>
                      <button
                        onClick={() => handleNicheClick(item.niche, 'generate')}
                        className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary text-[10px] font-bold transition-colors border border-primary/30"
                      >
                        <Sparkles className="h-3 w-3" />
                        Generate
                      </button>
                    </div>

                    {/* Default CTA when not hovered */}
                    <div className={`transition-all duration-200 ${
                      isHovered ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'
                    }`}>
                      <div className="flex items-center gap-1 text-[10px] opacity-50 font-semibold">
                        <ArrowRight className="h-3 w-3" />
                        Hover to create content
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick-access strip for mobile */}
            <div className="flex gap-2 overflow-x-auto pb-2 sm:hidden scrollbar-hide">
              {TRENDING_NICHES.map((item) => (
                <button
                  key={item.niche}
                  onClick={() => handleNicheClick(item.niche, 'battle')}
                  className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-full border bg-gradient-to-r text-xs font-bold ${item.color} whitespace-nowrap`}
                >
                  {item.emoji} {item.niche}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Feature Cards */}
        <section className="container px-4 pb-16">
          <div className="max-w-5xl mx-auto">
            <div className="grid sm:grid-cols-3 gap-6">
              <div className="glass-card p-6 space-y-3 text-center">
                <Flame className="h-8 w-8 text-primary mx-auto" />
                <h3 className="font-bold">Scroll-Stopping Hooks</h3>
                <p className="text-sm text-muted-foreground">
                  Hooks that grab attention in 0.5 seconds. Optimized for TikTok, Reels, and Shorts.
                </p>
              </div>
              <div className="glass-card p-6 space-y-3 text-center">
                <Dna className="h-8 w-8 text-primary mx-auto" />
                <h3 className="font-bold">Viral DNA Decoder</h3>
                <p className="text-sm text-muted-foreground">
                  Reverse-engineer any viral video and instantly get your own version for your niche.
                </p>
              </div>
              <div className="glass-card p-6 space-y-3 text-center">
                <CalendarDays className="h-8 w-8 text-primary mx-auto" />
                <h3 className="font-bold">Content Calendar</h3>
                <p className="text-sm text-muted-foreground">
                  Schedule posts, get optimal posting time suggestions, and never miss a drop.
                </p>
              </div>
            </div>
          </div>
        </section>
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
