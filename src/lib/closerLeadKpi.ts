/**
 * 4 indicateurs KPI affichés partout (closer + admin) pour les leads.
 * (Les RPC peuvent encore renvoyer d’autres clés ; on les mappe côté hooks.)
 */
export const CLOSER_LEAD_KPI_FOUR = [
  { key: "total" as const, label: "Total", labelAdmin: "Assignés" },
  { key: "new" as const, label: "Nouveaux", labelAdmin: "Nouveaux" },
  { key: "to_callback" as const, label: "À rappeler", labelAdmin: "À rappeler" },
  { key: "signed" as const, label: "Signés", labelAdmin: "Signés" },
] as const;

export type CloserLeadKpiFourKey = (typeof CLOSER_LEAD_KPI_FOUR)[number]["key"];

/** Normalise la réponse JSON de get_my_lead_stats / get_closer_activity (clés legacy). */
export function normalizeCloserLeadStatsRecord(o: Record<string, unknown>) {
  return {
    total: Number(o.total ?? 0),
    new: Number(o.new ?? 0),
    // Anciennes RPC utilisaient « contacted » pour l’équivalent « À rappeler » (TO_CALLBACK)
    to_callback: Number(o.to_callback ?? o.contacted ?? 0),
    no_answer: Number(o.no_answer ?? 0),
    not_interested: Number(o.not_interested ?? 0),
    qualified: Number(o.qualified ?? 0),
    signed: Number(o.signed ?? 0),
    lost: Number(o.lost ?? 0),
  };
}
