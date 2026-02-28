import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export interface CloserEmail {
  email: string;
  added_by: string | null;
  created_at: string;
}

/** Liste tous les closers depuis la DB */
export const useClosers = () =>
  useQuery({
    queryKey: ["closer_emails"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("closer_emails" as any)
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as CloserEmail[];
    },
    staleTime: 5 * 60 * 1000,
  });

/** Ajoute un closer */
export const useAddCloser = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ email, addedBy }: { email: string; addedBy?: string }) => {
      const { error } = await supabase
        .from("closer_emails" as any)
        .insert({ email: email.toLowerCase().trim(), added_by: addedBy || "admin" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["closer_emails"] });
      toast({ title: "Closer ajouté", description: "L'accès closer a été accordé." });
    },
    onError: (err: any) => {
      toast({
        title: "Erreur",
        description: err.message || "Impossible d'ajouter le closer",
        variant: "destructive",
      });
    },
  });
};

/** Supprime un closer */
export const useRemoveCloser = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase
        .from("closer_emails" as any)
        .delete()
        .eq("email", email.toLowerCase().trim());
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["closer_emails"] });
      toast({ title: "Closer retiré", description: "L'accès closer a été révoqué." });
    },
    onError: (err: any) => {
      toast({
        title: "Erreur",
        description: err.message || "Impossible de retirer le closer",
        variant: "destructive",
      });
    },
  });
};

/** Vérifie si un email est closer (DB + liste hardcodée) */
export const useIsCloserByEmail = (email: string | null | undefined) =>
  useQuery({
    queryKey: ["is_closer", email?.toLowerCase()],
    queryFn: async () => {
      if (!email) return false;
      const { data } = await supabase
        .from("closer_emails" as any)
        .select("email")
        .eq("email", email.toLowerCase().trim())
        .maybeSingle();
      return !!data;
    },
    enabled: !!email,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
