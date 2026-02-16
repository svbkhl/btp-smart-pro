import { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useUserSettings, useUpdateUserSettings } from "@/hooks/useUserSettings";
import { useToast } from "@/components/ui/use-toast";
import { FileText, Loader2, Save } from "lucide-react";
import { motion } from "framer-motion";

export const DocumentSettings = () => {
  const { data: settings, isLoading } = useUserSettings();
  const updateSettings = useUpdateUserSettings();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    terms_and_conditions: "",
    auto_signature: false,
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        terms_and_conditions: settings.terms_and_conditions || "",
        auto_signature: settings.auto_signature ?? false,
      });
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      console.log("💾 Sauvegarde des paramètres de documents:", formData);
      
      await updateSettings.mutateAsync({
        terms_and_conditions: formData.terms_and_conditions,
        auto_signature: formData.auto_signature,
      });
      
      console.log("✅ Paramètres sauvegardés avec succès");
      
      toast({
        title: "Paramètres sauvegardés",
        description: "Les paramètres de devis et factures ont été mis à jour.",
      });
    } catch (error: any) {
      console.error("❌ Erreur lors de la sauvegarde:", error);
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
          <FileText className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-semibold">Paramètres Devis & Factures</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Configurez le modèle, les mentions légales et les options d'envoi
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Mentions légales */}
          <div className="space-y-2">
            <Label htmlFor="terms_and_conditions">Mentions légales</Label>
            <Textarea
              id="terms_and_conditions"
              value={formData.terms_and_conditions}
              onChange={(e) => setFormData({ ...formData, terms_and_conditions: e.target.value })}
              placeholder="Conditions générales de vente, mentions légales, modalités de paiement..."
              rows={8}
              className="bg-transparent backdrop-blur-xl border-white/20 dark:border-white/10"
            />
            <p className="text-xs text-muted-foreground">
              Ces mentions apparaîtront automatiquement sur tous vos devis et factures
            </p>
          </div>

          {/* Options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-transparent backdrop-blur-xl border border-white/20 dark:border-white/10">
              <div className="space-y-0.5">
                <Label htmlFor="auto_signature">Signature automatique</Label>
                <p className="text-sm text-muted-foreground">
                  Les devis seront automatiquement signés avec votre signature
                </p>
              </div>
              <Switch
                id="auto_signature"
                checked={formData.auto_signature}
                onCheckedChange={(checked) => setFormData({ ...formData, auto_signature: checked })}
              />
            </div>
          </div>

          {/* Informations sur la numérotation */}
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
            <h3 className="font-semibold text-sm mb-2">Numérotation automatique</h3>
            <p className="text-sm text-muted-foreground">
              Les documents sont automatiquement numérotés :<br />
              • Devis : <strong>DEVIS-YYYY-NNN</strong> (ex: DEVIS-2025-001)<br />
              • Factures : <strong>FACTURE-YYYY-NNN</strong> (ex: FACTURE-2025-001)<br />
              La numérotation repart à 001 chaque année.
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
      </GlassCard>
    </motion.div>
  );
};



