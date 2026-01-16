/**
 * Liste des devis avec navigation vers la page de détail
 * Utilise QuotesTable et redirige vers /quotes/:id
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { QuotesTable } from "@/components/billing/QuotesTable";
import { Quote, useUpdateQuote } from "@/hooks/useQuotes";
import { useToast } from "@/components/ui/use-toast";
import { EditQuoteDialog } from "@/components/quotes/EditQuoteDialog";

interface QuotesListViewProps {
  quotes: Quote[];
  loading?: boolean;
}

export default function QuotesListView({ quotes, loading }: QuotesListViewProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const updateQuote = useUpdateQuote();
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const handleView = (quote: Quote) => {
    navigate(`/quotes/${quote.id}`);
  };

  const handleEdit = (quote: Quote) => {
    if (quote.signed) {
      toast({
        title: "🔒 Devis signé",
        description: "Ce devis est verrouillé et ne peut plus être modifié",
        variant: "destructive",
      });
      return;
    }
    
    // Ouvrir le dialog d'édition
    setEditingQuote(quote);
    setIsEditDialogOpen(true);
  };

  const handleSend = async (quote: Quote) => {
    if (quote.status === "sent") {
      toast({
        title: "✅ Déjà envoyé",
        description: "Ce devis a déjà été envoyé",
      });
      return;
    }

    try {
      await updateQuote.mutateAsync({
        id: quote.id,
        status: "sent",
        sent_at: new Date().toISOString(),
      });
      
      toast({
        title: "✅ Devis envoyé",
        description: `Le devis ${quote.quote_number} a été marqué comme envoyé`,
      });
    } catch (error: any) {
      console.error("Error sending quote:", error);
      toast({
        title: "❌ Erreur",
        description: error.message || "Impossible d'envoyer le devis",
        variant: "destructive",
      });
    }
  };

  const handleSign = (quote: Quote) => {
    if (quote.signed) {
      toast({
        title: "✅ Déjà signé",
        description: "Ce devis a déjà été signé",
      });
      return;
    }

    navigate(`/sign/${quote.id}`);
  };

  const handleDelete = async (quote: Quote) => {
    if (quote.signed) {
      toast({
        title: "🔒 Devis signé",
        description: "Ce devis est verrouillé et ne peut pas être supprimé",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "ℹ️ Suppression",
      description: "La suppression sera disponible prochainement",
    });
  };

  return (
    <>
      <QuotesTable
        quotes={quotes}
        onView={handleView}
        onEdit={handleEdit}
        onSend={handleSend}
        onSign={handleSign}
        onDelete={handleDelete}
        loading={loading}
      />
      
      {/* Dialog d'édition */}
      {editingQuote && (
        <EditQuoteDialog
          open={isEditDialogOpen}
          onOpenChange={(open) => {
            setIsEditDialogOpen(open);
            if (!open) {
              setEditingQuote(null);
            }
          }}
          quote={editingQuote}
        />
      )}
    </>
  );
}



