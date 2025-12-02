import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type UserRole = "dirigeant" | "salarie" | "administrateur";

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
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) {
        // Si l'utilisateur n'a pas de rôle, vérifier les métadonnées
        if (error.code === "PGRST116") {
          // Vérifier les métadonnées de l'utilisateur
          const metadata = user.user_metadata || {};
          const statut = metadata.statut as string | undefined;
          const role = metadata.role as string | undefined;
          
          // Si l'utilisateur est admin/dirigeant dans les métadonnées, créer le rôle
          if (statut === 'administrateur' || role === 'administrateur' || role === 'admin' || 
              statut === 'dirigeant' || role === 'dirigeant') {
            const roleToCreate = (statut === 'administrateur' || role === 'administrateur' || role === 'admin') 
              ? 'administrateur' as UserRole 
              : 'dirigeant' as UserRole;
            
            // Créer le rôle dans la table
            const { data: newRole, error: createError } = await supabase
              .from("user_roles")
              .insert({
                user_id: user.id,
                role: roleToCreate,
              })
              .select()
              .single();
            
            if (!createError && newRole) {
              return newRole as UserRoleData;
            }
          }
          
          // Sinon, retourner 'salarie' par défaut
          return { 
            id: '', 
            user_id: user.id, 
            role: "salarie" as UserRole, 
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
      const { data: currentUserRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      const isAdmin = currentUserRole?.role === "administrateur" || currentUserRole?.role === "dirigeant";

      if (!isAdmin) {
        throw new Error("Unauthorized: Only administrators and dirigeants can view all roles");
      }

      // Récupérer tous les utilisateurs avec leurs rôles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*")
        .order("created_at", { ascending: false });

      if (rolesError) throw rolesError;

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
      const { data: currentUserRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      const isAdmin = currentUserRole?.role === "administrateur" || currentUserRole?.role === "dirigeant";

      if (!isAdmin) {
        throw new Error("Unauthorized: Only administrators and dirigeants can update roles");
      }

      // Mettre à jour ou créer le rôle
      const { data, error } = await supabase
        .from("user_roles")
        .upsert(
          {
            user_id: userId,
            role: role,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id",
          }
        )
        .select()
        .single();

      if (error) throw error;

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
    mutationFn: async ({ userId, role = "salarie" }: { userId: string; role?: UserRole }) => {
      const { data, error } = await supabase
        .from("user_roles")
        .insert({
          user_id: userId,
          role: role,
        })
        .select()
        .single();

      if (error) {
        // Si le rôle existe déjà, le mettre à jour
        if (error.code === "23505") {
          const { data: updated, error: updateError } = await supabase
            .from("user_roles")
            .update({ role: role, updated_at: new Date().toISOString() })
            .eq("user_id", userId)
            .select()
            .single();

          if (updateError) throw updateError;
          return updated as UserRoleData;
        }
        throw error;
      }

      return data as UserRoleData;
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
    salarie: 1,
    dirigeant: 2,
    administrateur: 3,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
};

/**
 * Fonction utilitaire pour vérifier si un utilisateur est admin ou dirigeant
 */
export const isAdminOrDirigeant = (userRole: UserRole | null | undefined): boolean => {
  return userRole === "administrateur" || userRole === "dirigeant";
};

