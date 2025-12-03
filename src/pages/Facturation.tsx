import { useState, useMemo } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuotes } from "@/hooks/useQuotes";
import { useInvoices } from "@/hooks/useInvoices";
import { usePayments } from "@/hooks/usePayments";
import { GlassCard } from "@/components/ui/GlassCard";
import { KPIBlock } from "@/components/ui/KPIBlock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  FileText, 
  Receipt, 
  Plus, 
  Euro, 
  Calendar,
  User,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  CreditCard,
  LayoutDashboard,
  ArrowRight,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Link, useNavigate } from "react-router-dom";
import { QuoteActionButtons } from "@/components/quotes/QuoteActionButtons";
import { EditQuoteDialog } from "@/components/quotes/EditQuoteDialog";
import { CreateInvoiceDialog } from "@/components/invoices/CreateInvoiceDialog";
import { InvoiceDisplay } from "@/components/invoices/InvoiceDisplay";
import { CreateInvoiceFromQuoteDialog } from "@/components/invoices/CreateInvoiceFromQuoteDialog";
import { BillingOverview } from "@/pages/BillingOverview";
import { SendToClientModal } from "@/components/billing/SendToClientModal";
import { Quote } from "@/hooks/useQuotes";
import { Invoice } from "@/hooks/useInvoices";
import { motion } from "framer-motion";

const Facturation = () => {
  const navigate = useNavigate();
  const { data: quotes = [], isLoading: quotesLoading } = useQuotes();
  const { data: invoices = [], isLoading: invoicesLoading } = useInvoices();
  const { data: payments = [], isLoading: paymentsLoading } = usePayments();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isEditQuoteOpen, setIsEditQuoteOpen] = useState(false);
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [isCreateFromQuoteOpen, setIsCreateFromQuoteOpen] = useState(false);
  const [isSendToClientOpen, setIsSendToClientOpen] = useState(false);
  const [sendToClientDocument, setSendToClientDocument] = useState<{ type: "quote" | "invoice"; document: any } | null>(null);

  const filteredQuotes = quotes.filter((quote) =>
    quote.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    quote.quote_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredInvoices = invoices.filter((invoice) =>
    invoice.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    invoice.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPayments = payments.filter((payment) =>
    payment.reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    payment.payment_method?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getQuoteStatusColor = (status: string) => {
    switch (status) {
      case "accepted":
        return "default";
      case "sent":
        return "secondary";
      case "draft":
        return "outline";
      case "rejected":
        return "destructive";
      default:
        return "default";
    }
  };

  const getQuoteStatusLabel = (status: string) => {
    switch (status) {
      case "accepted":
        return "Accepté";
      case "sent":
        return "Envoyé";
      case "draft":
        return "Brouillon";
      case "rejected":
        return "Refusé";
      default:
        return status;
    }
  };

  const getInvoiceStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "default";
      case "sent":
        return "secondary";
      case "draft":
        return "outline";
      case "overdue":
        return "destructive";
      default:
        return "default";
    }
  };

  const getInvoiceStatusLabel = (status: string) => {
    switch (status) {
      case "paid":
        return "Payé";
      case "sent":
        return "Envoyé";
      case "draft":
        return "Brouillon";
      case "overdue":
        return "En retard";
      default:
        return status;
    }
  };

  return (
    <PageLayout>
      <div className="p-3 sm:p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl sm:text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2">
            Facturation
          </h1>
          <p className="text-muted-foreground">
            Gérez vos devis et factures
          </p>
        </div>

        <Tabs defaultValue="quotes" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 gap-2 bg-transparent p-1">
            <TabsTrigger 
              value="quotes" 
              className="rounded-xl text-sm sm:text-base px-4 py-3 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all"
            >
              Devis
            </TabsTrigger>
            <TabsTrigger 
              value="invoices" 
              className="rounded-xl text-sm sm:text-base px-4 py-3 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all"
            >
              Factures
            </TabsTrigger>
            <TabsTrigger 
              value="payments" 
              className="rounded-xl text-sm sm:text-base px-4 py-3 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all"
            >
              Paiements
            </TabsTrigger>
          </TabsList>

          <TabsContent value="quotes" className="mt-0 space-y-6">
            {/* Recherche et Actions */}
            <GlassCard className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher un devis..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Link to="/ai?tab=quotes">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Nouveau devis
                  </Button>
                </Link>
              </div>
            </GlassCard>

            {/* Liste des devis */}
            {quotesLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Chargement...
              </div>
            ) : filteredQuotes.length === 0 ? (
              <GlassCard className="p-12 text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">Aucun devis</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? "Aucun devis ne correspond à votre recherche." : "Commencez par créer votre premier devis."}
                </p>
                {!searchQuery && (
                  <Link to="/ai?tab=quotes">
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Créer un devis
                    </Button>
                  </Link>
                )}
              </GlassCard>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredQuotes.map((quote) => (
                  <GlassCard key={quote.id} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{quote.quote_number}</h3>
                        <p className="text-sm text-muted-foreground">{quote.client_name}</p>
                      </div>
                      <Badge variant={getQuoteStatusColor(quote.status) as any}>
                        {getQuoteStatusLabel(quote.status)}
                      </Badge>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Euro className="w-4 h-4 text-muted-foreground" />
                        <span className="font-semibold">
                          {quote.estimated_cost?.toLocaleString("fr-FR", {
                            style: "currency",
                            currency: "EUR",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {format(new Date(quote.created_at), "d MMM yyyy", { locale: fr })}
                        </span>
                      </div>
                    </div>

                    <QuoteActionButtons
                      quote={quote}
                      onEdit={() => {
                        setSelectedQuote(quote);
                        setIsEditQuoteOpen(true);
                      }}
                      onSendToClient={() => {
                        setSendToClientDocument({ type: "quote", document: quote });
                        setIsSendToClientOpen(true);
                      }}
                    />
                  </GlassCard>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="invoices" className="mt-0 space-y-6">
            {/* Recherche et Actions */}
            <GlassCard className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher une facture..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button onClick={() => setIsCreateInvoiceOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nouvelle facture
                </Button>
              </div>
            </GlassCard>

            {/* Liste des factures */}
            {invoicesLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Chargement...
              </div>
            ) : filteredInvoices.length === 0 ? (
              <GlassCard className="p-12 text-center">
                <Receipt className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">Aucune facture</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? "Aucune facture ne correspond à votre recherche." : "Commencez par créer votre première facture."}
                </p>
                {!searchQuery && (
                  <Button onClick={() => setIsCreateInvoiceOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Créer une facture
                  </Button>
                )}
              </GlassCard>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredInvoices.map((invoice) => (
                  <GlassCard key={invoice.id} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{invoice.invoice_number}</h3>
                        <p className="text-sm text-muted-foreground">{invoice.client_name}</p>
                      </div>
                      <Badge variant={getInvoiceStatusColor(invoice.status) as any}>
                        {getInvoiceStatusLabel(invoice.status)}
                      </Badge>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Euro className="w-4 h-4 text-muted-foreground" />
                        <span className="font-semibold">
                          {invoice.total_amount?.toLocaleString("fr-FR", {
                            style: "currency",
                            currency: "EUR",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {format(new Date(invoice.created_at), "d MMM yyyy", { locale: fr })}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setSelectedInvoice(invoice)}
                      >
                        Voir
                      </Button>
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="payments" className="mt-0 space-y-6">
            {/* Recherche */}
            <GlassCard className="p-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un paiement..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </GlassCard>

            {/* Liste des paiements */}
            {paymentsLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Chargement...
              </div>
            ) : filteredPayments.length === 0 ? (
              <GlassCard className="p-12 text-center">
                <CreditCard className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">Aucun paiement</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? "Aucun paiement ne correspond à votre recherche." : "Aucun paiement enregistré pour le moment."}
                </p>
              </GlassCard>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPayments.map((payment) => (
                  <GlassCard key={payment.id} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {payment.reference || `Paiement #${payment.id.slice(0, 8)}`}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {payment.payment_method || "Non spécifié"}
                        </p>
                      </div>
                      <Badge variant={payment.status === "paid" ? "default" : payment.status === "overdue" ? "destructive" : "secondary"}>
                        {payment.status === "paid" ? "Payé" : payment.status === "overdue" ? "En retard" : payment.status === "cancelled" ? "Annulé" : "En attente"}
                      </Badge>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Euro className="w-4 h-4 text-muted-foreground" />
                        <span className="font-semibold">
                          {payment.amount.toLocaleString("fr-FR", {
                            style: "currency",
                            currency: "EUR",
                          })}
                        </span>
                      </div>
                      {payment.due_date && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            Échéance: {format(new Date(payment.due_date), "d MMM yyyy", { locale: fr })}
                          </span>
                        </div>
                      )}
                      {payment.paid_date && (
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <span className="text-muted-foreground">
                            Payé le: {format(new Date(payment.paid_date), "d MMM yyyy", { locale: fr })}
                          </span>
                        </div>
                      )}
                    </div>

                    {payment.notes && (
                      <div className="mb-4 p-3 bg-white/40 dark:bg-gray-800/40 rounded-lg">
                        <p className="text-sm text-muted-foreground">{payment.notes}</p>
                      </div>
                    )}
                  </GlassCard>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        {selectedQuote && (
          <>
            <EditQuoteDialog
              open={isEditQuoteOpen}
              onOpenChange={setIsEditQuoteOpen}
              quote={selectedQuote}
            />
            <CreateInvoiceFromQuoteDialog
              open={isCreateFromQuoteOpen}
              onOpenChange={setIsCreateFromQuoteOpen}
              quote={selectedQuote}
            />
          </>
        )}

        {selectedInvoice && (
          <InvoiceDisplay
            invoice={selectedInvoice}
            onClose={() => setSelectedInvoice(null)}
          />
        )}

        <CreateInvoiceDialog
          open={isCreateInvoiceOpen}
          onOpenChange={setIsCreateInvoiceOpen}
        />


        {/* Modal Envoyer au client */}
        {sendToClientDocument && (
          <SendToClientModal
            open={isSendToClientOpen}
            onOpenChange={setIsSendToClientOpen}
            documentType={sendToClientDocument.type}
            document={sendToClientDocument.document}
            onSent={() => {
              setIsSendToClientOpen(false);
              setSendToClientDocument(null);
            }}
          />
        )}
      </div>
    </PageLayout>
  );
};

export default Facturation;


