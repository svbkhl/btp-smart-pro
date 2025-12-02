import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Mail, Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const ConnectWithEmail = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [emailType, setEmailType] = useState<"gmail" | "outlook" | "smtp">("gmail");
  const [connected, setConnected] = useState(false);
  const [emailConfig, setEmailConfig] = useState({
    smtp_host: "",
    smtp_port: "587",
    smtp_user: "",
    smtp_password: "",
  });

  // Pré-remplir les paramètres SMTP selon le type sélectionné
  useEffect(() => {
    if (emailType === "gmail" && !connected) {
      setEmailConfig({
        smtp_host: "smtp.gmail.com",
        smtp_port: "587",
        smtp_user: emailConfig.smtp_user || "",
        smtp_password: "",
      });
    } else if (emailType === "outlook" && !connected) {
      setEmailConfig({
        smtp_host: "smtp-mail.outlook.com",
        smtp_port: "587",
        smtp_user: emailConfig.smtp_user || "",
        smtp_password: "",
      });
    }
  }, [emailType]);

  // Charger la configuration email au montage
  useEffect(() => {
    const loadEmailConfig = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("user_email_settings")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (data && !error) {
          setConnected(true);
          // Déterminer le type : gmail, outlook, ou smtp
          const provider = data.provider;
          if (provider === "gmail" || provider === "outlook") {
            setEmailType(provider);
          } else {
            setEmailType("smtp");
          }
          setEmailConfig({
            smtp_host: data.smtp_host || (provider === "gmail" ? "smtp.gmail.com" : provider === "outlook" ? "smtp-mail.outlook.com" : ""),
            smtp_port: data.smtp_port?.toString() || "587",
            smtp_user: data.smtp_user || "",
            smtp_password: "", // Ne pas afficher le mot de passe
          });
          console.log("✅ Configuration email chargée:", provider);
        } else {
          setConnected(false);
          console.log("ℹ️ Aucune configuration email trouvée");
        }
      } catch (error) {
        console.error("Erreur chargement config email:", error);
        setConnected(false);
      }
    };

    loadEmailConfig();
  }, [user]);

  const handleConnect = async () => {
    console.log("🔵 handleConnect appelé");
    console.log("🔵 État actuel:", { emailType, emailConfig, user: user?.id });

    if (!user) {
      console.error("❌ Utilisateur non connecté");
      toast({
        title: "Erreur",
        description: "Vous devez être connecté",
        variant: "destructive",
      });
      return;
    }

    // Validation des champs SMTP (pour tous les types)
    if (!emailConfig.smtp_host || !emailConfig.smtp_port || !emailConfig.smtp_user || !emailConfig.smtp_password) {
      console.error("❌ Champs manquants:", {
        smtp_host: !!emailConfig.smtp_host,
        smtp_port: !!emailConfig.smtp_port,
        smtp_user: !!emailConfig.smtp_user,
        smtp_password: !!emailConfig.smtp_password,
      });
      toast({
        title: "Champs manquants",
        description: "Veuillez remplir tous les champs SMTP",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    console.log("🔄 Début de la sauvegarde...");

    try {
      const configData = {
        user_id: user.id,
        provider: emailType === "smtp" ? "resend" : emailType,
        smtp_host: emailConfig.smtp_host,
        smtp_port: parseInt(emailConfig.smtp_port),
        smtp_user: emailConfig.smtp_user,
        smtp_password: emailConfig.smtp_password,
        from_email: emailConfig.smtp_user || user.email || "",
        from_name: user.user_metadata?.full_name || "BTP Smart Pro",
      };

      console.log("📤 Données à sauvegarder:", { ...configData, smtp_password: "***" });

      // Sauvegarder la configuration dans la base de données
      const { data, error } = await supabase
        .from("user_email_settings")
        .upsert(configData, {
          onConflict: "user_id",
        })
        .select()
        .single();

      console.log("📥 Réponse Supabase:", { data, error });

      if (error) {
        console.error("❌ Erreur Supabase complète:", JSON.stringify(error, null, 2));
        console.error("❌ Code d'erreur:", error.code);
        console.error("❌ Message d'erreur:", error.message);
        console.error("❌ Détails:", error.details);
        console.error("❌ Hint:", error.hint);
        
        // Si la table n'existe pas, essayer de la créer ou afficher un message clair
        if (error.code === "PGRST116" || error.message?.includes("does not exist") || error.message?.includes("relation") || error.message?.includes("table")) {
          toast({
            title: "Table manquante",
            description: "La table user_email_settings n'existe pas. Veuillez exécuter le script SQL CREATE-USER-EMAIL-SETTINGS.sql dans Supabase.",
            variant: "destructive",
          });
          throw new Error("Table user_email_settings n'existe pas. Code: " + error.code);
        } else if (error.code === "23505") {
          // Violation de contrainte unique - l'enregistrement existe déjà, utiliser update
          console.log("ℹ️ Enregistrement existe déjà, utilisation de update...");
          const { data: updateData, error: updateError } = await supabase
            .from("user_email_settings")
            .update(configData)
            .eq("user_id", user.id)
            .select()
            .single();
          
          if (updateError) {
            console.error("❌ Erreur lors de l'update:", updateError);
            throw updateError;
          }
          
          console.log("✅ Configuration mise à jour avec succès:", updateData);
          setConnected(true);
          toast({
            title: "Email connecté",
            description: `Votre compte ${emailType === "gmail" ? "Gmail" : emailType === "outlook" ? "Outlook" : "SMTP"} a été configuré avec succès.`,
          });
          return;
        } else {
          throw error;
        }
      }

      setConnected(true);
      console.log("✅ Configuration email sauvegardée:", data);
      
      toast({
        title: "Email connecté",
        description: `Votre compte ${emailType === "gmail" ? "Gmail" : emailType === "outlook" ? "Outlook" : "SMTP"} a été configuré avec succès.`,
      });
    } catch (error: any) {
      console.error("❌ Erreur connexion email complète:", error);
      console.error("❌ Type d'erreur:", typeof error);
      console.error("❌ Erreur stringifiée:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      
      let errorMessage = "Impossible de connecter l'email.";
      
      if (error?.code === "PGRST116" || error?.message?.includes("does not exist") || error?.message?.includes("relation")) {
        errorMessage = "La table user_email_settings n'existe pas. Veuillez exécuter le script SQL CREATE-USER-EMAIL-SETTINGS.sql dans Supabase.";
      } else if (error?.code === "23505") {
        errorMessage = "Un compte email est déjà configuré pour cet utilisateur.";
      } else if (error?.code === "42501") {
        errorMessage = "Permission refusée. Vérifiez les politiques RLS de la table user_email_settings.";
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      } else if (error?.error?.message) {
        errorMessage = error.error.message;
      }
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      console.log("🏁 handleConnect terminé");
    }
  };

  const handleDisconnect = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("user_email_settings")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;

      setConnected(false);
      setEmailConfig({
        smtp_host: "",
        smtp_port: "587",
        smtp_user: "",
        smtp_password: "",
      });
      
      console.log("✅ Configuration email supprimée");
      
      toast({
        title: "Email déconnecté",
        description: "Votre compte email a été déconnecté.",
      });
    } catch (error: any) {
      console.error("❌ Erreur déconnexion email:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de déconnecter l'email",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Type de compte email</Label>
        <Select value={emailType} onValueChange={(value: any) => setEmailType(value)}>
          <SelectTrigger className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gmail">Gmail (OAuth)</SelectItem>
            <SelectItem value="outlook">Outlook (OAuth)</SelectItem>
            <SelectItem value="smtp">SMTP Professionnel</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {(emailType === "smtp" || emailType === "gmail" || emailType === "outlook") && !connected && (
        <div className="space-y-4 p-4 rounded-lg bg-white/50 dark:bg-gray-800/50 border border-border/50">
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg mb-4">
            <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-xs text-blue-900 dark:text-blue-100">
              <p className="font-semibold mb-1">Configuration SMTP requise</p>
              <p>Vous devez configurer votre serveur SMTP pour envoyer des emails. Utilisez les paramètres de votre fournisseur d'email.</p>
            </div>
          </div>
          
          {emailType === "gmail" && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg mb-4">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-900 dark:text-blue-100">
                <p className="font-semibold mb-1">Configuration Gmail</p>
                <p className="mb-2">Pour Gmail, vous devez utiliser un <strong>Mot de passe d'application</strong> et non votre mot de passe habituel :</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Allez sur votre compte Google → Sécurité</li>
                  <li>Activez la validation en 2 étapes si ce n'est pas déjà fait</li>
                  <li>Créez un "Mot de passe d'application"</li>
                  <li>Utilisez ce mot de passe ici (16 caractères)</li>
                </ol>
              </div>
            </div>
          )}

          {emailType === "outlook" && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg mb-4">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-900 dark:text-blue-100">
                <p className="font-semibold mb-1">Configuration Outlook</p>
                <p>Utilisez votre adresse email Outlook complète et votre mot de passe Microsoft.</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtp_host">Serveur SMTP *</Label>
              <Input
                id="smtp_host"
                value={emailConfig.smtp_host}
                onChange={(e) => setEmailConfig({ ...emailConfig, smtp_host: e.target.value })}
                placeholder={emailType === "gmail" ? "smtp.gmail.com" : emailType === "outlook" ? "smtp-mail.outlook.com" : "smtp.example.com"}
                className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50"
                disabled={emailType === "gmail" || emailType === "outlook"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp_port">Port *</Label>
              <Input
                id="smtp_port"
                type="number"
                value={emailConfig.smtp_port}
                onChange={(e) => setEmailConfig({ ...emailConfig, smtp_port: e.target.value })}
                placeholder="587"
                className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50"
                disabled={emailType === "gmail" || emailType === "outlook"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp_user">Email / Utilisateur *</Label>
              <Input
                id="smtp_user"
                type="email"
                value={emailConfig.smtp_user}
                onChange={(e) => setEmailConfig({ ...emailConfig, smtp_user: e.target.value })}
                placeholder={emailType === "gmail" ? "votre-email@gmail.com" : emailType === "outlook" ? "votre-email@outlook.com" : "votre-email@example.com"}
                className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp_password">
                {emailType === "gmail" ? "Mot de passe d'application *" : "Mot de passe *"}
              </Label>
              <Input
                id="smtp_password"
                type="password"
                value={emailConfig.smtp_password}
                onChange={(e) => setEmailConfig({ ...emailConfig, smtp_password: e.target.value })}
                placeholder={emailType === "gmail" ? "Mot de passe d'application (16 caractères)" : "••••••••••••••••"}
                className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50"
              />
              {emailType === "gmail" && (
                <p className="text-xs text-muted-foreground">
                  Utilisez un mot de passe d'application, pas votre mot de passe Google
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {connected ? (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              <span className="font-semibold text-green-900 dark:text-green-100">
                Email connecté
              </span>
            </div>
            
            <div className="space-y-2 mb-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type :</span>
                <span className="font-medium">{emailType === "smtp" ? "SMTP Professionnel" : emailType === "gmail" ? "Gmail" : "Outlook"}</span>
              </div>
              {(emailType === "smtp" || emailType === "gmail" || emailType === "outlook") && emailConfig.smtp_host && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Serveur :</span>
                    <span className="font-medium">{emailConfig.smtp_host}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email :</span>
                    <span className="font-medium">{emailConfig.smtp_user}</span>
                  </div>
                </>
              )}
            </div>

            <Button
              variant="destructive"
              size="sm"
              onClick={handleDisconnect}
              className="gap-2 rounded-xl w-full"
            >
              <XCircle className="h-4 w-4" />
              Déconnecter
            </Button>
          </div>
        </div>
      ) : (
        <Button
          onClick={handleConnect}
          disabled={loading}
          className="gap-2 rounded-xl w-full"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Configuration en cours...
            </>
          ) : (
            <>
              <Mail className="h-4 w-4" />
              {emailType === "gmail" ? "Configurer Gmail" : emailType === "outlook" ? "Configurer Outlook" : "Configurer SMTP"}
            </>
          )}
        </Button>
      )}
    </div>
  );
};



