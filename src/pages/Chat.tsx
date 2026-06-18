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
import { Sparkles, RotateCcw, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BuyCreditsModal } from '@/components/features/BuyCreditsModal';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: any;
  created_at: string;
}

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
  const [userCredits, setUserCredits] = useState(0);
  // Daily thumbnail image limit tracking
  const [dailyImageCount, setDailyImageCount] = useState(0);
  const DAILY_IMAGE_LIMIT = 4;

  const generationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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
    loadUserCredits();
    loadDailyImageCount();
  }, []);

  const loadUserCredits = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('credits_remaining')
        .eq('id', user!.id)
        .single();
      if (error) throw error;
      setUserCredits(data?.credits_remaining || 0);
    } catch (error: any) {
      console.error('Failed to load credits:', error);
    }
  };

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

    // Check if this is a thumbnail generation request
    const isThumbnailRequest = input.customTopic?.toLowerCase().includes('/thumbnail') ||
      input.customTopic?.toLowerCase().includes('thumbnail') && input.customTopic?.toLowerCase().includes('generate');

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
        content: input.customTopic || { niche: input.niche, vibe: input.vibe, goal: input.goal, platform: input.platform },
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
            'Authorization': `Bearer ${session.access_token}`,
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
        }
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

  const quickPrompts = [
    {
      label: 'Dark anime content',
      input: { niche: 'anime' as const, vibe: 'dark' as const, goal: 'followers' as const, platform: 'tiktok' as const, customTopic: 'dark anime moments that hit different' },
    },
    {
      label: 'Money-making tips',
      input: { niche: 'money' as const, vibe: 'motivational' as const, goal: 'money' as const, platform: 'tiktok' as const, customTopic: 'how to make money with AI in 2026' },
    },
    {
      label: 'Toxic motivation',
      input: { niche: 'motivation' as const, vibe: 'toxic' as const, goal: 'engagement' as const, platform: 'reels' as const },
    },
  ];

  return (
    <AppLayout>
      <div className="h-full flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 py-8">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center h-64">
                <div className="h-8 w-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center space-y-4 max-w-md animate-fade-in">
                  <div className="flex justify-center">
                    <div className="relative">
                      <Sparkles className="h-16 w-16 text-primary animate-pulse" />
                      <div className="absolute inset-0 blur-2xl bg-primary/30 animate-glow-pulse" />
                    </div>
                  </div>
                  <h2 className="text-3xl font-black">
                    Ready to go <span className="text-gradient">viral</span>?
                  </h2>
                  <p className="text-muted-foreground">
                    Tell me what kind of content you want to create, and I'll generate hooks, scripts, and captions that actually hit.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center pt-4">
                    {quickPrompts.map((prompt) => (
                      <button
                        key={prompt.label}
                        onClick={() => handleGenerate(prompt.input)}
                        disabled={isGenerating}
                        className="px-4 py-2 rounded-lg bg-muted/50 hover:bg-muted text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        {prompt.label}
                      </button>
                    ))}
                  </div>
                </div>
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
                          <div className="mt-1 relative">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                              <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                            </div>
                            <div className="absolute inset-0 rounded-full bg-primary/30 blur-md animate-pulse" />
                          </div>
                          <div className="flex-1 min-w-0 space-y-3">
                            {streamingContent ? (
                              <div className="text-sm text-foreground/90 whitespace-pre-wrap typewriter">
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
                      <Button variant="outline" size="sm" onClick={handleStopGeneration} className="border-destructive/40 hover:bg-destructive/10">
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
                        <Button onClick={handleRetry} variant="outline" size="sm" className="w-full border-primary/40 hover:bg-primary/10">
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
        onSuccess={() => { loadUserCredits(); setShowBuyCredits(false); }}
      />
    </AppLayout>
  );
}
