/**
 * Détails facturation : factures + moyen de paiement (sans ouvrir le portail Stripe).
 * Owner uniquement.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { handleCorsPreflight, getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const origin = req.headers.get("Origin");
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  if (req.method !== "POST" && req.method !== "GET") {
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
        JSON.stringify({ error: "Seul un propriétaire peut consulter la facturation" }),
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
        JSON.stringify({
          invoices: [],
          paymentMethod: null,
        }),
        { headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" }, status: 200 }
      );
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const [invoicesRes, customer] = await Promise.all([
      stripe.invoices.list({
        customer: company.stripe_customer_id,
        limit: 24,
        status: "paid",
      }),
      stripe.customers.retrieve(company.stripe_customer_id),
    ]);

    const invoices = (invoicesRes.data ?? []).map((inv) => ({
      id: inv.id,
      number: inv.number ?? undefined,
      date: inv.status_transitions?.paid_at ? new Date(inv.status_transitions.paid_at * 1000).toISOString() : (inv.created ? new Date(inv.created * 1000).toISOString() : undefined),
      total: inv.amount_paid != null ? inv.amount_paid / 100 : undefined,
      currency: inv.currency ?? "eur",
      status: inv.status,
      hosted_invoice_url: inv.hosted_invoice_url ?? undefined,
      invoice_pdf: inv.invoice_pdf ?? undefined,
    }));

    let paymentMethod: { brand: string; last4: string; exp_month: number; exp_year: number } | null = null;
    const defaultPmId = customer && !customer.deleted && "invoice_settings" in customer ? (customer.invoice_settings?.default_payment_method as string | null) ?? customer.default_source : null;
    if (defaultPmId && typeof defaultPmId === "string") {
      try {
        const pm = await stripe.paymentMethods.retrieve(defaultPmId);
        if (pm.card) {
          paymentMethod = {
            brand: pm.card.brand,
            last4: pm.card.last4 ?? "",
            exp_month: pm.card.exp_month,
            exp_year: pm.card.exp_year,
          };
        }
      } catch {
        // ignore
      }
    }

    return new Response(
      JSON.stringify({
        invoices,
        paymentMethod,
      }),
      { headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    console.error("stripe-billing-details:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...getCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" }, status: 500 }
    );
  }
});
