/**
 * Hook pour gérer les demandes de contact
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { isAdminEmail } from '@/config/admin';

export interface ContactRequest {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  entreprise?: string;
  message?: string;
  request_type: 'essai_gratuit' | 'contact' | 'information';
  status: 'pending' | 'contacted' | 'invited' | 'rejected';
  trial_requested: boolean;
  admin_notes?: string;
  invited_by?: string;
  invitation_id?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Récupère toutes les demandes de contact (admin seulement)
 */
export const useContactRequests = () => {
  const { user, isAdmin } = useAuth();
  const isAdminByEmail = isAdminEmail(user?.email);
  const canView = !!user && (isAdmin || isAdminByEmail);

  return useQuery<ContactRequest[], Error>({
    queryKey: ['contact_requests'],
    queryFn: async () => {
      if (!canView) {
        throw new Error('Unauthorized');
      }

      // RPC SECURITY DEFINER contourne RLS (admin par email ou user_roles)
      const { data, error } = await supabase.rpc('get_contact_requests_admin');

      if (error) {
        throw error;
      }

      return (data || []) as ContactRequest[];
    },
    enabled: canView,
    refetchInterval: 30000, // Rafraîchir toutes les 30 secondes
  });
};

/**
 * Met à jour le statut d'une demande
 */
export const useUpdateContactRequest = () => {
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuth();
  const isAdminByEmail = isAdminEmail(user?.email);
  const canUpdate = !!user && (isAdmin || isAdminByEmail);

  return useMutation({
    mutationFn: async ({
      requestId,
      updates,
    }: {
      requestId: string;
      updates: Partial<ContactRequest>;
    }) => {
      if (!canUpdate) {
        throw new Error('Unauthorized');
      }

      // RPC SECURITY DEFINER contourne RLS
      const { data, error } = await supabase.rpc('update_contact_request_admin', {
        p_id: requestId,
        p_updates: {
          status: updates.status,
          admin_notes: updates.admin_notes,
          invited_by: updates.invited_by,
          invitation_id: updates.invitation_id,
        },
      });

      if (error) {
        throw error;
      }

      return data as ContactRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact_requests'] });
    },
  });
};

/**
 * Supprime définitivement des demandes de contact (admin seulement)
 */
export const useDeleteContactRequests = () => {
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuth();
  const isAdminByEmail = isAdminEmail(user?.email);
  const canDelete = !!user && (isAdmin || isAdminByEmail);

  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (!canDelete) {
        throw new Error('Unauthorized');
      }
      if (ids.length === 0) {
        throw new Error('Aucune demande sélectionnée');
      }

      const { data, error } = await supabase.rpc('delete_contact_requests_admin', {
        p_ids: ids,
      });

      if (error) {
        throw error;
      }

      return data as number;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact_requests'] });
    },
  });
};















