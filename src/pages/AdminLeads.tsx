import { useState } from "react";
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
  useAssignLeads, useRetryJob, useStopJob, useGeneratedDepts, LeadJob, Lead, RETRY_NETWORK,
} from "@/hooks/useLeads";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

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

// ─── Closers list (for assign dropdown) ──────────────────────

function useClosersList() {
  return useQuery<{ id: string; email: string; name: string }[]>({
    queryKey: ["closers_list_admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("closer_emails" as any).select("email");
      if (error) throw error;
      return ((data as any[]) || []).map((c: any) => ({
        id: c.email,
        email: c.email,
        name: c.name || c.email.split("@")[0],
      }));
    },
    ...RETRY_NETWORK,
  });
}

// ─── Section 1 : Générer des leads ───────────────────────────

function SectionGenerate() {
  const [dept, setDept] = useState("");
  const { toast } = useToast();
  const generate = useGenerateLeads();
  const retry = useRetryJob();
  const stop = useStopJob();
  const { data: jobs = [], refetch, isRefetching } = useLeadJobs();

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
                        <span>{job.processed_cells} / {job.total_cells} requêtes</span>
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
  const [closerId, setCloserId] = useState("");
  const { toast } = useToast();
  const assign = useAssignLeads();
  const { data: closers = [] } = useClosersList();
  const { data: generatedDepts = [], isLoading: deptsLoading } = useGeneratedDepts();
  const { data: stats } = useLeadStats(dept);

  const handleAssign = async () => {
    if (!dept || !closerId) return toast({ title: "Sélectionnez département et closer", variant: "destructive" });
    if (!stats?.available) return toast({ title: "Aucun lead NEW disponible dans ce département", variant: "destructive" });
    try {
      const count = await assign.mutateAsync({ deptCode: dept, closerEmail: closerId });
      toast({ title: `✅ ${count} leads assignés au closer` });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  return (
    <GlassCard className="p-6 space-y-5">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" /> Assigner les leads
      </h3>

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
                <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                  Aucun lead généré pour l'instant
                </div>
              ) : (
                generatedDepts.map((d) => (
                  <SelectItem key={d.code} value={d.code}>
                    <span className="flex items-center gap-2">
                      <span>{d.code} — {d.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {d.available > 0
                          ? <span className="text-blue-400">{d.available} dispo</span>
                          : <span className="text-muted-foreground/50">0 dispo</span>
                        }
                      </span>
                    </span>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Closer</label>
          <Select value={closerId} onValueChange={setCloserId}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un closer…" />
            </SelectTrigger>
            <SelectContent>
              {closers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} ({c.email})
                </SelectItem>
              ))}
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
        disabled={!dept || !closerId || assign.isPending || !stats?.available}
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
        </Tabs>
      </div>
    </div>
  );
}
