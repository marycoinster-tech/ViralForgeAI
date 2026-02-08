import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { UserMessage } from '@/components/chat/UserMessage';
import { AIMessage } from '@/components/chat/AIMessage';
import { LoadingIndicator } from '@/components/chat/LoadingIndicator';
import { InputBar } from '@/components/chat/InputBar';
import { GeneratorInput, GeneratedContent } from '@/types/content';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, RotateCcw, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FunctionsHttpError } from '@supabase/supabase-js';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: any;
  created_at: string;
}

export function Chat() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [lastInput, setLastInput] = useState<GeneratorInput | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [videoGenerationStatus, setVideoGenerationStatus] = useState<{
    active: boolean;
    progress: number;
    message: string;
    predictionId?: string;
  } | null>(null);
  const [videoMode, setVideoMode] = useState(false);
  const [dailyVideoCount, setDailyVideoCount] = useState(0);
  const generationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const videoPollingRef = useRef<NodeJS.Timeout | null>(null);

  // Load conversation messages when conversationId changes
  useEffect(() => {
    // Reset state when switching conversations
    setIsGenerating(false);
    setGenerationError(null);
    
    if (conversationId) {
      loadConversation(conversationId);
    } else {
      // New conversation
      setMessages([]);
      setCurrentConversationId(null);
    }
  }, [conversationId]); // This will trigger whenever the URL param changes

  // Check daily video limit on mount
  useEffect(() => {
    checkDailyVideoLimit();
  }, []);

  const checkDailyVideoLimit = async () => {
    try {
      const { data, error } = await supabase.rpc('check_daily_video_limit', {
        user_uuid: user!.id,
      });

      if (error) throw error;
      setDailyVideoCount(data || 0);
    } catch (error: any) {
      console.error('Failed to check video limit:', error);
    }
  };

  const loadConversation = async (id: string) => {
    if (isLoadingHistory) return; // Prevent duplicate loads
    
    setIsLoadingHistory(true);
    setStreamingContent(''); // Clear any streaming content
    
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
      toast({
        title: 'Failed to load conversation',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Detect URLs in text and extract domain info
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
    } catch {
      return null;
    }
  };

  const handleVideoGeneration = async (prompt: string, duration: number = 10, aspectRatio: '16:9' | '9:16' | '1:1' = '16:9', style: string = 'realistic') => {
    // Check daily limit
    if (dailyVideoCount >= 3) {
      toast({
        title: 'Daily limit reached',
        description: 'You can generate up to 3 videos per day. Try again tomorrow!',
        variant: 'destructive',
      });
      return;
    }

    // Model-specific duration validation
    const isRealistic = style === 'realistic';
    let safeDuration = duration;
    
    if (isRealistic) {
      // Sora only accepts 4, 8, 12
      if (duration <= 6) safeDuration = 4;
      else if (duration <= 10) safeDuration = 8;
      else safeDuration = 12;
    } else {
      // Veo accepts 4, 8, 12, 16, 20, 24, 28
      const veoValid = [4, 8, 12, 16, 20, 24, 28];
      safeDuration = veoValid.reduce((prev, curr) => 
        Math.abs(curr - duration) < Math.abs(prev - duration) ? curr : prev
      );
    }
    
    console.log(`Starting video generation: requested ${duration}s, using ${safeDuration}s, ${aspectRatio}, ${style}`);
    setVideoGenerationStatus({
      active: true,
      progress: 0,
      message: `Starting ${isRealistic ? 'Sora 2' : 'Veo 3.1'} video (${safeDuration}s)...`,
    });

    // Add user message to UI
    const userMessage: Message = {
      id: `temp-user-${Date.now()}`,
      role: 'user',
      content: `Generate ${safeDuration}s ${style} video: "${prompt}" (${aspectRatio})`,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Select model based on style
      const model = style === 'cartoon' ? 'google/veo-3.1-fast' : 'openai/sora-2';

      // Step 1: Create video generation task
      console.log('Calling generate-video with:', { model, prompt, duration: safeDuration, aspectRatio });
      
      const { data: createData, error: createError } = await supabase.functions.invoke('generate-video', {
        body: {
          action: 'create',
          model,
          prompt,
          duration: safeDuration,
          aspectRatio,
        },
      });

      if (createError) {
        console.error('Video creation error:', createError);
        let errorMessage = 'Failed to start video generation';
        
        if (createError instanceof FunctionsHttpError) {
          try {
            const statusCode = createError.context?.status ?? 500;
            const textContent = await createError.context?.text();
            errorMessage = `[Code: ${statusCode}] ${textContent || createError.message || 'Unknown error'}`;
            console.error('Detailed error:', errorMessage);
          } catch {
            errorMessage = createError.message || 'Failed to read response';
          }
        } else {
          errorMessage = createError.message || 'Unknown error occurred';
        }
        
        throw new Error(errorMessage);
      }

      const predictionId = createData.id;
      console.log('Video generation started:', predictionId);

      setVideoGenerationStatus({
        active: true,
        progress: 10,
        message: 'Generating your video... This may take 1-3 minutes.',
        predictionId,
      });

      // Step 2: Poll for completion
      let videoUploaded = false;
      const pollInterval = setInterval(async () => {
        if (videoUploaded) {
          clearInterval(pollInterval);
          return;
        }

        try {
          const { data: statusData, error: statusError } = await supabase.functions.invoke('generate-video', {
            body: {
              action: 'check',
              predictionId,
            },
          });

          if (statusError) {
            console.error('Video status check error:', statusError);
            let errorMessage = 'Failed to check video status';
            
            if (statusError instanceof FunctionsHttpError) {
              try {
                const textContent = await statusError.context?.text();
                errorMessage = textContent || statusError.message || 'Unknown error';
              } catch {
                errorMessage = statusError.message || 'Failed to read response';
              }
            }
            
            throw new Error(errorMessage);
          }

          console.log('Video status:', statusData.status, 'Progress:', statusData.progress);

          if (statusData.status === 'succeeded') {
            videoUploaded = true;
            clearInterval(pollInterval);
            
            setVideoGenerationStatus(null);

            // Add video message to chat
            const videoMessage: Message = {
              id: `video-${Date.now()}`,
              role: 'assistant',
              content: {
                videoUrl: statusData.storage_url,
                prompt,
                duration: safeDuration,
              },
              created_at: new Date().toISOString(),
            };
            setMessages(prev => [...prev, videoMessage]);

            // Update daily count
            setDailyVideoCount(prev => prev + 1);

            toast({
              title: 'Video generated!',
              description: 'Your AI video is ready to watch',
            });
          } else if (statusData.status === 'failed' || statusData.status === 'canceled') {
            videoUploaded = true;
            clearInterval(pollInterval);
            setVideoGenerationStatus(null);
            throw new Error(statusData.error || 'Video generation failed');
          } else {
            // Still processing
            setVideoGenerationStatus({
              active: true,
              progress: statusData.progress || 50,
              message: statusData.message || 'Generating...',
              predictionId,
            });
          }
        } catch (error: any) {
          videoUploaded = true;
          clearInterval(pollInterval);
          setVideoGenerationStatus(null);
          toast({
            title: 'Video generation failed',
            description: error.message,
            variant: 'destructive',
          });
        }
      }, 5000); // Poll every 5 seconds

      videoPollingRef.current = pollInterval;

    } catch (error: any) {
      console.error('Video generation error:', error);
      setVideoGenerationStatus(null);
      
      // Add error message to chat
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `❌ Video generation failed: ${error.message}\n\nPlease try again or contact support if the issue persists.`,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: 'Video generation failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleGenerate = async (input: GeneratorInput, isRetry = false, remixIteration = 0) => {
    setIsGenerating(true);
    setGenerationError(null);
    setLastInput(input);
    setStreamingContent('');

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    // Set timeout to detect hung generations (60 seconds)
    generationTimeoutRef.current = setTimeout(() => {
      setGenerationError('Generation is taking too long. Please try again.');
      setIsGenerating(false);
      abortControllerRef.current?.abort();
    }, 60000);

    try {
      // Get user's timezone
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const userCountry = new Intl.Locale(navigator.language).region || 'US';

      // Detect URL in custom topic
      const urlInfo = input.customTopic ? detectUrl(input.customTopic) : null;
      const contentUrl = urlInfo?.url || null;

      // Create new conversation if needed
      let convId = currentConversationId;
      
      if (!convId) {
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            user_id: user!.id,
            title: 'New conversation',
          })
          .select()
          .single();

        if (convError) {
          console.error('Conversation creation error:', convError);
          throw convError;
        }
        convId = newConv.id;
        setCurrentConversationId(convId);

        // Update URL to include conversation ID
        navigate(`/app/${convId}`, { replace: true });
      }

      // Add user message to UI immediately
      const tempUserMessage: Message = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content: input.customTopic || {
          niche: input.niche,
          vibe: input.vibe,
          goal: input.goal,
          platform: input.platform,
        },
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, tempUserMessage]);

      // Get auth token for streaming request
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Call Edge Function with streaming
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
            contentUrl: contentUrl,
            remixIteration: remixIteration,
          }),
          signal: abortControllerRef.current.signal,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Generation failed: ${errorText}`);
      }

      // Read streaming response
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
              // Clear timeout on completion
              if (generationTimeoutRef.current) {
                clearTimeout(generationTimeoutRef.current);
              }
              // Reload conversation to get saved messages
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
              if (e.message !== 'Unexpected end of JSON input') {
                console.error('Parse error:', e);
              }
            }
          }
        }
      }

    } catch (error: any) {
      // Clear timeout on error
      if (generationTimeoutRef.current) {
        clearTimeout(generationTimeoutRef.current);
      }
      
      if (error.name === 'AbortError') {
        setGenerationError('Generation cancelled');
      } else {
        setGenerationError(error.message);
        console.error('Generation error:', error);
        toast({
          title: 'Generation failed',
          description: error.message,
          variant: 'destructive',
        });
      }
    } finally {
      setIsGenerating(false);
      setStreamingContent('');
    }
  };

  const handleRetry = () => {
    if (lastInput) {
      handleGenerate(lastInput, true);
    }
  };

  const handleStopGeneration = () => {
    if (generationTimeoutRef.current) {
      clearTimeout(generationTimeoutRef.current);
    }
    abortControllerRef.current?.abort();
    setIsGenerating(false);
    setStreamingContent('');
    setGenerationError('Generation cancelled');
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (generationTimeoutRef.current) {
        clearTimeout(generationTimeoutRef.current);
      }
      if (videoPollingRef.current) {
        clearInterval(videoPollingRef.current);
      }
    };
  }, []);

  const quickPrompts = [
    {
      label: 'Dark anime content',
      input: {
        niche: 'anime' as const,
        vibe: 'dark' as const,
        goal: 'followers' as const,
        platform: 'tiktok' as const,
        customTopic: 'dark anime moments that hit different',
      },
    },
    {
      label: 'Money-making tips',
      input: {
        niche: 'money' as const,
        vibe: 'motivational' as const,
        goal: 'money' as const,
        platform: 'tiktok' as const,
        customTopic: 'how to make money with AI in 2024',
      },
    },
    {
      label: 'Toxic motivation',
      input: {
        niche: 'motivation' as const,
        vibe: 'toxic' as const,
        goal: 'engagement' as const,
        platform: 'reels' as const,
      },
    },
  ];

  return (
    <AppLayout>
      <div className="h-full flex flex-col">
        {/* Messages Container */}
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
                    // Handle both string and object content
                    if (typeof message.content === 'string') {
                      return (
                        <UserMessage
                          key={message.id}
                          customTopic={message.content}
                        />
                      );
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
                        // Remix the last user message with increased iteration
                        if (lastInput) {
                          handleGenerate(lastInput, false, iteration);
                        }
                      }}
                    />
                  );
                })}

                {videoGenerationStatus && videoGenerationStatus.active && (
                  <div className="mb-6 animate-fade-in">
                    <div className="max-w-3xl glass-card p-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                              <Sparkles className="h-5 w-5 text-primary" />
                            </div>
                            <div className="absolute inset-0 rounded-full bg-primary/30 blur-md animate-pulse" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-sm">Generating AI Video</h3>
                            <p className="text-xs text-muted-foreground">{videoGenerationStatus.message}</p>
                          </div>
                        </div>
                        
                        {/* Progress bar */}
                        <div className="space-y-2">
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                              style={{ width: `${videoGenerationStatus.progress}%` }}
                            />
                          </div>
                          <p className="text-xs text-center text-muted-foreground">
                            {videoGenerationStatus.progress}% • This may take 1-3 minutes
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {(isGenerating || streamingContent) && (
                  <div className="space-y-4">
                    <div className="mb-6 animate-fade-in">
                      <div className="max-w-3xl">
                        <div className="flex items-start gap-3">
                          {/* Pulsing AI Indicator */}
                          <div className="mt-1 relative">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                              <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                            </div>
                            {/* Neon glow effect */}
                            <div className="absolute inset-0 rounded-full bg-primary/30 blur-md animate-pulse" />
                          </div>
                          
                          <div className="flex-1 min-w-0 space-y-3">
                            {streamingContent ? (
                              <div className="text-sm text-foreground/90 whitespace-pre-wrap typewriter">
                                {streamingContent}
                                <span className="inline-block w-1 h-4 ml-1 bg-primary animate-pulse" />
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                  <span className="text-sm text-muted-foreground animate-pulse">Thinking...</span>
                                </div>
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

        {/* Input Bar */}
        <InputBar 
          onGenerate={handleGenerate} 
          onVideoGenerate={(params) => handleVideoGeneration(
            params.prompt,
            params.duration,
            params.aspectRatio,
            params.style
          )}
          disabled={isGenerating || (videoGenerationStatus?.active || false)}
          videoMode={videoMode}
          onVideoModeToggle={() => setVideoMode(!videoMode)}
        />
      </div>
    </AppLayout>
  );
}
