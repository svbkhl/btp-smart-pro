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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Send, Loader2, Mail, FileText, FileSignature, X, Plus } from "lucide-react";
import { sendQuoteEmail, sendInvoiceEmail } from "@/services/emailAdapters";
import { supabase } from "@/integrations/supabase/client";
import { useClients } from "@/hooks/useClients";
import { useUserSettings } from "@/hooks/useUserSettings";
import { generateInvoicePDFAsBase64 } from "@/services/invoicePdfService";

interface SendToClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType: "quote" | "invoice";
  document: any;
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
  const { data: companyInfo } = useUserSettings();
  const [loading, setLoading] = useState(false);

  // Multi-destinataires
  const [recipients, setRecipients] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");

  // CC permanent
  const [ccEmail, setCcEmail] = useState(() => localStorage.getItem("btp_cc_email") || "");
  const [saveCcAsDefault, setSaveCcAsDefault] = useState(false);

  const [customMessage, setCustomMessage] = useState("");
  const [includePDF, setIncludePDF] = useState(true);
  const [includeSignatureLink, setIncludeSignatureLink] = useState(documentType === "quote");
  const [message, setMessage] = useState("");

  // Pré-remplir destinataires + message avec le bon titre/civilité
  useEffect(() => {
    if (!open || !document) {
      if (!open) {
        setRecipients([]);
        setEmailInput("");
        setMessage("");
      }
      return;
    }

    // --- Email du destinataire ---
    let clientEmail = "";
    if (document.client_email) {
      clientEmail = document.client_email;
    } else if (document.client_id && clients && clients.length > 0) {
      const client = clients.find(c => c.id === document.client_id);
      if (client?.email) clientEmail = client.email;
    } else if (document.client_name && clients && clients.length > 0) {
      const client = clients.find(c =>
        c.name?.toLowerCase() === document.client_name?.toLowerCase() ||
        c.name?.toLowerCase().includes(document.client_name?.toLowerCase() || "")
      );
      if (client?.email) clientEmail = client.email;
    } else if (document.details && typeof document.details === "object") {
      const details = document.details as any;
      if (details.clientEmail) clientEmail = details.clientEmail;
      else if (details.client?.email) clientEmail = details.client.email;
    } else if (document.client_name && document.client_name.includes("@")) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(document.client_name)) clientEmail = document.client_name;
    }
    if (clientEmail) setRecipients([clientEmail]);
    else setRecipients([]);

    // --- Salutation avec titre (M. / Mme) ---
    let titre = "";
    let prenom = "";
    if (document.client_id && clients && clients.length > 0) {
      const client = clients.find(c => c.id === document.client_id);
      if (client) {
        titre = client.titre || "";
        prenom = client.prenom || "";
      }
    }
    // Éviter de dupliquer le titre si client_name le contient déjà
    const nameHasCiv = /^\s*(M\.|Mme|Mlle|Dr\.|Me)\s+/i.test(document.client_name || "");
    const greeting = nameHasCiv
      ? (document.client_name || "Client")
      : [titre, prenom, document.client_name].filter(Boolean).join(" ").trim() || "Client";

    const docNumber = documentType === "quote" ? (document.quote_number || "") : (document.invoice_number || "");
    const docRef = documentType === "quote" ? `le devis ${docNumber}` : `la facture ${docNumber}`;
    setMessage(
      `Bonjour ${greeting},\n\nNous vous adressons ${docRef} en pièce jointe.\n\nN'hésitez pas à nous contacter pour toute question.\n\nCordialement`
    );
  }, [open, document, clients, documentType]);

  const addRecipient = () => {
    const email = emailInput.trim();
    if (!email) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({ title: "Email invalide", description: "Veuillez saisir un email valide", variant: "destructive" });
      return;
    }
    if (!recipients.includes(email)) {
      setRecipients([...recipients, email]);
    }
    setEmailInput("");
  };

  const removeRecipient = (email: string) => {
    setRecipients(recipients.filter(r => r !== email));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addRecipient();
    }
  };

  const handleSend = async () => {
    let finalRecipients = recipients;
    if (finalRecipients.length === 0 && emailInput.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailInput.trim())) {
        toast({ title: "Email invalide", description: "Veuillez saisir un email valide", variant: "destructive" });
        return;
      }
      finalRecipients = [emailInput.trim()];
      setRecipients(finalRecipients);
      setEmailInput("");
    }
    if (finalRecipients.length === 0) {
      toast({
        title: "Email requis",
        description: "Veuillez ajouter au moins un destinataire",
        variant: "destructive",
      });
      return;
    }

    // Sauvegarder CC si demandé
    if (saveCcAsDefault && ccEmail.trim()) {
      localStorage.setItem("btp_cc_email", ccEmail.trim());
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Vous devez être connecté");

      let signatureUrl: string | undefined;

      if (documentType === "quote" && includeSignatureLink) {
        const existingUrl = document?.signature_url;
        const isValidUrl = existingUrl &&
          !existingUrl.includes("localhost") &&
          !existingUrl.includes("127.0.0.1") &&
          !existingUrl.includes("0.0.0.0");

        if (isValidUrl) {
          signatureUrl = existingUrl;
        } else {
          const { data: signatureData, error: signatureError } = await supabase.functions.invoke(
            "create-signature-session",
            {
              body: {
                quote_id: document.id,
                signer_email: finalRecipients[0],
                signer_name: document?.client_name || "Client",
              },
            }
          );

          if (signatureError) {
            if (signatureError.message?.includes("localhost") || signatureError.message?.includes("Configuration invalide")) {
              toast({
                title: "Configuration requise",
                description: "Veuillez configurer l'URL de base dans Paramètres > Entreprise",
                variant: "destructive",
              });
            }
            throw signatureError;
          }

          signatureUrl = signatureData?.signature_url;

          if (signatureUrl && (signatureUrl.includes("localhost") || signatureUrl.includes("127.0.0.1"))) {
            toast({
              title: "Avertissement",
              description: "L'URL de signature pointe vers localhost. Configurez l'URL de base dans Paramètres > Entreprise.",
              variant: "destructive",
            });
            signatureUrl = undefined;
          }
        }
      }

      // Préparer le PDF pour les factures
      let pdfBase64: string | undefined;
      if (documentType === "invoice" && includePDF && companyInfo) {
        try {
          pdfBase64 = await generateInvoicePDFAsBase64({ invoice: document, companyInfo });
        } catch (error: any) {
          console.error("❌ [SendToClientModal] Erreur génération PDF:", error);
          toast({
            title: "Avertissement",
            description: "Le PDF n'a pas pu être généré, l'email sera envoyé sans pièce jointe.",
            variant: "destructive",
          });
        }
      }

      // Récupérer infos client pour la civilité
      let clientCivility: string | undefined;
      let clientFirstName: string | undefined;
      if (document.client_id && clients) {
        const client = clients.find(c => c.id === document.client_id);
        if (client) {
          clientCivility = client.titre || undefined;
          clientFirstName = client.prenom || undefined;
        }
      }

      // Envoyer à tous les destinataires
      const allRecipients = [...finalRecipients];
      if (ccEmail.trim()) allRecipients.push(ccEmail.trim());

      for (const recipientEmail of allRecipients) {
        if (documentType === "quote") {
          const result = await sendQuoteEmail({
            quoteId: document.id,
            quoteNumber: document.quote_number || document.id.substring(0, 8),
            clientEmail: recipientEmail,
            clientName: document.client_name || "Client",
            clientId: document.client_id,
            clientCivility,
            clientFirstName,
            includePDF,
            includeSignatureLink: includeSignatureLink && !!signatureUrl,
            signatureUrl,
            customMessage: message || undefined,
          });
          if (!result.success) throw new Error(result.error || "Erreur lors de l'envoi du devis");
        } else {
          const result = await sendInvoiceEmail({
            to: recipientEmail,
            invoiceId: document.id,
            invoiceNumber: document.invoice_number || document.id.substring(0, 8),
            clientName: document.client_name || "Client",
            clientId: document.client_id,
            includePDF,
            includeSignatureLink: false,
            signatureUrl: undefined,
            customMessage: message || undefined,
            pdfBase64,
          });
          if (!result.success) throw new Error(result.error || "Erreur lors de l'envoi de la facture");
        }
      }

      toast({
        title: "✅ Email envoyé avec succès !",
        description: (
          <div className="space-y-1">
            <p className="font-semibold">
              {documentType === "quote" ? "Devis" : "Facture"} {document.quote_number || document.invoice_number}
            </p>
            <p>Envoyé à : <strong>{recipients.join(", ")}</strong></p>
            {ccEmail.trim() && <p>CC : <strong>{ccEmail.trim()}</strong></p>}
            {includePDF && <p>✓ PDF inclus</p>}
            {includeSignatureLink && signatureUrl && <p>✓ Lien de signature inclus</p>}
          </div>
        ),
        duration: 8000,
      });

      onSent?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error sending email:", error);
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Envoyer {documentType === "quote" ? "le devis" : "la facture"} au client
          </DialogTitle>
          <DialogDescription>
            Envoyez {documentType === "quote" ? "le devis" : "la facture"} par email avec le PDF
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Destinataires */}
          <div className="space-y-2">
            <Label>
              Destinataires <span className="text-destructive">*</span>
            </Label>
            {/* Chips destinataires */}
            {recipients.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {recipients.map(email => (
                  <Badge key={email} variant="secondary" className="gap-1 pr-1">
                    {email}
                    <button
                      onClick={() => removeRecipient(email)}
                      className="ml-1 rounded-full hover:bg-destructive/20 p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            {/* Ajout destinataire */}
            <div className="flex gap-2">
              <Input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ajouter un email (Entrée pour valider)"
                className="bg-transparent backdrop-blur-xl border-white/20 dark:border-white/10"
              />
              <Button type="button" variant="outline" size="icon" onClick={addRecipient}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Appuyez sur Entrée ou cliquez sur + pour ajouter plusieurs destinataires
            </p>
          </div>

          {/* CC permanent */}
          <div className="space-y-2">
            <Label>CC (copie carbone)</Label>
            <Input
              type="email"
              value={ccEmail}
              onChange={(e) => setCcEmail(e.target.value)}
              placeholder="comptable@example.com"
              className="bg-transparent backdrop-blur-xl border-white/20 dark:border-white/10"
            />
            <div className="flex items-center gap-2">
              <Checkbox
                id="saveCc"
                checked={saveCcAsDefault}
                onCheckedChange={(v) => setSaveCcAsDefault(v === true)}
              />
              <Label htmlFor="saveCc" className="text-xs text-muted-foreground cursor-pointer">
                Sauvegarder comme CC par défaut (pour tous les futurs envois)
              </Label>
            </div>
          </div>

          {/* Message personnalisé */}
          <div className="space-y-2">
            <Label htmlFor="message">Message (optionnel)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder="Votre message personnalisé..."
              className="bg-transparent backdrop-blur-xl border-white/20 dark:border-white/10"
            />
          </div>

          {/* Options */}
          <div className="space-y-3">
            <Label>Options d'envoi</Label>

            <div className="flex items-center space-x-2 p-3 rounded-lg bg-transparent backdrop-blur-xl border border-white/20 dark:border-white/10">
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
              </div>
            </div>

            {documentType === "quote" && (
              <div className="flex items-center space-x-2 p-3 rounded-lg bg-transparent backdrop-blur-xl border border-white/20 dark:border-white/10">
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
                    Le client pourra signer directement depuis l'email.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleSend} disabled={loading || (recipients.length === 0 && !emailInput.trim())} className="gap-2 rounded-xl">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Envoi...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Envoyer {recipients.length > 1 ? `(${recipients.length} destinataires)` : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
