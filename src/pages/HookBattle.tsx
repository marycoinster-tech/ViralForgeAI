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
import { FunctionsHttpError } from '@supabase/supabase-js';
import {
  Swords, Trophy, Users, CheckCircle2, Loader2, RefreshCw,
  Copy, Zap, CalendarDays, X, ChevronLeft, ChevronRight,
} from 'lucide-react';

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

// Charcoal + Electric Yellow trigger styles
const TRIGGER_STYLES: Record<string, { border: string; bg: string; badgeBg: string; badgeText: string; pill: string }> = {
  CURIOSITY: {
    border: 'border-primary/40',
    bg: 'bg-primary/5',
    badgeBg: 'bg-primary/15',
    badgeText: 'text-primary',
    pill: 'bg-primary/10 text-primary border-primary/30',
  },
  SHOCK: {
    border: 'border-red-500/40',
    bg: 'bg-red-500/5',
    badgeBg: 'bg-red-500/15',
    badgeText: 'text-red-400',
    pill: 'bg-red-500/10 text-red-400 border-red-500/30',
  },
  RELATABILITY: {
    border: 'border-cyan-400/40',
    bg: 'bg-cyan-400/5',
    badgeBg: 'bg-cyan-400/15',
    badgeText: 'text-cyan-400',
    pill: 'bg-cyan-400/10 text-cyan-400 border-cyan-400/30',
  },
  CONTROVERSY: {
    border: 'border-orange-400/40',
    bg: 'bg-orange-400/5',
    badgeBg: 'bg-orange-400/15',
    badgeText: 'text-orange-400',
    pill: 'bg-orange-400/10 text-orange-400 border-orange-400/30',
  },
  FOMO: {
    border: 'border-green-400/40',
    bg: 'bg-green-400/5',
    badgeBg: 'bg-green-400/15',
    badgeText: 'text-green-400',
    pill: 'bg-green-400/10 text-green-400 border-green-400/30',
  },
};

interface Hook {
  text: string;
  trigger: string;
  emotion: string;
  emoji: string;
  why: string;
  viralScore?: number;
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
  const [activeCard, setActiveCard] = useState(0);
  const [votedIndex, setVotedIndex] = useState<number | null>(null);
  const [voting, setVoting] = useState(false);
  const [voteCounts, setVoteCounts] = useState<VoteCount[]>([]);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [communityMode, setCommunityMode] = useState(false);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Schedule modal state
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
    setActiveCard(0);
    setVotedIndex(null);
    setVoteCounts([]);

    const { data, error } = await supabase.functions.invoke('generate-hooks', {
      body: { action: 'hook_battle', topic: topic.trim(), niche, vibe },
    });

    if (error) {
      let msg = error.message;
      if (error instanceof FunctionsHttpError) {
        try { const t = await error.context?.text(); msg = t || msg; } catch { /* noop */ }
      }
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
      let msg = error.message;
      if (error instanceof FunctionsHttpError) {
        try { const t = await error.context?.text(); msg = t || msg; } catch { /* noop */ }
      }
      toast({ title: 'Vote failed', description: msg, variant: 'destructive' });
    } else {
      setVotedIndex(hookIndex);
      setVoteCounts(prev => prev.map(v => v.hookIndex === hookIndex ? { ...v, count: v.count + 1 } : v));
      toast({ title: 'Vote cast! 🗳️', description: 'Your vote has been recorded anonymously.' });
    }
    setVoting(false);
  };

  const copyHook = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: 'Hook copied to clipboard.' });
  };

  const openScheduleModal = (hookIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
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

  // Swipe gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50 && result) {
      if (diff > 0) setActiveCard(prev => Math.min(prev + 1, result.hooks.length - 1));
      else setActiveCard(prev => Math.max(prev - 1, 0));
    }
  };

  const totalVotes = voteCounts.reduce((sum, v) => sum + v.count, 0);

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-6 sm:py-8 space-y-6">

          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm font-bold">
              <Swords className="h-4 w-4" />
              Hook Battle
            </div>
            <h1 className="text-2xl sm:text-3xl font-black leading-tight">
              5 Hooks.{' '}
              <span className="text-gradient">One Winner.</span>
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed px-2">
              AI generates 5 hooks using 5 psychological triggers — curiosity, shock, relatability, controversy, and FOMO. Swipe to explore, pick the best, or let the community vote.
            </p>
            <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-full">
              <Zap className="h-3 w-3 text-primary" />
              Costs 2 credits per battle
            </div>
          </div>

          {/* Form */}
          <div className="glass-card p-4 sm:p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="topic" className="text-sm font-semibold">Your Topic / Idea *</Label>
              <Input
                id="topic"
                placeholder="e.g. I quit my 9-5 job at 22 and never looked back"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                className="bg-background/50"
                onKeyDown={e => e.key === 'Enter' && handleGenerate()}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Niche *</Label>
                <Select value={niche} onValueChange={setNiche}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Select niche" />
                  </SelectTrigger>
                  <SelectContent>
                    {NICHES.map(n => (
                      <SelectItem key={n} value={n} className="capitalize">{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Vibe *</Label>
                <Select value={vibe} onValueChange={setVibe}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Select vibe" />
                  </SelectTrigger>
                  <SelectContent>
                    {VIBES.map(v => (
                      <SelectItem key={v} value={v} className="capitalize">{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full h-11 text-sm sm:text-base font-bold bg-primary text-primary-foreground hover:bg-primary/90 glow-primary"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating 5 Hooks...
                </>
              ) : (
                <>
                  <Swords className="mr-2 h-4 w-4" />
                  Start Hook Battle
                </>
              )}
            </Button>
          </div>

          {/* Results */}
          {result && (
            <div className="space-y-4">
              {/* AI Pick Banner */}
              <div className="rounded-2xl p-4 border-2 border-primary/40 bg-primary/8 flex items-start gap-3"
                style={{ background: 'hsl(51 100% 50% / 0.06)' }}>
                <div className="flex-shrink-0 mt-0.5 h-8 w-8 rounded-xl bg-primary/15 flex items-center justify-center">
                  <Trophy className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-primary">AI Pick → Hook #{result.aiPickIndex + 1}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{result.aiPickReason}</p>
                </div>
              </div>

              {/* Community Vote + Navigation */}
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-bold text-base sm:text-lg">Pick Your Hook</h2>
                <div className="flex items-center gap-2">
                  {/* Community vote toggle */}
                  <button
                    onClick={() => setCommunityMode(c => !c)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                      communityMode
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Users className="h-3 w-3" />
                    <span className="hidden sm:inline">Community </span>Vote
                  </button>
                </div>
              </div>

              {/* Mobile swipe indicator */}
              <div className="flex items-center justify-center gap-3 sm:hidden">
                <button
                  onClick={() => setActiveCard(prev => Math.max(prev - 1, 0))}
                  disabled={activeCard === 0}
                  className="h-8 w-8 rounded-full bg-muted/60 flex items-center justify-center disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="flex gap-1.5">
                  {result.hooks.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveCard(i)}
                      className={`rounded-full transition-all duration-300 ${
                        i === activeCard
                          ? 'w-5 h-2.5 bg-primary'
                          : i === result.aiPickIndex
                          ? 'w-2.5 h-2.5 bg-primary/40'
                          : 'w-2.5 h-2.5 bg-muted-foreground/30'
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={() => setActiveCard(prev => Math.min(prev + 1, result.hooks.length - 1))}
                  disabled={activeCard === result.hooks.length - 1}
                  className="h-8 w-8 rounded-full bg-muted/60 flex items-center justify-center disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Hook Cards */}
              {/* Desktop: show all stacked. Mobile: show one at a time with swipe */}
              <div
                className="space-y-3 hidden sm:block"
              >
                {result.hooks.map((hook, i) => (
                  <HookCard
                    key={i}
                    hook={hook}
                    index={i}
                    isAiPick={i === result.aiPickIndex}
                    isSelected={selectedHook === i}
                    isVoted={votedIndex === i}
                    communityMode={communityMode}
                    voting={voting}
                    votedIndex={votedIndex}
                    voteData={voteCounts.find(v => v.hookIndex === i)}
                    totalVotes={totalVotes}
                    onSelect={() => setSelectedHook(i)}
                    onCopy={(e) => copyHook(hook.text, e)}
                    onSchedule={(e) => openScheduleModal(i, e)}
                    onVote={() => handleVote(i)}
                  />
                ))}
              </div>

              {/* Mobile: single card with swipe */}
              <div
                className="sm:hidden"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                {result.hooks.map((hook, i) => (
                  <div key={i} className={i === activeCard ? 'block' : 'hidden'}>
                    <HookCard
                      hook={hook}
                      index={i}
                      isAiPick={i === result.aiPickIndex}
                      isSelected={selectedHook === i}
                      isVoted={votedIndex === i}
                      communityMode={communityMode}
                      voting={voting}
                      votedIndex={votedIndex}
                      voteData={voteCounts.find(v => v.hookIndex === i)}
                      totalVotes={totalVotes}
                      onSelect={() => setSelectedHook(i)}
                      onCopy={(e) => copyHook(hook.text, e)}
                      onSchedule={(e) => openScheduleModal(i, e)}
                      onVote={() => handleVote(i)}
                    />
                  </div>
                ))}
                <p className="text-center text-xs text-muted-foreground mt-3">
                  ← Swipe to see more hooks →
                </p>
              </div>

              {/* Regenerate */}
              <Button
                variant="outline"
                onClick={handleGenerate}
                disabled={loading}
                className="w-full gap-2 border-primary/30 hover:border-primary hover:bg-primary/5"
              >
                <RefreshCw className="h-4 w-4" />
                New Battle (2 credits)
              </Button>
            </div>
          )}
        </div>
      </div>

      <BuyCreditsModal open={showBuyCredits} onOpenChange={setShowBuyCredits} />

      {/* Schedule Post Modal */}
      <Dialog open={showSchedule} onOpenChange={setShowSchedule}>
        <DialogContent className="max-w-sm w-full mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4 text-primary" />
              Schedule This Hook
            </DialogTitle>
          </DialogHeader>

          {result && scheduleHookIndex !== null && (
            <div className="space-y-4 pt-1">
              {/* Hook preview */}
              <div className="p-3 rounded-xl bg-primary/8 border border-primary/20"
                style={{ background: 'hsl(51 100% 50% / 0.06)' }}>
                <p className="text-[10px] text-primary font-bold uppercase mb-1">
                  {result.hooks[scheduleHookIndex].emoji} {result.hooks[scheduleHookIndex].trigger}
                </p>
                <p className="text-sm font-bold leading-tight">"{result.hooks[scheduleHookIndex].text}"</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Post Title *</label>
                <input
                  className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1 text-sm"
                  placeholder="e.g. Money niche FOMO hook"
                  value={scheduleForm.title}
                  onChange={e => setScheduleForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Platform</label>
                  <Select value={scheduleForm.platform} onValueChange={v => setScheduleForm(f => ({ ...f, platform: v }))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Status</label>
                  <Select value={scheduleForm.status} onValueChange={v => setScheduleForm(f => ({ ...f, status: v as ScheduleStatus }))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">📅 Scheduled</SelectItem>
                      <SelectItem value="draft">📝 Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Date</label>
                  <input
                    type="date"
                    className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1 text-sm"
                    value={scheduleForm.scheduled_date}
                    onChange={e => setScheduleForm(f => ({ ...f, scheduled_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Time</label>
                  <input
                    type="time"
                    className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1 text-sm"
                    value={scheduleForm.scheduled_time}
                    onChange={e => setScheduleForm(f => ({ ...f, scheduled_time: e.target.value }))}
                  />
                </div>
              </div>

              {/* Best times */}
              <div className="rounded-xl bg-primary/6 border border-primary/20 p-3"
                style={{ background: 'hsl(51 100% 50% / 0.05)' }}>
                <p className="text-[11px] text-muted-foreground mb-1.5 font-semibold">
                  <Zap className="h-3 w-3 inline mr-1 text-primary" />
                  Best times for {scheduleForm.platform}:
                </p>
                <div className="flex gap-1.5 flex-wrap">
                  {(OPTIMAL_TIMES[scheduleForm.platform] ?? []).map(t => (
                    <button
                      key={t}
                      onClick={() => setScheduleForm(f => ({ ...f, scheduled_time: t }))}
                      className={`text-[11px] px-2 py-0.5 rounded-full transition-all border ${
                        scheduleForm.scheduled_time === t
                          ? 'bg-primary text-primary-foreground font-bold border-primary'
                          : 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Notes <span className="text-muted-foreground font-normal">(optional)</span></label>
                <input
                  className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1 text-sm"
                  placeholder="Any reminder..."
                  value={scheduleForm.notes}
                  onChange={e => setScheduleForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowSchedule(false)} className="flex-1 h-10 gap-2">
                  <X className="h-4 w-4" /> Cancel
                </Button>
                <Button
                  onClick={handleScheduleSave}
                  disabled={saving}
                  className="flex-1 h-10 gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
                >
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

// ─── HookCard sub-component ─────────────────────────────────────────────────
interface HookCardProps {
  hook: Hook;
  index: number;
  isAiPick: boolean;
  isSelected: boolean;
  isVoted: boolean;
  communityMode: boolean;
  voting: boolean;
  votedIndex: number | null;
  voteData?: { count: number };
  totalVotes: number;
  onSelect: () => void;
  onCopy: (e: React.MouseEvent) => void;
  onSchedule: (e: React.MouseEvent) => void;
  onVote: () => void;
}

function HookCard({
  hook, index, isAiPick, isSelected, isVoted,
  communityMode, voting, votedIndex, voteData, totalVotes,
  onSelect, onCopy, onSchedule, onVote,
}: HookCardProps) {
  const s = TRIGGER_STYLES[hook.trigger] ?? TRIGGER_STYLES.CURIOSITY;
  const votePercent = totalVotes > 0 ? Math.round(((voteData?.count ?? 0) / totalVotes) * 100) : 0;
  const viralScore = hook.viralScore ?? Math.floor(70 + Math.random() * 28);

  return (
    <div
      onClick={onSelect}
      className={`relative rounded-2xl border-2 p-4 sm:p-5 cursor-pointer transition-all duration-200 ${s.border} ${s.bg} ${
        isAiPick
          ? 'ring-2 ring-primary ring-offset-1 ring-offset-background'
          : ''
      } ${isSelected ? 'scale-[1.01]' : 'hover:scale-[1.005]'}`}
      style={isAiPick ? { boxShadow: '0 0 20px hsl(51 100% 50% / 0.18)' } : undefined}
    >
      {/* AI Pick crown indicator */}
      {isAiPick && (
        <div className="absolute -top-3 left-4">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-black shadow-lg">
            <Trophy className="h-2.5 w-2.5" />
            AI PICK
          </div>
        </div>
      )}

      {/* Top row: trigger badge + hook number */}
      <div className="flex items-start justify-between gap-2 mb-3" style={{ marginTop: isAiPick ? '4px' : '0' }}>
        <div className="flex flex-wrap gap-1.5">
          {/* Trigger pill */}
          <span className={`inline-flex items-center gap-1 text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full border ${s.pill}`}>
            {hook.emoji} {hook.trigger}
          </span>
          {/* Emotion label */}
          <span className="text-[10px] sm:text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full border border-border/40">
            {hook.emotion}
          </span>
          {isSelected && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/30">
              <CheckCircle2 className="h-2.5 w-2.5" />
              Selected
            </span>
          )}
        </div>
        <span className="text-[10px] font-black text-muted-foreground/50 flex-shrink-0">#{index + 1}</span>
      </div>

      {/* Hook text */}
      <p className="text-base sm:text-lg font-black leading-snug mb-2 break-words">"{hook.text}"</p>

      {/* Why it works */}
      <p className="text-xs text-muted-foreground leading-relaxed mb-3 break-words">{hook.why}</p>

      {/* Viral score bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
          <span className="font-semibold">Viral Score</span>
          <span className={`font-black ${s.badgeText}`}>{viralScore}/100</span>
        </div>
        <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 bg-primary"
            style={{ width: `${viralScore}%` }}
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          size="sm"
          variant="ghost"
          onClick={onCopy}
          className="h-8 gap-1.5 text-xs hover:bg-primary/10 hover:text-primary"
        >
          <Copy className="h-3.5 w-3.5" />
          Copy
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onSchedule}
          className="h-8 gap-1.5 text-xs border-primary/30 hover:border-primary hover:bg-primary/5"
        >
          <CalendarDays className="h-3.5 w-3.5" />
          Schedule
        </Button>

        {communityMode && (
          <Button
            size="sm"
            variant={isVoted ? 'default' : 'outline'}
            onClick={(e) => { e.stopPropagation(); onVote(); }}
            disabled={voting || votedIndex !== null}
            className={`h-8 gap-1.5 text-xs ml-auto ${isVoted ? 'bg-primary text-primary-foreground' : 'border-primary/30 hover:bg-primary/5'}`}
          >
            {voting && votedIndex === null ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>🗳️ Vote{isVoted ? 'd' : ''}</>
            )}
          </Button>
        )}
      </div>

      {/* Vote bar */}
      {communityMode && votedIndex !== null && (
        <div className="mt-3 pt-3 border-t border-border/30">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
            <span>{voteData?.count ?? 0} vote{(voteData?.count ?? 0) !== 1 ? 's' : ''}</span>
            <span className="font-bold">{votePercent}%</span>
          </div>
          <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${votePercent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
