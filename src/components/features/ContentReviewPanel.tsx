import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { FunctionsHttpError } from '@supabase/supabase-js';
import {
  Shield, AlertTriangle, CheckCircle2, XCircle,
  Loader2, ChevronDown, ChevronUp, Copy, Wand2,
  MessageSquare, Search
} from 'lucide-react';

interface ContentReviewPanelProps {
  hook: string;
  script: string;
  caption: string;
  hashtags: string[];
  niche: string;
  vibe: string;
  onPolished?: (polishedHook: string, polishedScript: string, polishedCaption: string) => void;
}

interface ReviewFlag {
  type: 'AI_SOUNDING' | 'UNVERIFIED_CLAIM' | 'NEEDS_PERSONALIZATION' | 'FORCED_SLANG' | 'GENERIC_PHRASE';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  quotedPhrase: string;
  issue: string;
  suggestion: string;
}

interface ReviewResult {
  overallAuthenticityScore: number;
  flags: ReviewFlag[];
  humanizedHook: string;
  personalizePrompts: string[];
  factCheckItems: string[];
  readyToPost: boolean;
  readyNote: string;
}

interface PolishResult {
  polishedHook: string;
  polishedScript: string;
  polishedCaption: string;
  changesExplained: string[];
  humanityScore: { before: number; after: number };
  voiceTips: string[];
}

const FLAG_STYLES: Record<string, string> = {
  AI_SOUNDING: 'border-red-500/30 bg-red-500/5 text-red-400',
  UNVERIFIED_CLAIM: 'border-amber-500/30 bg-amber-500/5 text-amber-400',
  NEEDS_PERSONALIZATION: 'border-blue-500/30 bg-blue-500/5 text-blue-400',
  FORCED_SLANG: 'border-orange-500/30 bg-orange-500/5 text-orange-400',
  GENERIC_PHRASE: 'border-purple-500/30 bg-purple-500/5 text-purple-400',
};

const FLAG_ICONS: Record<string, string> = {
  AI_SOUNDING: '🤖',
  UNVERIFIED_CLAIM: '⚠️',
  NEEDS_PERSONALIZATION: '✍️',
  FORCED_SLANG: '😬',
  GENERIC_PHRASE: '💤',
};

const SEVERITY_ORDER: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

export function ContentReviewPanel({
  hook, script, caption, hashtags, niche, vibe, onPolished
}: ContentReviewPanelProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [polishResult, setPolishResult] = useState<PolishResult | null>(null);
  const [loadingReview, setLoadingReview] = useState(false);
  const [loadingPolish, setLoadingPolish] = useState(false);
  const [polishContext, setPolishContext] = useState('');
  const [showPolishInput, setShowPolishInput] = useState(false);
  const [activeSection, setActiveSection] = useState<'review' | 'polish'>('review');

  const runReview = async () => {
    setLoadingReview(true);
    setReviewResult(null);

    const { data, error } = await supabase.functions.invoke('generate-insights', {
      body: {
        action: 'review_content',
        hook, script, caption, hashtags, niche, vibe,
      },
    });

    if (error) {
      let msg = error.message;
      if (error instanceof FunctionsHttpError) {
        try { const t = await error.context?.text(); msg = t || msg; } catch { /**/ }
      }
      toast({ title: 'Review failed', description: msg, variant: 'destructive' });
    } else {
      setReviewResult(data);
    }
    setLoadingReview(false);
  };

  const runPolish = async () => {
    setLoadingPolish(true);
    setPolishResult(null);

    const { data, error } = await supabase.functions.invoke('generate-insights', {
      body: {
        action: 'polish_content',
        hook, script, caption, niche, vibe,
        creatorContext: polishContext.trim() || undefined,
      },
    });

    if (error) {
      let msg = error.message;
      if (error instanceof FunctionsHttpError) {
        try { const t = await error.context?.text(); msg = t || msg; } catch { /**/ }
      }
      toast({ title: 'Polish failed', description: msg, variant: 'destructive' });
    } else {
      setPolishResult(data);
      if (onPolished && data) {
        // Don't auto-apply — let user choose
      }
    }
    setLoadingPolish(false);
  };

  const applyPolish = () => {
    if (!polishResult || !onPolished) return;
    onPolished(polishResult.polishedHook, polishResult.polishedScript, polishResult.polishedCaption);
    toast({ title: '✨ Polish applied!', description: 'Content updated with human-sounding version.' });
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied!` });
  };

  const sortedFlags = reviewResult?.flags
    ? [...reviewResult.flags].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
    : [];

  const handleOpen = () => {
    setIsOpen(true);
    if (!reviewResult && !loadingReview) runReview();
  };

  return (
    <div className="border-t border-border/30 mt-4 pt-4">
      {/* Toggle button */}
      {!isOpen ? (
        <button
          onClick={handleOpen}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20 hover:bg-amber-500/10 transition-colors group"
        >
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-semibold text-amber-400">Human-in-the-Loop Review</span>
            <span className="text-[10px] text-amber-400/70">AI self-audits your content</span>
          </div>
          <ChevronDown className="h-4 w-4 text-amber-400 group-hover:translate-y-0.5 transition-transform" />
        </button>
      ) : (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-semibold text-amber-400">Human-in-the-Loop Review</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
              <ChevronUp className="h-4 w-4" />
            </button>
          </div>

          {/* Sub-tabs */}
          <div className="flex gap-1.5 bg-muted/30 p-1 rounded-lg">
            <button
              onClick={() => setActiveSection('review')}
              className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeSection === 'review' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              🔍 Review
            </button>
            <button
              onClick={() => setActiveSection('polish')}
              className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeSection === 'polish' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              ✨ Polish
            </button>
          </div>

          {/* ── REVIEW SECTION ── */}
          {activeSection === 'review' && (
            <div className="space-y-3">
              {loadingReview && (
                <div className="text-center py-6 space-y-2">
                  <Loader2 className="h-5 w-5 animate-spin text-amber-400 mx-auto" />
                  <p className="text-xs text-muted-foreground">AI reviewing for robotic language, unverified claims, and personalization gaps...</p>
                </div>
              )}

              {reviewResult && !loadingReview && (
                <div className="space-y-3">
                  {/* Score + verdict */}
                  <div className={`p-3 rounded-lg border flex items-start gap-3 ${
                    reviewResult.readyToPost ? 'border-green-500/30 bg-green-500/5' : 'border-amber-500/30 bg-amber-500/5'
                  }`}>
                    <div className="shrink-0">
                      {reviewResult.readyToPost
                        ? <CheckCircle2 className="h-5 w-5 text-green-400" />
                        : <AlertTriangle className="h-5 w-5 text-amber-400" />
                      }
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold">Authenticity Score:</span>
                        <span className={`text-lg font-black ${
                          reviewResult.overallAuthenticityScore >= 80 ? 'text-green-400' :
                          reviewResult.overallAuthenticityScore >= 60 ? 'text-amber-400' : 'text-red-400'
                        }`}>{reviewResult.overallAuthenticityScore}/100</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{reviewResult.readyNote}</p>
                    </div>
                  </div>

                  {/* Flags */}
                  {sortedFlags.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                        Issues Found ({sortedFlags.length})
                      </p>
                      {sortedFlags.map((flag, i) => (
                        <div key={i} className={`p-3 rounded-lg border text-xs space-y-1.5 ${FLAG_STYLES[flag.type]}`}>
                          <div className="flex items-center gap-1.5">
                            <span>{FLAG_ICONS[flag.type]}</span>
                            <span className="font-bold">{flag.type.replace(/_/g, ' ')}</span>
                            <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              flag.severity === 'HIGH' ? 'bg-red-500/20 text-red-400' :
                              flag.severity === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400' :
                              'bg-muted text-muted-foreground'
                            }`}>{flag.severity}</span>
                          </div>
                          <p className="italic opacity-80">"{flag.quotedPhrase}"</p>
                          <p className="text-muted-foreground">{flag.issue}</p>
                          <p className="font-semibold">💡 {flag.suggestion}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {sortedFlags.length === 0 && (
                    <div className="p-3 rounded-lg border border-green-500/20 bg-green-500/5 text-center">
                      <CheckCircle2 className="h-5 w-5 text-green-400 mx-auto mb-1" />
                      <p className="text-xs font-semibold text-green-400">No major issues found!</p>
                    </div>
                  )}

                  {/* Humanized hook suggestion */}
                  {reviewResult.humanizedHook && (
                    <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold text-primary uppercase">Suggested Humanized Hook</p>
                        <Button size="sm" variant="ghost" onClick={() => copy(reviewResult.humanizedHook, 'Hook')} className="h-6 px-2 text-[10px] gap-1">
                          <Copy className="h-3 w-3" />Copy
                        </Button>
                      </div>
                      <p className="text-sm font-black">"{reviewResult.humanizedHook}"</p>
                    </div>
                  )}

                  {/* Personalization prompts */}
                  {reviewResult.personalizePrompts?.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        Add Your Personal Touch
                      </p>
                      {reviewResult.personalizePrompts.map((prompt, i) => (
                        <div key={i} className="p-2.5 rounded-lg bg-muted/30 border border-border/30 text-xs text-muted-foreground">
                          {prompt}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Fact check */}
                  {reviewResult.factCheckItems?.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1">
                        <Search className="h-3 w-3" />
                        Verify Before Posting
                      </p>
                      {reviewResult.factCheckItems.map((item, i) => (
                        <div key={i} className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-amber-300">
                          ⚠️ {item}
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={runReview}
                    disabled={loadingReview}
                    className="w-full gap-1.5 text-xs h-8"
                  >
                    <Shield className="h-3.5 w-3.5" />
                    Re-run Review
                  </Button>
                </div>
              )}

              {!reviewResult && !loadingReview && (
                <Button onClick={runReview} disabled={loadingReview} className="w-full gap-2 text-xs h-9">
                  <Shield className="h-3.5 w-3.5" />
                  Run Review
                </Button>
              )}
            </div>
          )}

          {/* ── POLISH SECTION ── */}
          {activeSection === 'polish' && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                AI rewrites your content to sound like a real human creator — removing robotic language, adding natural imperfections, and matching authentic Gen Z voice.
              </p>

              {/* Optional context */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                  Add your personal context (optional)
                </label>
                <textarea
                  className="w-full min-h-[64px] px-3 py-2 text-xs rounded-lg border border-input bg-background resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="e.g. I'm 19, from Lagos, dropped out of uni to start a business, my audience loves raw storytelling..."
                  value={polishContext}
                  onChange={e => setPolishContext(e.target.value)}
                />
              </div>

              <Button
                onClick={runPolish}
                disabled={loadingPolish}
                className="w-full gap-2 text-xs h-9 bg-gradient-to-r from-primary to-accent hover:opacity-90"
              >
                {loadingPolish ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                {loadingPolish ? 'Polishing...' : 'Polish Content'}
              </Button>

              {loadingPolish && (
                <div className="text-center py-4 space-y-1">
                  <p className="text-xs text-muted-foreground">Rewriting to sound 100% human...</p>
                </div>
              )}

              {polishResult && !loadingPolish && (
                <div className="space-y-3">
                  {/* Humanity score */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Before</p>
                      <p className="text-xl font-black text-amber-400">{polishResult.humanityScore.before}</p>
                    </div>
                    <div className="flex-1 text-center text-muted-foreground">→</div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">After</p>
                      <p className="text-xl font-black text-green-400">{polishResult.humanityScore.after}</p>
                    </div>
                    <div className="text-xs font-bold text-green-400">Humanity Score</div>
                  </div>

                  {/* Polished content */}
                  <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-primary uppercase">Polished Hook</p>
                      <Button size="sm" variant="ghost" onClick={() => copy(polishResult.polishedHook, 'Hook')} className="h-6 px-2 text-[10px] gap-1">
                        <Copy className="h-3 w-3" />Copy
                      </Button>
                    </div>
                    <p className="text-sm font-black">"{polishResult.polishedHook}"</p>
                  </div>

                  <div className="p-3 rounded-lg border border-border/30 bg-muted/20 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Polished Script</p>
                      <Button size="sm" variant="ghost" onClick={() => copy(polishResult.polishedScript, 'Script')} className="h-6 px-2 text-[10px] gap-1">
                        <Copy className="h-3 w-3" />Copy
                      </Button>
                    </div>
                    <p className="text-xs leading-relaxed whitespace-pre-wrap">{polishResult.polishedScript}</p>
                  </div>

                  <div className="p-3 rounded-lg border border-border/30 bg-muted/20 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Polished Caption</p>
                      <Button size="sm" variant="ghost" onClick={() => copy(polishResult.polishedCaption, 'Caption')} className="h-6 px-2 text-[10px] gap-1">
                        <Copy className="h-3 w-3" />Copy
                      </Button>
                    </div>
                    <p className="text-xs">{polishResult.polishedCaption}</p>
                  </div>

                  {/* Changes explained */}
                  {polishResult.changesExplained?.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">What Changed</p>
                      {polishResult.changesExplained.map((change, i) => (
                        <div key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                          <span className="text-primary mt-0.5 shrink-0">•</span>
                          {change}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Voice tips */}
                  {polishResult.voiceTips?.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-primary uppercase">Make It More Yours</p>
                      {polishResult.voiceTips.map((tip, i) => (
                        <div key={i} className="p-2.5 rounded-lg bg-primary/5 border border-primary/10 text-xs">
                          💡 {tip}
                        </div>
                      ))}
                    </div>
                  )}

                  {onPolished && (
                    <Button
                      onClick={applyPolish}
                      className="w-full gap-2 text-xs h-9 bg-gradient-to-r from-green-600 to-emerald-500 hover:opacity-90 text-white"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Apply Polish to Content
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
