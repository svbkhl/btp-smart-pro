/**
 * Edge Function pour gérer le callback Stripe Connect
 * Vérifie que le compte est bien configuré et active la connexion
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
    const { account_id } = body;

    if (!account_id) {
      return new Response(
        JSON.stringify({ error: 'account_id is required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log('✅ Verifying Stripe Connect account:', account_id);

    // Récupérer les informations du compte Stripe
    const account = await stripe.accounts.retrieve(account_id);

    console.log('📊 Account status:', {
      id: account.id,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
    });

    // Vérifier que le compte est bien configuré
    const isFullyConfigured = account.charges_enabled && account.details_submitted;
    const canReceivePayments = account.charges_enabled;

    // Mettre à jour companies (niveau entreprise - le compte est lié à la company)
    const { error: updateError } = await supabaseClient
      .from('companies')
      .update({
        stripe_connect_account_id: account_id,
        stripe_connect_connected: canReceivePayments,
        stripe_connect_charges_enabled: account.charges_enabled || false,
        stripe_connect_payouts_enabled: account.payouts_enabled || false,
        stripe_connect_details_submitted: account.details_submitted || false,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_connect_account_id', account_id);

    if (updateError) {
      console.error('❌ Error updating companies:', updateError);
      throw updateError;
    }

    console.log('✅ Database updated successfully');

    // Retourner le statut du compte
    return new Response(
      JSON.stringify({
        success: true,
        account_id: account_id,
        connected: canReceivePayments,
        fully_configured: isFullyConfigured,
        status: {
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
        },
        message: isFullyConfigured 
          ? 'Votre compte Stripe est entièrement configuré et prêt à recevoir des paiements'
          : canReceivePayments
          ? 'Votre compte Stripe peut recevoir des paiements, mais certaines informations sont encore requises'
          : 'Votre compte Stripe nécessite des informations supplémentaires avant de pouvoir recevoir des paiements',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('❌ Error in Stripe Connect callback:', error);
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to process Stripe Connect callback',
        details: error.stack,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
