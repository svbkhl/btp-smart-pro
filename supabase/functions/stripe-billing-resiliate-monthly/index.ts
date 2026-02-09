/**
 * Résiliation abonnement MENSUEL avec engagement 1 an.
 * Programme l'annulation à la fin de l'engagement (trial_end + 1 an).
 * Le client continue à payer chaque mois jusqu'à cette date.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { handleCorsPreflight, getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const origin = req.headers.get("Origin");
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" }, status: 405 }
    );
  }

  try {
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Configuration manquante");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" }, status: 401 }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" }, status: 401 }
      );
    }

    const { data: membership, error: memberError } = await supabase
      .from("company_users")
      .select("company_id, role")
      .eq("user_id", user.id)
      .eq("role", "owner")
      .limit(1)
      .maybeSingle();

    if (memberError || !membership) {
      return new Response(
        JSON.stringify({ error: "Seul un propriétaire peut résilier l'abonnement" }),
        { headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" }, status: 403 }
      );
    }

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id, stripe_subscription_id, trial_end")
      .eq("id", membership.company_id)
      .single();

    if (companyError || !company?.stripe_subscription_id) {
      return new Response(
        JSON.stringify({ error: "Aucun abonnement Stripe associé à cette entreprise" }),
        { headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" }, status: 404 }
      );
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const sub = await stripe.subscriptions.retrieve(company.stripe_subscription_id);
    const interval = sub.items.data[0]?.price?.recurring?.interval;

    if (interval !== "month") {
      return new Response(
        JSON.stringify({ error: "La résiliation en fin d'engagement ne s'applique qu'à l'offre mensuelle. Utilisez le portail de gestion pour l'offre annuelle." }),
        { headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Déjà programmée ?
    if (sub.cancel_at) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "La résiliation est déjà programmée.",
          cancel_at: new Date(sub.cancel_at * 1000).toISOString(),
        }),
        { headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Fin d'engagement = fin d'essai + 1 an (12 mois payants après le mois gratuit)
    const trialEndMs = sub.trial_end ? sub.trial_end * 1000 : Date.now();
    const commitmentEnd = new Date(trialEndMs);
    commitmentEnd.setFullYear(commitmentEnd.getFullYear() + 1);
    const cancelAtUnix = Math.floor(commitmentEnd.getTime() / 1000);

    await stripe.subscriptions.update(company.stripe_subscription_id, {
      cancel_at: cancelAtUnix,
    });

    await supabase
      .from("companies")
      .update({
        cancel_at: commitmentEnd.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", company.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Résiliation programmée à la fin de votre engagement (1 an). Vous serez prélevé chaque mois jusqu'à cette date.",
        cancel_at: commitmentEnd.toISOString(),
      }),
      { headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    console.error("stripe-billing-resiliate-monthly:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...getCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" }, status: 500 }
    );
  }
});
