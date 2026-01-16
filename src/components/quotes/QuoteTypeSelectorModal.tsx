/**
 * Modal de sélection du type de devis
 * Affiche 2 cartes : Devis simple et Devis détaillé
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, FileText } from "lucide-react";

interface QuoteTypeSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (type: "simple" | "detailed") => void;
}

export const QuoteTypeSelectorModal = ({
  open,
  onOpenChange,
  onSelect,
}: QuoteTypeSelectorModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Choisir le type de devis</DialogTitle>
          <DialogDescription>
            Sélectionnez le format de devis qui correspond à vos besoins
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          {/* Option : Devis simple */}
          <Card
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => onSelect("simple")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                Devis simple
              </CardTitle>
              <CardDescription>
                Prix global
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Format simple avec un prix global.
                Idéal pour des prestations rapides.
              </p>
            </CardContent>
          </Card>

          {/* Option : Devis détaillé */}
          <Card
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => onSelect("detailed")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Devis détaillé
              </CardTitle>
              <CardDescription>
                Sections (corps de métier) • Lignes avec quantités et prix • Éditeur manuel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Format professionnel avec sections, lignes détaillées,
                quantités, unités et calculs automatiques.
              </p>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
