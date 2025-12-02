import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileSignature, Loader2 } from "lucide-react";
import { Invoice } from "@/hooks/useInvoices";

interface SendForSignatureButtonProps {
  invoice: Invoice;
}

export const SendForSignatureButton = ({ invoice }: SendForSignatureButtonProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSendForSignature = async () => {
    if (!invoice.client_email) {
      toast({
        title: "Email manquant",
        description: "L'email du client est requis pour envoyer la facture en signature",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Vous devez être connecté");
      }

      // Appeler l'Edge Function pour créer la session de signature
      const { data, error } = await supabase.functions.invoke("create-signature-session", {
        body: {
          invoice_id: invoice.id,
          signer_email: invoice.client_email,
          signer_name: invoice.client_name || "Client",
        },
      });

      if (error) throw error;

      if (!data?.signature_url) {
        throw new Error("Impossible de créer la session de signature");
      }

      // Mettre à jour le statut de la facture
      await supabase
        .from("invoices")
        .update({ status: "sent", signature_url: data.signature_url })
        .eq("id", invoice.id);

      toast({
        title: "Facture envoyée",
        description: `Un email a été envoyé à ${invoice.client_email} pour signature`,
      });
    } catch (error: any) {
      console.error("Error sending for signature:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer la facture en signature",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (invoice.status !== "draft" && invoice.status !== "sent") {
    return null;
  }

  return (
    <Button
      onClick={handleSendForSignature}
      disabled={loading}
      variant="outline"
      className="gap-2"
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Envoi...
        </>
      ) : (
        <>
          <FileSignature className="w-4 h-4" />
          Envoyer pour signature
        </>
      )}
    </Button>
  );
};






