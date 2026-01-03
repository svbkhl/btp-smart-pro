/**
 * Hook pour gérer les demandes de contact
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

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

  return useQuery<ContactRequest[], Error>({
    queryKey: ['contact_requests'],
    queryFn: async () => {
      if (!user || !isAdmin) {
        throw new Error('Unauthorized');
      }

      const { data, error } = await supabase
        .from('contact_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return (data || []) as ContactRequest[];
    },
    enabled: !!user && !!isAdmin,
    refetchInterval: 30000, // Rafraîchir toutes les 30 secondes
  });
};

/**
 * Met à jour le statut d'une demande
 */
export const useUpdateContactRequest = () => {
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuth();

  return useMutation({
    mutationFn: async ({
      requestId,
      updates,
    }: {
      requestId: string;
      updates: Partial<ContactRequest>;
    }) => {
      if (!user || !isAdmin) {
        throw new Error('Unauthorized');
      }

      const { data, error } = await supabase
        .from('contact_requests')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .select()
        .single();

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















