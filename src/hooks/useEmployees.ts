import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { queryWithTimeout } from "@/utils/queryWithTimeout";
import { FAKE_EMPLOYEES } from "@/fakeData/employees";
import { useFakeDataStore } from "@/store/useFakeDataStore";

export interface Employee {
  id: string;
  user_id: string;
  nom: string;
  prenom?: string;
  poste: string;
  specialites?: string[];
  created_at?: string;
  updated_at?: string;
  // Données utilisateur associées
  user?: {
    email?: string;
    email_confirmed_at?: string;
  };
}

export interface CreateEmployeeData {
  email: string;
  password: string;
  nom: string;
  prenom?: string;
  poste: string;
  specialites?: string[];
}

export interface UpdateEmployeeData {
  id: string;
  nom?: string;
  prenom?: string;
  poste?: string;
  specialites?: string[];
}

// Récupérer tous les employés
export const useEmployees = () => {
  const { fakeDataEnabled } = useFakeDataStore();

  return useQuery({
    queryKey: ["employees", fakeDataEnabled],
    queryFn: async () => {
      // Si fake data est activé, retourner directement les fake data
      if (fakeDataEnabled) {
        console.log("🎭 Mode démo activé - Retour des fake employees");
        return FAKE_EMPLOYEES;
      }

      // Sinon, faire la vraie requête
      return queryWithTimeout(
        async () => {
          // Récupérer tous les employés
          const { data: employeesData, error: employeesError } = await supabase
            .from("employees" as any)
            .select(`
              *,
              user:user_id (
                email,
                email_confirmed_at
              )
            `)
            .order("nom", { ascending: true });

          if (employeesError) throw employeesError;

          // Récupérer tous les admins (utilisateurs avec rôle administrateur)
          const { data: adminRoles } = await supabase
            .from("user_roles")
            .select("user_id")
            .eq("role", "administrateur");

          const adminUserIds = new Set(
            (adminRoles || []).map((r: any) => r.user_id)
          );

          // Récupérer les emails des admins pour filtrage supplémentaire
          const adminEmails = new Set<string>([
            'sabri.khalfallah6@gmail.com' // Email admin explicite
          ]);

          // Récupérer les utilisateurs qui ne sont membres d'aucune entreprise (admins globaux)
          const { data: companyUsers } = await supabase
            .from("company_users")
            .select("user_id");

          const usersWithCompany = new Set(
            (companyUsers || []).map((cu: any) => cu.user_id)
          );

          // Filtrer pour exclure les admins (par user_id, email ET membre d'entreprise)
          const filteredEmployees = (employeesData || []).filter((emp: Employee) => {
            // Exclure si admin par rôle
            if (adminUserIds.has(emp.user_id)) {
              return false;
            }
            // Exclure si email admin
            const empEmail = emp.user?.email?.toLowerCase() || '';
            if (empEmail && adminEmails.has(empEmail)) {
              return false;
            }
            // Exclure si l'utilisateur n'est membre d'aucune entreprise (admin global)
            if (!usersWithCompany.has(emp.user_id)) {
              return false;
            }
            return true;
          });

          return filteredEmployees as Employee[];
        },
        [],
        "useEmployees"
      );
    },
    enabled: true, // Toujours activé, même sans user en mode démo
    retry: 1,
    staleTime: 30000,
    // Ne pas bloquer l'UI en cas d'erreur
    throwOnError: false,
    gcTime: 300000,
    refetchInterval: 60000, // Polling automatique toutes les 60s
  });
};

// Créer un employé (créer compte auth + enregistrement employé)
export const useCreateEmployee = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (employeeData: CreateEmployeeData) => {
      // Récupérer la session pour l'authentification
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Vous devez être connecté pour créer un employé");
      }

      // Appeler l'Edge Function
      const { data, error } = await supabase.functions.invoke("manage-employees", {
        body: {
          action: "create",
          data: employeeData,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw new Error(error.message || "Erreur lors de la création de l'employé");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data?.employee as Employee;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast({
        title: "Employé créé avec succès",
        description: "Le compte a été créé et l'employé peut maintenant se connecter.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur lors de la création",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// Mettre à jour un employé
export const useUpdateEmployee = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: UpdateEmployeeData) => {
      const { id, ...updateData } = data;
      const { data: updated, error } = await supabase
        .from("employees" as any)
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return updated as Employee;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast({
        title: "Employé mis à jour",
        description: "Les informations ont été modifiées avec succès.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// Supprimer un employé
export const useDeleteEmployee = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (employeeId: string) => {
      // Récupérer la session pour l'authentification
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Vous devez être connecté pour supprimer un employé");
      }

      // Appeler l'Edge Function
      const { data, error } = await supabase.functions.invoke("manage-employees", {
        body: {
          action: "delete",
          data: { employeeId },
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw new Error(error.message || "Erreur lors de la suppression de l'employé");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return employeeId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employees-rh"] });
      queryClient.invalidateQueries({ queryKey: ["employee-rh"] });
      toast({
        title: "Employé supprimé",
        description: "L'employé et son compte ont été supprimés.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// Désactiver/Activer un compte (via Supabase Auth)
export const useToggleEmployeeAccount = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, disabled }: { userId: string; disabled: boolean }) => {
      // Récupérer la session pour l'authentification
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Vous devez être connecté pour modifier un compte");
      }

      // Appeler l'Edge Function
      const { data, error } = await supabase.functions.invoke("manage-employees", {
        body: {
          action: "toggle",
          data: { userId, disabled },
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw new Error(error.message || "Erreur lors de la modification du compte");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return { userId, disabled };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast({
        title: data.disabled ? "Compte désactivé" : "Compte activé",
        description: `Le compte a été ${data.disabled ? "désactivé" : "activé"}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

