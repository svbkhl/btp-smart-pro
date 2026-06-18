/**
 * Vue détaillée complète d'un devis
 * Inclut : Infos, Timeline, Section Paiement, Historique
 */

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileText,
  User,
  MapPin,
  Download,
  Send,
  Edit,
  Trash2,
  Eye,
  MessageSquare,
  Loader2
} from "lucide-react";
import QuoteStatusBadge from "./QuoteStatusBadge";
import QuoteTimeline from "./QuoteTimeline";
import QuotePaymentSection from "./QuotePaymentSection";
import { QuoteSectionsEditor } from "./QuoteSectionsEditor";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuoteLines } from "@/hooks/useQuoteLines";
import { useQuoteSections } from "@/hooks/useQuoteSections";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useClients } from "@/hooks/useClients";
import { computeQuoteTotals, formatCurrency, formatTvaRate } from "@/utils/quoteCalculations";
import { SignatureDisplay } from "@/components/shared/SignatureDisplay";
import { SendToClientModal } from "@/components/billing/SendToClientModal";
import { downloadQuotePDF, generateQuotePDFBase64 } from "@/services/pdfService";
import { useToast } from "@/hooks/use-toast";

interface QuoteDetailViewProps {
  quote: any;
  onEdit?: () => void;
  onDelete?: () => void;
  onSendEmail?: () => void;
  onDownloadPDF?: () => void;
  onViewMessages?: () => void; // Nouveau : Voir dans Messagerie
  onClose?: () => void; // Nouveau : Fermer le dialog
}

export default function QuoteDetailView({
  quote,
  onEdit,
  onDelete,
  onSendEmail,
  onDownloadPDF,
  onViewMessages,
  onClose,
}: QuoteDetailViewProps) {
  const [activeTab, setActiveTab] = useState("details");
  const [isSendToClientOpen, setIsSendToClientOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const pdfUrlRef = useRef<string | null>(null);
  const { toast } = useToast();
  const tvaRate = quote.tva_rate ?? 0.20;
  const tva293b = quote.tva_non_applicable_293b ?? false;
  const { data: lines = [] } = useQuoteLines(quote.id);
  const { data: sections = [] } = useQuoteSections(quote.id);
  const { data: userSettings } = useUserSettings();
  const { data: clients = [] } = useClients();
  const quoteMode = quote.mode === "detailed" || lines.length > 0 ? "detailed" : "simple";

  const buildPdfParams = () => {
    const effectiveTvaRate = tva293b ? 0 : tvaRate;
    const clientRecord = (clients as any[]).find((c: any) => c.id === quote.client_id);
    const pdfLines = (lines as any[]).map((l: any) => ({
      label: l.label,
      description: l.description,
      unit: l.unit || "",
      quantity: l.quantity || 0,
      unit_price_ht: l.unit_price_ht || 0,
      total_ht: l.total_ht,
      tva_rate: effectiveTvaRate,
      total_tva: tva293b ? 0 : l.total_ht * effectiveTvaRate,
      total_ttc: tva293b ? l.total_ht : l.total_ht * (1 + effectiveTvaRate),
      section_id: l.section_id,
    }));
    const pdfSections = (sections as any[]).map((s: any) => ({ id: s.id, title: s.title, position: s.position }));
    const subtotal_ht = quote.subtotal_ht ?? quote.estimated_cost ?? 0;
    const total_ttc = quote.total_ttc ?? (subtotal_ht * (1 + effectiveTvaRate));
    return {
      result: { estimatedCost: total_ttc, quote_number: quote.quote_number },
      companyInfo: {
        company_id: userSettings?.company_id || "",
        companyName: userSettings?.company_name || "",
        company_name: userSettings?.company_name || "",
        address: userSettings?.address || "",
        city: userSettings?.city || "",
        postalCode: userSettings?.postal_code || "",
        postal_code: userSettings?.postal_code || "",
        phone: userSettings?.phone || "",
        email: userSettings?.email || "",
        siret: userSettings?.siret || "",
        vatNumber: userSettings?.vat_number || "",
        vat_number: userSettings?.vat_number || "",
        logoUrl: userSettings?.company_logo_url || "",
        company_logo_url: userSettings?.company_logo_url || "",
        signature_name: userSettings?.signature_name || "",
        terms_and_conditions: userSettings?.terms_and_conditions || "",
        legal_form: userSettings?.legal_form || "",
        ape_code: userSettings?.ape_code || "",
        invoice_template_version: userSettings?.invoice_template_version || "",
      },
      clientInfo: {
        name: quote.client_name || clientRecord?.name || "",
        civility: clientRecord?.titre || undefined,
        firstName: clientRecord?.prenom || undefined,
        email: quote.client_email || clientRecord?.email || undefined,
        phone: quote.client_phone || clientRecord?.phone || undefined,
        location: quote.client_address || clientRecord?.location || undefined,
      },
      quoteDate: quote.created_at ? new Date(quote.created_at) : new Date(),
      quoteNumber: quote.quote_number,
      mode: lines.length > 0 ? "detailed" : "simple" as "detailed" | "simple",
      tvaRate: effectiveTvaRate,
      tva293b,
      sections: pdfSections,
      lines: pdfLines,
      subtotal_ht,
      total_tva: tva293b ? 0 : (quote.total_tva ?? subtotal_ht * effectiveTvaRate),
      total_ttc,
      signatureData: quote.signature_data || undefined,
      signedBy: quote.signed_by || undefined,
      signedAt: quote.signed_at || undefined,
    };
  };

  const handleTabChange = async (tab: string) => {
    setActiveTab(tab);
    if (tab === "pdf" && !pdfUrl && !pdfLoading) {
      setPdfLoading(true);
      setPdfError(null);
      try {
        const params = buildPdfParams();
        const { base64 } = await generateQuotePDFBase64(params);
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
        pdfUrlRef.current = url;
        setPdfUrl(url);
      } catch (e: any) {
        setPdfError(e?.message || "Impossible de générer l'aperçu PDF");
      } finally {
        setPdfLoading(false);
      }
    }
  };

  useEffect(() => {
    return () => { if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current); };
  }, []);

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      const effectiveTvaRate = tva293b ? 0 : tvaRate;
      const pdfLines = lines.map(l => ({
        label: l.label,
        description: l.description,
        unit: l.unit || "",
        quantity: l.quantity || 0,
        unit_price_ht: l.unit_price_ht || 0,
        total_ht: l.total_ht,
        tva_rate: effectiveTvaRate,
        total_tva: tva293b ? 0 : l.total_ht * effectiveTvaRate,
        total_ttc: tva293b ? l.total_ht : l.total_ht * (1 + effectiveTvaRate),
        section_id: l.section_id,
      }));
      const pdfSections = sections.map(s => ({ id: s.id, title: s.title, position: s.position }));

      const companyInfo = {
        company_id: userSettings?.company_id || "",
        companyName: userSettings?.company_name || "",
        company_name: userSettings?.company_name || "",
        address: userSettings?.address || "",
        city: userSettings?.city || "",
        postalCode: userSettings?.postal_code || "",
        postal_code: userSettings?.postal_code || "",
        phone: userSettings?.phone || "",
        email: userSettings?.email || "",
        siret: userSettings?.siret || "",
        vatNumber: userSettings?.vat_number || "",
        vat_number: userSettings?.vat_number || "",
        logoUrl: userSettings?.company_logo_url || "",
        company_logo_url: userSettings?.company_logo_url || "",
        signature_name: userSettings?.signature_name || "",
        terms_and_conditions: userSettings?.terms_and_conditions || "",
        legal_form: userSettings?.legal_form || "",
        ape_code: userSettings?.ape_code || "",
        invoice_template_version: userSettings?.invoice_template_version || "",
      };

      const subtotal_ht = quote.subtotal_ht ?? quote.estimated_cost ?? 0;
      const total_ttc = quote.total_ttc ?? (subtotal_ht * (1 + effectiveTvaRate));

      await downloadQuotePDF({
        result: { estimatedCost: total_ttc, quote_number: quote.quote_number },
        companyInfo,
        clientInfo: (() => {
        // Enrichir avec les données du client si disponibles
        const clientRecord = clients.find(c => c.id === quote.client_id);
        return {
          name: quote.client_name || clientRecord?.name || "",
          civility: clientRecord?.titre || undefined,
          firstName: (clientRecord as any)?.prenom || undefined,
          email: quote.client_email || clientRecord?.email || undefined,
          phone: quote.client_phone || clientRecord?.phone || undefined,
          location: quote.client_address || clientRecord?.location || undefined,
        };
      })(),
        quoteDate: quote.created_at ? new Date(quote.created_at) : new Date(),
        quoteNumber: quote.quote_number,
        mode: quoteMode,
        tvaRate: effectiveTvaRate,
        tva293b,
        sections: pdfSections,
        lines: pdfLines,
        subtotal_ht,
        total_tva: tva293b ? 0 : (quote.total_tva ?? subtotal_ht * effectiveTvaRate),
        total_ttc,
        signatureData: quote.signature_data || undefined,
        signedBy: quote.signed_by || undefined,
        signedAt: quote.signed_at || undefined,
      });
      toast({ title: "✅ PDF généré", description: `Devis ${quote.quote_number} téléchargé.` });
    } catch (error: any) {
      toast({ title: "Erreur PDF", description: error.message || "Impossible de générer le PDF", variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };
  const [quoteTotals, setQuoteTotals] = useState({
    subtotal_ht: quote.subtotal_ht ?? quote.estimated_cost ?? 0,
    total_tva: tva293b ? 0 : (quote.total_tva ?? (quote.estimated_cost ?? 0) * tvaRate),
    total_ttc: tva293b ? (quote.subtotal_ht ?? quote.estimated_cost ?? 0) : (quote.total_ttc ?? (quote.estimated_cost ?? 0) * (1 + tvaRate)),
  });

  // La page de détail est toujours en lecture seule — modifier passe par le bouton "Modifier"
  const isReadOnly = true;
  const isSigned = quote.signed || quote.status === 'signed';

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* En-tête avec actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl sm:text-3xl font-bold truncate">{quote.quote_number || 'Devis sans numéro'}</h2>
            <QuoteStatusBadge
              status={quote.status || (quote.signed ? 'signed' : 'draft')}
              signedAt={quote.signed_at}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Créé le {new Date(quote.created_at).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          {onViewMessages && (
            <Button variant="outline" size="sm" onClick={onViewMessages} className="gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">Messages</span>
            </Button>
          )}
          {(onDownloadPDF || true) && (
            <Button variant="outline" size="sm" onClick={handleDownloadPDF} disabled={isDownloading} className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              PDF
            </Button>
          )}
          {onSendEmail && !quote.signed && (
            <Button variant="outline" size="sm" onClick={onSendEmail} className="gap-1.5">
              <Send className="h-3.5 w-3.5" />
              Envoyer
            </Button>
          )}
          {onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit} className="gap-1.5">
              <Edit className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Modifier</span>
            </Button>
          )}
          {onDelete && (
            <Button variant="outline" size="sm" onClick={onDelete} className="gap-1.5 text-red-600 hover:text-red-700">
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Supprimer</span>
            </Button>
          )}
        </div>
      </div>

      {/* Alerte uniquement si le devis est réellement signé */}
      {isSigned && (
        <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20">
          <Eye className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-900 dark:text-green-100">
            ✅ <strong>Devis signé</strong> - Ce devis a été signé électroniquement.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className={`grid w-full ${quote.signed ? 'grid-cols-4' : 'grid-cols-3'}`}>
          <TabsTrigger value="details">Détails</TabsTrigger>
          <TabsTrigger value="pdf">PDF</TabsTrigger>
          <TabsTrigger value="timeline">Suivi</TabsTrigger>
          {quote.signed && <TabsTrigger value="payment">Paiement</TabsTrigger>}
        </TabsList>

        {/* Onglet Détails — rendu complet du devis (même modèle que le post-save preview) */}
        <TabsContent value="details">
          <div className="space-y-4">
            {/* Client */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Client</span>
                </div>
                <p className="font-semibold">{quote.client_name || "Non spécifié"}</p>
                {(() => {
                  const clientRecord = (clients as any[]).find((c: any) => c.id === quote.client_id);
                  const location = quote.client_address || clientRecord?.location;
                  const email = quote.client_email || clientRecord?.email;
                  const phone = quote.client_phone || clientRecord?.phone;
                  return (
                    <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                      {location && (
                        <p className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />{location}
                        </p>
                      )}
                      {email && <p>{email}</p>}
                      {phone && <p>{phone}</p>}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Sections et lignes */}
            {sections.length > 0 && (
              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    {[...sections]
                      .sort((a, b) => a.position - b.position)
                      .map((section) => {
                        const sectionLines = lines
                          .filter((line) => line.section_id === section.id)
                          .sort((a, b) => a.position - b.position);
                        if (sectionLines.length === 0) return null;
                        return (
                          <div key={section.id}>
                            <p className="text-sm font-semibold text-primary mb-2">{section.title}</p>
                            <div className="space-y-1">
                              {sectionLines.map((line) => {
                                const lineHt = line.total_ht ?? ((line.quantity ?? 0) * (line.unit_price_ht ?? 0));
                                return (
                                  <div key={line.id} className="flex justify-between items-start text-sm py-1 border-b border-border/40 last:border-0">
                                    <span className="flex-1 pr-4">{line.label}</span>
                                    <span className="text-muted-foreground whitespace-nowrap">
                                      {line.quantity != null && line.unit ? `${line.quantity} ${line.unit} × ` : ""}
                                      {(line.unit_price_ht ?? 0).toFixed(2)} € = <span className="font-medium text-foreground">{lineHt.toFixed(2)} €</span>
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Note */}
            {(quote.details?.description || quote.details?.note) && (
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Note</p>
                  <p className="text-sm whitespace-pre-wrap">{quote.details?.note || quote.details?.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Totaux */}
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total HT</span>
                    <span className="font-medium">{quoteTotals.subtotal_ht.toFixed(2)} €</span>
                  </div>
                  {!tva293b && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">TVA ({(tvaRate * 100).toFixed(0)}%)</span>
                      <span>{quoteTotals.total_tva.toFixed(2)} €</span>
                    </div>
                  )}
                  {tva293b && (
                    <p className="text-xs text-muted-foreground italic">TVA non applicable — Art. 293 B du CGI</p>
                  )}
                  <div className="flex justify-between pt-2 border-t font-semibold text-base">
                    <span>Total TTC</span>
                    <span className="text-primary">{quoteTotals.total_ttc.toFixed(2)} €</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Signature */}
            {isSigned && quote.signature_data && (
              <Card>
                <CardContent className="pt-4">
                  <SignatureDisplay
                    signatureData={quote.signature_data}
                    signerName={quote.signer_name}
                    signedAt={quote.signed_at}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Onglet PDF */}
        <TabsContent value="pdf">
          {pdfLoading && (
            <div className="flex min-h-[70vh] items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span>Génération de l&apos;aperçu PDF…</span>
            </div>
          )}
          {pdfError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {pdfError}
            </div>
          )}
          {pdfUrl && !pdfLoading && (
            <iframe
              title={`Aperçu ${quote.quote_number}`}
              src={`${pdfUrl}#toolbar=1`}
              className="h-[min(75vh,900px)] w-full rounded-lg border border-border bg-muted/30"
            />
          )}
        </TabsContent>

        {/* Onglet Timeline */}
        <TabsContent value="timeline">
          <Card>
            <CardContent className="pt-6">
              <QuoteTimeline quote={quote} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Paiement */}
        {quote.signed && (
          <TabsContent value="payment">
            <QuotePaymentSection quote={quote} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}



