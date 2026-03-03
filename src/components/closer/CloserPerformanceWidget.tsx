import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useMyLeadStats } from "@/hooks/useLeads";
import { Loader2, Trophy, TrendingUp, Phone, CheckCircle2 } from "lucide-react";

interface CloserRank {
  closer_email: string;
  monthly_closes: number;
  rank: number;
}

function useMyRank() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["closer_my_rank", user?.email],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_closer_leaderboard" as any);
      if (error) throw error;
      const list = (data as CloserRank[]) || [];
      const sorted = [...list].sort((a, b) => b.monthly_closes - a.monthly_closes);
      const idx = sorted.findIndex((r) => r.closer_email?.toLowerCase() === user?.email?.toLowerCase());
      return idx >= 0 ? idx + 1 : null;
    },
    enabled: !!user?.email,
  });
}

export function CloserPerformanceWidget({ onViewClassement }: { onViewClassement?: () => void }) {
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading } = useMyLeadStats();
  const { data: myRank, isLoading: rankLoading } = useMyRank();

  if (statsLoading && !stats) {
    return (
      <GlassCard className="p-4">
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
    <GlassCard className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">Ma performance</p>
            <p className="text-xs text-muted-foreground">Leads & conversions</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-1.5">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-lg font-bold">{total}</span>
            <span className="text-xs text-muted-foreground">assignés</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-bold text-blue-400">{newCount}</span>
            <span className="text-xs text-muted-foreground">nouveaux</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span className="text-lg font-bold text-emerald-400">{signed}</span>
            <span className="text-xs text-muted-foreground">signés</span>
          </div>
          {total > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-primary">{conversion}%</span>
              <span className="text-xs text-muted-foreground">taux</span>
            </div>
          )}
          {!rankLoading && myRank != null && (
            <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2 py-1 border border-amber-500/20">
              <Trophy className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-bold text-amber-600 dark:text-amber-400">#{myRank}</span>
              <span className="text-xs text-muted-foreground">ce mois</span>
            </div>
          )}
        </div>
        {onViewClassement && (
          <Button variant="outline" size="sm" className="rounded-xl gap-1.5" onClick={onViewClassement}>
            <Trophy className="h-3.5 w-3.5" />
            Voir le classement
          </Button>
        )}
      </div>
    </GlassCard>
  );
}
