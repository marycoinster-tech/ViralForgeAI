import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { BuyCreditsModal } from '@/components/features/BuyCreditsModal';
import {
  Swords, Trophy, Users, CheckCircle2, Loader2, RefreshCw,
  Copy, Zap, CalendarDays, X, Share2, Twitter, Instagram,
  ChevronLeft, ChevronRight, Camera,
} from 'lucide-react';
import viralforgerMascot from '@/assets/viralforger-mascot.png';
import viralforger2 from '@/assets/viralforger-2.png';
import viralforger3 from '@/assets/viralforger-3.png';

const NICHES = ['anime', 'motivation', 'money', 'dating', 'gym', 'ai & tech', 'storytime', 'fashion', 'gaming', 'beauty', 'food', 'travel'];
const VIBES = ['dark', 'chill', 'toxic', 'motivational', 'mysterious', 'hype', 'educational', 'funny'];
const PLATFORMS = ['TikTok', 'Instagram Reels', 'YouTube Shorts'];
const STATUSES = ['scheduled', 'draft'] as const;
type ScheduleStatus = typeof STATUSES[number];

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const TRIGGER_META: Record<string, { pill: string; glow: string; text: string; border: string; swipeColor: string }> = {
  CURIOSITY: {
    pill: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    glow: 'hover:shadow-violet-500/20',
    text: 'text-violet-300',
    border: 'border-violet-500/30',
    swipeColor: 'violet',
  },
  SHOCK: {
    pill: 'bg-red-500/20 text-red-300 border-red-500/30',
    glow: 'hover:shadow-red-500/20',
    text: 'text-red-300',
    border: 'border-red-500/30',
    swipeColor: 'red',
  },
  RELATABILITY: {
    pill: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    glow: 'hover:shadow-blue-500/20',
    text: 'text-blue-300',
    border: 'border-blue-500/30',
    swipeColor: 'blue',
  },
  CONTROVERSY: {
    pill: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    glow: 'hover:shadow-amber-500/20',
    text: 'text-amber-300',
    border: 'border-amber-500/30',
    swipeColor: 'amber',
  },
  FOMO: {
    pill: 'bg-green-500/20 text-green-300 border-green-500/30',
    glow: 'hover:shadow-green-500/20',
    text: 'text-green-300',
    border: 'border-green-500/30',
    swipeColor: 'green',
  },
};

interface Hook {
  text: string;
  trigger: string;
  emotion: string;
  emoji: string;
  why: string;
}

interface ScheduleForm {
  title: string;
  scheduled_date: string;
  scheduled_time: string;
  platform: string;
  status: ScheduleStatus;
  notes: string;
}

interface BattleResult {
  battle_id: string;
  hooks: Hook[];
  aiPickIndex: number;
  aiPickReason: string;
}

interface VoteCount {
  hookIndex: number;
  count: number;
}

const OPTIMAL_TIMES: Record<string, string[]> = {
  TikTok: ['07:00', '12:00', '19:00', '20:00'],
  'Instagram Reels': ['09:00', '14:00', '18:00'],
  'YouTube Shorts': ['12:00', '19:00'],
};

// ── Swipe Voting Card ─────────────────────────────────────────────────────────

interface SwipeVoteCardProps {
  hook: Hook;
  index: number;
  isAiPick: boolean;
  isSelected: boolean;
  isVoted: boolean;
  communityMode: boolean;
  voteCount: number;
  votePercent: number;
  voting: boolean;
  canVote: boolean;
  shareOpenIndex: number | null;
  onSelect: () => void;
  onVote: () => void;
  onCopy: (text: string) => void;
  onSchedule: () => void;
  onShareToggle: () => void;
  onShareTikTok: (text: string) => void;
  onShareInstagram: (text: string) => void;
  onShareTwitter: (text: string) => void;
  onSwipeVote: (hookIndex: number, direction: 'right' | 'left') => void;
}

function SwipeVoteCard({
  hook, index, isAiPick, isSelected, isVoted, communityMode,
  voteCount, votePercent, voting, canVote,
  shareOpenIndex, onSelect, onVote, onCopy, onSchedule,
  onShareToggle, onShareTikTok, onShareInstagram, onShareTwitter,
  onSwipeVote,
}: SwipeVoteCardProps) {
  const meta = TRIGGER_META[hook.trigger] ?? TRIGGER_META.CURIOSITY;
  const isShareOpen = shareOpenIndex === index;

  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const [dragX, setDragX] = useState(0);
  const [dragState, setDragState] = useState<'idle' | 'dragging' | 'vote' | 'skip'>('idle');
  const [animOut, setAnimOut] = useState<'vote' | 'skip' | null>(null);

  const VOTE_THRESHOLD = 80;
  const SKIP_THRESHOLD = 80;

  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 640;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isDesktop) return;
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    setDragState('dragging');
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startXRef.current === null || startYRef.current === null) return;
    const dx = e.touches[0].clientX - startXRef.current;
    const dy = e.touches[0].clientY - startYRef.current;
    // Only track horizontal swipes (ignore vertical scroll)
    if (Math.abs(dy) > Math.abs(dx) * 1.5 && Math.abs(dragX) < 10) {
      startXRef.current = null;
      setDragState('idle');
      return;
    }
    setDragX(dx);
    if (dx > VOTE_THRESHOLD / 2) setDragState('vote');
    else if (dx < -SKIP_THRESHOLD / 2) setDragState('skip');
    else setDragState('dragging');
  };

  const handleTouchEnd = () => {
    if (dragX > VOTE_THRESHOLD) {
      setAnimOut('vote');
      onSwipeVote(index, 'right');
    } else if (dragX < -SKIP_THRESHOLD) {
      setAnimOut('skip');
      onSwipeVote(index, 'left');
    } else {
      setDragX(0);
      setDragState('idle');
    }
    startXRef.current = null;
    startYRef.current = null;
  };

  // Spring back animation after release
  useEffect(() => {
    if (animOut) {
      const t = setTimeout(() => {
        setDragX(0);
        setDragState('idle');
        setAnimOut(null);
      }, 400);
      return () => clearTimeout(t);
    }
  }, [animOut]);

  const rotate = dragX * 0.06;
  const opacity = animOut ? 0.2 : 1 - Math.abs(dragX) / 400;

  const cardStyle: React.CSSProperties = {
    transform: `translateX(${dragX}px) rotate(${rotate}deg)`,
    opacity,
    transition: dragState === 'idle' ? 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease' : 'none',
    willChange: 'transform',
  };

  return (
    <div className="relative">
      {/* Swipe hint labels — mobile only */}
      <div className="sm:hidden flex items-center justify-between px-2 mb-1">
        <span className={`text-[10px] font-bold transition-all duration-150 ${dragState === 'skip' ? 'text-red-400 scale-110' : 'text-muted-foreground/40'}`}>
          ← Skip
        </span>
        <span className={`text-[10px] font-bold transition-all duration-150 ${dragState === 'vote' ? 'text-green-400 scale-110' : 'text-muted-foreground/40'}`}>
          Vote →
        </span>
      </div>

      <div
        style={cardStyle}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`relative rounded-2xl border bg-card cursor-pointer transition-shadow duration-200 select-none ${
          isAiPick ? 'border-primary/60 shadow-md shadow-primary/10' : `border-border/50 ${meta.border}`
        } ${isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : `hover:${meta.border} hover:shadow-md ${meta.glow}`}`}
        onClick={(e) => {
          // Don't select if swipe was happening
          if (Math.abs(dragX) > 10) return;
          onSelect();
        }}
      >
        {/* AI Pick glow strip */}
        {isAiPick && (
          <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl bg-primary" />
        )}

        {/* Vote overlay — right swipe */}
        {dragState === 'vote' && (
          <div
            className="absolute inset-0 rounded-2xl bg-green-500/10 border-2 border-green-400/50 flex items-center justify-end pr-6 pointer-events-none z-10 transition-opacity"
            style={{ opacity: Math.min((dragX - VOTE_THRESHOLD / 2) / (VOTE_THRESHOLD / 2), 1) }}
          >
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl">🗳️</span>
              <span className="text-xs font-black text-green-400">VOTE!</span>
            </div>
          </div>
        )}

        {/* Skip overlay — left swipe */}
        {dragState === 'skip' && (
          <div
            className="absolute inset-0 rounded-2xl bg-red-500/10 border-2 border-red-400/50 flex items-center justify-start pl-6 pointer-events-none z-10 transition-opacity"
            style={{ opacity: Math.min((-dragX - SKIP_THRESHOLD / 2) / (SKIP_THRESHOLD / 2), 1) }}
          >
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl">⏭️</span>
              <span className="text-xs font-black text-red-400">SKIP</span>
            </div>
          </div>
        )}

        <div className="p-4 sm:p-5">
          {/* Trigger badge row */}
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            <span className={`inline-flex items-center gap-1 text-xs font-black px-2 py-0.5 rounded-full border ${meta.pill}`}>
              {hook.emoji} {hook.trigger}
            </span>
            <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
              {hook.emotion}
            </span>
            {isAiPick && (
              <span className="text-xs font-black px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30 flex items-center gap-1">
                <Trophy className="h-3 w-3" /> AI Pick
              </span>
            )}
            {isSelected && (
              <span className="ml-auto text-xs font-black px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/30 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Selected
              </span>
            )}
          </div>

          {/* Hook Text */}
          <p className="text-base sm:text-lg font-black leading-snug mb-2">
            "{hook.text}"
          </p>

          {/* Why */}
          <p className="text-xs text-muted-foreground leading-relaxed mb-3">{hook.why}</p>

          {/* Viral score bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
              <span className="font-bold uppercase tracking-wide">Viral Score</span>
              <span className={`font-black ${meta.text}`}>{isAiPick ? '94' : 75 + index * 4}%</span>
            </div>
            <div className="h-1.5 bg-muted/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-1000"
                style={{ width: `${isAiPick ? 94 : 75 + index * 4}%` }}
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap" onClick={e => e.stopPropagation()}>
            <Button size="sm" variant="ghost" onClick={() => onCopy(hook.text)} className="h-9 gap-1.5 text-xs px-3 min-h-[36px]">
              <Copy className="h-3.5 w-3.5" />Copy
            </Button>
            <Button size="sm" variant="outline" onClick={onSchedule} className="h-9 gap-1.5 text-xs border-primary/20 text-primary hover:bg-primary/10 min-h-[36px]">
              <CalendarDays className="h-3.5 w-3.5" />Schedule
            </Button>
            <Button
              size="sm"
              variant={isShareOpen ? 'default' : 'ghost'}
              onClick={onShareToggle}
              className={`h-9 gap-1.5 text-xs min-h-[36px] ${isShareOpen ? 'bg-primary text-primary-foreground' : ''}`}
            >
              <Share2 className="h-3.5 w-3.5" />Share
            </Button>

            {/* Desktop vote button */}
            {communityMode && (
              <Button
                size="sm"
                variant={isVoted ? 'default' : 'outline'}
                onClick={onVote}
                disabled={voting || !canVote}
                className="h-9 gap-1.5 text-xs ml-auto min-h-[36px]"
              >
                {voting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <>🗳️ Vote{isVoted ? 'd' : ''}</>}
              </Button>
            )}
          </div>

          {/* Mobile swipe-to-vote hint */}
          {communityMode && (
            <div className="sm:hidden mt-2 flex items-center justify-center gap-2 text-[10px] text-muted-foreground/50">
              <ChevronLeft className="h-3 w-3" />
              <span>swipe to vote or skip</span>
              <ChevronRight className="h-3 w-3" />
            </div>
          )}

          {/* Share panel */}
          {isShareOpen && (
            <div className="mt-3 animate-fade-in flex flex-wrap gap-2 p-3 rounded-xl bg-muted/40 border border-border/40" onClick={e => e.stopPropagation()}>
              <button onClick={() => onShareTikTok(hook.text)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-black text-white text-xs font-bold hover:bg-zinc-900 transition-colors flex-1 justify-center min-h-[40px]">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.99a8.18 8.18 0 004.79 1.53V7.07a4.85 4.85 0 01-1.02-.38z"/>
                </svg>
                TikTok
              </button>
              <button onClick={() => onShareInstagram(hook.text)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold flex-1 justify-center min-h-[40px]" style={{ background: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)', color: '#fff' }}>
                <Instagram className="h-3.5 w-3.5" />Instagram
              </button>
              <button onClick={() => onShareTwitter(hook.text)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-black text-white text-xs font-bold hover:bg-zinc-800 transition-colors flex-1 justify-center min-h-[40px]">
                <Twitter className="h-3.5 w-3.5" />X / Twitter
              </button>
            </div>
          )}

          {/* Vote bar */}
          {communityMode && isVoted && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                <span>{voteCount} vote{voteCount !== 1 ? 's' : ''}</span>
                <span>{votePercent}%</span>
              </div>
              <div className="h-1.5 bg-muted/60 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${votePercent}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Screenshot Card ───────────────────────────────────────────────────────────

interface ScreenshotCardProps {
  hook: Hook;
  index: number;
  isAiPick: boolean;
  niche: string;
  vibe: string;
}

function ScreenshotCard({ hook, index, isAiPick, niche, vibe }: ScreenshotCardProps) {
  const meta = TRIGGER_META[hook.trigger] ?? TRIGGER_META.CURIOSITY;

  // Choose mascot image based on hook quality/type
  const mascotImg = isAiPick ? viralforger3 : viralforger2;
  const mascotMsg = isAiPick
    ? "This is going to hit 1M views, trust me ⚡"
    : `${hook.trigger} hook activated 🔥`;

  return (
    <div
      id={`screenshot-card-${index}`}
      style={{ fontFamily: 'Inter, sans-serif' }}
      className="w-[320px] rounded-2xl overflow-hidden border-2 border-primary/60 bg-[#1C1C1E] p-5 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
          <Zap className="h-4 w-4 text-primary-foreground" fill="currentColor" />
        </div>
        <span className="text-sm font-black text-[#FFE500]">ViralForge AI</span>
        <span className="ml-auto text-[10px] text-white/40 capitalize">{niche} · {vibe}</span>
      </div>

      {/* Hook */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${meta.pill}`}>
            {hook.emoji} {hook.trigger}
          </span>
          {isAiPick && (
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#FFE500]/15 text-[#FFE500] border border-[#FFE500]/30 flex items-center gap-1">
              <Trophy className="h-2.5 w-2.5" /> AI PICK
            </span>
          )}
        </div>
        <p className="text-white font-black text-base leading-snug">"{hook.text}"</p>
        <p className="text-white/50 text-xs leading-relaxed">{hook.why}</p>
      </div>

      {/* Viral bar */}
      <div>
        <div className="flex justify-between text-[10px] text-white/40 mb-1">
          <span className="font-bold uppercase">Viral Score</span>
          <span className="font-black text-[#FFE500]">{isAiPick ? '94' : 75 + index * 4}%</span>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-[#FFE500] rounded-full" style={{ width: `${isAiPick ? 94 : 75 + index * 4}%` }} />
        </div>
      </div>

      {/* Mascot + message */}
      <div className="flex items-center gap-3 pt-1 border-t border-white/10">
        <img src={mascotImg} alt="ViralForger" className="h-12 w-12 object-contain" />
        <p className="text-xs text-white/70 font-semibold leading-tight flex-1">{mascotMsg}</p>
      </div>

      {/* Footer */}
      <p className="text-center text-[9px] text-white/25 font-bold tracking-widest uppercase">
        viralforge.ai • made with ⚡
      </p>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function HookBattle() {
  const { user } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const [topic, setTopic] = useState('');
  const [niche, setNiche] = useState('');
  const [vibe, setVibe] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BattleResult | null>(null);
  const [selectedHook, setSelectedHook] = useState<number | null>(null);
  const [votedIndex, setVotedIndex] = useState<number | null>(null);
  const [voting, setVoting] = useState(false);
  const [voteCounts, setVoteCounts] = useState<VoteCount[]>([]);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [communityMode, setCommunityMode] = useState(false);
  const [shareOpenIndex, setShareOpenIndex] = useState<number | null>(null);

  // Swipe feedback state
  const [swipedCards, setSwipedCards] = useState<Set<number>>(new Set());
  const [lastSwipeAction, setLastSwipeAction] = useState<{ index: number; dir: 'vote' | 'skip' } | null>(null);

  // Screenshot modal
  const [screenshotIndex, setScreenshotIndex] = useState<number | null>(null);
  const screenshotRef = useRef<HTMLDivElement>(null);

  // Schedule modal
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleHookIndex, setScheduleHookIndex] = useState<number | null>(null);
  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>({
    title: '',
    scheduled_date: toYMD(new Date()),
    scheduled_time: '19:00',
    platform: 'TikTok',
    status: 'scheduled',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const state = location.state as { prefilledNiche?: string } | null;
    if (state?.prefilledNiche) {
      setNiche(state.prefilledNiche);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, []);

  const handleGenerate = async () => {
    if (!topic.trim() || !niche || !vibe) {
      toast({ title: 'Fill in all fields', description: 'Topic, niche, and vibe are required.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setResult(null);
    setSelectedHook(null);
    setVotedIndex(null);
    setVoteCounts([]);
    setShareOpenIndex(null);
    setSwipedCards(new Set());
    setLastSwipeAction(null);

    const { data, error } = await supabase.functions.invoke('generate-hooks', {
      body: { action: 'hook_battle', topic: topic.trim(), niche, vibe },
    });

    if (error) {
      let msg = error.message;
      try {
        const t = await (error as any).context?.text?.();
        if (t) msg = t;
      } catch { /* noop */ }
      if (msg.includes('insufficient_credits')) {
        setShowBuyCredits(true);
        toast({ title: 'Not enough credits', description: 'Purchase credits to run a Hook Battle.', variant: 'destructive' });
      } else {
        toast({ title: 'Generation failed', description: msg, variant: 'destructive' });
      }
      setLoading(false);
      return;
    }

    setResult(data);
    setVoteCounts(data.hooks.map((_: Hook, i: number) => ({ hookIndex: i, count: 0 })));
    setLoading(false);
  };

  const handleVote = async (hookIndex: number) => {
    if (!result || voting || votedIndex !== null) return;
    setVoting(true);

    const { error } = await supabase.functions.invoke('generate-hooks', {
      body: { action: 'vote', battleId: result.battle_id, hookIndex },
    });

    if (error) {
      toast({ title: 'Vote failed', description: error.message, variant: 'destructive' });
    } else {
      setVotedIndex(hookIndex);
      setVoteCounts(prev => prev.map(v => v.hookIndex === hookIndex ? { ...v, count: v.count + 1 } : v));
      toast({ title: 'Vote cast! 🗳️', description: 'Your vote has been recorded.' });
    }
    setVoting(false);
  };

  const handleSwipeVote = (hookIndex: number, direction: 'right' | 'left') => {
    setLastSwipeAction({ index: hookIndex, dir: direction === 'right' ? 'vote' : 'skip' });
    setSwipedCards(prev => new Set(prev).add(hookIndex));

    if (direction === 'right' && communityMode) {
      handleVote(hookIndex);
    } else if (direction === 'right') {
      // If community mode off, just select
      setSelectedHook(hookIndex);
      toast({ title: `Hook #${hookIndex + 1} selected ✅`, description: result?.hooks[hookIndex].emotion });
    } else {
      toast({ title: `Hook #${hookIndex + 1} skipped ⏭️`, description: 'Swipe right to vote.' });
    }
  };

  const copyHook = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: 'Hook copied to clipboard.' });
  };

  const openScheduleModal = (hookIndex: number) => {
    if (!result) return;
    const hook = result.hooks[hookIndex];
    setScheduleHookIndex(hookIndex);
    setScheduleForm(f => ({
      ...f,
      title: `${niche.charAt(0).toUpperCase() + niche.slice(1)} – ${hook.trigger} hook`,
    }));
    setShowSchedule(true);
  };

  const handleScheduleSave = async () => {
    if (!result || scheduleHookIndex === null || !user) return;
    if (!scheduleForm.title.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const hook = result.hooks[scheduleHookIndex];
    const { error } = await supabase.from('scheduled_posts').insert({
      user_id: user.id,
      title: scheduleForm.title.trim(),
      hook: hook.text,
      niche,
      platform: scheduleForm.platform,
      scheduled_date: scheduleForm.scheduled_date,
      scheduled_time: scheduleForm.scheduled_time + ':00',
      status: scheduleForm.status,
      notes: scheduleForm.notes.trim() || null,
    });
    if (error) {
      toast({ title: 'Failed to schedule', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Post scheduled! 📅', description: 'Find it in your Content Calendar.' });
      setShowSchedule(false);
    }
    setSaving(false);
  };

  const handleShareTikTok = async (hookText: string) => {
    await navigator.clipboard.writeText(hookText);
    toast({ title: '📋 Hook copied!', description: 'Paste it into TikTok.' });
    window.open('https://www.tiktok.com/upload', '_blank');
    setShareOpenIndex(null);
  };

  const handleShareInstagram = async (hookText: string) => {
    await navigator.clipboard.writeText(hookText);
    toast({ title: '📋 Hook copied!', description: 'Paste it into Instagram.' });
    window.open('https://www.instagram.com', '_blank');
    setShareOpenIndex(null);
  };

  const handleShareTwitter = (hookText: string) => {
    const tweetText = encodeURIComponent(hookText);
    window.open(`https://x.com/intent/tweet?text=${tweetText}`, '_blank');
    setShareOpenIndex(null);
  };

  // Screenshot: use html2canvas if available, else fallback to copy
  const handleScreenshot = async (hookIndex: number) => {
    setScreenshotIndex(hookIndex);
  };

  const handleDownloadScreenshot = async () => {
    if (screenshotIndex === null || !screenshotRef.current) return;
    try {
      // Dynamic import html2canvas
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(screenshotRef.current, {
        backgroundColor: '#1C1C1E',
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });
      const link = document.createElement('a');
      link.download = `viralforge-hook-${screenshotIndex + 1}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast({ title: '📸 Screenshot saved!', description: 'Share it on Stories to promote your hook.' });
    } catch (e) {
      // Fallback — copy hook text
      if (result) {
        await navigator.clipboard.writeText(result.hooks[screenshotIndex].text);
        toast({ title: '📋 Hook copied!', description: "html2canvas not available — hook text copied instead." });
      }
    }
    setScreenshotIndex(null);
  };

  const totalVotes = voteCounts.reduce((sum, v) => sum + v.count, 0);

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8 space-y-6">

          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm font-bold">
              <Swords className="h-4 w-4" />
              Hook Battle
            </div>
            <h1 className="text-3xl sm:text-4xl font-black">
              5 Hooks. <span className="text-gradient">One Winner.</span>
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-md mx-auto">
              AI fires 5 hooks using 5 different psychological triggers. Pick the best, or let the crowd decide.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
              <span className="bg-muted/40 px-3 py-1.5 rounded-full flex items-center gap-1">
                <Zap className="h-3 w-3 text-primary" />2 credits per battle
              </span>
              <span className="sm:hidden bg-muted/40 px-3 py-1.5 rounded-full flex items-center gap-1">
                <ChevronLeft className="h-3 w-3" />swipe to vote<ChevronRight className="h-3 w-3" />
              </span>
            </div>
          </div>

          {/* Form */}
          <div className="glass-card p-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="topic" className="text-sm font-bold">Your Topic / Idea *</Label>
              <Input
                id="topic"
                placeholder="e.g. I quit my 9-5 at 22 and never looked back"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                className="bg-background/50 h-11"
                onKeyDown={e => e.key === 'Enter' && handleGenerate()}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-bold">Niche *</Label>
                <Select value={niche} onValueChange={setNiche}>
                  <SelectTrigger className="bg-background/50 h-11">
                    <SelectValue placeholder="Pick niche" />
                  </SelectTrigger>
                  <SelectContent>
                    {NICHES.map(n => <SelectItem key={n} value={n} className="capitalize">{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-bold">Vibe *</Label>
                <Select value={vibe} onValueChange={setVibe}>
                  <SelectTrigger className="bg-background/50 h-11">
                    <SelectValue placeholder="Pick vibe" />
                  </SelectTrigger>
                  <SelectContent>
                    {VIBES.map(v => <SelectItem key={v} value={v} className="capitalize">{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full h-12 text-base font-black bg-primary text-primary-foreground hover:bg-primary/90 glow-primary"
            >
              {loading ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating 5 Hooks...</>
              ) : (
                <><Swords className="mr-2 h-5 w-5" /> Start Hook Battle</>
              )}
            </Button>
          </div>

          {/* Results */}
          {result && (
            <div className="space-y-4">
              {/* AI Pick Banner */}
              <div className="glass-card p-4 border border-primary/40 bg-primary/5">
                <div className="flex items-start gap-3">
                  <Trophy className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-black text-primary mb-1">
                      AI's Top Pick → Hook #{result.aiPickIndex + 1}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{result.aiPickReason}</p>
                  </div>
                </div>
              </div>

              {/* Community Vote Toggle + swipe instructions */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="font-black text-lg">Pick Your Hook</h2>
                <button
                  onClick={() => setCommunityMode(c => !c)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    communityMode
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/60 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Users className="h-3.5 w-3.5" />
                  Community Vote {communityMode ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Last swipe feedback */}
              {lastSwipeAction && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold animate-fade-in ${
                  lastSwipeAction.dir === 'vote'
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                  {lastSwipeAction.dir === 'vote' ? '🗳️' : '⏭️'}
                  Hook #{lastSwipeAction.index + 1} {lastSwipeAction.dir === 'vote' ? 'voted!' : 'skipped'}
                </div>
              )}

              {/* Hook Cards */}
              <div className="space-y-3">
                {result.hooks.map((hook, i) => {
                  const voteData = voteCounts.find(v => v.hookIndex === i);
                  const votePercent = totalVotes > 0 ? Math.round(((voteData?.count ?? 0) / totalVotes) * 100) : 0;

                  return (
                    <div key={i}>
                      <SwipeVoteCard
                        hook={hook}
                        index={i}
                        isAiPick={i === result.aiPickIndex}
                        isSelected={selectedHook === i}
                        isVoted={votedIndex === i}
                        communityMode={communityMode}
                        voteCount={voteData?.count ?? 0}
                        votePercent={votePercent}
                        voting={voting}
                        canVote={votedIndex === null}
                        shareOpenIndex={shareOpenIndex}
                        onSelect={() => setSelectedHook(i)}
                        onVote={() => handleVote(i)}
                        onCopy={copyHook}
                        onSchedule={() => openScheduleModal(i)}
                        onShareToggle={() => setShareOpenIndex(shareOpenIndex === i ? null : i)}
                        onShareTikTok={handleShareTikTok}
                        onShareInstagram={handleShareInstagram}
                        onShareTwitter={handleShareTwitter}
                        onSwipeVote={handleSwipeVote}
                      />
                      {/* Screenshot button below card */}
                      <button
                        onClick={() => handleScreenshot(i)}
                        className="w-full mt-1.5 flex items-center justify-center gap-1.5 py-1.5 text-[10px] text-muted-foreground/50 hover:text-primary/70 transition-colors"
                      >
                        <Camera className="h-3 w-3" />
                        Save as image to share on Stories
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Regenerate */}
              <Button
                variant="outline"
                onClick={handleGenerate}
                disabled={loading}
                className="w-full gap-2 border-primary/20 hover:bg-primary/5 hover:border-primary/40 h-11"
              >
                <RefreshCw className="h-4 w-4" />
                New Battle (2 credits)
              </Button>
            </div>
          )}
        </div>
      </div>

      <BuyCreditsModal open={showBuyCredits} onOpenChange={setShowBuyCredits} />

      {/* Screenshot Preview Modal */}
      <Dialog open={screenshotIndex !== null} onOpenChange={(o) => { if (!o) setScreenshotIndex(null); }}>
        <DialogContent className="max-w-sm w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-primary" />
              Share Card Preview
            </DialogTitle>
          </DialogHeader>
          {result && screenshotIndex !== null && (
            <div className="space-y-4 pt-2">
              <div className="flex justify-center">
                <div ref={screenshotRef}>
                  <ScreenshotCard
                    hook={result.hooks[screenshotIndex]}
                    index={screenshotIndex}
                    isAiPick={screenshotIndex === result.aiPickIndex}
                    niche={niche}
                    vibe={vibe}
                  />
                </div>
              </div>
              <Button
                onClick={handleDownloadScreenshot}
                className="w-full h-11 font-black bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
              >
                <Camera className="h-4 w-4" />
                Save & Download Image
              </Button>
              <p className="text-[11px] text-center text-muted-foreground">
                Share on TikTok Stories, IG Stories, or Twitter to promote your content ⚡
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Schedule Modal */}
      <Dialog open={showSchedule} onOpenChange={setShowSchedule}>
        <DialogContent className="max-w-md w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Schedule This Hook
            </DialogTitle>
          </DialogHeader>

          {result && scheduleHookIndex !== null && (
            <div className="space-y-4 pt-1">
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                <p className="text-[10px] text-muted-foreground font-black uppercase mb-1">
                  {result.hooks[scheduleHookIndex].emoji} {result.hooks[scheduleHookIndex].trigger} Hook
                </p>
                <p className="text-sm font-bold">"{result.hooks[scheduleHookIndex].text}"</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold">Post Title *</label>
                <input className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm" placeholder="e.g. Money niche FOMO hook" value={scheduleForm.title} onChange={e => setScheduleForm(f => ({ ...f, title: e.target.value }))} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold">Platform</label>
                  <Select value={scheduleForm.platform} onValueChange={v => setScheduleForm(f => ({ ...f, platform: v }))}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>{PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold">Status</label>
                  <Select value={scheduleForm.status} onValueChange={v => setScheduleForm(f => ({ ...f, status: v as ScheduleStatus }))}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">📅 Scheduled</SelectItem>
                      <SelectItem value="draft">📝 Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold">Date</label>
                  <input type="date" className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm" value={scheduleForm.scheduled_date} onChange={e => setScheduleForm(f => ({ ...f, scheduled_date: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold">Time</label>
                  <input type="time" className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm" value={scheduleForm.scheduled_time} onChange={e => setScheduleForm(f => ({ ...f, scheduled_time: e.target.value }))} />
                </div>
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
                <p className="text-[11px] text-muted-foreground mb-2 font-bold">
                  <Zap className="h-3 w-3 inline mr-1 text-primary" />Best times for {scheduleForm.platform}:
                </p>
                <div className="flex gap-1.5 flex-wrap">
                  {(OPTIMAL_TIMES[scheduleForm.platform] ?? []).map(t => (
                    <button key={t} onClick={() => setScheduleForm(f => ({ ...f, scheduled_time: t }))} className={`text-xs px-2.5 py-1.5 rounded-full transition-all font-semibold min-h-[36px] ${scheduleForm.scheduled_time === t ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}>{t}</button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold">Notes <span className="text-muted-foreground font-normal">(optional)</span></label>
                <input className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm" placeholder="Any reminder..." value={scheduleForm.notes} onChange={e => setScheduleForm(f => ({ ...f, notes: e.target.value }))} />
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowSchedule(false)} className="flex-1 gap-2 h-11">
                  <X className="h-4 w-4" /> Cancel
                </Button>
                <Button onClick={handleScheduleSave} disabled={saving} className="flex-1 gap-2 bg-primary text-primary-foreground hover:bg-primary/90 h-11">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />}
                  Schedule
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
