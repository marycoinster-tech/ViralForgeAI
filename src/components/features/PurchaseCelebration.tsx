import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Zap, Sparkles } from 'lucide-react';
import viralforgerMascot from '@/assets/viralforger-mascot.png';

interface PurchaseCelebrationProps {
  open: boolean;
  creditsAdded: number;
  newTotal: number;
  onClose: () => void;
}

// Tiny confetti particle
function Particle({ color, x, delay, size }: { color: string; x: number; delay: number; size: number }) {
  return (
    <div
      className="absolute top-0 rounded-full pointer-events-none"
      style={{
        left: `${x}%`,
        width: size,
        height: size,
        background: color,
        animation: `confetti-fall ${1.5 + Math.random()}s ease-in ${delay}s both`,
      }}
    />
  );
}

const CONFETTI_COLORS = ['#FFE500', '#FF6B6B', '#4ECDC4', '#A8E6CF', '#ffffff', '#FFB347'];
const PARTICLES = Array.from({ length: 60 }, (_, i) => ({
  id: i,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  x: Math.random() * 100,
  delay: Math.random() * 0.8,
  size: 4 + Math.random() * 8,
}));

export function PurchaseCelebration({ open, creditsAdded, newTotal, onClose }: PurchaseCelebrationProps) {
  const [displayCount, setDisplayCount] = useState(newTotal - creditsAdded);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!open) {
      setDisplayCount(newTotal - creditsAdded);
      return;
    }

    const start = newTotal - creditsAdded;
    const end = newTotal;
    const steps = 40;
    const increment = (end - start) / steps;
    let current = start;

    setDisplayCount(start);

    intervalRef.current = setInterval(() => {
      current = Math.min(current + increment, end);
      setDisplayCount(Math.round(current));
      if (Math.round(current) >= end) {
        clearInterval(intervalRef.current!);
      }
    }, 40);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [open, creditsAdded, newTotal]);

  if (!open) return null;

  return (
    <>
      {/* Inject confetti keyframes */}
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(600px) rotate(720deg); opacity: 0; }
        }
      `}</style>

      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={onClose} />

        {/* Confetti */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {PARTICLES.map((p) => (
            <Particle key={p.id} {...p} />
          ))}
        </div>

        {/* Card */}
        <div className="relative z-10 w-full max-w-sm animate-bounce-in">
          <div className="rounded-3xl border-2 border-primary bg-card shadow-2xl overflow-hidden">
            <div className="h-2 w-full bg-primary" />
            <div className="p-7 space-y-5 text-center">

              {/* Mascot */}
              <div className="flex justify-center">
                <div className="relative">
                  <div className="absolute -inset-6 rounded-full bg-primary/30 blur-3xl animate-glow-pulse" />
                  <img
                    src={viralforgerMascot}
                    alt="ViralForger celebrating"
                    className="relative h-24 w-24 object-contain animate-bounce"
                  />
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1">
                <div className="text-4xl">🎉</div>
                <h2 className="text-2xl font-black">Credits Loaded!</h2>
                <p className="text-sm text-muted-foreground">Your balance was just upgraded ⚡</p>
              </div>

              {/* Animated counter */}
              <div className="p-5 rounded-2xl bg-primary text-primary-foreground relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-300/20 to-transparent" />
                <div className="relative">
                  <div className="text-7xl font-black tabular-nums">
                    {displayCount}
                  </div>
                  <div className="flex items-center justify-center gap-1.5 text-sm font-bold opacity-80 mt-1">
                    <Sparkles className="h-4 w-4" />
                    TOTAL CREDITS
                  </div>
                  <div className="mt-2 text-xs opacity-70 font-semibold">
                    +{creditsAdded} credits added 🔥
                  </div>
                </div>
              </div>

              {/* CTA */}
              <Button
                onClick={onClose}
                className="w-full h-11 font-black bg-primary text-primary-foreground hover:bg-primary/90 glow-primary"
              >
                <Zap className="mr-2 h-4 w-4" fill="currentColor" />
                Let's Go Viral!
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
