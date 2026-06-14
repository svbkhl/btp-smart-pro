import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Send, Edit, Mail, CheckCircle, Euro } from "lucide-react";
import { Quote, useMarkQuoteAsSent } from "@/hooks/useQuotes";
import { useToast } from "@/components/ui/use-toast";
import { downloadQuotePDF } from "@/services/pdfService";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCompanyId } from "@/hooks/useCompanyId";
import { buildQuotePdfDownloadParams } from "@/utils/buildQuotePdfDownloadParams";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();
  const markAsSent = useMarkQuoteAsSent();

  const isPaid = quote.payment_status === "paid" || quote.status === "paid";

  const handleTogglePaid = async () => {
    setMarkingPaid(true);
    try {
      if (isPaid) {
        const { error } = await supabase.rpc("update_quote_payment_status", {
          p_quote_id: quote.id,
          p_payment_status: "pending",
          p_status: "sent",
          p_paid_at: null,
        });
        if (error) throw error;
        toast({ title: "Devis marqué impayé", description: `${quote.quote_number} mis à jour.` });
      } else {
        const { error } = await supabase.rpc("update_quote_payment_status", {
          p_quote_id: quote.id,
          p_payment_status: "paid",
          p_status: "paid",
          p_paid_at: new Date().toISOString(),
        });
        if (error) throw error;
        toast({ title: "✅ Devis marqué comme payé", description: `${quote.quote_number} mis à jour.` });
      }
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["quote", quote.id] });
      queryClient.refetchQueries({ queryKey: ["quotes"] });
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

      {quote.status === "draft" && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => markAsSent.mutate(quote.id)}
          disabled={markAsSent.isPending}
          className="gap-2 text-blue-600 border-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-700 dark:hover:bg-blue-950/30"
        >
          <CheckCircle className="w-4 h-4" />
          {markAsSent.isPending ? "..." : "Marquer envoyé"}
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
