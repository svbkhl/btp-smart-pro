import { Button } from "@/components/ui/button";
import { Download, Send, Edit } from "lucide-react";
import { Quote } from "@/hooks/useQuotes";
import { useToast } from "@/components/ui/use-toast";
import { downloadQuotePDF } from "@/services/pdfService";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getCurrentCompanyId } from "@/utils/companyHelpers";

interface QuoteActionButtonsProps {
  quote: Quote;
  onEdit?: () => void;
  onSend?: () => void;
  onSendToClient?: () => void;
}

export const QuoteActionButtons = ({ quote, onEdit, onSend, onSendToClient }: QuoteActionButtonsProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: companyInfo } = useUserSettings();
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      // Déterminer le mode du devis
      const quoteMode = quote.mode || (quote.details?.format === "simplified" ? "simple" : "detailed");
      const tvaRate = quote.tva_rate ?? 0.20;
      const tva293b = quote.tva_non_applicable_293b || false;
      const effectiveTvaRate = tva293b ? 0 : tvaRate;

      // Si mode détaillé, récupérer les sections et lignes
      let pdfSections: any[] | undefined = undefined;
      let pdfLines: any[] | undefined = undefined;

      if (quoteMode === "detailed" && quote.id && user) {
        try {
          const companyId = await getCurrentCompanyId(user.id);
          if (companyId) {
            // Récupérer les sections
            const { data: sectionsData, error: sectionsError } = await supabase
              .from("quote_sections")
              .select("*")
              .eq("quote_id", quote.id)
              .eq("company_id", companyId)
              .order("position", { ascending: true });

            if (!sectionsError && sectionsData) {
              pdfSections = sectionsData.map(section => ({
                id: section.id,
                title: section.title,
                position: section.position,
              }));
              console.log("✅ [QuoteActionButtons] Sections récupérées:", pdfSections.length);
            }

            // Récupérer les lignes
            const { data: linesData, error: linesError } = await supabase
              .from("quote_lines")
              .select("*")
              .eq("quote_id", quote.id)
              .eq("company_id", companyId)
              .order("section_id", { ascending: true, nullsFirst: false })
              .order("position", { ascending: true });

            if (!linesError && linesData) {
              pdfLines = linesData.map(line => ({
                label: line.label,
                description: line.description,
                unit: line.unit || "",
                quantity: line.quantity || 0,
                unit_price_ht: line.unit_price_ht || 0,
                total_ht: line.total_ht || 0,
                tva_rate: effectiveTvaRate,
                total_tva: line.total_tva || 0,
                total_ttc: line.total_ttc || 0,
                section_id: line.section_id,
              }));
              console.log("✅ [QuoteActionButtons] Lignes récupérées:", pdfLines.length);
            }
          }
        } catch (error: any) {
          console.warn("⚠️ [QuoteActionButtons] Erreur récupération sections/lignes:", error);
        }
      }

      await downloadQuotePDF({
        result: quote.details || {},
        companyInfo: companyInfo || undefined,
        clientInfo: {
          name: quote.client_name,
          email: quote.client_email,
          phone: quote.client_phone,
          location: quote.client_address,
        },
        surface: "",
        workType: "",
        quoteDate: new Date(quote.created_at),
        quoteNumber: quote.quote_number,
        mode: quoteMode,
        tvaRate: effectiveTvaRate,
        tva293b: tva293b,
        sections: pdfSections,
        lines: pdfLines,
        subtotal_ht: quote.subtotal_ht,
        total_tva: quote.total_tva,
        total_ttc: quote.total_ttc || quote.estimated_cost,
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

  return (
    <div className="flex flex-wrap gap-2">
      {/* Bouton Modifier - toujours visible si onEdit est fourni */}
      {onEdit && (
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
    </div>
  );
};

