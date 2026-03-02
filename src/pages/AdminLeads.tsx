import { useState, useEffect, useRef, useCallback } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import {
  Loader2, Zap, Users, List, RefreshCw, ExternalLink, Phone,
  Globe, ChevronLeft, ChevronRight, CheckCircle2, XCircle, AlertCircle, Clock,
} from "lucide-react";
import {
  DEPTS, useLeadJobs, useAdminLeads, useLeadStats, useGenerateLeads,
  useAssignLeads, useRetryJob, useStopJob, useGeneratedDepts, useLeadsFixed,
  useLeadsFixedDepts, LeadJob, Lead, LeadFixed,
} from "@/hooks/useLeads";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useClosers } from "@/hooks/useClosers";

// ─── Helpers UI ───────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  CONTACTED: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  QUALIFIED: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  LOST: "bg-red-500/10 text-red-400 border-red-500/20",
  SIGNED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

const JOB_ICONS: Record<string, React.ReactNode> = {
  PENDING:  <Clock className="h-3.5 w-3.5" />,
  RUNNING:  <Loader2 className="h-3.5 w-3.5 animate-spin" />,
  DONE:     <CheckCircle2 className="h-3.5 w-3.5" />,
  FAILED:   <XCircle className="h-3.5 w-3.5" />,
  STOPPED:  <XCircle className="h-3.5 w-3.5" />,
};

const JOB_COLORS: Record<string, string> = {
  PENDING: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  RUNNING: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  DONE:    "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  FAILED:  "bg-red-500/10 text-red-400 border-red-500/20",
  STOPPED: "bg-red-500/10 text-red-400 border-red-500/20",
};

const PRIORITY_COLORS: Record<string, string> = {
  A: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  B: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  C: "bg-red-500/10 text-red-400 border-red-500/20",
};

function durationStr(job: LeadJob) {
  if (!job.started_at) return "—";
  const end = job.finished_at ? new Date(job.finished_at) : new Date();
  const secs = Math.round((end.getTime() - new Date(job.started_at).getTime()) / 1000);
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

function progressPct(job: LeadJob) {
  if (!job.total_cells) return 0;
  return Math.round((job.processed_cells / job.total_cells) * 100);
}

// ─── Constantes génération ────────────────────────────────────

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

const DEPT_BOUNDS: Record<string, [number, number, number, number]> = {
  // [minLat, maxLat, minLng, maxLng]
  "01":[45.75,46.52,4.73,5.78],"02":[49.09,50.07,3.02,4.24],"03":[45.98,46.80,2.12,3.81],
  "04":[43.59,44.75,5.72,6.96],"05":[44.18,45.19,5.62,7.00],"06":[43.48,44.36,6.63,7.72],
  "07":[44.29,45.45,3.86,4.96],"08":[49.33,50.18,4.05,5.40],"09":[42.48,43.15,0.96,2.42],
  "10":[47.95,48.80,3.52,4.84],"11":[42.66,43.70,1.72,3.30],"12":[43.75,44.94,1.78,3.42],
  "13":[43.12,43.98,4.23,5.81],"14":[48.74,49.35,-1.15,0.46],"15":[44.57,45.45,2.04,3.39],
  "16":[45.19,46.14,-0.39,0.96],"17":[45.08,46.37,-1.55,-0.08],"18":[46.40,47.60,1.74,3.07],
  "19":[44.95,45.93,1.36,2.64],"2A":[41.33,42.39,8.53,9.56],"2B":[41.91,43.03,8.53,9.57],
  "21":[46.93,48.45,4.08,5.62],"22":[47.94,48.79,-3.66,-1.86],"23":[45.56,46.44,1.47,2.73],
  "24":[44.40,45.67,0.26,1.71],"25":[46.64,47.85,5.87,7.08],"26":[44.11,45.35,4.59,5.62],
  "27":[48.68,49.42,0.68,2.05],"28":[47.79,48.97,0.80,2.23],"29":[47.66,48.77,-5.14,-3.32],
  "30":[43.46,44.54,3.32,4.91],"31":[42.67,43.99,0.30,2.10],"32":[43.31,44.08,-0.28,1.43],
  "33":[44.13,45.57,-1.27,0.37],"34":[43.22,43.93,2.88,4.07],"35":[47.64,48.71,-2.23,-0.86],
  "36":[46.29,47.15,0.91,2.22],"37":[46.76,47.71,0.07,1.47],"38":[44.70,45.95,4.89,6.45],
  "39":[46.21,47.49,5.21,6.36],"40":[43.48,44.54,-1.53,0.12],"41":[47.27,48.33,0.70,2.44],
  "42":[45.19,46.22,3.54,4.77],"43":[44.67,45.59,3.12,4.44],"44":[46.83,47.84,-2.56,-0.90],
  "45":[47.49,48.33,1.54,3.21],"46":[44.28,45.12,0.98,2.26],"47":[43.87,44.86,-0.20,1.24],
  "48":[44.11,44.97,2.87,4.00],"49":[46.98,47.92,-1.68,0.00],"50":[48.44,49.73,-1.92,-0.78],
  "51":[48.51,49.47,3.26,4.97],"52":[47.51,48.69,4.66,5.99],"53":[47.73,48.58,-1.54,-0.03],
  "54":[48.34,49.50,5.42,7.15],"55":[48.30,49.75,4.76,6.24],"56":[47.22,48.01,-3.74,-1.88],
  "57":[48.79,49.87,6.14,7.64],"58":[46.60,47.78,3.07,4.23],"59":[50.05,51.09,2.08,4.27],
  "60":[49.01,49.79,1.72,3.16],"61":[48.08,48.87,-0.79,0.85],"62":[50.02,50.96,1.56,3.15],
  "63":[45.04,46.14,2.49,3.98],"64":[42.77,43.80,-1.80,-0.07],"65":[42.67,43.69,-0.14,0.96],
  "66":[42.33,42.92,1.72,3.18],"67":[47.83,49.08,6.88,8.23],"68":[47.44,48.42,6.88,7.77],
  "69":[45.47,46.30,4.24,5.22],"70":[47.25,48.02,5.56,6.82],"71":[46.15,47.10,3.80,5.55],
  "72":[47.67,48.52,-0.48,1.03],"73":[45.05,45.93,5.71,7.25],"74":[45.70,46.42,5.81,7.07],
  "75":[48.81,48.91,2.22,2.47],"76":[49.26,50.09,0.06,1.92],"77":[48.12,49.19,2.39,3.56],
  "78":[48.58,49.10,1.45,2.28],"79":[45.96,47.02,-0.82,0.51],"80":[49.43,50.37,1.37,3.11],
  "81":[43.41,44.13,1.57,2.96],"82":[43.73,44.39,0.85,2.12],"83":[43.03,43.89,5.66,7.00],
  "84":[43.73,44.46,4.62,5.84],"85":[46.33,47.12,-2.39,-0.44],"86":[46.09,46.94,-0.03,1.22],
  "87":[45.54,46.38,0.65,2.08],"88":[47.75,48.66,5.66,7.20],"89":[47.44,48.37,2.73,4.38],
  "90":[47.42,47.83,6.74,7.21],"91":[48.30,48.78,1.91,2.59],"92":[48.78,48.95,2.14,2.33],
  "93":[48.84,49.01,2.30,2.59],"94":[48.71,48.86,2.28,2.58],"95":[48.93,49.26,1.63,2.58],
};

const GRID_STEP_KM = 12;
const SEARCH_RADIUS = 9000;

function generateGrid(dept: string): { lat: number; lng: number }[] {
  const b = DEPT_BOUNDS[dept];
  if (!b) throw new Error(`Département inconnu: ${dept}`);
  const [minLat, maxLat, minLng, maxLng] = b;
  const latStep = GRID_STEP_KM / 111;
  const midLat = (minLat + maxLat) / 2;
  const lngStep = GRID_STEP_KM / (111 * Math.cos(midLat * Math.PI / 180));
  const cells: { lat: number; lng: number }[] = [];
  for (let lat = minLat; lat <= maxLat; lat += latStep)
    for (let lng = minLng; lng <= maxLng; lng += lngStep)
      cells.push({ lat: +lat.toFixed(5), lng: +lng.toFixed(5) });
  return cells;
}

function normalizePhone(raw: string) {
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

// ─── Moteur de génération browser ────────────────────────────

interface GenStats { found: number; inserted: number; skipped: number }

async function processPlaceBrowser(
  place: any, jobDept: string, category: string, stats: GenStats
) {
  stats.found++;
  const rawPhone = place.internationalPhoneNumber || place.nationalPhoneNumber || "";
  const phone = rawPhone ? normalizePhone(rawPhone) : "";
  if (!phone) { stats.skipped++; return; }
  const phoneMobile = isMobile(phone) ? phone : null;
  const phoneFixed  = !isMobile(phone) ? phone : null;
  if (!phoneMobile) { stats.skipped++; return; }

  const address = place.formattedAddress || "";
  const deptCode = deptFromAddress(address, jobDept);
  // Ne garder que les entreprises dont l'adresse est vraiment dans le département du job
  if (deptCode !== jobDept) {
    stats.skipped++;
    return;
  }
  const name = place.displayName?.text || "";
  const count = place.userRatingCount ?? 0;
  const rating = place.rating ?? 0;
  const bucket = sizeBucket(count, name);
  const priority = calcPriority(bucket, rating);

  try {
    const { error } = await supabase.from("leads" as any).upsert({
      place_id: place.id, name, address,
      lat: place.location?.latitude, lng: place.location?.longitude,
      phone_mobile: phoneMobile, phone_fixed: phoneFixed,
      website: place.websiteUri || null, maps_url: place.googleMapsUri,
      rating: rating || null, reviews_count: count,
      size_bucket: bucket, priority, dept_code: deptCode, category,
    } as any, { onConflict: "place_id", ignoreDuplicates: true } as any);
    if (!error) stats.inserted++; else stats.skipped++;
  } catch (_) {
    stats.skipped++;
  }
}

// ─── Section 1 : Générer des leads ───────────────────────────

function SectionGenerate() {
  const [dept, setDept] = useState("");
  const { toast } = useToast();
  const generate = useGenerateLeads();
  const retry = useRetryJob();
  const stop = useStopJob();
  const { data: jobs = [], refetch, isRefetching } = useLeadJobs();
  const qc = useQueryClient();

  // Map jobId → AbortController pour pouvoir stopper la boucle
  const abortMap = useRef<Map<string, AbortController>>(new Map());

  const startGenerationLoop = useCallback(async (jobId: string, deptCode: string) => {
    // Si une boucle tourne déjà pour ce job, on l'ignore
    if (abortMap.current.has(jobId)) return;

    const ctrl = new AbortController();
    abortMap.current.set(jobId, ctrl);

    try {
      let cells: { lat: number; lng: number }[] = [];
      try { cells = generateGrid(deptCode); }
      catch (e: any) {
        await supabase.from("lead_jobs" as any).update({
          status: "FAILED", error_log: e.message, finished_at: new Date().toISOString(),
        }).eq("id", jobId);
        qc.invalidateQueries({ queryKey: ["lead_jobs"] });
        return;
      }

      // Récupérer la position de reprise
      const { data: jobRow } = await supabase
        .from("lead_jobs" as any).select("*").eq("id", jobId).single();
      if (!jobRow || jobRow.status === "DONE" || jobRow.status === "STOPPED") return;

      const startCellIndex: number = (jobRow.progress_cursor as any)?.cell_index ?? 0;
      const stats: GenStats = {
        found: jobRow.total_found || 0,
        inserted: jobRow.total_inserted || 0,
        skipped: jobRow.total_skipped || 0,
      };

      // Marquer RUNNING
      await supabase.from("lead_jobs" as any).update({
        status: "RUNNING",
        started_at: jobRow.started_at ?? new Date().toISOString(),
        total_cells: cells.length,
      }).eq("id", jobId);
      qc.invalidateQueries({ queryKey: ["lead_jobs"] });

      for (let ci = startCellIndex; ci < cells.length; ci++) {
        if (ctrl.signal.aborted) break;

        const cell = cells[ci];
        const seenIds = new Set<string>();

        // Appeler le proxy pour chaque mot-clé (4 en parallèle)
        for (let batch = 0; batch < KEYWORDS.length; batch += 4) {
          if (ctrl.signal.aborted) break;
          const kwBatch = KEYWORDS.slice(batch, batch + 4);
          const results = await Promise.all(
            kwBatch.map(async (kw) => {
              try {
                const { data, error } = await supabase.functions.invoke("lead-generator", {
                  body: { keyword: kw, lat: cell.lat, lng: cell.lng, radius: SEARCH_RADIUS },
                });
                if (error || !data?.places) return { kw, places: [] };
                return { kw, places: data.places as any[] };
              } catch {
                return { kw, places: [] };
              }
            })
          );

          // Dédupliquer et sauvegarder en parallèle (8 à la fois)
          const toProcess: { place: any; category: string }[] = [];
          results.forEach(({ kw, places }) => {
            const cat = KEYWORD_CATEGORY[kw] || kw;
            places.forEach((p) => {
              if (p.id && !seenIds.has(p.id)) { seenIds.add(p.id); toProcess.push({ place: p, category: cat }); }
            });
          });

          for (let p = 0; p < toProcess.length; p += 8) {
            if (ctrl.signal.aborted) break;
            await Promise.all(
              toProcess.slice(p, p + 8).map(({ place, category }) =>
                processPlaceBrowser(place, deptCode, category, stats).catch(() => {})
              )
            );
          }
        }

        // Sauvegarder la progression après chaque cellule
        try {
          await supabase.from("lead_jobs" as any).update({
            total_found: stats.found, total_inserted: stats.inserted, total_skipped: stats.skipped,
            processed_cells: ci + 1, progress_cursor: { cell_index: ci + 1 },
          }).eq("id", jobId);
        } catch (_) { /* ignore */ }

        qc.invalidateQueries({ queryKey: ["lead_jobs"] });
      }

      if (!ctrl.signal.aborted) {
        // Terminé !
        await supabase.from("lead_jobs" as any).update({
          status: "DONE",
          total_found: stats.found, total_inserted: stats.inserted, total_skipped: stats.skipped,
          processed_cells: cells.length, progress_cursor: {},
          finished_at: new Date().toISOString(),
        }).eq("id", jobId);
        qc.invalidateQueries({ queryKey: ["lead_jobs"] });
        toast({ title: "✅ Génération terminée !", description: `${deptCode} — ${stats.inserted} leads insérés.` });
      }
    } catch (err: any) {
      try {
        await supabase.from("lead_jobs" as any).update({
          status: "FAILED", error_log: err?.message || "Erreur inconnue",
          finished_at: new Date().toISOString(),
        }).eq("id", jobId);
      } catch (_) { /* ignore */ }
      qc.invalidateQueries({ queryKey: ["lead_jobs"] });
    } finally {
      abortMap.current.delete(jobId);
    }
  }, [qc, toast]);

  // Démarrer automatiquement la boucle pour les jobs PENDING ou RUNNING
  useEffect(() => {
    jobs.forEach((job) => {
      if ((job.status === "PENDING" || job.status === "RUNNING") && !abortMap.current.has(job.id)) {
        startGenerationLoop(job.id, job.dept_code);
      }
    });
  }, [jobs, startGenerationLoop]);

  // Nettoyage : arrêter toutes les boucles quand le composant est démonté
  useEffect(() => {
    return () => {
      abortMap.current.forEach((ctrl) => ctrl.abort());
    };
  }, []);

  const handleStop = async (job: LeadJob) => {
    abortMap.current.get(job.id)?.abort();
    abortMap.current.delete(job.id);
    try {
      await stop.mutateAsync(job.id);
      toast({ title: "⏹ Job arrêté", description: `${job.dept_code} — ${job.dept_name} arrêté.` });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  const handleRetry = async (job: LeadJob) => {
    try {
      await retry.mutateAsync(job.id);
      // retry remet le status PENDING → useEffect déclenche startGenerationLoop
      toast({ title: "✅ Job relancé", description: `Génération ${job.dept_code} — ${job.dept_name} reprise…` });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  const handleGenerate = async () => {
    if (!dept) return toast({ title: "Sélectionnez un département", variant: "destructive" });
    try {
      const { id, dept_code } = await generate.mutateAsync(dept);
      // generate crée le job PENDING → useEffect déclenche startGenerationLoop
      toast({ title: "✅ Job lancé", description: `Génération des leads pour le ${dept_code} en cours…` });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-400" />
          Lancer une génération
        </h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={dept} onValueChange={setDept}>
            <SelectTrigger className="w-full sm:w-72">
              <SelectValue placeholder="Choisir un département…" />
            </SelectTrigger>
            <SelectContent>
              {DEPTS.map((d) => (
                <SelectItem key={d.code} value={d.code}>
                  {d.code} — {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleGenerate}
            disabled={!dept || generate.isPending}
            className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-semibold"
          >
            {generate.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
            Lancer la génération
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          La génération se fait directement dans le navigateur. Ne fermez pas cet onglet pendant la génération.
        </p>
      </GlassCard>

      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" /> Jobs en cours / terminés
          </h3>
          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isRefetching} title="Actualiser">
            <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun job pour l'instant.</p>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => {
              const isRetrying = retry.isPending && (retry.variables as string) === job.id;
              const canRetry = job.status === "PENDING" || job.status === "FAILED" || job.status === "STOPPED";
              const isActiveLocally = abortMap.current.has(job.id);
              return (
                <div key={job.id} className="border border-border/50 rounded-xl p-4 bg-card/30">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`gap-1 text-xs border ${JOB_COLORS[job.status]}`}>
                        {JOB_ICONS[job.status]} {job.status}
                      </Badge>
                      <span className="font-semibold text-sm">{job.dept_code} — {job.dept_name || "—"}</span>
                      <span className="text-xs text-muted-foreground">{durationStr(job)}</span>
                      {isActiveLocally && job.status === "RUNNING" && (
                        <span className="text-xs text-yellow-400 animate-pulse">● En cours…</span>
                      )}
                    </div>

                    {job.status === "RUNNING" && (
                      <Button size="sm" variant="outline" onClick={() => handleStop(job)}
                        disabled={stop.isPending && (stop.variables as string) === job.id}
                        className="h-7 px-3 text-xs border-red-500/40 text-red-400 hover:bg-red-500/10">
                        <XCircle className="h-3 w-3 mr-1" /> Arrêter
                      </Button>
                    )}

                    {canRetry && (
                      <Button size="sm" onClick={() => handleRetry(job)}
                        disabled={isRetrying || generate.isPending}
                        className="h-7 px-3 text-xs bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-semibold">
                        {isRetrying
                          ? <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Lancement…</>
                          : job.status === "FAILED" || job.status === "STOPPED"
                            ? <><RefreshCw className="h-3 w-3 mr-1" /> Relancer</>
                            : <><Zap className="h-3 w-3 mr-1" /> Lancer</>
                        }
                      </Button>
                    )}
                  </div>

                  {(job.status === "RUNNING" || job.status === "DONE") && job.total_cells > 0 && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>{progressPct(job)}%</span>
                        <span>{job.processed_cells} / {job.total_cells} zones</span>
                      </div>
                      <div className="h-1.5 bg-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full transition-all"
                          style={{ width: `${progressPct(job)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    <span>🔍 {job.total_found} trouvés</span>
                    <span>✅ {job.total_inserted} insérés</span>
                    <span>⏭ {job.total_skipped} ignorés</span>
                  </div>

                  {job.error_log && (
                    <p className="text-xs text-red-400 mt-2 truncate">{job.error_log}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

// ─── Section 2 : Assigner les leads ──────────────────────────

function SectionAssign() {
  const [dept, setDept] = useState("");
  const [closerEmail, setCloserEmail] = useState("");
  const { toast } = useToast();
  const assign = useAssignLeads();
  const { data: closerRows = [] } = useClosers();
  const { data: generatedDepts = [], isLoading: deptsLoading } = useGeneratedDepts();
  const { data: stats } = useLeadStats(dept);
  const { data: jobs = [] } = useLeadJobs();
  const isGenerating = dept ? jobs.some((j) => j.dept_code === dept && j.status === "RUNNING") : false;

  const handleAssign = async () => {
    if (!dept || !closerEmail) return toast({ title: "Sélectionnez département et closer", variant: "destructive" });
    if (!stats?.available) return toast({
      title: "Aucun lead disponible",
      description: isGenerating ? "La génération est encore en cours." : "Tous les leads sont déjà assignés.",
      variant: "destructive",
    });
    try {
      const count = await assign.mutateAsync({ deptCode: dept, closerEmail });
      toast({ title: `✅ ${count} leads assignés au closer` });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  return (
    <GlassCard className="p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" /> Assigner les leads
        </h3>
        {isGenerating && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded-full px-3 py-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Génération en cours — les leads s'ajoutent au fur et à mesure
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block">
            Département
            {generatedDepts.length > 0 && (
              <span className="ml-2 text-xs text-muted-foreground font-normal">({generatedDepts.length} générés)</span>
            )}
          </label>
          <Select value={dept} onValueChange={setDept}>
            <SelectTrigger>
              <SelectValue placeholder={deptsLoading ? "Chargement…" : generatedDepts.length === 0 ? "Aucun lead généré" : "Sélectionner…"} />
            </SelectTrigger>
            <SelectContent>
              {generatedDepts.length === 0 ? (
                <SelectItem value="_empty" disabled>Aucun lead généré pour l'instant</SelectItem>
              ) : (
                generatedDepts.map((d) => (
                  <SelectItem key={d.code} value={d.code}>
                    {d.code} — {d.name} ({d.available > 0 ? `${d.available} dispo` : "0 dispo"})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Closer</label>
          <Select value={closerEmail} onValueChange={setCloserEmail}>
            <SelectTrigger>
              <SelectValue placeholder={closerRows.length === 0 ? "Ajoutez d'abord un closer →" : "Sélectionner un closer…"} />
            </SelectTrigger>
            <SelectContent>
              {closerRows.length === 0 ? (
                <SelectItem value="_empty" disabled>Aucun closer</SelectItem>
              ) : (
                closerRows.map((c) => (
                  <SelectItem key={c.email} value={c.email}>
                    {c.email.split("@")[0]} ({c.email})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {dept && stats && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total leads", value: stats.total, color: "text-foreground" },
            { label: "Disponibles (NEW)", value: stats.available, color: "text-blue-400" },
            { label: "Déjà assignés", value: stats.assigned, color: "text-yellow-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl border border-border/50 bg-card/30 p-3 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      <Button
        onClick={handleAssign}
        disabled={!dept || !closerEmail || assign.isPending || !stats?.available}
        className="w-full sm:w-auto bg-gradient-to-r from-violet-500 to-purple-500 text-white font-semibold"
      >
        {assign.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Users className="h-4 w-4 mr-2" />}
        Assigner tous les leads NEW
      </Button>
    </GlassCard>
  );
}

// ─── Section 3 : Vue des leads ────────────────────────────────

function SectionLeads() {
  const [dept, setDept] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [page, setPage] = useState(0);
  const { data, isLoading } = useAdminLeads({ dept, status, priority, page });
  const leads = data?.leads || [];
  const count = data?.count || 0;
  const PAGE = 50;

  return (
    <div className="space-y-4">
      <GlassCard className="p-4">
        <div className="flex flex-wrap gap-3">
          <Select value={dept || "_all"} onValueChange={(v) => { setDept(v === "_all" ? "" : v); setPage(0); }}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Tous les depts" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Tous les départements</SelectItem>
              {DEPTS.map((d) => <SelectItem key={d.code} value={d.code}>{d.code} — {d.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status || "_all"} onValueChange={(v) => { setStatus(v === "_all" ? "" : v); setPage(0); }}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Tous statuts" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Tous statuts</SelectItem>
              {["NEW", "CONTACTED", "QUALIFIED", "LOST", "SIGNED"].map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priority || "_all"} onValueChange={(v) => { setPriority(v === "_all" ? "" : v); setPage(0); }}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Priorité" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Toutes</SelectItem>
              <SelectItem value="A">A — Priorité haute</SelectItem>
              <SelectItem value="B">B — Priorité moyenne</SelectItem>
              <SelectItem value="C">C — Priorité basse</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground self-center">{count} leads</span>
        </div>
      </GlassCard>

      <GlassCard className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : leads.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">Aucun lead pour ces filtres.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-card/50">
                  {["Entreprise", "Mobile", "Site web", "Taille", "Priorité", "Statut", "Dept"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leads.map((lead, i) => (
                  <tr key={lead.id} className={`border-b border-border/30 hover:bg-card/30 transition-colors ${i % 2 === 0 ? "" : "bg-card/10"}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium truncate max-w-[200px]">{lead.name}</div>
                      {lead.address && <div className="text-xs text-muted-foreground truncate max-w-[200px]">{lead.address}</div>}
                    </td>
                    <td className="px-4 py-3">
                      {lead.phone_mobile
                        ? <a href={`tel:${lead.phone_mobile}`} className="flex items-center gap-1 text-primary hover:underline whitespace-nowrap"><Phone className="h-3 w-3" />{lead.phone_mobile}</a>
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {lead.website
                        ? <a href={lead.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline max-w-[140px] truncate">
                            <Globe className="h-3 w-3 shrink-0" />
                            <span className="truncate">{lead.website.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}</span>
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap"><span className="text-xs text-muted-foreground">{lead.size_bucket || "—"}</span></td>
                    <td className="px-4 py-3">
                      {lead.priority ? <Badge className={`text-xs border ${PRIORITY_COLORS[lead.priority]}`}>{lead.priority}</Badge> : "—"}
                    </td>
                    <td className="px-4 py-3"><Badge className={`text-xs border ${STATUS_COLORS[lead.status]}`}>{lead.status}</Badge></td>
                    <td className="px-4 py-3 text-muted-foreground">{lead.dept_code}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {count > PAGE && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">Page {page + 1} / {Math.ceil(count / PAGE)}</span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={(page + 1) * PAGE >= count}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Section 4 : Leads ignorés ────────────────────────────────

function SectionIgnored() {
  const [dept, setDept] = useState("");
  const [page, setPage] = useState(0);
  const { data: fixedDepts = [] } = useLeadsFixedDepts();
  const { data: result, isLoading } = useLeadsFixed({ dept, page });
  const leads = result?.leads || [];
  const count = result?.count || 0;
  const totalPages = Math.ceil(count / 50);
  const totalIgnored = fixedDepts.reduce((s, d) => s + d.count, 0);

  return (
    <div className="space-y-4">
      <GlassCard className="p-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-400" /> Leads ignorés — Fixes uniquement
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">Ces entreprises n'avaient qu'un numéro fixe.</p>
          </div>
          <span className="text-sm font-semibold text-orange-400">{totalIgnored} total</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { setDept(""); setPage(0); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${!dept ? "bg-primary text-primary-foreground border-primary" : "border-border/50 text-muted-foreground hover:border-primary/50"}`}>
            Tous ({totalIgnored})
          </button>
          {fixedDepts.map((d) => (
            <button key={d.code} onClick={() => { setDept(d.code); setPage(0); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${dept === d.code ? "bg-orange-500/20 text-orange-400 border-orange-500/40" : "border-border/50 text-muted-foreground hover:border-orange-500/30"}`}>
              {d.code} — {d.name} ({d.count})
            </button>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : leads.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">Aucun lead ignoré.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 border-b border-border/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Entreprise</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Téléphone fixe</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Site web</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Dépt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {leads.map((lead: LeadFixed) => (
                    <tr key={lead.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium max-w-[200px] truncate">{lead.name}</td>
                      <td className="px-4 py-3">
                        {lead.phone_fixed ? <a href={`tel:${lead.phone_fixed}`} className="flex items-center gap-1 text-primary hover:underline"><Phone className="h-3.5 w-3.5" />{lead.phone_fixed}</a> : <span className="text-muted-foreground/50">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {lead.website ? <a href={lead.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-400 hover:underline"><ExternalLink className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate max-w-[160px] inline-block">{lead.website.replace(/^https?:\/\//, "")}</span></a> : <span className="text-muted-foreground/50">—</span>}
                      </td>
                      <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{lead.dept_code}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="text-sm text-muted-foreground">Page {page + 1} / {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            )}
          </>
        )}
      </GlassCard>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────

export default function AdminLeads() {
  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/20">
            <Zap className="h-7 w-7 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Gestion des Leads BTP</h1>
            <p className="text-sm text-muted-foreground">Génération automatique, assignation aux closers et suivi des leads</p>
          </div>
        </div>

        <Tabs defaultValue="generate">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="generate" className="gap-2"><Zap className="h-4 w-4" /> Générer</TabsTrigger>
            <TabsTrigger value="assign" className="gap-2"><Users className="h-4 w-4" /> Assigner</TabsTrigger>
            <TabsTrigger value="leads" className="gap-2"><List className="h-4 w-4" /> Vue leads</TabsTrigger>
            <TabsTrigger value="ignored" className="gap-2"><AlertCircle className="h-4 w-4 text-orange-400" /> Ignorés</TabsTrigger>
          </TabsList>
          <TabsContent value="generate" className="mt-6"><SectionGenerate /></TabsContent>
          <TabsContent value="assign" className="mt-6"><SectionAssign /></TabsContent>
          <TabsContent value="leads" className="mt-6"><SectionLeads /></TabsContent>
          <TabsContent value="ignored" className="mt-6"><SectionIgnored /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
