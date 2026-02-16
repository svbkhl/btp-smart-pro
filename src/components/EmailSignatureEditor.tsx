import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useUserSettings, useUpdateUserSettings } from "@/hooks/useUserSettings";
import { useToast } from "@/components/ui/use-toast";
import { Save, Loader2 } from "lucide-react";

export const EmailSignatureEditor = () => {
  const { data: settings } = useUserSettings();
  const updateSettings = useUpdateUserSettings();
  const { toast } = useToast();
  const [signature, setSignature] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      // Charger la signature existante si elle existe, sinon créer une par défaut
      if (settings.signature_data) {
        setSignature(settings.signature_data);
        console.log("✅ Signature chargée depuis les settings:", settings.signature_data);
      } else {
        // Créer une signature par défaut si elle n'existe pas
        const defaultSignature = settings.signature_name
          ? `${settings.signature_name}\n${settings.company_name || ""}\n${settings.email || ""}\n${settings.phone || ""}`
          : "";
        setSignature(defaultSignature);
        console.log("ℹ️ Aucune signature existante, utilisation de la signature par défaut");
      }
    }
  }, [settings]);

  const handleSave = async () => {
    console.log("🔵 handleSave appelé");
    console.log("🔵 Signature à sauvegarder:", signature);
    console.log("🔵 updateSettings:", updateSettings);

    if (!signature.trim()) {
      toast({
        title: "Signature vide",
        description: "Veuillez saisir une signature avant de l'enregistrer",
        variant: "destructive",
      });
      return;
    }

    if (!updateSettings) {
      console.error("❌ updateSettings n'est pas disponible");
      toast({
        title: "Erreur",
        description: "Le service de mise à jour n'est pas disponible. Veuillez rafraîchir la page.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      console.log("🔄 Début de la sauvegarde...");
      console.log("🔄 Données à sauvegarder:", { signature_data: signature.trim() });
      
      const result = await updateSettings.mutateAsync({
        signature_data: signature.trim(),
      });

      console.log("✅ Signature sauvegardée avec succès:", result);
      
      toast({
        title: "Signature sauvegardée",
        description: "Votre signature email a été mise à jour avec succès.",
      });
    } catch (error: any) {
      console.error("❌ Erreur lors de la sauvegarde:", error);
      console.error("❌ Détails de l'erreur:", {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
      });
      toast({
        title: "Erreur",
        description: error?.message || error?.details || "Impossible de sauvegarder la signature. Vérifiez la console pour plus de détails.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
      console.log("🏁 handleSave terminé");
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email_signature">Signature email</Label>
        <Textarea
          id="email_signature"
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
          placeholder="Votre nom
Nom de l'entreprise
Email: contact@entreprise.fr
Tél: +33 1 23 45 67 89"
          rows={6}
          className="bg-transparent backdrop-blur-xl border-white/20 dark:border-white/10 font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Cette signature sera automatiquement ajoutée à la fin de vos emails
        </p>
      </div>
      <Button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleSave();
        }}
        disabled={saving || !signature.trim()}
        size="sm"
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
  );
};



