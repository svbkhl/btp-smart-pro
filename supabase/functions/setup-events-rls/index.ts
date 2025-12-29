/**
 * Edge Function pour configurer les politiques RLS de la table events
 * 
 * ⚠️ ATTENTION : Cette fonction nécessite la SERVICE_ROLE_KEY
 * Ne l'exposez JAMAIS au client !
 * 
 * Utilisation recommandée : Utilisez plutôt l'éditeur SQL de Supabase
 * https://supabase.com/dashboard/project/YOUR_PROJECT/sql
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Gérer les requêtes OPTIONS pour CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Créer un client Supabase avec la service_role_key (admin)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Script SQL pour configurer les politiques RLS
    const sql = `
      -- Activer RLS
      ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

      -- Supprimer les anciennes politiques
      DROP POLICY IF EXISTS "Users can view their own events" ON public.events;
      DROP POLICY IF EXISTS "Users can create their own events" ON public.events;
      DROP POLICY IF EXISTS "Users can insert their own events" ON public.events;
      DROP POLICY IF EXISTS "Users can update their own events" ON public.events;
      DROP POLICY IF EXISTS "Users can delete their own events" ON public.events;
      DROP POLICY IF EXISTS "Authenticated users can view events" ON public.events;
      DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.events;

      -- Créer les nouvelles politiques
      CREATE POLICY "Users can view their own events"
      ON public.events FOR SELECT
      USING (auth.uid() = user_id);

      CREATE POLICY "Users can insert their own events"
      ON public.events FOR INSERT
      WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

      CREATE POLICY "Users can update their own events"
      ON public.events FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

      CREATE POLICY "Users can delete their own events"
      ON public.events FOR DELETE
      USING (auth.uid() = user_id);
    `

    // Exécuter le SQL via rpc (nécessite une fonction SQL créée au préalable)
    // ⚠️ Note : Supabase ne permet pas d'exécuter du SQL arbitraire via RPC
    // Il faut créer une fonction SQL spécifique ou utiliser l'éditeur SQL

    return new Response(
      JSON.stringify({ 
        error: 'Cette Edge Function nécessite une fonction SQL personnalisée',
        message: 'Utilisez plutôt le fichier supabase/FIX-EVENTS-RLS-SECURE.sql dans l\'éditeur SQL de Supabase'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})





