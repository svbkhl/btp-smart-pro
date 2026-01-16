/**
 * Vue détaillée complète d'un devis
 * Inclut : Infos, Timeline, Section Paiement, Historique
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  User, 
  Calendar,
  DollarSign,
  Mail,
  Phone,
  MapPin,
  Download,
  Send,
  Edit,
  Trash2,
  Eye,
  MessageSquare
} from "lucide-react";
import QuoteStatusBadge from "./QuoteStatusBadge";
import QuoteTimeline from "./QuoteTimeline";
import QuotePaymentSection from "./QuotePaymentSection";
import { QuoteSectionsEditor } from "./QuoteSectionsEditor";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuoteLines } from "@/hooks/useQuoteLines";
import { computeQuoteTotals, formatCurrency, formatTvaRate } from "@/utils/quoteCalculations";

interface QuoteDetailViewProps {
  quote: any;
  onEdit?: () => void;
  onDelete?: () => void;
  onSendEmail?: () => void;
  onDownloadPDF?: () => void;
  onViewMessages?: () => void; // Nouveau : Voir dans Messagerie
}

export default function QuoteDetailView({
  quote,
  onEdit,
  onDelete,
  onSendEmail,
  onDownloadPDF,
  onViewMessages,
}: QuoteDetailViewProps) {
  const [activeTab, setActiveTab] = useState("details");
  const quoteMode = quote.mode || "simple";
  const tvaRate = quote.tva_rate ?? 0.20;
  const tva293b = quote.tva_non_applicable_293b ?? false;
  const { data: lines = [] } = useQuoteLines(quoteMode === "detailed" ? quote.id : undefined);
  const [quoteTotals, setQuoteTotals] = useState({
    subtotal_ht: quote.subtotal_ht ?? quote.estimated_cost ?? 0,
    total_tva: tva293b ? 0 : (quote.total_tva ?? (quote.estimated_cost ?? 0) * tvaRate),
    total_ttc: tva293b ? (quote.subtotal_ht ?? quote.estimated_cost ?? 0) : (quote.total_ttc ?? (quote.estimated_cost ?? 0) * (1 + tvaRate)),
  });

  const isReadOnly = quote.signed || quote.status === 'signed';

  return (
    <div className="space-y-6">
      {/* En-tête avec actions */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold">{quote.quote_number || 'Devis sans numéro'}</h2>
            <QuoteStatusBadge 
              status={quote.status || (quote.signed ? 'signed' : 'draft')} 
              signedAt={quote.signed_at}
            />
          </div>
          <p className="text-muted-foreground">
            Créé le {new Date(quote.created_at).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>

        <div className="flex gap-2">
          {onViewMessages && (
            <Button variant="outline" onClick={onViewMessages} className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Messages
            </Button>
          )}
          {onDownloadPDF && (
            <Button variant="outline" onClick={onDownloadPDF} className="gap-2">
              <Download className="h-4 w-4" />
              PDF
            </Button>
          )}
          {onSendEmail && !quote.signed && (
            <Button variant="outline" onClick={onSendEmail} className="gap-2">
              <Send className="h-4 w-4" />
              Envoyer
            </Button>
          )}
          {onEdit && !isReadOnly && (
            <Button variant="outline" onClick={onEdit} className="gap-2">
              <Edit className="h-4 w-4" />
              Modifier
            </Button>
          )}
          {onDelete && !isReadOnly && (
            <Button variant="outline" onClick={onDelete} className="gap-2 text-red-600 hover:text-red-700">
              <Trash2 className="h-4 w-4" />
              Supprimer
            </Button>
          )}
        </div>
      </div>

      {/* Alerte devis signé (lecture seule) */}
      {isReadOnly && (
        <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20">
          <Eye className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-900 dark:text-green-100">
            🔒 <strong>Devis signé</strong> - Ce document est verrouillé et ne peut plus être modifié. Il a une valeur juridique.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="details">Détails</TabsTrigger>
          <TabsTrigger value="timeline">Suivi</TabsTrigger>
          {quote.signed && <TabsTrigger value="payment">Paiement</TabsTrigger>}
        </TabsList>

        {/* Onglet Détails */}
        <TabsContent value="details" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Informations client */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Client
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Nom</p>
                  <p className="font-semibold">{quote.client_name || 'Non spécifié'}</p>
                </div>
                {quote.client_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${quote.client_email}`} className="text-sm text-blue-600 hover:underline">
                      {quote.client_email}
                    </a>
                  </div>
                )}
                {quote.client_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${quote.client_phone}`} className="text-sm text-blue-600 hover:underline">
                      {quote.client_phone}
                    </a>
                  </div>
                )}
                {quote.client_address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <p className="text-sm">{quote.client_address}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Informations financières */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Montant
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Total TTC</p>
                  <p className="text-3xl font-bold text-primary">
                    {formatCurrency(quoteTotals.total_ttc || quote.estimated_cost || 0, quote.currency)}
                  </p>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total HT</span>
                  <span className="font-medium">
                    {formatCurrency(quoteTotals.subtotal_ht || quote.estimated_cost || 0, quote.currency)}
                  </span>
                </div>
                {!tva293b && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">TVA ({formatTvaRate(tvaRate)})</span>
                    <span className="font-medium">
                      {formatCurrency(quoteTotals.total_tva || 0, quote.currency)}
                    </span>
                  </div>
                )}
                {tva293b && (
                  <div className="text-xs text-muted-foreground italic">
                    TVA non applicable - Article 293 B du CGI
                  </div>
                )}
                {quoteMode === "detailed" && (
                  <div className="pt-2 border-t">
                    <Badge variant="outline" className="text-xs">
                      Mode détaillé
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Description */}
          {quote.details?.description && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Description des travaux
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{quote.details.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Sections et lignes détaillées (mode detailed) */}
          {quoteMode === "detailed" && !isReadOnly && (
            <Card>
              <CardHeader>
                <CardTitle>Sections et lignes du devis</CardTitle>
                <CardDescription>
                  Gérez les sections (corps de métier) et lignes détaillées avec quantités, unités et prix
                </CardDescription>
              </CardHeader>
              <CardContent>
                <QuoteSectionsEditor
                  quoteId={quote.id}
                  tvaRate={tvaRate}
                  tva293b={tva293b}
                  onTotalsChange={setQuoteTotals}
                />
              </CardContent>
            </Card>
          )}

          {/* Affichage lignes en lecture seule (si signé) */}
          {quoteMode === "detailed" && isReadOnly && lines.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Lignes du devis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {lines.map((line) => {
                    const totals = computeQuoteTotals([line], tvaRate);
                    return (
                      <div key={line.id} className="p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-semibold">{line.label}</p>
                            {line.description && (
                              <p className="text-sm text-muted-foreground mt-1">{line.description}</p>
                            )}
                            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                              {line.quantity && line.unit && (
                                <span>
                                  {line.quantity} {line.unit}
                                </span>
                              )}
                              {line.unit_price_ht && (
                                <span>
                                  {formatCurrency(line.unit_price_ht)} / {line.unit || "u"}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-primary">
                              {formatCurrency(totals.total_ttc)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              HT: {formatCurrency(totals.subtotal_ht)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Détails des travaux (mode simple ou fallback) */}
          {quoteMode === "simple" && quote.details?.workSteps && quote.details.workSteps.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Détails des prestations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {quote.details.workSteps.map((step: any, index: number) => (
                    <div key={index} className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold">{step.step || `Prestation ${index + 1}`}</p>
                          {step.description && (
                            <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                          )}
                        </div>
                        {step.cost && (
                          <p className="font-bold text-primary">
                            {formatCurrency(step.cost)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
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

