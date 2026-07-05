import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Zap, Swords, Dna, MessageSquare, Sparkles } from 'lucide-react';
import viralforgerMascot from '@/assets/viralforger-mascot.png';

interface WelcomeModalProps {
  open: boolean;
  onClose: () => void;
  username?: string;
}

const QUICK_STARTS = [
  {
    icon: <MessageSquare className="h-4 w-4" />,
    label: 'Generate my first viral hook',
    desc: 'Get a scroll-stopping hook for any niche',
    action: '/app',
    color: 'border-primary/40 hover:border-primary bg-primary/5 hover:bg-primary/10',
    labelColor: 'text-primary',
  },
  {
    icon: <Swords className="h-4 w-4" />,
    label: 'Start a Hook Battle',
    desc: '5 hooks, 5 triggers, one winner',
    action: '/app/hook-battle',
    color: 'border-purple-500/40 hover:border-purple-400 bg-purple-500/5 hover:bg-purple-500/10',
    labelColor: 'text-purple-400',
  },
  {
    icon: <Dna className="h-4 w-4" />,
    label: 'Decode Viral DNA',
    desc: 'Reverse-engineer any viral video',
    action: '/app/viral-dna',
    color: 'border-cyan-500/40 hover:border-cyan-400 bg-cyan-500/5 hover:bg-cyan-500/10',
    labelColor: 'text-cyan-400',
  },
];

export function WelcomeModal({ open, onClose, username }: WelcomeModalProps) {
  const navigate = useNavigate();
  const [count, setCount] = useState(0);
  const [sparkles, setSparkles] = useState<{ id: number; x: number; y: number; size: number }[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const sparkleRef = useRef<NodeJS.Timeout | null>(null);

  // Animate credits counter from 0 → 10
  useEffect(() => {
    if (!open) { setCount(0); return; }
    setCount(0);
    let current = 0;
    const target = 10;
    const duration = 1600;
    const steps = 30;
    const increment = target / steps;
    const delay = duration / steps;

    intervalRef.current = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(intervalRef.current!);
      } else {
        setCount(Math.round(current));
      }
    }, delay);

    // Generate floating sparkles
    let sparkleId = 0;
    sparkleRef.current = setInterval(() => {
      const newSparkle = {
        id: sparkleId++,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 12 + 6,
      };
      setSparkles(prev => [...prev.slice(-8), newSparkle]);
    }, 250);

    return () => {
      clearInterval(intervalRef.current!);
      clearInterval(sparkleRef.current!);
    };
  }, [open]);

  const handleAction = (path: string) => {
    onClose();
    navigate(path);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/85 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Floating sparkles */}
      {sparkles.map(s => (
        <div
          key={s.id}
          className="absolute pointer-events-none animate-spark-float"
          style={{ left: `${s.x}%`, top: `${s.y}%`, animationDuration: `${1.5 + Math.random()}s` }}
        >
          <Sparkles
            style={{ width: s.size, height: s.size }}
            className="text-primary opacity-60"
          />
        </div>
      ))}

      {/* Modal card */}
      <div className="relative z-10 w-full max-w-md animate-bounce-in">
        {/* Yellow glow ring */}
        <div className="absolute -inset-3 rounded-3xl bg-primary/15 blur-2xl animate-glow-pulse pointer-events-none" />

        <div className="relative rounded-3xl bg-card border-2 border-primary/50 shadow-2xl overflow-hidden">
          {/* Top yellow bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-yellow-500 via-primary to-yellow-400" />

          <div className="p-6 space-y-5">
            {/* Mascot + greeting */}
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <div className="absolute -inset-2 rounded-2xl bg-primary/20 blur-lg animate-glow-pulse" />
                <img
                  src={viralforgerMascot}
                  alt="ViralForger"
                  className="relative h-20 w-20 object-contain animate-spark-float drop-shadow-2xl"
                />
              </div>
              <div>
                <div className="text-xs font-black text-primary uppercase tracking-widest mb-1">⚡ Welcome!</div>
                <h2 className="text-2xl font-black leading-tight">
                  Hey{username ? `, ${username}` : ''}!<br />
                  Let's go <span className="text-gradient">viral</span> 🔥
                </h2>
              </div>
            </div>

            {/* Animated credit counter */}
            <div className="rounded-2xl bg-primary p-4 flex items-center justify-between">
              <div>
                <div className="text-xs font-black text-primary-foreground/70 uppercase tracking-widest">Free Credits</div>
                <div className="text-sm text-primary-foreground/80 font-medium mt-0.5">Ready to use right now</div>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-6 w-6 text-primary-foreground" fill="currentColor" />
                <span className="text-5xl font-black text-primary-foreground tabular-nums transition-all">
                  {count}
                </span>
              </div>
            </div>

            {/* Quick start actions */}
            <div className="space-y-2">
              <div className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">What do you want to do first?</div>
              {QUICK_STARTS.map((qs) => (
                <button
                  key={qs.label}
                  onClick={() => handleAction(qs.action)}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all duration-200 text-left group ${qs.color}`}
                >
                  <div className={`flex-shrink-0 ${qs.labelColor}`}>{qs.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-bold text-sm ${qs.labelColor}`}>{qs.label}</div>
                    <div className="text-xs text-muted-foreground truncate">{qs.desc}</div>
                  </div>
                  <div className={`text-lg transition-transform group-hover:translate-x-1 ${qs.labelColor}`}>→</div>
                </button>
              ))}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="w-full text-muted-foreground text-xs"
            >
              Skip for now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
