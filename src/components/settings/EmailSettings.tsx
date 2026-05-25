import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Mail, Loader2, Send } from "lucide-react";
import { ConnectWithEmail } from "@/components/ConnectWithEmail";
import { EmailAccountsManager } from "@/components/EmailAccountsManager";
import { EmailSignatureEditor } from "@/components/EmailSignatureEditor";
import { useToast } from "@/components/ui/use-toast";
import { useState } from "react";
import { motion } from "framer-motion";
import { sendMessage } from "@/services/messageService";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const EmailSettings = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [testing, setTesting] = useState(false);

  const handleTestEmail = async () => {
    if (!user) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté",
        variant: "destructive",
      });
      return;
    }

    // Récupérer la configuration email
    const { data: emailConfig, error: configError } = await supabase
      .from("user_email_settings")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (configError || !emailConfig) {
      toast({
        title: "Configuration manquante",
        description: "Veuillez d'abord configurer un compte email",
        variant: "destructive",
      });
      return;
    }

    setTesting(true);
    try {
      console.log("📧 Envoi d'un email de test...");
      
      const testEmailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 20px; background-color: #f9fafb; border-radius: 0 0 8px 8px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Email de Test</h1>
            </div>
            <div class="content">
              <p>Bonjour,</p>
              <p>Cet email est un test de configuration de votre compte email.</p>
              <p>Si vous recevez ce message, cela signifie que votre configuration email fonctionne correctement !</p>
              <p><strong>Configuration utilisée :</strong></p>
              <ul>
                <li>Type : ${emailConfig.provider === "gmail" ? "Gmail" : emailConfig.provider === "outlook" ? "Outlook" : "SMTP"}</li>
                <li>Serveur : ${emailConfig.smtp_host || "N/A"}</li>
                <li>Email : ${emailConfig.from_email || emailConfig.smtp_user || "N/A"}</li>
              </ul>
              <p>Cordialement,<br>BTP Smart Pro</p>
            </div>
            <div class="footer">
              <p>Cet email a été envoyé automatiquement depuis votre application BTP Smart Pro.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const testEmailText = `
Email de Test

Bonjour,

Cet email est un test de configuration de votre compte email.

Si vous recevez ce message, cela signifie que votre configuration email fonctionne correctement !

Configuration utilisée :
- Type : ${emailConfig.provider === "gmail" ? "Gmail" : emailConfig.provider === "outlook" ? "Outlook" : "SMTP"}
- Serveur : ${emailConfig.smtp_host || "N/A"}
- Email : ${emailConfig.from_email || emailConfig.smtp_user || "N/A"}

Cordialement,
BTP Smart Pro
      `;

      await sendMessage({
        messageType: "notification",
        recipientEmail: user.email || emailConfig.from_email || emailConfig.smtp_user || "",
        recipientName: "Test",
        subject: "Test de configuration email - BTP Smart Pro",
        body: testEmailText,
        bodyHtml: testEmailHtml,
        bodyText: testEmailText,
      });

      console.log("✅ Email de test envoyé avec succès");
      
      toast({
        title: "Email de test envoyé",
        description: `Un email de test a été envoyé à ${user.email || emailConfig.from_email || "votre adresse email"}. Vérifiez votre boîte de réception.`,
      });
    } catch (error: any) {
      console.error("❌ Erreur lors de l'envoi de l'email de test:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer l'email de test. Vérifiez votre configuration email.",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <GlassCard className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Mail className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-semibold">Configuration Email</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Configurez vos comptes email pour envoyer des devis et factures
        </p>

        <ConnectWithEmail />
      </GlassCard>

      <GlassCard className="p-6">
        <h3 className="font-semibold mb-4">Gestion des comptes</h3>
        <EmailAccountsManager />
      </GlassCard>

      <GlassCard className="p-6">
        <h3 className="font-semibold mb-4">Signature email</h3>
        <EmailSignatureEditor />
      </GlassCard>

      <GlassCard className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold mb-2">Test d'envoi</h3>
            <p className="text-sm text-muted-foreground">
              Envoyer un email de test pour vérifier la configuration
            </p>
          </div>
          <Button
            onClick={handleTestEmail}
            disabled={testing}
            className="gap-2 rounded-xl"
          >
            {testing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Envoi...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Envoyer un test
              </>
            )}
          </Button>
        </div>
      </GlassCard>
    </motion.div>
  );
};



