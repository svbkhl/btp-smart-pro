/**
 * Modal de sélection du type de facture
 * Affiche 2 cartes : Facture simple et Facture détaillée
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, FileText, ArrowRight } from "lucide-react";

interface InvoiceTypeSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (type: "simple" | "detailed" | "from-quote") => void;
}

export const InvoiceTypeSelectorModal = ({
  open,
  onOpenChange,
  onSelect,
}: InvoiceTypeSelectorModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Choisir le type de facture</DialogTitle>
          <DialogDescription>
            Sélectionnez le format de facture qui correspond à vos besoins
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          {/* Option : Facture depuis devis */}
          <Card
            className="cursor-pointer hover:border-primary transition-colors border-primary/20"
            onClick={() => onSelect("from-quote")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRight className="h-5 w-5 text-primary" />
                Facture depuis devis
              </CardTitle>
              <CardDescription>
                Conversion automatique
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Créez une facture directement depuis un devis existant.
                Les lignes et montants sont transférés automatiquement.
              </p>
            </CardContent>
          </Card>

          {/* Option : Facture simple */}
          <Card
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => onSelect("simple")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                Facture simple
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

          {/* Option : Facture détaillée */}
          <Card
            className="cursor-pointer hover:border-primary transition-colors md:col-span-2"
            onClick={() => onSelect("detailed")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Facture détaillée
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
