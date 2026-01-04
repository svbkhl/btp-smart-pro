import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { Send, Loader2, Mail, FileText, FileSignature, CreditCard } from "lucide-react";
import { sendQuoteEmail, sendInvoiceEmail } from "@/services/emailAdapters"; // Nouveaux adapters centralisés
import { supabase } from "@/integrations/supabase/client";
import { useClients } from "@/hooks/useClients";

interface SendToClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType: "quote" | "invoice";
  document: any; // Quote ou Invoice
  onSent?: () => void;
}

export const SendToClientModal = ({
  open,
  onOpenChange,
  documentType,
  document,
  onSent,
}: SendToClientModalProps) => {
  const { toast } = useToast();
  const { data: clients } = useClients();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [includePDF, setIncludePDF] = useState(true);
  const [includeSignatureLink, setIncludeSignatureLink] = useState(true);

  // Pré-remplir l'email depuis les données du document ou du client associé
  useEffect(() => {
    if (!open || !document) {
      // Réinitialiser l'email quand le modal se ferme
      if (!open) {
        setEmail("");
      }
      return;
    }

    let clientEmail = "";

    // 1. Essayer d'abord depuis le document directement (client_email)
    if (document.client_email) {
      clientEmail = document.client_email;
      console.log("📧 [SendToClientModal] Email trouvé dans document.client_email:", clientEmail);
    }
    // 2. Chercher dans la liste des clients via client_id
    else if (document.client_id && clients && clients.length > 0) {
      const client = clients.find(c => c.id === document.client_id);
      if (client?.email) {
        clientEmail = client.email;
        console.log("📧 [SendToClientModal] Email trouvé via client_id:", clientEmail);
      }
    }
    // 3. Chercher par nom de client si client_name est disponible
    else if (document.client_name && clients && clients.length > 0) {
      const client = clients.find(c => 
        c.name?.toLowerCase() === document.client_name?.toLowerCase() ||
        c.name?.toLowerCase().includes(document.client_name?.toLowerCase() || "")
      );
      if (client?.email) {
        clientEmail = client.email;
        console.log("📧 [SendToClientModal] Email trouvé via client_name:", clientEmail);
      }
    }
    // 4. Essayer depuis les détails du document (pour les devis)
    else if (document.details && typeof document.details === 'object') {
      const details = document.details as any;
      if (details.clientEmail) {
        clientEmail = details.clientEmail;
        console.log("📧 [SendToClientModal] Email trouvé dans details.clientEmail:", clientEmail);
      } else if (details.client?.email) {
        clientEmail = details.client.email;
        console.log("📧 [SendToClientModal] Email trouvé dans details.client.email:", clientEmail);
      }
    }
    // 5. Pour les devis, chercher dans client_name si c'est un email valide
    else if (document.client_name && document.client_name.includes("@")) {
      // Si client_name contient un @, c'est peut-être un email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(document.client_name)) {
        clientEmail = document.client_name;
        console.log("📧 [SendToClientModal] Email trouvé dans client_name (format email):", clientEmail);
      }
    }

    // Mettre à jour l'email quand le modal s'ouvre ou quand le document change
    if (clientEmail) {
      setEmail(clientEmail);
      console.log("✅ [SendToClientModal] Email pré-rempli:", clientEmail);
    } else {
      console.log("⚠️ [SendToClientModal] Aucun email trouvé pour le client");
    }
  }, [open, document, clients]);

  // Générer le message par défaut
  const defaultMessage = documentType === "quote"
    ? `Bonjour ${document?.client_name || "Client"},\n\nNous vous adressons le devis ${document?.quote_number || ""} en pièce jointe.\n\nN'hésitez pas à nous contacter pour toute question.\n\nCordialement`
    : `Bonjour ${document?.client_name || "Client"},\n\nNous vous adressons la facture ${document?.invoice_number || ""} en pièce jointe.\n\nMerci de procéder au règlement dans les délais convenus.\n\nCordialement`;

  const [message, setMessage] = useState(defaultMessage);

  const handleSend = async () => {
    if (!email.trim()) {
      toast({
        title: "Email requis",
        description: "Veuillez saisir l'adresse email du client",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Vous devez être connecté");

      let signatureUrl: string | undefined;

      // Créer automatiquement une session de signature si demandé
      if (includeSignatureLink) {
        // Vérifier si le lien existant est valide (pas localhost)
        const existingUrl = document?.signature_url;
        const isValidUrl = existingUrl && 
          !existingUrl.includes("localhost") && 
          !existingUrl.includes("127.0.0.1") &&
          !existingUrl.includes("0.0.0.0");
        
        if (isValidUrl) {
          // Utiliser le lien existant s'il est valide
          signatureUrl = existingUrl;
        } else {
          // Sinon, créer une nouvelle session de signature
          const { data: signatureData, error: signatureError } = await supabase.functions.invoke(
            "create-signature-session",
            {
              body: {
                [documentType === "quote" ? "quote_id" : "invoice_id"]: document.id,
                signer_email: email,
                signer_name: document?.client_name || "Client",
              },
            }
          );

          if (signatureError) {
            // Si l'erreur indique un problème de configuration d'URL
            if (signatureError.message?.includes("localhost") || signatureError.message?.includes("Configuration invalide")) {
              toast({
                title: "Configuration requise",
                description: "Veuillez configurer l'URL de base de l'application dans Paramètres > Entreprise > URL de base de l'application",
                variant: "destructive",
              });
            }
            throw signatureError;
          }
          
          signatureUrl = signatureData?.signature_url;
          
          // Vérification finale de sécurité - Avertir mais ne pas bloquer
          if (signatureUrl && (signatureUrl.includes("localhost") || signatureUrl.includes("127.0.0.1"))) {
            console.warn("⚠️ L'URL de signature contient localhost. Le lien ne fonctionnera pas en production.");
            toast({
              title: "Avertissement",
              description: "L'URL de signature pointe vers localhost. Configurez l'URL de base dans Paramètres > Entreprise pour que les liens fonctionnent.",
              variant: "destructive",
            });
            // Ne pas bloquer l'envoi, mais avertir l'utilisateur
            // signatureUrl sera undefined pour ne pas inclure le lien invalide
            signatureUrl = undefined;
          }
        }
      }

      // Envoyer l'email via les nouveaux adapters (enregistrement automatique dans messages)
      if (documentType === "quote") {
        const result = await sendQuoteEmail({
          quoteId: document.id,
          quoteNumber: document.quote_number || document.id.substring(0, 8),
          clientEmail: email,
          clientName: document.client_name || "Client",
          clientId: document.client_id,
          includePDF,
          includeSignatureLink: includeSignatureLink && !!signatureUrl,
          signatureUrl,
          customMessage: message !== defaultMessage ? message : undefined,
        });

        if (!result.success) {
          throw new Error(result.error || "Erreur lors de l'envoi du devis");
        }
      } else {
        const result = await sendInvoiceEmail({
          to: email,
          invoiceId: document.id,
          invoiceNumber: document.invoice_number || document.id.substring(0, 8),
          clientName: document.client_name || "Client",
          clientId: document.client_id,
          includePDF,
          includeSignatureLink: includeSignatureLink && !!signatureUrl,
          signatureUrl,
          customMessage: message !== defaultMessage ? message : undefined,
        });

        if (!result.success) {
          throw new Error(result.error || "Erreur lors de l'envoi de la facture");
        }
      }

      // Plus besoin de trackEmailSent() - les adapters enregistrent automatiquement dans messages !

      // Notification de succès IMMÉDIATE et VISIBLE
      toast({
        title: "✅ Email envoyé avec succès !",
        description: (
          <div className="space-y-2">
            <p className="font-semibold">
              {documentType === "quote" ? "Devis" : "Facture"} {document.quote_number || document.invoice_number}
            </p>
            <p>Envoyé à : <strong>{email}</strong></p>
            {includePDF && <p>✓ PDF inclus</p>}
            {includeSignatureLink && signatureUrl && <p>✓ Lien de signature inclus</p>}
          </div>
        ),
        duration: 8000, // 8 secondes pour avoir le temps de lire
      });

      // Fermer le modal immédiatement pour voir le toast
      onSent?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error sending email:", error);
      
      // Notification d'erreur immédiate
      toast({
        title: "❌ Erreur d'envoi",
        description: error.message || "Impossible d'envoyer l'email. Veuillez réessayer.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Envoyer {documentType === "quote" ? "le devis" : "la facture"} au client
          </DialogTitle>
          <DialogDescription>
            Envoyez le {documentType === "quote" ? "devis" : "facture"} par email avec le PDF et le lien de signature
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Email du destinataire */}
          <div className="space-y-2">
            <Label htmlFor="email">
              Email du client <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@example.com"
              className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50"
            />
          </div>

          {/* Message personnalisé */}
          <div className="space-y-2">
            <Label htmlFor="message">Message (optionnel)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              placeholder={defaultMessage}
              className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50"
            />
            <p className="text-xs text-muted-foreground">
              Le message par défaut sera utilisé si laissé vide
            </p>
          </div>

          {/* Options */}
          <div className="space-y-4">
            <Label>Options d'envoi</Label>
            
            <div className="flex items-center space-x-2 p-3 rounded-lg bg-white/50 dark:bg-gray-800/50 border border-border/50">
              <Checkbox
                id="includePDF"
                checked={includePDF}
                onCheckedChange={(checked) => setIncludePDF(checked === true)}
              />
              <div className="flex-1">
                <Label htmlFor="includePDF" className="flex items-center gap-2 cursor-pointer">
                  <FileText className="w-4 h-4" />
                  Inclure le PDF en pièce jointe
                </Label>
                <p className="text-xs text-muted-foreground">
                  Le {documentType === "quote" ? "devis" : "facture"} sera joint au format PDF
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 p-3 rounded-lg bg-white/50 dark:bg-gray-800/50 border border-border/50">
              <Checkbox
                id="includeSignatureLink"
                checked={includeSignatureLink}
                onCheckedChange={(checked) => setIncludeSignatureLink(checked === true)}
              />
              <div className="flex-1">
                <Label htmlFor="includeSignatureLink" className="flex items-center gap-2 cursor-pointer">
                  <FileSignature className="w-4 h-4" />
                  Inclure le lien de signature électronique
                </Label>
                <p className="text-xs text-muted-foreground">
                  Le client pourra signer directement depuis l'email. Un lien de signature unique sera automatiquement créé si nécessaire.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleSend} disabled={loading} className="gap-2 rounded-xl">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Envoi...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Envoyer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};



