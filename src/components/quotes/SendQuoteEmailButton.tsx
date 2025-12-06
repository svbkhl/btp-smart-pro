/**
 * Composant bouton pour envoyer un email de devis
 * 
 * @example
 * ```tsx
 * <SendQuoteEmailButton
 *   quoteId="123"
 *   quoteNumber="DEV-2025-001"
 *   clientEmail="client@example.com"
 *   clientName="John Doe"
 *   onSuccess={() => console.log("Email envoyé!")}
 * />
 * ```
 */

import { Button } from "@/components/ui/button";
import { Mail, Loader2, AlertCircle } from "lucide-react";
import { useSendQuoteEmailWithCheck } from "@/hooks/useSendQuoteEmail";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { Link } from "react-router-dom";

interface SendQuoteEmailButtonProps {
  quoteId: string;
  quoteNumber: string;
  clientEmail: string;
  clientName: string;
  includePDF?: boolean;
  customMessage?: string;
  onSuccess?: () => void;
  variant?: "default" | "outline" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function SendQuoteEmailButton({
  quoteId,
  quoteNumber,
  clientEmail,
  clientName,
  includePDF = true,
  customMessage,
  onSuccess,
  variant = "default",
  size = "default",
  className,
}: SendQuoteEmailButtonProps) {
  const { toast } = useToast();
  const { isConfigured, sendEmail, isLoading, error } = useSendQuoteEmailWithCheck();

  const handleSend = () => {
    sendEmail.mutate(
      {
        quoteId,
        quoteNumber,
        clientEmail,
        clientName,
        includePDF,
        customMessage,
      },
      {
        onSuccess: () => {
          onSuccess?.();
        },
      }
    );
  };

  // Si la configuration n'est pas vérifiée ou en cours de chargement
  if (!isConfigured && !isLoading) {
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant={variant} size={size} className={className} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Vérification...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Envoyer par email
              </>
            )}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              Configuration email requise
            </AlertDialogTitle>
            <AlertDialogDescription>
              {error || "Vous devez configurer votre compte email avant d'envoyer des emails."}
              <br />
              <br />
              Allez dans les paramètres pour configurer Gmail, Outlook ou SMTP.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Link to="/settings">Aller aux paramètres</Link>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={variant} size={size} className={className} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Envoi en cours...
            </>
          ) : (
            <>
              <Mail className="mr-2 h-4 w-4" />
              Envoyer par email
            </>
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Envoyer le devis par email</AlertDialogTitle>
          <AlertDialogDescription>
            Le devis <strong>{quoteNumber}</strong> sera envoyé à <strong>{clientName}</strong> ({clientEmail})
            {includePDF && " avec le PDF en pièce jointe"}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={handleSend} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Envoi...
              </>
            ) : (
              "Envoyer"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}



