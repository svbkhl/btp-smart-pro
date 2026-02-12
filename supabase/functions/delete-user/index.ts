/**
 * Edge Function pour supprimer un utilisateur Auth
 *
 * Permet à un utilisateur de supprimer son propre compte ou à un admin de supprimer n'importe quel compte.
 * Si le compte a un abonnement Stripe actif, celui-ci est programmé pour s'arrêter à la fin de la période
 * en cours (cancel_at_period_end) avant suppression du compte.
 *
 * Usage:
 * POST /functions/v1/delete-user
 * Body: { "email": "user@example.com" } (optionnel si utilisateur supprime son propre compte)
 *
 * Headers: Authorization: Bearer <user_token> ou <service_role_key>
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

serve(async (req) => {
  // Handle CORS preflight (204 + headers requis pour que le navigateur accepte la réponse)
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
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
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return new Response(
        JSON.stringify({ error: "Missing environment variables" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userToken = authHeader.replace("Bearer ", "");
    // Client avec clé anon + JWT utilisateur en header pour vérifier l'identité (createClient(url, key) attend la clé anon, pas le JWT)
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${userToken}` } },
    });

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

    // Programmer l'arrêt des abonnements Stripe à la fin de l'engagement
    // - Mensuel : engagement 1 an → annulation à trial_end + 12 mois (comme résiliation manuelle)
    // - Annuel : annulation en fin de période en cours (cancel_at_period_end)
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (stripeSecretKey) {
      const { data: companies, error: companiesError } = await supabaseAdmin
        .from("companies")
        .select("id, stripe_subscription_id")
        .eq("owner_id", targetUser.id)
        .not("stripe_subscription_id", "is", null);

      if (!companiesError && companies?.length) {
        const stripe = new Stripe(stripeSecretKey, {
          apiVersion: "2023-10-16",
          httpClient: Stripe.createFetchHttpClient(),
        });
        for (const company of companies) {
          if (!company.stripe_subscription_id) continue;
          try {
            const sub = await stripe.subscriptions.retrieve(company.stripe_subscription_id);
            if (sub.status !== "active" && sub.status !== "trialing") continue;
            const interval = sub.items.data[0]?.price?.recurring?.interval;

            if (interval === "month") {
              // Offre mensuelle : engagement 12 mois après la fin de l'essai → résilier à cette date
              if (sub.cancel_at) continue; // déjà programmée
              const trialEndMs = sub.trial_end ? sub.trial_end * 1000 : Date.now();
              const commitmentEnd = new Date(trialEndMs);
              commitmentEnd.setFullYear(commitmentEnd.getFullYear() + 1);
              const cancelAtUnix = Math.floor(commitmentEnd.getTime() / 1000);
              await stripe.subscriptions.update(company.stripe_subscription_id, { cancel_at: cancelAtUnix });
              await supabaseAdmin
                .from("companies")
                .update({
                  cancel_at: commitmentEnd.toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq("id", company.id);
            } else {
              // Offre annuelle (ou autre) : arrêt en fin de période en cours
              if (!sub.cancel_at_period_end) {
                await stripe.subscriptions.update(company.stripe_subscription_id, {
                  cancel_at_period_end: true,
                });
                await supabaseAdmin
                  .from("companies")
                  .update({
                    cancel_at_period_end: true,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", company.id);
              }
            }
          } catch (stripeErr) {
            console.error("[delete-user] Stripe update failed for company", company.id, stripeErr);
          }
        }
      }
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
