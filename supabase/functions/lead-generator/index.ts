import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const PLACES_KEY   = Deno.env.get("GOOGLE_PLACES_API_KEY") ?? "";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ─── Constantes ──────────────────────────────────────────────
const GRID_STEP_KM   = 12;
const SEARCH_RADIUS  = 9000;
const MAX_DURATION   = 18; // secondes — le frontend relance automatiquement
const PARALLEL_KW    = 4;
const PARALLEL_PLACE = 8;

const KEYWORDS = [
  "plombier", "électricien", "chauffagiste", "artisan bâtiment",
  "entreprise rénovation", "couvreur", "maçon", "menuisier",
  "peintre bâtiment", "photovoltaïque", "terrassier", "multi services bâtiment",
];

const KEYWORD_CATEGORY: Record<string, string> = {
  "plombier": "Plomberie", "électricien": "Électricité",
  "chauffagiste": "Chauffage", "artisan bâtiment": "Artisan BTP",
  "entreprise rénovation": "Rénovation", "couvreur": "Couverture",
  "maçon": "Maçonnerie", "menuisier": "Menuiserie",
  "peintre bâtiment": "Peinture", "photovoltaïque": "Photovoltaïque",
  "terrassier": "Terrassement", "multi services bâtiment": "Multi-services",
};

const DEPT_BOUNDS: Record<string, { minLat: number; maxLat: number; minLng: number; maxLng: number }> = {
  "01":{minLat:45.75,maxLat:46.52,minLng:4.73,maxLng:5.78},
  "02":{minLat:49.09,maxLat:50.07,minLng:3.02,maxLng:4.24},
  "03":{minLat:45.98,maxLat:46.80,minLng:2.12,maxLng:3.81},
  "04":{minLat:43.59,maxLat:44.75,minLng:5.72,maxLng:6.96},
  "05":{minLat:44.18,maxLat:45.19,minLng:5.62,maxLng:7.00},
  "06":{minLat:43.48,maxLat:44.36,minLng:6.63,maxLng:7.72},
  "07":{minLat:44.29,maxLat:45.45,minLng:3.86,maxLng:4.96},
  "08":{minLat:49.33,maxLat:50.18,minLng:4.05,maxLng:5.40},
  "09":{minLat:42.48,maxLat:43.15,minLng:0.96,maxLng:2.42},
  "10":{minLat:47.95,maxLat:48.80,minLng:3.52,maxLng:4.84},
  "11":{minLat:42.66,maxLat:43.70,minLng:1.72,maxLng:3.30},
  "12":{minLat:43.75,maxLat:44.94,minLng:1.78,maxLng:3.42},
  "13":{minLat:43.12,maxLat:43.98,minLng:4.23,maxLng:5.81},
  "14":{minLat:48.74,maxLat:49.35,minLng:-1.15,maxLng:0.46},
  "15":{minLat:44.57,maxLat:45.45,minLng:2.04,maxLng:3.39},
  "16":{minLat:45.19,maxLat:46.14,minLng:-0.39,maxLng:0.96},
  "17":{minLat:45.08,maxLat:46.37,minLng:-1.55,maxLng:-0.08},
  "18":{minLat:46.40,maxLat:47.60,minLng:1.74,maxLng:3.07},
  "19":{minLat:44.95,maxLat:45.93,minLng:1.36,maxLng:2.64},
  "2A":{minLat:41.33,maxLat:42.39,minLng:8.53,maxLng:9.56},
  "2B":{minLat:41.91,maxLat:43.03,minLng:8.53,maxLng:9.57},
  "21":{minLat:46.93,maxLat:48.45,minLng:4.08,maxLng:5.62},
  "22":{minLat:47.94,maxLat:48.79,minLng:-3.66,maxLng:-1.86},
  "23":{minLat:45.56,maxLat:46.44,minLng:1.47,maxLng:2.73},
  "24":{minLat:44.40,maxLat:45.67,minLng:0.26,maxLng:1.71},
  "25":{minLat:46.64,maxLat:47.85,minLng:5.87,maxLng:7.08},
  "26":{minLat:44.11,maxLat:45.35,minLng:4.59,maxLng:5.62},
  "27":{minLat:48.68,maxLat:49.42,minLng:0.68,maxLng:2.05},
  "28":{minLat:47.79,maxLat:48.97,minLng:0.80,maxLng:2.23},
  "29":{minLat:47.66,maxLat:48.77,minLng:-5.14,maxLng:-3.32},
  "30":{minLat:43.46,maxLat:44.54,minLng:3.32,maxLng:4.91},
  "31":{minLat:42.67,maxLat:43.99,minLng:0.30,maxLng:2.10},
  "32":{minLat:43.31,maxLat:44.08,minLng:-0.28,maxLng:1.43},
  "33":{minLat:44.13,maxLat:45.57,minLng:-1.27,maxLng:0.37},
  "34":{minLat:43.22,maxLat:43.93,minLng:2.88,maxLng:4.07},
  "35":{minLat:47.64,maxLat:48.71,minLng:-2.23,maxLng:-0.86},
  "36":{minLat:46.29,maxLat:47.15,minLng:0.91,maxLng:2.22},
  "37":{minLat:46.76,maxLat:47.71,minLng:0.07,maxLng:1.47},
  "38":{minLat:44.70,maxLat:45.95,minLng:4.89,maxLng:6.45},
  "39":{minLat:46.21,maxLat:47.49,minLng:5.21,maxLng:6.36},
  "40":{minLat:43.48,maxLat:44.54,minLng:-1.53,maxLng:0.12},
  "41":{minLat:47.27,maxLat:48.33,minLng:0.70,maxLng:2.44},
  "42":{minLat:45.19,maxLat:46.22,minLng:3.54,maxLng:4.77},
  "43":{minLat:44.67,maxLat:45.59,minLng:3.12,maxLng:4.44},
  "44":{minLat:46.83,maxLat:47.84,minLng:-2.56,maxLng:-0.90},
  "45":{minLat:47.49,maxLat:48.33,minLng:1.54,maxLng:3.21},
  "46":{minLat:44.28,maxLat:45.12,minLng:0.98,maxLng:2.26},
  "47":{minLat:43.87,maxLat:44.86,minLng:-0.20,maxLng:1.24},
  "48":{minLat:44.11,maxLat:44.97,minLng:2.87,maxLng:4.00},
  "49":{minLat:46.98,maxLat:47.92,minLng:-1.68,maxLng:0.00},
  "50":{minLat:48.44,maxLat:49.73,minLng:-1.92,maxLng:-0.78},
  "51":{minLat:48.51,maxLat:49.47,minLng:3.26,maxLng:4.97},
  "52":{minLat:47.51,maxLat:48.69,minLng:4.66,maxLng:5.99},
  "53":{minLat:47.73,maxLat:48.58,minLng:-1.54,maxLng:-0.03},
  "54":{minLat:48.34,maxLat:49.50,minLng:5.42,maxLng:7.15},
  "55":{minLat:48.30,maxLat:49.75,minLng:4.76,maxLng:6.24},
  "56":{minLat:47.22,maxLat:48.01,minLng:-3.74,maxLng:-1.88},
  "57":{minLat:48.79,maxLat:49.87,minLng:6.14,maxLng:7.64},
  "58":{minLat:46.60,maxLat:47.78,minLng:3.07,maxLng:4.23},
  "59":{minLat:50.05,maxLat:51.09,minLng:2.08,maxLng:4.27},
  "60":{minLat:49.01,maxLat:49.79,minLng:1.72,maxLng:3.16},
  "61":{minLat:48.08,maxLat:48.87,minLng:-0.79,maxLng:0.85},
  "62":{minLat:50.02,maxLat:50.96,minLng:1.56,maxLng:3.15},
  "63":{minLat:45.04,maxLat:46.14,minLng:2.49,maxLng:3.98},
  "64":{minLat:42.77,maxLat:43.80,minLng:-1.80,maxLng:-0.07},
  "65":{minLat:42.67,maxLat:43.69,minLng:-0.14,maxLng:0.96},
  "66":{minLat:42.33,maxLat:42.92,minLng:1.72,maxLng:3.18},
  "67":{minLat:47.83,maxLat:49.08,minLng:6.88,maxLng:8.23},
  "68":{minLat:47.44,maxLat:48.42,minLng:6.88,maxLng:7.77},
  "69":{minLat:45.47,maxLat:46.30,minLng:4.24,maxLng:5.22},
  "70":{minLat:47.25,maxLat:48.02,minLng:5.56,maxLng:6.82},
  "71":{minLat:46.15,maxLat:47.10,minLng:3.80,maxLng:5.55},
  "72":{minLat:47.67,maxLat:48.52,minLng:-0.48,maxLng:1.03},
  "73":{minLat:45.05,maxLat:45.93,minLng:5.71,maxLng:7.25},
  "74":{minLat:45.70,maxLat:46.42,minLng:5.81,maxLng:7.07},
  "75":{minLat:48.81,maxLat:48.91,minLng:2.22,maxLng:2.47},
  "76":{minLat:49.26,maxLat:50.09,minLng:0.06,maxLng:1.92},
  "77":{minLat:48.12,maxLat:49.19,minLng:2.39,maxLng:3.56},
  "78":{minLat:48.58,maxLat:49.10,minLng:1.45,maxLng:2.28},
  "79":{minLat:45.96,maxLat:47.02,minLng:-0.82,maxLng:0.51},
  "80":{minLat:49.43,maxLat:50.37,minLng:1.37,maxLng:3.11},
  "81":{minLat:43.41,maxLat:44.13,minLng:1.57,maxLng:2.96},
  "82":{minLat:43.73,maxLat:44.39,minLng:0.85,maxLng:2.12},
  "83":{minLat:43.03,maxLat:43.89,minLng:5.66,maxLng:7.00},
  "84":{minLat:43.73,maxLat:44.46,minLng:4.62,maxLng:5.84},
  "85":{minLat:46.33,maxLat:47.12,minLng:-2.39,maxLng:-0.44},
  "86":{minLat:46.09,maxLat:46.94,minLng:-0.03,maxLng:1.22},
  "87":{minLat:45.54,maxLat:46.38,minLng:0.65,maxLng:2.08},
  "88":{minLat:47.75,maxLat:48.66,minLng:5.66,maxLng:7.20},
  "89":{minLat:47.44,maxLat:48.37,minLng:2.73,maxLng:4.38},
  "90":{minLat:47.42,maxLat:47.83,minLng:6.74,maxLng:7.21},
  "91":{minLat:48.30,maxLat:48.78,minLng:1.91,maxLng:2.59},
  "92":{minLat:48.78,maxLat:48.95,minLng:2.14,maxLng:2.33},
  "93":{minLat:48.84,maxLat:49.01,minLng:2.30,maxLng:2.59},
  "94":{minLat:48.71,maxLat:48.86,minLng:2.28,maxLng:2.58},
  "95":{minLat:48.93,maxLat:49.26,minLng:1.63,maxLng:2.58},
};

// ─── Helpers ─────────────────────────────────────────────────

function generateGrid(dept: string): { lat: number; lng: number }[] {
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
  return raw.replace(/[\s()\-\.]/g, "").replace(/^\+33/, "0").replace(/^0033/, "0");
}

function isMobile(p: string) { return /^0[67]/.test(p); }

function deptFromAddress(addr: string, fallback: string): string {
  const m = addr.match(/\b(\d{5})\b/);
  if (!m) return fallback;
  const cp = m[1];
  if (cp.startsWith("200") || cp.startsWith("201")) return "2A";
  if (cp.startsWith("202") || cp.startsWith("206")) return "2B";
  if (cp.startsWith("97") || cp.startsWith("98")) return fallback;
  return cp.substring(0, 2);
}

function sizeBucket(count: number, name: string): string {
  const big = /groupe|holding|international|sarl|sas|eurl/i.test(name);
  let b = count < 25 ? 0 : count < 90 ? 1 : count < 250 ? 2 : 3;
  if (big && b < 3) b++;
  return ["0-3", "4-10", "10-50", "50+"][b];
}

function calcPriority(bucket: string, rating: number): string {
  if (bucket === "0-3" || bucket === "4-10") return rating >= 1 ? "A" : "B";
  if (bucket === "10-50") return "B";
  return "C";
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

// ─── Google Places API ────────────────────────────────────────

const FIELDS = [
  "places.id", "places.displayName", "places.formattedAddress",
  "places.location", "places.internationalPhoneNumber",
  "places.nationalPhoneNumber", "places.websiteUri",
  "places.googleMapsUri", "places.rating", "places.userRatingCount",
].join(",");

async function searchPlaces(kw: string, lat: number, lng: number): Promise<any[]> {
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST", signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": PLACES_KEY,
        "X-Goog-FieldMask": FIELDS,
      },
      body: JSON.stringify({
        textQuery: kw + " France",
        locationBias: { circle: { center: { latitude: lat, longitude: lng }, radius: SEARCH_RADIUS } },
        languageCode: "fr", maxResultCount: 20,
      }),
    });
    clearTimeout(tid);
    if (r.status === 429) return [];
    if (!r.ok) return [];
    const d = await r.json();
    return d.places || [];
  } catch (_e) {
    return [];
  }
}

async function processPlace(
  place: any, jobDept: string, category: string,
  stats: { found: number; inserted: number; skipped: number }
) {
  stats.found++;
  const rawPhone = place.internationalPhoneNumber || place.nationalPhoneNumber || "";
  const phone = rawPhone ? normalizePhone(rawPhone) : "";
  const address = place.formattedAddress || "";
  const deptCode = deptFromAddress(address, jobDept);
  let phoneMobile: string | null = null;
  let phoneFixed: string | null = null;
  if (phone) { if (isMobile(phone)) phoneMobile = phone; else phoneFixed = phone; }
  if (!phoneMobile && !phoneFixed) { stats.skipped++; return; }
  const count = place.userRatingCount ?? 0;
  const rating = place.rating ?? 0;
  const name = place.displayName?.text || "";
  const bucket = sizeBucket(count, name);
  const priority = calcPriority(bucket, rating);
  if (phoneMobile) {
    const { error } = await supabase.from("leads" as any).upsert({
      place_id: place.id, name, address,
      lat: place.location?.latitude, lng: place.location?.longitude,
      phone_mobile: phoneMobile, phone_fixed: phoneFixed,
      website: place.websiteUri || null, maps_url: place.googleMapsUri,
      rating: rating || null, reviews_count: count,
      size_bucket: bucket, priority, dept_code: deptCode, category,
    }, { onConflict: "place_id", ignoreDuplicates: true });
    if (!error) stats.inserted++;
    else stats.skipped++;
  } else {
    await supabase.from("leads_fixed" as any).insert({
      place_id: place.id, name, phone_fixed: phoneFixed,
      website: place.websiteUri || null, dept_code: deptCode, enriched: false,
    }).then(() => {}).catch(() => {});
    stats.skipped++;
  }
}

async function runProcessing(job: any, cells: { lat: number; lng: number }[]): Promise<boolean> {
  const cursor = (job.progress_cursor as any) || {};
  const cellIndex = cursor.cell_index ?? 0;
  const stats = { found: job.total_found || 0, inserted: job.total_inserted || 0, skipped: job.total_skipped || 0 };
  const startTime = Date.now();
  let ci = cellIndex;
  try {
    while (ci < cells.length && (Date.now() - startTime) / 1000 < MAX_DURATION) {
      const cell = cells[ci];
      const seenIds = new Set<string>();
      const allPlaces: { place: any; category: string }[] = [];
      for (let batch = 0; batch < KEYWORDS.length; batch += PARALLEL_KW) {
        if ((Date.now() - startTime) / 1000 >= MAX_DURATION) break;
        const kwBatch = KEYWORDS.slice(batch, batch + PARALLEL_KW);
        const results = await Promise.all(kwBatch.map((kw) => searchPlaces(kw, cell.lat, cell.lng).catch(() => [])));
        await sleep(100);
        results.forEach((places, idx) => {
          const cat = KEYWORD_CATEGORY[kwBatch[idx]] || kwBatch[idx];
          for (const p of places) {
            if (p.id && !seenIds.has(p.id)) { seenIds.add(p.id); allPlaces.push({ place: p, category: cat }); }
          }
        });
      }
      for (let p = 0; p < allPlaces.length; p += PARALLEL_PLACE) {
        if ((Date.now() - startTime) / 1000 >= MAX_DURATION) break;
        await Promise.all(
          allPlaces.slice(p, p + PARALLEL_PLACE).map(({ place, category }) =>
            processPlace(place, job.dept_code, category, stats).catch(() => {})
          )
        );
      }
      ci++;
      await supabase.from("lead_jobs" as any).update({
        total_found: stats.found, total_inserted: stats.inserted, total_skipped: stats.skipped,
        processed_cells: ci, progress_cursor: { cell_index: ci },
      }).eq("id", job.id).then(() => {}).catch(() => {});
    }
  } catch (e: any) {
    console.error("[runProcessing] error:", e?.message);
    await supabase.from("lead_jobs" as any).update({
      total_found: stats.found, total_inserted: stats.inserted, total_skipped: stats.skipped,
      processed_cells: ci, progress_cursor: { cell_index: ci },
    }).eq("id", job.id).catch(() => {});
  }
  const isDone = ci >= cells.length;
  await supabase.from("lead_jobs" as any).update({
    status: isDone ? "DONE" : "RUNNING",
    total_found: stats.found, total_inserted: stats.inserted, total_skipped: stats.skipped,
    processed_cells: isDone ? cells.length : ci,
    finished_at: isDone ? new Date().toISOString() : null,
    progress_cursor: isDone ? {} : { cell_index: ci },
  }).eq("id", job.id).catch(() => {});
  return isDone;
}

// ─── CORS ─────────────────────────────────────────────────────

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── Point d'entrée ──────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const jsonHeaders = { ...CORS, "Content-Type": "application/json" };
  let jobId = "";

  try {
    const body = await req.json().catch(() => ({}));
    jobId = body.job_id || "";

    if (!jobId) {
      return new Response(JSON.stringify({ error: "job_id required" }), { status: 400, headers: jsonHeaders });
    }

    const { data: job, error: jobErr } = await supabase
      .from("lead_jobs" as any).select("*").eq("id", jobId).single();
    if (jobErr || !job) {
      return new Response(JSON.stringify({ error: "Job not found" }), { status: 404, headers: jsonHeaders });
    }
    if (job.status === "DONE" || job.status === "FAILED") {
      return new Response(JSON.stringify({ ok: true, status: job.status, done: job.status === "DONE" }), { headers: jsonHeaders });
    }

    let cells: { lat: number; lng: number }[] = [];
    try {
      cells = generateGrid(job.dept_code);
    } catch (e: any) {
      await supabase.from("lead_jobs" as any).update({
        status: "FAILED", error_log: e.message, finished_at: new Date().toISOString(),
      }).eq("id", jobId);
      return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: jsonHeaders });
    }

    await supabase.from("lead_jobs" as any).update({
      status: "RUNNING",
      started_at: job.started_at ?? new Date().toISOString(),
      total_cells: cells.length,
    }).eq("id", jobId).then(() => {}).catch(() => {});

    const isDone = await runProcessing(job, cells);

    const { data: finalJob } = await supabase
      .from("lead_jobs" as any).select("processed_cells").eq("id", jobId).single();

    return new Response(JSON.stringify({
      ok: true, done: isDone,
      cells_done: finalJob?.processed_cells ?? 0,
      total_cells: cells.length,
    }), { headers: jsonHeaders });

  } catch (err: any) {
    const msg = err?.message || String(err);
    console.error("[lead-generator] crash:", msg);
    if (jobId) {
      await supabase.from("lead_jobs" as any).update({
        status: "FAILED", error_log: `[crash] ${msg}`, finished_at: new Date().toISOString(),
      }).eq("id", jobId).catch(() => {});
    }
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: jsonHeaders });
  }
});
