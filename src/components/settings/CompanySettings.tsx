import { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUserSettings, useUpdateUserSettings } from "@/hooks/useUserSettings";
import { useToast } from "@/components/ui/use-toast";
import { ImageUpload } from "@/components/ImageUpload";
import { Building2, Loader2, Save } from "lucide-react";
import { motion } from "framer-motion";

export const CompanySettings = () => {
  const { data: settings, isLoading } = useUserSettings();
  const updateSettings = useUpdateUserSettings();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

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
    app_base_url: "",
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        company_name: settings.company_name || "",
        email: settings.email || "",
        phone: settings.phone || "",
        address: settings.address || "",
        city: settings.city || "",
        postal_code: settings.postal_code || "",
        country: settings.country || "France",
        siret: settings.siret || "",
        vat_number: settings.vat_number || "",
        legal_form: settings.legal_form || "",
        company_logo_url: settings.company_logo_url || "",
        terms_and_conditions: settings.terms_and_conditions || "",
        app_base_url: settings.app_base_url || "",
      });
    }
  }, [settings]);

  const validateSIRET = (siret: string): boolean => {
    if (!siret) return true; // Optionnel
    return /^[0-9]{14}$/.test(siret);
  };

  const validateVAT = (vat: string): boolean => {
    if (!vat) return true; // Optionnel
    return /^[A-Z]{2}[A-Z0-9]{2,12}$/.test(vat);
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
      await updateSettings.mutateAsync(formData);
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
          <div>
            <ImageUpload
              label="Logo de l'entreprise"
              value={formData.company_logo_url}
              onChange={(url) => setFormData({ ...formData, company_logo_url: url })}
              folder="projects"
            />
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
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                placeholder="Ex: BTP Smart Pro"
                required
                className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="legal_form">Forme juridique</Label>
              <Select
                value={formData.legal_form}
                onValueChange={(value) => setFormData({ ...formData, legal_form: value })}
              >
                <SelectTrigger id="legal_form" className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50">
                  <SelectValue placeholder="Sélectionnez une forme juridique" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SARL">SARL</SelectItem>
                  <SelectItem value="SAS">SAS</SelectItem>
                  <SelectItem value="EURL">EURL</SelectItem>
                  <SelectItem value="SA">SA</SelectItem>
                  <SelectItem value="SNC">SNC</SelectItem>
                  <SelectItem value="Auto-entrepreneur">Auto-entrepreneur</SelectItem>
                  <SelectItem value="Autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Adresse */}
          <div className="space-y-2">
            <Label htmlFor="address">Adresse</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Ex: Paris"
                className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postal_code">Code postal</Label>
              <Input
                id="postal_code"
                value={formData.postal_code}
                onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                placeholder="Ex: 75001"
                className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Pays</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, siret: e.target.value.replace(/\D/g, "") })}
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
                onChange={(e) => setFormData({ ...formData, vat_number: e.target.value.toUpperCase() })}
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
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
              onChange={(e) => setFormData({ ...formData, terms_and_conditions: e.target.value })}
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

          {/* Configuration URL de l'application */}
          <div className="mt-8 pt-6 border-t border-border/50">
            <h3 className="font-semibold text-lg mb-4">Configuration des liens de signature</h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="app_base_url">
                  URL de base de l'application
                </Label>
                <Input
                  id="app_base_url"
                  type="url"
                  placeholder="https://votre-app.vercel.app ou https://abc123.ngrok.io"
                  value={formData.app_base_url}
                  onChange={(e) =>
                    setFormData({ ...formData, app_base_url: e.target.value })
                  }
                  className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50"
                />
                <p className="text-xs text-muted-foreground">
                  Cette URL sera utilisée pour générer les liens de signature dans les emails.
                  <br />
                  <strong>En développement :</strong> Utilisez ngrok (ex: https://abc123.ngrok.io)
                  <br />
                  <strong>En production :</strong> Votre URL Vercel/Netlify (ex: https://votre-app.vercel.app)
                </p>
              </div>
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



