/**
 * Stripe Billing B2B - Webhook (abonnements)
 * Vérifie la signature, idempotence, met à jour companies.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const WEBHOOK_SECRET = Deno.env.get("STRIPE_BILLING_WEBHOOK_SECRET");

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!WEBHOOK_SECRET) {
    console.error("STRIPE_BILLING_WEBHOOK_SECRET manquant");
    return new Response("Server error", { status: 500 });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response("Server error", { status: 500 });
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = Stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    console.error("Webhook signature verification failed:", message);
    return new Response(`Webhook Error: ${message}`, { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Idempotence
  const { data: existing } = await supabase
    .from("stripe_webhook_events")
    .select("id")
    .eq("event_id", event.id)
    .maybeSingle();

  if (existing) {
    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  }

  await supabase.from("stripe_webhook_events").insert({
    event_id: event.id,
    event_type: event.type,
  });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const companyId = session.metadata?.company_id;
        const subId = session.subscription as string | null;
        if (!companyId || !subId) break;
        const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
          apiVersion: "2023-10-16",
          httpClient: Stripe.createFetchHttpClient(),
        });
        const sub = await stripe.subscriptions.retrieve(subId);
        const status = sub.status as string;
        const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null;
        const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;
        const cancelAt = sub.cancel_at ? new Date(sub.cancel_at * 1000).toISOString() : null;
        const priceId = sub.items.data[0]?.price?.id ?? null;
        await supabase
          .from("companies")
          .update({
            stripe_subscription_id: sub.id,
            subscription_status: status,
            trial_end: trialEnd,
            current_period_end: periodEnd,
            stripe_price_id: priceId,
            cancel_at_period_end: sub.cancel_at_period_end ?? false,
            cancel_at: cancelAt,
            updated_at: new Date().toISOString(),
          })
          .eq("id", companyId);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const companyId = sub.metadata?.company_id;
        if (!companyId) break;
        const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null;
        const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;
        const cancelAt = sub.cancel_at ? new Date(sub.cancel_at * 1000).toISOString() : null;
        const priceId = sub.items.data[0]?.price?.id ?? null;
        await supabase
          .from("companies")
          .update({
            stripe_subscription_id: sub.id,
            subscription_status: sub.status,
            trial_end: trialEnd,
            current_period_end: periodEnd,
            stripe_price_id: priceId,
            cancel_at_period_end: sub.cancel_at_period_end ?? false,
            cancel_at: cancelAt,
            updated_at: new Date().toISOString(),
          })
          .eq("id", companyId);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const companyId = sub.metadata?.company_id;
        if (!companyId) break;
        await supabase
          .from("companies")
          .update({
            subscription_status: "canceled",
            updated_at: new Date().toISOString(),
          })
          .eq("id", companyId);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = invoice.subscription as string | null;
        if (!subId) break;
        const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
          apiVersion: "2023-10-16",
          httpClient: Stripe.createFetchHttpClient(),
        });
        const sub = await stripe.subscriptions.retrieve(subId as string);
        const companyId = sub.metadata?.company_id;
        if (!companyId) break;
        const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;
        await supabase
          .from("companies")
          .update({
            subscription_status: sub.status,
            current_period_end: periodEnd,
            updated_at: new Date().toISOString(),
          })
          .eq("id", companyId);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = invoice.subscription as string | null;
        if (!subId) break;
        const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
          apiVersion: "2023-10-16",
          httpClient: Stripe.createFetchHttpClient(),
        });
        const sub = await stripe.subscriptions.retrieve(subId as string);
        const companyId = sub.metadata?.company_id;
        if (!companyId) break;
        await supabase
          .from("companies")
          .update({
            subscription_status: "past_due",
            updated_at: new Date().toISOString(),
          })
          .eq("id", companyId);
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return new Response("Handler error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});
