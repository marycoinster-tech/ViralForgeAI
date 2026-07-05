import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Zap, Sparkles, Star } from 'lucide-react';
import viralforgerMascot from '@/assets/viralforger-mascot.png';

interface PurchaseCelebrationProps {
  open: boolean;
  onClose: () => void;
  creditsAdded: number;
  totalCredits: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  shape: 'circle' | 'star' | 'zap';
}

const COLORS = ['#FFE500', '#FFC300', '#FF9500', '#FFE500', '#FFEB3B', '#FFF176', '#FFFFFF'];

export function PurchaseCelebration({ open, onClose, creditsAdded, totalCredits }: PurchaseCelebrationProps) {
  const [displayCount, setDisplayCount] = useState(0);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [phase, setPhase] = useState<'burst' | 'settle'>('burst');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const particleRef = useRef<NodeJS.Timeout | null>(null);
  const autoCloseRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!open) {
      setDisplayCount(0);
      setParticles([]);
      setPhase('burst');
      return;
    }

    setPhase('burst');

    // Generate burst particles
    const newParticles: Particle[] = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: 45 + Math.random() * 10,
      y: 50 + Math.random() * 10,
      vx: (Math.random() - 0.5) * 8,
      vy: -(Math.random() * 6 + 2),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: Math.random() * 10 + 5,
      rotation: Math.random() * 360,
      shape: (['circle', 'star', 'zap'] as const)[Math.floor(Math.random() * 3)],
    }));
    setParticles(newParticles);

    // Animate credit counter
    let current = 0;
    const target = totalCredits;
    const steps = 35;
    const stepSize = Math.max(1, Math.floor(target / steps));
    intervalRef.current = setInterval(() => {
      current = Math.min(current + stepSize, target);
      setDisplayCount(current);
      if (current >= target) clearInterval(intervalRef.current!);
    }, 60);

    // Continue generating particles
    let pid = 60;
    particleRef.current = setInterval(() => {
      setParticles(prev => [
        ...prev.slice(-30),
        {
          id: pid++,
          x: 30 + Math.random() * 40,
          y: 40 + Math.random() * 20,
          vx: (Math.random() - 0.5) * 5,
          vy: -(Math.random() * 4 + 1),
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          size: Math.random() * 8 + 4,
          rotation: Math.random() * 360,
          shape: (['circle', 'star', 'zap'] as const)[Math.floor(Math.random() * 3)],
        },
      ]);
    }, 150);

    // Stop confetti after 2.5s
    setTimeout(() => {
      clearInterval(particleRef.current!);
      setPhase('settle');
    }, 2500);

    // Auto-close after 5s
    autoCloseRef.current = setTimeout(() => onClose(), 5000);

    return () => {
      clearInterval(intervalRef.current!);
      clearInterval(particleRef.current!);
      clearTimeout(autoCloseRef.current!);
    };
  }, [open, totalCredits]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden">
      {/* Dark backdrop */}
      <div className="absolute inset-0 bg-background/90 backdrop-blur-md" onClick={onClose} />

      {/* Confetti particles */}
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute pointer-events-none"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            transform: `translate(-50%, -50%) rotate(${p.rotation}deg)`,
            animation: `confetti-fall-${p.id % 5} 2s ease-out forwards`,
            opacity: phase === 'settle' ? 0 : 1,
            transition: phase === 'settle' ? 'opacity 1s ease-out' : 'none',
          }}
        >
          {p.shape === 'circle' && (
            <div style={{ width: p.size, height: p.size, borderRadius: '50%', background: p.color }} />
          )}
          {p.shape === 'star' && (
            <Star style={{ width: p.size, height: p.size, color: p.color }} fill={p.color} />
          )}
          {p.shape === 'zap' && (
            <Zap style={{ width: p.size, height: p.size, color: p.color }} fill={p.color} />
          )}
        </div>
      ))}

      {/* Main celebration card */}
      <div className="relative z-10 w-full max-w-sm mx-4 animate-bounce-in">
        <div className="absolute -inset-4 rounded-3xl bg-primary/20 blur-3xl animate-glow-pulse pointer-events-none" />

        <div className="relative rounded-3xl bg-card border-2 border-primary overflow-hidden shadow-2xl" style={{ boxShadow: '0 0 40px hsl(51 100% 50% / 0.4)' }}>
          {/* Rainbow top bar */}
          <div className="h-2 w-full bg-gradient-to-r from-yellow-500 via-primary to-yellow-300 animate-electric-pulse" />

          <div className="p-6 text-center space-y-4">
            {/* Mascot */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute -inset-4 rounded-full bg-primary/25 blur-xl animate-glow-pulse" />
                <img
                  src={viralforgerMascot}
                  alt="ViralForger celebrating"
                  className="relative h-24 w-24 object-contain animate-spark-float drop-shadow-2xl"
                />
              </div>
            </div>

            {/* Title */}
            <div>
              <div className="text-3xl font-black mb-1">🎉 BOOM!</div>
              <div className="text-lg font-black text-gradient">Credits unlocked!</div>
            </div>

            {/* Credits added badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/40 text-primary font-black text-base">
              <Sparkles className="h-4 w-4" />
              +{creditsAdded} credits added
            </div>

            {/* Animated total counter */}
            <div className="rounded-2xl bg-primary p-5">
              <div className="text-xs font-black text-primary-foreground/70 uppercase tracking-widest mb-1">Your New Balance</div>
              <div className="flex items-center justify-center gap-3">
                <Zap className="h-8 w-8 text-primary-foreground" fill="currentColor" />
                <span className="text-6xl font-black text-primary-foreground tabular-nums leading-none">
                  {displayCount}
                </span>
              </div>
              <div className="text-sm text-primary-foreground/70 font-semibold mt-1">
                credits ready to use
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Time to create content that actually <span className="font-bold text-primary">goes viral</span> 🚀
            </p>

            <Button
              onClick={onClose}
              className="w-full h-12 text-base font-black bg-primary text-primary-foreground hover:bg-primary/90 glow-primary"
            >
              <Zap className="mr-2 h-5 w-5" fill="currentColor" />
              Let's Go!
            </Button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes confetti-fall {
          0% { transform: translate(-50%, -50%) rotate(0deg) scale(1); }
          100% { transform: translate(calc(-50% + ${Math.random() * 200 - 100}px), calc(-50% + 300px)) rotate(720deg) scale(0); }
        }
      `}</style>
    </div>
  );
}
