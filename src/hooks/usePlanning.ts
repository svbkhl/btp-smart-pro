import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { queryWithTimeout } from "@/utils/queryWithTimeout";
import { useFakeDataStore } from "@/store/useFakeDataStore";
import { FAKE_ASSIGNMENTS } from "@/fakeData/planning";

export interface Assignment {
  id: string;
  employee_id: string;
  project_id: string;
  date: string;
  status: string;
  notes?: string;
  created_at: string;
}

export interface EmployeeData {
  id: string;
  user_id: string;
  nom: string;
  prenom: string;
  poste: string;
  specialites: string[];
}

// Fake data pour fallback
const FAKE_EMPLOYEE: EmployeeData = {
  id: "fake-employee-1",
  user_id: "fake-user-1",
  nom: "Dupont",
  prenom: "Jean",
  poste: "Chef de chantier",
  specialites: ["Maçonnerie", "Plomberie"],
};

/**
 * Hook pour récupérer les données de planning d'un employé
 */
export const usePlanningData = (weekStart: Date, weekEnd: Date) => {
  const { user } = useAuth();
  const { fakeDataEnabled } = useFakeDataStore();

  return useQuery({
    queryKey: ["planning", user?.id, weekStart.toISOString(), weekEnd.toISOString()],
    queryFn: async () => {
      return queryWithTimeout(
        async () => {
          if (!user && !fakeDataEnabled) throw new Error("User not authenticated");

          if (fakeDataEnabled) {
            // Filtrer les assignments par semaine
            const filteredAssignments = FAKE_ASSIGNMENTS.filter(a => {
              const assignmentDate = new Date(a.date);
              return assignmentDate >= weekStart && assignmentDate <= weekEnd;
            });
            return {
              employee: FAKE_EMPLOYEE,
              assignments: filteredAssignments,
            };
          }

          // Récupérer les informations de l'employé
          const { data: employee, error: employeeError } = await supabase
            .from("employees" as any)
            .select("*")
            .eq("user_id", user.id)
            .single();

          if (employeeError) {
            throw employeeError;
          }

          if (!employee) {
            // Pas d'employé pour cet utilisateur
            return {
              employee: null,
              assignments: [],
            };
          }

          // Récupérer les affectations de la semaine
          const { data: assignments, error: assignmentsError } = await supabase
            .from("employee_assignments" as any)
            .select(`
              *,
              project:projects (
                name,
                location
              )
            `)
            .eq("employee_id", employee.id)
            .gte("date", weekStart.toISOString())
            .lte("date", weekEnd.toISOString())
            .order("date", { ascending: true });

          if (assignmentsError) {
            throw assignmentsError;
          }

          return {
            employee: employee as EmployeeData,
            assignments: (assignments || []) as Assignment[],
          };
        },
        {
          employee: FAKE_EMPLOYEE,
          assignments: FAKE_ASSIGNMENTS,
        },
        "usePlanningData"
      );
    },
    enabled: !!user || fakeDataEnabled,
    retry: 1,
    staleTime: 30000, // 30 secondes
    gcTime: 300000, // 5 minutes
  });
};
