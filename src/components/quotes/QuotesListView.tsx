/**
 * Liste des devis avec navigation vers la page de détail
 * Utilise QuotesTable et redirige vers /quotes/:id
 */

import { useNavigate } from "react-router-dom";
import { QuotesTable } from "@/components/billing/QuotesTable";
import { Quote } from "@/hooks/useQuotes";
import { useToast } from "@/components/ui/use-toast";

interface QuotesListViewProps {
  quotes: Quote[];
  loading?: boolean;
}

export default function QuotesListView({ quotes, loading }: QuotesListViewProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

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
    
    toast({
      title: "ℹ️ Modification",
      description: "La modification des devis sera disponible prochainement",
    });
  };

  const handleSend = (quote: Quote) => {
    toast({
      title: "📧 Envoi",
      description: "L'envoi de devis sera disponible prochainement",
    });
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
    <QuotesTable
      quotes={quotes}
      onView={handleView}
      onEdit={handleEdit}
      onSend={handleSend}
      onSign={handleSign}
      onDelete={handleDelete}
      loading={loading}
    />
  );
}



