import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { BuyCreditsModal } from '@/components/features/BuyCreditsModal';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { Swords, Sparkles, Trophy, Users, CheckCircle2, Loader2, RefreshCw, Copy, Zap } from 'lucide-react';

const NICHES = ['anime', 'motivation', 'money', 'dating', 'gym', 'ai & tech', 'storytime', 'fashion', 'gaming', 'beauty', 'food', 'travel'];
const VIBES = ['dark', 'chill', 'toxic', 'motivational', 'mysterious', 'hype', 'educational', 'funny'];

const TRIGGER_COLORS: Record<string, string> = {
  CURIOSITY: 'from-violet-500/20 to-purple-500/10 border-violet-500/40',
  SHOCK: 'from-red-500/20 to-orange-500/10 border-red-500/40',
  RELATABILITY: 'from-blue-500/20 to-cyan-500/10 border-blue-500/40',
  CONTROVERSY: 'from-amber-500/20 to-yellow-500/10 border-amber-500/40',
  FOMO: 'from-green-500/20 to-emerald-500/10 border-green-500/40',
};

const TRIGGER_TEXT_COLORS: Record<string, string> = {
  CURIOSITY: 'text-violet-400',
  SHOCK: 'text-red-400',
  RELATABILITY: 'text-blue-400',
  CONTROVERSY: 'text-amber-400',
  FOMO: 'text-green-400',
};

interface Hook {
  text: string;
  trigger: string;
  emotion: string;
  emoji: string;
  why: string;
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

export function HookBattle() {
  const { toast } = useToast();
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
    // Init vote counts at 0
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

  const copyHook = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: 'Hook copied to clipboard.' });
  };

  const totalVotes = voteCounts.reduce((sum, v) => sum + v.count, 0);

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">

          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm font-semibold">
              <Swords className="h-4 w-4" />
              Hook Battle
            </div>
            <h1 className="text-3xl md:text-4xl font-black">
              5 Hooks.{' '}
              <span className="text-gradient">One Winner.</span>
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto text-sm leading-relaxed">
              AI generates 5 different hooks using 5 different psychological triggers — curiosity, shock, relatability, controversy, and FOMO. Pick the best or let the community decide.
            </p>
            <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-full">
              <Zap className="h-3 w-3 text-primary" />
              Costs 2 credits per battle
            </div>
          </div>

          {/* Form */}
          <div className="glass-card p-6 space-y-5">
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

            <div className="grid grid-cols-2 gap-4">
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
              className="w-full h-12 text-base font-bold bg-gradient-to-r from-primary to-accent hover:opacity-90"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating 5 Hooks...
                </>
              ) : (
                <>
                  <Swords className="mr-2 h-5 w-5" />
                  Start Hook Battle
                </>
              )}
            </Button>
          </div>

          {/* Results */}
          {result && (
            <div className="space-y-5">
              {/* AI Pick Banner */}
              <div className="glass-card p-4 border border-primary/30 bg-gradient-to-r from-primary/10 to-accent/10">
                <div className="flex items-start gap-3">
                  <Trophy className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-primary mb-1">AI's Highest Virality Pick → Hook #{result.aiPickIndex + 1}</p>
                    <p className="text-xs text-muted-foreground">{result.aiPickReason}</p>
                  </div>
                </div>
              </div>

              {/* Community Vote Toggle */}
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg">Pick Your Hook</h2>
                <button
                  onClick={() => setCommunityMode(c => !c)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    communityMode
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Users className="h-3.5 w-3.5" />
                  Community Vote {communityMode ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Hook Cards */}
              <div className="space-y-4">
                {result.hooks.map((hook, i) => {
                  const isAiPick = i === result.aiPickIndex;
                  const isSelected = selectedHook === i;
                  const isVoted = votedIndex === i;
                  const voteData = voteCounts.find(v => v.hookIndex === i);
                  const votePercent = totalVotes > 0 ? Math.round(((voteData?.count ?? 0) / totalVotes) * 100) : 0;

                  return (
                    <div
                      key={i}
                      onClick={() => setSelectedHook(i)}
                      className={`relative glass-card p-5 border bg-gradient-to-br cursor-pointer transition-all duration-200 ${
                        TRIGGER_COLORS[hook.trigger]
                      } ${isSelected ? 'ring-2 ring-primary scale-[1.01]' : 'hover:scale-[1.005]'}`}
                    >
                      {/* Badges */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-background/50 ${TRIGGER_TEXT_COLORS[hook.trigger]}`}>
                          {hook.emoji} {hook.trigger}
                        </span>
                        <span className="text-xs text-muted-foreground bg-background/30 px-2 py-0.5 rounded-full">
                          {hook.emotion}
                        </span>
                        {isAiPick && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                            <Trophy className="h-3 w-3 inline mr-1" />AI Pick
                          </span>
                        )}
                        {isSelected && (
                          <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                            <CheckCircle2 className="h-3 w-3 inline mr-1" />Selected
                          </span>
                        )}
                      </div>

                      {/* Hook Text */}
                      <p className="text-lg font-black leading-tight mb-2">"{hook.text}"</p>

                      {/* Why it works */}
                      <p className="text-xs text-muted-foreground mb-4">{hook.why}</p>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={e => { e.stopPropagation(); copyHook(hook.text); }}
                          className="h-8 gap-1.5 text-xs"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copy
                        </Button>

                        {communityMode && (
                          <Button
                            size="sm"
                            variant={isVoted ? 'default' : 'outline'}
                            onClick={e => { e.stopPropagation(); handleVote(i); }}
                            disabled={voting || votedIndex !== null}
                            className="h-8 gap-1.5 text-xs ml-auto"
                          >
                            {voting && votedIndex === null ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <>🗳️ Vote{isVoted ? 'd' : ''}</>
                            )}
                          </Button>
                        )}
                      </div>

                      {/* Vote Bar */}
                      {communityMode && votedIndex !== null && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            <span>{voteData?.count ?? 0} vote{(voteData?.count ?? 0) !== 1 ? 's' : ''}</span>
                            <span>{votePercent}%</span>
                          </div>
                          <div className="h-1.5 bg-background/50 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
                              style={{ width: `${votePercent}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Regenerate */}
              <Button
                variant="outline"
                onClick={handleGenerate}
                disabled={loading}
                className="w-full gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Generate New Battle (2 credits)
              </Button>
            </div>
          )}
        </div>
      </div>

      <BuyCreditsModal open={showBuyCredits} onOpenChange={setShowBuyCredits} />
    </AppLayout>
  );
}
