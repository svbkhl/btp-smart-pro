import { Button } from "@/components/ui/button";
import { Download, Send, Edit, Trash2 } from "lucide-react";
import { Quote, useDeleteQuote } from "@/hooks/useQuotes";
import { useToast } from "@/components/ui/use-toast";
import { downloadQuotePDF } from "@/services/pdfService";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useState } from "react";

interface QuoteActionButtonsProps {
  quote: Quote;
  onEdit?: () => void;
  onSend?: () => void;
  onSendToClient?: () => void;
}

export const QuoteActionButtons = ({ quote, onEdit, onSend, onSendToClient }: QuoteActionButtonsProps) => {
  const { toast } = useToast();
  const deleteQuote = useDeleteQuote();
  const { data: companyInfo } = useUserSettings();
  const [downloading, setDownloading] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce devis ?")) {
      return;
    }

    try {
      await deleteQuote.mutateAsync(quote.id);
    } catch (error) {
      console.error("Error deleting quote:", error);
    }
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      await downloadQuotePDF({
        result: quote.details || {},
        companyInfo: companyInfo || undefined,
        clientInfo: {
          name: quote.client_name,
        },
        surface: "",
        workType: "",
        quoteDate: new Date(quote.created_at),
        quoteNumber: quote.quote_number,
        // Ajouter automatiquement la signature depuis les paramètres
        signatureData: companyInfo?.signatureUrl,
        signedBy: companyInfo?.companyName || companyInfo?.contactName,
        signedAt: new Date().toISOString(),
      });
      toast({
        title: "PDF généré",
        description: "Le devis a été téléchargé en PDF.",
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

  return (
    <div className="flex flex-wrap gap-2">
      {quote.status === "draft" && (
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

      {/* Bouton Envoyer au client - toujours visible */}
      {onSendToClient && (
        <Button variant="outline" size="sm" onClick={onSendToClient} className="gap-2">
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

      {quote.status === "draft" && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleDelete}
          className="gap-2 text-destructive hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
          Supprimer
        </Button>
      )}
    </div>
  );
};

