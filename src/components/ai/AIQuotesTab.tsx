/**
 * Onglet Devis dans la page IA
 * Affiche le formulaire de création + la liste des devis générés
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Sparkles, Receipt } from "lucide-react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type QuoteKind = "simple" | "detailed" | null;

export default function AIQuotesTab() {
  const { toast } = useToast();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [quoteKind, setQuoteKind] = useState<QuoteKind>(null); // État pour le choix initial
  const [isPreviewOpen, setIsPreviewOpen] = useState(false); // État pour savoir si l'aperçu est ouvert
  const { data: quotes = [], isLoading } = useAIQuotes();

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
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nouveau devis IA
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Générer un devis avec l'IA</DialogTitle>
              <DialogDescription>
                {quoteKind === null
                  ? "Choisissez le type de devis à générer"
                  : quoteKind === "simple"
                  ? "Génération d'un devis simple"
                  : "Génération d'un devis détaillé avec sections et lignes"}
              </DialogDescription>
            </DialogHeader>

            {/* Écran de choix initial (Step 0) */}
            {quoteKind === null ? (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Option : Devis simple */}
                  <Card
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => setQuoteKind("simple")}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Receipt className="h-5 w-5 text-primary" />
                        Devis simple
                      </CardTitle>
                      <CardDescription>
                        Format court avec prix global
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Idéal pour des prestations simples avec un prix global.
                        Exemple : "Rénovation salle de bains – 4 500 € HT"
                      </p>
                      <Button className="w-full mt-4" variant="outline">
                        Choisir
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Option : Devis détaillé */}
                  <Card
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => setQuoteKind("detailed")}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        Devis détaillé
                      </CardTitle>
                      <CardDescription>
                        Sections et lignes avec quantités et prix unitaires
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Parfait pour des devis professionnels avec plusieurs prestations,
                        sections par corps de métier, quantités, unités et calculs détaillés.
                      </p>
                      <Button className="w-full mt-4" variant="outline">
                        Choisir
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Bouton retour */}
                <div className="flex justify-end pt-4">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowCreateForm(false);
                      setQuoteKind(null);
                    }}
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            ) : quoteKind === "simple" ? (
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
              <div className="space-y-4">
                {/* Bouton retour au choix */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setQuoteKind(null);
                  }}
                  className="mb-2"
                >
                  ← Changer de type de devis
                </Button>
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
                  }}
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Liste des devis */}
      <QuotesListView quotes={quotes} loading={isLoading} />
    </div>
  );
}



