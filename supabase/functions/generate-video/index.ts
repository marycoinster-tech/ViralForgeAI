// ViralForge AI - Video Generation Edge Function
// Handles video generation with Sora and Veo models

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const ONSPACE_AI_BASE_URL = Deno.env.get('ONSPACE_AI_BASE_URL') ?? '';
const ONSPACE_AI_API_KEY = Deno.env.get('ONSPACE_AI_API_KEY') ?? '';

interface CreateVideoRequest {
  action: 'create';
  model?: string; // e.g., 'openai/sora-2', 'google/veo-3.1-fast'
  prompt: string;
  duration?: number; // Max 15 seconds
  aspectRatio?: '16:9' | '9:16' | '1:1';
  referenceImage?: string;
}

interface CheckVideoRequest {
  action: 'check';
  predictionId: string;
}

type VideoRequest = CreateVideoRequest | CheckVideoRequest;

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

    const body: VideoRequest = await req.json();
    console.log('Video request:', body.action);

    if (body.action === 'create') {
      // Create video generation task
      const { model = 'openai/sora-2', prompt, duration = 10, aspectRatio = '16:9', referenceImage } = body;
      
      // Parse provider and model name first
      const [provider, modelName] = model.split('/');
      
      if (!provider || !modelName) {
        throw new Error(`Invalid model format: ${model}. Expected format: provider/model-name`);
      }

      // Map duration to model-specific valid values
      let safeDuration: number;
      
      if (provider === 'openai') {
        // Sora only accepts: 4, 8, or 12 seconds
        if (duration <= 6) {
          safeDuration = 4;
        } else if (duration <= 10) {
          safeDuration = 8;
        } else {
          safeDuration = 12;
        }
      } else if (provider === 'google') {
        // Veo supports: 4, 8, 12, 16, 20, 24, 28 seconds
        const veoValidDurations = [4, 8, 12, 16, 20, 24, 28];
        safeDuration = veoValidDurations.reduce((prev, curr) => 
          Math.abs(curr - duration) < Math.abs(prev - duration) ? curr : prev
        );
      } else {
        // Default fallback
        safeDuration = Math.min(Math.max(4, duration), 12);
      }
      
      console.log(`Creating video with ${model}, requested: ${duration}s, using: ${safeDuration}s, aspect ratio: ${aspectRatio}, prompt: "${prompt}"`);
      
      // Build request based on model series
      let inputParams: any;
      
      if (provider === 'openai') {
        // Sora series
        inputParams = {
          prompt,
          seconds: safeDuration,
          aspect_ratio: aspectRatio === '16:9' ? 'landscape' : aspectRatio === '9:16' ? 'portrait' : 'square',
        };
        if (referenceImage) {
          inputParams.input_reference = referenceImage;
        }
      } else if (provider === 'google') {
        // Veo series
        inputParams = {
          prompt,
          duration: safeDuration,
          resolution: '1080p',
          aspect_ratio: aspectRatio,
        };
        if (referenceImage) {
          inputParams.reference_images = [referenceImage];
        }
      } else {
        throw new Error(`Unsupported provider: ${provider}`);
      }

      // Call OnSpace AI to create prediction
      const createResponse = await fetch(
        `${ONSPACE_AI_BASE_URL}/models/${provider}/${modelName}/predictions`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ONSPACE_AI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ input: inputParams }),
        }
      );

      if (!createResponse.ok) {
        const errorStatus = createResponse.status;
        const errorText = await createResponse.text();
        console.error(`OnSpace AI error (${errorStatus}):`, errorText);
        
        // Parse error message if JSON
        let errorMessage = errorText;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorJson.message || errorText;
        } catch {
          // Not JSON, use raw text
        }
        
        throw new Error(`Video generation failed: ${errorMessage}`);
      }

      const prediction = await createResponse.json();
      console.log('Prediction created:', prediction.id);

      return new Response(
        JSON.stringify({
          id: prediction.id,
          status: prediction.status,
          message: 'Video generation started. This may take 1-3 minutes.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (body.action === 'check') {
      // Check video generation status
      const { predictionId } = body;
      
      console.log('Checking status for:', predictionId);

      const statusResponse = await fetch(
        `${ONSPACE_AI_BASE_URL}/predictions/${predictionId}`,
        {
          headers: {
            'Authorization': `Bearer ${ONSPACE_AI_API_KEY}`,
          },
        }
      );

      if (!statusResponse.ok) {
        const errorStatus = statusResponse.status;
        const errorText = await statusResponse.text();
        console.error(`Status check error (${errorStatus}):`, errorText);
        throw new Error(`Failed to check video status: ${errorText}`);
      }

      const status = await statusResponse.json();
      console.log('Status:', status.status, 'Progress:', status.progress);

      // Handle different statuses
      if (status.status === 'failed' || status.status === 'canceled') {
        return new Response(
          JSON.stringify({
            id: predictionId,
            status: status.status,
            error: status.error || 'Video generation failed',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (status.status === 'starting' || status.status === 'processing') {
        return new Response(
          JSON.stringify({
            id: predictionId,
            status: status.status,
            progress: status.progress || 0,
            message: status.status === 'starting' ? 'Initializing...' : `Generating video... ${status.progress || 0}%`,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (status.status === 'succeeded') {
        // Download and store the video
        console.log('Video ready, downloading from:', status.output);

        if (!status.output) {
          throw new Error('No video output URL provided by the model');
        }

        const videoResponse = await fetch(status.output);
        
        if (!videoResponse.ok) {
          throw new Error(`Failed to download video: ${videoResponse.status} ${videoResponse.statusText}`);
        }
        const arrayBuffer = await videoResponse.arrayBuffer();
        const videoBlob = new Blob([arrayBuffer], { type: 'video/mp4' });

        // Upload to Supabase Storage
        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const fileName = `${user.id}/${predictionId}.mp4`;

        const { error: uploadError } = await supabaseAdmin.storage
          .from('videos')
          .upload(fileName, videoBlob, {
            contentType: 'video/mp4',
            upsert: true,
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw uploadError;
        }

        // Get public URL
        const { data: { publicUrl } } = supabaseAdmin.storage
          .from('videos')
          .getPublicUrl(fileName);

        console.log('Video uploaded successfully:', publicUrl);

        return new Response(
          JSON.stringify({
            id: predictionId,
            status: 'succeeded',
            storage_url: publicUrl,
            storage_path: fileName,
            message: 'Video generated successfully!',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Unknown status
      return new Response(
        JSON.stringify({
          id: predictionId,
          status: status.status,
          message: 'Unknown status',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      throw new Error('Invalid action. Use "create" or "check"');
    }

  } catch (error: any) {
    console.error('Video generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Video generation failed' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
