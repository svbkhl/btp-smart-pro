import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type UserRole = "admin" | "member";

export interface UserRoleData {
  id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface UserWithRole extends UserRoleData {
  email?: string;
  name?: string;
}

/**
 * Hook pour récupérer le rôle de l'utilisateur actuel
 */
export const useCurrentUserRole = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user_role", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (error) {
        // Erreur 406 Not Acceptable - table non exposée ou permissions manquantes
        if (error.code === "PGRST301" || error.message?.includes("Not Acceptable") || error.code === "406") {
          console.warn("⚠️ Table user_roles non accessible via API. Vérifiez les permissions RLS.");
          // Utiliser les métadonnées comme fallback
          const metadata = user.user_metadata || {};
          const statut = metadata.statut as string | undefined;
          const role = metadata.role as string | undefined;
          const finalRole = role || statut || 'member';
          return { 
            id: '', 
            user_id: user.id, 
            role: (finalRole === 'admin' || finalRole === 'administrateur' ? 'admin' : 'member') as UserRole, 
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        }
        
        // Si l'utilisateur n'a pas de rôle, vérifier les métadonnées
        if (error.code === "PGRST116") {
          // Vérifier les métadonnées de l'utilisateur
          const metadata = user.user_metadata || {};
          const statut = metadata.statut as string | undefined;
          const role = metadata.role as string | undefined;
          
          // Si l'utilisateur est admin dans les métadonnées, retourner admin
          if (statut === 'admin' || role === 'admin' || statut === 'administrateur' || role === 'administrateur') {
            return { 
              id: '', 
              user_id: user.id, 
              role: "admin" as UserRole, 
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
          }
          
          // Sinon, retourner 'member' par défaut
          return { 
            id: '', 
            user_id: user.id, 
            role: "member" as UserRole, 
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        }
        throw error;
      }

      return data as UserRoleData;
    },
    enabled: !!user,
  });
};

/**
 * Hook pour récupérer tous les utilisateurs avec leurs rôles (admin/dirigeant seulement)
 */
export const useAllUserRoles = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["all_user_roles", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("User not authenticated");

      // Vérifier que l'utilisateur est admin ou dirigeant
      const { data: currentUserRole, error: currentRoleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      // Gérer les erreurs
      if (currentRoleError) {
        // Erreur 406 Not Acceptable
        if (currentRoleError.code === "PGRST301" || currentRoleError.message?.includes("Not Acceptable") || currentRoleError.code === "406") {
          throw new Error("Table user_roles non accessible. Vérifiez les permissions RLS.");
        }
        // Erreur PGRST116 - pas de rôle
        if (currentRoleError.code === "PGRST116") {
          throw new Error("Vous n'avez pas de rôle assigné.");
        }
        throw currentRoleError;
      }

      const isAdmin = currentUserRole?.role === "admin";

      if (!isAdmin) {
        throw new Error("Unauthorized: Only administrators can view all roles");
      }

      // Récupérer tous les utilisateurs avec leurs rôles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("id, user_id, role, created_at")
        .order("created_at", { ascending: false });

      if (rolesError) {
        // Erreur 406 Not Acceptable
        if (rolesError.code === "PGRST301" || rolesError.message?.includes("Not Acceptable") || rolesError.code === "406") {
          throw new Error("Table user_roles non accessible. Vérifiez les permissions RLS.");
        }
        throw rolesError;
      }

      // Récupérer les emails des utilisateurs depuis auth.users
      const userIds = roles.map((r) => r.user_id);
      const { data: users, error: usersError } = await supabase.auth.admin.listUsers();

      if (usersError) {
        console.warn("Could not fetch user emails:", usersError);
      }

      // Combiner les données
      const usersWithRoles: UserWithRole[] = roles.map((role) => {
        const userData = users?.users.find((u) => u.id === role.user_id);
        return {
          ...role,
          email: userData?.email,
          name: userData?.user_metadata?.name || userData?.email?.split("@")[0] || "Utilisateur",
        };
      });

      return usersWithRoles;
    },
    enabled: !!user,
  });
};

/**
 * Hook pour mettre à jour le rôle d'un utilisateur
 */
export const useUpdateUserRole = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserRole }) => {
      if (!user) throw new Error("User not authenticated");

      // Vérifier que l'utilisateur est admin ou dirigeant
      const { data: currentUserRole, error: currentRoleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      // Gérer les erreurs
      if (currentRoleError && currentRoleError.code !== "PGRST116") {
        // Erreur 406 Not Acceptable
        if (currentRoleError.code === "PGRST301" || currentRoleError.message?.includes("Not Acceptable") || currentRoleError.code === "406") {
          throw new Error("Table user_roles non accessible. Vérifiez les permissions RLS.");
        }
        throw currentRoleError;
      }

      const isAdmin = currentUserRole?.role === "admin";

      if (!isAdmin) {
        throw new Error("Unauthorized: Only administrators can update roles");
      }

      // Note: L'upsert direct n'est pas autorisé par RLS
      // La mise à jour doit se faire via une fonction server-side ou le service_role
      // Pour l'instant, on simule la réponse
      console.warn("⚠️ Upsert direct non autorisé. Utilisez une fonction server-side.");
      throw new Error("La mise à jour des rôles doit se faire via une fonction server-side pour des raisons de sécurité.");

      return data as UserRoleData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all_user_roles"] });
      queryClient.invalidateQueries({ queryKey: ["user_role"] });
    },
  });
};

/**
 * Hook pour créer un rôle pour un utilisateur (lors de l'inscription)
 */
export const useCreateUserRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role = "member" }: { userId: string; role?: UserRole }) => {
      // Note: L'insertion directe n'est pas autorisée par RLS
      // La création doit se faire via une fonction server-side ou le service_role
      console.warn("⚠️ Insertion directe non autorisée. Utilisez une fonction server-side.");
      throw new Error("La création de rôles doit se faire via une fonction server-side pour des raisons de sécurité.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_role"] });
      queryClient.invalidateQueries({ queryKey: ["all_user_roles"] });
    },
  });
};

/**
 * Fonction utilitaire pour vérifier si un utilisateur a un rôle spécifique
 */
export const hasRole = (userRole: UserRole | null | undefined, requiredRole: UserRole): boolean => {
  if (!userRole) return false;

  const roleHierarchy: Record<UserRole, number> = {
    member: 1,
    admin: 2,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
};

/**
 * Fonction utilitaire pour vérifier si un utilisateur est admin
 */
export const isAdmin = (userRole: UserRole | null | undefined): boolean => {
  return userRole === "admin";
};

