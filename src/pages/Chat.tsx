import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { UserMessage } from '@/components/chat/UserMessage';
import { AIMessage } from '@/components/chat/AIMessage';
import { InputBar } from '@/components/chat/InputBar';
import { GeneratorInput } from '@/types/content';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { RotateCcw, X, AlertCircle, Zap, Flame, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BuyCreditsModal } from '@/components/features/BuyCreditsModal';
import { OnboardingModal } from '@/components/features/OnboardingModal';
import viralforgerMascot from '@/assets/viralforger-mascot.png';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: any;
  created_at: string;
}

const QUICK_PROMPTS = [
  {
    icon: <Flame className="h-4 w-4" />,
    label: '🔥 Dark anime hook',
    input: {
      niche: 'anime' as const,
      vibe: 'dark' as const,
      goal: 'followers' as const,
      platform: 'tiktok' as const,
      customTopic: 'dark anime moments that hit different emotionally',
    },
  },
  {
    icon: <DollarSign className="h-4 w-4" />,
    label: '💸 Make money online',
    input: {
      niche: 'money' as const,
      vibe: 'motivational' as const,
      goal: 'money' as const,
      platform: 'tiktok' as const,
      customTopic: 'how to make $5k/month online as a Gen Z in 2026',
    },
  },
  {
    icon: <Zap className="h-4 w-4" />,
    label: '⚡ Toxic motivation',
    input: {
      niche: 'motivation' as const,
      vibe: 'toxic' as const,
      goal: 'engagement' as const,
      platform: 'reels' as const,
    },
  },
];

export function Chat() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const prefilledNiche = (location.state as { prefilledNiche?: string } | null)?.prefilledNiche;
  const { user } = useAuth();
  const { toast } = useToast();

  const [messages, setMessages] = useState<Message[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [lastInput, setLastInput] = useState<GeneratorInput | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const [dailyImageCount, setDailyImageCount] = useState(0);
  const DAILY_IMAGE_LIMIT = 4;

  const generationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Check if this is a brand-new user (show onboarding once)
  useEffect(() => {
    if (!user?.id) return;
    const key = `viralforge_onboarded_${user.id}`;
    if (!localStorage.getItem(key)) {
      // Short delay so the page renders first
      const timer = setTimeout(() => setShowOnboarding(true), 800);
      return () => clearTimeout(timer);
    }
  }, [user?.id]);

  const handleOnboardingClose = () => {
    if (user?.id) {
      localStorage.setItem(`viralforge_onboarded_${user.id}`, '1');
    }
    setShowOnboarding(false);
  };

  useEffect(() => {
    setIsGenerating(false);
    setGenerationError(null);
    if (conversationId) {
      loadConversation(conversationId);
    } else {
      setMessages([]);
      setCurrentConversationId(null);
    }
  }, [conversationId]);

  useEffect(() => {
    loadDailyImageCount();
  }, []);

  const loadDailyImageCount = () => {
    const today = new Date().toDateString();
    const key = `viralforge_thumbnail_count_${user!.id}_${today}`;
    const count = parseInt(localStorage.getItem(key) || '0');
    setDailyImageCount(count);
  };

  const incrementDailyImageCount = () => {
    const today = new Date().toDateString();
    const key = `viralforge_thumbnail_count_${user!.id}_${today}`;
    const newCount = dailyImageCount + 1;
    localStorage.setItem(key, String(newCount));
    setDailyImageCount(newCount);
  };

  const loadConversation = async (id: string) => {
    if (isLoadingHistory) return;
    setIsLoadingHistory(true);
    setStreamingContent('');
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setMessages(data || []);
      setCurrentConversationId(id);
    } catch (error: any) {
      console.error('Failed to load conversation:', error);
      toast({ title: 'Failed to load conversation', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const detectUrl = (text: string): { url: string; domain: string; favicon: string } | null => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const match = text.match(urlRegex);
    if (!match) return null;
    const url = match[0];
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace('www.', '');
      const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
      return { url, domain, favicon };
    } catch { return null; }
  };

  const handleGenerate = async (input: GeneratorInput, isRetry = false, remixIteration = 0) => {
    setIsGenerating(true);
    setGenerationError(null);
    setLastInput(input);
    setStreamingContent('');

    abortControllerRef.current = new AbortController();

    const isThumbnailRequest = input.customTopic?.startsWith('[THUMBNAIL REQUEST]');

    if (isThumbnailRequest) {
      if (dailyImageCount >= DAILY_IMAGE_LIMIT) {
        toast({
          title: 'Daily thumbnail limit reached',
          description: `You can generate ${DAILY_IMAGE_LIMIT} thumbnails per day. Come back tomorrow!`,
          variant: 'destructive',
        });
        setShowBuyCredits(true);
        setIsGenerating(false);
        return;
      }
    }

    generationTimeoutRef.current = setTimeout(() => {
      setGenerationError('Generation is taking too long. Please try again.');
      setIsGenerating(false);
      abortControllerRef.current?.abort();
    }, 60000);

    try {
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const userCountry = new Intl.Locale(navigator.language).region || 'US';
      const urlInfo = input.customTopic ? detectUrl(input.customTopic) : null;
      const contentUrl = urlInfo?.url || null;

      let convId = currentConversationId;
      if (!convId) {
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({ user_id: user!.id, title: 'New conversation' })
          .select()
          .single();
        if (convError) throw convError;
        convId = newConv.id;
        setCurrentConversationId(convId);
        navigate(`/app/${convId}`, { replace: true });
      }

      const tempUserMessage: Message = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content:
          input.customTopic ||
          { niche: input.niche, vibe: input.vibe, goal: input.goal, platform: input.platform },
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, tempUserMessage]);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-content`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversationId: convId,
            niche: input.niche,
            vibe: input.vibe,
            goal: input.goal,
            platform: input.platform,
            customTopic: input.customTopic,
            timezone: userTimezone,
            country: userCountry,
            contentUrl,
            remixIteration,
          }),
          signal: abortControllerRef.current.signal,
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Generation failed: ${errorText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              if (generationTimeoutRef.current) clearTimeout(generationTimeoutRef.current);
              if (isThumbnailRequest) incrementDailyImageCount();
              await loadConversation(convId!);
              setStreamingContent('');
              continue;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                accumulatedContent += parsed.content;
                setStreamingContent(accumulatedContent);
              } else if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch (e: any) {
              if (e.message !== 'Unexpected end of JSON input') console.error('Parse error:', e);
            }
          }
        }
      }
    } catch (error: any) {
      if (generationTimeoutRef.current) clearTimeout(generationTimeoutRef.current);
      if (error.name === 'AbortError') {
        setGenerationError('Generation cancelled');
      } else {
        setGenerationError(error.message);
        console.error('Generation error:', error);
        toast({ title: 'Generation failed', description: error.message, variant: 'destructive' });
      }
    } finally {
      setIsGenerating(false);
      setStreamingContent('');
    }
  };

  const handleRetry = () => {
    if (lastInput) handleGenerate(lastInput, true);
  };

  const handleStopGeneration = () => {
    if (generationTimeoutRef.current) clearTimeout(generationTimeoutRef.current);
    abortControllerRef.current?.abort();
    setIsGenerating(false);
    setStreamingContent('');
    setGenerationError('Generation cancelled');
  };

  useEffect(() => {
    return () => {
      if (generationTimeoutRef.current) clearTimeout(generationTimeoutRef.current);
    };
  }, []);

  return (
    <AppLayout>
      {/* Onboarding modal — shown once per new user */}
      <OnboardingModal
        open={showOnboarding}
        onClose={handleOnboardingClose}
        onQuickStart={(prompt) => {
          handleOnboardingClose();
          handleGenerate({
            niche: 'motivation',
            vibe: 'motivational',
            goal: 'followers',
            platform: 'tiktok',
            customTopic: prompt,
          });
        }}
      />

      <div className="h-full flex flex-col relative">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 py-8">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center h-64">
                <div className="h-8 w-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              /* ── UPGRADED EMPTY STATE ── */
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-fade-in">
                {/* Mascot with glow ring */}
                <div className="relative mb-8">
                  {/* Pulsing glow ring */}
                  <div className="absolute -inset-6 rounded-full bg-primary/15 blur-2xl animate-glow-pulse" />
                  <div className="absolute -inset-3 rounded-full border-2 border-primary/20 animate-ping" style={{ animationDuration: '3s' }} />
                  <img
                    src={viralforgerMascot}
                    alt="ViralForger"
                    className="relative h-28 w-28 sm:h-32 sm:w-32 object-contain animate-spark-float drop-shadow-2xl"
                  />
                  {/* Floating electric badge */}
                  <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[9px] font-black px-1.5 py-0.5 rounded-full animate-bounce-in">
                    ⚡ READY
                  </div>
                </div>

                <h2 className="text-3xl sm:text-4xl font-black mb-3">
                  Ready to go <span className="text-gradient">viral</span>?
                </h2>
                <p className="text-muted-foreground text-sm sm:text-base max-w-sm mb-8 leading-relaxed">
                  Tell me your topic, niche, or vibe — I'll generate scroll-stopping hooks, viral scripts, and captions in seconds.
                </p>

                {/* Quick-start pill cards */}
                <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center w-full max-w-lg">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button
                      key={prompt.label}
                      onClick={() => handleGenerate(prompt.input)}
                      disabled={isGenerating}
                      className="group flex items-center gap-2.5 px-4 py-3 rounded-2xl border border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 hover:shadow-md hover:shadow-primary/10 transition-all duration-200 text-sm font-bold disabled:opacity-50 flex-1 sm:flex-initial justify-center"
                    >
                      <span className="text-primary group-hover:scale-110 transition-transform">
                        {prompt.icon}
                      </span>
                      {prompt.label}
                    </button>
                  ))}
                </div>

                {/* Bottom hint */}
                <p className="mt-6 text-xs text-muted-foreground/60">
                  Or just type anything below ↓
                </p>
              </div>
            ) : (
              <>
                {messages.map((message) => {
                  if (message.role === 'user') {
                    if (typeof message.content === 'string') {
                      return <UserMessage key={message.id} customTopic={message.content} />;
                    }
                    return (
                      <UserMessage
                        key={message.id}
                        niche={message.content.niche}
                        vibe={message.content.vibe}
                        goal={message.content.goal}
                        platform={message.content.platform}
                        customTopic={message.content.customTopic}
                      />
                    );
                  }
                  return (
                    <AIMessage
                      key={message.id}
                      content={message.content}
                      onRemix={(iteration) => {
                        if (lastInput) handleGenerate(lastInput, false, iteration);
                      }}
                    />
                  );
                })}

                {(isGenerating || streamingContent) && (
                  <div className="space-y-4">
                    <div className="mb-6 animate-fade-in">
                      <div className="max-w-3xl">
                        <div className="flex items-start gap-3">
                          <div className="mt-1 relative flex-shrink-0">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                            </div>
                            <div className="absolute inset-0 rounded-full bg-primary/20 blur-md animate-pulse" />
                          </div>
                          <div className="flex-1 min-w-0 space-y-3">
                            {streamingContent ? (
                              <div className="text-sm text-foreground/90 whitespace-pre-wrap">
                                {streamingContent}
                                <span className="inline-block w-1 h-4 ml-1 bg-primary animate-pulse" />
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                <span className="text-sm text-muted-foreground animate-pulse">Thinking...</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleStopGeneration}
                        className="border-destructive/40 hover:bg-destructive/10"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Stop generating
                      </Button>
                    </div>
                  </div>
                )}

                {generationError && !isGenerating && (
                  <div className="mb-6 animate-fade-in">
                    <div className="max-w-3xl glass-card p-6 border-destructive/20">
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-1 p-2 rounded-lg bg-destructive/10">
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-destructive mb-1">Generation Failed</h3>
                            <p className="text-sm text-muted-foreground">{generationError}</p>
                          </div>
                        </div>
                        <Button
                          onClick={handleRetry}
                          variant="outline"
                          size="sm"
                          className="w-full border-primary/40 hover:bg-primary/10"
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Retry Generation
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <InputBar
          onGenerate={handleGenerate}
          disabled={isGenerating}
          defaultNiche={prefilledNiche}
          dailyImageCount={dailyImageCount}
          dailyImageLimit={DAILY_IMAGE_LIMIT}
        />
      </div>

      <BuyCreditsModal
        open={showBuyCredits}
        onOpenChange={setShowBuyCredits}
        onSuccess={() => { setShowBuyCredits(false); }}
      />
    </AppLayout>
  );
}
