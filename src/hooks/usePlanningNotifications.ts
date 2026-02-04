import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { addDays, format, parseISO, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";

/**
 * Hook pour récupérer les affectations du lendemain
 * Utilisé pour afficher des notifications de rappel
 */

interface TomorrowAssignment {
  id: string;
  project_id?: string;
  title?: string;
  date: string;
  heures: number;
  heure_debut?: string;
  heure_fin?: string;
  project?: {
    name: string;
    location?: string;
  };
}

export const useTomorrowAssignments = () => {
  const { user, currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ["tomorrow-assignments", user?.id, currentCompanyId],
    queryFn: async () => {
      if (!user) {
        return [];
      }

      // Récupérer l'employé associé à l'utilisateur
      const { data: employee, error: employeeError } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (employeeError || !employee) {
        // Pas d'employé trouvé : l'utilisateur est probablement admin/owner (pas un employé)
        // Retourner un tableau vide sans warning (comportement normal)
        return [];
      }

      // Date de demain
      const tomorrow = addDays(new Date(), 1);
      const tomorrowStr = format(tomorrow, "yyyy-MM-dd");

      // Récupérer les affectations de demain
      const { data: assignments, error } = await supabase
        .from("employee_assignments")
        .select(`
          *,
          projects:project_id (
            id,
            name,
            location
          )
        `)
        .eq("employee_id", employee.id)
        .eq("date", tomorrowStr)
        .order("heure_debut", { ascending: true });

      if (error) {
        console.error("❌ [useTomorrowAssignments] Erreur récupération:", error);
        throw error;
      }

      return (assignments || []) as TomorrowAssignment[];
    },
    enabled: !!user,
    // Rafraîchir toutes les 30 minutes
    refetchInterval: 30 * 60 * 1000,
    // Garder en cache 1 heure
    staleTime: 60 * 60 * 1000,
  });
};

/**
 * Hook pour récupérer toutes les affectations à venir (cette semaine)
 */
export const useUpcomingAssignments = () => {
  const { user, currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ["upcoming-assignments", user?.id, currentCompanyId],
    queryFn: async () => {
      if (!user) {
        return [];
      }

      const { data: employee, error: employeeError } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (employeeError || !employee) {
        return [];
      }

      // Date de début (aujourd'hui) et fin (dans 7 jours)
      const today = new Date();
      const todayStr = format(today, "yyyy-MM-dd");
      const weekFromNow = addDays(today, 7);
      const weekFromNowStr = format(weekFromNow, "yyyy-MM-dd");

      const { data: assignments, error } = await supabase
        .from("employee_assignments")
        .select(`
          *,
          projects:project_id (
            id,
            name,
            location
          )
        `)
        .eq("employee_id", employee.id)
        .gte("date", todayStr)
        .lte("date", weekFromNowStr)
        .order("date", { ascending: true })
        .order("heure_debut", { ascending: true });

      if (error) {
        console.error("❌ [useUpcomingAssignments] Erreur récupération:", error);
        throw error;
      }

      return (assignments || []) as TomorrowAssignment[];
    },
    enabled: !!user,
    refetchInterval: 30 * 60 * 1000,
    staleTime: 60 * 60 * 1000,
  });
};

/**
 * Formater une affectation pour notification
 */
export const formatAssignmentNotification = (assignment: TomorrowAssignment): string => {
  const projectName = assignment.project?.name || assignment.title || "Affectation";
  const location = assignment.project?.location || "Lieu non spécifié";
  const horaires = assignment.heure_debut && assignment.heure_fin
    ? `de ${assignment.heure_debut} à ${assignment.heure_fin}`
    : `${assignment.heures}h`;

  return `📍 ${projectName}\n🏗️ ${location}\n⏰ ${horaires}`;
};
