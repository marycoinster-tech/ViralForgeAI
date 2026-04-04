import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { BuyCreditsModal } from '@/components/features/BuyCreditsModal';
import { FunctionsHttpError } from '@supabase/supabase-js';
import {
  Dna, Zap, TrendingUp, Eye, Heart, RefreshCw, Copy,
  Loader2, Target, AlertTriangle, CheckCircle2, Share2
} from 'lucide-react';

const NICHES = ['anime', 'motivation', 'money', 'dating', 'gym', 'ai & tech', 'storytime', 'fashion', 'gaming', 'beauty', 'food', 'travel'];

interface EmotionTrigger {
  emotion: string;
  intensity: number;
  moment: string;
}

interface DNAResult {
  viralScore: number;
  hookPattern: { type: string; firstTwoSeconds: string; curiosityGap: string };
  emotionTriggers: EmotionTrigger[];
  pacingStructure: { rhythm: string; keyMoments: string[]; retentionTactic: string };
  loopMechanic: { hasLoop: boolean; loopType: string; description: string };
  psychologicalFormula: string;
  strengths: string[];
  weaknesses: string[];
  targetAudience: { age: string; mindset: string; shareTrigger: string };
  yourVersion: {
    hook: string;
    script: string;
    caption: string;
    hashtags: string[];
    visualIdea: string;
    postingTip: string;
  };
  viralScoreBreakdown: {
    hookStrength: number;
    emotionalImpact: number;
    shareability: number;
    retentionPotential: number;
    trendAlignment: number;
  };
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const dash = (score / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="100" height="100" className="-rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
        <circle
          cx="50" cy="50" r={radius} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-2xl font-black" style={{ color }}>{score}</p>
        <p className="text-[10px] text-muted-foreground font-semibold -mt-0.5">VIRAL</p>
      </div>
    </div>
  );
}

function MiniBar({ value, label }: { value: number; label: string }) {
  const color = value >= 80 ? 'from-green-500 to-emerald-400' : value >= 60 ? 'from-amber-500 to-yellow-400' : 'from-red-500 to-orange-400';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-bold">{value}</span>
      </div>
      <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
        <div className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-700`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function ViralDNA() {
  const { toast } = useToast();
  const [inputUrl, setInputUrl] = useState('');
  const [inputDescription, setInputDescription] = useState('');
  const [niche, setNiche] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DNAResult | null>(null);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [activeTab, setActiveTab] = useState<'analysis' | 'version'>('analysis');

  const handleAnalyze = async () => {
    if (!inputDescription.trim() || !niche) {
      toast({ title: 'Fill in required fields', description: 'Description and your niche are required.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    setResult(null);

    const { data, error } = await supabase.functions.invoke('generate-hooks', {
      body: {
        action: 'viral_dna',
        inputUrl: inputUrl.trim() || undefined,
        inputDescription: inputDescription.trim(),
        niche,
      },
    });

    if (error) {
      let msg = error.message;
      if (error instanceof FunctionsHttpError) {
        try { const t = await error.context?.text(); msg = t || msg; } catch { /* noop */ }
      }
      if (msg.includes('insufficient_credits')) {
        setShowBuyCredits(true);
        toast({ title: 'Not enough credits', description: 'Purchase credits to run Viral DNA analysis.', variant: 'destructive' });
      } else {
        toast({ title: 'Analysis failed', description: msg, variant: 'destructive' });
      }
      setLoading(false);
      return;
    }

    setResult(data.result);
    setActiveTab('analysis');
    setLoading(false);
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied!` });
  };

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">

          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/30 text-accent text-sm font-semibold">
              <Dna className="h-4 w-4" />
              Viral DNA
            </div>
            <h1 className="text-3xl md:text-4xl font-black">
              Decode{' '}
              <span className="text-gradient">Why It Went Viral</span>
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto text-sm leading-relaxed">
              Paste any TikTok/Reels URL or describe a viral video. AI reverse-engineers the exact formula — hook pattern, emotion triggers, pacing, loop mechanics — then builds YOUR version of that viral formula.
            </p>
            <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-full">
              <Zap className="h-3 w-3 text-primary" />
              Costs 3 credits per analysis
            </div>
          </div>

          {/* Form */}
          <div className="glass-card p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="url" className="text-sm font-semibold">
                Video URL <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="url"
                placeholder="https://www.tiktok.com/@creator/video/..."
                value={inputUrl}
                onChange={e => setInputUrl(e.target.value)}
                className="bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-semibold">
                Describe the video / paste the script *
              </Label>
              <Textarea
                id="description"
                placeholder="e.g. A TikTok that starts with 'POV: you're the most intimidating person in the room' then shows someone walking into a meeting and everyone goes quiet. 2.3M views, 400k likes, 50k shares..."
                value={inputDescription}
                onChange={e => setInputDescription(e.target.value)}
                className="bg-background/50 min-h-[100px] resize-none"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Your Niche * <span className="text-muted-foreground font-normal">(for generating your version)</span></Label>
              <Select value={niche} onValueChange={setNiche}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="Select your niche" />
                </SelectTrigger>
                <SelectContent>
                  {NICHES.map(n => (
                    <SelectItem key={n} value={n} className="capitalize">{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={loading}
              className="w-full h-12 text-base font-bold bg-gradient-to-r from-accent to-primary hover:opacity-90"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Extracting Viral DNA...
                </>
              ) : (
                <>
                  <Dna className="mr-2 h-5 w-5" />
                  Analyze Viral DNA
                </>
              )}
            </Button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="glass-card p-8 text-center space-y-4">
              <div className="flex justify-center gap-3">
                {['Fetching content...', 'Extracting patterns...', 'Generating your version...'].map((step, i) => (
                  <div key={i} className="text-xs text-muted-foreground animate-pulse" style={{ animationDelay: `${i * 0.3}s` }}>
                    {step}
                  </div>
                ))}
              </div>
              <div className="h-1 bg-muted/30 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-accent rounded-full animate-pulse w-3/4" />
              </div>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-6">

              {/* Score Hero */}
              <div className="glass-card p-6 flex flex-col sm:flex-row items-center gap-6">
                <ScoreRing score={result.viralScore} />
                <div className="flex-1 space-y-3 w-full">
                  <p className="font-bold text-sm text-muted-foreground uppercase tracking-wide">Viral Score Breakdown</p>
                  <MiniBar value={result.viralScoreBreakdown.hookStrength} label="Hook Strength" />
                  <MiniBar value={result.viralScoreBreakdown.emotionalImpact} label="Emotional Impact" />
                  <MiniBar value={result.viralScoreBreakdown.shareability} label="Shareability" />
                  <MiniBar value={result.viralScoreBreakdown.retentionPotential} label="Retention Potential" />
                  <MiniBar value={result.viralScoreBreakdown.trendAlignment} label="Trend Alignment" />
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 bg-muted/30 p-1 rounded-xl">
                <button
                  onClick={() => setActiveTab('analysis')}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === 'analysis' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  🧬 DNA Analysis
                </button>
                <button
                  onClick={() => setActiveTab('version')}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === 'version' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  ✨ Your Version
                </button>
              </div>

              {activeTab === 'analysis' && (
                <div className="space-y-4">
                  {/* Psychological Formula */}
                  <div className="glass-card p-5 border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
                    <p className="text-xs font-bold text-primary uppercase tracking-wide mb-2">Psychological Formula</p>
                    <p className="font-bold text-sm">{result.psychologicalFormula}</p>
                  </div>

                  {/* Hook Pattern */}
                  <div className="glass-card p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-violet-400" />
                      <p className="font-bold text-sm">Hook Pattern</p>
                      <span className="text-xs bg-violet-500/10 text-violet-400 px-2 py-0.5 rounded-full">{result.hookPattern.type}</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex gap-2"><span className="text-muted-foreground shrink-0">First 2s:</span><span>{result.hookPattern.firstTwoSeconds}</span></div>
                      <div className="flex gap-2"><span className="text-muted-foreground shrink-0">Curiosity Gap:</span><span>{result.hookPattern.curiosityGap}</span></div>
                    </div>
                  </div>

                  {/* Emotion Triggers */}
                  <div className="glass-card p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-red-400" />
                      <p className="font-bold text-sm">Emotion Triggers</p>
                    </div>
                    <div className="space-y-3">
                      {result.emotionTriggers.map((t, i) => (
                        <div key={i}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-semibold">{t.emotion}</span>
                            <span className="text-muted-foreground">{t.moment}</span>
                          </div>
                          <div className="h-2 bg-muted/40 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-red-500 to-pink-400 rounded-full"
                              style={{ width: `${(t.intensity / 10) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pacing + Loop */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="glass-card p-5 space-y-2">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-blue-400" />
                        <p className="font-bold text-sm">Pacing</p>
                        <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full">{result.pacingStructure.rhythm}</span>
                      </div>
                      <ul className="space-y-1">
                        {result.pacingStructure.keyMoments.map((m, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                            <span className="text-primary mt-0.5">•</span>{m}
                          </li>
                        ))}
                      </ul>
                      <p className="text-xs text-muted-foreground pt-1 border-t border-border/30">{result.pacingStructure.retentionTactic}</p>
                    </div>

                    <div className="glass-card p-5 space-y-2">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 text-green-400" />
                        <p className="font-bold text-sm">Loop Mechanic</p>
                        {result.loopMechanic.hasLoop && (
                          <span className="text-xs bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full">Active</span>
                        )}
                      </div>
                      <p className="text-xs font-semibold">{result.loopMechanic.loopType}</p>
                      <p className="text-xs text-muted-foreground">{result.loopMechanic.description}</p>
                    </div>
                  </div>

                  {/* Strengths & Weaknesses */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="glass-card p-5 space-y-2">
                      <p className="font-bold text-sm flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-green-400" />Strengths
                      </p>
                      <ul className="space-y-1.5">
                        {result.strengths.map((s, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                            <span className="text-green-400 mt-0.5">✓</span>{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="glass-card p-5 space-y-2">
                      <p className="font-bold text-sm flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4 text-amber-400" />Weaknesses
                      </p>
                      <ul className="space-y-1.5">
                        {result.weaknesses.map((w, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                            <span className="text-amber-400 mt-0.5">!</span>{w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Target Audience */}
                  <div className="glass-card p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-accent" />
                      <p className="font-bold text-sm">Target Audience</p>
                      <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">{result.targetAudience.age}</span>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3 text-xs">
                      <div><p className="text-muted-foreground mb-0.5">Mindset</p><p>{result.targetAudience.mindset}</p></div>
                      <div><p className="text-muted-foreground mb-0.5">Share Trigger</p><p>{result.targetAudience.shareTrigger}</p></div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'version' && (
                <div className="space-y-4">
                  <div className="glass-card p-4 border border-accent/20 bg-gradient-to-br from-accent/5 to-primary/5 text-center">
                    <p className="text-sm font-bold text-accent">Your version of this viral formula — adapted for <span className="capitalize">{niche}</span></p>
                  </div>

                  {/* Hook */}
                  <div className="glass-card p-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">🔥 Hook</p>
                      <Button size="sm" variant="ghost" onClick={() => copy(result.yourVersion.hook, 'Hook')} className="h-7 gap-1 text-xs">
                        <Copy className="h-3 w-3" />Copy
                      </Button>
                    </div>
                    <p className="font-black text-lg">"{result.yourVersion.hook}"</p>
                  </div>

                  {/* Script */}
                  <div className="glass-card p-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">📝 Script (7-15s)</p>
                      <Button size="sm" variant="ghost" onClick={() => copy(result.yourVersion.script, 'Script')} className="h-7 gap-1 text-xs">
                        <Copy className="h-3 w-3" />Copy
                      </Button>
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{result.yourVersion.script}</p>
                  </div>

                  {/* Caption */}
                  <div className="glass-card p-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">📱 Caption</p>
                      <Button size="sm" variant="ghost" onClick={() => copy(result.yourVersion.caption, 'Caption')} className="h-7 gap-1 text-xs">
                        <Copy className="h-3 w-3" />Copy
                      </Button>
                    </div>
                    <p className="text-sm leading-relaxed">{result.yourVersion.caption}</p>
                  </div>

                  {/* Hashtags */}
                  <div className="glass-card p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">#️⃣ Hashtags</p>
                      <Button size="sm" variant="ghost" onClick={() => copy(result.yourVersion.hashtags.join(' '), 'Hashtags')} className="h-7 gap-1 text-xs">
                        <Copy className="h-3 w-3" />Copy All
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {result.yourVersion.hashtags.map((tag, i) => (
                        <span key={i} className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full cursor-pointer hover:bg-primary/20 transition-colors" onClick={() => copy(tag, tag)}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Visual + Posting Tip */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="glass-card p-5 space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">🎥 Visual Idea</p>
                      <p className="text-sm text-muted-foreground">{result.yourVersion.visualIdea}</p>
                    </div>
                    <div className="glass-card p-5 space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">💡 Posting Tip</p>
                      <p className="text-sm text-muted-foreground">{result.yourVersion.postingTip}</p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => copy(
                      `HOOK:\n${result.yourVersion.hook}\n\nSCRIPT:\n${result.yourVersion.script}\n\nCAPTION:\n${result.yourVersion.caption}\n\nHASHTAGS:\n${result.yourVersion.hashtags.join(' ')}\n\nVISUAL:\n${result.yourVersion.visualIdea}\n\nTIP:\n${result.yourVersion.postingTip}`,
                      'Full content pack'
                    )}
                  >
                    <Share2 className="h-4 w-4" />
                    Copy Full Content Pack
                  </Button>
                </div>
              )}

              {/* Re-analyze */}
              <Button
                variant="outline"
                onClick={handleAnalyze}
                disabled={loading}
                className="w-full gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Re-analyze (3 credits)
              </Button>
            </div>
          )}
        </div>
      </div>

      <BuyCreditsModal open={showBuyCredits} onOpenChange={setShowBuyCredits} />
    </AppLayout>
  );
}
