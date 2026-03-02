/**
 * lead-generator — PROXY SIMPLE
 *
 * Reçoit { keyword, lat, lng } → appelle Google Places API → retourne les lieux bruts.
 * Durée max : ~2 secondes. L'orchestration (boucle cellules/mots-clés + sauvegarde DB)
 * est entièrement gérée côté frontend, sans aucun timeout.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const PLACES_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY") ?? "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const JSON_HEADERS = { ...CORS, "Content-Type": "application/json" };

const FIELDS = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.internationalPhoneNumber",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "places.googleMapsUri",
  "places.rating",
  "places.userRatingCount",
].join(",");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const { keyword, lat, lng, radius = 9000 } = await req.json();

    if (!keyword || lat == null || lng == null) {
      return new Response(
        JSON.stringify({ error: "keyword, lat and lng are required" }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 8000);

    const resp = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": PLACES_KEY,
        "X-Goog-FieldMask": FIELDS,
      },
      body: JSON.stringify({
        textQuery: `${keyword} France`,
        locationBias: {
          circle: { center: { latitude: lat, longitude: lng }, radius },
        },
        languageCode: "fr",
        maxResultCount: 20,
      }),
    });

    clearTimeout(tid);

    if (resp.status === 429) {
      return new Response(JSON.stringify({ places: [], rateLimited: true }), {
        headers: JSON_HEADERS,
      });
    }

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      return new Response(
        JSON.stringify({ places: [], error: `Places API ${resp.status}: ${text}` }),
        { headers: JSON_HEADERS }
      );
    }

    const data = await resp.json();
    return new Response(
      JSON.stringify({ places: data.places || [] }),
      { headers: JSON_HEADERS }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ places: [], error: err?.message || "unknown error" }),
      { status: 500, headers: JSON_HEADERS }
    );
  }
});
