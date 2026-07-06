import { useMemo, useState } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Play } from "lucide-react";
import {
  AGENT_DEFINITIONS,
  nextRunLabel,
  useAgentConfigs,
  useAgentRuns,
  useRunAgentNow,
  useToggleAgent,
  type AgentDefinition,
} from "@/hooks/useAiAgents";

const fmt = (iso: string | undefined) =>
  iso
    ? new Date(iso).toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Jamais";

function AgentCard({ def }: { def: AgentDefinition }) {
  const { data: configs } = useAgentConfigs();
  const { data: runs } = useAgentRuns();
  const toggle = useToggleAgent();
  const runNow = useRunAgentNow();
  const [running, setRunning] = useState(false);

  const cfg = configs?.find((c) => c.agent_type === def.type);
  const enabled = cfg?.enabled ?? false;

  const agentRuns = useMemo(
    () => (runs ?? []).filter((r) => r.agent_type === def.type),
    [runs, def.type]
  );
  const lastRun = agentRuns[0];
  const today = new Date().toDateString();
  const actionsToday = agentRuns
    .filter((r) => new Date(r.ran_at).toDateString() === today)
    .reduce((s, r) => s + (r.actions_count ?? 0), 0);

  const handleRunNow = async () => {
    setRunning(true);
    try {
      await runNow.mutateAsync(def);
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card className="overflow-hidden border-t-4 border-t-orange-400">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden>
              {def.emoji}
            </span>
            <div>
              <h3 className="font-bold leading-tight">{def.label}</h3>
              <p className="text-xs text-muted-foreground">{def.frequencyLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              className={
                enabled
                  ? "bg-orange-500 hover:bg-orange-500 text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted"
              }
            >
              {enabled ? "ACTIF" : "EN PAUSE"}
            </Badge>
            <Switch
              checked={enabled}
              onCheckedChange={(v) => toggle.mutate({ def, enabled: v })}
              aria-label={`Activer ${def.label}`}
            />
          </div>
        </div>

        <p className="mt-3 min-h-[2.5rem] text-sm text-foreground/80">{def.description}</p>

        <div className="mt-4 space-y-2 border-t pt-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Dernière exécution</span>
            <span className="font-medium">{fmt(lastRun?.ran_at)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Prochaine exécution</span>
            <span className="font-medium">{nextRunLabel(def, cfg)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Actions aujourd&apos;hui</span>
            <span className="font-bold text-orange-500">{actionsToday}</span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2 border-t pt-3">
          {lastRun ? (
            <div className="flex min-w-0 items-center gap-2 text-xs">
              <Badge
                variant="outline"
                className={
                  lastRun.status === "success"
                    ? "border-green-500/40 bg-green-500/10 text-green-600"
                    : "border-red-500/40 bg-red-500/10 text-red-600"
                }
              >
                {lastRun.status === "success" ? "SUCCESS" : "ERREUR"}
              </Badge>
              <span className="truncate text-muted-foreground">{lastRun.summary}</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Aucune exécution pour l&apos;instant</span>
          )}
          <Button
            size="sm"
            variant="outline"
            className="shrink-0"
            onClick={handleRunNow}
            disabled={running}
          >
            {running ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="mr-1 h-3.5 w-3.5" />
            )}
            Exécuter
          </Button>
        </div>
      </div>
    </Card>
  );
}

const Agents = () => {
  const { isLoading } = useAgentConfigs();

  return (
    <PageLayout title="Agents IA">
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">
          Vos assistants automatiques : ils relancent vos devis, surveillent vos impayés et vous
          envoient l&apos;essentiel — pendant que vous êtes sur les chantiers. Activez un agent et
          c&apos;est parti.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {AGENT_DEFINITIONS.map((d) => (
            <Skeleton key={d.type} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {AGENT_DEFINITIONS.map((def) => (
            <AgentCard key={def.type} def={def} />
          ))}
        </div>
      )}
    </PageLayout>
  );
};

export default Agents;
