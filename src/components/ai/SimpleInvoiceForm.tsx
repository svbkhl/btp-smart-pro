import { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useClients, getClientFullName } from "@/hooks/useClients";
import { useQuotes } from "@/hooks/useQuotes";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useCompanySettings, useUpdateCompanySettings } from "@/hooks/useCompanySettings";
import { useCreateInvoice, CreateInvoiceData } from "@/hooks/useInvoices";
import { InvoiceDisplay } from "@/components/invoices/InvoiceDisplay";
import { downloadInvoicePDF } from "@/services/invoicePdfService";
import { Loader2, Receipt, Download, CheckCircle2, Euro, User, FileText, ArrowLeft, X, Send } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { SendToClientModal } from "@/components/billing/SendToClientModal";

interface SimpleInvoiceFormProps {
  mode?: "normal" | "from-quote";
}

export const SimpleInvoiceForm = ({ mode = "normal" }: SimpleInvoiceFormProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const { data: quotes = [] } = useQuotes();
  const { data: companyInfo } = useUserSettings();
  const { data: companySettings } = useCompanySettings();
  const updateCompanySettings = useUpdateCompanySettings();
  const createInvoice = useCreateInvoice();

  const [clientId, setClientId] = useState<string>("");
  const [quoteId, setQuoteId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [amountHt, setAmountHt] = useState("");
  const [loading, setLoading] = useState(false);
  const [invoice, setInvoice] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isSendToClientOpen, setIsSendToClientOpen] = useState(false);
  
  // États pour la gestion de la TVA (comme dans SimpleQuoteForm)
  const [tvaRate, setTvaRate] = useState<number>(
    companySettings?.default_tva_rate || companySettings?.default_quote_tva_rate || 0.20
  );
  const [tva293b, setTva293b] = useState<boolean>(
    companySettings?.default_tva_293b || false
  );
  const [tvaRateInput, setTvaRateInput] = useState<string>(
    ((companySettings?.default_tva_rate || companySettings?.default_quote_tva_rate || 0.20) * 100).toFixed(2)
  );

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

  const selectedClient = clients.find((c) => c.id === clientId);
  const selectedQuote = quotes.find((q) => q.id === quoteId);
  
  // Charger les préférences TVA au montage
  useEffect(() => {
    if (companySettings) {
      const defaultRate = companySettings.default_tva_rate || companySettings.default_quote_tva_rate || 0.20;
      setTvaRate(defaultRate);
      setTvaRateInput((defaultRate * 100).toFixed(2));
      setTva293b(companySettings.default_tva_293b || false);
    } else {
      setTvaRateInput("20.00");
    }
  }, [companySettings]);

  // Si un devis est sélectionné, utiliser sa TVA comme valeur initiale (mais l'utilisateur peut la modifier)
  useEffect(() => {
    if (selectedQuote && mode === "from-quote") {
      const quoteTva293b = selectedQuote.tva_non_applicable_293b || false;
      const quoteTvaRate = selectedQuote.tva_rate || 0.20;
      
      if (quoteTva293b) {
        setTva293b(true);
        setTvaRate(0);
        setTvaRateInput("0.00");
      } else {
        setTva293b(false);
        setTvaRate(quoteTvaRate);
        setTvaRateInput((quoteTvaRate * 100).toFixed(2));
      }
    }
  }, [selectedQuote, mode]);

  // Taux de TVA effectif pour les calculs
  const effectiveTvaRate = tva293b ? 0 : tvaRate;
  const vatRatePercent = effectiveTvaRate * 100;

  // Gérer changement TVA/293B (comme dans SimpleQuoteForm)
  const handleTvaRateInputChange = (value: string) => {
    setTvaRateInput(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100 && value.trim() !== "") {
      setTvaRate(numValue / 100);
    }
  };

  const handleTvaRateBlur = () => {
    const numValue = parseFloat(tvaRateInput);
    if (isNaN(numValue) || numValue < 0) {
      setTvaRateInput((tvaRate * 100).toFixed(2));
    } else if (numValue > 100) {
      const finalRate = 1;
      setTvaRateInput("100.00");
      setTvaRate(finalRate);
      updateCompanySettings.mutateAsync({
        default_tva_rate: finalRate,
      }).catch(err => console.error("Error updating company settings:", err));
    } else {
      const finalRate = numValue / 100;
      setTvaRateInput(numValue.toFixed(2));
      setTvaRate(finalRate);
      updateCompanySettings.mutateAsync({
        default_tva_rate: finalRate,
      }).catch(err => console.error("Error updating company settings:", err));
    }
  };

  const handleTva293bChange = (value: boolean) => {
    const newTva293b = value;
    const newTvaRate = newTva293b ? 0 : tvaRate;
    
    setTva293b(newTva293b);
    if (newTva293b) {
      setTvaRate(0);
      setTvaRateInput("0.00");
    }
    
    updateCompanySettings.mutateAsync({
      default_tva_293b: newTva293b,
      default_tva_rate: newTvaRate,
    }).catch(err => console.error("Error updating company settings:", err));
  };

  // Charger les données du devis si sélectionné
  useEffect(() => {
    if (selectedQuote) {
      setDescription(selectedQuote.details?.description || `Facture pour ${selectedQuote.client_name}`);
      // Si 293B, utiliser directement total_ttc (qui = subtotal_ht), sinon convertir HT en TTC
      const quoteTva293b = selectedQuote.tva_non_applicable_293b || false;
      if (quoteTva293b) {
        // TVA 293B : le montant affiché est déjà HT = TTC
        const montant = selectedQuote.total_ttc || selectedQuote.subtotal_ht || selectedQuote.estimated_cost || 0;
        setAmountHt(montant.toString());
      } else {
        // TVA normale : convertir HT en TTC
        const montantHT = selectedQuote.subtotal_ht || selectedQuote.estimated_cost || 0;
        const tvaRateDecimal = (selectedQuote.tva_rate || 0.20);
        const montantTTC = montantHT * (1 + tvaRateDecimal);
        setAmountHt(montantTTC.toString());
      }
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
    // Si mode="from-quote", le devis est obligatoire
    if (mode === "from-quote" && !quoteId) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un devis pour créer la facture",
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
      // ✅ CORRECTION: Le montant saisi est TTC (selon l'affichage "Montant TTC")
      // Si TVA 293B, montant saisi = HT = TTC
      // Sinon, montant saisi = TTC, on calcule HT depuis TTC
      const montantTTC = parseFloat(amountHt);
      const montantHT = tva293b ? montantTTC : (montantTTC / (1 + effectiveTvaRate));
      const montantTVA = tva293b ? 0 : (montantTTC - montantHT);
      
      console.log("💰 [SimpleInvoiceForm] Montants calculés:", {
        montantTTC,
        montantHT,
        montantTVA,
        tvaRate: vatRatePercent,
        tva293b
      });
      
      const invoiceData: CreateInvoiceData = {
        client_id: clientId,
        client_name: getClientFullName(selectedClient),
        client_email: selectedClient.email,
        client_address: selectedClient.location,
        quote_id: quoteId || undefined,
        description: description.trim(),
        amount_ht: montantHT, // HT calculé depuis TTC saisi
        amount_ttc: montantTTC, // ✅ TTC saisi directement (source de vérité pour éviter les arrondis)
        vat_rate: vatRatePercent, // Taux en pourcentage (0 si 293B, sinon taux saisi)
      };
      
      console.log("📝 [SimpleInvoiceForm] Données envoyées à createInvoice:", invoiceData);

      const result = await createInvoice.mutateAsync(invoiceData);
      setInvoice(result);
      
      // Ouvrir automatiquement l'aperçu (comme pour les devis)
      setShowPreview(true);

      toast({
        title: "Facture générée !",
        description: "La facture a été créée avec succès. Aperçu affiché.",
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
    setInvoice(null);
    setShowPreview(false);
  };

  const handleClosePreview = () => {
    setShowPreview(false);
  };

  const handleGoToFacturation = () => {
    navigate("/facturation");
  };

  // Afficher l'aperçu après création (comme pour les devis)
  if (invoice && showPreview) {
    return (
      <div className="space-y-6">
        {/* Message de succès + barre d'actions en haut */}
        <GlassCard className="p-6 border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400 shrink-0" />
              <div className="min-w-0">
                <h3 className="font-semibold text-green-900 dark:text-green-100">
                  Facture créée avec succès !
                </h3>
                <p className="text-sm text-green-700 dark:text-green-300">
                  La facture {invoice.invoice_number} a été enregistrée.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={handleDownloadPDF} className="gap-1.5">
                <Download className="w-4 h-4" />
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsSendToClientOpen(true)} className="gap-1.5">
                <Send className="w-4 h-4" />
                Envoyer
              </Button>
              <Button size="sm" onClick={handleGoToFacturation} className="gap-1.5 rounded-xl">
                Facturation
              </Button>
              <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5">
                Nouvelle facture
              </Button>
              <Button size="sm" onClick={handleClosePreview} className="gap-1.5">
                Fermer
              </Button>
            </div>
          </div>
        </GlassCard>

        {/* Affichage de la facture (sans boutons en double) */}
        <InvoiceDisplay
          invoice={invoice}
          showActions={false}
        />

        {/* Modal Envoyer au client */}
        <SendToClientModal
          open={isSendToClientOpen}
          onOpenChange={setIsSendToClientOpen}
          documentType="invoice"
          document={invoice}
          onSent={() => {
            setIsSendToClientOpen(false);
            toast({
              title: "Facture envoyée",
              description: "La facture a été envoyée au client avec succès.",
            });
          }}
        />
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
            {mode === "from-quote" ? "Facture depuis devis" : "Génération de facture simple"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {mode === "from-quote" 
              ? "Sélectionnez un devis pour créer une facture. Les lignes et montants seront transférés automatiquement."
              : "Remplissez les informations ci-dessous pour générer une facture automatiquement"}
          </p>
        </div>

        {/* Formulaire */}
        <div className="space-y-4 sm:space-y-6">
          {/* Générer depuis un devis - UNIQUEMENT si mode="from-quote" */}
          {mode === "from-quote" && quotes.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="quote" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Sélectionner un devis *
              </Label>
              <Select
                value={mode === "from-quote" ? (quoteId || "") : (quoteId || "none")}
                onValueChange={(value) => {
                  if (value === "none") {
                    setQuoteId("");
                  } else if (value) {
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
                  className="bg-transparent backdrop-blur-xl border-white/20 dark:border-white/10"
                >
                  <SelectValue placeholder="Sélectionner un devis pour générer la facture" />
                </SelectTrigger>
                <SelectContent>
                  {mode !== "from-quote" && <SelectItem value="none">Créer une facture manuellement</SelectItem>}
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
              Client <span className="text-red-500">*</span>
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
              required
            >
              <SelectTrigger
                id="client"
                className="bg-transparent backdrop-blur-xl border-white/20 dark:border-white/10"
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
                      {getClientFullName(client)}
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
              className="bg-transparent backdrop-blur-xl border-white/20 dark:border-white/10"
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
              className="bg-transparent backdrop-blur-xl border-white/20 dark:border-white/10"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              {tva293b 
                ? "Montant HT/TTC (TVA non applicable - Article 293B du CGI) - Vous pouvez modifier ce montant"
                : `Montant TTC (TVA ${vatRatePercent.toFixed(2)}% incluse) - Vous pouvez modifier ce montant`
              }
            </p>
          </div>

          {/* TVA 293B */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="tva_293b_invoice"
                checked={tva293b}
                onCheckedChange={(checked) => handleTva293bChange(checked === true)}
              />
              <Label htmlFor="tva_293b_invoice" className="cursor-pointer">
                TVA non applicable - Article 293 B du CGI
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Cocher si votre entreprise est exonérée de TVA selon l'article 293 B du Code Général des Impôts
            </p>
          </div>

          {/* Taux TVA (si pas 293B) */}
          {!tva293b && (
            <div className="space-y-2">
              <Label htmlFor="tva_rate_invoice">Taux de TVA (%)</Label>
              <Input
                id="tva_rate_invoice"
                type="text"
                inputMode="decimal"
                value={tvaRateInput}
                onChange={(e) => handleTvaRateInputChange(e.target.value)}
                onBlur={handleTvaRateBlur}
                placeholder="20"
                className="w-32 bg-transparent backdrop-blur-xl border-white/20 dark:border-white/10"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Le taux saisi sera sauvegardé comme préférence pour les prochaines factures
              </p>
            </div>
          )}

          {/* Aperçu du total */}
          {amountHt && (
            <GlassCard className="p-4 bg-primary/5 dark:bg-primary/10 border-primary/20">
              {tva293b ? (
                // Affichage sans TVA (293B)
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Montant HT/TTC :</span>
                    <span className="text-lg font-bold">
                      {parseFloat(amountHt).toLocaleString("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">TVA non applicable (Article 293B)</span>
                    <span className="text-xs font-medium">0,00€</span>
                  </div>
                </>
              ) : (
                // Affichage avec TVA normale
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total HT :</span>
                    <span className="text-lg font-bold">
                      {(parseFloat(amountHt) / (1 + effectiveTvaRate)).toLocaleString("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-muted-foreground">TVA ({vatRatePercent.toFixed(2)}%) :</span>
                    <span className="text-sm font-medium">
                      {(parseFloat(amountHt) - parseFloat(amountHt) / (1 + effectiveTvaRate)).toLocaleString("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                      })}
                    </span>
                  </div>
                </>
              )}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                <span className="text-sm font-semibold">Total {tva293b ? '' : 'TTC'} :</span>
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
            disabled={loading || !clientId || !description.trim() || !amountHt || (mode === "from-quote" && !quoteId)}
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

