// ViralForge AI - Hook Battle & Viral DNA Edge Function

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const ONSPACE_AI_BASE_URL = Deno.env.get('ONSPACE_AI_BASE_URL') ?? '';
const ONSPACE_AI_API_KEY = Deno.env.get('ONSPACE_AI_API_KEY') ?? '';

interface HookBattleRequest {
  action: 'hook_battle';
  topic: string;
  niche: string;
  vibe: string;
}

interface ViralDNARequest {
  action: 'viral_dna';
  inputUrl?: string;
  inputDescription: string;
  niche: string;
}

interface VoteRequest {
  action: 'vote';
  battleId: string;
  hookIndex: number;
}

type RequestBody = HookBattleRequest | ViralDNARequest | VoteRequest;

const HOOK_BATTLE_COST = 2;
const VIRAL_DNA_COST = 3;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return new Response(JSON.stringify({ error: 'Missing authorization token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: RequestBody = await req.json();

    // ── VOTE ACTION (no credits needed) ──────────────────────────────
    if (body.action === 'vote') {
      const { battleId, hookIndex } = body as VoteRequest;

      const { error: voteError } = await supabaseClient
        .from('hook_votes')
        .insert({ battle_id: battleId, voter_id: user.id, hook_index: hookIndex });

      if (voteError) {
        if (voteError.code === '23505') {
          return new Response(JSON.stringify({ error: 'Already voted on this battle' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        throw voteError;
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── CHECK CREDITS ────────────────────────────────────────────────
    const cost = body.action === 'hook_battle' ? HOOK_BATTLE_COST : VIRAL_DNA_COST;

    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('credits_remaining')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) throw new Error('Could not fetch user profile');

    if (profile.credits_remaining < cost) {
      return new Response(
        JSON.stringify({ error: 'insufficient_credits', creditsNeeded: cost, creditsHave: profile.credits_remaining }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── HOOK BATTLE ──────────────────────────────────────────────────
    if (body.action === 'hook_battle') {
      const { topic, niche, vibe } = body as HookBattleRequest;

      const prompt = `You are the world's #1 viral hook writer for TikTok, Reels, and Shorts.

Generate EXACTLY 5 scroll-stopping hooks for:
- Topic: ${topic}
- Niche: ${niche}
- Vibe: ${vibe}

Each hook MUST use a different psychological trigger:
1. CURIOSITY – make them desperate to know more
2. SHOCK – drop a fact or stat that breaks their brain
3. RELATABILITY – feel like it was written about them personally
4. CONTROVERSY – challenge a common belief or cause debate
5. FOMO – make them feel like they're missing out right now

Rules:
- Max 12 words per hook
- No emojis in the hook text itself
- Gen Z language, TikTok-native phrasing
- No corporate speak, no blog intros
- Each hook must feel like a different creator wrote it
- Make them feel urgent, personal, or shocking

Also pick which hook you predict will go MOST viral and explain why in 1-2 sentences.

Respond ONLY with this exact JSON (no markdown, no extra text):
{
  "hooks": [
    {
      "text": "hook text here",
      "trigger": "CURIOSITY",
      "emotion": "Desperate curiosity",
      "emoji": "🤔",
      "why": "One sentence on why this hook works"
    },
    {
      "text": "hook text here",
      "trigger": "SHOCK",
      "emotion": "Brain-breaking shock",
      "emoji": "😱",
      "why": "One sentence on why this hook works"
    },
    {
      "text": "hook text here",
      "trigger": "RELATABILITY",
      "emotion": "Deep personal connection",
      "emoji": "😭",
      "why": "One sentence on why this hook works"
    },
    {
      "text": "hook text here",
      "trigger": "CONTROVERSY",
      "emotion": "Heated debate fuel",
      "emoji": "🔥",
      "why": "One sentence on why this hook works"
    },
    {
      "text": "hook text here",
      "trigger": "FOMO",
      "emotion": "Intense FOMO",
      "emoji": "⚡",
      "why": "One sentence on why this hook works"
    }
  ],
  "aiPickIndex": 0,
  "aiPickReason": "Why the AI picked this hook as the highest virality prediction"
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
      const rawContent = aiData.choices?.[0]?.message?.content ?? '';

      // Parse JSON – strip markdown fences if present
      let parsed: any;
      try {
        const clean = rawContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        parsed = JSON.parse(clean);
      } catch {
        throw new Error('Failed to parse AI hook response');
      }

      // Deduct credits
      await supabaseClient
        .from('profiles')
        .update({ credits_remaining: profile.credits_remaining - cost })
        .eq('id', user.id);

      // Save battle to DB
      const { data: battle, error: battleError } = await supabaseClient
        .from('hook_battles')
        .insert({
          user_id: user.id,
          topic,
          niche,
          vibe,
          hooks: parsed.hooks,
          ai_recommended_index: parsed.aiPickIndex ?? 0,
          is_public: true,
        })
        .select('id')
        .single();

      if (battleError) throw battleError;

      return new Response(
        JSON.stringify({ battle_id: battle.id, hooks: parsed.hooks, aiPickIndex: parsed.aiPickIndex, aiPickReason: parsed.aiPickReason }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── VIRAL DNA ────────────────────────────────────────────────────
    if (body.action === 'viral_dna') {
      const { inputUrl, inputDescription, niche } = body as ViralDNARequest;

      // If URL provided, try to fetch page metadata
      let fetchedContext = '';
      if (inputUrl) {
        try {
          const urlRes = await fetch(inputUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ViralForgeBot/1.0)' },
          });
          const html = await urlRes.text();
          const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? '';
          const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)?.[1] ?? '';
          const stripped = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 3000);
          fetchedContext = `URL: ${inputUrl}\nPage Title: ${title}\nDescription: ${ogDesc}\nContent: ${stripped}`;
        } catch {
          fetchedContext = `URL: ${inputUrl} (could not fetch – analysing description only)`;
        }
      }

      const context = fetchedContext || inputDescription;

      const prompt = `You are the world's best viral content forensics expert. You reverse-engineer WHY content goes viral down to the molecular level.

CONTENT TO ANALYSE:
${context}

USER'S NICHE: ${niche}

Your job is to perform a full VIRAL DNA EXTRACTION. Analyse with the precision of a scientist and the instincts of a top creator.

Respond ONLY with this exact JSON structure (no markdown, no extra text):
{
  "viralScore": 85,
  "hookPattern": {
    "type": "Pattern interrupt / Question / Shock stat / etc",
    "firstTwoSeconds": "Exactly what happens in first 2 seconds",
    "curiosityGap": "What open loop does it create?"
  },
  "emotionTriggers": [
    { "emotion": "Curiosity", "intensity": 9, "moment": "When it hits in the content" },
    { "emotion": "FOMO", "intensity": 7, "moment": "When it hits in the content" }
  ],
  "pacingStructure": {
    "rhythm": "Fast / Medium / Slow",
    "keyMoments": ["First reveal at 3s", "Payoff at 12s"],
    "retentionTactic": "How it keeps viewers watching"
  },
  "loopMechanic": {
    "hasLoop": true,
    "loopType": "Open question / Cliffhanger / Rewatch reward",
    "description": "Why people rewatch or share"
  },
  "psychologicalFormula": "The exact formula in simple terms: Hook → Context → Payoff → Loop",
  "strengths": ["Strength 1", "Strength 2", "Strength 3"],
  "weaknesses": ["What could be stronger"],
  "targetAudience": {
    "age": "18-24",
    "mindset": "Describe their headspace when they see this",
    "shareTrigger": "Why they'd share it"
  },
  "yourVersion": {
    "hook": "Rewritten hook for the user's niche: ${niche}",
    "script": "7-15 second script using the same viral formula but for ${niche}",
    "caption": "Gen Z caption with authentic voice",
    "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5"],
    "visualIdea": "Visual direction for their version",
    "postingTip": "Specific tip for maximum reach"
  },
  "viralScoreBreakdown": {
    "hookStrength": 85,
    "emotionalImpact": 80,
    "shareability": 75,
    "retentionPotential": 90,
    "trendAlignment": 70
  }
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
          max_tokens: 2500,
        }),
      });

      if (!aiRes.ok) throw new Error(`AI error: ${await aiRes.text()}`);

      const aiData = await aiRes.json();
      const rawContent = aiData.choices?.[0]?.message?.content ?? '';

      let parsed: any;
      try {
        const clean = rawContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        parsed = JSON.parse(clean);
      } catch {
        throw new Error('Failed to parse AI Viral DNA response');
      }

      // Deduct credits
      await supabaseClient
        .from('profiles')
        .update({ credits_remaining: profile.credits_remaining - cost })
        .eq('id', user.id);

      // Save analysis
      const { data: analysis, error: analysisError } = await supabaseClient
        .from('viral_dna_analyses')
        .insert({
          user_id: user.id,
          input_url: inputUrl || null,
          input_description: inputDescription,
          dna_result: parsed,
          niche,
        })
        .select('id')
        .single();

      if (analysisError) throw analysisError;

      return new Response(
        JSON.stringify({ analysis_id: analysis.id, result: parsed }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('generate-hooks error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
