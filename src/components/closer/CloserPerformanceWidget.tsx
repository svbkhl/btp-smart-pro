import { GlassCard } from "@/components/ui/GlassCard";
import { useMyLeadStats } from "@/hooks/useLeads";
import { Loader2, TrendingUp, Phone, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CloserPerformanceWidgetProps {
  /** Vue agrandie pour l’écran d’accueil (démo avec prospect) */
  size?: "default" | "large";
}

export function CloserPerformanceWidget({ size = "default" }: CloserPerformanceWidgetProps) {
  const { data: stats, isLoading: statsLoading } = useMyLeadStats();
  const isLarge = size === "large";

  if (statsLoading && !stats) {
    return (
      <GlassCard className={isLarge ? "p-6 sm:p-8" : "p-4"}>
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </GlassCard>
    );
  }

  const total = stats?.total ?? 0;
  const newCount = stats?.new ?? 0;
  const signed = stats?.signed ?? 0;
  const conversion = total > 0 ? Math.round((signed / total) * 100) : 0;

  return (
    <GlassCard className={isLarge ? "p-6 sm:p-8" : "p-4"}>
      <div className={cn("flex flex-wrap items-center justify-between gap-3", isLarge && "gap-5 sm:gap-6")}>
        <div className="flex items-center gap-3 sm:gap-4">
          <div
            className={cn(
              "flex items-center justify-center rounded-xl bg-primary/10 text-primary",
              isLarge ? "h-12 w-12 sm:h-14 sm:w-14" : "h-9 w-9"
            )}
          >
            <TrendingUp className={isLarge ? "h-6 w-6 sm:h-7 sm:w-7" : "h-4 w-4"} />
          </div>
          <div>
            <p className={cn("font-semibold", isLarge ? "text-base sm:text-lg" : "text-sm")}>Ma performance</p>
            <p className={cn("text-muted-foreground", isLarge ? "text-sm" : "text-xs")}>Leads & conversions</p>
          </div>
        </div>
        <div className={cn("flex flex-wrap items-center gap-4 sm:gap-6", isLarge && "gap-5 sm:gap-8")}>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Phone className={cn("text-muted-foreground", isLarge ? "h-5 w-5" : "h-4 w-4")} />
            <span className={cn("font-bold", isLarge ? "text-xl sm:text-2xl" : "text-lg")}>{total}</span>
            <span className={cn("text-muted-foreground", isLarge ? "text-sm" : "text-xs")}>assignés</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className={cn("font-bold text-blue-400", isLarge ? "text-xl sm:text-2xl" : "text-lg")}>{newCount}</span>
            <span className={cn("text-muted-foreground", isLarge ? "text-sm" : "text-xs")}>nouveaux</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <CheckCircle2 className={cn("text-emerald-400", isLarge ? "h-5 w-5" : "h-4 w-4")} />
            <span className={cn("font-bold text-emerald-400", isLarge ? "text-xl sm:text-2xl" : "text-lg")}>{signed}</span>
            <span className={cn("text-muted-foreground", isLarge ? "text-sm" : "text-xs")}>signés</span>
          </div>
          {total > 0 && (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className={cn("font-semibold text-primary", isLarge ? "text-base sm:text-lg" : "text-sm")}>{conversion}%</span>
              <span className={cn("text-muted-foreground", isLarge ? "text-sm" : "text-xs")}>taux</span>
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
}
