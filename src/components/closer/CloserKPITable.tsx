import { GlassCard } from "@/components/ui/GlassCard";
import { useMyLeadStats } from "@/hooks/useLeads";
import {
  Loader2,
  Target,
  Phone,
  MessageSquare,
  CheckCircle2,
  FileSignature,
  XCircle,
  TrendingUp,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const KPI_ROW = [
  { key: "total", label: "Leads assignés", icon: Users, color: "text-foreground", bg: "bg-muted/50" },
  { key: "new", label: "Nouveaux", icon: Target, color: "text-slate-400 dark:text-slate-300", bg: "bg-slate-500/10" },
  { key: "to_callback", label: "À rappeler", icon: Phone, color: "text-amber-500", bg: "bg-amber-500/10" },
  { key: "not_interested", label: "Pas intéressé", icon: Phone, color: "text-orange-500", bg: "bg-orange-500/10" },
  { key: "qualified", label: "Qualifiés", icon: MessageSquare, color: "text-violet-500", bg: "bg-violet-500/10" },
  { key: "signed", label: "Signés", icon: FileSignature, color: "text-emerald-500", bg: "bg-emerald-500/10" },
] as const;

export function CloserKPITable() {
  const { data: stats, isLoading: statsLoading } = useMyLeadStats();

  if (statsLoading && !stats) {
    return (
      <GlassCard className="p-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </GlassCard>
    );
  }

  const total = stats?.total ?? 0;
  const signed = stats?.signed ?? 0;
  const conversionRate = total > 0 ? Math.round((signed / total) * 100) : 0;

  return (
    <GlassCard className="p-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10 dark:border-white/5 bg-white/5 dark:bg-black/10">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-sm">Tableau de bord KPI</h3>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 dark:border-white/5">
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Indicateur</th>
              <th className="text-right py-3 px-4 font-medium text-muted-foreground">Valeur</th>
              <th className="text-right py-3 px-4 font-medium text-muted-foreground w-24">% pipeline</th>
            </tr>
          </thead>
          <tbody>
            {KPI_ROW.map(({ key, label, icon: Icon, color, bg }) => {
              const value = stats ? (stats[key] as number) : 0;
              const pct = total > 0 ? Math.round((value / total) * 100) : 0;
              return (
                <tr
                  key={key}
                  className="border-b border-white/5 dark:border-white/5 hover:bg-white/5 dark:hover:bg-black/5 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className={cn("flex items-center justify-center w-8 h-8 rounded-lg shrink-0", bg, color)}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="font-medium">{label}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-semibold tabular-nums">{value}</td>
                  <td className="py-3 px-4 text-right text-muted-foreground tabular-nums">{pct} %</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Ligne synthèse : conversion + rang */}
      <div className="px-4 py-4 border-t border-white/10 dark:border-white/5 bg-white/5 dark:bg-black/10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs text-muted-foreground">Taux de conversion (signés / assignés)</p>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{conversionRate} %</p>
          </div>
        </div>
        {/* Classement masqué temporairement (nouvel ordre à venir) */}
      </div>
    </GlassCard>
  );
}
