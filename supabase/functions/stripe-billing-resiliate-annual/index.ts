/**
 * Résiliation abonnement ANNUEL : cancel_at_period_end = true.
 * Le client conserve l'accès jusqu'à la fin de la période en cours.
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
      .select("id, stripe_subscription_id")
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

    if (interval !== "year") {
      return new Response(
        JSON.stringify({ error: "La résiliation en fin de période ne s'applique qu'à l'offre annuelle. Utilisez le bouton dédié pour l'offre mensuelle." }),
        { headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" }, status: 400 }
      );
    }

    if (sub.cancel_at_period_end) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "La résiliation est déjà programmée en fin de période.",
          current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
        }),
        { headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" }, status: 200 }
      );
    }

    await stripe.subscriptions.update(company.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;
    await supabase
      .from("companies")
      .update({
        cancel_at_period_end: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", company.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Résiliation programmée en fin de période. Vous conservez l'accès jusqu'à cette date.",
        current_period_end: periodEnd,
      }),
      { headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    console.error("stripe-billing-resiliate-annual:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...getCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" }, status: 500 }
    );
  }
});
