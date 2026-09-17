import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Zap, Sparkles, Flame, Swords, Dna, CalendarDays, ArrowRight, Star, ChevronRight } from 'lucide-react';

// ── Real SVG platform logos ──────────────────────────────────────────────────
const TikTokLogo = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.99a8.18 8.18 0 004.79 1.53V7.07a4.85 4.85 0 01-1.02-.38z"/>
  </svg>
);
const InstagramLogo = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
  </svg>
);
const FacebookLogo = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);
const DiscordLogo = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
    <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.03.056a19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
);
const TwitchLogo = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
    <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
  </svg>
);

const SOCIAL_PLATFORMS = [
  {
    name: 'TikTok',
    Logo: TikTokLogo,
    color: '#010101',
    textColor: '#fff',
    hook: 'Generate hooks that hit 1M+ views',
    bg: 'bg-black',
    border: 'border-zinc-800',
  },
  {
    name: 'Instagram',
    Logo: InstagramLogo,
    color: 'url(#ig-grad)',
    textColor: '#fff',
    hook: 'Captions that make them save & share',
    bg: 'bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400',
    border: 'border-pink-500/30',
    gradient: true,
  },
  {
    name: 'Facebook',
    Logo: FacebookLogo,
    color: '#1877F2',
    textColor: '#fff',
    hook: 'Scripts that drive real engagement',
    bg: 'bg-blue-600',
    border: 'border-blue-500/30',
  },
  {
    name: 'Discord',
    Logo: DiscordLogo,
    color: '#5865F2',
    textColor: '#fff',
    hook: 'Content that builds tight communities',
    bg: 'bg-indigo-600',
    border: 'border-indigo-500/30',
  },
  {
    name: 'Twitch',
    Logo: TwitchLogo,
    color: '#9147FF',
    textColor: '#fff',
    hook: 'Hooks that convert viewers to followers',
    bg: 'bg-purple-600',
    border: 'border-purple-500/30',
  },
];
import viralforgerMascot from '@/assets/viralforger-mascot.png';
import mascot2 from '@/assets/viralforger-2.png';
import mascot3 from '@/assets/viralforger-3.png';
import mascot4 from '@/assets/viralforger-4.png';
import mascot5 from '@/assets/viralforger-5.png';
import mascot6 from '@/assets/viralforger-6.png';

const HERO_SLIDES = [
  { src: viralforgerMascot, label: 'Go Viral in Seconds ⚡' },
  { src: mascot2,           label: 'Generate Scroll-Stopping Hooks' },
  { src: mascot3,           label: 'Celebrate Every Win 🎉' },
  { src: mascot4,           label: 'Own Every Stage 🎤' },
  { src: mascot5,           label: 'Speed > Everything 🏃' },
  { src: mascot6,           label: 'Point & Dominate 💥' },
];

const BG_MASCOTS = [mascot2, mascot3, mascot4, mascot5, mascot6, viralforgerMascot];

export function Home() {
  const { user } = useAuth();
  const [activeSlide, setActiveSlide] = useState(0);

  // Auto-advance hero slider
  useEffect(() => {
    const id = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % HERO_SLIDES.length);
    }, 3200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background overflow-x-hidden">
      {/* Header */}
      <header className="border-b border-border/40 sticky top-0 z-50 bg-background/90 backdrop-blur">
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
        {/* ─── HERO SECTION ─── */}
        <section className="relative overflow-hidden min-h-[90vh] flex items-center">
          {/* Blurred background mascots — absolute positioned, scattered */}
          {BG_MASCOTS.map((src, i) => {
            const positions = [
              'top-[-6%] left-[-8%] rotate-[-15deg]',
              'top-[5%] right-[-10%] rotate-[12deg]',
              'bottom-[2%] left-[3%] rotate-[8deg]',
              'bottom-[-4%] right-[-6%] rotate-[-10deg]',
              'top-[38%] left-[-5%] rotate-[-5deg]',
              'top-[40%] right-[-4%] rotate-[6deg]',
            ];
            const sizes = ['w-56 h-56', 'w-64 h-64', 'w-48 h-48', 'w-60 h-60', 'w-52 h-52', 'w-44 h-44'];
            const delays = ['0s', '0.5s', '1s', '1.5s', '0.8s', '1.2s'];
            return (
              <div
                key={i}
                className={`absolute ${positions[i]} ${sizes[i]} opacity-[0.08] blur-[3px] pointer-events-none select-none`}
                style={{ animationDelay: delays[i] }}
              >
                <img
                  src={src}
                  alt=""
                  className="w-full h-full object-contain animate-spark-float"
                  style={{ animationDelay: delays[i] }}
                />
              </div>
            );
          })}

          {/* Electric background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3 pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/4 blur-[120px] pointer-events-none" />

          <div className="container px-4 pt-12 pb-16 max-w-6xl mx-auto relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left — text */}
              <div className="space-y-6 animate-fade-in">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-xs font-bold text-primary uppercase tracking-wide">
                  <Flame className="h-3.5 w-3.5" />
                  AI Content Engine for Gen Z
                </div>

                <div className="space-y-2">
                  <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.0]">
                    Go <span className="text-gradient">Viral</span>
                    <br />in Seconds ⚡
                  </h1>
                  {/* Animated subtitle from slider */}
                  <div className="h-8 overflow-hidden">
                    {HERO_SLIDES.map((s, i) => (
                      <p
                        key={i}
                        className={`text-base text-primary font-bold transition-all duration-500 ${
                          i === activeSlide ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full absolute'
                        }`}
                      >
                        {s.label}
                      </p>
                    ))}
                  </div>
                </div>

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
                    <Button size="lg" variant="outline" className="h-12 px-7 text-base font-bold gap-2 electric-border hover:bg-primary/5">
                      <Swords className="h-4 w-4 text-primary" />
                      Hook Battle
                    </Button>
                  </Link>
                </div>

                <div className="flex items-center gap-4 pt-2">
                  <div className="flex -space-x-2">
                    {['#FFE500','#FF6B6B','#4ECDC4','#A8E6CF'].map((c, i) => (
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

              {/* Right — sliding mascot showcase */}
              <div className="flex justify-center lg:justify-end animate-slide-up">
                <div className="relative">
                  {/* Outer glow ring */}
                  <div className="absolute -inset-4 rounded-[2rem] bg-primary/10 blur-2xl animate-glow-pulse" />

                  {/* Main card */}
                  <div className="relative w-72 h-72 lg:w-80 lg:h-80 rounded-3xl bg-primary flex items-center justify-center shadow-2xl glow-primary overflow-hidden">
                    {/* Slide background flash */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary via-yellow-300 to-primary opacity-80" />

                    {/* Mascot slides */}
                    {HERO_SLIDES.map((slide, i) => (
                      <img
                        key={i}
                        src={slide.src}
                        alt="ViralForger"
                        className={`absolute inset-0 w-full h-full object-contain p-4 transition-all duration-700 ease-in-out ${
                          i === activeSlide
                            ? 'opacity-100 scale-100 translate-y-0'
                            : 'opacity-0 scale-90 translate-y-4'
                        }`}
                      />
                    ))}

                    {/* Slide dots */}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {HERO_SLIDES.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setActiveSlide(i)}
                          className={`rounded-full transition-all duration-300 ${
                            i === activeSlide
                              ? 'w-4 h-1.5 bg-primary-foreground'
                              : 'w-1.5 h-1.5 bg-primary-foreground/40'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Floating badge — top right */}
                  <div className="absolute -top-4 -right-4 bg-card border electric-border-strong rounded-xl px-3 py-2 shadow-lg animate-bounce-in z-10">
                    <div className="text-xs font-black text-primary">⚡ HOOK GENERATED</div>
                    <div className="text-[10px] text-muted-foreground">0.3s response</div>
                  </div>

                  {/* Floating badge — bottom left */}
                  <div className="absolute -bottom-4 -left-4 bg-primary rounded-xl px-3 py-2 shadow-lg animate-bounce-in z-10" style={{ animationDelay: '0.2s' }}>
                    <div className="text-xs font-black text-primary-foreground">🔥 Viral Score: 94</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── SOCIAL PLATFORMS BAR ─── */}
        <section className="py-14 sm:py-16 container px-4 max-w-6xl mx-auto">
          <div className="text-center mb-10 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary uppercase tracking-wide">
              <Flame className="h-3.5 w-3.5" />
              Works Everywhere You Create
            </div>
            <h2 className="text-3xl sm:text-4xl font-black">
              Dominate every <span className="text-gradient">platform</span> at once
            </h2>
            <p className="text-muted-foreground max-w-sm mx-auto text-sm sm:text-base leading-relaxed">
              One AI. Optimised hooks, scripts & captions for every platform your audience lives on.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {SOCIAL_PLATFORMS.map((platform) => (
              <div
                key={platform.name}
                className={`group relative rounded-2xl border ${platform.border} bg-card hover:scale-[1.03] hover:shadow-lg transition-all duration-300 overflow-hidden cursor-default`}
              >
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300 ${platform.bg}`} />
                <div className="relative p-4 sm:p-5 flex flex-col items-center text-center gap-3">
                  <div className={`h-11 w-11 sm:h-12 sm:w-12 rounded-2xl flex items-center justify-center p-2.5 shadow-md ${platform.bg}`}>
                    <div className="text-white w-full h-full">
                      <platform.Logo />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-black">{platform.name}</p>
                    <p className="text-[11px] text-muted-foreground leading-snug">{platform.hook}</p>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    Try now <ChevronRight className="h-2.5 w-2.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link to={user ? '/app' : '/signup'}>
              <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-bold h-11 px-6">
                <Zap className="h-4 w-4" fill="currentColor" />
                Generate Content for All Platforms Free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>

        {/* ─── MASCOT STRIP (blurred background showcase) ─── */}
        <section className="relative py-10 overflow-hidden border-y border-border/40 bg-card/30">
          <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background z-10 pointer-events-none" />
          <div className="flex gap-8 animate-[marquee_20s_linear_infinite] w-max">
            {[...BG_MASCOTS, ...BG_MASCOTS].map((src, i) => (
              <div key={i} className="h-20 w-20 flex-shrink-0 rounded-2xl overflow-hidden border border-primary/20 bg-primary/5">
                <img src={src} alt="" className="w-full h-full object-contain p-2 opacity-80" />
              </div>
            ))}
          </div>
        </section>

        {/* ─── FEATURES ─── */}
        <section className="container px-4 py-20 max-w-6xl mx-auto">
          <div className="text-center mb-12 space-y-3">
            <h2 className="text-4xl font-black">
              Built for <span className="text-gradient">creators</span> who win
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">Every tool you need to go viral, in one place.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <Flame className="h-5 w-5" />,
                title: 'Scroll-Stopping Hooks',
                desc: 'Hooks that grab attention in 0.5 seconds — powered by real viral psychology and Gen Z language patterns.',
                tag: 'MOST USED',
              },
              {
                icon: <Swords className="h-5 w-5" />,
                title: 'Hook Battle',
                desc: '5 hook variations in one shot. Each using a different psychological trigger. Let the community vote, or let AI pick the winner.',
                tag: 'FAN FAVORITE',
              },
              {
                icon: <Dna className="h-5 w-5" />,
                title: 'Viral DNA Decoder',
                desc: 'Reverse-engineer any viral video and get your own version for your niche. Know exactly why it blew up.',
                tag: 'NEW',
              },
              {
                icon: <CalendarDays className="h-5 w-5" />,
                title: 'Content Calendar',
                desc: 'Schedule posts, get optimal posting time suggestions, and never miss a drop again.',
              },
              {
                icon: <Sparkles className="h-5 w-5" />,
                title: 'AI Thumbnail Generator',
                desc: 'Generate 4 custom thumbnails per day. Just describe your vibe and get eye-catching visuals instantly.',
              },
              {
                icon: <Zap className="h-5 w-5" />,
                title: 'Trending Hashtags',
                desc: 'Ask for hashtags in chat and get real-time trend analysis — viral scores, competition levels, and peak post times.',
              },
            ].map((f, i) => (
              <div
                key={i}
                className="group relative rounded-2xl p-6 space-y-3 border border-border/50 bg-card hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
              >
                {f.tag && (
                  <span className="absolute top-4 right-4 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wide">
                    {f.tag}
                  </span>
                )}
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-colors duration-300">
                  <span className="text-primary group-hover:text-primary-foreground transition-colors duration-300">{f.icon}</span>
                </div>
                <h3 className="font-black text-base">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                <div className="flex items-center gap-1 text-xs font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity pt-1">
                  Try it free <ChevronRight className="h-3 w-3" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── CTA SECTION ─── */}
        <section className="relative overflow-hidden py-20">
          {/* Background blur mascots */}
          <div className="absolute inset-0 pointer-events-none">
            <img src={mascot3} alt="" className="absolute right-0 top-0 w-64 h-64 object-contain opacity-5 blur-sm rotate-12" />
            <img src={mascot5} alt="" className="absolute left-0 bottom-0 w-64 h-64 object-contain opacity-5 blur-sm -rotate-12" />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-primary/5 to-background" />
          </div>

          <div className="container px-4 max-w-2xl mx-auto text-center relative z-10 space-y-6">
            <div className="flex justify-center">
              <img
                src={mascot6}
                alt="ViralForger"
                className="w-28 h-28 object-contain animate-spark-float drop-shadow-2xl"
              />
            </div>
            <h2 className="text-4xl sm:text-5xl font-black">
              Ready to <span className="text-gradient">dominate</span>?
            </h2>
            <p className="text-muted-foreground text-lg">
              10 free credits. No credit card. Start going viral in 30 seconds.
            </p>
            <Link to={user ? '/app' : '/signup'}>
              <Button size="lg" className="h-14 px-10 text-lg font-black bg-primary text-primary-foreground hover:bg-primary/90 glow-primary gap-3 animate-electric-pulse">
                <Zap className="h-5 w-5" fill="currentColor" />
                Start For Free
              </Button>
            </Link>
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
