/**
 * Edge Function pour supprimer un utilisateur Auth
 * 
 * Permet à un utilisateur de supprimer son propre compte ou à un admin de supprimer n'importe quel compte
 * 
 * Usage:
 * POST /functions/v1/delete-user
 * Body: { "email": "user@example.com" } (optionnel si utilisateur supprime son propre compte)
 * 
 * Headers: Authorization: Bearer <user_token> ou <service_role_key>
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Vérifier que c'est une requête POST
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Vérifier les variables d'environnement
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Missing environment variables" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Créer le client Supabase avec le token de l'utilisateur
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userToken = authHeader.replace("Bearer ", "");
    const supabaseUser = createClient(supabaseUrl, userToken);

    // Vérifier l'authentification de l'utilisateur
    const { data: { user: authenticatedUser }, error: authError } = await supabaseUser.auth.getUser();
    
    if (authError || !authenticatedUser) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Créer le client Supabase Admin pour les opérations admin
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Parser le body (email optionnel)
    const { email } = await req.json();
    const targetEmail = email || authenticatedUser.email;

    if (!targetEmail) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Récupérer l'utilisateur cible
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      return new Response(
        JSON.stringify({ error: "Failed to list users", details: listError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const targetUser = users.users.find((u: any) => u.email?.toLowerCase() === targetEmail.toLowerCase());

    if (!targetUser) {
      return new Response(
        JSON.stringify({ error: "User not found", email: targetEmail }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Vérifier que l'utilisateur authentifié peut supprimer ce compte
    // Soit il supprime son propre compte, soit c'est un admin
    const isOwnAccount = authenticatedUser.id === targetUser.id;
    const isAdmin = authenticatedUser.email?.toLowerCase() === 'sabri.khalfallah6@gmail.com' || 
                    authenticatedUser.user_metadata?.role === 'admin';

    if (!isOwnAccount && !isAdmin) {
      return new Response(
        JSON.stringify({ error: "Forbidden: You can only delete your own account" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Supprimer les données associées (via RLS, les suppressions en cascade s'occupent du reste)
    // Les données seront supprimées automatiquement via les contraintes CASCADE

    // Supprimer l'utilisateur Auth
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUser.id);

    if (deleteError) {
      return new Response(
        JSON.stringify({ error: "Failed to delete user", details: deleteError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "User deleted successfully",
        user: {
          id: targetUser.id,
          email: targetUser.email
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
