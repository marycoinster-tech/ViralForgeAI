// ViralForge AI - Content Generation Edge Function
// Generates viral TikTok/Reels/Shorts content using OnSpace AI

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const ONSPACE_AI_BASE_URL = Deno.env.get('ONSPACE_AI_BASE_URL') ?? '';
const ONSPACE_AI_API_KEY = Deno.env.get('ONSPACE_AI_API_KEY') ?? '';

interface GenerateRequest {
  conversationId: string;
  niche: string;
  vibe: string;
  goal: string;
  platform: string;
  customTopic?: string;
  timezone?: string;
  country?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    // Get user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get request body
    const body: GenerateRequest = await req.json();
    const { conversationId, niche, vibe, goal, platform, customTopic, timezone, country } = body;

    console.log(`Generating content for user ${user.id}, conversation ${conversationId}`);

    // Get user's name for personalization
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single();

    const username = profile?.username || 'creator';

    // Build system prompt with Pidgin and timezone support
    const systemPrompt = `You are ViralForge AI, a friendly AI assistant and expert viral content creator for Gen Z.

The user's name is ${username}. Chat with them naturally like a knowledgeable friend.
${timezone ? `\nUser's timezone: ${timezone}${country ? ` (${country})` : ''}` : ''}

🌍 **LANGUAGE SUPPORT**
You understand and respond to:
- English (standard and slang)
- Nigerian Pidgin English (e.g., "wetin dey sup?", "make we gist", "e don do", "no wahala")
- Mix of both (code-switching)

Respond in the same language/style the user uses. If they speak Pidgin, you speak Pidgin naturally.

You can:
1. Have normal conversations - answer questions, give advice, chat about anything
2. Generate viral content for TikTok, Reels, and Shorts when asked
3. Help with content strategy, ideas, and creative direction

When the user wants viral content generation:
- Ask what they need if unclear
- Generate scroll-stopping hooks (0-2s)
- Write viral scripts (7-15s)
- Create Gen Z captions (authentic, not cringe)
- Suggest hashtags and visuals
- **ALWAYS include optimal posting time based on their timezone and platform**

When chatting normally:
- Be helpful, creative, and encouraging
- Use Gen Z language naturally (or Pidgin if they use it)
- Keep responses focused and valuable
- Be real, not corporate

📱 **POSTING TIME STRATEGY**
When generating viral content, ALWAYS include:
1. **Best time to post** - Based on user's timezone and platform algorithm
2. **Why that time works** - Audience activity patterns
3. **Exact hashtags** - Platform-optimized, trending + niche mix
4. **Caption** - Ready to copy-paste

Platform peak times (adjust for user's timezone):
- TikTok: 6-10am, 7-11pm (local time)
- Instagram Reels: 9am-12pm, 5-9pm
- YouTube Shorts: 12-3pm, 7-10pm

Consider:
- Weekdays vs weekends
- Target audience demographics
- Niche-specific patterns (e.g., fitness = early morning, entertainment = evening)

You can format your responses however works best - markdown, plain text, or structured content. Be flexible and conversational.`;

    // Get conversation history for context
    const { data: history } = await supabaseClient
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(20);

    // Build conversation messages
    const messages: any[] = [{ role: 'system', content: systemPrompt }];

    // Add history
    if (history && history.length > 0) {
      for (const msg of history) {
        if (msg.role === 'user') {
          // Reconstruct user message
          const userContent = msg.content.customTopic || 
            `Generate ${msg.content.platform || 'TikTok'} content for ${msg.content.niche || 'general'} (${msg.content.vibe || 'engaging'} vibe, goal: ${msg.content.goal || 'engagement'})`;
          messages.push({ role: 'user', content: userContent });
        } else if (msg.role === 'assistant') {
          // Check if structured content or plain text
          if (typeof msg.content === 'string') {
            messages.push({ role: 'assistant', content: msg.content });
          } else if (msg.content.hook) {
            // Structured viral content - format nicely
            const formatted = `Here's your viral content:\n\n🔥 **HOOK**\n${msg.content.hook}\n\n📝 **SCRIPT**\n${msg.content.script}\n\n📱 **CAPTION**\n${msg.content.caption}\n\n#️⃣ **HASHTAGS**\n${msg.content.hashtags?.join(' ') || ''}\n\n🎥 **VISUAL IDEA**\n${msg.content.visualIdea}\n\n💡 **POSTING TIP**\n${msg.content.postingTip}`;
            messages.push({ role: 'assistant', content: formatted });
          }
        }
      }
    }

    // Build current user message
    let userMessage = '';
    if (customTopic) {
      userMessage = customTopic;
    } else {
      userMessage = `Generate viral ${platform} content for ${niche} (${vibe} vibe, goal: ${goal})${timezone ? `. I'm in ${timezone}${country ? ` (${country})` : ''} - tell me the best time to post this.` : ''}`;
    }

    messages.push({ role: 'user', content: userMessage });

    console.log('Calling OnSpace AI with streaming...');

    // Call OnSpace AI with streaming enabled
    const aiResponse = await fetch(`${ONSPACE_AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ONSPACE_AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: messages,
        temperature: 0.8,
        max_tokens: 2000,
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('OnSpace AI error:', errorText);
      throw new Error(`AI service error: ${errorText}`);
    }

    // Stream the response back to client
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const reader = aiResponse.body?.getReader();
          if (!reader) throw new Error('No response body');

          const decoder = new TextDecoder();
          let buffer = '';
          let aiContent = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    aiContent += content;
                    // Send chunk to client
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ content })}

`)
                    );
                  }
                } catch (e) {
                  console.error('Parse error:', e);
                }
              }
            }
          }

          console.log('AI streaming completed, content length:', aiContent.length);

          // Try to parse as structured content, otherwise treat as plain chat
          let messageContent: any;
          
          // First, try to extract JSON for viral content
          try {
            const jsonMatch = aiContent.match(/```json\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[1].trim());
              // Check if it's viral content structure
              if (parsed.hook && parsed.script && parsed.caption) {
                messageContent = parsed;
              } else {
                messageContent = aiContent; // Plain text
              }
            } else {
              // Try parsing entire content as JSON
              try {
                const parsed = JSON.parse(aiContent.trim());
                if (parsed.hook && parsed.script && parsed.caption) {
                  messageContent = parsed;
                } else {
                  messageContent = aiContent; // Plain text
                }
              } catch {
                messageContent = aiContent; // Plain text
              }
            }
          } catch (e) {
            console.log('Not structured content, treating as chat message');
            messageContent = aiContent; // Plain text chat
          }

          // Save user message to database
          const { error: userMsgError } = await supabaseClient
            .from('messages')
            .insert({
              conversation_id: conversationId,
              role: 'user',
              content: customTopic || {
                niche,
                vibe,
                goal,
                platform,
              },
            });

          if (userMsgError) {
            console.error('Failed to save user message:', userMsgError);
          }

          // Save AI response to database
          const { error: aiMsgError } = await supabaseClient
            .from('messages')
            .insert({
              conversation_id: conversationId,
              role: 'assistant',
              content: messageContent,
            });

          if (aiMsgError) {
            console.error('Failed to save AI message:', aiMsgError);
          }

          // Generate conversation title if not already done
          const { data: conversation } = await supabaseClient
            .from('conversations')
            .select('is_title_generated')
            .eq('id', conversationId)
            .single();

          if (conversation && !conversation.is_title_generated) {
            // Generate title based on the content
            let title = 'New conversation';
            if (customTopic) {
              title = customTopic.substring(0, 50);
            } else {
              title = `${niche} ${vibe} content`.substring(0, 50);
            }

            await supabaseClient
              .from('conversations')
              .update({ 
                title,
                is_title_generated: true,
              })
              .eq('id', conversationId);
          }

          console.log('Content generated successfully');

          // Send completion signal
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error: any) {
          console.error('Streaming error:', error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error('Generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate content' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
