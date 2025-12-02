import { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useClients } from "@/hooks/useClients";
import { useQuotes } from "@/hooks/useQuotes";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useCreateInvoice, CreateInvoiceData } from "@/hooks/useInvoices";
import { InvoiceDisplay } from "@/components/invoices/InvoiceDisplay";
import { downloadInvoicePDF } from "@/services/invoicePdfService";
import { Loader2, Receipt, Download, CheckCircle2, Euro, User, FileText, ArrowLeft } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

export const SimpleInvoiceForm = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const { data: quotes = [] } = useQuotes();
  const { data: companyInfo } = useUserSettings();
  const createInvoice = useCreateInvoice();

  const [clientId, setClientId] = useState<string>("");
  const [quoteId, setQuoteId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [amountHt, setAmountHt] = useState("");
  const [loading, setLoading] = useState(false);
  const [invoice, setInvoice] = useState<any>(null);

  // Pré-sélectionner le devis depuis l'URL si présent
  useEffect(() => {
    const urlQuoteId = searchParams.get("quoteId");
    if (urlQuoteId && quotes.length > 0) {
      const quote = quotes.find(q => q.id === urlQuoteId);
      if (quote) {
        setQuoteId(urlQuoteId);
        // Sélectionner automatiquement le client du devis
        const quoteClient = clients.find((c) => c.name === quote.client_name);
        if (quoteClient) {
          setClientId(quoteClient.id);
        }
      }
    }
  }, [searchParams, quotes, clients]);

  // Taux de TVA fixe à 20% (comme pour les devis)
  const vatRate = 20;

  const selectedClient = clients.find((c) => c.id === clientId);
  const selectedQuote = quotes.find((q) => q.id === quoteId);

  // Charger les données du devis si sélectionné
  useEffect(() => {
    if (selectedQuote) {
      setDescription(selectedQuote.details?.description || `Facture pour ${selectedQuote.client_name}`);
      // Le devis stocke le HT, convertir en TTC pour l'affichage
      const montantHT = selectedQuote.estimated_cost || 0;
      const montantTTC = montantHT * 1.2;
      setAmountHt(montantTTC.toString());
      if (selectedQuote.client_name && !clientId) {
        const quoteClient = clients.find((c) => c.name === selectedQuote.client_name);
        if (quoteClient) {
          setClientId(quoteClient.id);
        }
      }
    }
  }, [selectedQuote, clients, clientId]);

  const handleGenerate = async () => {
    // Validation
    if (!clientId) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un client",
        variant: "destructive",
      });
      return;
    }

    if (!description.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir une description",
        variant: "destructive",
      });
      return;
    }

    if (!amountHt || parseFloat(amountHt) <= 0) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir un montant valide",
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
      // Le montant saisi est TTC, calculer le HT
      const montantTTC = parseFloat(amountHt);
      const montantHT = montantTTC / 1.2;
      
      const invoiceData: CreateInvoiceData = {
        client_id: clientId,
        client_name: selectedClient.name,
        client_email: selectedClient.email,
        client_address: selectedClient.location,
        quote_id: quoteId || undefined,
        description: description.trim(),
        amount_ht: montantHT, // Envoyer le HT calculé
        vat_rate: vatRate, // 20% fixe
      };

      const result = await createInvoice.mutateAsync(invoiceData);
      setInvoice(result);

      toast({
        title: "Facture générée !",
        description: "La facture a été créée avec succès.",
      });
    } catch (error: any) {
      console.error("Error generating invoice:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de générer la facture",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!invoice || !companyInfo) return;

    try {
      await downloadInvoicePDF({
        invoice,
        companyInfo: companyInfo,
      });

      toast({
        title: "PDF généré",
        description: "La facture a été téléchargée en PDF.",
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
    setClientId("");
    setQuoteId("");
    setDescription("");
    setAmountHt("");
    setCanModifyAmount(false);
    setInvoice(null);
  };

  const handleGoToFacturation = () => {
    navigate("/facturation");
  };

  if (invoice) {
    return (
      <div className="space-y-6">
        {/* Message de succès */}
        <GlassCard className="p-6 border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
            <div className="flex-1">
              <h3 className="font-semibold text-green-900 dark:text-green-100">
                Facture créée avec succès !
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300">
                La facture {invoice.invoice_number} a été enregistrée et est disponible dans la section Facturation.
              </p>
            </div>
          </div>
        </GlassCard>

        {/* Affichage de la facture */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Facture {invoice.invoice_number}
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

          <InvoiceDisplay invoice={invoice} showActions={false} />
        </GlassCard>

        {/* Bouton pour créer une nouvelle facture */}
        <div className="flex justify-center">
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Créer une nouvelle facture
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
            <Receipt className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            Génération de facture simple
          </h2>
          <p className="text-sm text-muted-foreground">
            Remplissez les informations ci-dessous pour générer une facture automatiquement
          </p>
        </div>

        {/* Formulaire */}
        <div className="space-y-4 sm:space-y-6">
          {/* Générer depuis un devis - EN PREMIER */}
          {quotes.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="quote" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Générer depuis un devis (optionnel)
              </Label>
              <Select
                value={quoteId || "none"}
                onValueChange={(value) => {
                  if (value === "none") {
                    setQuoteId("");
                  } else {
                    setQuoteId(value);
                    const quote = quotes.find((q) => q.id === value);
                    if (quote) {
                      // Sélectionner automatiquement le client du devis
                      const quoteClient = clients.find((c) => c.name === quote.client_name);
                      if (quoteClient) {
                        setClientId(quoteClient.id);
                      }
                    }
                  }
                }}
                disabled={loading}
              >
                <SelectTrigger
                  id="quote"
                  className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50"
                >
                  <SelectValue placeholder="Sélectionner un devis pour générer la facture" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Créer une facture manuellement</SelectItem>
                  {quotes.map((quote) => (
                    <SelectItem key={quote.id} value={quote.id}>
                      {quote.quote_number} - {quote.client_name} - {quote.estimated_cost?.toLocaleString("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {quoteId && selectedQuote && (
                <GlassCard className="p-3 bg-primary/5 dark:bg-primary/10 border-primary/20">
                  <div className="space-y-2 text-sm">
                    <p className="font-semibold">✓ Devis associé : {selectedQuote.quote_number}</p>
                    <p className="text-muted-foreground">Le formulaire a été pré-rempli avec les informations du devis</p>
                  </div>
                </GlassCard>
              )}
            </div>
          )}

          {/* Client */}
          <div className="space-y-2">
            <Label htmlFor="client" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Client
            </Label>
            <Select
              value={clientId}
              onValueChange={(value) => {
                setClientId(value);
                // Réinitialiser le devis si le client change et qu'il ne correspond pas
                if (selectedQuote && selectedQuote.client_name !== clients.find((c) => c.id === value)?.name) {
                  setQuoteId("");
                }
              }}
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
            {selectedQuote && (
              <p className="text-xs text-muted-foreground">
                Client automatiquement sélectionné depuis le devis
              </p>
            )}
            {clients.length === 0 && !clientsLoading && !selectedQuote && (
              <p className="text-sm text-muted-foreground">
                Créez d'abord un client dans la section Clients
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Description
            </Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Facture pour rénovation salle de bains"
              className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50"
              disabled={loading}
            />
          </div>

          {/* Montant */}
          <div className="space-y-2">
            <Label htmlFor="amountHt" className="flex items-center gap-2">
              <Euro className="w-4 h-4" />
              Montant
            </Label>
            <Input
              id="amountHt"
              type="number"
              min="0"
              step="0.01"
              value={amountHt}
              onChange={(e) => setAmountHt(e.target.value)}
              placeholder="Ex: 4500"
              className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Montant TTC (TVA 20% incluse) - Vous pouvez modifier ce montant
            </p>
          </div>

          {/* Aperçu du total */}
          {amountHt && (
            <GlassCard className="p-4 bg-primary/5 dark:bg-primary/10 border-primary/20">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total HT :</span>
                <span className="text-lg font-bold">
                  {(parseFloat(amountHt) / 1.2).toLocaleString("fr-FR", {
                    style: "currency",
                    currency: "EUR",
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-muted-foreground">TVA ({vatRate}%) :</span>
                <span className="text-sm font-medium">
                  {(parseFloat(amountHt) - parseFloat(amountHt) / 1.2).toLocaleString("fr-FR", {
                    style: "currency",
                    currency: "EUR",
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                <span className="text-sm font-semibold">Total :</span>
                <span className="text-xl font-bold text-primary">
                  {parseFloat(amountHt).toLocaleString("fr-FR", {
                    style: "currency",
                    currency: "EUR",
                  })}
                </span>
              </div>
            </GlassCard>
          )}

          {/* Bouton de génération */}
          <Button
            onClick={handleGenerate}
            disabled={loading || !clientId || !description.trim() || !amountHt}
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
                <Receipt className="w-5 h-5" />
                Générer la facture
              </>
            )}
          </Button>
        </div>
      </div>
    </GlassCard>
  );
};

