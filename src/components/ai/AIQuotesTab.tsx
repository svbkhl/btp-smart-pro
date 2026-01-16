/**
 * Onglet Devis dans la page IA
 * Affiche le formulaire de création + la liste des devis générés
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, FileText } from "lucide-react";
import { SimpleQuoteForm } from "./SimpleQuoteForm";
import { DetailedQuoteEditor } from "@/components/quotes/DetailedQuoteEditor";
import QuotesListView from "@/components/quotes/QuotesListView";
import { useAIQuotes } from "@/hooks/useAIQuotes";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { QuoteTypeSelectorModal } from "@/components/quotes/QuoteTypeSelectorModal";

type QuoteKind = "simple" | "detailed" | null;

export default function AIQuotesTab() {
  const { toast } = useToast();
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [quoteKind, setQuoteKind] = useState<QuoteKind>(null); // État pour le choix initial
  const [isPreviewOpen, setIsPreviewOpen] = useState(false); // État pour savoir si l'aperçu est ouvert
  const { data: quotes = [], isLoading } = useAIQuotes();

  // Gérer la sélection du type de devis
  const handleQuoteTypeSelect = (type: "simple" | "detailed") => {
    setQuoteKind(type);
    setShowTypeSelector(false);
    setShowCreateForm(true);
  };

  return (
    <div className="space-y-6">
      {/* Header avec bouton créer */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Mes devis IA
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {quotes.length} devis généré{quotes.length > 1 ? 's' : ''}
          </p>
        </div>

        {/* Modal de sélection du type de devis */}
        <QuoteTypeSelectorModal
          open={showTypeSelector}
          onOpenChange={setShowTypeSelector}
          onSelect={handleQuoteTypeSelect}
        />

        <Button 
          className="gap-2"
          onClick={() => {
            // Ouvrir le modal de sélection au lieu du dialog directement
            setShowTypeSelector(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Nouveau devis
        </Button>

        <Dialog 
          open={showCreateForm} 
          onOpenChange={(open) => {
            // PROTECTION : Ne pas fermer le dialog si l'aperçu est ouvert
            // L'utilisateur doit d'abord fermer l'aperçu avant de fermer le dialog
            if (!open && isPreviewOpen) {
              console.log('[AIQuotesTab] Tentative de fermeture du dialog alors que l\'aperçu est ouvert - bloquée');
              // Ne pas fermer le dialog si l'aperçu est ouvert
              return;
            }
            // Ne fermer le dialog QUE si l'utilisateur le ferme explicitement
            // ET que l'aperçu n'est pas ouvert
            setShowCreateForm(open);
            // Réinitialiser le choix si on ferme le dialog
            if (!open) {
              setQuoteKind(null);
            }
          }}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {quoteKind === "simple"
                  ? "Créer un devis simple"
                  : "Créer un devis détaillé"}
              </DialogTitle>
              <DialogDescription>
                {quoteKind === "simple"
                  ? "Devis simple avec prix global"
                  : "Devis détaillé avec sections et lignes"}
              </DialogDescription>
            </DialogHeader>

            {quoteKind === "simple" ? (
              // Flow simple : SimpleQuoteForm (inchangé)
              <SimpleQuoteForm
                key="simple-quote-form"
                onSuccess={() => {
                  // Ne pas fermer automatiquement
                }}
                onPreviewStateChange={(isOpen) => {
                  setIsPreviewOpen(isOpen);
                }}
              />
            ) : (
              // Flow détaillé : DetailedQuoteEditor (éditeur direct, sans wizard)
              <DetailedQuoteEditor
                onSuccess={(quoteId) => {
                  console.log("✅ Devis détaillé créé:", quoteId);
                  toast({
                    title: "Devis créé",
                    description: "Le devis détaillé a été créé avec succès",
                  });
                  // Ne pas fermer automatiquement, l'utilisateur peut continuer à éditer
                }}
                onCancel={() => {
                  setQuoteKind(null);
                  setShowCreateForm(false);
                }}
                onClose={() => {
                  setQuoteKind(null);
                  setShowCreateForm(false);
                  setIsPreviewOpen(false);
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Liste des devis */}
      <QuotesListView quotes={quotes} loading={isLoading} />
    </div>
  );
}



