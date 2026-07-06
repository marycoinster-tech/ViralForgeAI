import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Zap, Swords, Dna, ArrowRight, Sparkles } from 'lucide-react';
import viralforgerMascot from '@/assets/viralforger-mascot.png';

interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
  onQuickStart: (prompt: string) => void;
}

const QUICK_STARTS = [
  {
    icon: <Sparkles className="h-4 w-4" />,
    label: 'Generate viral content',
    desc: 'Hook + script + caption in 5s',
    prompt: 'dark anime moments that hit different and make people feel emotions',
    color: 'from-primary/20 to-yellow-400/10 border-primary/40 hover:border-primary',
  },
  {
    icon: <Swords className="h-4 w-4" />,
    label: 'Money-making hook',
    desc: '5 hooks on making money online',
    prompt: 'how Gen Z is making $10k/month from their phone in 2026',
    color: 'from-green-500/20 to-emerald-500/10 border-green-500/40 hover:border-green-500',
  },
  {
    icon: <Dna className="h-4 w-4" />,
    label: 'Motivational banger',
    desc: 'Toxic motivation that hits hard',
    prompt: 'why most people will stay broke and what separates the 1%',
    color: 'from-red-500/20 to-orange-500/10 border-red-500/40 hover:border-red-500',
  },
];

export function OnboardingModal({ open, onClose, onQuickStart }: OnboardingModalProps) {
  const [creditCount, setCreditCount] = useState(0);
  const [phase, setPhase] = useState<'counting' | 'done'>('counting');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!open) {
      setCreditCount(0);
      setPhase('counting');
      return;
    }

    // Animate credit counter from 0 → 10
    let count = 0;
    intervalRef.current = setInterval(() => {
      count += 1;
      setCreditCount(count);
      if (count >= 10) {
        clearInterval(intervalRef.current!);
        setPhase('done');
      }
    }, 120);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-md animate-bounce-in">
        <div className="rounded-3xl border border-primary/30 bg-card shadow-2xl overflow-hidden">
          {/* Yellow top strip */}
          <div className="h-1.5 w-full bg-primary" />

          <div className="p-7 space-y-6 text-center">
            {/* Mascot + glow */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute -inset-4 rounded-full bg-primary/20 blur-2xl animate-glow-pulse" />
                <img
                  src={viralforgerMascot}
                  alt="ViralForger"
                  className="relative h-28 w-28 object-contain animate-spark-float drop-shadow-2xl"
                />
              </div>
            </div>

            {/* Headline */}
            <div className="space-y-2">
              <h2 className="text-3xl font-black">
                Welcome to <span className="text-gradient">ViralForge</span> ⚡
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your AI content engine is ready. Let's go viral.
              </p>
            </div>

            {/* Animated credit counter */}
            <div className="relative p-5 rounded-2xl bg-primary text-primary-foreground">
              <div className="absolute inset-0 rounded-2xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-300/20 to-transparent" />
              </div>
              <div className="relative">
                <div
                  className={`text-6xl font-black tabular-nums transition-all duration-100 ${
                    phase === 'done' ? 'animate-bounce-in' : ''
                  }`}
                >
                  {creditCount}
                </div>
                <div className="text-sm font-bold opacity-80 mt-1 flex items-center justify-center gap-1.5">
                  <Zap className="h-4 w-4" fill="currentColor" />
                  FREE CREDITS LOADED
                </div>
                {phase === 'done' && (
                  <div className="mt-2 text-xs font-semibold opacity-70 animate-fade-in">
                    Enough for 10 viral content generations 🔥
                  </div>
                )}
              </div>
            </div>

            {/* Quick-start prompts */}
            <div className="space-y-2 text-left">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest text-center">
                Jump right in →
              </p>
              {QUICK_STARTS.map((qs) => (
                <button
                  key={qs.label}
                  onClick={() => {
                    onQuickStart(qs.prompt);
                    onClose();
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border bg-gradient-to-br transition-all duration-200 group ${qs.color}`}
                >
                  <span className="text-primary">{qs.icon}</span>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-bold">{qs.label}</div>
                    <div className="text-xs text-muted-foreground">{qs.desc}</div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
            </div>

            <Button
              onClick={onClose}
              className="w-full h-11 font-black text-sm bg-primary text-primary-foreground hover:bg-primary/90 glow-primary"
            >
              Start Generating ⚡
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
