import { useState } from "react";
import {
  useAllClosersKpi,
  useAllOwnersLeadKpi,
  useGlobalClosersKpi,
  useLeadKpiByDay,
} from "@/hooks/useLeads";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Target,
  Phone,
  MessageSquare,
  FileSignature,
  XCircle,
  CheckCircle2,
  UserCircle,
  TrendingUp,
  BarChart3,
  Calendar,
} from "lucide-react";

const KPI_KEYS = [
  { key: "total", label: "Assignés", icon: Target },
  { key: "new", label: "Nouveaux", icon: Target },
  { key: "to_callback", label: "À rappeler", icon: Phone },
  { key: "no_answer", label: "Pas de réponse", icon: Phone },
  { key: "not_interested", label: "Pas intéressé", icon: Phone },
  { key: "qualified", label: "Qualifiés", icon: MessageSquare },
  { key: "signed", label: "Signés", icon: FileSignature },
  { key: "lost", label: "Perdus", icon: XCircle },
] as const;

function formatDay(dayStr: string) {
  try {
    const d = new Date(dayStr + "Z");
    return d.toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  } catch {
    return dayStr;
  }
}

export function AdminKPIClosers() {
  const [daysCount, setDaysCount] = useState<number>(7);
  const { data: global, isLoading: globalLoading } = useGlobalClosersKpi();
  const { data: byDay, isLoading: byDayLoading } = useLeadKpiByDay(daysCount);
  const { data: closers, isLoading: closersLoading } = useAllClosersKpi();
  const { data: ownersKpi } = useAllOwnersLeadKpi();

  const isLoading = globalLoading && !global;
  const list = closersLoading
    ? []
    : (closers && closers.length > 0 ? closers : ownersKpi ?? []);
  const showingOwnersFallback =
    !closersLoading &&
    (!closers || closers.length === 0) &&
    (ownersKpi?.length ?? 0) > 0;
  const dayRows = byDay ?? [];

  return (
    <div className="space-y-8">
      {/* ─── KPI globaux (tous les closers réunis) ─── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Total (tous les closers réunis)</h3>
        </div>
        {globalLoading && !global ? (
          <GlassCard className="p-8">
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          </GlassCard>
        ) : (
          <GlassCard className="p-0 overflow-hidden">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-px bg-border/50">
              {KPI_KEYS.map(({ key, label }) => {
                const value = global ? (global[key as keyof typeof global] as number) : 0;
                return (
                  <div key={key} className="bg-card p-4 text-center">
                    <p className="text-2xl font-bold tabular-nums">{value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                  </div>
                );
              })}
            </div>
            <div className="px-4 py-3 border-t border-white/10 bg-white/5 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Taux de conversion (signés / assignés)</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" />
                {global && global.total > 0
                  ? Math.round((global.signed / global.total) * 100)
                  : 0}{" "}
                %
              </span>
            </div>
          </GlassCard>
        )}
      </div>

      {/* ─── KPI par jour ─── */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Par jour</h3>
          </div>
          <Select
            value={String(daysCount)}
            onValueChange={(v) => setDaysCount(Number(v))}
          >
            <SelectTrigger className="w-[140px] rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 derniers jours</SelectItem>
              <SelectItem value="14">14 derniers jours</SelectItem>
              <SelectItem value="30">30 derniers jours</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Nombre de leads (assignés) mis à jour chaque jour, par statut.
        </p>
        {byDayLoading && dayRows.length === 0 ? (
          <GlassCard className="p-8">
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          </GlassCard>
        ) : dayRows.length === 0 ? (
          <GlassCard className="p-6 text-center text-muted-foreground text-sm">
            Aucune activité sur la période.
          </GlassCard>
        ) : (
          <GlassCard className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Jour</th>
                    <th className="text-right py-3 px-3 font-medium text-muted-foreground tabular-nums">Total</th>
                    <th className="text-right py-3 px-3 font-medium text-muted-foreground tabular-nums">New</th>
                    <th className="text-right py-3 px-3 font-medium text-muted-foreground tabular-nums">À rappeler</th>
                    <th className="text-right py-3 px-3 font-medium text-muted-foreground tabular-nums">Pas de répo.</th>
                    <th className="text-right py-3 px-3 font-medium text-muted-foreground tabular-nums">Pas intér.</th>
                    <th className="text-right py-3 px-3 font-medium text-muted-foreground tabular-nums">Qualifiés</th>
                    <th className="text-right py-3 px-3 font-medium text-muted-foreground tabular-nums">Signés</th>
                    <th className="text-right py-3 px-3 font-medium text-muted-foreground tabular-nums">Perdus</th>
                  </tr>
                </thead>
                <tbody>
                  {dayRows.map((row) => (
                    <tr
                      key={row.day}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="py-2.5 px-4 font-medium">{formatDay(row.day)}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{row.total}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{row.new}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{row.to_callback ?? 0}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{row.no_answer ?? 0}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{row.not_interested ?? 0}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{row.qualified}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-emerald-500">{row.signed}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-rose-500">{row.lost}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        )}
      </div>

      {/* ─── KPI par closer (1 par 1) ─── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">KPI par closer</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Vue des indicateurs leads pour chaque closer (1 par 1).
        </p>
        {showingOwnersFallback && (
          <p className="text-sm text-amber-600 dark:text-amber-400 mb-3">
            Liste affichée à partir des propriétaires de leads (aucun closer enregistré dans Paramètres).
          </p>
        )}

        {closersLoading && list.length === 0 ? (
          <GlassCard className="p-8">
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </GlassCard>
        ) : list.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <UserCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Aucun closer enregistré.</p>
          </GlassCard>
        ) : (
          <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
            {list.map((row) => {
              const conversion = row.total > 0 ? Math.round((row.signed / row.total) * 100) : 0;
              return (
                <GlassCard key={row.closer_id} className="p-0 overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/10 bg-white/5 flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <UserCircle className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{row.closer_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{row.closer_email}</p>
                    </div>
                  </div>
                  <div className="p-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-2 font-medium text-muted-foreground">Indicateur</th>
                          <th className="text-right py-2 font-medium text-muted-foreground">Valeur</th>
                          <th className="text-right py-2 font-medium text-muted-foreground w-16">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {KPI_KEYS.map(({ key, label }) => {
                          const value = row[key as keyof typeof row] as number;
                          const pct = row.total > 0 ? Math.round((value / row.total) * 100) : 0;
                          return (
                            <tr key={key} className="border-b border-white/5">
                              <td className="py-1.5">{label}</td>
                              <td className="py-1.5 text-right font-medium tabular-nums">{value}</td>
                              <td className="py-1.5 text-right text-muted-foreground tabular-nums">{pct} %</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Taux de conversion</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" />
                        {conversion} %
                      </span>
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
