import { useState } from "react";
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

export const SimpleQuoteForm = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const { data: companyInfo } = useUserSettings();

  const [prestation, setPrestation] = useState("");
  const [surface, setSurface] = useState("");
  const [prix, setPrix] = useState("");
  const [clientId, setClientId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<any>(null);

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

      setQuote(result);

      toast({
        title: "Devis généré !",
        description: "Le devis a été créé avec succès.",
      });
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
    if (!quote || !companyInfo) return;

    try {
      await downloadQuotePDF({
        result: quote.details,
        companyInfo: companyInfo,
        clientInfo: {
          name: quote.client_name,
          email: quote.client_email,
          phone: quote.client_phone,
          location: quote.client_address,
        },
        surface: quote.surface.toString(),
        workType: quote.prestation,
        quoteDate: new Date(quote.created_at),
        quoteNumber: quote.quote_number,
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
    setPrestation("");
    setSurface("");
    setPrix("");
    setClientId("");
    setQuote(null);
  };

  const handleGoToFacturation = () => {
    navigate("/facturation");
  };

  if (quote) {
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
                Le devis {quote.quote_number} a été enregistré et est disponible dans la section Facturation.
              </p>
            </div>
          </div>
        </GlassCard>

        {/* Affichage du devis */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Devis {quote.quote_number}
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
            result={quote.details}
            companyInfo={companyInfo}
            clientInfo={{
              name: quote.client_name,
              email: quote.client_email,
              phone: quote.client_phone,
              location: quote.client_address,
            }}
            surface={quote.surface.toString()}
            workType={quote.prestation}
            quoteDate={new Date(quote.created_at)}
            quoteNumber={quote.quote_number}
          />
        </GlassCard>

        {/* Bouton pour créer un nouveau devis */}
        <div className="flex justify-center">
          <Button variant="outline" onClick={handleReset} className="gap-2">
            Créer un nouveau devis
          </Button>
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

