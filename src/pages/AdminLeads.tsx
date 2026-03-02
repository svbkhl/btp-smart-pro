import { useState, useEffect, useRef } from "react";
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
  useLeadsFixedDepts, LeadJob, Lead, LeadFixed, RETRY_NETWORK,
} from "@/hooks/useLeads";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useClosers } from "@/hooks/useClosers";

// ─── Helpers ──────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  CONTACTED: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  QUALIFIED: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  LOST: "bg-red-500/10 text-red-400 border-red-500/20",
  SIGNED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

const JOB_ICONS: Record<string, React.ReactNode> = {
  PENDING: <Clock className="h-3.5 w-3.5" />,
  RUNNING: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
  DONE: <CheckCircle2 className="h-3.5 w-3.5" />,
  FAILED: <XCircle className="h-3.5 w-3.5" />,
};

const JOB_COLORS: Record<string, string> = {
  PENDING: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  RUNNING: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  DONE: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  FAILED: "bg-red-500/10 text-red-400 border-red-500/20",
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

// useClosersList → remplacé par useClosers() de useClosers.ts

// ─── Section 1 : Générer des leads ───────────────────────────

function SectionGenerate() {
  const [dept, setDept] = useState("");
  const { toast } = useToast();
  const generate = useGenerateLeads();
  const retry = useRetryJob();
  const stop = useStopJob();
  const { data: jobs = [], refetch, isRefetching } = useLeadJobs();
  const qc = useQueryClient();

  // ── Auto-continue RUNNING jobs ────────────────────────────────
  // Chaque invocation traite 18s et retourne. Le frontend relance
  // automatiquement jusqu'à DONE. La boucle est résiliente aux erreurs
  // réseau : si le job a encore des cellules non traitées, elle continue.
  const loopActive = useRef<Map<string, boolean>>(new Map());

  useEffect(() => {
    const activeJobs = jobs.filter((j) => j.status === "RUNNING" || j.status === "PENDING");
    const inactiveIds = jobs.filter((j) => j.status === "DONE" || j.status === "STOPPED").map((j) => j.id);

    // Arrêter les boucles pour les jobs terminés
    inactiveIds.forEach((id) => loopActive.current.set(id, false));

    // Démarrer une boucle pour chaque job actif qui n'en a pas encore
    activeJobs.forEach((job) => {
      if (loopActive.current.get(job.id) === true) return;
      loopActive.current.set(job.id, true);

      (async () => {
        let consecutiveErrors = 0;

        while (loopActive.current.get(job.id)) {
          // Toujours vérifier l'état réel en DB avant d'invoquer
          const { data: fresh } = await supabase
            .from("lead_jobs" as any)
            .select("status, processed_cells, total_cells")
            .eq("id", job.id)
            .single();

          if (!fresh) { loopActive.current.set(job.id, false); break; }

          // Si DONE → terminé
          if (fresh.status === "DONE") {
            loopActive.current.set(job.id, false);
            qc.invalidateQueries({ queryKey: ["lead_jobs"] });
            toast({ title: "✅ Génération terminée !", description: `${job.dept_code} — ${job.dept_name ?? ""} — ${fresh.processed_cells ?? 0} zones traitées.` });
            break;
          }

          // Si STOPPED manuellement → arrêt
          if (fresh.status === "STOPPED") {
            loopActive.current.set(job.id, false);
            qc.invalidateQueries({ queryKey: ["lead_jobs"] });
            break;
          }

          // Si FAILED mais qu'il reste des cellules → on remet en RUNNING et on continue
          if (fresh.status === "FAILED") {
            if (fresh.total_cells > 0 && fresh.processed_cells < fresh.total_cells) {
              await supabase.from("lead_jobs" as any).update({ status: "RUNNING" }).eq("id", job.id);
            } else {
              loopActive.current.set(job.id, false);
              qc.invalidateQueries({ queryKey: ["lead_jobs"] });
              break;
            }
          }

          // Invoquer le prochain lot de traitement
          const { data, error } = await supabase.functions.invoke("lead-generator", {
            body: { job_id: job.id },
          });

          qc.invalidateQueries({ queryKey: ["lead_jobs"] });

          if (data?.done) {
            loopActive.current.set(job.id, false);
            toast({ title: "✅ Génération terminée !", description: `${job.dept_code} — ${job.dept_name ?? ""} terminé.` });
            break;
          }

          if (error) {
            consecutiveErrors++;
            // Jusqu'à 5 erreurs consécutives → on retente après pause
            if (consecutiveErrors >= 5) {
              loopActive.current.set(job.id, false);
              qc.invalidateQueries({ queryKey: ["lead_jobs"] });
              toast({ title: "⚠️ Génération interrompue", description: "Trop d'erreurs consécutives. Clique Relancer.", variant: "destructive" });
              break;
            }
            // Pause progressive avant de réessayer
            await new Promise((r) => setTimeout(r, 2000 * consecutiveErrors));
            continue;
          }

          consecutiveErrors = 0;
          // Pause courte entre les lots
          await new Promise((r) => setTimeout(r, 300));
        }
      })().catch(console.error);
    });

    return () => {
      jobs.forEach((j) => loopActive.current.set(j.id, false));
    };
  // Réagir uniquement aux changements de statut
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs.map((j) => `${j.id}:${j.status}`).join(",")]);

  const handleStop = async (job: LeadJob) => {
    try {
      await stop.mutateAsync(job.id);
      toast({ title: "⏹ Job arrêté", description: `${job.dept_code} — ${job.dept_name} arrêté. Tu peux le relancer.` });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  const handleRetry = async (job: LeadJob) => {
    try {
      await retry.mutateAsync(job.id);
      toast({ title: "✅ Job relancé", description: `Génération ${job.dept_code} — ${job.dept_name} reprise…` });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  const handleGenerate = async () => {
    if (!dept) return toast({ title: "Sélectionnez un département", variant: "destructive" });
    try {
      await generate.mutateAsync(dept);
      toast({ title: "✅ Job lancé", description: `Génération des leads pour le ${dept} en cours…` });
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
          La génération se fait en arrière-plan. Elle peut prendre plusieurs minutes pour les grands départements.
        </p>
      </GlassCard>

      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" /> Jobs en cours / terminés
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            title="Actualiser la liste"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun job pour l'instant.</p>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => {
              const isRetrying = retry.isPending && (retry.variables as string) === job.id;
              const canRetry = job.status === "PENDING" || job.status === "FAILED";
              return (
                <div key={job.id} className="border border-border/50 rounded-xl p-4 bg-card/30">
                  {/* En-tête : statut + département + durée + bouton */}
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`gap-1 text-xs border ${JOB_COLORS[job.status]}`}>
                        {JOB_ICONS[job.status]} {job.status}
                      </Badge>
                      <span className="font-semibold text-sm">{job.dept_code} — {job.dept_name || "—"}</span>
                      <span className="text-xs text-muted-foreground">{durationStr(job)}</span>
                    </div>

                    {/* Bouton Arrêter (RUNNING) */}
                    {job.status === "RUNNING" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStop(job)}
                        disabled={stop.isPending && (stop.variables as string) === job.id}
                        className="h-7 px-3 text-xs border-red-500/40 text-red-400 hover:bg-red-500/10"
                      >
                        {stop.isPending && (stop.variables as string) === job.id
                          ? <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Arrêt…</>
                          : <><XCircle className="h-3 w-3 mr-1" /> Arrêter</>
                        }
                      </Button>
                    )}

                    {/* Bouton Lancer / Relancer (PENDING ou FAILED) */}
                    {canRetry && (
                      <Button
                        size="sm"
                        onClick={() => handleRetry(job)}
                        disabled={isRetrying || generate.isPending}
                        className="h-7 px-3 text-xs bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-semibold"
                      >
                        {isRetrying
                          ? <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Lancement…</>
                          : job.status === "FAILED"
                            ? <><RefreshCw className="h-3 w-3 mr-1" /> Relancer</>
                            : <><Zap className="h-3 w-3 mr-1" /> Lancer</>
                        }
                      </Button>
                    )}
                  </div>

                  {/* Barre de progression (RUNNING) */}
                  {job.status === "RUNNING" && job.total_cells > 0 && (
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

                  {/* Stats */}
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    <span>🔍 {job.total_found} trouvés</span>
                    <span>✅ {job.total_inserted} insérés</span>
                    <span>⏭ {job.total_skipped} ignorés</span>
                  </div>

                  {/* Erreur */}
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
    if (!stats?.available) return toast({ title: "Aucun lead disponible", description: isGenerating ? "La génération est encore en cours, réessaie dans quelques secondes." : "Tous les leads de ce département sont déjà assignés.", variant: "destructive" });
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
          <label className="text-sm font-medium mb-1.5 block">
            Closer
            {closerRows.length === 0 && !deptsLoading && (
              <span className="ml-2 text-xs text-red-400 font-normal">— aucun closer ajouté</span>
            )}
          </label>
          <Select value={closerEmail} onValueChange={setCloserEmail}>
            <SelectTrigger>
              <SelectValue placeholder={closerRows.length === 0 ? "Ajoutez d'abord un closer →" : "Sélectionner un closer…"} />
            </SelectTrigger>
            <SelectContent>
              {closerRows.length === 0 ? (
                <SelectItem value="_empty" disabled>Aucun closer — ajoutez-en dans l'onglet Closers</SelectItem>
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
      {/* Filtres */}
      <GlassCard className="p-4">
        <div className="flex flex-wrap gap-3">
          <Select value={dept || "_all"} onValueChange={(v) => { setDept(v === "_all" ? "" : v); setPage(0); }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Tous les depts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Tous les départements</SelectItem>
              {DEPTS.map((d) => <SelectItem key={d.code} value={d.code}>{d.code} — {d.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={status || "_all"} onValueChange={(v) => { setStatus(v === "_all" ? "" : v); setPage(0); }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Tous statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Tous statuts</SelectItem>
              {["NEW", "CONTACTED", "QUALIFIED", "LOST", "SIGNED"].map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={priority || "_all"} onValueChange={(v) => { setPriority(v === "_all" ? "" : v); setPage(0); }}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Priorité" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Toutes</SelectItem>
              <SelectItem value="A">A — Priorité haute</SelectItem>
              <SelectItem value="B">B — Priorité moyenne</SelectItem>
              <SelectItem value="C">C — Priorité basse</SelectItem>
            </SelectContent>
          </Select>

          <span className="text-sm text-muted-foreground self-center">
            {count} leads trouvés
          </span>
        </div>
      </GlassCard>

      {/* Tableau */}
      <GlassCard className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            Aucun lead pour ces filtres.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-card/50">
                  {["Entreprise", "Mobile", "Site web", "Taille", "Priorité", "Statut", "Dept"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leads.map((lead, i) => (
                  <tr key={lead.id} className={`border-b border-border/30 hover:bg-card/30 transition-colors ${i % 2 === 0 ? "" : "bg-card/10"}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium truncate max-w-[200px]" title={lead.name}>{lead.name}</div>
                      {lead.address && (
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">{lead.address}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {lead.phone_mobile ? (
                        <a href={`tel:${lead.phone_mobile}`} className="flex items-center gap-1 text-primary hover:underline whitespace-nowrap">
                          <Phone className="h-3 w-3" /> {lead.phone_mobile}
                        </a>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {lead.website ? (
                        <a href={lead.website} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline max-w-[140px] truncate">
                          <Globe className="h-3 w-3 shrink-0" />
                          <span className="truncate">{lead.website.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}</span>
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs text-muted-foreground">{lead.size_bucket || "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      {lead.priority ? (
                        <Badge className={`text-xs border ${PRIORITY_COLORS[lead.priority]}`}>{lead.priority}</Badge>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`text-xs border ${STATUS_COLORS[lead.status]}`}>{lead.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{lead.dept_code}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Pagination */}
      {count > PAGE && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} / {Math.ceil(count / PAGE)}
          </span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={(page + 1) * PAGE >= count}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Section 4 : Leads ignorés (fixes) ───────────────────────

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
            <p className="text-sm text-muted-foreground mt-0.5">
              Ces entreprises n'avaient qu'un numéro fixe. Vous pouvez les retravailler manuellement.
            </p>
          </div>
          <span className="text-sm font-semibold text-orange-400">{totalIgnored} total</span>
        </div>

        {/* Filtres par département */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setDept(""); setPage(0); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              !dept ? "bg-primary text-primary-foreground border-primary" : "border-border/50 text-muted-foreground hover:border-primary/50"
            }`}
          >
            Tous ({totalIgnored})
          </button>
          {fixedDepts.map((d) => (
            <button
              key={d.code}
              onClick={() => { setDept(d.code); setPage(0); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                dept === d.code ? "bg-orange-500/20 text-orange-400 border-orange-500/40" : "border-border/50 text-muted-foreground hover:border-orange-500/30"
              }`}
            >
              {d.code} — {d.name} ({d.count})
            </button>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : leads.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">Aucun lead ignoré pour ces filtres.</div>
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
                        {lead.phone_fixed ? (
                          <a href={`tel:${lead.phone_fixed}`} className="flex items-center gap-1 text-primary hover:underline">
                            <Phone className="h-3.5 w-3.5" />{lead.phone_fixed}
                          </a>
                        ) : <span className="text-muted-foreground/50">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {lead.website ? (
                          <a href={lead.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-400 hover:underline">
                            <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="truncate max-w-[160px] inline-block">{lead.website.replace(/^https?:\/\//, "")}</span>
                          </a>
                        ) : <span className="text-muted-foreground/50">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">{lead.dept_code}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">Page {page + 1} / {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
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
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/20">
            <Zap className="h-7 w-7 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Gestion des Leads BTP</h1>
            <p className="text-sm text-muted-foreground">
              Génération automatique, assignation aux closers et suivi des leads
            </p>
          </div>
        </div>

        {/* Onglets */}
        <Tabs defaultValue="generate">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="generate" className="gap-2">
              <Zap className="h-4 w-4" /> Générer
            </TabsTrigger>
            <TabsTrigger value="assign" className="gap-2">
              <Users className="h-4 w-4" /> Assigner
            </TabsTrigger>
            <TabsTrigger value="leads" className="gap-2">
              <List className="h-4 w-4" /> Vue leads
            </TabsTrigger>
            <TabsTrigger value="ignored" className="gap-2">
              <AlertCircle className="h-4 w-4 text-orange-400" /> Ignorés
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="mt-6">
            <SectionGenerate />
          </TabsContent>
          <TabsContent value="assign" className="mt-6">
            <SectionAssign />
          </TabsContent>
          <TabsContent value="leads" className="mt-6">
            <SectionLeads />
          </TabsContent>
          <TabsContent value="ignored" className="mt-6">
            <SectionIgnored />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
