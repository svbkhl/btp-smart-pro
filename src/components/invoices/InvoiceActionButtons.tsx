import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Send, Edit, Mail, CheckCircle, Euro } from "lucide-react";
import { Invoice, useUpdateInvoiceStatus } from "@/hooks/useInvoices";
import { useToast } from "@/components/ui/use-toast";
import { downloadInvoicePDF } from "@/services/invoicePdfService";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useState } from "react";
import { SendToClientModal } from "@/components/billing/SendToClientModal";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface InvoiceActionButtonsProps {
  invoice: Invoice;
  onEdit?: () => void;
  onSend?: () => void;
  onSendToClient?: () => void;
  onDelete?: () => void;
}

const useInvoiceEmailStatus = (invoiceId: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["email_status_invoice", invoiceId, user?.id],
    queryFn: async () => {
      if (!user) return null;
      // Chercher dans la table messages (messageService) en priorité
      const { data: msgData } = await supabase
        .from("messages")
        .select("status, sent_at, opened_at")
        .eq("document_id", invoiceId)
        .eq("document_type", "invoice")
        .eq("user_id", user.id)
        .order("sent_at", { ascending: false })
        .limit(1);
      if (msgData?.[0]) return msgData[0];
      // Fallback: email_messages
      const { data } = await supabase
        .from("email_messages")
        .select("status, sent_at")
        .eq("invoice_id", invoiceId)
        .eq("user_id", user.id)
        .order("sent_at", { ascending: false })
        .limit(1);
      return data?.[0] || null;
    },
    enabled: !!user && !!invoiceId,
    staleTime: 30000,
  });
};

export const InvoiceActionButtons = ({ invoice, onEdit, onSend, onSendToClient, onDelete }: InvoiceActionButtonsProps) => {
  const { toast } = useToast();
  const { data: companyInfo } = useUserSettings();
  const [downloading, setDownloading] = useState(false);
  const [isSendToClientOpen, setIsSendToClientOpen] = useState(false);
  const { data: emailStatus } = useInvoiceEmailStatus(invoice.id);
  const updateStatus = useUpdateInvoiceStatus();
  const [markingPaid, setMarkingPaid] = useState(false);

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      await downloadInvoicePDF({
        invoice,
        companyInfo: companyInfo || undefined,
      });
      toast({
        title: "PDF généré",
        description: "La facture a été téléchargée en PDF.",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de générer le PDF",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleTogglePaid = async () => {
    const newStatus = invoice.status === "paid" ? "sent" : "paid";
    setMarkingPaid(true);
    try {
      await updateStatus.mutateAsync({ id: invoice.id, status: newStatus });
      toast({
        title: newStatus === "paid" ? "✅ Facture marquée comme payée" : "Facture marquée comme impayée",
        description: `La facture ${invoice.invoice_number} a été mise à jour.`,
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour le statut",
        variant: "destructive",
      });
    } finally {
      setMarkingPaid(false);
    }
  };

  const isSigned = invoice.status === "signed";
  const isPaid = invoice.status === "paid";

  const getEmailBadge = () => {
    const status = (emailStatus as any);
    if (status?.opened_at || status?.status === "opened") return (
      <Badge variant="outline" className="gap-1 text-xs text-green-600 border-green-300 bg-green-50 dark:bg-green-950/30">
        <CheckCircle className="w-3 h-3" />
        Ouvert
      </Badge>
    );
    if (status?.status === "sent" || status?.status === "delivered") return (
      <Badge variant="outline" className="gap-1 text-xs text-blue-600 border-blue-300 bg-blue-50 dark:bg-blue-950/30">
        <CheckCircle className="w-3 h-3" />
        Envoyé
      </Badge>
    );
    if (status?.status === "failed") return (
      <Badge variant="outline" className="gap-1 text-xs text-red-600 border-red-300 bg-red-50 dark:bg-red-950/30">
        <Mail className="w-3 h-3" />
        Échec envoi
      </Badge>
    );
    // Fallback : utiliser le statut de la facture elle-même
    if (invoice.status === "sent" || invoice.status === "signed" || invoice.status === "paid") return (
      <Badge variant="outline" className="gap-1 text-xs text-blue-600 border-blue-300 bg-blue-50 dark:bg-blue-950/30">
        <CheckCircle className="w-3 h-3" />
        Envoyé
      </Badge>
    );
    return (
      <Badge variant="outline" className="gap-1 text-xs text-muted-foreground border-muted">
        <Mail className="w-3 h-3" />
        Non envoyé
      </Badge>
    );
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {getEmailBadge()}

        {invoice.status === "draft" && (
          <>
            {onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit} className="gap-2">
                <Edit className="w-4 h-4" />
                Modifier
              </Button>
            )}
            {onSend && (
              <Button variant="outline" size="sm" onClick={onSend} className="gap-2">
                <Send className="w-4 h-4" />
                Envoyer
              </Button>
            )}
          </>
        )}

        {!isSigned && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsSendToClientOpen(true);
              onSendToClient?.();
            }}
            className="gap-2"
          >
            <Send className="w-4 h-4" />
            Envoyer au client
          </Button>
        )}

        {/* Marquer payé / impayé */}
        <Button
          variant={isPaid ? "outline" : "default"}
          size="sm"
          onClick={handleTogglePaid}
          disabled={markingPaid}
          className={`gap-2 ${isPaid ? "text-green-600 border-green-400 bg-green-50 hover:bg-green-100 dark:bg-green-950/30" : ""}`}
        >
          <Euro className="w-4 h-4" />
          {isPaid ? "Marquer impayé" : "Marquer payé"}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadPDF}
          disabled={downloading}
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          PDF
        </Button>
      </div>

      <SendToClientModal
        open={isSendToClientOpen}
        onOpenChange={setIsSendToClientOpen}
        documentType="invoice"
        document={invoice}
        onSent={() => setIsSendToClientOpen(false)}
      />
    </>
  );
};
