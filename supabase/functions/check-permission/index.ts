/**
 * Edge Function: check-permission
 * Description: Middleware pour vérifier les permissions d'un utilisateur
 * Usage: Appelé par le frontend ou d'autres Edge Functions pour vérifier les permissions
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CheckPermissionRequest {
  permission: string;
  company_id: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
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

    // Récupérer l'utilisateur depuis le JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      console.error('❌ [check-permission] Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: authError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ [check-permission] User authenticated:', user.id);

    // Récupérer les paramètres
    const { permission, company_id }: CheckPermissionRequest = await req.json();

    if (!permission || !company_id) {
      return new Response(
        JSON.stringify({ error: 'Missing permission or company_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔍 [check-permission] Checking:', { user_id: user.id, company_id, permission });

    // Vérifier la permission via RPC
    const { data: hasPermission, error: permError } = await supabaseClient
      .rpc('check_user_permission', {
        user_uuid: user.id,
        company_uuid: company_id,
        permission_key: permission,
      });

    if (permError) {
      console.error('❌ [check-permission] RPC error:', permError);
      return new Response(
        JSON.stringify({ error: 'Permission check failed', details: permError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(hasPermission ? '✅' : '❌', '[check-permission] Result:', hasPermission);

    return new Response(
      JSON.stringify({ 
        has_permission: hasPermission,
        user_id: user.id,
        company_id,
        permission,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ [check-permission] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
