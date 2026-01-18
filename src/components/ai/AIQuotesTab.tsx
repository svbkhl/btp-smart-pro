/**
 * Onglet Devis dans la page IA
 * Affiche les boutons pour créer un nouveau devis
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Sparkles } from "lucide-react";
import { SimpleQuoteForm } from "./SimpleQuoteForm";
import { DetailedQuoteEditor } from "@/components/quotes/DetailedQuoteEditor";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GlassCard } from "@/components/ui/GlassCard";

type QuoteKind = "simple" | "detailed" | null;

export default function AIQuotesTab() {
  const { toast } = useToast();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [quoteKind, setQuoteKind] = useState<QuoteKind>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-xl font-semibold flex items-center gap-2 mb-2">
          <FileText className="h-5 w-5 text-primary" />
          Créer un devis
        </h3>
        <p className="text-sm text-muted-foreground">
          Générez rapidement des devis professionnels pour vos clients
        </p>
      </div>

      {/* Boutons de création */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bouton Devis Simple */}
        <GlassCard className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group" 
          onClick={() => {
            setQuoteKind("simple");
            setShowCreateForm(true);
          }}
        >
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <FileText className="h-12 w-12 text-primary" />
            </div>
            <div className="space-y-2">
              <h4 className="text-xl font-semibold">Devis simple</h4>
              <p className="text-sm text-muted-foreground">
                Créez rapidement un devis avec un montant global. Idéal pour les prestations simples et rapides.
              </p>
            </div>
            <Button 
              size="lg" 
              className="w-full mt-4 group-hover:scale-105 transition-transform"
              onClick={(e) => {
                e.stopPropagation();
                setQuoteKind("simple");
                setShowCreateForm(true);
              }}
            >
              <Plus className="h-5 w-5 mr-2" />
              Créer un devis simple
            </Button>
          </div>
        </GlassCard>

        {/* Bouton Devis Détaillé */}
        <GlassCard className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group"
          onClick={() => {
            setQuoteKind("detailed");
            setShowCreateForm(true);
          }}
        >
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <Sparkles className="h-12 w-12 text-primary" />
            </div>
            <div className="space-y-2">
              <h4 className="text-xl font-semibold">Devis détaillé</h4>
              <p className="text-sm text-muted-foreground">
                Créez un devis complet avec sections et lignes détaillées. Parfait pour les projets complexes.
              </p>
            </div>
            <Button 
              size="lg" 
              className="w-full mt-4 group-hover:scale-105 transition-transform"
              onClick={(e) => {
                e.stopPropagation();
                setQuoteKind("detailed");
                setShowCreateForm(true);
              }}
            >
              <Plus className="h-5 w-5 mr-2" />
              Créer un devis détaillé
            </Button>
          </div>
        </GlassCard>
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
  );
}



