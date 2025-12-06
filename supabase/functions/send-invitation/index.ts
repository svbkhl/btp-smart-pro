/**
 * Send Invitation Edge Function
 * 
 * Envoie une invitation par email à un utilisateur via Supabase Auth Admin API
 * Utilise service_role uniquement côté backend
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

  // Vérifier que la méthode est POST
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
    // Lire le JSON du body
    const { email } = await req.json();

    // Vérifier que l'email est présent et valide
    if (!email || typeof email !== 'string' || email.trim() === '' || !email.includes('@')) {
      return new Response(
        JSON.stringify({ error: 'Email is required and must be valid' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Créer un client admin avec service_role
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('❌ Missing Supabase environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Appeler inviteUserByEmail via l'API Admin
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email.trim().toLowerCase());

    if (error) {
      console.error('❌ [send-invitation] Error inviting user:', error);
      return new Response(
        JSON.stringify({ error: error.message || 'Failed to send invitation' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log('✅ [send-invitation] Invitation sent successfully to:', email);

    // Retourner succès
    return new Response(
      JSON.stringify({ success: true, user: data?.user }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    // Capture toutes les erreurs et retourne un message d'erreur propre en JSON
    console.error('❌ [send-invitation] Internal Server Error:', error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : typeof error === 'string' 
        ? error 
        : 'Internal Server Error';
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
