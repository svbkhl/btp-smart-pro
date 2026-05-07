import { Button } from "@/components/ui/button";
import { Download, Send, Edit } from "lucide-react";
import { Quote } from "@/hooks/useQuotes";
import { useToast } from "@/components/ui/use-toast";
import { downloadQuotePDF } from "@/services/pdfService";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCompanyId } from "@/hooks/useCompanyId";
import { buildQuotePdfDownloadParams } from "@/utils/buildQuotePdfDownloadParams";

interface QuoteActionButtonsProps {
  quote: Quote;
  onEdit?: () => void;
  onSend?: () => void;
  onSendToClient?: () => void;
}

export const QuoteActionButtons = ({ quote, onEdit, onSend, onSendToClient }: QuoteActionButtonsProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { companyId } = useCompanyId();
  const { data: companyInfo } = useUserSettings();
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const params = await buildQuotePdfDownloadParams(quote, {
        user,
        companyId,
        companyInfo,
      });
      await downloadQuotePDF(params);
      toast({
        title: "PDF généré",
        description: "Le devis a été téléchargé en PDF.",
      });
    } catch (error: any) {
      console.error("❌ [QuoteActionButtons] Erreur génération PDF:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de générer le PDF",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  const isSigned = quote.signed || quote.status === "signed";

  return (
    <div className="flex flex-wrap gap-2">
      {/* Bouton Modifier - masqué si le devis est signé */}
      {onEdit && !isSigned && (
        <Button variant="outline" size="sm" onClick={onEdit} className="gap-2">
          <Edit className="w-4 h-4" />
          Modifier
        </Button>
      )}
      {quote.status === "draft" && (
        <>
          {onSend && (
            <Button variant="outline" size="sm" onClick={onSend} className="gap-2">
              <Send className="w-4 h-4" />
              Envoyer
            </Button>
          )}
        </>
      )}

      {/* Bouton Envoyer au client - masqué si le devis est signé */}
      {onSendToClient && !isSigned && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onSendToClient} 
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
  );
};

