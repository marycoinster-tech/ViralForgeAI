
import { useState, useEffect, useCallback } from 'react'; // Added useCallback
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

import {
  TrendingUp, BarChart3, Flame, Loader2, RefreshCw,
  AlertTriangle, ChevronRight, Swords, Zap, Clock,
  Target, Brain, ArrowUp, ArrowDown, Minus,
  Lightbulb, Radio
} from 'lucide-react';

const NICHES = ['anime', 'motivation', 'money', 'dating', 'gym', 'ai & tech', 'storytime', 'fashion', 'gaming', 'beauty', 'food', 'travel'];
const PLATFORMS = ['TikTok', 'Instagram Reels', 'YouTube Shorts'];

const SATURATION_COLORS: Record<string, string> = {
  LOW: 'text-green-400 bg-green-500/10 border-green-500/30',
  MEDIUM: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  HIGH: 'text-red-400 bg-red-500/10 border-red-500/30',
};

const TREND_MOMENTUM_COLORS: Record<string, string> = {
  RISING: 'text-green-400',
  STABLE: 'text-amber-400',
  DECLINING: 'text-red-400',
};

const ADOPTION_COLORS: Record<string, string> = {
  EARLY: 'bg-green-500/10 text-green-400 border-green-500/30',
  GROWING: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  MAINSTREAM: 'bg-muted/40 text-muted-foreground border-border/40',
};

interface TrendSignal {
  id: string;
  title: string;
  description: string;
  niche: string;
  platform: string;
  heatScore: number;
  saturationRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  windowDays: number;
  hookAngle: string;
  contentIdea: string;
  exampleHook: string;
  format: string;
  why: string;
  audienceAge: string;
  timing: string;
}

interface EmergingFormat {
  format: string;
  description: string;
  platform: string;
  adoptionStage: 'EARLY' | 'GROWING' | 'MAINSTREAM';
}

interface TrendsData {
  generatedAt: string;
  trends: TrendSignal[];
  emergingFormats: EmergingFormat[];
  warningTrends: { trend: string; reason: string }[];
}

interface AnalyticsData {
  performancePredictions: {
    format: string;
    formatIcon: string;
    predictedReach: string;
    confidence: number;
    reason: string;
    bestFor: string[];
    viralScore: number;
    effortLevel: string;
    recommendation: string;
  }[];
  postingTimeAnalysis: {
    currentPattern: string;
    optimalTime: string;
    optimalDays: string[];
    potentialReachIncrease: string;
    reasoning: string;
  };
  nicheMomentumScore: {
    score: number;
    trend: string;
    reasoning: string;
    competitors: string;
    opportunity: string;
  };
  consistencyInsight: {
    currentRate: number;
    targetRate: number;
    impact: string;
    weeklyGoal: string;
  };
  contentGaps: { gap: string; opportunity: string; estimatedImpact: string }[];
  growthProjection: {
    currentTrajectory: string;
    thirtyDayGoal: string;
    keyLever: string;
    warningSign: string | null;
  };
  aiInsight: string;
  realStats: {
    totalGenerations: number;
    totalScheduled: number;
    postedCount: number;
    consistencyScore: number;
    topNiche: string;
    topPlatform: string;
    topHour: string;
    accountAgeDays: number;
    creditsRemaining: number;
  };
}

function HeatBar({ score }: { score: number }) {
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted/40 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-black w-8 text-right" style={{ color }}>{score}</span>
    </div>
  );
}

function ConfidenceRing({ value, label }: { value: number; label: string }) {
  const color = value >= 75 ? '#22c55e' : value >= 50 ? '#f59e0b' : '#ef4444';
  const r = 22;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative inline-flex items-center justify-center">
        <svg width="60" height="60" className="-rotate-90">
          <circle cx="30" cy="30" r={r} fill="none" stroke="currentColor" strokeWidth="5" className="text-muted/30" />
          <circle cx="30" cy="30" r={r} fill="none" stroke={color} strokeWidth="5"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
        </svg>
        <span className="absolute text-xs font-black" style={{ color }}>{value}</span>
      </div>
      <span className="text-[10px] text-muted-foreground text-center leading-tight">{label}</span>
    </div>
  );
}

export function Insights() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'trends' | 'analytics'>('trends');
  const [niche, setNiche] = useState('');
  const [platform, setPlatform] = useState('TikTok');
  const [trendsData, setTrendsData] = useState<TrendsData | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [expandedTrend, setExpandedTrend] = useState<string | null>(null);
  const [userTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);

  const loadTrends = useCallback(async () => { // Wrapped in useCallback
    setLoadingTrends(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-insights', {
        body: { action: 'trend_signals', niche: niche || undefined, platform },
      });
      if (error) {
        let msg = error.message;
        try {
          // Changed `(error as any).context?.text()` to `await (error as any).context?.text()`
          const text = await (error as any).context?.text();
          if (text) msg = text;
        } catch { /**/ }
        toast({ title: 'Failed to load trends', description: msg, variant: 'destructive' });
      } else if (data) {
        setTrendsData(data);
      }
    } catch (err: any) {
      console.error('loadTrends error:', err);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoadingTrends(false);
    }
  }, [niche, platform, toast]); // Added dependencies

  const loadAnalytics = useCallback(async () => { // Wrapped in useCallback
    setLoadingAnalytics(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-insights', {
        body: { action: 'predictive_analytics', niche: niche || undefined, timezone: userTimezone },
      });
      if (error) {
        let msg = error.message;
        try {
          // Changed `(error as any).context?.text()` to `await (error as any).context?.text()`
          const text = await (error as any).context?.text();
          if (text) msg = text;
        } catch { /**/ }
        toast({ title: 'Failed to load analytics', description: msg, variant: 'destructive' });
      } else if (data) {
        setAnalyticsData(data);
      }
    } catch (err: any) {
      console.error('loadAnalytics error:', err);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoadingAnalytics(false);
    }
  }, [niche, userTimezone, toast]); // Added dependencies

  // Auto-load analytics when switching to that tab
  useEffect(() => {
    if (activeTab === 'analytics' && !analyticsData && !loadingAnalytics) {
      loadAnalytics();
    }
  }, [activeTab, analyticsData, loadingAnalytics, loadAnalytics]); // Corrected dependencies for useEffect

  const handleTabChange = (tab: 'trends' | 'analytics') => {
    setActiveTab(tab);
    if (tab === 'analytics' && !analyticsData) loadAnalytics();
  };

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

          {/* Header */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
              <Radio className="h-3.5 w-3.5" />
              Live Insights
            </div>
            <h1 className="text-2xl md:text-3xl font-black">
              <span className="text-gradient">Intelligence</span> Hub
            </h1>
            <p className="text-sm text-muted-foreground">
              AI-powered trend signals and performance predictions — based on real platform patterns and your actual data.
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex gap-2 bg-muted/30 p-1 rounded-xl">
            <button
              onClick={() => handleTabChange('trends')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'trends' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              Trend Signals
            </button>
            <button
              onClick={() => handleTabChange('analytics')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'analytics' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              Predictive Analytics
            </button>
          </div>

          {/* ── TRENDS TAB ─────────────────────────────────────────────── */}
          {activeTab === 'trends' && (
            <div className="space-y-5">
              {/* Controls */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={niche} onValueChange={setNiche}>
                  <SelectTrigger className="bg-background/50 sm:w-44">
                    <SelectValue placeholder="All niches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All niches</SelectItem>
                    {NICHES.map(n => <SelectItem key={n} value={n} className="capitalize">{n}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger className="bg-background/50 sm:w-52">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button
                  onClick={loadTrends}
                  disabled={loadingTrends}
                  className="gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 sm:ml-auto"
                >
                  {loadingTrends ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
                  {loadingTrends ? 'Scanning...' : 'Scan Trends'}
                </Button>
              </div>

              {/* Empty state */}
              {!trendsData && !loadingTrends && (
                <div className="glass-card p-12 text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="p-4 rounded-full bg-primary/10">
                      <TrendingUp className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">Real-Time Trend Detection</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                      AI scans platform patterns, seasonal signals, and cultural moments to surface emerging trends before they're saturated. Select your niche and scan now.
                    </p>
                  </div>
                  <Button onClick={loadTrends} disabled={loadingTrends} className="gap-2">
                    <Radio className="h-4 w-4" />
                    Start Scanning
                  </Button>
                </div>
              )}

              {/* Loading */}
              {loadingTrends && (
                <div className="glass-card p-10 text-center space-y-4">
                  <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto" />
                  <div>
                    <p className="font-semibold">Scanning platform signals...</p>
                    <p className="text-sm text-muted-foreground">Analyzing trends, seasonal patterns, and cultural moments in real-time</p>
                  </div>
                </div>
              )}

              {/* Results */}
              {trendsData && !loadingTrends && (
                <div className="space-y-5">
                  {/* Meta */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Last scanned: {new Date(trendsData.generatedAt).toLocaleString()}</span>
                    <Button variant="ghost" size="sm" onClick={loadTrends} className="gap-1.5 h-7 text-xs">
                      <RefreshCw className="h-3 w-3" />
                      Refresh
                    </Button>
                  </div>

                  {/* Warning trends */}
                  {trendsData.warningTrends?.length > 0 && (
                    <div className="glass-card p-4 border border-red-500/20 bg-red-500/5">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="h-4 w-4 text-red-400" />
                        <p className="text-sm font-bold text-red-400">Avoid These Saturated Trends</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {trendsData.warningTrends.map((w, i) => (
                          <div key={i} className="text-xs bg-red-500/10 text-red-300 px-3 py-1.5 rounded-full border border-red-500/20" title={w.reason}>
                            ⚠️ {w.trend}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Emerging formats */}
                  {trendsData.emergingFormats?.length > 0 && (
                    <div className="glass-card p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-primary" />
                        <p className="text-sm font-bold">Emerging Formats Right Now</p>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {trendsData.emergingFormats.map((f, i) => (
                          <div key={i} className="p-3 rounded-lg bg-muted/30 border border-border/30 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold">{f.format}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${ADOPTION_COLORS[f.adoptionStage]}`}>
                                {f.adoptionStage}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">{f.description}</p>
                            <p className="text-[10px] text-muted-foreground">{f.platform}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Trend cards */}
                  <div className="space-y-3">
                    <h2 className="font-bold text-sm text-muted-foreground uppercase tracking-wide">
                      {trendsData.trends?.length} Rising Trends · Act Before They Peak
                    </h2>
                    {trendsData.trends?.map((trend) => {
                      const isExpanded = expandedTrend === trend.id;
                      return (
                        <div
                          key={trend.id}
                          className="glass-card border border-border/40 overflow-hidden"
                        >
                          {/* Card header */}
                          <button
                            onClick={() => setExpandedTrend(isExpanded ? null : trend.id)}
                            className="w-full text-left p-4 hover:bg-muted/10 transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5 shrink-0">
                                <Flame className={`h-5 w-5 ${trend.heatScore >= 80 ? 'text-red-400' : trend.heatScore >= 60 ? 'text-amber-400' : 'text-blue-400'}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <p className="font-bold text-sm leading-tight">{trend.title}</p>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${SATURATION_COLORS[trend.saturationRisk]}`}>
                                      {trend.saturationRisk} risk
                                    </span>
                                  </div>
                                </div>
                                <HeatBar score={trend.heatScore} />
                                <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                                  <span className="capitalize">{trend.niche}</span>
                                  <span>·</span>
                                  <span>{trend.platform}</span>
                                  <span>·</span>
                                  <span className={`font-semibold ${trend.windowDays <= 7 ? 'text-red-400' : trend.windowDays <= 14 ? 'text-amber-400' : 'text-green-400'}`}>
                                    ~{trend.windowDays}d window
                                  </span>
                                </div>
                              </div>
                              <ChevronRight className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                            </div>
                          </button>

                          {/* Expanded content */}
                          {isExpanded && (
                            <div className="px-4 pb-4 space-y-4 border-t border-border/30 pt-4">
                              <p className="text-sm text-muted-foreground leading-relaxed">{trend.description}</p>

                              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-1">
                                <p className="text-[10px] text-primary font-bold uppercase tracking-wide">Why Now</p>
                                <p className="text-xs">{trend.why}</p>
                              </div>

                              <div className="grid sm:grid-cols-2 gap-3">
                                <div className="p-3 rounded-lg bg-muted/30 border border-border/30 space-y-1">
                                  <p className="text-[10px] text-muted-foreground font-bold uppercase">Hook Angle</p>
                                  <p className="text-xs">{trend.hookAngle}</p>
                                </div>
                                <div className="p-3 rounded-lg bg-muted/30 border border-border/30 space-y-1">
                                  <p className="text-[10px] text-muted-foreground font-bold uppercase">Best Format</p>
                                  <p className="text-xs">{trend.format}</p>
                                </div>
                              </div>

                              <div className="p-3 rounded-lg bg-accent/5 border border-accent/20 space-y-1">
                                <p className="text-[10px] text-accent font-bold uppercase tracking-wide">Example Hook</p>
                                <p className="text-sm font-black">"{trend.exampleHook}"</p>
                              </div>

                              <div className="p-3 rounded-lg bg-muted/20 space-y-1">
                                <p className="text-[10px] text-muted-foreground font-bold uppercase">Content Idea</p>
                                <p className="text-xs">{trend.contentIdea}</p>
                              </div>

                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1"><Clock className="h-3 w-3" />{trend.timing}</div>
                                <div className="flex items-center gap-1"><Target className="h-3 w-3" />Age: {trend.audienceAge}</div>
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  className="flex-1 gap-1.5 text-xs h-9 bg-gradient-to-r from-primary to-accent hover:opacity-90"
                                  onClick={() => navigate('/app/hook-battle', { state: { prefilledNiche: trend.niche } })}
                                >
                                  <Swords className="h-3.5 w-3.5" />
                                  Hook Battle this trend
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1 gap-1.5 text-xs h-9"
                                  onClick={() => navigate('/app', { state: { prefilledNiche: trend.niche } })}
                                >
                                  <Zap className="h-3.5 w-3.5" />
                                  Generate content
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
            </div>
          )}

          {/* ── ANALYTICS TAB ──────────────────────────────────────────── */}
          {activeTab === 'analytics' && (
            <div className="space-y-5">
              {/* Loading */}
              {loadingAnalytics && (
                <div className="glass-card p-10 text-center space-y-4">
                  <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto" />
                  <div>
                    <p className="font-semibold">Analyzing your content data...</p>
                    <p className="text-sm text-muted-foreground">Reading your real usage patterns and generating predictions</p>
                  </div>
                </div>
              )}

              {!loadingAnalytics && !analyticsData && (
            <div className="glass-card p-12 text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-4 rounded-full bg-primary/10">
                  <BarChart3 className="h-8 w-8 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">Predictive Analytics</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  AI analyzes your real usage data to predict which content formats will perform best and when to post.
                </p>
              </div>
              <Button onClick={loadAnalytics} disabled={loadingAnalytics} className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Load Analytics
              </Button>
            </div>
          )}

          {!loadingAnalytics && analyticsData && (
                <div className="space-y-5">
                  {/* Real stats bar */}
                  <div className="glass-card p-4 border border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
                    <div className="flex items-center gap-2 mb-3">
                      <Brain className="h-4 w-4 text-primary" />
                      <p className="text-xs font-bold text-primary">Based on your real data</p>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                      {[
                        { label: 'Generated', value: analyticsData.realStats.totalGenerations },
                        { label: 'Scheduled', value: analyticsData.realStats.totalScheduled },
                        { label: 'Posted', value: analyticsData.realStats.postedCount },
                        { label: 'Completion', value: `${analyticsData.realStats.consistencyScore}%` },
                        { label: 'Top Niche', value: analyticsData.realStats.topNiche },
                        { label: 'Credits Left', value: analyticsData.realStats.creditsRemaining },
                      ].map((stat, i) => (
                        <div key={i} className="text-center">
                          <p className="text-base font-black capitalize">{stat.value}</p>
                          <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AI Strategic Insight */}
                  <div className="glass-card p-5 border border-accent/20 bg-gradient-to-br from-accent/5 to-primary/5">
                    <div className="flex items-center gap-2 mb-3">
                      <Brain className="h-4 w-4 text-accent" />
                      <p className="text-sm font-bold">AI Strategic Insight</p>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{analyticsData.aiInsight}</p>
                  </div>

                  {/* Format Performance Predictions */}
                  <div className="space-y-3">
                    <h2 className="font-bold text-sm text-muted-foreground uppercase tracking-wide">Predicted Format Performance</h2>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {analyticsData.performancePredictions?.map((pred, i) => (
                        <div key={i} className="glass-card p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{pred.formatIcon}</span>
                              <div>
                                <p className="text-sm font-bold">{pred.format}</p>
                                <p className="text-[10px] text-muted-foreground">{pred.effortLevel} effort</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`text-xs font-bold ${
                                pred.predictedReach === 'Viral' ? 'text-green-400' :
                                pred.predictedReach === 'High' ? 'text-blue-400' :
                                pred.predictedReach === 'Medium' ? 'text-amber-400' : 'text-muted-foreground'
                              }`}>{pred.predictedReach} Reach</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <ConfidenceRing value={pred.confidence} label="Confidence" />
                            <ConfidenceRing value={pred.viralScore} label="Viral Score" />
                          </div>

                          <p className="text-xs text-muted-foreground leading-relaxed">{pred.reason}</p>
                          <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/10">
                            <p className="text-[11px] text-primary font-semibold">{pred.recommendation}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Posting Time Analysis */}
                  {analyticsData.postingTimeAnalysis && (
                    <div className="glass-card p-5 space-y-3">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" />
                        <p className="font-bold text-sm">Optimal Posting Analysis</p>
                        <span className="text-[10px] text-muted-foreground">({userTimezone})</span>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="p-3 rounded-lg bg-muted/30 border border-border/30 space-y-1">
                            <p className="text-[10px] text-muted-foreground font-bold uppercase">Current Pattern</p>
                            <p className="text-xs">{analyticsData.postingTimeAnalysis.currentPattern}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20 space-y-1">
                            <p className="text-[10px] text-green-400 font-bold uppercase">Optimal Time</p>
                            <p className="text-sm font-black text-green-400">{analyticsData.postingTimeAnalysis.optimalTime}</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-1.5">
                            <p className="text-[10px] text-primary font-bold uppercase">Best Days</p>
                            <div className="flex flex-wrap gap-1.5">
                              {analyticsData.postingTimeAnalysis.optimalDays?.map(d => (
                                <span key={d} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">{d}</span>
                              ))}
                            </div>
                          </div>
                          <div className="p-3 rounded-lg bg-accent/5 border border-accent/20">
                            <p className="text-[10px] text-accent font-bold uppercase mb-1">Potential Reach Increase</p>
                            <p className="text-xl font-black text-accent">{analyticsData.postingTimeAnalysis.potentialReachIncrease}</p>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{analyticsData.postingTimeAnalysis.reasoning}</p>
                    </div>
                  )}

                  {/* Niche Momentum */}
                  {analyticsData.nicheMomentumScore && (
                    <div className="glass-card p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-primary" />
                          <p className="font-bold text-sm">Niche Momentum</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {analyticsData.nicheMomentumScore.trend === 'RISING' && <ArrowUp className="h-4 w-4 text-green-400" />}
                          {analyticsData.nicheMomentumScore.trend === 'STABLE' && <Minus className="h-4 w-4 text-amber-400" />}
                          {analyticsData.nicheMomentumScore.trend === 'DECLINING' && <ArrowDown className="h-4 w-4 text-red-400" />}
                          <span className={`text-sm font-bold ${TREND_MOMENTUM_COLORS[analyticsData.nicheMomentumScore.trend]}`}>
                            {analyticsData.nicheMomentumScore.trend}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-4xl font-black text-gradient">{analyticsData.nicheMomentumScore.score}</div>
                        <div className="flex-1">
                          <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-primary to-accent rounded-full" style={{ width: `${analyticsData.nicheMomentumScore.score}%` }} />
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{analyticsData.nicheMomentumScore.reasoning}</p>
                      <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                        <p className="text-[10px] text-green-400 font-bold uppercase mb-1">Opportunity</p>
                        <p className="text-xs">{analyticsData.nicheMomentumScore.opportunity}</p>
                      </div>
                    </div>
                  )}

                  {/* Consistency + Growth */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    {analyticsData.consistencyInsight && (
                      <div className="glass-card p-5 space-y-3">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-primary" />
                          <p className="font-bold text-sm">Consistency</p>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Current Rate</span>
                            <span className="font-bold">{analyticsData.consistencyInsight.currentRate}%</span>
                          </div>
                          <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-primary to-accent rounded-full" style={{ width: `${analyticsData.consistencyInsight.currentRate}%` }} />
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Target</span>
                            <span className="font-bold text-green-400">{analyticsData.consistencyInsight.targetRate}%</span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{analyticsData.consistencyInsight.impact}</p>
                        <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/10">
                          <p className="text-xs font-semibold text-primary">{analyticsData.consistencyInsight.weeklyGoal}</p>
                        </div>
                      </div>
                    )}

                    {analyticsData.growthProjection && (
                      <div className="glass-card p-5 space-y-3">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-accent" />
                          <p className="font-bold text-sm">30-Day Projection</p>
                        </div>
                        <div className="p-3 rounded-lg bg-accent/5 border border-accent/20 space-y-1">
                          <p className="text-[10px] text-accent font-bold uppercase">Goal</p>
                          <p className="text-xs font-semibold">{analyticsData.growthProjection.thirtyDayGoal}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 space-y-1">
                          <p className="text-[10px] text-primary font-bold uppercase">Key Lever</p>
                          <p className="text-xs">{analyticsData.growthProjection.keyLever}</p>
                        </div>
                        {analyticsData.growthProjection.warningSign && (
                          <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 flex items-start gap-2">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-300">{analyticsData.growthProjection.warningSign}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Content Gaps */}
                  {analyticsData.contentGaps?.length > 0 && (
                    <div className="glass-card p-5 space-y-3">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-amber-400" />
                        <p className="font-bold text-sm">Content Gaps & Opportunities</p>
                      </div>
                      <div className="space-y-2">
                        {analyticsData.contentGaps.map((gap, i) => (
                          <div key={i} className="p-3 rounded-lg bg-muted/30 border border-border/30 flex items-start gap-3">
                            <div className={`mt-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                              gap.estimatedImpact === 'HIGH' ? 'bg-green-500/10 text-green-400' :
                              gap.estimatedImpact === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400' :
                              'bg-muted text-muted-foreground'
                            }`}>
                              {gap.estimatedImpact}
                            </div>
                            <div>
                              <p className="text-xs font-semibold">{gap.gap}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{gap.opportunity}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    onClick={loadAnalytics}
                    disabled={loadingAnalytics}
                    className="w-full gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh Analytics
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
