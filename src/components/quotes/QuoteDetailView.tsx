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
          <div className="bg-white text-black p-6 rounded-lg max-w-4xl mx-auto quote-display" id="quote-to-export">
            {/* En-tête */}
            <div className="mb-6 pb-6 border-b-2 border-gray-300">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  {userSettings?.company_logo_url && (
                    <img src={userSettings.company_logo_url} alt="Logo" className="h-16 mb-4 object-contain" />
                  )}
                  <div className="space-y-1">
                    <h1 className="text-2xl font-bold">{userSettings?.company_name || "Nom de l'entreprise"}</h1>
                    {(userSettings?.address || userSettings?.postal_code || userSettings?.city) && (
                      <p className="text-sm text-gray-600">
                        {[userSettings.address, userSettings.postal_code && userSettings.city ? `${userSettings.postal_code} ${userSettings.city}` : userSettings.city || userSettings.postal_code].filter(Boolean).join(', ')}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-1">
                      {userSettings?.phone && <span>Tél: {userSettings.phone}</span>}
                      {userSettings?.email && <span>Email: {userSettings.email}</span>}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <h2 className="text-3xl font-bold mb-2">DEVIS</h2>
                  {quote.quote_number && (
                    <p className="text-sm text-gray-600">N° {quote.quote_number}</p>
                  )}
                  <p className="text-sm text-gray-600 mt-1">
                    Date: {new Date(quote.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>

            {/* Client */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <User className="h-5 w-5" />
                Client
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-semibold text-lg">{quote.client_name || 'Non spécifié'}</p>
                {(() => {
                  const clientRecord = (clients as any[]).find((c: any) => c.id === quote.client_id);
                  const location = quote.client_address || clientRecord?.location;
                  const email = quote.client_email || clientRecord?.email;
                  const phone = quote.client_phone || clientRecord?.phone;
                  return (
                    <>
                      {location && (
                        <p className="text-sm text-gray-600 mt-1">
                          <MapPin className="h-4 w-4 inline mr-1" />
                          {location}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-2">
                        {email && <span>Email: {email}</span>}
                        {phone && <span>Tél: {phone}</span>}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Sections et lignes */}
            {sections.length > 0 && (
              <div className="mb-6">
                <h3 className="text-base font-semibold mb-3">Détail des prestations</h3>
                <div className="space-y-6">
                  {[...sections]
                    .sort((a, b) => a.position - b.position)
                    .map((section, sectionIdx) => {
                      const sectionLines = lines
                        .filter((line) => line.section_id === section.id)
                        .sort((a, b) => a.position - b.position);
                      if (sectionLines.length === 0) return null;
                      const effectiveTvaRate = tva293b ? 0 : tvaRate;
                      return (
                        <div key={section.id}>
                          <h4 className="font-semibold text-base mb-3 text-primary">
                            {sectionIdx + 1}. {section.title}
                          </h4>
                          <div className="overflow-x-auto border border-white/20 rounded-lg">
                            <table className="w-full text-sm">
                              <thead className="bg-primary text-white">
                                <tr>
                                  <th className="text-left p-3">Désignation</th>
                                  <th className="text-center p-3">Unité</th>
                                  <th className="text-right p-3">Qté</th>
                                  <th className="text-right p-3">Prix unit. HT</th>
                                  <th className="text-right p-3">Prix HT</th>
                                  {!tva293b && <th className="text-right p-3">TVA</th>}
                                  <th className="text-right p-3">Total TTC</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sectionLines.map((line) => {
                                  const lineHt = line.total_ht ?? ((line.quantity ?? 0) * (line.unit_price_ht ?? 0));
                                  const lineTva = !tva293b ? lineHt * effectiveTvaRate : 0;
                                  const lineTtc = lineHt + lineTva;
                                  return (
                                    <tr key={line.id} className="border-b hover:bg-gray-50">
                                      <td className="p-3">{line.label}</td>
                                      <td className="text-center p-3">{line.unit || "-"}</td>
                                      <td className="text-right p-3">{(line.quantity ?? 0).toFixed(2)}</td>
                                      <td className="text-right p-3">{(line.unit_price_ht ?? 0).toFixed(2)} €</td>
                                      <td className="text-right p-3 font-medium">{lineHt.toFixed(2)} €</td>
                                      {!tva293b && <td className="text-right p-3">{lineTva.toFixed(2)} €</td>}
                                      <td className="text-right p-3 font-medium">{lineTtc.toFixed(2)} €</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Note */}
            {(quote.details?.description || quote.details?.note) && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-semibold mb-1 text-gray-700">Note</p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                  {quote.details?.note || quote.details?.description}
                </p>
              </div>
            )}

            {/* Totaux */}
            <div className="mb-6">
              <div className="flex justify-end">
                <div className="w-80">
                  <table className="w-full border-collapse border">
                    <tbody>
                      <tr>
                        <td className="border p-3 text-right">Total HT</td>
                        <td className="border p-3 text-right font-medium">
                          {quoteTotals.subtotal_ht.toFixed(2)} €
                        </td>
                      </tr>
                      {!tva293b && (
                        <tr>
                          <td className="border p-3 text-right">TVA ({(tvaRate * 100).toFixed(0)}%)</td>
                          <td className="border p-3 text-right">{quoteTotals.total_tva.toFixed(2)} €</td>
                        </tr>
                      )}
                      {tva293b && (
                        <tr>
                          <td className="border p-3 text-right text-sm text-muted-foreground">
                            TVA non applicable (Art. 293 B du CGI)
                          </td>
                          <td className="border p-3 text-right">0,00 €</td>
                        </tr>
                      )}
                      <tr className="bg-primary/10">
                        <td className="border p-3 text-right font-bold text-lg">Total à payer (TTC)</td>
                        <td className="border p-3 text-right font-bold text-lg text-primary">
                          {quoteTotals.total_ttc.toFixed(2)} €
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Pied de page */}
            {(userSettings?.legal_form || userSettings?.siret || userSettings?.vat_number) && (
              <div className="mt-6 pt-4 border-t border-gray-200 text-center text-xs text-gray-500">
                {[userSettings?.legal_form, userSettings?.siret && `SIRET: ${userSettings.siret}`, userSettings?.vat_number && `TVA: ${userSettings.vat_number}`].filter(Boolean).join(' — ')}
              </div>
            )}

            {/* Signature électronique (si signée) */}
            {isSigned && quote.signature_data && (
              <div className="mt-6">
                <SignatureDisplay
                  signatureData={quote.signature_data}
                  signerName={quote.signer_name}
                  signedAt={quote.signed_at}
                />
              </div>
            )}

            {/* Bloc signature vierge (si pas encore signée) */}
            {!isSigned && (
              <div className="mt-8 pt-4 border-t-2 border-gray-300">
                <div className="flex justify-between items-end">
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 mb-2">
                      Devis reçu avant exécution des travaux, bon pour accord
                    </p>
                    <div className="mt-6">
                      <p className="text-xs text-gray-600 border-t border-gray-300 pt-2 w-48">
                        Signature et date
                      </p>
                    </div>
                  </div>
                </div>
              </div>
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



