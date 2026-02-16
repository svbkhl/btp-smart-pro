/**
 * Éditeur direct de devis détaillé (100% manuel, sans IA)
 * Permet de saisir les lignes AVANT la création DB
 * Crée le devis en DB uniquement lors de la sauvegarde
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
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
import { useCreateDetailedQuote, useUpdateDetailedQuote } from "@/hooks/useDetailedQuotes";
import { QuoteSectionsEditor } from "./QuoteSectionsEditor";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Save, FileText, User, MapPin } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCompanyId } from "@/hooks/useCompanyId";
import { supabase } from "@/integrations/supabase/client";
import { useCreateQuoteSection } from "@/hooks/useQuoteSections";
import { useCreateQuoteLine } from "@/hooks/useQuoteLines";
import { useSearchQuoteSectionLibrary, useUpsertQuoteSectionLibrary } from "@/hooks/useQuoteSectionLibrary";
import { useSearchQuoteLineLibrary, useUpsertQuoteLineLibrary } from "@/hooks/useQuoteLineLibrary";
import { computeQuoteTotals, type QuoteLine } from "@/utils/quoteCalculations";
import { SectionTitleInput } from "./SectionTitleInput";
import { LineLabelInput } from "./LineLabelInput";
import { QuoteDisplay } from "@/components/ai/QuoteDisplay";
import { downloadQuotePDF } from "@/services/pdfService";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useQuoteSections } from "@/hooks/useQuoteSections";
import { useQuoteLines } from "@/hooks/useQuoteLines";
import { useQuotes } from "@/hooks/useQuotes";
import { CheckCircle2, Download, X, Send } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { SendToClientModal } from "@/components/billing/SendToClientModal";

interface DetailedQuoteEditorProps {
  onSuccess?: (quoteId: string) => void;
  onCancel?: () => void;
  onClose?: () => void; // Callback pour fermer complètement (fermer le dialog)
}

// Types locaux pour sections et lignes en mémoire
interface LocalSection {
  id: string; // ID temporaire
  title: string;
  position: number;
}

interface LocalLine {
  id: string; // ID temporaire
  section_id: string; // Référence au section_id local
  label: string;
  unit: string;
  quantity: number | null;
  unit_price_ht: number | null;
  position: number;
}

export const DetailedQuoteEditor = ({ onSuccess, onCancel, onClose }: DetailedQuoteEditorProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isSendToClientOpen, setIsSendToClientOpen] = useState(false);
  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const { data: companySettings } = useCompanySettings();
  const updateCompanySettings = useUpdateCompanySettings();
  const createDetailedQuote = useCreateDetailedQuote();
  const updateDetailedQuote = useUpdateDetailedQuote();
  const createSection = useCreateQuoteSection();
  const createLine = useCreateQuoteLine();
  const upsertSectionLibrary = useUpsertQuoteSectionLibrary();
  const upsertLineLibrary = useUpsertQuoteLineLibrary();

  // État du devis
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
  
  // État local des sections et lignes (avant sauvegarde DB)
  const [localSections, setLocalSections] = useState<LocalSection[]>([]);
  const [localLines, setLocalLines] = useState<LocalLine[]>([]);
  
  // État après création DB
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [quoteTotals, setQuoteTotals] = useState({
    subtotal_ht: 0,
    total_tva: 0,
    total_ttc: 0,
  });

  // Hooks pour l'aperçu
  const { data: companyInfo } = useUserSettings();
  const { data: sections = [] } = useQuoteSections(quoteId || undefined);
  const { data: lines = [] } = useQuoteLines(quoteId || undefined);
  const { data: quotes = [] } = useQuotes();
  const previewQuote = quotes.find(q => q.id === quoteId);

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
    setQuoteTotals(totals);
  }, [localLines, tvaRate, tva293b]);

  // Gérer changement TVA/293B (local seulement)
  const handleTvaRateChange = (rate: number) => {
    setTvaRate(rate);
    setTvaRateInput((rate * 100).toFixed(2));
    // Sauvegarder préférence (mais pas en DB du devis tant qu'il n'est pas créé)
    updateCompanySettings.mutateAsync({
      default_tva_rate: rate,
    }).catch((err: any) => {
      // Gérer silencieusement les erreurs 404 (table n'existe pas)
      if (err.code !== "PGRST204" && !err.message?.includes("Could not find") && !err.message?.includes("404")) {
        console.error("Error updating company settings:", err);
      }
    });
  };

  const handleTvaRateInputChange = (value: string) => {
    // Permettre la saisie libre sans reformater immédiatement
    setTvaRateInput(value);
    // Mettre à jour le taux seulement si c'est un nombre valide et complet
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100 && value.trim() !== "") {
      setTvaRate(numValue / 100);
      // Ne pas reformater l'input ici pour permettre la saisie libre
    }
  };

  const handleTvaRateBlur = () => {
    const numValue = parseFloat(tvaRateInput);
    if (isNaN(numValue) || numValue < 0) {
      // Valeur invalide, restaurer la dernière valeur valide
      setTvaRateInput((tvaRate * 100).toFixed(2));
    } else if (numValue > 100) {
      // Limiter à 100%
      const finalRate = 1;
      setTvaRateInput("100.00");
      setTvaRate(finalRate);
      // Sauvegarder préférence
      updateCompanySettings.mutateAsync({
        default_tva_rate: finalRate,
      }).catch((err: any) => {
        if (err.code !== "PGRST204" && !err.message?.includes("Could not find") && !err.message?.includes("404")) {
          console.error("Error updating company settings:", err);
        }
      });
    } else {
      // Valeur valide, formater et sauvegarder
      const finalRate = numValue / 100;
      setTvaRateInput(numValue.toFixed(2));
      setTvaRate(finalRate);
      // Sauvegarder préférence
      updateCompanySettings.mutateAsync({
        default_tva_rate: finalRate,
      }).catch((err: any) => {
        if (err.code !== "PGRST204" && !err.message?.includes("Could not find") && !err.message?.includes("404")) {
          console.error("Error updating company settings:", err);
        }
      });
    }
  };

  const handleTva293bChange = (value: boolean) => {
    const newTva293b = value;
    const newTvaRate = newTva293b ? 0 : tvaRate;
    
    setTva293b(newTva293b);
    if (newTva293b) {
      setTvaRate(0);
    }
    
    // Sauvegarder préférence
    updateCompanySettings.mutateAsync({
        default_tva_293b: newTva293b,
        default_tva_rate: newTvaRate,
    }).catch(err => console.error("Error updating company settings:", err));
  };

  // Gérer sections locales
  const handleAddSection = () => {
    const newSection: LocalSection = {
      id: `temp-section-${Date.now()}`,
      title: "", // Vide pour que le placeholder s'affiche
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
    // Supprimer aussi les lignes de cette section
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

  // Sauvegarder le devis (créer en DB + sauvegarder sections/lignes)
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
      if (!companyId) {
        throw new Error("Vous devez être membre d'une entreprise");
      }

      const selectedClient = clients.find((c) => c.id === clientId);
      if (!selectedClient) {
        throw new Error("Client introuvable");
      }

      console.log("🔧 [DetailedQuoteEditor] Sauvegarde devis détaillé:", {
        client_id: clientId,
        sections_count: localSections.length,
        lines_count: localLines.length,
      });

      // 1. Créer le devis en DB
      const newQuote = await createDetailedQuote.mutateAsync({
        client_id: clientId,
        client_name: selectedClient.name,
            tva_rate: tva293b ? 0 : tvaRate,
            tva_non_applicable_293b: tva293b,
      });

      console.log("✅ [DetailedQuoteEditor] Devis créé:", newQuote.id);
      setQuoteId(newQuote.id);


      // 2. Créer les sections en DB (si table existe) + sauvegarder dans bibliothèque
      const sectionMap = new Map<string, string>(); // temp_id -> real_id
      
      // D'abord sauvegarder tous les titres dans la bibliothèque (même si table sections n'existe pas)
      for (const localSection of localSections) {
        if (localSection.title.trim()) {
          try {
            await upsertSectionLibrary.mutateAsync({ title: localSection.title.trim() });
          } catch (libError: any) {
            // Gérer silencieusement les erreurs 404 (table n'existe pas)
            if (libError.code === "PGRST204" || libError.message?.includes("Could not find") || libError.message?.includes("404")) {
              // Table n'existe pas, ignorer silencieusement
            } else {
              console.warn("⚠️ Erreur sauvegarde bibliothèque section:", libError);
            }
          }
        }
      }
      
      // Ensuite créer les sections en DB (OBLIGATOIRE avant les lignes)
      let sectionsCreated = false;
      try {
        for (let i = 0; i < localSections.length; i++) {
          const localSection = localSections[i];
          if (!localSection.title.trim()) {
            console.warn(`⚠️ Section sans titre ignorée: ${localSection.id}`);
            continue;
          }
          
          const dbSection = await createSection.mutateAsync({
            quote_id: newQuote.id,
            title: localSection.title.trim(),
            position: i,
          });
          sectionMap.set(localSection.id, dbSection.id);
          sectionsCreated = true;
          console.log(`✅ Section créée: ${localSection.title} (temp: ${localSection.id}) -> DB UUID: ${dbSection.id}`);
        }
      } catch (sectionError: any) {
        console.error("❌ Erreur création sections:", sectionError);
        // Si les sections ne peuvent pas être créées, on ne peut pas créer les lignes non plus
        // (car les lignes ont besoin de section_id)
        if (sectionError.message?.includes("Could not find") || sectionError.code === "PGRST204" || sectionError.message?.includes("404")) {
      toast({
            title: "⚠️ Tables manquantes",
            description: "Les tables quote_sections et quote_lines ne sont pas disponibles. Veuillez exécuter la migration SQL dans Supabase.",
        variant: "destructive",
      });
          // On continue quand même pour sauvegarder le quote de base
        } else {
          throw sectionError; // Propager les autres erreurs
        }
      }

      // 3. Sauvegarder les prestations dans la bibliothèque + créer les lignes en DB (si table existe)
      // D'abord sauvegarder toutes les prestations dans la bibliothèque (même si table lignes n'existe pas)
      for (const localLine of localLines) {
        if (localLine.label.trim() && localLine.unit) {
          try {
            await upsertLineLibrary.mutateAsync({
              label: localLine.label.trim(),
              default_unit: localLine.unit,
              default_unit_price_ht: localLine.unit_price_ht || undefined,
            });
          } catch (libError: any) {
            // Gérer silencieusement les erreurs 404 (table n'existe pas)
            if (libError.code === "PGRST204" || libError.message?.includes("Could not find") || libError.message?.includes("404")) {
              // Table n'existe pas, ignorer silencieusement
            } else {
              console.warn("⚠️ Erreur sauvegarde bibliothèque ligne:", libError);
            }
          }
        }
      }
      
      // Ensuite créer les lignes en DB (SEULEMENT si sections créées)
      let linesCreated = false;
      if (sectionsCreated && localLines.length > 0) {
        try {
          let linePosition = 0;
          for (const localLine of localLines) {
            // CRITIQUE : Utiliser le mapping temp_id -> real_uuid
            const realSectionId = sectionMap.get(localLine.section_id);
            if (!realSectionId) {
              console.error(`❌ Section introuvable pour ligne ${localLine.id}: temp_id=${localLine.section_id}`);
              console.error("   Mapping actuel:", Array.from(sectionMap.entries()));
              console.error("   Sections locales:", localSections.map(s => ({ id: s.id, title: s.title })));
              continue; // Skip cette ligne si section pas trouvée
            }

            if (!localLine.label.trim()) {
              console.warn(`⚠️ Ligne sans label ignorée: ${localLine.id}`);
              continue;
            }

            await createLine.mutateAsync({
              quote_id: newQuote.id,
              section_id: realSectionId, // UUID réel de la section créée en DB
              label: localLine.label.trim(),
              unit: localLine.unit || null,
              quantity: localLine.quantity || null,
              unit_price_ht: localLine.unit_price_ht || null,
              position: linePosition++,
            });
            linesCreated = true;
          }
          console.log(`✅ ${localLines.length} ligne(s) créée(s) avec mapping sections correct`);
        } catch (lineError: any) {
          console.error("❌ Erreur création lignes:", lineError);
          if (lineError.message?.includes("Could not find") || lineError.code === "PGRST204" || lineError.message?.includes("404")) {
            toast({
              title: "⚠️ Table quote_lines manquante",
              description: "La table quote_lines n'est pas disponible. Veuillez exécuter la migration SQL.",
              variant: "destructive",
            });
          }
        }
      } else if (localLines.length > 0 && !sectionsCreated) {
        console.warn("⚠️ Impossible de créer les lignes : sections non créées");
      }

      // 4. Recalculer les totaux (sans RPC, calcul frontend + UPDATE)
      // Si des lignes ont été créées, recalculer les totaux depuis les lignes
      if (linesCreated && localLines.length > 0) {
        try {
          // Calculer les totaux depuis les lignes locales
          const linesForCalc = localLines.map(line => ({
            quantity: line.quantity ?? 0,
            unit_price_ht: line.unit_price_ht ?? 0,
            tva_rate: tva293b ? 0 : tvaRate,
          }));
          
          const totals = computeQuoteTotals(linesForCalc, tvaRate, tva293b);
          
          // Mettre à jour le devis avec les totaux calculés
          await updateDetailedQuote.mutateAsync({
            id: newQuote.id,
            subtotal_ht: totals.subtotal_ht,
            total_tva: totals.total_tva,
            total_ttc: totals.total_ttc,
          });
          
          console.log("✅ Totaux recalculés et mis à jour:", totals);
        } catch (calcError: any) {
          console.warn("⚠️ Erreur recalcul totaux:", calcError);
          // Essayer l'RPC en fallback si elle existe
          try {
            const { error: rpcError } = await supabase.rpc("recompute_quote_totals_with_293b", {
              p_quote_id: newQuote.id,
            });
            if (rpcError) {
              console.warn("⚠️ RPC recompute aussi en erreur:", rpcError);
            } else {
              console.log("✅ Totaux recalculés via RPC");
            }
          } catch (rpcError: any) {
            console.warn("⚠️ RPC n'existe pas ou erreur:", rpcError);
          }
        }
      } else {
        // Pas de lignes, totaux à 0
        try {
          await updateDetailedQuote.mutateAsync({
            id: newQuote.id,
            subtotal_ht: 0,
            total_tva: 0,
            total_ttc: 0,
          });
        } catch (updateError: any) {
          console.warn("⚠️ Erreur mise à jour totaux vides:", updateError);
        }
      }

      // 5. Sauvegarder les préférences
      await updateCompanySettings.mutateAsync({
        default_tva_rate: tvaRate,
        default_tva_293b: tva293b,
      });

      // 6. Enregistrer les textes du devis dans la Bibliothèque de phrases (tout ce qu'on met dans le devis)
      let phrasesAdded = 0;
      let phrasesTableMissing = false;
      try {
        const { data: existingData, error: existingError } = await supabase
          .from("text_snippets")
          .select("title")
          .eq("company_id", companyId);
        const err = existingError;
        if (err) {
          const msg = err?.message || "";
          const code = (err as any)?.code;
          if (code === "PGRST204" || (msg.includes("relation") && msg.includes("does not exist")) || msg.includes("Could not find")) {
            phrasesTableMissing = true;
            throw err;
          }
        }
        const existingTitles = new Set((existingData || []).map((r: { title: string }) => (r.title || "").trim()));
        const itemsToAdd: { title: string; content: string }[] = [];
        // Sections : titre uniquement (pas de description dupliquée)
        for (const s of localSections) {
          const t = s.title?.trim();
          if (t && t.length >= 2 && !existingTitles.has(t)) {
            itemsToAdd.push({ title: t, content: "" });
            existingTitles.add(t);
          }
        }
        // Lignes / prestations : titre = libellé, description = vide (éviter d'écrire 2 fois la même chose)
        for (const l of localLines) {
          const t = l.label?.trim();
          if (t && t.length >= 2 && !existingTitles.has(t)) {
            itemsToAdd.push({ title: t, content: "" });
            existingTitles.add(t);
          }
        }
        if (user && itemsToAdd.length > 0) {
          for (const { title, content } of itemsToAdd) {
            const { error: insertErr } = await supabase.from("text_snippets").insert({
              user_id: user.id,
              company_id: companyId,
              category: "description",
              title,
              content,
              usage_count: 0,
            });
            if (!insertErr) phrasesAdded++;
          }
          queryClient.invalidateQueries({ queryKey: ["text-snippets", companyId] });
        }
      } catch (phraseErr: any) {
        if (phraseErr?.code === "PGRST204" || phraseErr?.message?.includes("Could not find") || (phraseErr?.message?.includes("relation") && phraseErr?.message?.includes("does not exist"))) {
          phrasesTableMissing = true;
        } else if (phraseErr?.message !== "TABLE_TEXT_SNIPPETS_MISSING") {
          console.warn("⚠️ Enregistrement bibliothèque de phrases:", phraseErr);
        }
      }

      toast({
        title: "Devis créé",
        description: phrasesAdded > 0
          ? `Le devis a été sauvegardé. ${phrasesAdded} phrase(s) ajoutée(s) à la Bibliothèque de phrases.`
          : phrasesTableMissing && (localSections.some(s => s.title?.trim()) || localLines.some(l => l.label?.trim()))
            ? "Le devis a été créé. Pour enregistrer les phrases ici, exécutez la migration create_text_snippets_fixed.sql dans Supabase (SQL Editor)."
            : "Le devis a été créé et sauvegardé avec succès",
      });

      // Ouvrir l'aperçu après création
      setIsPreviewOpen(true);

      if (onSuccess) {
        onSuccess(newQuote.id);
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
  const canEdit = !!clientId; // Peut éditer dès qu'un client est sélectionné
  const hasContent = localSections.length > 0 || localLines.length > 0;

  // Handler pour télécharger le PDF
  const handleDownloadPDF = async () => {
    if (!previewQuote || !selectedClient || !companyInfo) return;

    try {
      // Préparer les lignes pour le PDF
      const pdfLines = lines.map(line => ({
        label: line.label,
        unit: line.unit || "",
        quantity: line.quantity || 0,
        unit_price_ht: line.unit_price_ht || 0,
        total_ht: line.total_ht,
            tva_rate: effectiveTvaRate,
        total_tva: line.total_tva,
        total_ttc: line.total_ttc,
        section_id: line.section_id,
      }));

      // Préparer les sections pour le PDF
      const pdfSections = sections.map(section => ({
        id: section.id,
        title: section.title,
        position: section.position,
      }));

      await downloadQuotePDF({
        result: {
          estimatedCost: previewQuote.total_ttc || previewQuote.estimated_cost || 0,
          quote_number: previewQuote.quote_number,
        },
        companyInfo,
        clientInfo: {
          name: selectedClient.name,
          email: selectedClient.email,
          phone: selectedClient.phone,
          location: selectedClient.location,
        },
        quoteDate: new Date(previewQuote.created_at),
        quoteNumber: previewQuote.quote_number,
        mode: "detailed",
        tvaRate: effectiveTvaRate,
        tva293b: tva293b,
        sections: pdfSections,
        lines: pdfLines,
        subtotal_ht: quoteTotals.subtotal_ht,
        total_tva: quoteTotals.total_tva,
        total_ttc: quoteTotals.total_ttc,
      });

      toast({
        title: "PDF téléchargé",
        description: "Le devis a été téléchargé avec succès",
      });
    } catch (error: any) {
      console.error("Erreur téléchargement PDF:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de télécharger le PDF",
        variant: "destructive",
      });
    }
  };

  // Si l'aperçu est ouvert, afficher l'aperçu au lieu de l'éditeur
  if (isPreviewOpen && previewQuote && selectedClient) {
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
                Le devis {previewQuote.quote_number} a été enregistré et est disponible dans la section Facturation.
              </p>
            </div>
          </div>
        </GlassCard>

        {/* Affichage du devis */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Devis {previewQuote.quote_number}
            </h2>
            <div className="flex flex-wrap gap-2">
              <Button variant="default" onClick={() => navigate("/facturation")} className="gap-2">
                <FileText className="w-4 h-4" />
                Ouvrir dans facturation
              </Button>
              <Button variant="outline" onClick={() => setIsSendToClientOpen(true)} className="gap-2">
                <Send className="w-4 h-4" />
                Envoyer au client
              </Button>
              <Button variant="outline" onClick={handleDownloadPDF} className="gap-2">
                <Download className="w-4 h-4" />
                Télécharger PDF
              </Button>
              <Button 
                onClick={() => {
                  setIsPreviewOpen(false);
                  if (onClose) {
                    onClose();
                  } else if (onCancel) {
                    onCancel();
                  }
                }} 
                variant="outline" 
                className="gap-2"
              >
                <X className="w-4 h-4" />
                Fermer
              </Button>
            </div>
          </div>

          {/* Aperçu PDF complet */}
          <div className="bg-white text-black p-6 rounded-lg max-w-4xl mx-auto quote-display" id="quote-to-export">
            {/* En-tête */}
            <div className="mb-6 pb-6 border-b-2 border-gray-300">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  {companyInfo?.company_logo_url && (
                    <img 
                      src={companyInfo.company_logo_url} 
                      alt="Logo" 
                      className="h-16 mb-4 object-contain"
                    />
                  )}
                  <div className="space-y-1">
                    <h1 className="text-2xl font-bold">{companyInfo?.company_name || 'Nom de l\'entreprise'}</h1>
                    {(companyInfo?.address || companyInfo?.postal_code || companyInfo?.city) && (
                      <p className="text-sm text-gray-600">
                        {[companyInfo.address, companyInfo.postal_code && companyInfo.city ? `${companyInfo.postal_code} ${companyInfo.city}` : companyInfo.city || companyInfo.postal_code].filter(Boolean).join(', ')}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-1">
                      {companyInfo?.phone && <span>Tél: {companyInfo.phone}</span>}
                      {companyInfo?.email && <span>Email: {companyInfo.email}</span>}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <h2 className="text-3xl font-bold mb-2">DEVIS</h2>
                  {previewQuote.quote_number && (
                    <p className="text-sm text-gray-600">N° {previewQuote.quote_number}</p>
                  )}
                  <p className="text-sm text-gray-600 mt-1">
                    Date: {new Date(previewQuote.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>

            {/* Informations client */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <User className="h-5 w-5" />
                Client
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-semibold text-lg">{selectedClient.name}</p>
                {selectedClient.location && (
                  <p className="text-sm text-gray-600 mt-1">
                    <MapPin className="h-4 w-4 inline mr-1" />
                    {selectedClient.location}
                  </p>
                )}
                <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-2">
                  {selectedClient.email && <span>Email: {selectedClient.email}</span>}
                  {selectedClient.phone && <span>Tél: {selectedClient.phone}</span>}
                </div>
              </div>
            </div>

            {/* Sections et lignes */}
            {sections.length > 0 && (
              <div className="mb-6">
                <h3 className="text-base font-semibold mb-3">Détail des prestations</h3>
                <div className="space-y-6">
                  {sections
                    .sort((a, b) => a.position - b.position)
                    .map((section, sectionIdx) => {
                      const sectionLines = lines
                        .filter((line) => line.section_id === section.id)
                        .sort((a, b) => a.position - b.position);
                      
                      if (sectionLines.length === 0) return null;

                      return (
                        <div key={section.id}>
                          <h4 className="font-semibold text-base mb-3 text-primary">
                            {sectionIdx + 1}. {section.title}
                          </h4>
                          <div className="overflow-x-auto border border-white/20 dark:border-white/10 rounded-lg bg-transparent backdrop-blur-xl">
                            <table className="w-full text-sm">
                              <thead className="bg-primary text-white">
                                <tr>
                                  <th className="text-left p-3">Désignation</th>
                                  <th className="text-center p-3">Unité</th>
                                  <th className="text-right p-3">Qté</th>
                                  <th className="text-right p-3">Prix unit. HT</th>
                                  <th className="text-right p-3">Prix HT</th>
                                  {!tva293b && <th className="text-right p-3">TVA</th>}
                                  <th className="text-right p-3">Total TTC</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sectionLines.map((line) => {
                                  const lineTva = !tva293b ? (line.total_ht * effectiveTvaRate) : 0;
                                  const lineTtc = line.total_ht + lineTva;
                                  return (
                                    <tr key={line.id} className="border-b hover:bg-gray-50">
                                      <td className="p-3">{line.label}</td>
                                      <td className="text-center p-3">{line.unit || "-"}</td>
                                      <td className="text-right p-3">{line.quantity?.toFixed(2) || "-"}</td>
                                      <td className="text-right p-3">{(line.unit_price_ht || 0).toFixed(2)} €</td>
                                      <td className="text-right p-3 font-medium">{(line.total_ht || 0).toFixed(2)} €</td>
                                      {!tva293b && (
                                        <td className="text-right p-3">{lineTva.toFixed(2)} €</td>
                                      )}
                                      <td className="text-right p-3 font-medium">{(lineTtc || line.total_ttc || 0).toFixed(2)} €</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Totaux */}
            <div className="mb-6">
              <div className="flex justify-end">
                <div className="w-80">
                  <table className="w-full border-collapse border">
                    <tbody>
                      <tr>
                        <td className="border p-3 text-right">Total HT</td>
                        <td className="border p-3 text-right font-medium">
                          {quoteTotals.subtotal_ht.toFixed(2)} €
                        </td>
                      </tr>
                      {!tva293b && (
                        <tr>
                          <td className="border p-3 text-right">
                            TVA ({effectiveTvaRate * 100}%)
                          </td>
                          <td className="border p-3 text-right">
                            {quoteTotals.total_tva.toFixed(2)} €
                          </td>
                        </tr>
                      )}
                      {tva293b && (
                        <tr>
                          <td className="border p-3 text-right text-sm text-muted-foreground">
                            TVA non applicable (Art. 293 B du CGI)
                          </td>
                          <td className="border p-3 text-right">0,00 €</td>
                        </tr>
                      )}
                      <tr className="bg-primary/10">
                        <td className="border p-3 text-right font-bold text-lg">Total à payer (TTC)</td>
                        <td className="border p-3 text-right font-bold text-lg text-primary">
                          {quoteTotals.total_ttc.toFixed(2)} €
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Pied de page : forme juridique, SIRET, TVA — au centre */}
            {(companyInfo?.legal_form || companyInfo?.siret || companyInfo?.vat_number) && (
              <div className="mt-6 pt-4 border-t border-gray-200 text-center text-xs text-gray-500">
                {[companyInfo?.legal_form, companyInfo?.siret && `SIRET: ${companyInfo.siret}`, companyInfo?.vat_number && `TVA: ${companyInfo.vat_number}`].filter(Boolean).join(' — ')}
              </div>
            )}

            {/* Signature */}
            <div className="mt-8 pt-4 border-t-2 border-gray-300">
              <div className="flex justify-between items-end">
                <div className="flex-1">
                  <p className="text-xs text-gray-600 mb-2">
                    Devis reçu avant exécution des travaux, bon pour accord
                  </p>
                  <div className="mt-6">
                    <p className="text-xs text-gray-600 border-t border-gray-300 pt-2 w-48">
                      Signature et date
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Modal Envoyer au client */}
        <SendToClientModal
          open={isSendToClientOpen}
          onOpenChange={setIsSendToClientOpen}
          documentType="quote"
          document={previewQuote}
          onSent={() => setIsSendToClientOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Paramètres devis */}
      <GlassCard className="p-4 sm:p-6">
        <div className="space-y-2 sm:space-y-4 mb-4">
          <h3 className="text-base sm:text-lg font-semibold">Paramètres du devis</h3>
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
              disabled={clientsLoading || !!quoteId}
            >
              <SelectTrigger id="client" className="bg-transparent backdrop-blur-xl border-white/20 dark:border-white/10">
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
                Sélectionnez un client pour commencer
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

          {/* Taux TVA (si pas 293B) - UNE SEULE CASE */}
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
                className="w-32 bg-transparent backdrop-blur-xl border-white/20 dark:border-white/10"
              />
              <p className="text-xs text-muted-foreground">
                Le taux saisi sera sauvegardé comme préférence pour les prochains devis
              </p>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Éditeur sections/lignes (affiché dès qu'un client est sélectionné) */}
      {canEdit ? (
        <GlassCard className="p-4 sm:p-6">
          <div className="space-y-2 sm:space-y-4 mb-4">
            <h3 className="text-base sm:text-lg font-semibold">Devis détaillé</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
                  Ajoutez des sections (corps de métier) et des lignes (prestations) avec quantités et prix
            </p>
              </div>
          <div>
            {quoteId ? (
              // Mode DB : utiliser QuoteSectionsEditor si devis déjà créé
            <QuoteSectionsEditor
              quoteId={quoteId}
              tvaRate={effectiveTvaRate}
              tva293b={tva293b}
              onTotalsChange={setQuoteTotals}
              onTva293bChange={handleTva293bChange}
            />
            ) : (
              // Mode local : éditeur en mémoire
              <div className="space-y-4">
                {/* Bouton ajouter section */}
                <Button onClick={handleAddSection} variant="outline" className="gap-2">
                  <span>+</span> Ajouter un titre (corps de métier)
                </Button>

                {/* Sections */}
                {localSections.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Aucune section pour le moment</p>
                    <p className="text-sm mt-2">Cliquez sur "Ajouter un titre" pour commencer</p>
              </div>
                )}

                {localSections.map((section, sectionIdx) => (
                  <div key={section.id} className="border border-white/20 dark:border-white/10 rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3 bg-transparent backdrop-blur-xl">
                    {/* En-tête section */}
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

                    {/* Lignes de la section */}
                    <div className="space-y-3 pl-4 border-l-2">
                      {localLines
                        .filter(line => line.section_id === section.id)
                        .map((line) => {
                          const lineTotal = (line.quantity ?? 0) * (line.unit_price_ht ?? 0);
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
                                    <SelectTrigger className="flex-1 sm:w-[140px] text-base min-h-[48px] px-3 sm:px-4 bg-transparent backdrop-blur-xl border-white/20 dark:border-white/10">
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
                                    className="flex-1 sm:w-[140px] text-base min-h-[48px] px-3 sm:px-4 py-3 font-medium bg-transparent backdrop-blur-xl border-white/20 dark:border-white/10"
                                    value={line.quantity ?? ""}
                                    onChange={(e) => handleUpdateLine(line.id, { quantity: parseFloat(e.target.value) || null })}
                                    placeholder="Qté"
                                  />
                                </div>
                                <div className="flex gap-2 items-center flex-1 sm:flex-initial">
                                  <Input
                                    type="number"
                                    className="flex-1 sm:w-[160px] text-base min-h-[48px] px-3 sm:px-4 py-3 font-medium bg-transparent backdrop-blur-xl border-white/20 dark:border-white/10"
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
              </div>
            )}
          </div>
        </GlassCard>
      ) : (
        <GlassCard className="p-8 text-center text-muted-foreground">
          <p>Veuillez sélectionner un client pour commencer</p>
        </GlassCard>
      )}

      {/* Actions */}
      {canEdit && (
      <div className="flex justify-between items-center pt-4 border-t">
        <div>
            {(hasContent || quoteTotals.subtotal_ht > 0) && (
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
              disabled={!clientId || isSaving || (localSections.length === 0 && localLines.length === 0)}
            className="gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                  Création en cours...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                  Créer le devis
              </>
            )}
          </Button>
        </div>
      </div>
      )}
    </div>
  );
};
