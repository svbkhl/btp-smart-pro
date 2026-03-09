/**
 * Edge Function: vibe-prospecting
 *
 * Appelle l'API Explorium (Vibe Prospecting) pour récupérer des entreprises BTP
 * selon département et critères, puis les enregistre en leads (upsert_linkedin_lead).
 *
 * Body: { dept_code: string, category?: string, cherche_assistante?: boolean, limit?: number }
 * Secret: EXPLORIUM_API_KEY (clé API Explorium / Vibe Prospecting)
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPLORIUM_API = "https://api.explorium.ai/v1/businesses";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const JSON_HEADERS = { ...CORS, "Content-Type": "application/json" };

// Catégories BTP reconnues par Explorium (linkedin_category)
const LINKEDIN_CATEGORIES: Record<string, string[]> = {
  "Plomberie": ["plumbing", "construction"],
  "Électricité": ["electrical contracting", "construction"],
  "Chauffage": ["construction", "building equipment"],
  "Artisan BTP": ["construction", "building construction"],
  "Rénovation": ["construction", "building construction"],
  "Couverture": ["construction"],
  "Menuiserie": ["carpentry", "construction"],
  "Peinture": ["construction", "painting"],
  "Maçonnerie": ["masonry", "construction"],
  "Terrassement": ["construction", "excavation"],
  "Photovoltaïque": ["solar energy", "construction"],
  "Multi-services": ["construction"],
  "Cherche Assistante": ["construction"],
};

function buildExploriumFilters(deptCode: string, category: string | undefined, chercheAssistante: boolean) {
  const region = "fr-" + deptCode.toLowerCase();
  const filters: Record<string, { values: string[] }> = {
    region_country_code: { values: [region] },
    has_website: { values: ["True"] },
  };
  const cats = category && LINKEDIN_CATEGORIES[category];
  if (cats?.length) {
    filters.linkedin_category = { values: [cats[0]] };
  } else {
    filters.linkedin_category = { values: ["construction"] };
  }
  if (chercheAssistante) {
    (filters as any).events = {
      values: ["hiring_in_support_department", "hiring_in_human_resources_department"],
      last_occurrence: 90,
    };
  }
  return filters;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: JSON_HEADERS });
  }

  const apiKey = Deno.env.get("EXPLORIUM_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: "Prospection automatique non configurée",
        detail: "Configurez le secret EXPLORIUM_API_KEY (clé API Vibe Prospecting / Explorium) dans les Edge Functions.",
      }),
      { status: 503, headers: JSON_HEADERS }
    );
  }

  try {
    let body: Record<string, unknown> = {};
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }
    const deptCode = String(body.dept_code || "").trim() || "73";
    const category = body.category ? String(body.category).trim() : "Artisan BTP";
    const chercheAssistante = Boolean(body.cherche_assistante);
    const limit = Math.min(Number(body.limit) || 30, 50);

    const filters = buildExploriumFilters(deptCode, category, chercheAssistante);

    const resp = await fetch(EXPLORIUM_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "accept": "application/json",
        "api_key": apiKey,
      },
      body: JSON.stringify({
        mode: "full",
        size: limit,
        page_size: Math.min(limit, 100),
        page: 1,
        filters,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("Explorium API error:", resp.status, errText);
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Erreur lors de la recherche d'entreprises",
          detail: resp.status === 401 ? "Clé API Explorium invalide ou manquante." : errText.slice(0, 400),
          inserted: 0,
          skipped: 0,
          total: 0,
        }),
        { status: 200, headers: JSON_HEADERS }
      );
    }

    const data = await resp.json().catch(() => ({}));
    const businesses = Array.isArray(data?.data) ? data.data : Array.isArray(data?.businesses) ? data.businesses : [];
    if (businesses.length === 0 && (!data || Object.keys(data).length === 0)) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Format de réponse Explorium inattendu",
          detail: "Réponse vide ou structure inconnue.",
          inserted: 0,
          skipped: 0,
          total: 0,
        }),
        { status: 200, headers: JSON_HEADERS }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Configuration Supabase manquante",
          inserted: 0,
          skipped: 0,
          total: 0,
        }),
        { status: 200, headers: JSON_HEADERS }
      );
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let inserted = 0;
    let skipped = 0;
    const categoryFinal = chercheAssistante ? "Cherche Assistante" : category;

    for (const b of businesses) {
      const name = b.name || b.company_name || "Inconnu";
      if (!name || name === "Inconnu") {
        skipped++;
        continue;
      }
      const address = [b.city_name, b.region, b.country_name].filter(Boolean).join(", ") || null;
      const website = b.website || b.domain ? (b.website || "https://" + b.domain) : null;
      const linkedinUrl = b.linkedin_profile || b.linkedin_url || null;

      const { error } = await supabase.rpc("upsert_linkedin_lead", {
        p_name: name,
        p_address: address,
        p_phone: null,
        p_website: website,
        p_linkedin_url: linkedinUrl,
        p_dept_code: deptCode,
        p_category: categoryFinal,
        p_cherche_assistante: chercheAssistante,
      });
      if (error) skipped++;
      else inserted++;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        inserted,
        skipped,
        total: businesses.length,
        message: `${inserted} lead(s) importé(s), ${skipped} ignoré(s) ou en doublon.`,
      }),
      { status: 200, headers: JSON_HEADERS }
    );
  } catch (e) {
    console.error("vibe-prospecting error:", e);
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Erreur serveur",
        detail: String(e),
        inserted: 0,
        skipped: 0,
        total: 0,
      }),
      { status: 200, headers: JSON_HEADERS }
    );
  }
});
