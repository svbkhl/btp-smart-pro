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
import { Alert, AlertDescription } from "@/components/ui/alert";

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
                    {new Intl.NumberFormat('fr-FR', {
                      style: 'currency',
                      currency: 'EUR',
                    }).format(quote.estimated_cost || quote.total_ttc || 0)}
                  </p>
                </div>
                {quote.details && (
                  <>
                    {quote.details.total_ht && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total HT</span>
                        <span className="font-medium">
                          {new Intl.NumberFormat('fr-FR', {
                            style: 'currency',
                            currency: 'EUR',
                          }).format(quote.details.total_ht)}
                        </span>
                      </div>
                    )}
                    {quote.details.vat_amount && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">TVA (20%)</span>
                        <span className="font-medium">
                          {new Intl.NumberFormat('fr-FR', {
                            style: 'currency',
                            currency: 'EUR',
                          }).format(quote.details.vat_amount)}
                        </span>
                      </div>
                    )}
                  </>
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

          {/* Détails des travaux */}
          {quote.details?.workSteps && quote.details.workSteps.length > 0 && (
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
                            {new Intl.NumberFormat('fr-FR', {
                              style: 'currency',
                              currency: 'EUR',
                            }).format(step.cost)}
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

