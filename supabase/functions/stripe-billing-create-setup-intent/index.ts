/**
 * Crée un SetupIntent pour mettre à jour le moyen de paiement (carte).
 * Retourne client_secret pour Stripe Elements côté front.
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
        JSON.stringify({ error: "Seul un propriétaire peut modifier le moyen de paiement" }),
        { headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" }, status: 403 }
      );
    }

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id, stripe_customer_id")
      .eq("id", membership.company_id)
      .single();

    if (companyError || !company?.stripe_customer_id) {
      return new Response(
        JSON.stringify({ error: "Aucun client Stripe associé à cette entreprise" }),
        { headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" }, status: 404 }
      );
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const setupIntent = await stripe.setupIntents.create({
      customer: company.stripe_customer_id,
      usage: "off_session",
      payment_method_types: ["card"],
      metadata: { company_id: company.id },
    });

    return new Response(
      JSON.stringify({
        client_secret: setupIntent.client_secret,
      }),
      { headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    console.error("stripe-billing-create-setup-intent:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...getCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" }, status: 500 }
    );
  }
});
