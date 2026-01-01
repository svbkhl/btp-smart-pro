/**
 * Edge Function publique pour récupérer les informations d'un document (devis/facture)
 * Accessible sans authentification pour les pages de paiement publiques
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
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
     * Format accepté: "uuid" ou "uuid-suffix"
     */
    function extractUUID(rawId: string): string | null {
      if (!rawId) return null;
      
      // Méthode 1: Extraire les 36 premiers caractères (format UUID standard)
      if (rawId.length >= 36) {
        const uuid = rawId.slice(0, 36);
        // Vérifier que c'est un UUID valide
        if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(uuid)) {
          return uuid;
        }
      }
      
      // Méthode 2: Utiliser une regex pour trouver l'UUID dans la chaîne
      const uuidMatch = rawId.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/i);
      if (uuidMatch && uuidMatch[0]) {
        return uuidMatch[0];
      }
      
      // Si aucune méthode ne fonctionne, retourner l'ID original (peut être un UUID valide sans suffixe)
      return rawId.length === 36 && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i.test(rawId) 
        ? rawId 
        : null;
    }

    // Parser le body
    const body = await req.json();
    let { quote_id, invoice_id, token } = body;

    // Extraire l'UUID si quote_id contient un suffixe
    if (quote_id) {
      console.log('📥 [get-public-document] Requête reçue:', { quote_id, invoice_id, token });
      const extractedUUID = extractUUID(quote_id);
      if (extractedUUID) {
        console.log('🔍 [get-public-document] UUID extrait:', { original: quote_id, extracted: extractedUUID });
        quote_id = extractedUUID;
      } else {
        console.error('❌ [get-public-document] Impossible d\'extraire l\'UUID de:', quote_id, typeof quote_id);
        return new Response(
          JSON.stringify({ error: 'Invalid quote_id format', received: quote_id, type: typeof quote_id }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }
    }

    if (!quote_id && !invoice_id) {
      return new Response(
        JSON.stringify({ error: 'quote_id or invoice_id is required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    let document: any = null;
    let documentType = '';

    // Récupérer le document
    if (quote_id) {
      console.log('🔍 [get-public-document] Recherche du devis:', quote_id);
      console.log('🔍 Type de quote_id:', typeof quote_id, 'Longueur:', quote_id?.length);
      
      // Essayer d'abord dans ai_quotes
      console.log('🔍 Tentative 1: Table ai_quotes');
      let { data, error } = await supabaseClient
        .from('ai_quotes')
        .select('*')  // Sélectionner toutes les colonnes disponibles
        .eq('id', quote_id)
        .single();

      // Si pas trouvé dans ai_quotes, essayer dans quotes
      if (error || !data) {
        console.log('⚠️ Non trouvé dans ai_quotes, tentative 2: Table quotes');
        const quotesResult = await supabaseClient
          .from('quotes')
          .select('*')
          .eq('id', quote_id)
          .single();
        
        if (quotesResult.data) {
          console.log('✅ Devis trouvé dans quotes!');
          data = quotesResult.data;
          error = null;
        }
      }

      if (error || !data) {
        console.error('❌ Devis non trouvé dans aucune table:', {
          quote_id,
          quote_id_type: typeof quote_id,
          error: error?.message,
          errorCode: error?.code,
          errorDetails: error?.details
        });
        return new Response(
          JSON.stringify({ 
            error: 'Quote not found in any table', 
            details: error?.message,
            quote_id_searched: quote_id,
            tables_searched: ['ai_quotes', 'quotes']
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404,
          }
        );
      }

      console.log('✅ [get-public-document] Devis trouvé:', { id: data.id, quote_number: data.quote_number });

      document = data;
      documentType = 'quote';
    } else if (invoice_id) {
      const { data, error } = await supabaseClient
        .from('invoices')
        .select('id, invoice_number, amount_ttc, client_name, client_email, created_at, status')
        .eq('id', invoice_id)
        .single();

      if (error || !data) {
        return new Response(
          JSON.stringify({ error: 'Invoice not found' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404,
          }
        );
      }

      document = data;
      documentType = 'invoice';
    }

    // Vérifier si un paiement existe et son statut
    let payment: any = null;
    if (token) {
      const { data: paymentData } = await supabaseClient
        .from('payments')
        .select('id, status, paid, amount, currency')
        .eq('id', token)
        .single();

      if (paymentData) {
        payment = paymentData;
      }
    }

    return new Response(
      JSON.stringify({
        document,
        document_type: documentType,
        payment,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error getting public document:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

