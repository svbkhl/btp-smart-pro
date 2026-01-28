import { Button } from "@/components/ui/button";
import { Download, Send, Edit } from "lucide-react";
import { Invoice } from "@/hooks/useInvoices";
import { useToast } from "@/components/ui/use-toast";
import { downloadInvoicePDF } from "@/services/invoicePdfService";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useState } from "react";
import { SendToClientModal } from "@/components/billing/SendToClientModal";

interface InvoiceActionButtonsProps {
  invoice: Invoice;
  onEdit?: () => void;
  onSend?: () => void;
  onSendToClient?: () => void;
  onDelete?: () => void; // Callback après suppression réussie
}

export const InvoiceActionButtons = ({ invoice, onEdit, onSend, onSendToClient, onDelete }: InvoiceActionButtonsProps) => {
  const { toast } = useToast();
  const { data: companyInfo } = useUserSettings();
  const [downloading, setDownloading] = useState(false);
  const [isSendToClientOpen, setIsSendToClientOpen] = useState(false);


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

  const isSigned = invoice.status === "signed";

  return (
    <>
      <div className="flex flex-wrap gap-2">
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

        {/* Bouton Envoyer au client - masqué si la facture est signée */}
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

      {/* Modal Envoyer au client */}
      <SendToClientModal
        open={isSendToClientOpen}
        onOpenChange={setIsSendToClientOpen}
        documentType="invoice"
        document={invoice}
        onSent={() => {
          setIsSendToClientOpen(false);
        }}
      />
    </>
  );
};
