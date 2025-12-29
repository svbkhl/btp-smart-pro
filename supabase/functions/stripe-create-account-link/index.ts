/**
 * Edge Function pour créer un lien Stripe Connect
 * Permet aux entreprises de connecter leur compte Stripe via OAuth
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405,
      }
    );
  }

  try {
    // Vérifier les variables d'environnement
    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const APP_URL = Deno.env.get('APP_URL') || Deno.env.get('PUBLIC_URL') || 'https://btpsmartpro.com';

    if (!STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY not configured');
    }

    // Initialiser Stripe
    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Créer client Supabase
    const supabaseClient = createClient(
      SUPABASE_URL ?? '',
      SUPABASE_SERVICE_ROLE_KEY ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Récupérer l'utilisateur authentifié
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    // Parser le body
    const body = await req.json();
    const { company_id } = body;

    console.log('🔗 Creating Stripe Connect account link for user:', user.id);

    // Vérifier si l'utilisateur a déjà un compte Stripe Connect
    const { data: existingSettings } = await supabaseClient
      .from('user_settings')
      .select('stripe_account_id')
      .eq('user_id', user.id)
      .single();

    let accountId = existingSettings?.stripe_account_id;

    // Si pas de compte existant, en créer un nouveau
    if (!accountId) {
      console.log('📝 Creating new Stripe Connect account...');
      
      const account = await stripe.accounts.create({
        type: 'express', // Type Express pour onboarding simplifié
        country: 'FR',
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'company',
      });

      accountId = account.id;
      console.log('✅ Stripe account created:', accountId);

      // Sauvegarder l'account_id dans la base de données
      await supabaseClient
        .from('user_settings')
        .upsert({
          user_id: user.id,
          stripe_account_id: accountId,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      console.log('✅ Account ID saved to database');
    } else {
      console.log('ℹ️ Using existing Stripe account:', accountId);
    }

    // Créer un lien d'onboarding/dashboard Stripe
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${APP_URL}/settings/payment?refresh=true`,
      return_url: `${APP_URL}/stripe-callback?success=true`,
      type: 'account_onboarding',
    });

    console.log('✅ Account link created:', accountLink.url);

    return new Response(
      JSON.stringify({
        success: true,
        url: accountLink.url,
        account_id: accountId,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('❌ Error creating Stripe account link:', error);
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to create Stripe account link',
        details: error.stack,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
