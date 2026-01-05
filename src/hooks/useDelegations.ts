/**
 * Hook: useDelegations
 * Description: Gestion des délégations temporaires de permissions
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Delegation {
  id: string;
  company_id: string;
  from_user_id: string;
  to_user_id: string;
  permission_key: string;
  starts_at: string;
  ends_at: string;
  revoked_at: string | null;
  reason: string | null;
  created_at: string;
  updated_at: string;
  from_user_email?: string;
  to_user_email?: string;
  status?: "active" | "expired" | "revoked" | "pending";
}

export interface CreateDelegationData {
  to_user_id: string;
  permission_key: string;
  starts_at: string;
  ends_at: string;
  reason?: string;
}

export interface DelegationWithDetails extends Delegation {
  from_user_email: string;
  to_user_email: string;
  status: "active" | "expired" | "revoked" | "pending";
}

/**
 * Hook pour récupérer toutes les délégations de l'entreprise
 */
export const useDelegations = () => {
  const { user, currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ["delegations", currentCompanyId],
    queryFn: async () => {
      if (!currentCompanyId) return [];

      const { data, error } = await supabase
        .from("active_delegations")
        .select("*")
        .eq("company_id", currentCompanyId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ [useDelegations] Error:", error);
        throw error;
      }

      return (data as DelegationWithDetails[]) || [];
    },
    enabled: !!currentCompanyId,
    staleTime: 30000, // 30 secondes
  });
};

/**
 * Hook pour récupérer les délégations actives d'un utilisateur
 */
export const useUserDelegations = (userId?: string) => {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ["user-delegations", userId, currentCompanyId],
    queryFn: async () => {
      if (!userId || !currentCompanyId) return [];

      const { data, error } = await supabase
        .from("active_delegations")
        .select("*")
        .eq("to_user_id", userId)
        .eq("company_id", currentCompanyId)
        .eq("status", "active")
        .order("ends_at", { ascending: true });

      if (error) {
        console.error("❌ [useUserDelegations] Error:", error);
        throw error;
      }

      return (data as DelegationWithDetails[]) || [];
    },
    enabled: !!userId && !!currentCompanyId,
    staleTime: 30000,
  });
};

/**
 * Hook pour créer une délégation
 */
export const useCreateDelegation = () => {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateDelegationData) => {
      if (!user || !currentCompanyId) {
        throw new Error("Vous devez être connecté");
      }

      // Vérifier que l'utilisateur peut déléguer cette permission
      const { data: canDelegate, error: checkError } = await supabase.rpc(
        "can_delegate_permission",
        {
          delegator_user_id: user.id,
          company_uuid: currentCompanyId,
          permission_to_delegate: data.permission_key,
        }
      );

      if (checkError || !canDelegate) {
        throw new Error(
          "Vous n'avez pas le droit de déléguer cette permission"
        );
      }

      // Créer la délégation
      const { data: delegation, error } = await supabase
        .from("delegations")
        .insert([
          {
            company_id: currentCompanyId,
            from_user_id: user.id,
            to_user_id: data.to_user_id,
            permission_key: data.permission_key,
            starts_at: data.starts_at,
            ends_at: data.ends_at,
            reason: data.reason || null,
          },
        ])
        .select("*")
        .single();

      if (error) {
        console.error("❌ [useCreateDelegation] Error:", error);
        throw error;
      }

      // Logger dans audit_logs
      try {
        await supabase.from("audit_logs").insert([
          {
            company_id: currentCompanyId,
            user_id: user.id,
            action: "delegation.created",
            resource_type: "delegation",
            resource_id: delegation.id,
            details: {
              to_user_id: data.to_user_id,
              permission_key: data.permission_key,
              ends_at: data.ends_at,
            },
          },
        ]);
      } catch (auditError) {
        console.warn("⚠️ [useCreateDelegation] Audit log failed:", auditError);
      }

      return delegation as Delegation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delegations"] });
      queryClient.invalidateQueries({ queryKey: ["user-permissions"] });
    },
  });
};

/**
 * Hook pour révoquer une délégation
 */
export const useRevokeDelegation = () => {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (delegationId: string) => {
      if (!user || !currentCompanyId) {
        throw new Error("Vous devez être connecté");
      }

      const { data, error } = await supabase.rpc("revoke_delegation", {
        delegation_id: delegationId,
        revoker_user_id: user.id,
      });

      if (error) {
        console.error("❌ [useRevokeDelegation] Error:", error);
        throw error;
      }

      // Logger dans audit_logs
      try {
        await supabase.from("audit_logs").insert([
          {
            company_id: currentCompanyId,
            user_id: user.id,
            action: "delegation.revoked",
            resource_type: "delegation",
            resource_id: delegationId,
          },
        ]);
      } catch (auditError) {
        console.warn("⚠️ [useRevokeDelegation] Audit log failed:", auditError);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delegations"] });
      queryClient.invalidateQueries({ queryKey: ["user-permissions"] });
    },
  });
};
