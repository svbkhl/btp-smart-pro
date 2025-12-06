/**
 * Hook React avec TanStack Query pour envoyer des emails de devis
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { sendQuoteEmailFromUser, checkUserEmailConfigured } from "@/services/sendQuoteEmailService";
import type { SendQuoteEmailParams, SendEmailResponse } from "@/types/email";
import { useQuery } from "@tanstack/react-query";

/**
 * Hook pour vérifier si l'utilisateur a configuré son compte email
 */
export function useUserEmailConfigured() {
  return useQuery({
    queryKey: ["user-email-configured"],
    queryFn: checkUserEmailConfigured,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook pour envoyer un email de devis depuis le compte de l'utilisateur
 * 
 * @example
 * ```tsx
 * const sendEmail = useSendQuoteEmail();
 * 
 * const handleSend = () => {
 *   sendEmail.mutate({
 *     quoteId: "123",
 *     quoteNumber: "DEV-2025-001",
 *     clientEmail: "client@example.com",
 *     clientName: "John Doe",
 *     includePDF: true,
 *     customMessage: "Message personnalisé"
 *   });
 * };
 * ```
 */
export function useSendQuoteEmail() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation<SendEmailResponse, Error, SendQuoteEmailParams>({
    mutationFn: sendQuoteEmailFromUser,
    
    onMutate: async (variables) => {
      console.log("🔄 [useSendQuoteEmail] Mutation démarrée:", variables);
      
      // Afficher un toast de chargement
      toast({
        title: "Envoi en cours...",
        description: `Envoi du devis ${variables.quoteNumber} à ${variables.clientName}`,
      });
    },

    onSuccess: (data, variables) => {
      console.log("✅ [useSendQuoteEmail] Email envoyé avec succès:", data);

      // Invalider les queries liées pour rafraîchir les données
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["email-messages"] });
      queryClient.invalidateQueries({ queryKey: ["user-email-configured"] });

      // Afficher un toast de succès
      toast({
        title: "Email envoyé !",
        description: `Le devis ${variables.quoteNumber} a été envoyé à ${variables.clientName} avec succès.`,
      });
    },

    onError: (error, variables) => {
      console.error("❌ [useSendQuoteEmail] Erreur:", error);

      // Déterminer le message d'erreur
      let errorMessage = "Erreur lors de l'envoi de l'email";
      
      if (error.message.includes("Configuration email non trouvée")) {
        errorMessage = "Veuillez configurer votre compte email dans les paramètres avant d'envoyer des emails.";
      } else if (error.message.includes("OAuth")) {
        errorMessage = "Votre compte OAuth n'est pas configuré. Veuillez reconnecter votre compte.";
      } else if (error.message.includes("SMTP")) {
        errorMessage = "Erreur de configuration SMTP. Vérifiez vos identifiants dans les paramètres.";
      } else {
        errorMessage = error.message || "Erreur lors de l'envoi de l'email";
      }

      // Afficher un toast d'erreur
      toast({
        title: "Erreur d'envoi",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook combiné pour vérifier la configuration et envoyer un email
 * 
 * @example
 * ```tsx
 * const { isConfigured, sendEmail, isLoading } = useSendQuoteEmailWithCheck();
 * 
 * if (!isConfigured) {
 *   return <div>Veuillez configurer votre compte email</div>;
 * }
 * 
 * return (
 *   <button onClick={() => sendEmail.mutate({...})}>
 *     Envoyer le devis
 *   </button>
 * );
 * ```
 */
export function useSendQuoteEmailWithCheck() {
  const { data: emailConfig, isLoading: checkingConfig } = useUserEmailConfigured();
  const sendEmail = useSendQuoteEmail();

  return {
    isConfigured: emailConfig?.configured ?? false,
    provider: emailConfig?.provider,
    sendEmail,
    isLoading: checkingConfig || sendEmail.isPending,
    error: emailConfig?.error,
  };
}



