/**
 * Hooks React pour gérer les signatures avec TanStack Query
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import {
  createSignature,
  getSignatureByQuoteId,
  getSignatureByLink,
  signDocument,
  setPaymentLink,
  type Signature,
  type CreateSignatureParams,
} from "@/services/signatureService";

/**
 * Hook pour récupérer une signature par quote_id
 */
export function useSignatureByQuoteId(quoteId: string | undefined) {
  return useQuery<Signature | null, Error>({
    queryKey: ["signature", "quote", quoteId],
    queryFn: () => (quoteId ? getSignatureByQuoteId(quoteId) : Promise.resolve(null)),
    enabled: !!quoteId,
    staleTime: 30 * 1000, // 30 secondes
  });
}

/**
 * Hook pour récupérer une signature par son lien (ID)
 */
export function useSignatureByLink(signatureId: string | undefined) {
  return useQuery<Signature | null, Error>({
    queryKey: ["signature", "link", signatureId],
    queryFn: () => (signatureId ? getSignatureByLink(signatureId) : Promise.resolve(null)),
    enabled: !!signatureId,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook pour créer une signature
 */
export function useCreateSignature() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation<Signature, Error, CreateSignatureParams>({
    mutationFn: createSignature,
    onSuccess: (data) => {
      console.log("✅ [useCreateSignature] Signature créée:", data.id);
      
      // Invalider les queries liées
      if (data.quote_id) {
        queryClient.invalidateQueries({ queryKey: ["signature", "quote", data.quote_id] });
      }
      if (data.invoice_id) {
        queryClient.invalidateQueries({ queryKey: ["signature", "invoice", data.invoice_id] });
      }

      toast({
        title: "Lien de signature créé",
        description: "Le lien de signature a été généré avec succès.",
      });
    },
    onError: (error) => {
      console.error("❌ [useCreateSignature] Erreur:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer le lien de signature",
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook pour signer un document
 */
export function useSignDocument() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation<Signature, Error, { signatureId: string; signatureData?: string }>({
    mutationFn: ({ signatureId, signatureData }) => signDocument(signatureId, signatureData),
    onSuccess: (data) => {
      console.log("✅ [useSignDocument] Document signé:", data.id);
      
      // Invalider les queries liées
      if (data.quote_id) {
        queryClient.invalidateQueries({ queryKey: ["signature", "quote", data.quote_id] });
        queryClient.invalidateQueries({ queryKey: ["quotes"] });
      }
      if (data.invoice_id) {
        queryClient.invalidateQueries({ queryKey: ["signature", "invoice", data.invoice_id] });
        queryClient.invalidateQueries({ queryKey: ["invoices"] });
      }
      queryClient.invalidateQueries({ queryKey: ["signature", "link", data.id] });

      toast({
        title: "Document signé !",
        description: "Le document a été signé avec succès.",
      });
    },
    onError: (error) => {
      console.error("❌ [useSignDocument] Erreur:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de signer le document",
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook pour enregistrer un lien de paiement
 */
export function useSetPaymentLink() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation<void, Error, { signatureId: string; paymentLink: string }>({
    mutationFn: ({ signatureId, paymentLink }) => setPaymentLink(signatureId, paymentLink),
    onSuccess: (_, variables) => {
      console.log("✅ [useSetPaymentLink] Lien de paiement enregistré");
      
      // Invalider les queries liées
      queryClient.invalidateQueries({ queryKey: ["signature", "link", variables.signatureId] });

      toast({
        title: "Lien de paiement enregistré",
        description: "Le lien de paiement a été enregistré avec succès.",
      });
    },
    onError: (error) => {
      console.error("❌ [useSetPaymentLink] Erreur:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'enregistrer le lien de paiement",
        variant: "destructive",
      });
    },
  });
}











