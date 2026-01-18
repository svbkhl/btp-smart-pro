/**
 * Onglet Factures dans la page IA
 * Affiche les boutons pour créer une nouvelle facture
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Receipt, FileText, ArrowRight, Sparkles } from "lucide-react";
import { SimpleInvoiceForm } from "./SimpleInvoiceForm";
import { DetailedInvoiceEditor } from "@/components/invoices/DetailedInvoiceEditor";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GlassCard } from "@/components/ui/GlassCard";
import { InvoiceTypeSelectorModal } from "@/components/invoices/InvoiceTypeSelectorModal";
import { useToast } from "@/components/ui/use-toast";

export default function AIInvoicesTab() {
  const { toast } = useToast();
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [invoiceType, setInvoiceType] = useState<"simple" | "detailed" | "from-quote" | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-xl font-semibold flex items-center gap-2 mb-2">
          <Receipt className="h-5 w-5 text-primary" />
          Créer une facture
        </h3>
        <p className="text-sm text-muted-foreground">
          Générez des factures professionnelles pour vos clients
        </p>
      </div>

      {/* Boutons de création */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Bouton Facture Simple */}
        <GlassCard className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group"
          onClick={() => {
            setInvoiceType("simple");
            setShowCreateForm(true);
          }}
        >
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <Receipt className="h-12 w-12 text-primary" />
            </div>
            <div className="space-y-2">
              <h4 className="text-xl font-semibold">Facture simple</h4>
              <p className="text-sm text-muted-foreground">
                Créez rapidement une facture avec un montant global. Idéal pour les paiements simples.
              </p>
            </div>
            <Button 
              size="lg" 
              className="w-full mt-4 group-hover:scale-105 transition-transform"
              onClick={(e) => {
                e.stopPropagation();
                setInvoiceType("simple");
                setShowCreateForm(true);
              }}
            >
              <Plus className="h-5 w-5 mr-2" />
              Créer une facture simple
            </Button>
          </div>
        </GlassCard>

        {/* Bouton Facture Depuis Devis */}
        <GlassCard className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group"
          onClick={() => {
            setInvoiceType("from-quote");
            setShowCreateForm(true);
          }}
        >
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <ArrowRight className="h-12 w-12 text-primary" />
            </div>
            <div className="space-y-2">
              <h4 className="text-xl font-semibold">Facture depuis devis</h4>
              <p className="text-sm text-muted-foreground">
                Créez une facture directement à partir d'un devis signé. Les détails sont automatiquement copiés.
              </p>
            </div>
            <Button 
              size="lg" 
              className="w-full mt-4 group-hover:scale-105 transition-transform"
              onClick={(e) => {
                e.stopPropagation();
                setInvoiceType("from-quote");
                setShowCreateForm(true);
              }}
            >
              <ArrowRight className="h-5 w-5 mr-2" />
              Créer depuis un devis
            </Button>
          </div>
        </GlassCard>

        {/* Bouton Facture Détaillée */}
        <GlassCard className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group"
          onClick={() => {
            setInvoiceType("detailed");
            setShowCreateForm(true);
          }}
        >
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <Sparkles className="h-12 w-12 text-primary" />
            </div>
            <div className="space-y-2">
              <h4 className="text-xl font-semibold">Facture détaillée</h4>
              <p className="text-sm text-muted-foreground">
                Créez une facture complète avec sections et lignes détaillées. Parfait pour les projets complexes.
              </p>
            </div>
            <Button 
              size="lg" 
              className="w-full mt-4 group-hover:scale-105 transition-transform"
              onClick={(e) => {
                e.stopPropagation();
                setInvoiceType("detailed");
                setShowCreateForm(true);
              }}
            >
              <Plus className="h-5 w-5 mr-2" />
              Créer une facture détaillée
            </Button>
          </div>
        </GlassCard>
      </div>

      {/* Modal de sélection du type de facture (gardé pour compatibilité) */}
      <InvoiceTypeSelectorModal
        open={showTypeSelector}
        onOpenChange={setShowTypeSelector}
        onSelect={(type) => {
          setInvoiceType(type);
          setShowTypeSelector(false);
          setShowCreateForm(true);
        }}
      />

        {/* Dialog de création de facture */}
        <Dialog 
          open={showCreateForm} 
          onOpenChange={(open) => {
            if (!open && isPreviewOpen) {
              return;
            }
            setShowCreateForm(open);
            if (!open) {
              setIsPreviewOpen(false);
              setInvoiceType(null);
            }
          }}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Créer une facture {invoiceType === "detailed" ? "détaillée" : "simple"}
              </DialogTitle>
              <DialogDescription>
                {invoiceType === "detailed" 
                  ? "Créez une facture avec sections et lignes détaillées"
                  : "Remplissez les informations pour générer une facture"}
              </DialogDescription>
            </DialogHeader>

            {invoiceType === "simple" && <SimpleInvoiceForm mode="normal" />}
            {invoiceType === "from-quote" && <SimpleInvoiceForm mode="from-quote" />}
            {invoiceType === "detailed" && (
              <DetailedInvoiceEditor
                onSuccess={(invoiceId) => {
                  toast({
                    title: "Facture créée",
                    description: "La facture détaillée a été créée avec succès",
                  });
                  setShowCreateForm(false);
                  setInvoiceType(null);
                }}
                onClose={() => {
                  setShowCreateForm(false);
                  setInvoiceType(null);
                }}
              />
            )}
          </DialogContent>
        </Dialog>
    </div>
  );
}
