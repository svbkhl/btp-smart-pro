import { useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import {
  Phone, Globe, ExternalLink, ChevronDown, ChevronLeft, ChevronRight,
  CheckCircle2, MapPin, Loader2, StickyNote, ChevronUp, Star,
} from "lucide-react";
import {
  DEPTS, useMyLeads, useMyLeadStats, useUpdateLeadStatus, useUpdateLeadNotes,
  Lead, LeadStatus, type MyLeadsSort,
} from "@/hooks/useLeads";

// ─── Constantes ───────────────────────────────────────────────

const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; next: LeadStatus[] }> = {
  NEW:       { label: "Nouveau",   color: "bg-blue-500/10 text-blue-400 border-blue-500/20",      next: ["CONTACTED", "LOST"] },
  CONTACTED: { label: "Contacté",  color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", next: ["QUALIFIED", "LOST"] },
  QUALIFIED: { label: "Qualifié",  color: "bg-violet-500/10 text-violet-400 border-violet-500/20", next: ["SIGNED", "LOST"] },
  SIGNED:    { label: "Signé",     color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", next: ["QUALIFIED"] }, // Revenir à Qualifié si pas fait exprès
  LOST:      { label: "Perdu",     color: "bg-red-500/10 text-red-400 border-red-500/20",           next: ["NEW"] },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  A: { label: "Priorité A", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: "🔥" },
  B: { label: "Priorité B", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",   icon: "⭐" },
  C: { label: "Priorité C", color: "bg-red-500/10 text-red-400 border-red-500/20",             icon: "❄️" },
};

const CATEGORY_ICON: Record<string, string> = {
  "Plomberie":       "🔧",
  "Électricité":     "⚡",
  "Chauffage":       "🔥",
  "Artisan BTP":     "🏗️",
  "Rénovation":      "🏠",
  "Couverture":      "🏚️",
  "Maçonnerie":      "🧱",
  "Menuiserie":      "🪵",
  "Peinture":        "🎨",
  "Photovoltaïque":  "☀️",
  "Terrassement":    "⛏️",
  "Multi-services":  "🔨",
};

// ─── Counter card ─────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card/30 p-4 text-center">
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

// ─── Notes dialog ─────────────────────────────────────────────

function NotesDialog({
  lead, open, onClose,
}: { lead: Lead; open: boolean; onClose: () => void }) {
  const [notes, setNotes] = useState(lead.notes || "");
  const { toast } = useToast();
  const update = useUpdateLeadNotes();

  const handleSave = async () => {
    try {
      await update.mutateAsync({ id: lead.id, notes });
      toast({ title: "Notes sauvegardées" });
      onClose();
    } catch {
      toast({ title: "Erreur lors de la sauvegarde", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StickyNote className="h-5 w-5 text-primary" /> Notes — {lead.name}
          </DialogTitle>
        </DialogHeader>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ajouter vos notes ici…"
          className="min-h-[150px]"
          autoFocus
        />
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSave} disabled={update.isPending}>
            {update.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Lead card ────────────────────────────────────────────────

function LeadCard({ lead }: { lead: Lead }) {
  const [expanded, setExpanded] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const { toast } = useToast();
  const updateStatus = useUpdateLeadStatus();

  const cfg = STATUS_CONFIG[lead.status];
  const prio = lead.priority ? PRIORITY_CONFIG[lead.priority] : null;

  const handleStatus = async (s: LeadStatus) => {
    try {
      await updateStatus.mutateAsync({ id: lead.id, status: s });
      toast({ title: `Statut mis à jour → ${STATUS_CONFIG[s].label}` });
    } catch {
      toast({ title: "Erreur de mise à jour", variant: "destructive" });
    }
  };

  return (
    <>
      <GlassCard className="overflow-hidden">
        <div className="p-4">
          {/* En-tête */}
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 flex-wrap">
                <h3 className="font-semibold text-sm leading-tight truncate">{lead.name}</h3>
                {prio && (
                  <span className="text-xs">{prio.icon}</span>
                )}
                <span className="text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-2 py-0.5 font-medium">
                  {CATEGORY_ICON[(lead as any).category] || "🏗️"} {(lead as any).category || "—"}
                </span>
                {lead.job_dept && (
                  <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full px-2 py-0.5 font-medium" title="Lot (campagne d’assignation)">
                    Lot {lead.job_dept}
                  </span>
                )}
              </div>
              {lead.address && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate flex items-center gap-1">
                  <MapPin className="h-3 w-3 shrink-0" /> {lead.address}
                </p>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Badges */}
              {prio && (
                <Badge className={`text-xs border ${prio.color} hidden sm:flex`}>{lead.priority}</Badge>
              )}
              <Badge className={`text-xs border ${cfg.color}`}>{cfg.label}</Badge>

              {/* Bouton développer */}
              <Button
                variant="ghost" size="icon"
                className="h-7 w-7 text-muted-foreground"
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Actions rapides */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {lead.phone_mobile && (
              <Button asChild size="sm" variant="outline" className="h-8 text-xs gap-1">
                <a href={`tel:${lead.phone_mobile}`}>
                  <Phone className="h-3.5 w-3.5" /> {lead.phone_mobile}
                </a>
              </Button>
            )}
            {lead.website && (
              <Button asChild size="sm" variant="ghost" className="h-8 text-xs gap-1 text-primary">
                <a href={lead.website} target="_blank" rel="noopener noreferrer">
                  <Globe className="h-3.5 w-3.5" />
                  <span className="max-w-[120px] truncate">
                    {lead.website.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}
                  </span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            )}

            <div className="ml-auto flex items-center gap-1.5">
              <Button
                size="sm" variant="ghost"
                className="h-8 text-xs gap-1 text-muted-foreground"
                onClick={() => setNotesOpen(true)}
              >
                <StickyNote className="h-3.5 w-3.5" />
                {lead.notes ? "Modifier notes" : "Ajouter note"}
              </Button>

              {cfg.next.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" className="h-8 text-xs gap-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Changer statut
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {cfg.next.map((s) => (
                      <DropdownMenuItem
                        key={s}
                        onClick={() => handleStatus(s)}
                        disabled={updateStatus.isPending}
                      >
                        <Badge className={`text-xs border mr-2 ${STATUS_CONFIG[s].color}`}>
                          {STATUS_CONFIG[s].label}
                        </Badge>
                        {lead.status === "SIGNED" && s === "QUALIFIED"
                          ? "Revenir à Qualifié (annuler Signé)"
                          : `Marquer comme ${STATUS_CONFIG[s].label}`}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Détails développés */}
          {expanded && (
            <div className="mt-4 pt-4 border-t border-border/50 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <p className="text-muted-foreground">Taille estimée</p>
                <p className="font-medium mt-0.5">{lead.size_bucket || "—"} employés</p>
              </div>
              <div>
                <p className="text-muted-foreground">Adresse (dépt.)</p>
                <p className="font-medium mt-0.5">
                  {lead.dept_code} — {DEPTS.find((d) => d.code === lead.dept_code)?.name ?? lead.dept_code}
                </p>
              </div>
              {lead.job_dept && (
                <div>
                  <p className="text-muted-foreground">Lot (campagne)</p>
                  <p className="font-medium mt-0.5">
                    {lead.job_dept} — {DEPTS.find((d) => d.code === lead.job_dept)?.name ?? lead.job_dept}
                  </p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground">Note Google</p>
                <p className="font-medium mt-0.5 flex items-center gap-1">
                  {lead.rating ? (
                    <><Star className="h-3 w-3 text-yellow-400 fill-yellow-400" /> {lead.rating} ({lead.reviews_count} avis)</>
                  ) : "—"}
                </p>
              </div>
              {lead.maps_url && (
                <div className="col-span-2 sm:col-span-3">
                  <a
                    href={lead.maps_url} target="_blank" rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    <MapPin className="h-3 w-3" /> Voir sur Google Maps
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
              {lead.notes && (
                <div className="col-span-2 sm:col-span-3 bg-card/50 rounded-lg p-3">
                  <p className="text-muted-foreground mb-1 flex items-center gap-1">
                    <StickyNote className="h-3 w-3" /> Notes
                  </p>
                  <p className="whitespace-pre-wrap">{lead.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </GlassCard>

      <NotesDialog lead={lead} open={notesOpen} onClose={() => setNotesOpen(false)} />
    </>
  );
}

// ─── Composant principal ──────────────────────────────────────

export default function CloserLeads() {
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [jobDeptFilter, setJobDeptFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortBy, setSortBy] = useState<MyLeadsSort>("dept");
  const [page, setPage] = useState(0);

  const { data: statsData } = useMyLeadStats();
  const { data, isLoading } = useMyLeads({
    status: statusFilter || undefined,
    priority: priorityFilter || undefined,
    dept: deptFilter || undefined,
    jobDept: jobDeptFilter || undefined,
    category: categoryFilter || undefined,
    sortBy,
    page,
  });

  const leads = data?.leads || [];
  const count = data?.count || 0;
  const PAGE = 50;
  const stats = statsData || { total: 0, new: 0, contacted: 0, qualified: 0, signed: 0, lost: 0 };

  return (
    <div className="space-y-6">
      {/* Compteurs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label="Total assignés"  value={stats.total}     color="text-foreground" />
        <StatCard label="Nouveaux"         value={stats.new}       color="text-blue-400" />
        <StatCard label="Contactés"        value={stats.contacted} color="text-yellow-400" />
        <StatCard label="Qualifiés"        value={stats.qualified} color="text-violet-400" />
        <StatCard label="Signés"           value={stats.signed}    color="text-emerald-400" />
      </div>

      {/* Filtres */}
      <GlassCard className="p-4">
        <div className="flex flex-wrap gap-3">
          <Select value={statusFilter || "_all"} onValueChange={(v) => { setStatusFilter(v === "_all" ? "" : v); setPage(0); }}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Tous les statuts</SelectItem>
              {(Object.keys(STATUS_CONFIG) as LeadStatus[]).map((s) => (
                <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={priorityFilter || "_all"} onValueChange={(v) => { setPriorityFilter(v === "_all" ? "" : v); setPage(0); }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Toutes priorités" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Toutes priorités</SelectItem>
              <SelectItem value="A">🔥 Priorité A</SelectItem>
              <SelectItem value="B">⭐ Priorité B</SelectItem>
              <SelectItem value="C">❄️ Priorité C</SelectItem>
            </SelectContent>
          </Select>

          <Select value={deptFilter || "_all"} onValueChange={(v) => { setDeptFilter(v === "_all" ? "" : v); setPage(0); }}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Dépt. adresse" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Tous (adresse)</SelectItem>
              {DEPTS.map((d) => (
                <SelectItem key={d.code} value={d.code}>{d.code} — {d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={jobDeptFilter || "_all"} onValueChange={(v) => { setJobDeptFilter(v === "_all" ? "" : v); setPage(0); }}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Lot (campagne)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Tous les lots</SelectItem>
              {DEPTS.map((d) => (
                <SelectItem key={d.code} value={d.code}>Lot {d.code} — {d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v) => { setSortBy(v as MyLeadsSort); setPage(0); }}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Trier par" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dept">Département (adresse)</SelectItem>
              <SelectItem value="date">Date (récent d’abord)</SelectItem>
              <SelectItem value="priority">Priorité</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter || "_all"} onValueChange={(v) => { setCategoryFilter(v === "_all" ? "" : v); setPage(0); }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Tous les métiers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Tous les métiers</SelectItem>
              {/* Ordre : plus facile → moins facile à closer (plombiers en premier) */}
              <SelectItem value="Plomberie">🔧 Plomberie</SelectItem>
              <SelectItem value="Chauffage">🔥 Chauffage</SelectItem>
              <SelectItem value="Électricité">⚡ Électricité</SelectItem>
              <SelectItem value="Couverture">🏚️ Couverture</SelectItem>
              <SelectItem value="Menuiserie">🪵 Menuiserie</SelectItem>
              <SelectItem value="Peinture">🎨 Peinture</SelectItem>
              <SelectItem value="Rénovation">🏠 Rénovation</SelectItem>
              <SelectItem value="Maçonnerie">🧱 Maçonnerie</SelectItem>
              <SelectItem value="Artisan BTP">🏗️ Artisan BTP</SelectItem>
              <SelectItem value="Photovoltaïque">☀️ Photovoltaïque</SelectItem>
              <SelectItem value="Terrassement">⛏️ Terrassement</SelectItem>
              <SelectItem value="Multi-services">🔨 Multi-services</SelectItem>
            </SelectContent>
          </Select>

          <span className="text-sm text-muted-foreground self-center">
            {count} lead{count !== 1 ? "s" : ""}
          </span>
        </div>
      </GlassCard>

      {/* Liste */}
      {isLoading ? (
        <div className="flex justify-center items-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : leads.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <Phone className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-muted-foreground font-medium">
            {stats.total === 0
              ? "Aucun lead assigné pour l'instant. Contactez votre admin."
              : "Aucun lead pour ces filtres."}
          </p>
        </GlassCard>
      ) : sortBy === "dept" ? (
        <div className="space-y-6">
          {(() => {
            const groups: { deptCode: string; leads: Lead[] }[] = [];
            let current: { deptCode: string; leads: Lead[] } | null = null;
            for (const lead of leads) {
              const code = lead.dept_code || "";
              if (!current || current.deptCode !== code) {
                current = { deptCode: code, leads: [lead] };
                groups.push(current);
              } else {
                current.leads.push(lead);
              }
            }
            return groups.map(({ deptCode, leads: groupLeads }) => {
              const dept = DEPTS.find((d) => d.code === deptCode);
              const label = dept ? `${deptCode} — ${dept.name}` : deptCode || "—";
              return (
                <div key={deptCode || "unknown"} className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground sticky top-0 bg-background/95 backdrop-blur py-1.5 border-b border-border/50">
                    {label} <span className="font-normal">({groupLeads.length})</span>
                  </h4>
                  <div className="space-y-3">
                    {groupLeads.map((lead) => <LeadCard key={lead.id} lead={lead} />)}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => <LeadCard key={lead.id} lead={lead} />)}
        </div>
      )}

      {/* Pagination */}
      {count > PAGE && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="outline" size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} / {Math.ceil(count / PAGE)}
          </span>
          <Button
            variant="outline" size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={(page + 1) * PAGE >= count}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
