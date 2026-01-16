/**
 * Éditeur direct de devis détaillé (sans wizard)
 * Permet de créer un devis avec sections et lignes directement
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useCreateQuote } from "@/hooks/useQuotes";
import { QuoteSectionsEditor } from "./QuoteSectionsEditor";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Save, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getCurrentCompanyId } from "@/utils/companyHelpers";
import { supabase } from "@/integrations/supabase/client";

interface DetailedQuoteEditorProps {
  onSuccess?: (quoteId: string) => void;
  onCancel?: () => void;
}

export const DetailedQuoteEditor = ({ onSuccess, onCancel }: DetailedQuoteEditorProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const { data: companySettings } = useCompanySettings();
  const updateCompanySettings = useUpdateCompanySettings();
  const createQuote = useCreateQuote();

  // État du devis
  const [clientId, setClientId] = useState<string>("");
  const [tvaRate, setTvaRate] = useState<number>(
    companySettings?.default_tva_rate || companySettings?.default_quote_tva_rate || 0.20
  );
  const [tva293b, setTva293b] = useState<boolean>(
    companySettings?.default_tva_293b || false
  );
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [quoteTotals, setQuoteTotals] = useState({
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

  // Créer le devis initial si pas encore créé
  useEffect(() => {
    const createInitialQuote = async () => {
      if (!user || quoteId || !clientId) return;

      try {
        const companyId = await getCurrentCompanyId(user.id);
        if (!companyId) {
          toast({
            title: "Erreur",
            description: "Vous devez être membre d'une entreprise",
            variant: "destructive",
          });
          return;
        }

        const selectedClient = clients.find((c) => c.id === clientId);
        if (!selectedClient) {
          // Client sélectionné mais pas trouvé, attendre
          return;
        }

        // Créer un devis draft
        const quoteData = {
          client_name: selectedClient.name,
          client_id: clientId,
          estimated_cost: 0,
          mode: "detailed" as const,
          tva_rate: tva293b ? 0 : tvaRate,
          tva_non_applicable_293b: tva293b,
          subtotal_ht: 0,
          total_tva: 0,
          total_ttc: 0,
        };

        const newQuote = await createQuote.mutateAsync(quoteData);
        setQuoteId(newQuote.id);
        console.log("✅ Devis initial créé:", newQuote.id);
      } catch (error: any) {
        console.error("❌ Erreur création devis initial:", error);
        toast({
          title: "Erreur",
          description: error.message || "Impossible de créer le devis",
          variant: "destructive",
        });
      }
    };

    if (user && clientId && !quoteId) {
      createInitialQuote();
    }
  }, [user, clientId, quoteId, createQuote, clients, tvaRate, tva293b, toast]);

  // Gérer changement TVA/293B
  const handleTvaRateChange = async (rate: number) => {
    setTvaRate(rate);
    // Persister
    try {
      await updateCompanySettings.mutateAsync({
        default_tva_rate: rate,
      });
    } catch (error) {
      console.error("Error updating company settings:", error);
    }
  };

  const handleTva293bChange = async (value: boolean) => {
    const newTva293b = value;
    const newTvaRate = newTva293b ? 0 : tvaRate;
    
    setTva293b(newTva293b);
    if (newTva293b) {
      setTvaRate(0);
    }
    
    // Mettre à jour le devis si déjà créé
    if (quoteId && user) {
      try {
        const companyId = await getCurrentCompanyId(user.id);
        if (companyId) {
          await supabase
            .from("ai_quotes")
            .update({
              tva_rate: newTvaRate,
              tva_non_applicable_293b: newTva293b,
              updated_at: new Date().toISOString(),
            })
            .eq("id", quoteId)
            .eq("company_id", companyId);
        }
      } catch (error) {
        console.error("Error updating quote TVA:", error);
      }
    }
    
    // Persister dans company_settings
    try {
      await updateCompanySettings.mutateAsync({
        default_tva_293b: newTva293b,
        default_tva_rate: newTvaRate,
      });
    } catch (error) {
      console.error("Error updating company settings:", error);
    }
  };

  // Sauvegarder le devis (mettre à jour les totaux)
  const handleSave = async () => {
    if (!quoteId || !user) {
      toast({
        title: "Erreur",
        description: "Devis non créé ou utilisateur non connecté",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const companyId = await getCurrentCompanyId(user.id);
      if (!companyId) {
        throw new Error("User is not a member of any company");
      }

      // Utiliser la fonction SQL pour recalculer les totaux (plus fiable)
      const { error: rpcError } = await supabase.rpc("recompute_quote_totals_with_293b", {
        p_quote_id: quoteId,
      });

      if (rpcError) {
        console.warn("⚠️ Erreur RPC recompute, fallback sur update manuel:", rpcError);
        // Fallback : mise à jour manuelle
        const { error } = await supabase
          .from("ai_quotes")
          .update({
            subtotal_ht: quoteTotals.subtotal_ht,
            total_tva: quoteTotals.total_tva,
            total_ttc: quoteTotals.total_ttc,
            tva_rate: tva293b ? 0 : tvaRate,
            tva_non_applicable_293b: tva293b,
            updated_at: new Date().toISOString(),
          })
          .eq("id", quoteId)
          .eq("company_id", companyId);

        if (error) throw error;
      }

      toast({
        title: "Devis sauvegardé",
        description: "Le devis a été sauvegardé avec succès",
      });

      if (onSuccess) {
        onSuccess(quoteId);
      }
    } catch (error: any) {
      console.error("❌ Erreur sauvegarde devis:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de sauvegarder le devis",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const selectedClient = clients.find((c) => c.id === clientId);
  const effectiveTvaRate = tva293b ? 0 : tvaRate;

  return (
    <div className="space-y-6">
      {/* Paramètres devis */}
      <Card>
        <CardHeader>
          <CardTitle>Paramètres du devis</CardTitle>
          <CardDescription>
            Configurez le client et les options de TVA
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Sélection client */}
          <div className="space-y-2">
            <Label htmlFor="client">Client *</Label>
            <Select
              value={clientId}
              onValueChange={setClientId}
              disabled={clientsLoading}
            >
              <SelectTrigger id="client">
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
            {!clientId && (
              <p className="text-xs text-muted-foreground">
                Vous devez sélectionner un client pour créer le devis
              </p>
            )}
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
            <p className="text-xs text-muted-foreground">
              Cocher si votre entreprise est exonérée de TVA selon l'article 293 B du Code Général des Impôts
            </p>
          </div>

          {/* Taux TVA (si pas 293B) */}
          {!tva293b && (
            <div className="space-y-2">
              <Label htmlFor="tva_rate">Taux de TVA</Label>
              <div className="flex items-center gap-2">
                <Select
                  value={tvaRate.toString()}
                  onValueChange={(value) => handleTvaRateChange(parseFloat(value))}
                >
                  <SelectTrigger className="w-32" id="tva_rate">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0%</SelectItem>
                    <SelectItem value="0.055">5.5%</SelectItem>
                    <SelectItem value="0.10">10%</SelectItem>
                    <SelectItem value="0.20">20%</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={(tvaRate * 100).toFixed(2)}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value) && value >= 0 && value <= 100) {
                      handleTvaRateChange(value / 100);
                    }
                  }}
                  className="w-24"
                  placeholder="Taux personnalisé"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Le taux sélectionné sera sauvegardé comme préférence pour les prochains devis
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Éditeur sections/lignes */}
      {quoteId ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Devis détaillé</CardTitle>
                <CardDescription>
                  Ajoutez des sections (corps de métier) et des lignes (prestations) avec quantités et prix
                </CardDescription>
              </div>
              {/* Bouton optionnel "Remplir avec l'IA" */}
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => {
                  toast({
                    title: "Fonctionnalité à venir",
                    description: "Le remplissage automatique par IA sera disponible prochainement",
                  });
                }}
              >
                <Sparkles className="h-4 w-4" />
                Remplir avec l'IA
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <QuoteSectionsEditor
              quoteId={quoteId}
              tvaRate={effectiveTvaRate}
              tva293b={tva293b}
              onTotalsChange={setQuoteTotals}
              onTva293bChange={handleTva293bChange}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {clientId ? (
              <div className="space-y-2">
                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                <p>Création du devis en cours...</p>
              </div>
            ) : (
              <p>Veuillez sélectionner un client pour commencer</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-between items-center pt-4 border-t">
        <div>
          {quoteTotals.subtotal_ht > 0 && (
            <div className="text-sm space-y-1">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Total HT:</span>
                <span className="font-medium">
                  {quoteTotals.subtotal_ht.toLocaleString("fr-FR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  €
                </span>
              </div>
              {!tva293b && (
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">TVA ({((effectiveTvaRate || 0) * 100).toFixed(2)}%):</span>
                  <span className="font-medium">
                    {quoteTotals.total_tva.toLocaleString("fr-FR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    €
                  </span>
                </div>
              )}
              {tva293b && (
                <div className="text-xs text-muted-foreground italic">
                  TVA non applicable - Article 293 B du CGI
                </div>
              )}
              <div className="flex justify-between gap-4 pt-1 border-t">
                <span className="font-semibold">Total TTC:</span>
                <span className="font-bold text-lg">
                  {quoteTotals.total_ttc.toLocaleString("fr-FR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  €
                </span>
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Annuler
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={!quoteId || isSaving || !clientId}
            className="gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sauvegarde...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Sauvegarder le devis
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
