/**
 * Éditeur direct de facture détaillée (100% manuel, identique aux devis)
 * Réutilise la même structure que DetailedQuoteEditor mais pour les factures
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useClients } from "@/hooks/useClients";
import { useCompanySettings, useUpdateCompanySettings } from "@/hooks/useCompanySettings";
import { useCreateInvoice, CreateInvoiceData } from "@/hooks/useInvoices";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Save, FileText, User, MapPin } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getCurrentCompanyId } from "@/utils/companyHelpers";
import { computeQuoteTotals } from "@/utils/quoteCalculations";
import { SectionTitleInput } from "@/components/quotes/SectionTitleInput";
import { LineLabelInput } from "@/components/quotes/LineLabelInput";
import { useSearchQuoteSectionLibrary, useUpsertQuoteSectionLibrary } from "@/hooks/useQuoteSectionLibrary";
import { useSearchQuoteLineLibrary, useUpsertQuoteLineLibrary } from "@/hooks/useQuoteLineLibrary";
import { GlassCard } from "@/components/ui/GlassCard";
import { CheckCircle2, Download, X } from "lucide-react";
import { InvoiceDisplay } from "./InvoiceDisplay";

interface DetailedInvoiceEditorProps {
  onSuccess?: (invoiceId: string) => void;
  onCancel?: () => void;
  onClose?: () => void;
}

interface LocalSection {
  id: string;
  title: string;
  position: number;
}

interface LocalLine {
  id: string;
  section_id: string;
  label: string;
  unit: string;
  quantity: number | null;
  unit_price_ht: number | null;
  position: number;
}

export const DetailedInvoiceEditor = ({ onSuccess, onCancel, onClose }: DetailedInvoiceEditorProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const { data: companySettings } = useCompanySettings();
  const updateCompanySettings = useUpdateCompanySettings();
  const createInvoice = useCreateInvoice();
  const upsertSectionLibrary = useUpsertQuoteSectionLibrary();
  const upsertLineLibrary = useUpsertQuoteLineLibrary();

  // État de la facture
  const [clientId, setClientId] = useState<string>("");
  const [tvaRate, setTvaRate] = useState<number>(
    companySettings?.default_tva_rate || companySettings?.default_quote_tva_rate || 0.20
  );
  const [tva293b, setTva293b] = useState<boolean>(
    companySettings?.default_tva_293b || false
  );
  const [tvaRateInput, setTvaRateInput] = useState<string>(
    ((companySettings?.default_tva_rate || companySettings?.default_quote_tva_rate || 0.20) * 100).toFixed(2)
  );
  
  // État local des sections et lignes
  const [localSections, setLocalSections] = useState<LocalSection[]>([]);
  const [localLines, setLocalLines] = useState<LocalLine[]>([]);
  
  // État après création DB
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState<any>(null);

  // Totaux calculés
  const [invoiceTotals, setInvoiceTotals] = useState({
    subtotal_ht: 0,
    total_tva: 0,
    total_ttc: 0,
  });

  // Charger les préférences au montage
  useEffect(() => {
    if (companySettings) {
      setTvaRate(companySettings.default_tva_rate || companySettings.default_quote_tva_rate || 0.20);
      setTva293b(companySettings.default_tva_293b || false);
    }
  }, [companySettings]);

  // Recalculer les totaux quand sections/lignes changent
  useEffect(() => {
    const effectiveTvaRate = tva293b ? 0 : tvaRate;
    const linesForCalc = localLines.map(line => ({
      quantity: line.quantity ?? 0,
      unit_price_ht: line.unit_price_ht ?? 0,
      tva_rate: effectiveTvaRate,
    }));
    
    const totals = computeQuoteTotals(linesForCalc, effectiveTvaRate, tva293b);
    setInvoiceTotals(totals);
  }, [localLines, tvaRate, tva293b]);

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
    } else {
      const finalRate = numValue / 100;
      setTvaRateInput(numValue.toFixed(2));
      setTvaRate(finalRate);
    }
  };

  const handleTva293bChange = (value: boolean) => {
    setTva293b(value);
    if (value) {
      setTvaRate(0);
    }
  };

  // Gérer sections locales
  const handleAddSection = () => {
    const newSection: LocalSection = {
      id: `temp-section-${Date.now()}`,
      title: "",
      position: localSections.length,
    };
    setLocalSections([...localSections, newSection]);
  };

  const handleUpdateSection = (sectionId: string, title: string) => {
    setLocalSections(sections =>
      sections.map(s => s.id === sectionId ? { ...s, title } : s)
    );
  };

  const handleDeleteSection = (sectionId: string) => {
    setLocalSections(sections => sections.filter(s => s.id !== sectionId));
    setLocalLines(lines => lines.filter(l => l.section_id !== sectionId));
  };

  // Gérer lignes locales
  const handleAddLine = (sectionId: string) => {
    const section = localSections.find(s => s.id === sectionId);
    if (!section) return;

    const sectionLines = localLines.filter(l => l.section_id === sectionId);
    const newLine: LocalLine = {
      id: `temp-line-${Date.now()}`,
      section_id: sectionId,
      label: "",
      unit: "u",
      quantity: 1,
      unit_price_ht: 0,
      position: sectionLines.length,
    };
    setLocalLines([...localLines, newLine]);
  };

  const handleUpdateLine = (lineId: string, updates: Partial<LocalLine>) => {
    setLocalLines(lines =>
      lines.map(l => l.id === lineId ? { ...l, ...updates } : l)
    );
  };

  const handleDeleteLine = (lineId: string) => {
    setLocalLines(lines => lines.filter(l => l.id !== lineId));
  };

  // Sauvegarder la facture
  const handleSave = async () => {
    if (!user || !clientId) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un client",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const selectedClient = clients.find((c) => c.id === clientId);
      if (!selectedClient) {
        throw new Error("Client introuvable");
      }

      // Construire la description depuis les sections et lignes
      const descriptionParts: string[] = [];
      localSections.forEach((section, idx) => {
        if (section.title.trim()) {
          descriptionParts.push(`${idx + 1}. ${section.title}`);
          const sectionLines = localLines.filter(l => l.section_id === section.id);
          sectionLines.forEach((line, lineIdx) => {
            if (line.label.trim()) {
              const qty = line.quantity || 0;
              const price = line.unit_price_ht || 0;
              descriptionParts.push(`  ${idx + 1}.${lineIdx + 1} ${line.label} - ${qty} ${line.unit} × ${price.toFixed(2)} € HT`);
            }
          });
        }
      });

      // Créer les service_lines pour la facture
      const serviceLines = localLines
        .filter(line => line.label.trim() && line.quantity && line.unit_price_ht)
        .map(line => ({
          description: line.label.trim(),
          quantity: line.quantity || 0,
          unit_price: line.unit_price_ht || 0,
        }));

      // Créer la facture
      const invoiceData: CreateInvoiceData = {
        client_id: clientId,
        client_name: selectedClient.name,
        client_email: selectedClient.email,
        client_address: selectedClient.location,
        description: descriptionParts.join('\n') || "Facture détaillée",
        amount_ht: invoiceTotals.subtotal_ht,
        vat_rate: tva293b ? 0 : tvaRate,
        service_lines: serviceLines.length > 0 ? serviceLines : undefined,
      };

      const newInvoice = await createInvoice.mutateAsync(invoiceData);

      // Sauvegarder dans les bibliothèques
      for (const localSection of localSections) {
        if (localSection.title.trim()) {
          try {
            await upsertSectionLibrary.mutateAsync({ title: localSection.title.trim() });
          } catch (err: any) {
            // Ignorer silencieusement
          }
        }
      }

      for (const localLine of localLines) {
        if (localLine.label.trim() && localLine.unit) {
          try {
            await upsertLineLibrary.mutateAsync({
              label: localLine.label.trim(),
              default_unit: localLine.unit,
              default_unit_price_ht: localLine.unit_price_ht || undefined,
            });
          } catch (err: any) {
            // Ignorer silencieusement
          }
        }
      }

      setInvoiceId(newInvoice.id);
      setCreatedInvoice(newInvoice);

      toast({
        title: "Facture créée",
        description: "La facture a été créée et sauvegardée avec succès",
      });

      if (onSuccess) {
        onSuccess(newInvoice.id);
      }
    } catch (error: any) {
      console.error("❌ Erreur sauvegarde facture:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de sauvegarder la facture",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const selectedClient = clients.find((c) => c.id === clientId);
  const effectiveTvaRate = tva293b ? 0 : tvaRate;
  const canEdit = !!clientId;
  const hasContent = localSections.length > 0 || localLines.length > 0;

  // Si facture créée, afficher l'aperçu
  if (createdInvoice && selectedClient) {
    return (
      <div className="space-y-6">
        <GlassCard className="p-6 border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
            <div className="flex-1">
              <h3 className="font-semibold text-green-900 dark:text-green-100">
                Facture créée avec succès !
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300">
                La facture {createdInvoice.invoice_number} a été enregistrée.
              </p>
            </div>
          </div>
        </GlassCard>

        <InvoiceDisplay
          invoice={createdInvoice}
          onClose={() => {
            if (onClose) {
              onClose();
            } else if (onCancel) {
              onCancel();
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Paramètres facture */}
      <GlassCard className="p-4 sm:p-6">
        <div className="space-y-2 sm:space-y-4 mb-4">
          <h3 className="text-base sm:text-lg font-semibold">Paramètres de la facture</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Configurez le client et les options de TVA
          </p>
        </div>
        <div className="space-y-4">
          {/* Sélection client */}
          <div className="space-y-2">
            <Label htmlFor="client">Client *</Label>
            <Select
              value={clientId}
              onValueChange={setClientId}
              disabled={clientsLoading || !!invoiceId}
            >
              <SelectTrigger id="client" className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50">
                <SelectValue placeholder="Sélectionner un client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* TVA 293B */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="tva_293b"
                checked={tva293b}
                onCheckedChange={(checked) => handleTva293bChange(checked === true)}
              />
              <Label htmlFor="tva_293b" className="cursor-pointer">
                TVA non applicable - Article 293 B du CGI
              </Label>
            </div>
          </div>

          {/* Taux TVA */}
          {!tva293b && (
            <div className="space-y-2">
              <Label htmlFor="tva_rate">Taux de TVA (%)</Label>
              <Input
                id="tva_rate"
                type="text"
                inputMode="decimal"
                value={tvaRateInput}
                onChange={(e) => handleTvaRateInputChange(e.target.value)}
                onBlur={handleTvaRateBlur}
                placeholder="20"
                className="w-32 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50"
              />
            </div>
          )}
        </div>
      </GlassCard>

      {/* Éditeur sections/lignes */}
      {canEdit && (
        <GlassCard className="p-4 sm:p-6">
          <div className="space-y-2 sm:space-y-4 mb-4">
            <h3 className="text-base sm:text-lg font-semibold">Facture détaillée</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Ajoutez des sections (corps de métier) et des lignes (prestations) avec quantités et prix
            </p>
          </div>
          <div>
            <div className="space-y-4">
              <Button onClick={handleAddSection} variant="outline" className="gap-2">
                <span>+</span> Ajouter un titre (corps de métier)
              </Button>

              {localSections.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Aucune section pour le moment</p>
                  <p className="text-sm mt-2">Cliquez sur "Ajouter un titre" pour commencer</p>
                </div>
              )}

              {localSections.map((section) => (
                <div key={section.id} className="border border-white/20 dark:border-white/10 rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3 bg-white/5 dark:bg-black/5 backdrop-blur-sm">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                    <SectionTitleInput
                      value={section.title}
                      onChange={(title) => handleUpdateSection(section.id, title)}
                      placeholder="Titre de la section (ex: Plâtrerie - Isolation)"
                      className="font-semibold flex-1 text-sm sm:text-base"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSection(section.id)}
                      className="w-full sm:w-auto"
                    >
                      Supprimer
                    </Button>
                  </div>

                  <div className="space-y-3 pl-4 border-l-2">
                    {localLines
                      .filter(line => line.section_id === section.id)
                      .map((line) => {
                        const lineTotal = (line.quantity || 0) * (line.unit_price_ht || 0);
                        return (
                          <div key={line.id} className="space-y-3 p-3 rounded-lg border border-border/50 bg-background/50">
                            {/* Ligne 1: Champ Prestation (pleine largeur) */}
                            <LineLabelInput
                              className="w-full text-base min-h-[48px] px-4 py-3"
                              value={line.label}
                              onChange={(label) => handleUpdateLine(line.id, { label })}
                              onSelect={async (item) => {
                                handleUpdateLine(line.id, {
                                  label: item.label,
                                  unit: item.unit || "u",
                                  unit_price_ht: item.price || 0,
                                });
                                if (item.label.trim() && item.unit) {
                                  try {
                                    await upsertLineLibrary.mutateAsync({
                                      label: item.label.trim(),
                                      default_unit: item.unit,
                                      default_unit_price_ht: item.price,
                                    });
                                  } catch (error) {
                                    // Ignorer silencieusement les erreurs 404 (table n'existe pas)
                                    console.warn("⚠️ Erreur sauvegarde bibliothèque ligne:", error);
                                  }
                                }
                              }}
                              placeholder="Prestation (description complète)"
                            />
                            
                            {/* Ligne 2: Unité, Quantité, Prix HT, Total, Supprimer */}
                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-stretch sm:items-center w-full">
                              <div className="flex gap-2 flex-1">
                                <Select
                                  value={line.unit}
                                  onValueChange={(value) => handleUpdateLine(line.id, { unit: value })}
                                >
                                  <SelectTrigger className="flex-1 sm:w-[140px] text-base min-h-[48px] px-3 sm:px-4 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="m²">m²</SelectItem>
                                    <SelectItem value="ml">ml</SelectItem>
                                    <SelectItem value="h">h</SelectItem>
                                    <SelectItem value="u">u</SelectItem>
                                    <SelectItem value="forfait">forfait</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Input
                                  type="number"
                                  className="flex-1 sm:w-[140px] text-base min-h-[48px] px-3 sm:px-4 py-3 font-medium bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50"
                                  value={line.quantity ?? ""}
                                  onChange={(e) => handleUpdateLine(line.id, { quantity: parseFloat(e.target.value) || null })}
                                  placeholder="Qté"
                                />
                              </div>
                              <div className="flex gap-2 items-center flex-1 sm:flex-initial">
                                <Input
                                  type="number"
                                  className="flex-1 sm:w-[160px] text-base min-h-[48px] px-3 sm:px-4 py-3 font-medium bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50"
                                  value={line.unit_price_ht ?? ""}
                                  onChange={(e) => handleUpdateLine(line.id, { unit_price_ht: parseFloat(e.target.value) || null })}
                                  placeholder="Prix HT"
                                />
                                <div className="min-w-[80px] sm:w-[140px] text-right font-semibold text-sm sm:text-base min-h-[48px] flex items-center justify-end whitespace-nowrap">
                                  {lineTotal.toFixed(2)} €
                                </div>
                                <Button
                                  variant="ghost"
                                  size="default"
                                  onClick={() => handleDeleteLine(line.id)}
                                  className="min-h-[48px] min-w-[48px] text-xl font-bold flex-shrink-0"
                                >
                                  ×
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddLine(section.id)}
                      className="mt-2"
                    >
                      + Ajouter une ligne
                    </Button>
                  </div>
                </div>
              ))}

              {/* Totaux */}
              {hasContent && (
                <div className="border-t pt-4 mt-4">
                  <div className="flex justify-end">
                    <div className="w-80 space-y-2">
                      <div className="flex justify-between">
                        <span>Total HT:</span>
                        <span className="font-medium">{invoiceTotals.subtotal_ht.toFixed(2)} €</span>
                      </div>
                      {!tva293b && (
                        <div className="flex justify-between">
                          <span>TVA ({effectiveTvaRate * 100}%):</span>
                          <span className="font-medium">{invoiceTotals.total_tva.toFixed(2)} €</span>
                        </div>
                      )}
                      <div className="flex justify-between text-lg font-bold border-t pt-2">
                        <span>Total TTC:</span>
                        <span className="text-primary">{invoiceTotals.total_ttc.toFixed(2)} €</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Bouton sauvegarder */}
              <Button
                onClick={handleSave}
                disabled={isSaving || !hasContent || !clientId}
                className="w-full"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Création en cours...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Créer la facture
                  </>
                )}
              </Button>
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
};
