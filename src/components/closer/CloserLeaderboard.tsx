import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trophy, Medal, Crown, TrendingUp, Clock, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface CloserRank {
  closer_email: string;
  closer_name: string;
  total_closes: number;
  monthly_closes: number;
  trials_active: number;
  rank: number;
}

function useLeaderboard() {
  return useQuery<CloserRank[]>({
    queryKey: ["closer_leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_closer_leaderboard" as any);
      if (error) throw error;
      return (data as unknown as CloserRank[]) || [];
    },
    refetchInterval: 60_000, // actualise toutes les minutes
  });
}

/* ─── Médaille selon le rang ─── */
const RankBadge = ({ rank }: { rank: number }) => {
  if (rank === 1) return <Crown className="w-6 h-6 text-yellow-400" />;
  if (rank === 2) return <Medal className="w-6 h-6 text-slate-400" />;
  if (rank === 3) return <Medal className="w-6 h-6 text-amber-600" />;
  return <span className="text-sm font-bold text-muted-foreground w-6 text-center">#{rank}</span>;
};

/* ─── Carte podium (top 3) ─── */
const PodiumCard = ({ entry, isSelf }: { entry: CloserRank; isSelf: boolean }) => {
  const styles: Record<number, { border: string; bg: string; shadow: string; size: string }> = {
    1: {
      border: "border-yellow-400/40",
      bg: "bg-yellow-500/10",
      shadow: "shadow-yellow-500/20",
      size: "scale-105",
    },
    2: {
      border: "border-slate-400/30",
      bg: "bg-slate-500/10",
      shadow: "shadow-slate-500/10",
      size: "",
    },
    3: {
      border: "border-amber-600/30",
      bg: "bg-amber-600/10",
      shadow: "shadow-amber-600/10",
      size: "",
    },
  };

  const s = styles[entry.rank] || styles[3];
  const initials = entry.closer_name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={cn("flex flex-col items-center gap-3 p-5 rounded-2xl border backdrop-blur-xl transition-transform", s.border, s.bg, s.size, isSelf && "ring-2 ring-primary/40")}>
      {/* Avatar */}
      <div className={cn(
        "relative w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold",
        entry.rank === 1 ? "bg-yellow-500/20 text-yellow-500" :
        entry.rank === 2 ? "bg-slate-400/20 text-slate-400" :
        "bg-amber-600/20 text-amber-600"
      )}>
        {initials || "?"}
        <span className="absolute -top-2 -right-2">
          <RankBadge rank={entry.rank} />
        </span>
      </div>

      {/* Nom */}
      <div className="text-center">
        <p className="font-bold text-sm leading-tight">{entry.closer_name.split("@")[0]}</p>
        {isSelf && <Badge variant="outline" className="text-xs mt-1">Vous</Badge>}
      </div>

      {/* Stats */}
      <div className="text-center">
        <p className={cn("text-3xl font-extrabold", entry.rank === 1 ? "text-yellow-400" : entry.rank === 2 ? "text-slate-400" : "text-amber-600")}>
          {entry.monthly_closes}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">close{entry.monthly_closes > 1 ? "s" : ""} ce mois</p>
      </div>

      {entry.trials_active > 0 && (
        <Badge variant="secondary" className="text-xs gap-1">
          <Clock className="w-3 h-3" />
          {entry.trials_active} en essai
        </Badge>
      )}
    </div>
  );
};

/* ─── Composant principal ─── */
export const CloserLeaderboard = () => {
  const { user } = useAuth();
  const { data: leaderboard = [], isLoading, error } = useLeaderboard();

  const currentMonth = new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);
  const myEntry = leaderboard.find((e) => e.closer_email?.toLowerCase() === user?.email?.toLowerCase());
  const myRank = myEntry?.rank;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Trophy className="w-4 h-4 text-yellow-500" />
        <span className="text-sm font-semibold capitalize">{currentMonth}</span>
        <span className="text-xs text-muted-foreground">— Primes Top 3 fin de mois</span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <GlassCard className="p-6 text-center text-sm text-muted-foreground">
          Impossible de charger le classement.
        </GlassCard>
      ) : leaderboard.length === 0 ? (
        <GlassCard className="p-10 text-center">
          <Trophy className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="font-medium">Aucun classement pour l'instant</p>
          <p className="text-sm text-muted-foreground mt-1">Le classement se mettra à jour automatiquement après chaque conversion.</p>
        </GlassCard>
      ) : (
        <>
          {/* Mon rang (si pas top 3) */}
          {myEntry && myRank && myRank > 3 && (
            <GlassCard className="p-4 flex items-center justify-between border-primary/20 bg-primary/5">
              <div className="flex items-center gap-3">
                <span className="text-xl font-extrabold text-primary">#{myRank}</span>
                <div>
                  <p className="font-semibold text-sm">Votre position</p>
                  <p className="text-xs text-muted-foreground">{myEntry.monthly_closes} close{myEntry.monthly_closes > 1 ? "s" : ""} ce mois • {myEntry.trials_active} en essai</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs">Vous</Badge>
            </GlassCard>
          )}

          {/* Podium top 3 */}
          {top3.length > 0 && (
            <div className={cn(
              "grid gap-3",
              top3.length === 1 ? "grid-cols-1 max-w-xs mx-auto" :
              top3.length === 2 ? "grid-cols-2" :
              "grid-cols-3"
            )}>
              {/* Réordonner pour le podium visuel : 2 - 1 - 3 */}
              {top3.length === 3 ? (
                [top3[1], top3[0], top3[2]].map((entry) => (
                  <PodiumCard
                    key={entry.closer_email}
                    entry={entry}
                    isSelf={entry.closer_email?.toLowerCase() === user?.email?.toLowerCase()}
                  />
                ))
              ) : (
                top3.map((entry) => (
                  <PodiumCard
                    key={entry.closer_email}
                    entry={entry}
                    isSelf={entry.closer_email?.toLowerCase() === user?.email?.toLowerCase()}
                  />
                ))
              )}
            </div>
          )}

          {/* Suite du classement (rang 4+) */}
          {rest.length > 0 && (
            <GlassCard className="overflow-hidden divide-y divide-border/50">
              {rest.map((entry) => (
                <div
                  key={entry.closer_email}
                  className={cn(
                    "flex items-center gap-4 px-4 py-3 transition-colors",
                    entry.closer_email?.toLowerCase() === user?.email?.toLowerCase() && "bg-primary/5"
                  )}
                >
                  <span className="text-sm font-bold text-muted-foreground w-7 text-center">#{entry.rank}</span>
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {entry.closer_name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{entry.closer_name.split("@")[0]}</p>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <p className="font-bold text-sm">{entry.monthly_closes}</p>
                      <p className="text-xs text-muted-foreground">ce mois</p>
                    </div>
                    {entry.trials_active > 0 && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <Clock className="w-3 h-3" />{entry.trials_active}
                      </Badge>
                    )}
                    {entry.closer_email?.toLowerCase() === user?.email?.toLowerCase() && (
                      <Badge variant="outline" className="text-xs">Vous</Badge>
                    )}
                  </div>
                </div>
              ))}
            </GlassCard>
          )}

          {/* Légende */}
          <div className="flex flex-wrap items-center gap-4 justify-center text-xs text-muted-foreground pt-1">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-green-500" />
              <span>Close = entreprise convertie en abonnement payant</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-orange-400" />
              <span>En essai = prospect chaud (14j)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-primary" />
              <span>Primes Top 3 fin de mois</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
