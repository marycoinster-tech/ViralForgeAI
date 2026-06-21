import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import {
  X, Hash, TrendingUp, Loader2, Copy, Check, ArrowUp,
  Clock, Target, RefreshCw, AlertTriangle, Flame,
  ChevronRight, Zap, Swords, Sparkles
} from 'lucide-react';

const PLATFORMS = ['TikTok', 'Instagram Reels', 'YouTube Shorts', 'All Platforms'];
const NICHES = ['anime', 'motivation', 'money', 'dating', 'gym', 'ai & tech', 'storytime', 'fashion', 'gaming', 'beauty', 'food', 'travel'];
const TREND_PLATFORMS = ['TikTok', 'Instagram Reels', 'YouTube Shorts'];

// ── Types ────────────────────────────────────────────────────────────────────

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
  topic: string;
  platform: string;
  primaryHashtags: HashtagData[];
  nicheHashtags: HashtagData[];
  communityHashtags: HashtagData[];
  avoidHashtags: { tag: string; reason: string }[];
  bestCombination: string[];
  optimalCount: number;
  strategyNote: string;
  trendingContext: string;
}

interface TrendSignal {
  id: string;
  title: string;
  description: string;
  niche: string;
  heatScore: number;
  saturationRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  windowDays: number;
  hookAngle: string;
  exampleHook: string;
  format: string;
  why: string;
}

interface TrendsData {
  generatedAt: string;
  trends: TrendSignal[];
  warningTrends: { trend: string; reason: string }[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const COMPETITION_COLORS: Record<string, string> = {
  LOW: 'text-green-400 bg-green-500/10 border-green-500/30',
  MEDIUM: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  HIGH: 'text-red-400 bg-red-500/10 border-red-500/30',
};

const SATURATION_COLORS: Record<string, string> = {
  LOW: 'text-green-400 bg-green-500/10 border-green-500/30',
  MEDIUM: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  HIGH: 'text-red-400 bg-red-500/10 border-red-500/30',
};

async function invokeInsights(action: string, params: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('generate-insights', {
    body: { action, ...params },
  });
  if (error) {
    let msg = error.message || 'Request failed';
    try {
      const ctx = (error as any).context;
      if (ctx && typeof ctx.text === 'function') {
        const txt = await ctx.text();
        if (txt) msg = txt;
      }
    } catch { /**/ }
    throw new Error(msg);
  }
  return data;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SmallViralBar({ score }: { score: number }) {
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#3b82f6';
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1 bg-muted/40 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      <span className="text-[10px] font-black w-5" style={{ color }}>{score}</span>
    </div>
  );
}

// ── Hashtag Tab ───────────────────────────────────────────────────────────────

function HashtagTab() {
  const { toast } = useToast();
  const [topic, setTopic] = useState('');
  const [platform, setPlatform] = useState('TikTok');
  const [niche, setNiche] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HashtagResult | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'primary' | 'niche' | 'community'>('primary');

  const generate = useCallback(async () => {
    if (!topic.trim()) {
      toast({ title: 'Enter a topic first', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const data = await invokeInsights('hashtag_generator', {
        topic: topic.trim(), platform, niche: niche || undefined,
      });
      setResult(data);
    } catch (err: any) {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [topic, platform, niche, toast]);

  const copyAll = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.bestCombination.map(t => `#${t}`).join(' '));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
    toast({ title: `${result.bestCombination.length} hashtags copied!` });
  };

  const copyTag = (tag: string) => {
    navigator.clipboard.writeText(`#${tag}`);
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 1500);
  };

  const currentTags = activeSection === 'primary'
    ? result?.primaryHashtags || []
    : activeSection === 'niche'
    ? result?.nicheHashtags || []
    : result?.communityHashtags || [];

  return (
    <div className="space-y-4">
      {/* Input */}
      <div className="space-y-2.5">
        <div className="relative">
          <Sparkles className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Your content topic..."
            value={topic}
            onChange={e => setTopic(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') generate(); }}
            className="pl-9 h-10 bg-background/50 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger className="h-9 text-xs bg-background/50"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PLATFORMS.map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={niche} onValueChange={setNiche}>
            <SelectTrigger className="h-9 text-xs bg-background/50"><SelectValue placeholder="All niches" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="" className="text-xs">All niches</SelectItem>
              {NICHES.map(n => <SelectItem key={n} value={n} className="text-xs capitalize">{n}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={generate}
          disabled={loading || !topic.trim()}
          className="w-full h-9 gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-sm font-bold"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Hash className="h-3.5 w-3.5" />}
          {loading ? 'Analyzing trends...' : 'Generate Hashtags'}
        </Button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-6 space-y-2">
          <Loader2 className="h-6 w-6 text-primary animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground">Scanning platform signals...</p>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-3">
          {/* Context */}
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground leading-relaxed">
            {result.trendingContext}
          </div>

          {/* Best combination */}
          <div className="p-3 rounded-lg bg-gradient-to-br from-accent/5 to-primary/5 border border-accent/20 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-accent" />
                <span className="text-xs font-bold">Best combo · {result.bestCombination.length} tags</span>
              </div>
              <Button onClick={copyAll} size="sm" className="h-7 text-[11px] gap-1 bg-gradient-to-r from-primary to-accent hover:opacity-90">
                {copiedAll ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copiedAll ? 'Copied!' : 'Copy all'}
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {result.bestCombination.map(tag => (
                <span key={tag} onClick={() => copyTag(tag)}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold cursor-pointer hover:bg-primary/20 transition-colors">
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          {/* Avoid */}
          {result.avoidHashtags?.length > 0 && (
            <div className="p-2.5 rounded-lg bg-red-500/5 border border-red-500/20 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                <span className="text-[11px] font-bold text-red-400">Avoid these</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.avoidHashtags.map((h, i) => (
                  <span key={i} title={h.reason} className="text-[11px] bg-red-500/10 text-red-300 px-2 py-0.5 rounded-full border border-red-500/20">
                    ⚠️ #{h.tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Section tabs */}
          <div className="flex gap-1 bg-muted/30 p-0.5 rounded-lg">
            {(['primary', 'niche', 'community'] as const).map(s => {
              const icons: Record<string, string> = { primary: '🔥', niche: '🎯', community: '👥' };
              const counts: Record<string, number> = {
                primary: result.primaryHashtags?.length || 0,
                niche: result.nicheHashtags?.length || 0,
                community: result.communityHashtags?.length || 0,
              };
              return (
                <button key={s} onClick={() => setActiveSection(s)}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                    activeSection === s ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                  }`}>
                  {icons[s]} {s} <span className="text-[10px] text-muted-foreground">({counts[s]})</span>
                </button>
              );
            })}
          </div>

          <div className="space-y-2">
            {currentTags.map(tag => (
              <div key={tag.tag}
                className="p-2.5 rounded-lg border border-border/40 bg-card/30 hover:bg-card/50 transition-all group cursor-pointer space-y-1.5"
                onClick={() => copyTag(tag.tag)}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm font-black text-primary truncate">#{tag.tag}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold shrink-0 ${COMPETITION_COLORS[tag.competition] || ''}`}>
                      {tag.competition}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {copiedTag === tag.tag ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                  </div>
                </div>
                <SmallViralBar score={tag.viralScore} />
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <div className="flex items-center gap-1">
                    {tag.trend === 'RISING' && <ArrowUp className="h-2.5 w-2.5 text-green-400" />}
                    <span className={tag.trend === 'RISING' ? 'text-green-400 font-semibold' : tag.trend === 'DECLINING' ? 'text-red-400 font-semibold' : 'text-amber-400 font-semibold'}>
                      {tag.trend}
                    </span>
                  </div>
                  <span>{tag.estimatedViews}</span>
                  <div className="flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5" />
                    <span>{tag.peakTime}</span>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">{tag.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty */}
      {!result && !loading && (
        <div className="text-center py-8 space-y-2">
          <Hash className="h-8 w-8 text-primary/40 mx-auto" />
          <p className="text-sm text-muted-foreground">Enter a topic to get trending hashtags with viral scores, competition analysis, and peak posting times.</p>
        </div>
      )}
    </div>
  );
}

// ── Trends Tab ────────────────────────────────────────────────────────────────

function TrendsTab() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [niche, setNiche] = useState('');
  const [platform, setPlatform] = useState('TikTok');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TrendsData | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const scan = useCallback(async () => {
    setLoading(true);
    setData(null);
    try {
      const result = await invokeInsights('trend_signals', { niche: niche || undefined, platform });
      setData(result);
    } catch (err: any) {
      toast({ title: 'Failed to load trends', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [niche, platform, toast]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Select value={niche} onValueChange={setNiche}>
            <SelectTrigger className="h-9 text-xs bg-background/50"><SelectValue placeholder="All niches" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="" className="text-xs">All niches</SelectItem>
              {NICHES.map(n => <SelectItem key={n} value={n} className="text-xs capitalize">{n}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger className="h-9 text-xs bg-background/50"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TREND_PLATFORMS.map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={scan}
          disabled={loading}
          className="w-full h-9 gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-sm font-bold"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <TrendingUp className="h-3.5 w-3.5" />}
          {loading ? 'Scanning...' : 'Scan Trends Now'}
        </Button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-6 space-y-2">
          <Loader2 className="h-6 w-6 text-primary animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground">Analyzing platform signals...</p>
        </div>
      )}

      {/* Results */}
      {data && !loading && (
        <div className="space-y-3">
          {/* Refresh row */}
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{data.trends?.length} trends detected</span>
            <button onClick={scan} className="flex items-center gap-1 hover:text-foreground transition-colors">
              <RefreshCw className="h-3 w-3" />Refresh
            </button>
          </div>

          {/* Warnings */}
          {data.warningTrends?.length > 0 && (
            <div className="p-2.5 rounded-lg bg-red-500/5 border border-red-500/20 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                <span className="text-[11px] font-bold text-red-400">Avoid these saturated trends</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {data.warningTrends.map((w, i) => (
                  <span key={i} title={w.reason} className="text-[11px] bg-red-500/10 text-red-300 px-2 py-0.5 rounded-full border border-red-500/20">
                    ⚠️ {w.trend}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Trend cards */}
          <div className="space-y-2">
            {data.trends?.map(trend => {
              const isExpanded = expandedId === trend.id;
              return (
                <div key={trend.id} className="rounded-xl border border-border/40 bg-card/30 overflow-hidden">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : trend.id)}
                    className="w-full text-left p-3 hover:bg-muted/10 transition-colors"
                  >
                    <div className="flex items-start gap-2.5">
                      <Flame className={`h-4 w-4 mt-0.5 shrink-0 ${trend.heatScore >= 80 ? 'text-red-400' : trend.heatScore >= 60 ? 'text-amber-400' : 'text-blue-400'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-sm font-bold leading-tight">{trend.title}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold shrink-0 ${SATURATION_COLORS[trend.saturationRisk] || ''}`}>
                            {trend.saturationRisk}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span className="capitalize">{trend.niche}</span>
                          <span>·</span>
                          <span className={`font-semibold ${trend.windowDays <= 7 ? 'text-red-400' : trend.windowDays <= 14 ? 'text-amber-400' : 'text-green-400'}`}>
                            ~{trend.windowDays}d left
                          </span>
                          <span>·</span>
                          <span className="font-bold text-foreground">🔥 {trend.heatScore}</span>
                        </div>
                      </div>
                      <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-2.5 border-t border-border/30 pt-2.5">
                      <p className="text-xs text-muted-foreground leading-relaxed">{trend.description}</p>

                      <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/20">
                        <p className="text-[10px] text-primary font-bold uppercase mb-1">Why now</p>
                        <p className="text-xs">{trend.why}</p>
                      </div>

                      <div className="p-2.5 rounded-lg bg-accent/5 border border-accent/20">
                        <p className="text-[10px] text-accent font-bold uppercase mb-1">Example hook</p>
                        <p className="text-sm font-black">"{trend.exampleHook}"</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          className="h-8 text-[11px] gap-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
                          onClick={() => navigate('/app/hook-battle', { state: { prefilledNiche: trend.niche } })}
                        >
                          <Swords className="h-3 w-3" />
                          Hook Battle
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-[11px] gap-1"
                          onClick={() => navigate('/app', { state: { prefilledNiche: trend.niche } })}
                        >
                          <Zap className="h-3 w-3" />
                          Generate
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty */}
      {!data && !loading && (
        <div className="text-center py-8 space-y-2">
          <TrendingUp className="h-8 w-8 text-primary/40 mx-auto" />
          <p className="text-sm text-muted-foreground">AI scans platform patterns and seasonal signals to surface emerging trends before they peak.</p>
        </div>
      )}
    </div>
  );
}

// ── Main ToolsPanel ───────────────────────────────────────────────────────────

interface ToolsPanelProps {
  onClose: () => void;
}

export function ToolsPanel({ onClose }: ToolsPanelProps) {
  const [activeTab, setActiveTab] = useState<'hashtags' | 'trends'>('hashtags');

  return (
    <div className="fixed inset-0 z-50 flex justify-end pointer-events-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 pointer-events-auto"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-sm h-full bg-background border-l border-border/40 flex flex-col shadow-2xl pointer-events-auto animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-bold text-sm">Creator Tools</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/30 p-1 mx-4 mt-3 rounded-xl shrink-0">
          <button
            onClick={() => setActiveTab('hashtags')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'hashtags' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Hash className="h-3.5 w-3.5" />
            Hashtag Intel
          </button>
          <button
            onClick={() => setActiveTab('trends')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'trends' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Trend Signals
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {activeTab === 'hashtags' ? <HashtagTab /> : <TrendsTab />}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border/40 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Target className="h-3 w-3 text-primary" />
            <span>Powered by real-time AI analysis · June 2026</span>
          </div>
        </div>
      </div>
    </div>
  );
}
