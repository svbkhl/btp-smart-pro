import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Trophy, Crown, Flame, Star, ChevronLeft, ChevronRight } from "lucide-react";
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
      // 1. Données de closes (vrais scores)
      const { data: scores, error } = await supabase.rpc("get_closer_leaderboard" as any);
      if (error) throw error;
      const scoreList: CloserRank[] = (scores as unknown as CloserRank[]) || [];

      // 2. Tous les closers inscrits
      const { data: allClosers } = await supabase
        .from("closer_emails" as any)
        .select("email, name");
      const closerList = (allClosers as { email: string; name?: string }[]) || [];

      // 3. Fusionner : closers sans score → monthly_closes: 0
      const merged: CloserRank[] = closerList.map((c) => {
        const found = scoreList.find(
          (s) => s.closer_email?.toLowerCase() === c.email?.toLowerCase()
        );
        return found ?? {
          closer_email: c.email,
          closer_name: c.name || c.email.split("@")[0],
          total_closes: 0,
          monthly_closes: 0,
          trials_active: 0,
          rank: 0,
        };
      });

      // Ajouter les scores qui ne sont pas dans closer_emails (sécurité)
      scoreList.forEach((s) => {
        if (!merged.some((m) => m.closer_email?.toLowerCase() === s.closer_email?.toLowerCase())) {
          merged.push(s);
        }
      });

      return merged
        .sort((a, b) => b.monthly_closes - a.monthly_closes)
        .map((e, i) => ({ ...e, rank: i + 1 }));
    },
    refetchInterval: 60_000,
  });
}

const initials = (name: string) =>
  name.split(" ").filter(Boolean).map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";

/* ─── Podium top 3 ─────────────────────────────────────────────────────────── */
const PodiumTop3 = ({ top3, userEmail }: { top3: CloserRank[]; userEmail?: string }) => {
  if (top3.length < 3) return null;

  const [first, second, third] = [top3[0], top3[1], top3[2]];

  const avatar = (entry: CloserRank, size: string, colorClass: string) => (
    <div className={cn("rounded-full flex items-center justify-center font-bold flex-shrink-0", size, colorClass)}>
      {initials(entry.closer_name)}
    </div>
  );

  const maxCloses = first.monthly_closes || 1;

  const PodiumSlot = ({
    entry,
    height,
    label,
    avatarSize,
    scoreColor,
    bgColor,
    borderColor,
    avatarColor,
    rankIcon,
  }: {
    entry: CloserRank;
    height: string;
    label: string;
    avatarSize: string;
    scoreColor: string;
    bgColor: string;
    borderColor: string;
    avatarColor: string;
    rankIcon: React.ReactNode;
  }) => {
    const isSelf = entry.closer_email?.toLowerCase() === userEmail?.toLowerCase();
    return (
      <div className="flex flex-col items-center gap-2 flex-1">
        {/* Info au-dessus du podium */}
        <div className="flex flex-col items-center gap-1 mb-1">
          <div className="relative">
            {avatar(entry, avatarSize, avatarColor)}
            <span className="absolute -top-2 -right-1">{rankIcon}</span>
          </div>
          <p className="font-bold text-sm text-center leading-tight max-w-[90px] truncate">
            {entry.closer_name.split(" ")[0]}
          </p>
          {isSelf && <Badge variant="outline" className="text-xs py-0 px-1.5">Vous</Badge>}
          <div className="flex flex-col items-center">
            <span className={cn("text-2xl font-extrabold leading-none", scoreColor)}>{entry.monthly_closes}</span>
            <span className="text-xs text-muted-foreground">closes</span>
          </div>
          {entry.trials_active > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-orange-400 font-medium">
              <Flame className="w-3 h-3" />{entry.trials_active} chauds
            </span>
          )}
        </div>
        {/* Colonne podium */}
        <div className={cn("w-full rounded-t-xl border-t border-x flex items-center justify-center text-lg font-black", height, bgColor, borderColor, label === "🥇" ? "text-yellow-400" : label === "🥈" ? "text-slate-400" : "text-amber-600")}>
          {label}
        </div>
      </div>
    );
  };

  return (
    <div className="flex items-end gap-2 px-2 pb-0">
      <PodiumSlot
        entry={second}
        height="h-20"
        label="🥈"
        avatarSize="w-12 h-12 text-base"
        scoreColor="text-slate-400"
        bgColor="bg-slate-500/10"
        borderColor="border-slate-400/30"
        avatarColor="bg-slate-400/20 text-slate-300"
        rankIcon={<span className="text-lg">🥈</span>}
      />
      <div className="relative">
        {/* Halo animé autour du 1er */}
        <div className="absolute -inset-2 rounded-2xl bg-yellow-400/10 animate-pulse pointer-events-none" />
        <PodiumSlot
          entry={first}
          height="h-32"
          label="🥇"
          avatarSize="w-16 h-16 text-xl"
          scoreColor="text-yellow-400"
          bgColor="bg-yellow-500/10"
          borderColor="border-yellow-400/30"
          avatarColor="bg-yellow-500/20 text-yellow-400"
          rankIcon={<Crown className="w-5 h-5 text-yellow-400 animate-bounce" />}
        />
      </div>
      <PodiumSlot
        entry={third}
        height="h-14"
        label="🥉"
        avatarSize="w-10 h-10 text-sm"
        scoreColor="text-amber-600"
        bgColor="bg-amber-600/10"
        borderColor="border-amber-600/30"
        avatarColor="bg-amber-600/20 text-amber-600"
        rankIcon={<span className="text-lg">🥉</span>}
      />
    </div>
  );
};

/* ─── Ligne classement (rang 4+) ──────────────────────────────────────────── */
const RankRow = ({ entry, userEmail, maxCloses }: { entry: CloserRank; userEmail?: string; maxCloses: number }) => {
  const isSelf = entry.closer_email?.toLowerCase() === userEmail?.toLowerCase();
  const pct = Math.round((entry.monthly_closes / maxCloses) * 100);

  return (
    <div className={cn("flex items-center gap-3 px-4 py-3 transition-colors", isSelf && "bg-primary/5")}>
      <span className="w-6 text-center text-xs font-bold text-muted-foreground">#{entry.rank}</span>
      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold flex-shrink-0">
        {initials(entry.closer_name)}
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium text-sm truncate">{entry.closer_name.split("@")[0]}</p>
          <div className="flex items-center gap-2 flex-shrink-0">
            {entry.trials_active > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-orange-400 font-medium">
                <Flame className="w-3 h-3" />{entry.trials_active}
              </span>
            )}
            <span className="font-bold text-sm">{entry.monthly_closes} <span className="text-xs font-normal text-muted-foreground">closes</span></span>
            {isSelf && <Badge variant="outline" className="text-xs py-0 px-1.5">Vous</Badge>}
          </div>
        </div>
        {/* Barre de progression */}
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", isSelf ? "bg-primary" : "bg-muted-foreground/40")}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
};

/* ─── Composant principal ─────────────────────────────────────────────────── */
export const CloserLeaderboard = () => {
  const { user } = useAuth();
  const { data: realData = [], isLoading, error } = useLeaderboard();
  // monthOffset : 0 = mois en cours, -1 = mois précédent, etc.
  const [monthOffset, setMonthOffset] = useState(0);

  const leaderboard = realData;

  const displayDate = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthOffset);
    return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  })();

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);
  const maxCloses = leaderboard[0]?.monthly_closes || 1;

  return (
    <div className="space-y-4">
      {/* Header avec navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg"
            onClick={() => setMonthOffset((v) => v - 1)}
            disabled={monthOffset <= -2}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-1.5 px-1">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-semibold capitalize min-w-[130px] text-center">{displayDate}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg"
            onClick={() => setMonthOffset((v) => v + 1)}
            disabled={monthOffset >= 0}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full">
          <Star className="w-3 h-3 text-yellow-500" />
          Primes Top 3
        </span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <GlassCard className="p-6 text-center text-sm text-muted-foreground">
          Impossible de charger le classement.
        </GlassCard>
      ) : (
        <GlassCard className="overflow-hidden relative">
          {/* Déco animée fond */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {/* Orbes colorés */}
            <div className="absolute top-4 left-8 w-24 h-24 rounded-full bg-yellow-400/10 blur-2xl animate-pulse" />
            <div className="absolute top-12 right-12 w-16 h-16 rounded-full bg-slate-400/10 blur-xl animate-pulse [animation-delay:1s]" />
            <div className="absolute bottom-8 left-1/2 w-20 h-20 rounded-full bg-amber-600/10 blur-2xl animate-pulse [animation-delay:2s]" />
            {/* Étoiles scintillantes */}
            <span className="absolute top-6 left-[42%] text-yellow-400/60 text-xs animate-bounce [animation-delay:0.3s]">★</span>
            <span className="absolute top-3 left-[55%] text-yellow-300/40 text-[10px] animate-bounce [animation-delay:0.8s]">✦</span>
            <span className="absolute top-8 left-[30%] text-yellow-500/30 text-[8px] animate-bounce [animation-delay:1.2s]">✦</span>
            <span className="absolute top-2 right-24 text-yellow-400/40 text-xs animate-bounce [animation-delay:1.7s]">★</span>
          </div>

          {/* Podium */}
          {top3.length === 3 && (
            <div className="px-4 pt-6 pb-0 relative">
              <PodiumTop3 top3={top3} userEmail={user?.email} />
            </div>
          )}

          {/* Liste rang 4+ */}
          {rest.length > 0 && (
            <div className="divide-y divide-border/40 mt-2">
              {rest.map((entry) => (
                <RankRow
                  key={entry.closer_email}
                  entry={entry}
                  userEmail={user?.email}
                  maxCloses={maxCloses}
                />
              ))}
            </div>
          )}

          {/* Légende */}
          <div className="flex items-center justify-center gap-4 px-4 py-3 border-t border-border/40 mt-1">
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Flame className="w-3 h-3 text-orange-400" /> Prospects chauds en essai
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Trophy className="w-3 h-3 text-yellow-500" /> Close = abonnement signé
            </span>
          </div>
        </GlassCard>
      )}
    </div>
  );
};
