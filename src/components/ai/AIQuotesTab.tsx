/**
 * Onglet Devis dans la page IA
 * Affiche le formulaire de création + la liste des devis générés
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, FileText } from "lucide-react";
import { SimpleQuoteForm } from "./SimpleQuoteForm";
import QuotesListView from "@/components/quotes/QuotesListView";
import { useAIQuotes } from "@/hooks/useAIQuotes";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function AIQuotesTab() {
  const [showCreateForm, setShowCreateForm] = useState(false);
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

        <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
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
                Remplissez les informations et l'IA générera un devis professionnel
              </DialogDescription>
            </DialogHeader>
            <SimpleQuoteForm onSuccess={() => setShowCreateForm(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Liste des devis */}
      <QuotesListView quotes={quotes} loading={isLoading} />
    </div>
  );
}


