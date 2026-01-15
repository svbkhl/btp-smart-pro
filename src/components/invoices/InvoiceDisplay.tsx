import { Invoice } from "@/hooks/useInvoices";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  Download, 
  Send, 
  FileSignature, 
  CheckCircle2,
  Calendar,
  Euro,
  User,
  Mail,
  MapPin,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { PaymentButton } from "./PaymentButton";
import { SendForSignatureButton } from "./SendForSignatureButton";
import { SendToClientButton } from "./SendToClientButton";
import { downloadInvoicePDF } from "@/services/invoicePdfService";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useToast } from "@/components/ui/use-toast";
import { useState } from "react";

interface InvoiceDisplayProps {
  invoice: Invoice;
  showActions?: boolean;
  onClose?: () => void;
}

export const InvoiceDisplay = ({ invoice, showActions = true, onClose }: InvoiceDisplayProps) => {
  const { data: companyInfo } = useUserSettings();
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      await downloadInvoicePDF({
        invoice,
        companyInfo: companyInfo || undefined,
      });
      toast({
        title: "PDF généré",
        description: "La facture a été téléchargée en PDF.",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de générer le PDF",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  const getStatusColor = (status: Invoice["status"]) => {
    switch (status) {
      case "paid":
        return "default";
      case "signed":
        return "secondary";
      case "sent":
        return "secondary";
      case "draft":
        return "outline";
      case "cancelled":
        return "destructive";
      default:
        return "default";
    }
  };

  const getStatusLabel = (status: Invoice["status"]) => {
    switch (status) {
      case "paid":
        return "Payée";
      case "signed":
        return "Signée";
      case "sent":
        return "Envoyée";
      case "draft":
        return "Brouillon";
      case "cancelled":
        return "Annulée";
      default:
        return status;
    }
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Facture {invoice.invoice_number}
            </CardTitle>
            <CardDescription className="mt-2">
              Créée le {format(new Date(invoice.created_at), "d MMMM yyyy", { locale: fr })}
            </CardDescription>
          </div>
          <Badge variant={getStatusColor(invoice.status)}>
            {getStatusLabel(invoice.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Informations client */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <User className="w-4 h-4" />
              Client
            </h3>
            <div className="space-y-1 text-sm">
              <p className="font-medium">{invoice.client_name || "Non spécifié"}</p>
              {invoice.client_email && (
                <p className="text-muted-foreground flex items-center gap-2">
                  <Mail className="w-3 h-3" />
                  {invoice.client_email}
                </p>
              )}
              {invoice.client_address && (
                <p className="text-muted-foreground flex items-center gap-2">
                  <MapPin className="w-3 h-3" />
                  {invoice.client_address}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Dates
            </h3>
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">Date d'échéance:</span>{" "}
                {invoice.due_date ? format(new Date(invoice.due_date), "d MMMM yyyy", { locale: fr }) : "Non définie"}
              </p>
              {invoice.signed_at && (
                <p>
                  <span className="text-muted-foreground">Signée le:</span>{" "}
                  {format(new Date(invoice.signed_at), "d MMMM yyyy à HH:mm", { locale: fr })}
                </p>
              )}
              {invoice.paid_at && (
                <p>
                  <span className="text-muted-foreground">Payée le:</span>{" "}
                  {format(new Date(invoice.paid_at), "d MMMM yyyy à HH:mm", { locale: fr })}
                </p>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* Description */}
        {invoice.description && (
          <div>
            <h3 className="font-semibold mb-2">Description</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {invoice.description}
            </p>
          </div>
        )}

        {/* Lignes de service */}
        {invoice.service_lines && invoice.service_lines.length > 0 && (
          <div>
            <h3 className="font-semibold mb-3">Détail des prestations</h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3">Description</th>
                    <th className="text-right p-3">Quantité</th>
                    <th className="text-right p-3">Prix unitaire</th>
                    <th className="text-right p-3">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.service_lines.map((line, index) => (
                    <tr key={index} className="border-t">
                      <td className="p-3">{line.description}</td>
                      <td className="text-right p-3">{line.quantity || 0}</td>
                      <td className="text-right p-3">{(line.unit_price || 0).toFixed(2)}€</td>
                      <td className="text-right p-3 font-medium">{(line.total || 0).toFixed(2)}€</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <Separator />

        {/* Totaux */}
        <div className="flex justify-end">
          <div className="w-full md:w-80 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Montant HT:</span>
              <span className="font-medium">{(invoice.amount_ht || 0).toFixed(2)}€</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">TVA ({invoice.vat_rate || 20}%):</span>
              <span className="font-medium">{(invoice.vat_amount || 0).toFixed(2)}€</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total TTC:</span>
              <span className="flex items-center gap-2">
                <Euro className="w-5 h-5" />
                {(invoice.amount_ttc || 0).toFixed(2)}€
              </span>
            </div>
          </div>
        </div>

        {/* Signature */}
        {invoice.signature_data && (
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="font-semibold">Facture signée</span>
            </div>
            {invoice.signed_by && (
              <p className="text-sm text-muted-foreground">
                Signée par: {invoice.signed_by}
              </p>
            )}
            {invoice.signed_at && (
              <p className="text-sm text-muted-foreground">
                Le: {format(new Date(invoice.signed_at), "d MMMM yyyy à HH:mm", { locale: fr })}
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex flex-wrap gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={handleDownloadPDF}
              disabled={downloading}
            >
              {downloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Télécharger PDF
                </>
              )}
            </Button>
            {/* Bouton Envoyer au client - toujours visible */}
            <SendToClientButton invoice={invoice} />
            {invoice.status === "draft" && (
              <SendForSignatureButton invoice={invoice} />
            )}
            {invoice.status === "signed" && (
              <PaymentButton invoice={invoice} />
            )}
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                Fermer
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

