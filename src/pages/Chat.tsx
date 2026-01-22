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
  const generationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  const loadConversation = async (id: string) => {
    setIsLoadingHistory(true);
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

  const handleGenerate = async (input: GeneratorInput, isRetry = false) => {
    setIsGenerating(true);
    setGenerationError(null);
    setLastInput(input);

    // Set timeout to detect hung generations (60 seconds)
    generationTimeoutRef.current = setTimeout(() => {
      setGenerationError('Generation is taking too long. Please try again.');
      setIsGenerating(false);
    }, 60000);

    try {
      // Get user's timezone
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const userCountry = new Intl.Locale(navigator.language).region || 'US';

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

      // Call Edge Function to generate content
      const { data, error } = await supabase.functions.invoke('generate-content', {
        body: {
          conversationId: convId,
          niche: input.niche,
          vibe: input.vibe,
          goal: input.goal,
          platform: input.platform,
          customTopic: input.customTopic,
          timezone: userTimezone,
          country: userCountry,
        },
      });

      if (error) {
        let errorMessage = error.message;
        if (error instanceof FunctionsHttpError) {
          try {
            const statusCode = error.context?.status ?? 500;
            const textContent = await error.context?.text();
            errorMessage = `[Code: ${statusCode}] ${textContent || error.message || 'Unknown error'}`;
          } catch {
            errorMessage = `${error.message || 'Failed to read response'}`;
          }
        }
        throw new Error(errorMessage);
      }

      // Clear timeout on success
      if (generationTimeoutRef.current) {
        clearTimeout(generationTimeoutRef.current);
      }

      // Reload messages to get the new user message and AI response
      await loadConversation(convId!);

    } catch (error: any) {
      // Clear timeout on error
      if (generationTimeoutRef.current) {
        clearTimeout(generationTimeoutRef.current);
      }
      
      setGenerationError(error.message);
      console.error('Generation error:', error);
      toast({
        title: 'Generation failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
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
    setIsGenerating(false);
    setGenerationError('Generation cancelled');
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (generationTimeoutRef.current) {
        clearTimeout(generationTimeoutRef.current);
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
                  return <AIMessage key={message.id} content={message.content} />;
                })}

                {isGenerating && (
                  <div className="space-y-4">
                    <LoadingIndicator />
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
        <InputBar onGenerate={handleGenerate} disabled={isGenerating} />
      </div>
    </AppLayout>
  );
}
