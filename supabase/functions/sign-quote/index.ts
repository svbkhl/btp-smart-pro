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
    let { quote_id, token, signer_name, signature_data, user_agent, signed_at } = body;

    console.log('📥 [sign-quote] Requête reçue:', { quote_id, token, has_signature: !!signature_data });

    // Si un token est fourni, récupérer quote_id depuis signature_sessions
    if (token && !quote_id) {
      console.log('🔍 [sign-quote] Recherche via token:', token);
      const { data: session, error: sessionError } = await supabaseClient
        .from('signature_sessions')
        .select('quote_id, invoice_id, status, expires_at')
        .eq('token', token)
        .maybeSingle();

      if (sessionError || !session) {
        console.error('❌ Session non trouvée pour token:', token);
        return new Response(
          JSON.stringify({ 
            error: 'Invalid or expired signature token',
            token_provided: token
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404,
          }
        );
      }

      // Vérifier l'expiration
      if (new Date(session.expires_at) < new Date()) {
        console.error('❌ Token expiré:', token);
        return new Response(
          JSON.stringify({ error: 'Signature token expired' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 410,
          }
        );
      }

      console.log('✅ Session trouvée:', session);
      quote_id = session.quote_id;
    }

    if (!quote_id) {
      return new Response(
        JSON.stringify({ error: 'quote_id or token is required' }),
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

    // Vérifier que le devis existe (essayer ai_quotes puis quotes)
    let { data: quote, error: quoteError } = await supabaseClient
      .from('ai_quotes')
      .select('id, signed, signed_at, status')
      .eq('id', quote_id)
      .maybeSingle();

    let tableName = 'ai_quotes';

    // Si pas trouvé dans ai_quotes, essayer dans quotes
    if (quoteError || !quote) {
      console.log('🔍 [sign-quote] Pas trouvé dans ai_quotes, essai dans quotes');
      const quotesResult = await supabaseClient
        .from('quotes')
        .select('id, signed, signed_at, status')
        .eq('id', quote_id)
        .maybeSingle();

      if (quotesResult.data) {
        quote = quotesResult.data;
        tableName = 'quotes';
        quoteError = null;
      }
    }

    if (quoteError || !quote) {
      console.error('❌ Error fetching quote:', quoteError);
      return new Response(
        JSON.stringify({ error: 'Quote not found in any table', details: quoteError?.message }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    console.log('✅ Devis trouvé dans:', tableName);

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
    const signatureMetadata = {
      signed: true,
      signed_at: signed_at || new Date().toISOString(),
      signed_by: signer_name || null,
      signature_data: signature_data || null,
      signature_user_agent: user_agent || null,
      status: 'signed',
      updated_at: new Date().toISOString(),
    };

    const { data: updatedQuote, error: updateError } = await supabaseClient
      .from(tableName)
      .update(signatureMetadata)
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

    // Mettre à jour la session si un token était fourni
    if (token) {
      await supabaseClient
        .from('signature_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('token', token);
    }

    console.log('✅ Quote signed successfully:', quote_id, 'in table:', tableName);

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





