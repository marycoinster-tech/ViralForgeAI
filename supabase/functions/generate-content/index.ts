
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
  contentUrl?: string;
  remixIteration?: number;
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
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get request body
    const body: GenerateRequest = await req.json();
    const { conversationId, niche, vibe, goal, platform, customTopic, timezone, country, contentUrl, remixIteration = 0 } = body;

    console.log(`Generating content for user ${user.id}, conversation ${conversationId}`);

    // Get user's name for personalization
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single();

    const username = profile?.username || 'creator';

    // Fetch content from URL if provided
    let fetchedContent = '';
    let contentSource = '';
    let contentMetadata = '';
    let imageUrls: string[] = [];
    let videoInfo = '';
    let imageAnalysis = '';
    if (contentUrl) {
      try {
        console.log('Fetching content from URL:', contentUrl);
        
        // Detect source from URL
        const urlObj = new URL(contentUrl);
        const domain = urlObj.hostname.replace('www.', '').toLowerCase();
        
        if (domain.includes('twitter.com') || domain.includes('x.com')) {
          contentSource = 'Twitter/X';
        } else if (domain.includes('reddit.com')) {
          contentSource = 'Reddit';
        } else if (domain.includes('facebook.com')) {
          contentSource = 'Facebook';
        } else if (domain.includes('instagram.com')) {
          contentSource = 'Instagram';
        } else if (domain.includes('tiktok.com')) {
          contentSource = 'TikTok';
        } else if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
          contentSource = 'YouTube';
        } else {
          contentSource = domain;
        }
        
        const urlResponse = await fetch(contentUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        
        const contentText = await urlResponse.text();
        
        // Extract metadata (title, description, og tags, video info)
        const titleMatch = contentText.match(/<title[^>]*>([^<]+)<\/title>/i);
        const descMatch = contentText.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
        const ogTitleMatch = contentText.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
        const ogDescMatch = contentText.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
        const ogTypeMatch = contentText.match(/<meta[^>]*property=["']og:type["'][^>]*content=["']([^"']+)["']/i);
        const ogImageMatch = contentText.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
        const videoMatch = contentText.match(/<meta[^>]*property=["']og:video["'][^>]*content=["']([^"']+)["']/i);
        const videoUrlMatch = contentText.match(/<meta[^>]*property=["']og:video:url["'][^>]*content=["']([^"']+)["']/i);
        
        // Extract images from page (og:image + img tags)
        if (ogImageMatch && ogImageMatch[1]) {
          imageUrls.push(ogImageMatch[1]);
        }
        
        // Extract additional images from img tags (limit to 3 for performance)
        const imgMatches = contentText.matchAll(/<img[^>]+src=["']([^"']+)["']/gi);
        for (const match of imgMatches) {
          const imgUrl = match[1];
          // Skip small images, icons, tracking pixels
          if (!imgUrl.includes('icon') && !imgUrl.includes('logo') && !imgUrl.includes('pixel') && 
              !imgUrl.includes('tracking') && imageUrls.length < 3) {
            // Make relative URLs absolute
            try {
              const absoluteUrl = new URL(imgUrl, contentUrl).href;
              if (!imageUrls.includes(absoluteUrl)) {
                imageUrls.push(absoluteUrl);
              }
            } catch (e) {
              // Skip invalid URLs
            }
          }
          if (imageUrls.length >= 3) break;
        }
        
        // Build metadata summary
        const title = ogTitleMatch?.[1] || titleMatch?.[1] || 'Unknown';
        const description = ogDescMatch?.[1] || descMatch?.[1] || '';
        const contentType = ogTypeMatch?.[1] || 'webpage';
        const hasVideo = !!videoMatch || !!videoUrlMatch || contentType.includes('video');
        const hasImage = imageUrls.length > 0;
        
        if (hasVideo) {
          videoInfo = `**Video URL:** ${videoMatch?.[1] || videoUrlMatch?.[1] || 'Detected but URL unavailable'}`;
        }
        
        contentMetadata = `**Content Type:** ${hasVideo ? '🎥 Video Content' : hasImage ? '🖼️ Image Content' : '📄 Article'}
**Title:** ${title}
**Description:** ${description}
**Source:** ${contentSource}
${hasImage ? `**Images Found:** ${imageUrls.length} image(s)` : ''}
${videoInfo}`;
        
        // Extract meaningful text (improved HTML stripping)
        fetchedContent = contentText
          .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
          .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 8000); // Increased to 8000 chars for better context
        
        console.log(`Content fetched from ${contentSource}, type: ${contentType}, images: ${imageUrls.length}, length:`, fetchedContent.length);
      } catch (error) {
        console.error('Failed to fetch URL content:', error);
        fetchedContent = '[Failed to fetch content from URL - the site may be blocking automated access]';
        contentMetadata = `**Error:** Could not access content from ${contentSource}`;
      }
    }

    // Analyze images with vision BEFORE building system prompt
    if (imageUrls.length > 0) {
      console.log(`Analyzing ${imageUrls.length} images with vision model...`);
      try {
        // Use vision-capable model to analyze images
        const visionMessages = [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are a content analysis expert. Analyze these images from ${contentSource} and describe:

1. **Visual Content:** What do you see? (People, objects, scenes, text overlays)
2. **Style & Aesthetics:** Color palette, composition, editing style
3. **Hook/Attention Grabbers:** What catches the eye immediately?
4. **Emotional Tone:** What feeling does it convey?
5. **Content Type:** Is this a meme, tutorial, product shot, lifestyle content, etc?
6. **Viral Potential:** What makes this shareable or engaging?

Be specific and detailed. This is for content strategy analysis.`
              },
              ...imageUrls.slice(0, 3).map(url => ({
                type: 'image_url',
                image_url: { url }
              }))
            ]
          }
        ];

        const visionResponse = await fetch(`${ONSPACE_AI_BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ONSPACE_AI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'openai/gpt-4o',
            messages: visionMessages,
            temperature: 0.7,
            max_tokens: 1000,
          }),
        });

        if (visionResponse.ok) {
          const visionData = await visionResponse.json();
          imageAnalysis = visionData.choices?.[0]?.message?.content || '';
          console.log('Image analysis completed, length:', imageAnalysis.length);
        } else {
          console.error('Vision API error:', await visionResponse.text());
          imageAnalysis = '[Vision analysis failed - using text-only analysis]';
        }
      } catch (error) {
        console.error('Image analysis error:', error);
        imageAnalysis = '[Image analysis unavailable]';
      }
    }

    // Build system prompt with enhanced intelligence and context awareness
    const systemPrompt = `You are ViralForge AI, an exceptionally intelligent AI assistant and expert viral content strategist for Gen Z creators.

The user's name is ${username}. Chat with them naturally like a brilliant, insightful friend who truly understands content creation.
${timezone ? `\nUser's timezone: ${timezone}${country ? ` (${country})` : ''}` : ''}

🧠 **CORE INTELLIGENCE PRINCIPLES**

1. **Contextual Awareness**: Always understand the context before responding
   - If user asks a question → Answer it thoughtfully
   - If user shares a link → Analyze it deeply and provide insights
   - If user wants content → Generate structured viral content
   - If user is exploring → Offer strategic suggestions

2. **Don't Assume Intent**: NEVER randomly generate viral content unless explicitly asked
   - Chat naturally and intelligently
   - Offer ideas and suggestions conversationally
   - Only create structured content (hook, script, caption) when user specifically requests it

3. **Proactive Intelligence**:
   - If timezone/region unknown and user asks about posting times → Ask for their location first
   - If analyzing content without context → Ask what they want to learn from it
   - If unclear request → Clarify before generating

🌍 **LANGUAGE SUPPORT**
You understand and respond naturally to:
- English (standard, slang, Gen Z)
- Nigerian Pidgin English ("wetin dey sup?", "make we gist", "e don do", "no wahala")
- Code-switching between both

Match the user's language style perfectly.

💬 **CONVERSATION MODES**

**Mode 1: General Chat** (Default)
- Answer questions with depth and insight
- Share content strategy and creative direction
- Discuss ideas, trends, and tactics
- Be encouraging, smart, and real
- Use conversational markdown formatting

**Mode 2: Content Analysis** (When user shares a link)
- Analyze deeply what makes it work or not
- Identify hooks, pacing, emotional triggers
- Explain viral mechanics at play
- Offer constructive feedback
- Only remix if explicitly asked

**Mode 3: Viral Content Generation** (Only when explicitly requested)
- Generate scroll-stopping hooks (0-2s)
- Write viral scripts (7-15s)
- Create authentic Gen Z captions
- Suggest platform-optimized hashtags
- Recommend visuals and posting strategy
- **ALWAYS include optimal posting time based on timezone**

📱 **TIMEZONE & POSTING INTELLIGENCE**

${timezone && country ? `User is in ${timezone} (${country}).

Platform peak times for ${country}:
- TikTok: 6-10am, 7-11pm (${timezone})
- Instagram Reels: 9am-12pm, 5-9pm (${timezone})
- YouTube Shorts: 12-3pm, 7-10pm (${timezone})

Adjust recommendations based on:
- Day of week (weekday vs weekend)
- Target audience demographics
- Niche-specific patterns (fitness = morning, entertainment = evening)
- Local cultural timing (e.g., Nigerian creators → post when US/UK awake for global reach)` : `⚠️ **User's timezone/region is unknown.**

If they ask about posting times or want content strategy:
1. First ask: "What region/country are you in? This helps me recommend the best posting times for your audience."
2. Once you know → Give specific timezone-adjusted recommendations

Don't guess or give generic advice without this info.`}

🔗 **DEEP LINK ANALYSIS**

${fetchedContent ? `📊 **CONTENT ANALYSIS FROM URL:**

${contentMetadata}

${imageAnalysis ? `🖼️ **VISUAL ANALYSIS (AI Vision):**

${imageAnalysis}

---
` : ''}

**Text Content Preview:**
${fetchedContent.substring(0, 2000)}${fetchedContent.length > 2000 ? '... (truncated)' : ''}

---

**Your Analysis Task:**

${imageAnalysis ? `✅ **You have SEEN the actual images/visuals** from this content. Use that visual understanding in your analysis.
` : ''}

1. **Content Type Identification:** What is this? (Video, image post, article, meme, tutorial, etc.)
2. **Hook Analysis:** What grabs attention in the first 2 seconds? (Visual or text)
3. **Viral Mechanics:** Why would someone share this? What's the psychological trigger?
4. **Strengths:** What works really well?
5. **Weaknesses:** What could be improved?
6. **Audience Fit:** Who is this for? (Age, interests, platform)
7. **Actionable Insights:** Specific takeaways the user can apply

${imageAnalysis ? `⚠️ **IMPORTANT:** Base your analysis on what you ACTUALLY SAW in the images, not assumptions. Be specific about visual elements.
` : ''}

Only offer to remix if user explicitly asks. Focus on deep, intelligent analysis first.` : ''}

${remixIteration > 0 ? `🔄 **REMIX ITERATION ${remixIteration}**

This is remix iteration ${remixIteration}. Create a version that's ${remixIteration * 30}% better than the original.

Focus areas:
${remixIteration === 1 ? '- Stronger hook (curiosity, shock value)\n- Better emotional impact\n- Clearer value proposition' : ''}
${remixIteration === 2 ? '- Advanced pacing and retention\n- Pattern interrupts and loops\n- Viral psychology triggers' : ''}
${remixIteration >= 3 ? '- Platform-specific optimization\n- Multi-layered engagement tactics\n- Maximum viral potential' : ''}` : ''}

🎯 **RESPONSE QUALITY STANDARDS**

- Be intellectually rigorous - think deeply before responding
- Show your reasoning when helpful
- Admit when you need more context
- Never give generic advice - always be specific
- Format responses for clarity (markdown, spacing, structure)
- Be confident but not arrogant
- Stay Gen Z authentic - no corporate speak

**Remember:** You're not just a content generator. You're a strategic partner who helps creators think smarter, create better, and go viral.

Now respond intelligently based on what the user actually needs.`;

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
          const userContent = typeof msg.content === 'string' 
            ? msg.content 
            : msg.content.customTopic || 
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

    // Detect if user wants video generation
    const videoKeywords = ['generate video', 'create video', 'make video', 'ai video', 'video script'];
    const isVideoRequest = customTopic && videoKeywords.some(kw => customTopic.toLowerCase().includes(kw));

    // If video generation requested, provide guidance
    if (isVideoRequest) {
      const videoGuidance = `I can help you generate AI videos! Here's how:

🎬 **Video Generation Commands:**

1. **Simple video:**
   "Generate a 10-second video of a cat playing with a ball"

2. **Specify style:**
   "Create a 15-second cartoon video of a baby laughing"

3. **Real human video:**
   "Make a 12-second realistic video of a person walking in a park"

**Features:**
- Max duration: 15 seconds
- Formats: Landscape (16:9), Portrait (9:16), Square (1:1)
- Styles: Realistic, cartoon, anime, 3D animation
- Uses: Sora & Veo AI models

**To generate a video, use this format:**
\`\`\`
/video [description] [duration]s [format]
\`\`\`

Example:
\`\`\`
/video A cat playing with yarn in slow motion 10s portrait
\`\`\`

💡 **Pro tip:** Be specific about what you want to see - the more detail, the better the result!

Ready to create your first AI video? Just use the /video command! 🚀`;

      // Send response directly
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          // Stream the guidance message
          for (const char of videoGuidance) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content: char })}\n\n`)
            );
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        },
      });

      // Save messages
      await supabaseClient.from('messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content: customTopic,
      });

      await supabaseClient.from('messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: videoGuidance,
      });

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Build current user message
    let userMessage = '';
    if (contentUrl && customTopic) {
      userMessage = customTopic; // User's analysis/remix request
    } else if (contentUrl) {
      userMessage = `Analyze this content from the URL I shared${remixIteration > 0 ? ` and create remix iteration ${remixIteration} (${remixIteration * 30}% better than original)` : ''}.`;
    } else if (customTopic) {
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
                      encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
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
