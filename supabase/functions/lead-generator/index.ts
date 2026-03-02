import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PLACES_KEY   = Deno.env.get("GOOGLE_PLACES_API_KEY")!;
const SELF_URL     = `${SUPABASE_URL}/functions/v1/lead-generator`;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ─── Constantes ──────────────────────────────────────────────
const GRID_STEP_KM   = 7;
const SEARCH_RADIUS  = 5500;
const BATCH_CELLS    = 3;   // cellules par invocation
const MAX_DURATION   = 45;  // secondes max par invocation

const KEYWORDS = [
  "plombier", "électricien", "chauffagiste", "climaticien",
  "pompe à chaleur", "serrurier", "vitrier",
  "entreprise de rénovation", "rénovation intérieure",
  "artisan bâtiment", "entreprise bâtiment",
  "peintre", "plaquiste", "carreleur", "menuisier",
  "couvreur", "charpentier", "zingueur",
  "maçon", "terrassier", "travaux publics",
  "paysagiste", "photovoltaïque", "borne recharge", "domotique",
  "multi services bâtiment",
];

// ─── Bounding boxes des départements français ────────────────
const DEPT_BOUNDS: Record<string, { minLat: number; maxLat: number; minLng: number; maxLng: number; name: string }> = {
  "01": { minLat:45.75,maxLat:46.52,minLng:4.73, maxLng:5.78, name:"Ain" },
  "02": { minLat:49.09,maxLat:50.07,minLng:3.02, maxLng:4.24, name:"Aisne" },
  "03": { minLat:45.98,maxLat:46.80,minLng:2.12, maxLng:3.81, name:"Allier" },
  "04": { minLat:43.59,maxLat:44.75,minLng:5.72, maxLng:6.96, name:"Alpes-de-Haute-Provence" },
  "05": { minLat:44.18,maxLat:45.19,minLng:5.62, maxLng:7.00, name:"Hautes-Alpes" },
  "06": { minLat:43.48,maxLat:44.36,minLng:6.63, maxLng:7.72, name:"Alpes-Maritimes" },
  "07": { minLat:44.29,maxLat:45.45,minLng:3.86, maxLng:4.96, name:"Ardèche" },
  "08": { minLat:49.33,maxLat:50.18,minLng:4.05, maxLng:5.40, name:"Ardennes" },
  "09": { minLat:42.48,maxLat:43.15,minLng:0.96, maxLng:2.42, name:"Ariège" },
  "10": { minLat:47.95,maxLat:48.80,minLng:3.52, maxLng:4.84, name:"Aube" },
  "11": { minLat:42.66,maxLat:43.70,minLng:1.72, maxLng:3.30, name:"Aude" },
  "12": { minLat:43.75,maxLat:44.94,minLng:1.78, maxLng:3.42, name:"Aveyron" },
  "13": { minLat:43.12,maxLat:43.98,minLng:4.23, maxLng:5.81, name:"Bouches-du-Rhône" },
  "14": { minLat:48.74,maxLat:49.35,minLng:-1.15,maxLng:0.46, name:"Calvados" },
  "15": { minLat:44.57,maxLat:45.45,minLng:2.04, maxLng:3.39, name:"Cantal" },
  "16": { minLat:45.19,maxLat:46.14,minLng:-0.39,maxLng:0.96, name:"Charente" },
  "17": { minLat:45.08,maxLat:46.37,minLng:-1.55,maxLng:-0.08,name:"Charente-Maritime" },
  "18": { minLat:46.40,maxLat:47.60,minLng:1.74, maxLng:3.07, name:"Cher" },
  "19": { minLat:44.95,maxLat:45.93,minLng:1.36, maxLng:2.64, name:"Corrèze" },
  "2A": { minLat:41.33,maxLat:42.39,minLng:8.53, maxLng:9.56, name:"Corse-du-Sud" },
  "2B": { minLat:41.91,maxLat:43.03,minLng:8.53, maxLng:9.57, name:"Haute-Corse" },
  "21": { minLat:46.93,maxLat:48.45,minLng:4.08, maxLng:5.62, name:"Côte-d'Or" },
  "22": { minLat:47.94,maxLat:48.79,minLng:-3.66,maxLng:-1.86,name:"Côtes-d'Armor" },
  "23": { minLat:45.56,maxLat:46.44,minLng:1.47, maxLng:2.73, name:"Creuse" },
  "24": { minLat:44.40,maxLat:45.67,minLng:0.26, maxLng:1.71, name:"Dordogne" },
  "25": { minLat:46.64,maxLat:47.85,minLng:5.87, maxLng:7.08, name:"Doubs" },
  "26": { minLat:44.11,maxLat:45.35,minLng:4.59, maxLng:5.62, name:"Drôme" },
  "27": { minLat:48.68,maxLat:49.42,minLng:0.68, maxLng:2.05, name:"Eure" },
  "28": { minLat:47.79,maxLat:48.97,minLng:0.80, maxLng:2.23, name:"Eure-et-Loir" },
  "29": { minLat:47.66,maxLat:48.77,minLng:-5.14,maxLng:-3.32,name:"Finistère" },
  "30": { minLat:43.46,maxLat:44.54,minLng:3.32, maxLng:4.91, name:"Gard" },
  "31": { minLat:42.67,maxLat:43.99,minLng:0.30, maxLng:2.10, name:"Haute-Garonne" },
  "32": { minLat:43.31,maxLat:44.08,minLng:-0.28,maxLng:1.43, name:"Gers" },
  "33": { minLat:44.13,maxLat:45.57,minLng:-1.27,maxLng:0.37, name:"Gironde" },
  "34": { minLat:43.22,maxLat:43.93,minLng:2.88, maxLng:4.07, name:"Hérault" },
  "35": { minLat:47.64,maxLat:48.71,minLng:-2.23,maxLng:-0.86,name:"Ille-et-Vilaine" },
  "36": { minLat:46.29,maxLat:47.15,minLng:0.91, maxLng:2.22, name:"Indre" },
  "37": { minLat:46.76,maxLat:47.71,minLng:0.07, maxLng:1.47, name:"Indre-et-Loire" },
  "38": { minLat:44.70,maxLat:45.95,minLng:4.89, maxLng:6.45, name:"Isère" },
  "39": { minLat:46.21,maxLat:47.49,minLng:5.21, maxLng:6.36, name:"Jura" },
  "40": { minLat:43.48,maxLat:44.54,minLng:-1.53,maxLng:0.12, name:"Landes" },
  "41": { minLat:47.27,maxLat:48.33,minLng:0.70, maxLng:2.44, name:"Loir-et-Cher" },
  "42": { minLat:45.19,maxLat:46.22,minLng:3.54, maxLng:4.77, name:"Loire" },
  "43": { minLat:44.67,maxLat:45.59,minLng:3.12, maxLng:4.44, name:"Haute-Loire" },
  "44": { minLat:46.83,maxLat:47.84,minLng:-2.56,maxLng:-0.90,name:"Loire-Atlantique" },
  "45": { minLat:47.49,maxLat:48.33,minLng:1.54, maxLng:3.21, name:"Loiret" },
  "46": { minLat:44.28,maxLat:45.12,minLng:0.98, maxLng:2.26, name:"Lot" },
  "47": { minLat:43.87,maxLat:44.86,minLng:-0.20,maxLng:1.24, name:"Lot-et-Garonne" },
  "48": { minLat:44.11,maxLat:44.97,minLng:2.87, maxLng:4.00, name:"Lozère" },
  "49": { minLat:46.98,maxLat:47.92,minLng:-1.68,maxLng:-0.00,name:"Maine-et-Loire" },
  "50": { minLat:48.44,maxLat:49.73,minLng:-1.92,maxLng:-0.78,name:"Manche" },
  "51": { minLat:48.51,maxLat:49.47,minLng:3.26, maxLng:4.97, name:"Marne" },
  "52": { minLat:47.51,maxLat:48.69,minLng:4.66, maxLng:5.99, name:"Haute-Marne" },
  "53": { minLat:47.73,maxLat:48.58,minLng:-1.54,maxLng:-0.03,name:"Mayenne" },
  "54": { minLat:48.34,maxLat:49.50,minLng:5.42, maxLng:7.15, name:"Meurthe-et-Moselle" },
  "55": { minLat:48.30,maxLat:49.75,minLng:4.76, maxLng:6.24, name:"Meuse" },
  "56": { minLat:47.22,maxLat:48.01,minLng:-3.74,maxLng:-1.88,name:"Morbihan" },
  "57": { minLat:48.79,maxLat:49.87,minLng:6.14, maxLng:7.64, name:"Moselle" },
  "58": { minLat:46.60,maxLat:47.78,minLng:3.07, maxLng:4.23, name:"Nièvre" },
  "59": { minLat:50.05,maxLat:51.09,minLng:2.08, maxLng:4.27, name:"Nord" },
  "60": { minLat:49.01,maxLat:49.79,minLng:1.72, maxLng:3.16, name:"Oise" },
  "61": { minLat:48.08,maxLat:48.87,minLng:-0.79,maxLng:0.85, name:"Orne" },
  "62": { minLat:50.02,maxLat:50.96,minLng:1.56, maxLng:3.15, name:"Pas-de-Calais" },
  "63": { minLat:45.04,maxLat:46.14,minLng:2.49, maxLng:3.98, name:"Puy-de-Dôme" },
  "64": { minLat:42.77,maxLat:43.80,minLng:-1.80,maxLng:-0.07,name:"Pyrénées-Atlantiques" },
  "65": { minLat:42.67,maxLat:43.69,minLng:-0.14,maxLng:0.96, name:"Hautes-Pyrénées" },
  "66": { minLat:42.33,maxLat:42.92,minLng:1.72, maxLng:3.18, name:"Pyrénées-Orientales" },
  "67": { minLat:47.83,maxLat:49.08,minLng:6.88, maxLng:8.23, name:"Bas-Rhin" },
  "68": { minLat:47.44,maxLat:48.42,minLng:6.88, maxLng:7.77, name:"Haut-Rhin" },
  "69": { minLat:45.47,maxLat:46.30,minLng:4.24, maxLng:5.22, name:"Rhône" },
  "70": { minLat:47.25,maxLat:48.02,minLng:5.56, maxLng:6.82, name:"Haute-Saône" },
  "71": { minLat:46.15,maxLat:47.10,minLng:3.80, maxLng:5.55, name:"Saône-et-Loire" },
  "72": { minLat:47.67,maxLat:48.52,minLng:-0.48,maxLng:1.03, name:"Sarthe" },
  "73": { minLat:45.05,maxLat:45.93,minLng:5.71, maxLng:7.25, name:"Savoie" },
  "74": { minLat:45.70,maxLat:46.42,minLng:5.81, maxLng:7.07, name:"Haute-Savoie" },
  "75": { minLat:48.81,maxLat:48.91,minLng:2.22, maxLng:2.47, name:"Paris" },
  "76": { minLat:49.26,maxLat:50.09,minLng:0.06, maxLng:1.92, name:"Seine-Maritime" },
  "77": { minLat:48.12,maxLat:49.19,minLng:2.39, maxLng:3.56, name:"Seine-et-Marne" },
  "78": { minLat:48.58,maxLat:49.10,minLng:1.45, maxLng:2.28, name:"Yvelines" },
  "79": { minLat:45.96,maxLat:47.02,minLng:-0.82,maxLng:0.51, name:"Deux-Sèvres" },
  "80": { minLat:49.43,maxLat:50.37,minLng:1.37, maxLng:3.11, name:"Somme" },
  "81": { minLat:43.41,maxLat:44.13,minLng:1.57, maxLng:2.96, name:"Tarn" },
  "82": { minLat:43.73,maxLat:44.39,minLng:0.85, maxLng:2.12, name:"Tarn-et-Garonne" },
  "83": { minLat:43.03,maxLat:43.89,minLng:5.66, maxLng:7.00, name:"Var" },
  "84": { minLat:43.73,maxLat:44.46,minLng:4.62, maxLng:5.84, name:"Vaucluse" },
  "85": { minLat:46.33,maxLat:47.12,minLng:-2.39,maxLng:-0.44,name:"Vendée" },
  "86": { minLat:46.09,maxLat:46.94,minLng:-0.03,maxLng:1.22, name:"Vienne" },
  "87": { minLat:45.54,maxLat:46.38,minLng:0.65, maxLng:2.08, name:"Haute-Vienne" },
  "88": { minLat:47.75,maxLat:48.66,minLng:5.66, maxLng:7.20, name:"Vosges" },
  "89": { minLat:47.44,maxLat:48.37,minLng:2.73, maxLng:4.38, name:"Yonne" },
  "90": { minLat:47.42,maxLat:47.83,minLng:6.74, maxLng:7.21, name:"Territoire de Belfort" },
  "91": { minLat:48.30,maxLat:48.78,minLng:1.91, maxLng:2.59, name:"Essonne" },
  "92": { minLat:48.78,maxLat:48.95,minLng:2.14, maxLng:2.33, name:"Hauts-de-Seine" },
  "93": { minLat:48.84,maxLat:49.01,minLng:2.30, maxLng:2.59, name:"Seine-Saint-Denis" },
  "94": { minLat:48.71,maxLat:48.86,minLng:2.28, maxLng:2.58, name:"Val-de-Marne" },
  "95": { minLat:48.93,maxLat:49.26,minLng:1.63, maxLng:2.58, name:"Val-d'Oise" },
};

// ─── Helpers ─────────────────────────────────────────────────

function generateGrid(dept: string) {
  const b = DEPT_BOUNDS[dept];
  if (!b) throw new Error(`Département inconnu: ${dept}`);
  const latStep = GRID_STEP_KM / 111;
  const midLat  = (b.minLat + b.maxLat) / 2;
  const lngStep = GRID_STEP_KM / (111 * Math.cos(midLat * Math.PI / 180));
  const cells: { lat: number; lng: number }[] = [];
  for (let lat = b.minLat; lat <= b.maxLat; lat += latStep) {
    for (let lng = b.minLng; lng <= b.maxLng; lng += lngStep) {
      cells.push({ lat: +lat.toFixed(5), lng: +lng.toFixed(5) });
    }
  }
  return cells;
}

function normalizePhone(raw: string): string {
  return raw.replace(/\s|\(|\)|-|\./g, "")
            .replace(/^\+33/, "0")
            .replace(/^0033/, "0");
}

function isMobile(phone: string) {
  return /^0[67]/.test(phone);
}

function extractMobilesFromHtml(html: string): string[] {
  const matches = html.match(/(?:(?:\+|00)33\s*[67]|0[67])[\s.\-]?\d{2}[\s.\-]?\d{2}[\s.\-]?\d{2}[\s.\-]?\d{2}/g) || [];
  return [...new Set(matches.map(normalizePhone).filter(isMobile))];
}

function sizeBucket(count: number, name: string): string {
  const big = /groupe|holding|international|sarl|sas|eurl/i.test(name);
  let bucket = count < 25 ? 0 : count < 90 ? 1 : count < 250 ? 2 : 3;
  if (big && bucket < 3) bucket++;
  return ["0-3", "4-10", "10-50", "50+"][bucket];
}

function calcPriority(bucket: string, rating: number): string {
  if (bucket === "0-3" || bucket === "4-10") return rating >= 1 ? "A" : "B";
  if (bucket === "10-50") return "B";
  return "C";
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Google Places API ────────────────────────────────────────

const PLACES_FIELDS = [
  "places.id", "places.displayName", "places.formattedAddress",
  "places.location", "places.internationalPhoneNumber",
  "places.nationalPhoneNumber", "places.websiteUri",
  "places.googleMapsUri", "places.rating", "places.userRatingCount",
].join(",");

async function searchPlaces(keyword: string, lat: number, lng: number): Promise<any[]> {
  const resp = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": PLACES_KEY,
      "X-Goog-FieldMask": PLACES_FIELDS,
    },
    body: JSON.stringify({
      textQuery: keyword + " France",
      locationBias: {
        circle: { center: { latitude: lat, longitude: lng }, radius: SEARCH_RADIUS },
      },
      languageCode: "fr",
      maxResultCount: 20,
    }),
  });

  if (resp.status === 429) {
    const wait = 30000 + Math.random() * 60000;
    console.log(`Rate limited, waiting ${Math.round(wait/1000)}s`);
    await sleep(wait);
    return searchPlaces(keyword, lat, lng);
  }

  if (!resp.ok) return [];
  const data = await resp.json();
  return data.places || [];
}

async function enrichFromWebsite(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 10000);
    const r = await fetch(url, { signal: controller.signal });
    if (!r.ok) return null;
    const html = (await r.text()).slice(0, 300_000);
    const mobiles = extractMobilesFromHtml(html);
    if (mobiles.length) return mobiles[0];

    // Essayer /contact
    const base = new URL(url).origin;
    const r2 = await fetch(`${base}/contact`, { signal: controller.signal }).catch(() => null);
    if (r2?.ok) {
      const html2 = (await r2.text()).slice(0, 300_000);
      const mobiles2 = extractMobilesFromHtml(html2);
      if (mobiles2.length) return mobiles2[0];
    }
  } catch {}
  return null;
}

// ─── Traitement d'un lieu ─────────────────────────────────────

async function processPlace(place: any, deptCode: string, stats: { found: number; inserted: number; skipped: number }) {
  stats.found++;

  const rawPhone = place.internationalPhoneNumber || place.nationalPhoneNumber || "";
  const phone = rawPhone ? normalizePhone(rawPhone) : "";
  const website = place.websiteUri || null;

  let phoneMobile: string | null = null;
  let phoneFixed:  string | null = null;

  if (phone) {
    if (isMobile(phone)) phoneMobile = phone;
    else phoneFixed = phone;
  }

  // Enrichissement web si mobile absent
  if (!phoneMobile && website) {
    phoneMobile = await enrichFromWebsite(website);
  }

  if (!phoneMobile && !phoneFixed) {
    stats.skipped++;
    return; // ignorer si aucun numéro
  }

  const count  = place.userRatingCount ?? 0;
  const rating = place.rating ?? 0;
  const name   = place.displayName?.text || "";
  const bucket = sizeBucket(count, name);
  const priority = calcPriority(bucket, rating);

  if (phoneMobile) {
    const { error } = await supabase.from("leads").upsert({
      place_id: place.id,
      name,
      address: place.formattedAddress,
      lat: place.location?.latitude,
      lng: place.location?.longitude,
      phone_mobile: phoneMobile,
      phone_fixed: phoneFixed,
      website,
      maps_url: place.googleMapsUri,
      rating: rating || null,
      reviews_count: count,
      size_bucket: bucket,
      priority,
      dept_code: deptCode,
    }, { onConflict: "place_id", ignoreDuplicates: true });

    if (!error) stats.inserted++;
    else if (error.code !== "23505") console.error("Insert error:", error.message);
    else stats.skipped++;
  } else {
    // Uniquement un fixe
    await supabase.from("leads_fixed").insert({
      place_id: place.id,
      name,
      phone_fixed: phoneFixed,
      website,
      dept_code: deptCode,
      enriched: false,
    }).single();
    stats.skipped++;
  }
}

// ─── Point d'entrée principal ─────────────────────────────────

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  const body = await req.json().catch(() => ({}));
  const jobId: string = body.job_id;
  const jsonHeaders = { ...CORS, "Content-Type": "application/json" };

  if (!jobId) return new Response(JSON.stringify({ error: "job_id required" }), { status: 400, headers: jsonHeaders });

  // Charger le job
  const { data: job, error: jobErr } = await supabase
    .from("lead_jobs").select("*").eq("id", jobId).single();
  if (jobErr || !job) return new Response(JSON.stringify({ error: "Job not found" }), { status: 404, headers: jsonHeaders });
  if (job.status === "DONE" || job.status === "FAILED") {
    return new Response(JSON.stringify({ ok: true, status: job.status }), { headers: jsonHeaders });
  }

  // Générer la grille si premier appel
  const cursor = job.progress_cursor as any || {};
  let cells: { lat: number; lng: number }[] = cursor.cells || [];
  if (!cells.length) {
    try { cells = generateGrid(job.dept_code); }
    catch (e: any) {
      await supabase.from("lead_jobs").update({ status: "FAILED", error_log: e.message, finished_at: new Date().toISOString() }).eq("id", jobId);
      return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: jsonHeaders });
    }
  }

  const cellIndex    = cursor.cell_index    ?? 0;
  const keywordIndex = cursor.keyword_index ?? 0;
  const totalCells   = cells.length;
  // On track la progression en nb de requêtes (cellules × mots-clés)
  const totalRequests = totalCells * KEYWORDS.length;

  // Marquer RUNNING — total_cells = nb de requêtes total pour une progression fluide
  await supabase.from("lead_jobs").update({
    status: "RUNNING",
    started_at: job.started_at ?? new Date().toISOString(),
    total_cells: totalRequests,
  }).eq("id", jobId);

  const stats = {
    found: job.total_found || 0,
    inserted: job.total_inserted || 0,
    skipped: job.total_skipped || 0,
  };

  const startTime = Date.now();
  let ci = cellIndex;
  let ki = keywordIndex;

  outer:
  while (ci < cells.length && (Date.now() - startTime) / 1000 < MAX_DURATION) {
    const cell = cells[ci];
    while (ki < KEYWORDS.length) {
      if ((Date.now() - startTime) / 1000 >= MAX_DURATION) break outer;

      const places = await searchPlaces(KEYWORDS[ki], cell.lat, cell.lng);
      await sleep(200);

      for (const place of places) {
        await processPlace(place, job.dept_code, stats);
      }

      ki++;
      // Sauvegarde toutes les 3 requêtes (progression visible dès le départ)
      if (ki % 3 === 0) {
        const processedRequests = ci * KEYWORDS.length + ki;
        await supabase.from("lead_jobs").update({
          total_found: stats.found,
          total_inserted: stats.inserted,
          total_skipped: stats.skipped,
          processed_cells: processedRequests,
          progress_cursor: { cells, cell_index: ci, keyword_index: ki },
        }).eq("id", jobId);
      }
    }
    ki = 0;
    ci++;
  }

  const isDone = ci >= cells.length;
  const finalProcessed = ci * KEYWORDS.length + ki;

  // Mise à jour finale
  await supabase.from("lead_jobs").update({
    status: isDone ? "DONE" : "RUNNING",
    total_found: stats.found,
    total_inserted: stats.inserted,
    total_skipped: stats.skipped,
    processed_cells: isDone ? totalRequests : finalProcessed,
    finished_at: isDone ? new Date().toISOString() : null,
    progress_cursor: isDone ? {} : { cells, cell_index: ci, keyword_index: ki },
  }).eq("id", jobId);

  // Si pas fini, s'auto-invoquer pour la suite (fire & forget)
  if (!isDone) {
    fetch(SELF_URL, {
      method: "POST",
      headers: { "Authorization": `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ job_id: jobId }),
    }).catch(() => {});
  }

  return new Response(JSON.stringify({
    ok: true,
    done: isDone,
    cells_done: ci,
    total_cells: totalCells,
    inserted: stats.inserted,
  }), { headers: jsonHeaders });
});
