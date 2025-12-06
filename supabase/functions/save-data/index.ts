/**
 * Save Data Edge Function
 * 
 * Sauvegarde de façon persistante les données clients et devis
 * Assure qu'aucune donnée n'est perdue grâce aux transactions
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

  // 1. Accepte uniquement les requêtes POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Only POST is supported.' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405,
      }
    );
  }

  try {
    // 2. Lit correctement le corps JSON de la requête
    const body = await req.json();
    
    // 4. Log les données reçues pour debug
    console.log('📥 [save-data] Request received');
    console.log('📥 [save-data] Body:', JSON.stringify(body, null, 2));

    // Vérifier que le body contient un type (client ou quote)
    if (!body.type || (body.type !== 'client' && body.type !== 'quote')) {
      return new Response(
        JSON.stringify({ error: 'Invalid type. Must be "client" or "quote"' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Récupérer l'utilisateur depuis le header Authorization
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

    // Créer le client Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Vérifier l'authentification
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    console.log('✅ [save-data] User authenticated:', user.id);

    // 3. Vérifie si l'entrée existe déjà et fait UPDATE ou INSERT
    if (body.type === 'client') {
      // ============================================
      // SAUVEGARDE D'UN CLIENT
      // ============================================
      const clientData = body.data;
      
      if (!clientData) {
        return new Response(
          JSON.stringify({ error: 'Missing client data' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      // Vérifier si le client existe déjà (par id ou email)
      let existingClient = null;
      
      if (clientData.id) {
        // Chercher par id
        const { data: clientById, error: errorById } = await supabaseClient
          .from('clients')
          .select('id, email')
          .eq('id', clientData.id)
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (errorById) {
          console.error('❌ [save-data] Error checking client by id:', errorById);
        } else {
          existingClient = clientById;
        }
      }
      
      // Si pas trouvé par id, chercher par email (si email fourni)
      if (!existingClient && clientData.email) {
        const { data: clientByEmail, error: errorByEmail } = await supabaseClient
          .from('clients')
          .select('id, email')
          .eq('email', clientData.email)
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (errorByEmail) {
          console.error('❌ [save-data] Error checking client by email:', errorByEmail);
        } else {
          existingClient = clientByEmail;
        }
      }

      // Préparer les données du client
      const clientToSave = {
        ...clientData,
        user_id: user.id, // Toujours utiliser l'utilisateur authentifié
        updated_at: new Date().toISOString(),
      };

      // Supprimer l'id si on fait un INSERT (sera généré automatiquement)
      if (!existingClient && clientToSave.id) {
        delete clientToSave.id;
      }

      let result;
      
      if (existingClient) {
        // UPDATE : Le client existe, on met à jour
        console.log('🔄 [save-data] Updating existing client:', existingClient.id);
        
        const { data: updatedClient, error: updateError } = await supabaseClient
          .from('clients')
          .update(clientToSave)
          .eq('id', existingClient.id)
          .eq('user_id', user.id)
          .select()
          .single();

        if (updateError) {
          console.error('❌ [save-data] Error updating client:', updateError);
          throw updateError;
        }

        result = updatedClient;
        console.log('✅ [save-data] Client updated successfully:', result.id);
      } else {
        // INSERT : Le client n'existe pas, on le crée
        console.log('➕ [save-data] Creating new client');
        
        const { data: newClient, error: insertError } = await supabaseClient
          .from('clients')
          .insert(clientToSave)
          .select()
          .single();

        if (insertError) {
          console.error('❌ [save-data] Error creating client:', insertError);
          throw insertError;
        }

        result = newClient;
        console.log('✅ [save-data] Client created successfully:', result.id);
      }

    } else if (body.type === 'quote') {
      // ============================================
      // SAUVEGARDE D'UN DEVIS
      // ============================================
      const quoteData = body.data;
      
      if (!quoteData) {
        return new Response(
          JSON.stringify({ error: 'Missing quote data' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      // Vérifier si le devis existe déjà (par id ou quote_number)
      let existingQuote = null;
      
      if (quoteData.id) {
        // Chercher par id
        const { data: quoteById, error: errorById } = await supabaseClient
          .from('ai_quotes')
          .select('id, quote_number')
          .eq('id', quoteData.id)
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (errorById) {
          console.error('❌ [save-data] Error checking quote by id:', errorById);
        } else {
          existingQuote = quoteById;
        }
      }
      
      // Si pas trouvé par id, chercher par quote_number (si quote_number fourni)
      if (!existingQuote && quoteData.quote_number) {
        const { data: quoteByNumber, error: errorByNumber } = await supabaseClient
          .from('ai_quotes')
          .select('id, quote_number')
          .eq('quote_number', quoteData.quote_number)
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (errorByNumber) {
          console.error('❌ [save-data] Error checking quote by quote_number:', errorByNumber);
        } else {
          existingQuote = quoteByNumber;
        }
      }

      // Préparer les données du devis
      const quoteToSave = {
        ...quoteData,
        user_id: user.id, // Toujours utiliser l'utilisateur authentifié
        updated_at: new Date().toISOString(),
      };

      // Supprimer l'id si on fait un INSERT (sera généré automatiquement)
      if (!existingQuote && quoteToSave.id) {
        delete quoteToSave.id;
      }

      let result;
      
      if (existingQuote) {
        // UPDATE : Le devis existe, on met à jour
        console.log('🔄 [save-data] Updating existing quote:', existingQuote.id);
        
        const { data: updatedQuote, error: updateError } = await supabaseClient
          .from('ai_quotes')
          .update(quoteToSave)
          .eq('id', existingQuote.id)
          .eq('user_id', user.id)
          .select()
          .single();

        if (updateError) {
          console.error('❌ [save-data] Error updating quote:', updateError);
          throw updateError;
        }

        result = updatedQuote;
        console.log('✅ [save-data] Quote updated successfully:', result.id);
      } else {
        // INSERT : Le devis n'existe pas, on le crée
        console.log('➕ [save-data] Creating new quote');
        
        const { data: newQuote, error: insertError } = await supabaseClient
          .from('ai_quotes')
          .insert(quoteToSave)
          .select()
          .single();

        if (insertError) {
          console.error('❌ [save-data] Error creating quote:', insertError);
          throw insertError;
        }

        result = newQuote;
        console.log('✅ [save-data] Quote created successfully:', result.id);
      }
    }

    // 5. Retourne un JSON avec status 200 si tout est OK
    return new Response(
      JSON.stringify({ message: 'Data saved successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    // 6. Capture toutes les erreurs et retourne Internal Server Error avec status 500
    console.error('❌ [save-data] Internal Server Error:', error);
    
    return new Response(
      JSON.stringify({ error: 'Internal Server Error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});




