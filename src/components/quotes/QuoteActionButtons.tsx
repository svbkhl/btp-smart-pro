import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Send, Edit, Mail, CheckCircle, Euro } from "lucide-react";
import { Quote, useUpdateQuote } from "@/hooks/useQuotes";
import { useToast } from "@/components/ui/use-toast";
import { downloadQuotePDF } from "@/services/pdfService";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCompanyId } from "@/hooks/useCompanyId";
import { buildQuotePdfDownloadParams } from "@/utils/buildQuotePdfDownloadParams";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface QuoteActionButtonsProps {
  quote: Quote;
  onEdit?: () => void;
  onSend?: () => void;
  onSendToClient?: () => void;
  compact?: boolean; // mode carte : seulement "Marquer payé"
}

const useQuoteEmailStatus = (quoteId: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["email_status_quote", quoteId, user?.id],
    queryFn: async () => {
      if (!user) return null;
      // Chercher dans la table messages (messageService) en priorité
      const { data: msgData } = await supabase
        .from("messages")
        .select("status, sent_at, opened_at")
        .eq("document_id", quoteId)
        .eq("document_type", "quote")
        .eq("user_id", user.id)
        .order("sent_at", { ascending: false })
        .limit(1);
      if (msgData?.[0]) return msgData[0];
      // Fallback: email_messages
      const { data } = await supabase
        .from("email_messages")
        .select("status, sent_at")
        .eq("quote_id", quoteId)
        .eq("user_id", user.id)
        .order("sent_at", { ascending: false })
        .limit(1);
      return data?.[0] || null;
    },
    enabled: !!user && !!quoteId,
    staleTime: 30000,
  });
};

export const QuoteActionButtons = ({ quote, onEdit, onSend, onSendToClient, compact = false }: QuoteActionButtonsProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { companyId } = useCompanyId();
  const { data: companyInfo } = useUserSettings();
  const [downloading, setDownloading] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);
  const { data: emailStatus } = useQuoteEmailStatus(quote.id);
  const updateQuote = useUpdateQuote();

  const isPaid = quote.payment_status === "paid" || quote.status === "paid";

  const handleTogglePaid = async () => {
    setMarkingPaid(true);
    try {
      if (isPaid) {
        await updateQuote.mutateAsync({ id: quote.id, payment_status: "pending", status: "sent" });
        toast({ title: "Devis marqué impayé", description: `${quote.quote_number} mis à jour.` });
      } else {
        await updateQuote.mutateAsync({ id: quote.id, payment_status: "paid", status: "paid", paid_at: new Date().toISOString() });
        toast({ title: "✅ Devis marqué comme payé", description: `${quote.quote_number} mis à jour.` });
      }
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message || "Impossible de mettre à jour", variant: "destructive" });
    } finally {
      setMarkingPaid(false);
    }
  };

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
    // Fallback : utiliser sent_at du devis lui-même
    if (quote.sent_at || quote.status === "sent" || quote.status === "signed" || quote.status === "paid") return (
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

  // Mode compact (carte) : uniquement le bouton Marquer payé
  if (compact) {
    return (
      <Button
        variant={isPaid ? "outline" : "default"}
        size="sm"
        onClick={handleTogglePaid}
        disabled={markingPaid}
        className={`gap-1.5 flex-1 ${isPaid ? "text-green-600 border-green-400 bg-green-50 hover:bg-green-100 dark:bg-green-950/30" : ""}`}
      >
        <Euro className="w-3.5 h-3.5" />
        {isPaid ? "Payé ✓" : "Marquer payé"}
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {getEmailBadge()}

      {onEdit && (
        <Button variant="outline" size="sm" onClick={onEdit} className="gap-2">
          <Edit className="w-4 h-4" />
          Modifier
        </Button>
      )}
      {quote.status === "draft" && onSend && (
        <Button variant="outline" size="sm" onClick={onSend} className="gap-2">
          <Send className="w-4 h-4" />
          Envoyer
        </Button>
      )}

      {onSendToClient && !isSigned && (
        <Button variant="outline" size="sm" onClick={onSendToClient} className="gap-2">
          <Send className="w-4 h-4" />
          Envoyer au client
        </Button>
      )}

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

      <Button variant="outline" size="sm" onClick={handleDownloadPDF} disabled={downloading} className="gap-2">
        <Download className="w-4 h-4" />
        PDF
      </Button>
    </div>
  );
};
