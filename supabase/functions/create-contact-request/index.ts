/**
 * Edge Function : Créer une demande de contact
 * 
 * Permet aux visiteurs (sans authentification) de soumettre une demande
 * via le formulaire de contact. Utilise service_role pour insérer en base
 * et contourne les limitations RLS/GRANT.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

interface CreateContactRequestBody {
  nom: string;
  prenom: string;
  email: string;
  telephone?: string | null;
  entreprise?: string | null;
  message?: string | null;
  request_type?: "essai_gratuit" | "contact" | "information";
  trial_requested?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Configuration serveur manquante" }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const body: CreateContactRequestBody = await req.json();

    const nom = body.nom?.trim() || "";
    const prenom = body.prenom?.trim() || "";
    const email = body.email?.trim().toLowerCase() || "";
    const telephone = body.telephone?.trim() || null;
    const entreprise = body.entreprise?.trim() || null;
    const message = body.message?.trim() || null;
    const request_type = body.request_type || "essai_gratuit";
    const trial_requested = !!body.trial_requested;

    if (!nom || !prenom || !email) {
      return new Response(
        JSON.stringify({ error: "Champs requis : nom, prénom et email" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    if (!email.includes("@")) {
      return new Response(
        JSON.stringify({ error: "Email invalide" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: inserted, error: insertError } = await adminClient
      .from("contact_requests")
      .insert({
        nom,
        prenom,
        email,
        telephone,
        entreprise,
        message,
        request_type,
        trial_requested,
        status: "pending",
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("create-contact-request insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Impossible de créer la demande", details: insertError.message }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const requestId = inserted?.id;

    // Notifier l'admin (non bloquant)
    try {
      await adminClient.functions.invoke("notify-contact-request", {
        body: {
          request_id: requestId,
          nom,
          prenom,
          email,
          telephone,
          entreprise,
          message,
          trial_requested,
          request_type,
        },
      });
    } catch (notifyErr) {
      console.error("create-contact-request notify error:", notifyErr);
      // Ne pas échouer - la demande est créée
    }

    return new Response(
      JSON.stringify({ success: true, request_id: requestId }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    console.error("create-contact-request:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
