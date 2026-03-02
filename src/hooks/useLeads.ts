import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// ─── Types ────────────────────────────────────────────────────

export type LeadStatus = "NEW" | "CONTACTED" | "QUALIFIED" | "LOST" | "SIGNED";
export type LeadPriority = "A" | "B" | "C";
export type SizeBucket = "0-3" | "4-10" | "10-50" | "50+";
export type JobStatus = "PENDING" | "RUNNING" | "DONE" | "FAILED";

export interface Lead {
  id: string;
  place_id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  phone_mobile: string | null;
  phone_fixed: string | null;
  website: string | null;
  maps_url: string | null;
  rating: number | null;
  reviews_count: number;
  size_bucket: SizeBucket | null;
  priority: LeadPriority | null;
  dept_code: string;
  status: LeadStatus;
  owner_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // joined
  owner_email?: string;
  owner_name?: string;
}

export interface LeadJob {
  id: string;
  dept_code: string;
  dept_name: string | null;
  status: JobStatus;
  total_found: number;
  total_inserted: number;
  total_skipped: number;
  total_cells: number;
  processed_cells: number;
  started_at: string | null;
  finished_at: string | null;
  error_log: string | null;
  created_at: string;
}

export interface CloserForAssign {
  id: string;
  email: string;
  name: string;
  total_assigned: number;
}

// ─── Départements ─────────────────────────────────────────────

export const DEPTS: { code: string; name: string }[] = [
  { code: "01", name: "Ain" }, { code: "02", name: "Aisne" },
  { code: "03", name: "Allier" }, { code: "04", name: "Alpes-de-Haute-Provence" },
  { code: "05", name: "Hautes-Alpes" }, { code: "06", name: "Alpes-Maritimes" },
  { code: "07", name: "Ardèche" }, { code: "08", name: "Ardennes" },
  { code: "09", name: "Ariège" }, { code: "10", name: "Aube" },
  { code: "11", name: "Aude" }, { code: "12", name: "Aveyron" },
  { code: "13", name: "Bouches-du-Rhône" }, { code: "14", name: "Calvados" },
  { code: "15", name: "Cantal" }, { code: "16", name: "Charente" },
  { code: "17", name: "Charente-Maritime" }, { code: "18", name: "Cher" },
  { code: "19", name: "Corrèze" }, { code: "2A", name: "Corse-du-Sud" },
  { code: "2B", name: "Haute-Corse" }, { code: "21", name: "Côte-d'Or" },
  { code: "22", name: "Côtes-d'Armor" }, { code: "23", name: "Creuse" },
  { code: "24", name: "Dordogne" }, { code: "25", name: "Doubs" },
  { code: "26", name: "Drôme" }, { code: "27", name: "Eure" },
  { code: "28", name: "Eure-et-Loir" }, { code: "29", name: "Finistère" },
  { code: "30", name: "Gard" }, { code: "31", name: "Haute-Garonne" },
  { code: "32", name: "Gers" }, { code: "33", name: "Gironde" },
  { code: "34", name: "Hérault" }, { code: "35", name: "Ille-et-Vilaine" },
  { code: "36", name: "Indre" }, { code: "37", name: "Indre-et-Loire" },
  { code: "38", name: "Isère" }, { code: "39", name: "Jura" },
  { code: "40", name: "Landes" }, { code: "41", name: "Loir-et-Cher" },
  { code: "42", name: "Loire" }, { code: "43", name: "Haute-Loire" },
  { code: "44", name: "Loire-Atlantique" }, { code: "45", name: "Loiret" },
  { code: "46", name: "Lot" }, { code: "47", name: "Lot-et-Garonne" },
  { code: "48", name: "Lozère" }, { code: "49", name: "Maine-et-Loire" },
  { code: "50", name: "Manche" }, { code: "51", name: "Marne" },
  { code: "52", name: "Haute-Marne" }, { code: "53", name: "Mayenne" },
  { code: "54", name: "Meurthe-et-Moselle" }, { code: "55", name: "Meuse" },
  { code: "56", name: "Morbihan" }, { code: "57", name: "Moselle" },
  { code: "58", name: "Nièvre" }, { code: "59", name: "Nord" },
  { code: "60", name: "Oise" }, { code: "61", name: "Orne" },
  { code: "62", name: "Pas-de-Calais" }, { code: "63", name: "Puy-de-Dôme" },
  { code: "64", name: "Pyrénées-Atlantiques" }, { code: "65", name: "Hautes-Pyrénées" },
  { code: "66", name: "Pyrénées-Orientales" }, { code: "67", name: "Bas-Rhin" },
  { code: "68", name: "Haut-Rhin" }, { code: "69", name: "Rhône" },
  { code: "70", name: "Haute-Saône" }, { code: "71", name: "Saône-et-Loire" },
  { code: "72", name: "Sarthe" }, { code: "73", name: "Savoie" },
  { code: "74", name: "Haute-Savoie" }, { code: "75", name: "Paris" },
  { code: "76", name: "Seine-Maritime" }, { code: "77", name: "Seine-et-Marne" },
  { code: "78", name: "Yvelines" }, { code: "79", name: "Deux-Sèvres" },
  { code: "80", name: "Somme" }, { code: "81", name: "Tarn" },
  { code: "82", name: "Tarn-et-Garonne" }, { code: "83", name: "Var" },
  { code: "84", name: "Vaucluse" }, { code: "85", name: "Vendée" },
  { code: "86", name: "Vienne" }, { code: "87", name: "Haute-Vienne" },
  { code: "88", name: "Vosges" }, { code: "89", name: "Yonne" },
  { code: "90", name: "Territoire de Belfort" }, { code: "91", name: "Essonne" },
  { code: "92", name: "Hauts-de-Seine" }, { code: "93", name: "Seine-Saint-Denis" },
  { code: "94", name: "Val-de-Marne" }, { code: "95", name: "Val-d'Oise" },
];

// ─── Hooks admin ──────────────────────────────────────────────

export const RETRY_NETWORK = {
  retry: (failureCount: number, error: unknown) => {
    if (failureCount >= 5) return false;
    const e = error as any;
    const msg = String(e?.message ?? e?.error ?? e?.cause ?? e ?? "");
    const name = String(e?.name ?? "");
    if (/network|socket|fetch|ECONNRESET|ETIMEDOUT|ERR_SOCKET|Failed to fetch|load resource|TypeError/i.test(msg + name)) return true;
    return false;
  },
  retryDelay: (n: number) => Math.min(1000 * 2 ** n, 8000),
};

export function useLeadJobs() {
  return useQuery<LeadJob[]>({
    queryKey: ["lead_jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_jobs" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data as unknown as LeadJob[]) || [];
    },
    refetchInterval: 5000,
    ...RETRY_NETWORK,
  });
}

export function useAdminLeads(filters: {
  dept?: string;
  status?: string;
  owner_id?: string;
  priority?: string;
  page?: number;
}) {
  const PAGE = 50;
  const from = ((filters.page || 0)) * PAGE;

  return useQuery<{ leads: Lead[]; count: number }>({
    queryKey: ["admin_leads", filters],
    queryFn: async () => {
      let q = (supabase.from("lead_jobs" as any) as any);
      // On utilise supabase direct sur leads table
      let query = supabase
        .from("leads" as any)
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, from + PAGE - 1);

      if (filters.dept)     query = query.eq("dept_code", filters.dept);
      if (filters.status)   query = query.eq("status", filters.status);
      if (filters.owner_id) query = query.eq("owner_id", filters.owner_id);
      if (filters.priority) query = query.eq("priority", filters.priority);

      const { data, error, count } = await query;
      if (error) throw error;
      return { leads: (data as unknown as Lead[]) || [], count: count || 0 };
    },
    placeholderData: (prev) => prev,
    ...RETRY_NETWORK,
  });
}

export function useLeadStats(deptCode: string) {
  return useQuery({
    queryKey: ["lead_stats", deptCode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads" as any)
        .select("status, owner_id", { count: "exact" })
        .eq("dept_code", deptCode);
      if (error) throw error;
      const rows = (data as any[]) || [];
      return {
        total: rows.length,
        available: rows.filter((r) => r.status === "NEW" && !r.owner_id).length,
        assigned: rows.filter((r) => r.owner_id).length,
      };
    },
    enabled: !!deptCode,
  });
}

export function useClosersForAssign() {
  return useQuery<CloserForAssign[]>({
    queryKey: ["closers_for_assign"],
    queryFn: async () => {
      const { data: emails, error } = await supabase
        .from("closer_emails" as any).select("email");
      if (error || !emails) return [];

      return (emails as any[]).map((ce: any) => ({
        id: ce.email,   // on utilise l'email comme identifiant pour l'assignation RPC
        email: ce.email,
        name: ce.name || ce.email.split("@")[0],
        total_assigned: 0,
      }));
    },
    ...RETRY_NETWORK,
  });
}

// ─── Mutations admin ──────────────────────────────────────────

export function useGenerateLeads() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (deptCode: string) => {
      const deptName = DEPTS.find((d) => d.code === deptCode)?.name || deptCode;

      // Créer le job via RPC (bypass RLS, autorise admin par email)
      const { data: jobId, error: rpcError } = await supabase.rpc("create_lead_job" as any, {
        p_dept_code: deptCode,
        p_dept_name: deptName,
      });
      if (rpcError) throw new Error(rpcError.message);
      if (!jobId) throw new Error("Impossible de créer le job");

      // Lancer le worker Edge Function
      const { data: fnData, error: fnError } = await supabase.functions.invoke("lead-generator", {
        body: { job_id: jobId },
      });

      if (fnError) {
        // Marquer le job FAILED si la fonction ne répond pas
        await supabase.from("lead_jobs" as any).update({
          status: "FAILED",
          error_log: fnError.message || "Erreur lors du lancement de la fonction",
          finished_at: new Date().toISOString(),
        }).eq("id", jobId);
        throw new Error(`Erreur Edge Function : ${fnError.message}`);
      }

      console.log("[lead-generator] Réponse fonction:", fnData);
      return { id: jobId, dept_code: deptCode, dept_name: deptName, status: "PENDING" };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lead_jobs"] }),
  });
}

export function useRetryJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (jobId: string) => {
      // Remettre en PENDING avant relance
      await supabase.from("lead_jobs" as any).update({
        status: "PENDING",
        error_log: null,
        finished_at: null,
      }).eq("id", jobId);

      const { data: fnData, error: fnError } = await supabase.functions.invoke("lead-generator", {
        body: { job_id: jobId },
      });

      if (fnError) {
        await supabase.from("lead_jobs" as any).update({
          status: "FAILED",
          error_log: fnError.message || "Erreur relance",
          finished_at: new Date().toISOString(),
        }).eq("id", jobId);
        throw new Error(`Erreur Edge Function : ${fnError.message}`);
      }

      console.log("[lead-generator] Relance:", fnData);
      return fnData;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lead_jobs"] }),
    onError: () => qc.invalidateQueries({ queryKey: ["lead_jobs"] }),
  });
}

export function useAssignLeads() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ deptCode, closerEmail }: { deptCode: string; closerEmail: string }) => {
      const { data, error } = await supabase.rpc("assign_leads_to_closer" as any, {
        p_dept_code: deptCode,
        p_closer_email: closerEmail,
      });
      if (error) throw new Error(error.message);
      return data as number;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_leads"] });
      qc.invalidateQueries({ queryKey: ["lead_stats"] });
    },
  });
}

// ─── Hooks closer ─────────────────────────────────────────────

export function useMyLeads(filters: {
  status?: string;
  priority?: string;
  dept?: string;
  page?: number;
}) {
  const { user } = useAuth();
  const PAGE = 50;
  const from = (filters.page || 0) * PAGE;

  return useQuery<{ leads: Lead[]; count: number }>({
    queryKey: ["my_leads", user?.id, filters],
    queryFn: async () => {
      let query = supabase
        .from("leads" as any)
        .select("*", { count: "exact" })
        .eq("owner_id", user!.id)
        .order("priority", { ascending: true })
        .order("created_at", { ascending: false })
        .range(from, from + PAGE - 1);

      if (filters.status)   query = query.eq("status", filters.status);
      if (filters.priority) query = query.eq("priority", filters.priority);
      if (filters.dept)     query = query.eq("dept_code", filters.dept);

      const { data, error, count } = await query;
      if (error) throw error;
      return { leads: (data as unknown as Lead[]) || [], count: count || 0 };
    },
    enabled: !!user?.id,
    placeholderData: (prev) => prev,
    ...RETRY_NETWORK,
  });
}

export function useMyLeadStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my_lead_stats", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads" as any)
        .select("status")
        .eq("owner_id", user!.id);
      if (error) throw error;
      const rows = (data as any[]) || [];
      return {
        total: rows.length,
        new: rows.filter((r) => r.status === "NEW").length,
        contacted: rows.filter((r) => r.status === "CONTACTED").length,
        qualified: rows.filter((r) => r.status === "QUALIFIED").length,
        signed: rows.filter((r) => r.status === "SIGNED").length,
        lost: rows.filter((r) => r.status === "LOST").length,
      };
    },
    enabled: !!user?.id,
    ...RETRY_NETWORK,
  });
}

export function useUpdateLeadStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: LeadStatus }) => {
      const { error } = await supabase
        .from("leads" as any)
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my_leads"] });
      qc.invalidateQueries({ queryKey: ["my_lead_stats"] });
    },
  });
}

export function useUpdateLeadNotes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase
        .from("leads" as any)
        .update({ notes })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my_leads"] }),
  });
}
