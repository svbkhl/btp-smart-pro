import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCompanyId } from "./useCompanyId";
import { useToast } from "@/components/ui/use-toast";

// Les tables ai_agent_* ne sont pas encore dans les types Supabase générés.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export type AgentType =
  | "relance_devis"
  | "daily_briefing"
  | "urgent_alert"
  | "avis_google"
  | "rentabilite"
  | "ca_hebdo";

export interface AgentDefinition {
  type: AgentType;
  emoji: string;
  label: string;
  description: string;
  frequencyLabel: string;
  defaultSchedule: string; // "HH:MM"
}

export const AGENT_DEFINITIONS: AgentDefinition[] = [
  {
    type: "relance_devis",
    emoji: "📄",
    label: "Relance Devis",
    description: "Relance automatique des devis en attente depuis plus de 3 jours",
    frequencyLabel: "20h00 quotidien",
    defaultSchedule: "20:00",
  },
  {
    type: "daily_briefing",
    emoji: "☀️",
    label: "Daily Briefing",
    description: "Résumé quotidien de l'activité et des chantiers du jour",
    frequencyLabel: "7h00 quotidien",
    defaultSchedule: "07:00",
  },
  {
    type: "urgent_alert",
    emoji: "🚨",
    label: "Urgent Alert",
    description: "Alertes urgentes pour les devis en attente depuis plus de 7 jours",
    frequencyLabel: "Toutes les 6h",
    defaultSchedule: "06:00",
  },
  {
    type: "ca_hebdo",
    emoji: "💰",
    label: "CA Hebdomadaire",
    description: "Calcul du chiffre d'affaires prévu pour la semaine",
    frequencyLabel: "Lundi 8h00",
    defaultSchedule: "08:00",
  },
  {
    type: "avis_google",
    emoji: "⭐",
    label: "Avis Google",
    description: "Demande d'avis Google pour les chantiers terminés",
    frequencyLabel: "9h00 quotidien",
    defaultSchedule: "09:00",
  },
  {
    type: "rentabilite",
    emoji: "📊",
    label: "Rentabilité",
    description: "Analyse de la rentabilité des chantiers en cours",
    frequencyLabel: "21h00 quotidien",
    defaultSchedule: "21:00",
  },
];

export interface AgentConfig {
  id: string;
  company_id: string;
  agent_type: AgentType;
  enabled: boolean;
  schedule_time: string;
  params: Record<string, unknown>;
}

export interface AgentRun {
  id: string;
  agent_type: AgentType;
  status: "success" | "error";
  triggered_by: "cron" | "manual";
  actions_count: number;
  summary: string | null;
  ran_at: string;
}

/** Prochaine exécution estimée d'après l'heure planifiée. */
export function nextRunLabel(def: AgentDefinition, cfg: AgentConfig | undefined): string {
  if (!cfg?.enabled) return "—";
  const [h] = (cfg.schedule_time || def.defaultSchedule).split(":").map(Number);
  const now = new Date();
  const next = new Date(now);

  if (def.type === "urgent_alert") {
    const nextSlot = (Math.floor(now.getHours() / 6) + 1) * 6;
    next.setHours(nextSlot % 24, 0, 0, 0);
    if (nextSlot >= 24) next.setDate(next.getDate() + 1);
  } else if (def.type === "ca_hebdo") {
    const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
    next.setDate(now.getDate() + (now.getDay() === 1 && now.getHours() < h ? 0 : daysUntilMonday));
    next.setHours(h, 0, 0, 0);
  } else {
    next.setHours(h, 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
  }
  return next.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function useAgentConfigs() {
  const { user } = useAuth();
  const { companyId, isLoading } = useCompanyId();

  return useQuery({
    queryKey: ["ai-agent-configs", companyId],
    queryFn: async () => {
      const { data, error } = await db
        .from("ai_agent_configs")
        .select("*")
        .eq("company_id", companyId!);
      if (error) throw error;
      return (data ?? []) as AgentConfig[];
    },
    enabled: !!user && !isLoading && !!companyId,
    staleTime: 30_000,
  });
}

export function useAgentRuns() {
  const { user } = useAuth();
  const { companyId, isLoading } = useCompanyId();

  return useQuery({
    queryKey: ["ai-agent-runs", companyId],
    queryFn: async () => {
      const { data, error } = await db
        .from("ai_agent_runs")
        .select("id, agent_type, status, triggered_by, actions_count, summary, ran_at")
        .eq("company_id", companyId!)
        .order("ran_at", { ascending: false })
        .limit(120);
      if (error) throw error;
      return (data ?? []) as AgentRun[];
    },
    enabled: !!user && !isLoading && !!companyId,
    refetchInterval: 60_000,
  });
}

export function useToggleAgent() {
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ def, enabled }: { def: AgentDefinition; enabled: boolean }) => {
      if (!companyId) throw new Error("Entreprise introuvable");
      const { error } = await db.from("ai_agent_configs").upsert(
        {
          company_id: companyId,
          agent_type: def.type,
          enabled,
          schedule_time: def.defaultSchedule,
        },
        { onConflict: "company_id,agent_type" }
      );
      if (error) throw error;
      return { def, enabled };
    },
    onSuccess: ({ def, enabled }) => {
      queryClient.invalidateQueries({ queryKey: ["ai-agent-configs", companyId] });
      toast({
        title: enabled ? "Agent activé" : "Agent mis en pause",
        description: `${def.emoji} ${def.label} est maintenant ${enabled ? "actif" : "en pause"}.`,
      });
    },
    onError: (e: Error) =>
      toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });
}

export function useRunAgentNow() {
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (def: AgentDefinition) => {
      if (!companyId) throw new Error("Entreprise introuvable");
      const { data, error } = await supabase.functions.invoke("ai-agents", {
        body: { agent_type: def.type, company_id: companyId, trigger: "manual" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return { def, data };
    },
    onSuccess: ({ def, data }) => {
      queryClient.invalidateQueries({ queryKey: ["ai-agent-runs", companyId] });
      toast({
        title: `${def.emoji} ${def.label} exécuté`,
        description: data?.summary ?? "Exécution terminée.",
      });
    },
    onError: (e: Error) =>
      toast({ title: "Erreur d'exécution", description: e.message, variant: "destructive" }),
  });
}
