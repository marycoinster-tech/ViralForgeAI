import { useState, useCallback, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import {
  Hash, Loader2, Copy, Check, TrendingUp, Zap,
  RefreshCw, AlertTriangle, Clock, Target, ArrowUp,
  Sparkles, Globe, BarChart2, History, Trash2
} from 'lucide-react';

const PLATFORMS = ['TikTok', 'Instagram Reels', 'YouTube Shorts', 'All Platforms'];
const NICHES = ['anime', 'motivation', 'money', 'dating', 'gym', 'ai & tech', 'storytime', 'fashion', 'gaming', 'beauty', 'food', 'travel', 'comedy', 'education'];

interface HashtagData {
  tag: string;
  viralScore: number;
  trend: 'RISING' | 'STABLE' | 'DECLINING';
  peakTime: string;
  estimatedViews: string;
  competition: 'LOW' | 'MEDIUM' | 'HIGH';
  category: string;
  reason: string;
}

interface HashtagResult {
  generatedAt: string;
  topic: string;
  platform: string;
  primaryHashtags: HashtagData[];
  nicheHashtags: HashtagData[];
  communityHashtags: HashtagData[];
  avoidHashtags: { tag: string; reason: string }[];
  optimalCount: number;
  bestCombination: string[];
  strategyNote: string;
  trendingContext: string;
}

interface RecentHashtagSet {
  id: string;
  topic: string;
  platform: string;
  bestCombination: string[];
  savedAt: string;
}

const STORAGE_KEY = 'viralforge_recent_hashtags';
const MAX_RECENT = 5;

const TREND_COLORS: Record<string, string> = {
  RISING: 'text-green-400',
  STABLE: 'text-amber-400',
  DECLINING: 'text-red-400',
};

const COMPETITION_COLORS: Record<string, string> = {
  LOW: 'text-green-400 bg-green-500/10 border-green-500/30',
  MEDIUM: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  HIGH: 'text-red-400 bg-red-500/10 border-red-500/30',
};

function ViralBar({ score }: { score: number }) {
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : score >= 40 ? '#3b82f6' : '#ef4444';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-muted/40 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      <span className="text-[10px] font-black w-6 text-right" style={{ color }}>{score}</span>
    </div>
  );
}

function HashtagCard({ data, onCopy, copied }: { data: HashtagData; onCopy: (tag: string) => void; copied: string | null }) {
  const isCopied = copied === data.tag;
  return (
    <div className="p-3 rounded-xl border border-border/40 bg-card/30 hover:bg-card/50 transition-all group space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <span className="text-sm font-black text-primary truncate">#{data.tag}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold shrink-0 ${COMPETITION_COLORS[data.competition] || COMPETITION_COLORS.MEDIUM}`}>
            {data.competition}
          </span>
        </div>
        <button
          onClick={() => onCopy(data.tag)}
          className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-1 rounded hover:bg-muted"
        >
          {isCopied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
        </button>
      </div>

      <ViralBar score={data.viralScore} />

      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1">
          {data.trend === 'RISING' && <ArrowUp className="h-3 w-3 text-green-400" />}
          <span className={`font-semibold ${TREND_COLORS[data.trend] || 'text-muted-foreground'}`}>{data.trend}</span>
        </div>
        <span>{data.estimatedViews}</span>
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>{data.peakTime}</span>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground leading-relaxed">{data.reason}</p>
    </div>
  );
}

function saveToRecent(result: HashtagResult): RecentHashtagSet[] {
  try {
    const existing: RecentHashtagSet[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const newEntry: RecentHashtagSet = {
      id: Date.now().toString(),
      topic: result.topic,
      platform: result.platform,
      bestCombination: result.bestCombination.slice(0, 12),
      savedAt: new Date().toISOString(),
    };
    const filtered = existing.filter(e => !(e.topic === newEntry.topic && e.platform === newEntry.platform));
    const updated = [newEntry, ...filtered].slice(0, MAX_RECENT);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch { return []; }
}

function loadRecent(): RecentHashtagSet[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

export function Hashtags() {
  const { toast } = useToast();
  const [topic, setTopic] = useState('');
  const [platform, setPlatform] = useState('TikTok');
  const [niche, setNiche] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HashtagResult | null>(null);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [activeSection, setActiveSection] = useState<'primary' | 'niche' | 'community'>('primary');
  const [recentSets, setRecentSets] = useState<RecentHashtagSet[]>([]);
  const [copiedRecent, setCopiedRecent] = useState<string | null>(null);

  useEffect(() => {
    setRecentSets(loadRecent());
  }, []);

  const generate = useCallback(async () => {
    if (!topic.trim()) {
      toast({ title: 'Enter a topic first', description: 'Tell us what your content is about', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-insights', {
        body: {
          action: 'hashtag_generator',
          topic: topic.trim(),
          platform,
          niche: niche || undefined,
        },
      });

      if (error) {
        let msg = error.message || 'Generation failed';
        try {
          const ctx = (error as any).context;
          if (ctx && typeof ctx.text === 'function') {
            const txt = await ctx.text();
            if (txt) msg = txt;
          }
        } catch { /**/ }
        toast({ title: 'Failed to generate hashtags', description: msg, variant: 'destructive' });
        return;
      }

      if (data) {
        setResult(data);
        const updated = saveToRecent(data);
        setRecentSets(updated);
      }
    } catch (err: any) {
      console.error('Hashtag generation error:', err);
      toast({ title: 'Error', description: err.message || 'Generation failed', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [topic, platform, niche, toast]);

  const copyTag = (tag: string) => {
    navigator.clipboard.writeText(`#${tag}`);
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 2000);
    toast({ title: `#${tag} copied!` });
  };

  const copyBestCombination = () => {
    if (!result) return;
    const tags = result.bestCombination.map(t => `#${t}`).join(' ');
    navigator.clipboard.writeText(tags);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
    toast({ title: 'Best combination copied!', description: `${result.bestCombination.length} hashtags ready to paste` });
  };

  const copySection = (tags: HashtagData[]) => {
    const text = tags.map(t => `#${t.tag}`).join(' ');
    navigator.clipboard.writeText(text);
    toast({ title: 'Section copied!', description: `${tags.length} hashtags copied` });
  };

  const copyRecentSet = (set: RecentHashtagSet) => {
    const tags = set.bestCombination.map(t => `#${t}`).join(' ');
    navigator.clipboard.writeText(tags);
    setCopiedRecent(set.id);
    setTimeout(() => setCopiedRecent(null), 2000);
    toast({ title: 'Hashtags copied!', description: `${set.bestCombination.length} tags from "${set.topic}"` });
  };

  const loadRecentSet = (set: RecentHashtagSet) => {
    setTopic(set.topic);
    setPlatform(set.platform);
    toast({ title: 'Loaded!', description: 'Topic and platform pre-filled. Hit Generate to refresh.' });
  };

  const deleteRecentSet = (id: string) => {
    const updated = recentSets.filter(s => s.id !== id);
    setRecentSets(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const clearAllRecent = () => {
    setRecentSets([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const currentTags = activeSection === 'primary'
    ? result?.primaryHashtags || []
    : activeSection === 'niche'
    ? result?.nicheHashtags || []
    : result?.communityHashtags || [];

  const formatRelativeTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

          {/* Header */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
              <Hash className="h-3.5 w-3.5" />
              Real-Time Analysis · June 2026
            </div>
            <h1 className="text-2xl md:text-3xl font-black">
              <span className="text-gradient">Hashtag</span> Intelligence
            </h1>
            <p className="text-sm text-muted-foreground">
              AI analyzes trending hashtags right now — across TikTok, Instagram, YouTube — and picks the ones that will spike views for your specific topic.
            </p>
          </div>

          {/* Input Section */}
          <div className="glass-card p-5 space-y-4">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Your Content Topic *</label>
                <div className="relative">
                  <Sparkles className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="e.g. gym motivation, how I made $5k with AI, dark anime moments..."
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') generate(); }}
                    className="pl-10 h-11 bg-background/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Platform</label>
                  <Select value={platform} onValueChange={setPlatform}>
                    <SelectTrigger className="h-10 bg-background/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Niche (optional)</label>
                  <Select value={niche} onValueChange={setNiche}>
                    <SelectTrigger className="h-10 bg-background/50"><SelectValue placeholder="All niches" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All niches</SelectItem>
                      {NICHES.map(n => <SelectItem key={n} value={n} className="capitalize">{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Button
              onClick={generate}
              disabled={loading || !topic.trim()}
              className="w-full h-11 gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 font-bold text-sm"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Hash className="h-4 w-4" />}
              {loading ? 'Analyzing trends...' : 'Generate Trending Hashtags'}
            </Button>
          </div>

          {/* Recently Used */}
          {recentSets.length > 0 && !result && !loading && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-bold text-muted-foreground">Recently Used</h2>
                  <span className="text-[10px] bg-muted/40 text-muted-foreground px-2 py-0.5 rounded-full">
                    {recentSets.length}/{MAX_RECENT}
                  </span>
                </div>
                <button
                  onClick={clearAllRecent}
                  className="text-[11px] text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" />
                  Clear all
                </button>
              </div>

              <div className="space-y-2">
                {recentSets.map(set => (
                  <div key={set.id} className="glass-card p-3 border border-border/40 hover:border-primary/20 transition-all group">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold truncate">{set.topic}</span>
                          <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20 shrink-0">{set.platform}</span>
                          <span className="text-[10px] text-muted-foreground shrink-0">{formatRelativeTime(set.savedAt)}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {set.bestCombination.slice(0, 6).map(tag => (
                            <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-muted/40 text-muted-foreground border border-border/30 font-mono">#{tag}</span>
                          ))}
                          {set.bestCombination.length > 6 && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted/40 text-muted-foreground border border-border/30">+{set.bestCombination.length - 6} more</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => loadRecentSet(set)} className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors" title="Load this topic">
                          <RefreshCw className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => copyRecentSet(set)} className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors" title="Copy all hashtags">
                          {copiedRecent === set.id ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                        <button onClick={() => deleteRecentSet(set.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Remove">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="glass-card p-10 text-center space-y-4">
              <div className="relative mx-auto w-12 h-12">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <div className="absolute inset-0 rounded-full bg-primary/20 blur-lg animate-pulse" />
              </div>
              <div>
                <p className="font-bold">Scanning platform trends...</p>
                <p className="text-sm text-muted-foreground mt-1">Analyzing TikTok, Instagram, YouTube signals for June 2026</p>
              </div>
              <div className="flex justify-center gap-6 text-xs text-muted-foreground">
                {['Checking virality scores', 'Measuring competition', 'Timing analysis'].map((step, i) => (
                  <div key={i} className="flex items-center gap-1.5 animate-pulse" style={{ animationDelay: `${i * 200}ms` }}>
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {step}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          {result && !loading && (
            <div className="space-y-5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5" />
                  <span>Analyzed for: <strong className="text-foreground">{result.topic}</strong> on {result.platform}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={generate} disabled={loading} className="gap-1.5 h-7 text-xs">
                  <RefreshCw className="h-3 w-3" />
                  Refresh
                </Button>
              </div>

              {/* Trending Context */}
              <div className="glass-card p-4 border border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5 space-y-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <p className="text-xs font-bold text-primary uppercase tracking-wide">Platform Trend Context · Right Now</p>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{result.trendingContext}</p>
              </div>

              {/* Best Combination */}
              <div className="glass-card p-5 border border-accent/20 bg-gradient-to-br from-accent/5 to-primary/5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="h-4 w-4 text-accent" />
                      <p className="font-bold text-sm">Best Combination</p>
                      <span className="text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded-full font-bold border border-accent/20">
                        {result.bestCombination.length} tags · optimal mix
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{result.strategyNote}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {result.bestCombination.map(tag => (
                    <span
                      key={tag}
                      className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20 hover:bg-primary/20 transition-colors cursor-pointer"
                      onClick={() => copyTag(tag)}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button onClick={copyBestCombination} className="flex-1 gap-2 h-10 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-sm font-bold">
                    {copiedAll ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copiedAll ? 'Copied!' : 'Copy All Hashtags'}
                  </Button>
                  <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted/30 text-xs text-muted-foreground">
                    <Target className="h-3.5 w-3.5 text-primary" />
                    <span>Optimal: <strong className="text-foreground">{result.optimalCount}</strong></span>
                  </div>
                </div>
              </div>

              {/* Avoid Hashtags */}
              {result.avoidHashtags?.length > 0 && (
                <div className="glass-card p-4 border border-red-500/20 bg-red-500/5 space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    <p className="text-sm font-bold text-red-400">Avoid These — Oversaturated Right Now</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.avoidHashtags.map((h, i) => (
                      <div key={i} className="text-xs bg-red-500/10 text-red-300 px-3 py-1.5 rounded-full border border-red-500/20" title={h.reason}>
                        ⚠️ #{h.tag}
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1">
                    {result.avoidHashtags.map((h, i) => (
                      <p key={i} className="text-[11px] text-red-300/70">#{h.tag} — {h.reason}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Section Tabs */}
              <div className="space-y-4">
                <div className="flex gap-1.5 bg-muted/30 p-1 rounded-xl">
                  {(['primary', 'niche', 'community'] as const).map(section => {
                    const labels: Record<string, string> = { primary: '🔥 Primary', niche: '🎯 Niche', community: '👥 Community' };
                    const counts: Record<string, number> = {
                      primary: result.primaryHashtags?.length || 0,
                      niche: result.nicheHashtags?.length || 0,
                      community: result.communityHashtags?.length || 0,
                    };
                    return (
                      <button
                        key={section}
                        onClick={() => setActiveSection(section)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                          activeSection === section ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {labels[section]}
                        <span className={`text-[10px] px-1 py-0.5 rounded ${activeSection === section ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                          {counts[section]}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="px-1">
                  {activeSection === 'primary' && <p className="text-xs text-muted-foreground">High-reach hashtags trending right now — maximum exposure but higher competition.</p>}
                  {activeSection === 'niche' && <p className="text-xs text-muted-foreground">Targeted niche hashtags with lower competition — your content shows up to the right audience.</p>}
                  {activeSection === 'community' && <p className="text-xs text-muted-foreground">Community and challenge hashtags driving engagement loops — great for saves and shares.</p>}
                </div>

                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => copySection(currentTags)} className="gap-1.5 h-8 text-xs border-primary/20 hover:bg-primary/10">
                    <Copy className="h-3 w-3" />
                    Copy section
                  </Button>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  {currentTags.map(tag => (
                    <HashtagCard key={tag.tag} data={tag} onCopy={copyTag} copied={copiedTag} />
                  ))}
                </div>
              </div>

              {/* Legend */}
              <div className="glass-card p-4 space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <BarChart2 className="h-3.5 w-3.5" />
                  Reading the scores
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-muted-foreground">
                  <div><span className="font-bold text-foreground">Viral Score</span><br />Predicted view spike potential (0-100)</div>
                  <div><span className="text-green-400 font-bold">LOW competition</span><br />Your content will show up easily</div>
                  <div><span className="text-amber-400 font-bold">MEDIUM competition</span><br />High engagement, moderate reach</div>
                  <div><span className="text-green-400 font-bold">RISING trend</span><br />Use NOW before saturation</div>
                </div>
              </div>

              {/* Previously generated */}
              {recentSets.length > 1 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <History className="h-4 w-4 text-muted-foreground" />
                      <h2 className="text-sm font-bold text-muted-foreground">Previously Generated</h2>
                    </div>
                    <button onClick={clearAllRecent} className="text-[11px] text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1">
                      <Trash2 className="h-3 w-3" />
                      Clear
                    </button>
                  </div>
                  <div className="space-y-2">
                    {recentSets.filter(s => !(s.topic === result.topic && s.platform === result.platform)).map(set => (
                      <div key={set.id} className="glass-card p-3 border border-border/40 hover:border-primary/20 transition-all">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold truncate">{set.topic}</span>
                              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20 shrink-0">{set.platform}</span>
                              <span className="text-[10px] text-muted-foreground shrink-0">{formatRelativeTime(set.savedAt)}</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {set.bestCombination.slice(0, 5).map(tag => (
                                <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-muted/40 text-muted-foreground font-mono">#{tag}</span>
                              ))}
                              {set.bestCombination.length > 5 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/40 text-muted-foreground">+{set.bestCombination.length - 5}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => loadRecentSet(set)} className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors">
                              <RefreshCw className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => copyRecentSet(set)} className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors">
                              {copiedRecent === set.id ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                            <button onClick={() => deleteRecentSet(set.id)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!result && !loading && recentSets.length === 0 && (
            <div className="glass-card p-12 text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-4 rounded-full bg-primary/10 relative">
                  <Hash className="h-8 w-8 text-primary" />
                  <div className="absolute inset-0 rounded-full bg-primary/20 blur-lg" />
                </div>
              </div>
              <div>
                <h3 className="font-bold text-lg mb-2">Stop guessing hashtags</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  AI scans real platform trends as of June 2026 and picks the exact hashtags that will spike views for your specific content.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto text-xs text-muted-foreground">
                <div className="p-2.5 rounded-lg bg-muted/30 border border-border/30">
                  <TrendingUp className="h-4 w-4 text-green-400 mx-auto mb-1" />
                  Viral score per tag
                </div>
                <div className="p-2.5 rounded-lg bg-muted/30 border border-border/30">
                  <Target className="h-4 w-4 text-primary mx-auto mb-1" />
                  Competition analysis
                </div>
                <div className="p-2.5 rounded-lg bg-muted/30 border border-border/30">
                  <Clock className="h-4 w-4 text-accent mx-auto mb-1" />
                  Peak posting times
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
