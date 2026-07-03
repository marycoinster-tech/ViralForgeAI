import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Zap, Sparkles, Flame, Swords, Dna, CalendarDays, ArrowRight, Star, ChevronRight } from 'lucide-react';
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
