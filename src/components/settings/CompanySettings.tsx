import { useState, useEffect, useRef } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUserSettings, useUpdateUserSettings } from "@/hooks/useUserSettings";
import { useToast } from "@/components/ui/use-toast";
import { ImageUpload } from "@/components/ImageUpload";
import { SignatureCanvas } from "@/components/SignatureCanvas";
import { EmailSignatureEditor } from "@/components/EmailSignatureEditor";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useCompanies } from "@/hooks/useCompany";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, Loader2, Save, FileSignature } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";

export const CompanySettings = () => {
  const { user } = useAuth();
  const { data: settings, isLoading } = useUserSettings();
  const updateSettings = useUpdateUserSettings();
  const { companyId } = useCompanyId();
  const { data: companies } = useCompanies();
  const queryClient = useQueryClient();
  const currentCompany = companyId && companies?.length ? companies.find((c) => c.id === companyId) ?? companies[0] : null;
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [savedSignatureData, setSavedSignatureData] = useState<string>("");
  const [savedSignatureName, setSavedSignatureName] = useState<string>("");

  const [formData, setFormData] = useState({
    company_name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    postal_code: "",
    country: "France",
    siret: "",
    vat_number: "",
    legal_form: "",
    company_logo_url: "",
    terms_and_conditions: "",
    signature_data: "",
    signature_name: "",
  });

  // Référence pour éviter les réinitialisations pendant la saisie
  const isInitializedRef = useRef(false);
  const previousLogoRef = useRef<string>("");
  const previousSignatureRef = useRef<string>("");

  useEffect(() => {
    if (settings) {
      const currentLogo = settings.company_logo_url || "";
      const currentSignature = settings.signature_data || "";

      // Initialiser au premier chargement : nom = companies.name (celui choisi par l'admin) ou user_settings
      if (!isInitializedRef.current) {
        const initialCompanyName = currentCompany?.name?.trim() || settings.company_name || "";
        setFormData({
          company_name: initialCompanyName,
          email: settings.email || "",
          phone: settings.phone || "",
          address: settings.address || "",
          city: settings.city || "",
          postal_code: settings.postal_code || "",
          country: settings.country || "France",
          siret: settings.siret || "",
          vat_number: settings.vat_number || "",
          legal_form: settings.legal_form || "",
          company_logo_url: currentLogo,
          terms_and_conditions: settings.terms_and_conditions || "",
          signature_data: currentSignature,
          signature_name: settings.signature_name || "",
        });
        setSavedSignatureData(currentSignature);
        setSavedSignatureName(settings.signature_name || "");
        previousLogoRef.current = currentLogo;
        previousSignatureRef.current = currentSignature;
        isInitializedRef.current = true;
      } else {
        // Après l'initialisation, mettre à jour seulement le logo et la signature si ils ont changé
        // pour éviter de réinitialiser les champs en cours de saisie
        if (previousLogoRef.current !== currentLogo && currentLogo) {
          console.log("🖼️ [CompanySettings] Mise à jour du logo:", currentLogo);
          setFormData((prev) => ({
            ...prev,
            company_logo_url: currentLogo,
          }));
          previousLogoRef.current = currentLogo;
        }
        
        if (previousSignatureRef.current !== currentSignature) {
          setFormData((prev) => ({
            ...prev,
            signature_data: currentSignature,
            signature_name: settings.signature_name || prev.signature_name || "",
          }));
          setSavedSignatureData(currentSignature);
          setSavedSignatureName(settings.signature_name || "");
          previousSignatureRef.current = currentSignature;
        }
        // Synchroniser le nom entreprise depuis companies (choisi par l'admin) si le champ est vide
        if (currentCompany?.name?.trim() && !formData.company_name?.trim()) {
          setFormData((prev) => ({ ...prev, company_name: currentCompany.name.trim() }));
        }
      }
    }
  }, [settings, currentCompany?.name]);

  const validateSIRET = (siret: string): boolean => {
    if (!siret) return true; // Optionnel
    return /^[0-9]{14}$/.test(siret);
  };

  const validateVAT = (vat: string): boolean => {
    if (!vat) return true; // Optionnel
    return /^[A-Z]{2}[A-Z0-9]{2,12}$/.test(vat);
  };

  const handleSaveSignature = async () => {
    if (!formData.signature_data) {
      toast({
        title: "Signature vide",
        description: "Veuillez dessiner une signature avant de l'enregistrer.",
        variant: "destructive",
      });
      return;
    }

    if (!settings) {
      toast({
        title: "Chargement en cours",
        description: "Veuillez patienter pendant le chargement des paramètres.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Sauvegarder uniquement la signature (pas besoin d'envoyer toutes les données)
      await updateSettings.mutateAsync({
        signature_data: formData.signature_data,
        signature_name: formData.signature_name,
      });
      // Marquer la signature comme sauvegardée
      setSavedSignatureData(formData.signature_data);
      setSavedSignatureName(formData.signature_name);
      toast({
        title: "Signature sauvegardée",
        description: "Votre signature électronique a été enregistrée avec succès.",
      });
    } catch (error: any) {
      console.error("Erreur lors de la sauvegarde de la signature:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de sauvegarder la signature. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (formData.siret && !validateSIRET(formData.siret)) {
      toast({
        title: "Erreur de validation",
        description: "Le numéro SIRET doit contenir exactement 14 chiffres",
        variant: "destructive",
      });
      return;
    }

    if (formData.vat_number && !validateVAT(formData.vat_number)) {
      toast({
        title: "Erreur de validation",
        description: "Le numéro de TVA doit être au format FR12345678901 (2 lettres + 2-12 caractères)",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      console.log('🔵 [CompanySettings] Saving company name:', formData.company_name);
      await updateSettings.mutateAsync(formData);
      // Garder companies.name en sync avec le nom affiché (sidebar + paramètres)
      if (companyId && formData.company_name?.trim()) {
        console.log('🔵 [CompanySettings] Updating companies table with name:', formData.company_name.trim());
        console.log('🔵 [CompanySettings] Company ID:', companyId);
        
        // D'abord, vérifier si la company existe
        const { data: existingCompany, error: fetchError } = await supabase
          .from("companies")
          .select("*")
          .eq("id", companyId)
          .single();
        
        console.log('🔵 [CompanySettings] Existing company:', existingCompany, 'Error:', fetchError);
        
        const { data: updateResult, error: updateError, count } = await supabase
          .from("companies")
          .update({ name: formData.company_name.trim(), updated_at: new Date().toISOString() })
          .eq("id", companyId)
          .select();
        
        if (updateError) {
          console.error('❌ [CompanySettings] Error updating companies:', updateError);
        } else {
          console.log('✅ [CompanySettings] Companies updated successfully:', updateResult);
          console.log('✅ [CompanySettings] Rows affected:', updateResult?.length || 0);
        }
        
        // Invalider ET refetch immédiatement pour mise à jour instantanée dans la sidebar
        // IMPORTANT: Utiliser la même queryKey que useCompanies() avec user?.id
        console.log('🔵 [CompanySettings] Invalidating queries with keys:', ["companies", user?.id], ["company", companyId]);
        await queryClient.invalidateQueries({ queryKey: ["companies", user?.id] });
        await queryClient.invalidateQueries({ queryKey: ["company", companyId] });
        console.log('🔵 [CompanySettings] Refetching companies...');
        await queryClient.refetchQueries({ queryKey: ["companies", user?.id] });
        console.log('✅ [CompanySettings] Cache invalidated and refetched!');
      }
      toast({
        title: "Paramètres sauvegardés",
        description: "Les informations de l'entreprise ont été mises à jour avec succès.",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de sauvegarder les paramètres",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <GlassCard className="p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </GlassCard>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <GlassCard className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-semibold">Informations de l'entreprise</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Ces informations apparaîtront sur vos devis, factures et signatures
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Logo */}
          <div className="space-y-2">
            <ImageUpload
              label="Logo de l'entreprise"
              value={settings?.company_logo_url || formData.company_logo_url || ""}
              onChange={async (url) => {
                // Mettre à jour formData immédiatement pour afficher le logo
                setFormData((prev) => ({ ...prev, company_logo_url: url }));
                
                // Sauvegarder automatiquement le logo après l'upload
                if (url) {
                  try {
                    const result = await updateSettings.mutateAsync({
                      company_logo_url: url,
                    });
                    
                    // S'assurer que formData est mis à jour avec la valeur sauvegardée
                    if (result?.company_logo_url) {
                      setFormData((prev) => ({ ...prev, company_logo_url: result.company_logo_url || url }));
                    }
                    
                    toast({
                      title: "Logo sauvegardé",
                      description: "Le logo de l'entreprise a été enregistré avec succès.",
                    });
                  } catch (error: any) {
                    console.error("Erreur lors de la sauvegarde du logo:", error);
                    toast({
                      title: "Erreur",
                      description: error.message || "Le logo a été uploadé mais n'a pas pu être sauvegardé. Veuillez réessayer.",
                      variant: "destructive",
                    });
                  }
                }
              }}
              folder="projects"
            />
            {formData.company_logo_url && formData.company_logo_url === settings?.company_logo_url && (
              <p className="text-xs text-green-600 dark:text-green-400">
                ✓ Logo enregistré. Il apparaîtra sur vos devis et factures.
              </p>
            )}
          </div>

          {/* Nom et Forme juridique */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">
                Nom de l'entreprise <span className="text-destructive">*</span>
              </Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData((prev) => ({ ...prev, company_name: value }));
                }}
                placeholder="Ex: BTP Smart Pro"
                required
                className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="legal_form">Forme juridique (optionnel)</Label>
              <Input
                id="legal_form"
                value={formData.legal_form}
                onChange={(e) => setFormData((prev) => ({ ...prev, legal_form: e.target.value }))}
                placeholder="Ex: SAS au capital social de 10 000 €, Auto-entrepreneur, SARL..."
                className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50"
              />
              <p className="text-xs text-muted-foreground">
                Texte libre : forme juridique, capital social, etc. S’affiche en bas au centre des devis et factures.
              </p>
            </div>
          </div>

          {/* Adresse */}
          <div className="space-y-2">
            <Label htmlFor="address">Adresse</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
              placeholder="Ex: 123 Rue de la Construction"
              className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50"
            />
          </div>

          {/* Ville, Code postal, Pays */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">Ville</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                placeholder="Ex: Paris"
                className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postal_code">Code postal</Label>
              <Input
                id="postal_code"
                value={formData.postal_code}
                onChange={(e) => setFormData((prev) => ({ ...prev, postal_code: e.target.value }))}
                placeholder="Ex: 75001"
                className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Pays</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => setFormData((prev) => ({ ...prev, country: e.target.value }))}
                placeholder="Ex: France"
                className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50"
              />
            </div>
          </div>

          {/* SIRET et TVA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="siret">Numéro SIRET</Label>
              <Input
                id="siret"
                value={formData.siret}
                onChange={(e) => setFormData((prev) => ({ ...prev, siret: e.target.value.replace(/\D/g, "") }))}
                placeholder="14 chiffres"
                maxLength={14}
                className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50"
              />
              <p className="text-xs text-muted-foreground">
                Format: 14 chiffres (ex: 12345678901234)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vat_number">Numéro de TVA intracommunautaire</Label>
              <Input
                id="vat_number"
                value={formData.vat_number}
                onChange={(e) => setFormData((prev) => ({ ...prev, vat_number: e.target.value.toUpperCase() }))}
                placeholder="Ex: FR12345678901"
                className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50"
              />
              <p className="text-xs text-muted-foreground">
                Format: 2 lettres + 2-12 caractères (ex: FR12345678901)
              </p>
            </div>
          </div>

          {/* Coordonnées */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email de contact</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="contact@entreprise.fr"
                className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="+33 1 23 45 67 89"
                className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50"
              />
            </div>
          </div>

          {/* Conditions générales */}
          <div className="space-y-2">
            <Label htmlFor="terms_and_conditions">Mentions légales / Conditions générales</Label>
            <Textarea
              id="terms_and_conditions"
              value={formData.terms_and_conditions}
              onChange={(e) => setFormData((prev) => ({ ...prev, terms_and_conditions: e.target.value }))}
              placeholder="Conditions générales de vente, mentions légales..."
              rows={6}
              className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50"
            />
            <p className="text-xs text-muted-foreground">
              Ces mentions apparaîtront sur vos devis et factures
            </p>
          </div>

          {/* Bouton de sauvegarde */}
          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={saving} className="gap-2 rounded-xl">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sauvegarde...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Enregistrer les modifications
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Signature : documents (devis/factures) + emails */}
        <div className="mt-8 pt-6 border-t border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <FileSignature className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-lg">Signature</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Signature pour vos documents (devis, factures) et texte de fin pour vos emails. Les deux sont utilisés automatiquement.
          </p>

          {/* 1. Signature électronique (dessin) pour devis et factures */}
          <div className="space-y-4 mb-8">
            <h4 className="font-medium text-sm text-foreground">Signature pour les documents (devis et factures)</h4>
            <SignatureCanvas
              value={formData.signature_data}
              onChange={(signatureData) => {
                setFormData((prev) => ({ ...prev, signature_data: signatureData }));
              }}
              signerName={formData.signature_name}
              onSignerNameChange={(name) => {
                setFormData((prev) => ({ ...prev, signature_name: name }));
              }}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                onClick={handleSaveSignature}
                disabled={saving || !formData.signature_data}
                className="gap-2 rounded-xl"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sauvegarde...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Enregistrer la signature
                  </>
                )}
              </Button>
            </div>
            {savedSignatureData && 
             formData.signature_data === savedSignatureData && 
             formData.signature_name === savedSignatureName && (
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-green-800 dark:text-green-200 mb-2">✓ Signature documents enregistrée</p>
                    {savedSignatureName && (
                      <p className="text-xs text-green-600 dark:text-green-400">Signataire : {savedSignatureName}</p>
                    )}
                  </div>
                  <img src={savedSignatureData} alt="Aperçu" className="w-24 h-12 object-contain bg-white rounded border border-green-300 dark:border-green-700 p-1 flex-shrink-0" />
                </div>
              </div>
            )}
            {formData.signature_data && 
             (formData.signature_data !== savedSignatureData || formData.signature_name !== savedSignatureName) && (
              <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800">
                <p className="text-xs text-yellow-800 dark:text-yellow-200">⚠️ Signature modifiée : enregistrez pour appliquer.</p>
              </div>
            )}
          </div>

          {/* 2. Signature email (texte) pour la fin des emails */}
          <div className="pt-6 border-t border-border/50">
            <h4 className="font-medium text-sm text-foreground mb-2">Signature pour les emails</h4>
            <p className="text-xs text-muted-foreground mb-4">
              Ce texte sera ajouté à la fin de vos emails (devis, factures, relances).
            </p>
            <EmailSignatureEditor />
          </div>
        </div>

          {/* Informations sur les fonctionnalités automatiques */}
        <div className="mt-8 pt-6 border-t border-border/50 space-y-4">
          <h3 className="font-semibold text-lg mb-4">Fonctionnalités automatiques</h3>
          
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-white/50 dark:bg-gray-800/50 border border-border/50">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h4 className="font-semibold text-sm">Signature automatique</h4>
                  <p className="text-sm text-muted-foreground">
                    Les devis seront automatiquement signés avec votre signature
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-white/50 dark:bg-gray-800/50 border border-border/50">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h4 className="font-semibold text-sm">Envoi automatique par email</h4>
                  <p className="text-sm text-muted-foreground">
                    Les devis et factures seront automatiquement envoyés aux clients
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
              <h4 className="font-semibold text-sm mb-2">Numérotation automatique</h4>
              <p className="text-sm text-muted-foreground">
                Les documents sont automatiquement numérotés :<br />
                • Devis : <strong>DEVIS-YYYY-NNN</strong> (ex: DEVIS-2025-001)<br />
                • Factures : <strong>FACTURE-YYYY-NNN</strong> (ex: FACTURE-2025-001)<br />
                La numérotation repart à 001 chaque année.
              </p>
            </div>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
};



