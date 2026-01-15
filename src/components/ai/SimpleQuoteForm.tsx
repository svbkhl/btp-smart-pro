import { useState, useRef, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calculateFromTTC } from "@/utils/priceCalculations";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useClients } from "@/hooks/useClients";
import { useUserSettings } from "@/hooks/useUserSettings";
import { generateSimpleQuote, STANDARD_PHRASE } from "@/services/simpleQuoteService";
import { QuoteDisplay } from "./QuoteDisplay";
import { downloadQuotePDF } from "@/services/pdfService";
import { Loader2, Sparkles, Download, CheckCircle2, Euro, Ruler, User, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SimpleQuoteFormProps {
  onSuccess?: () => void;
}

export const SimpleQuoteForm = ({ onSuccess }: SimpleQuoteFormProps = {}) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const { data: companyInfo } = useUserSettings();

  const [prestation, setPrestation] = useState("");
  const [surface, setSurface] = useState("");
  const [prix, setPrix] = useState("");
  const [clientId, setClientId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  // État explicite pour contrôler l'affichage de l'aperçu
  // Ne se réinitialise QUE via action utilisateur (bouton "Fermer" ou "Créer un nouveau devis")
  // Utiliser useRef pour persister même après re-render causé par invalidations de queries
  const quoteRef = useRef<any>(null);
  const isPreviewOpenRef = useRef<boolean>(false);
  const [quote, setQuote] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  // Synchroniser les refs avec les états pour persister lors des re-renders
  useEffect(() => {
    quoteRef.current = quote;
  }, [quote]);
  
  useEffect(() => {
    isPreviewOpenRef.current = isPreviewOpen;
  }, [isPreviewOpen]);
  
  // Debug: logger les changements d'état pour diagnostiquer
  console.log('[SimpleQuoteForm] Render - quote:', !!quote, 'isPreviewOpen:', isPreviewOpen, 'quoteRef:', !!quoteRef.current, 'isPreviewOpenRef:', isPreviewOpenRef.current);

  const selectedClient = clients.find((c) => c.id === clientId);

  const handleGenerate = async () => {
    // Validation
    if (!prestation.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir le nom de la prestation",
        variant: "destructive",
      });
      return;
    }

    if (!surface || parseFloat(surface) <= 0) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir une surface valide",
        variant: "destructive",
      });
      return;
    }

    if (!prix || parseFloat(prix) <= 0) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir un prix valide",
        variant: "destructive",
      });
      return;
    }

    if (!clientId) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un client",
        variant: "destructive",
      });
      return;
    }

    if (!selectedClient) {
      toast({
        title: "Erreur",
        description: "Client introuvable",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Nettoyer et valider les nombres
      const surfaceNum = parseFloat(surface.replace(',', '.'));
      const prixTTC = parseFloat(prix.replace(',', '.'));

      if (isNaN(surfaceNum) || isNaN(prixTTC)) {
        throw new Error("Les valeurs numériques ne sont pas valides");
      }

      console.log('Surface saisie:', surfaceNum);
      console.log('Prix saisi (TTC):', prixTTC);
      
      // Générer le devis simple
      // Le prix est envoyé tel quel (TTC), le service le traitera comme TTC
      const result = await generateSimpleQuote(
        {
          prestation: prestation.trim(),
          surface: surfaceNum,
          prix: prixTTC, // Envoyer le TTC directement
          clientId: clientId,
        },
        companyInfo,
        {
          name: selectedClient.name,
          email: selectedClient.email,
          phone: selectedClient.phone,
          location: selectedClient.location,
        }
      );

      // Décorréler la génération de l'affichage : générer ≠ fermer l'aperçu
      console.log('[SimpleQuoteForm] Setting quote and opening preview');
      // Mettre à jour les refs ET les états pour persister lors des re-renders
      quoteRef.current = result;
      isPreviewOpenRef.current = true;
      setQuote(result);
      setIsPreviewOpen(true); // Ouvrir explicitement l'aperçu
      console.log('[SimpleQuoteForm] Quote set, isPreviewOpen set to true');

      toast({
        title: "✅ Devis généré !",
        description: "Le devis a été créé avec succès. L'aperçu reste affiché jusqu'à ce que vous le fermiez.",
      });

      // Ne pas appeler onSuccess automatiquement
      // L'aperçu reste affiché jusqu'à ce que l'utilisateur ferme manuellement
      // Le callback onSuccess peut être appelé manuellement si nécessaire (ex: bouton "Fermer")
    } catch (error: any) {
      console.error("Error generating quote:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de générer le devis",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    const currentQuote = quote || quoteRef.current;
    if (!currentQuote || !companyInfo) return;

    try {
      const currentQuote = quote || quoteRef.current;
      await downloadQuotePDF({
        result: currentQuote.details,
        companyInfo: companyInfo,
        clientInfo: {
          name: currentQuote.client_name,
          email: currentQuote.client_email,
          phone: currentQuote.client_phone,
          location: currentQuote.client_address,
        },
        surface: currentQuote.surface.toString(),
        workType: currentQuote.prestation,
        quoteDate: new Date(currentQuote.created_at),
        quoteNumber: currentQuote.quote_number,
        // Ajouter automatiquement la signature depuis les paramètres
        signatureData: companyInfo.signature_data,
        signedBy: companyInfo.signature_name || companyInfo.company_name || companyInfo.contact_name,
        signedAt: new Date().toISOString(),
      });

      toast({
        title: "PDF généré",
        description: "Le devis a été téléchargé en PDF.",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de générer le PDF",
        variant: "destructive",
      });
    }
  };

  const handleReset = () => {
    // Réinitialiser le formulaire ET fermer l'aperçu explicitement
    setPrestation("");
    setSurface("");
    setPrix("");
    setClientId("");
    // Réinitialiser les refs ET les états
    quoteRef.current = null;
    isPreviewOpenRef.current = false;
    setQuote(null);
    setIsPreviewOpen(false); // Fermer l'aperçu via action utilisateur
    console.log('[SimpleQuoteForm] Reset - cleared quote and preview');
  };

  const handleClosePreview = () => {
    // Fermer l'aperçu explicitement via action utilisateur
    isPreviewOpenRef.current = false;
    setIsPreviewOpen(false);
    // Ne pas réinitialiser quote pour permettre de le rouvrir si nécessaire
    // L'utilisateur peut toujours créer un nouveau devis avec handleReset
    console.log('[SimpleQuoteForm] Close preview - kept quote, closed preview');
  };

  const handleGoToFacturation = () => {
    navigate("/facturation");
  };

  // Afficher l'aperçu SEULEMENT si quote existe ET isPreviewOpen est true
  // Utiliser les refs comme fallback si les états sont réinitialisés par un re-render
  // Cela garantit que l'aperçu ne disparaît pas après re-render ou invalidation de queries
  const shouldShowPreview = (quote || quoteRef.current) && (isPreviewOpen || isPreviewOpenRef.current);
  console.log('[SimpleQuoteForm] Render check - quote:', !!quote, 'isPreviewOpen:', isPreviewOpen, 'quoteRef:', !!quoteRef.current, 'isPreviewOpenRef:', isPreviewOpenRef.current, 'should show preview:', shouldShowPreview);
  
  // Si les états ont été réinitialisés mais que les refs ont encore les valeurs, restaurer les états
  useEffect(() => {
    if (!quote && quoteRef.current) {
      console.log('[SimpleQuoteForm] Restoring quote from ref');
      setQuote(quoteRef.current);
    }
    if (!isPreviewOpen && isPreviewOpenRef.current) {
      console.log('[SimpleQuoteForm] Restoring isPreviewOpen from ref');
      setIsPreviewOpen(true);
    }
  }, [quote, isPreviewOpen]);
  
  if (shouldShowPreview) {
    // Utiliser quote ou quoteRef.current pour l'affichage
    const displayQuote = quote || quoteRef.current;
    return (
      <div className="space-y-6">
        {/* Message de succès */}
        <GlassCard className="p-6 border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
            <div className="flex-1">
              <h3 className="font-semibold text-green-900 dark:text-green-100">
                Devis créé avec succès !
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300">
                Le devis {displayQuote.quote_number} a été enregistré et est disponible dans la section Facturation.
              </p>
            </div>
          </div>
        </GlassCard>

        {/* Affichage du devis */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Devis {displayQuote.quote_number}
            </h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleDownloadPDF} className="gap-2">
                <Download className="w-4 h-4" />
                Télécharger PDF
              </Button>
              <Button onClick={handleGoToFacturation} className="gap-2 rounded-xl">
                Voir dans Facturation
              </Button>
            </div>
          </div>

          <QuoteDisplay
            result={displayQuote.details}
            companyInfo={companyInfo}
            clientInfo={{
              name: displayQuote.client_name,
              email: displayQuote.client_email,
              phone: displayQuote.client_phone,
              location: displayQuote.client_address,
            }}
            surface={displayQuote.surface.toString()}
            workType={displayQuote.prestation}
            quoteDate={new Date(displayQuote.created_at)}
            quoteNumber={displayQuote.quote_number}
          />
        </GlassCard>

        {/* Boutons d'action */}
        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={handleReset} className="gap-2">
            Créer un nouveau devis
          </Button>
          <Button onClick={handleClosePreview} className="gap-2" variant="outline">
            Fermer l'aperçu
          </Button>
          {onSuccess && (
            <Button onClick={() => {
              handleClosePreview();
              onSuccess();
            }} className="gap-2">
              Fermer
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <GlassCard className="p-4 sm:p-6">
      <div className="space-y-6">
        {/* En-tête */}
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            Génération de devis simple
          </h2>
          <p className="text-sm text-muted-foreground">
            Remplissez les informations ci-dessous pour générer un devis automatiquement
          </p>
        </div>

        {/* Formulaire */}
        <div className="space-y-4 sm:space-y-6">
          {/* Client - EN HAUT */}
          <div className="space-y-2">
            <Label htmlFor="client" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Client
            </Label>
            <Select
              value={clientId}
              onValueChange={setClientId}
              disabled={loading || clientsLoading}
            >
              <SelectTrigger
                id="client"
                className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50"
              >
                <SelectValue placeholder="Sélectionner un client" />
              </SelectTrigger>
              <SelectContent>
                {clientsLoading ? (
                  <SelectItem value="loading" disabled>
                    Chargement...
                  </SelectItem>
                ) : clients.length === 0 ? (
                  <SelectItem value="empty" disabled>
                    Aucun client disponible
                  </SelectItem>
                ) : (
                  clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {clients.length === 0 && !clientsLoading && (
              <p className="text-sm text-muted-foreground">
                Créez d'abord un client dans la section Clients
              </p>
            )}
          </div>

          {/* Nom de la prestation */}
          <div className="space-y-2">
            <Label htmlFor="prestation" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Nom de la prestation
            </Label>
            <Input
              id="prestation"
              value={prestation}
              onChange={(e) => setPrestation(e.target.value)}
              placeholder="Ex: Rénovation salle de bains"
              className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50"
              disabled={loading}
            />
          </div>

          {/* Surface */}
          <div className="space-y-2">
            <Label htmlFor="surface" className="flex items-center gap-2">
              <Ruler className="w-4 h-4" />
              Surface (m²)
            </Label>
            <Input
              id="surface"
              type="number"
              min="0"
              step="0.01"
              value={surface}
              onChange={(e) => setSurface(e.target.value)}
              placeholder="Ex: 15"
              className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              disabled={loading}
            />
          </div>

          {/* Prix TTC */}
          <div className="space-y-2">
            <Label htmlFor="prix" className="flex items-center gap-2">
              <Euro className="w-4 h-4" />
              Montant TTC
            </Label>
            <Input
              id="prix"
              type="number"
              min="0"
              step="0.01"
              value={prix}
              onChange={(e) => setPrix(e.target.value)}
              placeholder="Ex: 2000"
              className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              💡 Le montant que vous saisissez est le prix final TTC (TVA incluse)
            </p>
          </div>

          {/* Aperçu du total - MODE TTC FIRST */}
          {prix && surface && (() => {
            const prixNum = parseFloat(prix);
            if (isNaN(prixNum) || prixNum <= 0) return null;
            
            const prices = calculateFromTTC(prixNum, 20);
            
            return (
              <GlassCard className="p-4 bg-primary/5 dark:bg-primary/10 border-primary/20">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold">Total à payer (TTC) :</span>
                  <span className="text-2xl font-bold text-primary">
                    {prices.total_ttc.toLocaleString("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                    })}
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-border/50 space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">dont TVA (20%) :</span>
                    <span className="font-medium">
                      {prices.vat_amount.toLocaleString("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total HT :</span>
                    <span className="font-medium">
                      {prices.total_ht.toLocaleString("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                      })}
                    </span>
                  </div>
                </div>
              </GlassCard>
            );
          })()}

          {/* Bouton de génération */}
          <Button
            onClick={handleGenerate}
            disabled={loading || !prestation.trim() || !surface || !prix || !clientId}
            className="w-full gap-2 rounded-xl"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Génération en cours...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Générer le devis
              </>
            )}
          </Button>

          {/* Info phrase standard */}
          <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
            <p className="text-xs text-muted-foreground">
              <strong>Note :</strong> La phrase standard suivante sera automatiquement ajoutée au devis :
            </p>
            <p className="text-xs text-muted-foreground mt-1 italic">
              "{STANDARD_PHRASE}"
            </p>
          </div>
        </div>
      </div>
    </GlassCard>
  );
};

