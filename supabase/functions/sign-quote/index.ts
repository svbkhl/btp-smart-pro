/**
 * Edge Function publique pour signer un devis
 * Accessible sans authentification pour permettre aux clients de signer
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    // Créer un client Supabase avec service_role pour accès complet
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    /**
     * Extrait l'UUID d'un ID qui peut contenir un suffixe de sécurité
     */
    function extractUUID(rawId: string): string | null {
      if (!rawId) return null;
      
      if (rawId.length >= 36) {
        const uuid = rawId.slice(0, 36);
        if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(uuid)) {
          return uuid;
        }
      }
      
      const uuidMatch = rawId.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/i);
      if (uuidMatch && uuidMatch[0]) {
        return uuidMatch[0];
      }
      
      return rawId.length === 36 && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i.test(rawId) 
        ? rawId 
        : null;
    }

    // Parser le body
    const body = await req.json();
    let { quote_id, signer_name, signature_data } = body;

    if (!quote_id) {
      return new Response(
        JSON.stringify({ error: 'quote_id is required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Extraire l'UUID si quote_id contient un suffixe
    const extractedUUID = extractUUID(quote_id);
    if (!extractedUUID) {
      console.error('❌ [sign-quote] Impossible d\'extraire l\'UUID de:', quote_id);
      return new Response(
        JSON.stringify({ error: 'Invalid quote_id format' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    if (extractedUUID !== quote_id) {
      console.log('🔍 [sign-quote] UUID extrait:', { original: quote_id, extracted: extractedUUID });
      quote_id = extractedUUID;
    }

    // Vérifier que le devis existe
    const { data: quote, error: quoteError } = await supabaseClient
      .from('ai_quotes')
      .select('id, signed, signed_at, status')
      .eq('id', quote_id)
      .single();

    if (quoteError || !quote) {
      console.error('❌ Error fetching quote:', quoteError);
      return new Response(
        JSON.stringify({ error: 'Quote not found', details: quoteError?.message }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    // Vérifier si déjà signé
    if (quote.signed && quote.signed_at) {
      return new Response(
        JSON.stringify({ 
          error: 'Quote already signed',
          signed_at: quote.signed_at,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Mettre à jour le devis avec la signature
    const { data: updatedQuote, error: updateError } = await supabaseClient
      .from('ai_quotes')
      .update({
        signed: true,
        signed_at: new Date().toISOString(),
        signed_by: signer_name || null,
        signature_data: signature_data || null,
        status: 'signed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', quote_id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating quote:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to sign quote', details: updateError.message }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    console.log('✅ Quote signed successfully:', quote_id);

    return new Response(
      JSON.stringify({
        success: true,
        quote: updatedQuote,
        message: 'Quote signed successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('❌ Error in sign-quote:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});





