import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuotes } from "@/hooks/useQuotes";
import { Quote } from "@/hooks/useQuotes";
import { FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/ui/GlassCard";

interface SelectQuoteForInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectQuote: (quoteId: string) => void;
}

export const SelectQuoteForInvoiceDialog = ({
  open,
  onOpenChange,
  onSelectQuote,
}: SelectQuoteForInvoiceDialogProps) => {
  const { data: quotes = [], isLoading: quotesLoading } = useQuotes();
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredQuotes = quotes.filter((quote) =>
    quote.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    quote.quote_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedQuote = quotes.find((q) => q.id === selectedQuoteId);

  const handleConfirm = () => {
    if (selectedQuoteId) {
      onSelectQuote(selectedQuoteId);
      onOpenChange(false);
      setSelectedQuoteId("");
      setSearchQuery("");
    }
  };

  const getQuoteStatusColor = (status: string) => {
    switch (status) {
      case "accepted":
        return "default";
      case "sent":
        return "secondary";
      case "draft":
        return "outline";
      case "rejected":
        return "destructive";
      default:
        return "default";
    }
  };

  const getQuoteStatusLabel = (status: string) => {
    switch (status) {
      case "accepted":
        return "Accepté";
      case "sent":
        return "Envoyé";
      case "draft":
        return "Brouillon";
      case "rejected":
        return "Refusé";
      default:
        return status;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] rounded-xl">
        <DialogHeader>
          <DialogTitle>Générer une facture depuis un devis</DialogTitle>
          <DialogDescription>
            Sélectionnez un devis pour créer une facture automatiquement
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Recherche */}
          <div className="relative">
            <Input
              placeholder="Rechercher un devis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Liste des devis */}
          {quotesLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground mt-2">Chargement des devis...</p>
            </div>
          ) : filteredQuotes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun devis trouvé.</p>
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {filteredQuotes.map((quote) => (
                <GlassCard
                  key={quote.id}
                  className={`p-4 cursor-pointer transition-all ${
                    selectedQuoteId === quote.id
                      ? "ring-2 ring-primary bg-primary/5"
                      : "hover:bg-white/60 dark:hover:bg-gray-800/60"
                  }`}
                  onClick={() => setSelectedQuoteId(quote.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-primary" />
                        <h3 className="font-semibold">{quote.quote_number}</h3>
                        <Badge variant={getQuoteStatusColor(quote.status) as any}>
                          {getQuoteStatusLabel(quote.status)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Client: {quote.client_name}
                      </p>
                      <p className="text-sm font-medium">
                        {quote.estimated_cost?.toLocaleString("fr-FR", {
                          style: "currency",
                          currency: "EUR",
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(quote.created_at), "d MMM yyyy", { locale: fr })}
                      </p>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}

          {/* Aperçu du devis sélectionné */}
          {selectedQuote && (
            <GlassCard className="p-4 bg-primary/5 dark:bg-primary/10 border-primary/20">
              <h4 className="font-semibold mb-2">Devis sélectionné :</h4>
              <div className="space-y-1 text-sm">
                <p>
                  <strong>Numéro :</strong> {selectedQuote.quote_number}
                </p>
                <p>
                  <strong>Client :</strong> {selectedQuote.client_name}
                </p>
                <p>
                  <strong>Montant :</strong>{" "}
                  {selectedQuote.estimated_cost?.toLocaleString("fr-FR", {
                    style: "currency",
                    currency: "EUR",
                  })}
                </p>
              </div>
            </GlassCard>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedQuoteId}>
            Continuer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


