// ViralForge AI – Insights Edge Function
// Handles: Trend Signals, Predictive Analytics, Content Polish, Human-in-the-Loop review

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const ONSPACE_AI_BASE_URL = Deno.env.get('ONSPACE_AI_BASE_URL') ?? '';
const ONSPACE_AI_API_KEY = Deno.env.get('ONSPACE_AI_API_KEY') ?? '';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return new Response(JSON.stringify({ error: 'Missing authorization token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { action } = body;

    // ─── TREND SIGNALS ─────────────────────────────────────────────────────────
    if (action === 'trend_signals') {
      const { niche, platform } = body;
      const today = new Date();
      const month = today.toLocaleString('en-US', { month: 'long' });
      const year = today.getFullYear();
      const dayOfWeek = today.toLocaleString('en-US', { weekday: 'long' });

      const prompt = `You are a real-time social media trend analyst with deep expertise in TikTok, Instagram Reels, and YouTube Shorts. Today is ${dayOfWeek}, ${month} ${today.getDate()}, ${year}.

${niche ? `The creator's focus niche: ${niche}` : 'Analyze trends across all major niches.'}
Platform focus: ${platform || 'TikTok, Instagram Reels, YouTube Shorts'}

Your job is to identify 8 REAL emerging trend signals that are either:
1. RISING NOW (gaining traction in the past 7-14 days, not yet saturated)
2. ABOUT TO PEAK (still have 2-4 weeks before saturation)

Base your analysis on:
- Seasonal patterns for ${month} ${year}
- Cultural moments happening NOW (sports seasons, holidays, back-to-school/work cycles, award seasons, etc.)
- Known Gen Z behavioral patterns on each platform
- Cross-platform content migration patterns
- Sound/audio trend cycles
- Format innovation cycles (what format is being tested heavily now)
- Niche-specific cycles that repeat annually

For each trend, calculate a SATURATION RISK (how quickly it will become oversaturated) and a WINDOW (days left before it's overdone).

Respond ONLY with this exact JSON (no markdown):
{
  "generatedAt": "${today.toISOString()}",
  "trends": [
    {
      "id": "unique-slug",
      "title": "Trend name (5-7 words max)",
      "description": "What's happening and why it's rising right now (2-3 sentences, specific and actionable)",
      "niche": "Primary niche this serves",
      "platform": "Best platform(s) for this trend",
      "heatScore": 87,
      "saturationRisk": "LOW|MEDIUM|HIGH",
      "windowDays": 21,
      "hookAngle": "The exact psychological angle to use for this trend",
      "contentIdea": "Specific content idea using this trend (actionable, 1-2 sentences)",
      "exampleHook": "Example scroll-stopping hook for this trend (max 12 words, Gen Z voice)",
      "format": "Video format recommendation (POV, storytime, duet, etc.)",
      "why": "Why this is rising NOW specifically (tie to real-world event or pattern)",
      "audienceAge": "Primary age range",
      "timing": "Best time to post (morning/afternoon/evening and why)"
    }
  ],
  "emergingFormats": [
    {
      "format": "Format name",
      "description": "What it is and why it's working",
      "platform": "Where it's trending",
      "adoptionStage": "EARLY|GROWING|MAINSTREAM"
    }
  ],
  "warningTrends": [
    {
      "trend": "Saturated trend name",
      "reason": "Why to avoid it now"
    }
  ]
}`;

      const aiRes = await fetch(`${ONSPACE_AI_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ONSPACE_AI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.85,
          max_tokens: 3000,
        }),
      });

      if (!aiRes.ok) throw new Error(`AI error: ${await aiRes.text()}`);

      const aiData = await aiRes.json();
      const raw = aiData.choices?.[0]?.message?.content ?? '';

      let parsed: any;
      try {
        const clean = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        parsed = JSON.parse(clean);
      } catch {
        throw new Error('Failed to parse trend signals response');
      }

      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── PREDICTIVE ANALYTICS ──────────────────────────────────────────────────
    if (action === 'predictive_analytics') {
      const { niche, timezone } = body;

      // Pull real user data
      const [convRes, postsRes, profileRes] = await Promise.all([
        supabaseClient.from('conversations').select('id, title, created_at').order('created_at', { ascending: false }).limit(30),
        supabaseClient.from('scheduled_posts').select('niche, platform, scheduled_time, status, niche, hook').order('created_at', { ascending: false }).limit(50),
        supabaseClient.from('profiles').select('credits_remaining, total_generations, created_at').eq('id', user.id).single(),
      ]);

      const conversations = convRes.data || [];
      const scheduledPosts = postsRes.data || [];
      const profile = profileRes.data;

      // Aggregate real stats
      const totalGenerations = conversations.length;
      const totalScheduled = scheduledPosts.length;
      const postedCount = scheduledPosts.filter(p => p.status === 'posted').length;
      const nicheCounts: Record<string, number> = {};
      const platformCounts: Record<string, number> = {};
      const timeCounts: Record<string, number> = {};

      for (const post of scheduledPosts) {
        if (post.niche) nicheCounts[post.niche] = (nicheCounts[post.niche] || 0) + 1;
        if (post.platform) platformCounts[post.platform] = (platformCounts[post.platform] || 0) + 1;
        if (post.scheduled_time) {
          const hour = post.scheduled_time.substring(0, 2);
          timeCounts[hour] = (timeCounts[hour] || 0) + 1;
        }
      }

      const topNiche = Object.entries(nicheCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || niche || 'general';
      const topPlatform = Object.entries(platformCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'TikTok';
      const topHour = Object.entries(timeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '19';
      const consistencyScore = Math.min(100, Math.round((postedCount / Math.max(totalScheduled, 1)) * 100));
      const accountAgeDays = profile?.created_at
        ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86400000)
        : 0;

      const today = new Date();
      const dayOfWeek = today.toLocaleString('en-US', { weekday: 'long' });
      const month = today.toLocaleString('en-US', { month: 'long' });

      const prompt = `You are an advanced AI content performance predictor for short-form video creators. Today is ${dayOfWeek}, ${month} ${today.getDate()}, ${today.getFullYear()}.

REAL USER DATA:
- Total content generated: ${totalGenerations}
- Scheduled posts: ${totalScheduled}
- Posted count: ${postedCount}
- Post completion rate: ${consistencyScore}%
- Top niche: ${topNiche}
- Top platform: ${topPlatform}
- Most common posting hour: ${topHour}:00
- Account age: ${accountAgeDays} days
- Credits remaining: ${profile?.credits_remaining || 0}
- User's declared niche: ${niche || topNiche}
- Timezone: ${timezone || 'Unknown'}
- Niche distribution: ${JSON.stringify(nicheCounts)}
- Platform distribution: ${JSON.stringify(platformCounts)}

Based on this REAL data, predict performance and give strategic recommendations. Do NOT make up data — base everything on what's provided above.

Generate predictions that are:
1. Grounded in the actual usage patterns shown
2. Specific to their niche and platform
3. Tied to real content strategy principles
4. Honest about what the data shows (good and bad)

Respond ONLY with this exact JSON (no markdown):
{
  "performancePredictions": [
    {
      "format": "Content format name",
      "formatIcon": "emoji",
      "predictedReach": "Low|Medium|High|Viral",
      "confidence": 78,
      "reason": "Why this format will perform for this specific user based on their data",
      "bestFor": ["niche1", "niche2"],
      "viralScore": 72,
      "effortLevel": "Low|Medium|High",
      "recommendation": "Specific action to maximize this format"
    }
  ],
  "postingTimeAnalysis": {
    "currentPattern": "What they're doing now based on data",
    "optimalTime": "Specific best time for their niche+platform combo",
    "optimalDays": ["Tuesday", "Thursday"],
    "potentialReachIncrease": "X%",
    "reasoning": "Why these specific times work for their audience"
  },
  "nicheMomentumScore": {
    "score": 75,
    "trend": "RISING|STABLE|DECLINING",
    "reasoning": "Why this niche score, tied to real platform patterns",
    "competitors": "What others in this niche are doing right now",
    "opportunity": "Specific underserved angle in their niche"
  },
  "consistencyInsight": {
    "currentRate": ${consistencyScore},
    "targetRate": 80,
    "impact": "What improving consistency will do to their growth",
    "weeklyGoal": "Specific number of posts per week recommendation"
  },
  "contentGaps": [
    {
      "gap": "What they're NOT doing that would help",
      "opportunity": "Specific content idea to fill this gap",
      "estimatedImpact": "HIGH|MEDIUM|LOW"
    }
  ],
  "growthProjection": {
    "currentTrajectory": "Honest assessment based on data",
    "thirtyDayGoal": "Realistic 30-day goal",
    "keyLever": "The single most impactful thing they can change right now",
    "warningSign": "Any concern from the data (can be null if none)"
  },
  "aiInsight": "One paragraph of sharp, honest strategic insight about this creator's data — what's working, what needs fixing, what they should do next. Be a mentor, not a cheerleader."
}`;

      const aiRes = await fetch(`${ONSPACE_AI_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ONSPACE_AI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 2500,
        }),
      });

      if (!aiRes.ok) throw new Error(`AI error: ${await aiRes.text()}`);

      const aiData = await aiRes.json();
      const raw = aiData.choices?.[0]?.message?.content ?? '';

      let parsed: any;
      try {
        const clean = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        parsed = JSON.parse(clean);
      } catch {
        throw new Error('Failed to parse analytics response');
      }

      return new Response(JSON.stringify({
        ...parsed,
        realStats: {
          totalGenerations,
          totalScheduled,
          postedCount,
          consistencyScore,
          topNiche,
          topPlatform,
          topHour,
          accountAgeDays,
          creditsRemaining: profile?.credits_remaining || 0,
        },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── HUMAN-IN-THE-LOOP REVIEW ──────────────────────────────────────────────
    if (action === 'review_content') {
      const { hook, script, caption, hashtags, niche, vibe } = body;

      const prompt = `You are a brutally honest AI content quality reviewer. A creator just generated this content:

HOOK: ${hook}
SCRIPT: ${script}
CAPTION: ${caption}
HASHTAGS: ${hashtags?.join(' ') || ''}
NICHE: ${niche}
VIBE: ${vibe}

Your job: Perform a HUMAN-IN-THE-LOOP review. Flag EVERY place where:
1. The language sounds AI-generated / robotic / corporate
2. A statistic, fact, or claim was made that the creator needs to verify before posting
3. There's a placeholder or generic phrase that needs personal details added
4. The emotion feels performed rather than authentic
5. The Gen Z slang feels forced or off

Be surgical and specific. Quote the exact phrase that has the issue.

Then give a humanized version of JUST the hook — showing how a real creator would say it.

Respond ONLY with this exact JSON (no markdown):
{
  "overallAuthenticityScore": 72,
  "flags": [
    {
      "type": "AI_SOUNDING|UNVERIFIED_CLAIM|NEEDS_PERSONALIZATION|FORCED_SLANG|GENERIC_PHRASE",
      "severity": "HIGH|MEDIUM|LOW",
      "quotedPhrase": "exact phrase from the content",
      "issue": "What's wrong with this specific phrase",
      "suggestion": "How to fix it (be specific, give an example rewrite)"
    }
  ],
  "humanizedHook": "Rewritten hook that sounds like a real Gen Z creator, not AI",
  "personalizePrompts": [
    "Question to make the creator add their real story/voice (e.g., 'What was YOUR moment when you realized this?')"
  ],
  "factCheckItems": [
    "Any claim in the content that needs verification before posting"
  ],
  "readyToPost": false,
  "readyNote": "One-sentence honest verdict on whether this is ready to post or needs work"
}`;

      const aiRes = await fetch(`${ONSPACE_AI_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ONSPACE_AI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 1500,
        }),
      });

      if (!aiRes.ok) throw new Error(`AI error: ${await aiRes.text()}`);

      const aiData = await aiRes.json();
      const raw = aiData.choices?.[0]?.message?.content ?? '';

      let parsed: any;
      try {
        const clean = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        parsed = JSON.parse(clean);
      } catch {
        throw new Error('Failed to parse review response');
      }

      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── CONTENT POLISH ────────────────────────────────────────────────────────
    if (action === 'polish_content') {
      const { hook, script, caption, niche, vibe, creatorContext } = body;

      const prompt = `You are a top Gen Z content ghostwriter. A creator wants their AI-generated content polished to sound 100% human and authentic.

ORIGINAL CONTENT:
Hook: ${hook}
Script: ${script}
Caption: ${caption}
Niche: ${niche}
Vibe: ${vibe}
${creatorContext ? `Creator context (personal details they added): ${creatorContext}` : ''}

POLISH RULES:
1. Remove ALL AI-sounding language ("In conclusion", "It's worth noting", "Dive into", "In today's fast-paced world")
2. Add imperfection — real creators don't write perfectly. Short sentences. Fragments. Pauses.
3. Use authentic Gen Z voice without forcing slang. If it sounds cringe, don't include it.
4. Make it feel like they're talking to a friend on FaceTime
5. Add micro-emotional beats (hesitations, realizations, emphasis)
6. Keep it tight — cut anything that doesn't add impact
7. The hook MUST be under 12 words and feel like a REAL person said it while recording
8. If the creator added personal context, weave it in naturally
9. Add "real talk" moments — a brief aside or acknowledgment that real creators often throw in
10. Caption should feel casual and scroll-stopping, not like a blog post

Output polished versions that feel completely human. Not "better AI", but actually human.

Respond ONLY with this exact JSON (no markdown):
{
  "polishedHook": "The human-sounding hook",
  "polishedScript": "The polished script with natural breaks and imperfections",
  "polishedCaption": "The caption that sounds like a real person typed it",
  "changesExplained": [
    "What was changed and why (specific, max 5 items)"
  ],
  "humanityScore": {
    "before": 45,
    "after": 91
  },
  "voiceTips": [
    "Tip for the creator to make this even more their own voice"
  ]
}`;

      const aiRes = await fetch(`${ONSPACE_AI_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ONSPACE_AI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.9,
          max_tokens: 1500,
        }),
      });

      if (!aiRes.ok) throw new Error(`AI error: ${await aiRes.text()}`);

      const aiData = await aiRes.json();
      const raw = aiData.choices?.[0]?.message?.content ?? '';

      let parsed: any;
      try {
        const clean = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        parsed = JSON.parse(clean);
      } catch {
        throw new Error('Failed to parse polish response');
      }

      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── HASHTAG GENERATOR ────────────────────────────────────────────────────
    if (action === 'hashtag_generator') {
      const { topic, platform, niche } = body;
      const today = new Date();
      const month = today.toLocaleString('en-US', { month: 'long' });
      const year = today.getFullYear();
      const dayOfWeek = today.toLocaleString('en-US', { weekday: 'long' });
      const weekNumber = Math.ceil(today.getDate() / 7);

      const prompt = `You are a hashtag intelligence analyst for short-form content creators. You have deep real-time knowledge of trending hashtags across TikTok, Instagram Reels, and YouTube Shorts.

Today is ${dayOfWeek}, ${month} ${today.getDate()}, ${year} (week ${weekNumber} of the month).
Content topic: "${topic}"
Platform focus: ${platform || 'TikTok'}
${niche ? `Creator niche: ${niche}` : ''}

Your task: Generate hashtag intelligence based on REAL platform trends for ${month} ${year}.

Analyze:
1. **PRIMARY hashtags** — High-reach tags (1M+ posts) that are currently surging for this topic right now
2. **NICHE hashtags** — Mid-range tags (50K-500K posts) specific to the topic with less competition
3. **COMMUNITY hashtags** — Challenge, trend, and community tags driving engagement loops in ${month} ${year}
4. **AVOID list** — Tags that are oversaturated or declining right now

For each hashtag calculate:
- viralScore: 0-100 (how likely it is to spike views RIGHT NOW based on current trend momentum)
- trend: RISING (gaining traction), STABLE (consistent performer), DECLINING (losing momentum)
- peakTime: Best time of day to post with this tag (e.g., "7-9pm weekdays")
- estimatedViews: Estimated view range per post using this tag (e.g., "50K-200K")
- competition: LOW / MEDIUM / HIGH (how saturated the tag is)
- category: What type of tag this is (e.g., "Trending challenge", "Niche community", "Broad discovery")
- reason: ONE specific sentence explaining why this tag will work for this topic RIGHT NOW

Consider for ${month} ${year}:
- Current seasonal trends (summer content, back-to-school, holidays, etc.)
- Platform algorithm preferences as of 2026
- Cross-platform trending patterns
- Gen Z content consumption patterns in 2026
- Hashtag saturation cycles

Best combination strategy:
- Mix 3-5 primary + 4-6 niche + 2-3 community tags
- Recommend optimal total count per platform
- Flag any tags to absolutely avoid

Respond ONLY with this exact JSON (no markdown):
{
  "generatedAt": "${today.toISOString()}",
  "topic": "${topic}",
  "platform": "${platform || 'TikTok'}",
  "primaryHashtags": [
    {
      "tag": "hashtag without #",
      "viralScore": 87,
      "trend": "RISING",
      "peakTime": "7-10pm weekdays",
      "estimatedViews": "100K-500K",
      "competition": "HIGH",
      "category": "Broad discovery",
      "reason": "Specific reason why this is spiking for this topic right now"
    }
  ],
  "nicheHashtags": [...same structure, 6-8 tags],
  "communityHashtags": [...same structure, 4-5 tags],
  "avoidHashtags": [
    { "tag": "oversaturated", "reason": "Why to avoid this tag right now" }
  ],
  "optimalCount": 12,
  "bestCombination": ["tag1", "tag2", "tag3", "...up to 12 tags"],
  "strategyNote": "One paragraph explaining the hashtag strategy — why this specific combination will maximize reach for this topic on this platform right now",
  "trendingContext": "2-3 sentences describing what's trending on ${platform || 'TikTok'} in ${month} ${year} that's relevant to this topic — cultural moments, viral formats, algorithm changes"
}`;

      const aiRes = await fetch(`${ONSPACE_AI_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ONSPACE_AI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.8,
          max_tokens: 4000,
        }),
      });

      if (!aiRes.ok) throw new Error(`AI error: ${await aiRes.text()}`);

      const aiData = await aiRes.json();
      const raw = aiData.choices?.[0]?.message?.content ?? '';

      let parsed: any;
      try {
        const clean = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        parsed = JSON.parse(clean);
      } catch {
        throw new Error('Failed to parse hashtag response');
      }

      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('generate-insights error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
