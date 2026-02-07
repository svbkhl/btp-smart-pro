/**
 * Stripe Billing B2B - Création Checkout Session (abonnement + essai gratuit)
 * 1 company = 1 Customer Stripe = 1 Subscription
 * Seul l'owner de l'entreprise peut initier la souscription.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { handleCorsPreflight, getCorsHeaders } from "../_shared/cors.ts";

const TRIAL_DAYS = 14; // Essai gratuit 14 jours (configurable 2 semaines à 1 mois)

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
    const SITE_URL = Deno.env.get("SITE_URL") || Deno.env.get("PUBLIC_URL") || "https://btpsmartpro.com";

    if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Configuration manquante (STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)");
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

    const body = await req.json().catch(() => ({}));
    const invitationId = body.invitation_id || body.invitationId;
    let priceId: string | null = body.price_id || body.priceId || null;
    let trialPeriodDays = typeof body.trial_period_days === "number" ? body.trial_period_days : TRIAL_DAYS;
    let invitationCompanyId: string | null = null;

    // Si invitation_id fourni : charger l'invitation et utiliser son offre/prix/essai
    if (invitationId && typeof invitationId === "string") {
      const { data: invitation, error: invError } = await supabase
        .from("invitations")
        .select("id, company_id, stripe_price_id, trial_days")
        .eq("id", invitationId)
        .single();
      if (!invError && invitation) {
        invitationCompanyId = invitation.company_id;
        if (invitation.stripe_price_id) priceId = invitation.stripe_price_id;
        if (invitation.trial_days != null && invitation.trial_days >= 0) trialPeriodDays = invitation.trial_days;
      }
    }

    if (!priceId || typeof priceId !== "string") {
      return new Response(
        JSON.stringify({ error: "price_id requis (ou invitation avec offre)" }),
        { headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Récupérer la company de l'utilisateur et vérifier qu'il est owner
    const { data: membership, error: memberError } = await supabase
      .from("company_users")
      .select("company_id, role")
      .eq("user_id", user.id)
      .eq("role", "owner")
      .limit(1)
      .maybeSingle();

    if (memberError || !membership) {
      return new Response(
        JSON.stringify({ error: "Vous devez être propriétaire d'une entreprise pour souscrire" }),
        { headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" }, status: 403 }
      );
    }

    const companyId = membership.company_id;

    if (invitationCompanyId != null && invitationCompanyId !== companyId) {
      return new Response(
        JSON.stringify({ error: "Invitation non associée à votre entreprise" }),
        { headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" }, status: 403 }
      );
    }

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id, name, stripe_customer_id")
      .eq("id", companyId)
      .single();

    if (companyError || !company) {
      return new Response(
        JSON.stringify({ error: "Entreprise introuvable" }),
        { headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" }, status: 404 }
      );
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    let customerId = company.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        name: company.name ?? undefined,
        metadata: {
          company_id: companyId,
          owner_id: user.id,
        },
      });
      customerId = customer.id;
      await supabase
        .from("companies")
        .update({
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", companyId);
    }

    const successUrl = `${SITE_URL}/dashboard?onboarding_step=0`;
    const cancelUrl = `${SITE_URL}/start`;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: trialPeriodDays,
        metadata: {
          company_id: companyId,
          owner_id: user.id,
        },
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      metadata: {
        company_id: companyId,
        owner_id: user.id,
      },
    });

    return new Response(
      JSON.stringify({ url: session.url, session_id: session.id }),
      { headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    console.error("stripe-billing-create-checkout:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...getCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" }, status: 500 }
    );
  }
});
