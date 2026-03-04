// ViralForge AI - Payment Processing Edge Function
// Handles Paystack payment initialization and webhook verification

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY') ?? '';

interface InitializePaymentRequest {
  action: 'initialize';
  packId: string;
}

interface VerifyPaymentRequest {
  action: 'verify';
  reference: string;
}

type PaymentRequest = InitializePaymentRequest | VerifyPaymentRequest;

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

    const body: PaymentRequest = await req.json();
    console.log('Payment request:', body.action);

    if (body.action === 'initialize') {
      // Initialize payment
      const { packId } = body;

      // Get credit pack details
      const { data: pack, error: packError } = await supabaseClient
        .from('credit_packs')
        .select('*')
        .eq('id', packId)
        .eq('is_active', true)
        .single();

      if (packError || !pack) {
        return new Response(
          JSON.stringify({ error: 'Credit pack not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get user profile
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        return new Response(
          JSON.stringify({ error: 'User profile not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generate unique reference
      const reference = `VF-${Date.now()}-${user.id.slice(0, 8)}`;

      // Create transaction record (pending)
      const { error: txError } = await supabaseClient
        .from('transactions')
        .insert({
          user_id: user.id,
          pack_id: packId,
          credits_purchased: pack.credits,
          amount_cents: pack.price_cents,
          currency: pack.currency,
          payment_provider: 'paystack',
          payment_reference: reference,
          payment_status: 'pending',
        });

      if (txError) {
        console.error('Transaction creation error:', txError);
        return new Response(
          JSON.stringify({ error: 'Failed to create transaction' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Initialize Paystack transaction
      // Note: Paystack expects amounts in kobo for NGN (1 Naira = 100 kobo)
      const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: profile.email,
          amount: pack.price_cents, // Amount in kobo (for NGN) or cents (for other currencies)
          currency: pack.currency.toUpperCase(), // Must be uppercase (NGN, USD, etc.)
          reference,
          metadata: {
            user_id: user.id,
            pack_id: packId,
            credits: pack.credits,
            pack_name: pack.name,
          },
        }),
      });

      if (!paystackResponse.ok) {
        const errorText = await paystackResponse.text();
        console.error('Paystack initialization error:', errorText);
        
        // Update transaction to failed
        await supabaseClient
          .from('transactions')
          .update({ payment_status: 'failed' })
          .eq('payment_reference', reference);

        return new Response(
          JSON.stringify({ error: 'Failed to initialize payment with Paystack' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const paystackData = await paystackResponse.json();
      console.log('Paystack initialized:', reference);

      return new Response(
        JSON.stringify({
          reference,
          authorization_url: paystackData.data.authorization_url,
          access_code: paystackData.data.access_code,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (body.action === 'verify') {
      // Verify payment
      const { reference } = body;

      console.log('Verifying payment:', reference);

      // Verify with Paystack
      const paystackResponse = await fetch(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          headers: {
            'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
          },
        }
      );

      if (!paystackResponse.ok) {
        const errorText = await paystackResponse.text();
        console.error('Paystack verification error:', errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to verify payment' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const paystackData = await paystackResponse.json();
      const paymentData = paystackData.data;

      console.log('Payment status:', paymentData.status);

      if (paymentData.status === 'success') {
        // Get transaction
        const { data: transaction, error: txError } = await supabaseClient
          .from('transactions')
          .select('*, credit_packs(*)')
          .eq('payment_reference', reference)
          .single();

        if (txError || !transaction) {
          console.error('Transaction not found:', reference);
          return new Response(
            JSON.stringify({ error: 'Transaction not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if already processed
        if (transaction.payment_status === 'success') {
          console.log('Payment already processed:', reference);
          return new Response(
            JSON.stringify({ 
              status: 'success',
              credits: transaction.credits_purchased,
              message: 'Payment already processed',
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Use service role to add credits (bypasses RLS)
        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Call function to add credits
        const { error: addCreditsError } = await supabaseAdmin.rpc('add_credits_to_user', {
          user_uuid: user.id,
          credits_to_add: transaction.credits_purchased,
          transaction_id: transaction.id,
        });

        if (addCreditsError) {
          console.error('Failed to add credits:', addCreditsError);
          return new Response(
            JSON.stringify({ error: 'Failed to add credits to account' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Credits added: ${transaction.credits_purchased} to user ${user.id}`);

        return new Response(
          JSON.stringify({
            status: 'success',
            credits: transaction.credits_purchased,
            message: `${transaction.credits_purchased} credits added to your account!`,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        // Payment failed or pending
        await supabaseClient
          .from('transactions')
          .update({ payment_status: paymentData.status })
          .eq('payment_reference', reference);

        return new Response(
          JSON.stringify({
            status: paymentData.status,
            message: 'Payment not successful',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Use "initialize" or "verify"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
    console.error('Payment processing error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Payment processing failed' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
