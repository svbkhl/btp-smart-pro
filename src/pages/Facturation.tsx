import { useState, useMemo, useEffect } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuotes } from "@/hooks/useQuotes";
import { useInvoices } from "@/hooks/useInvoices";
import { usePaymentsQuery } from "@/hooks/usePaymentsQuery";
import { GlassCard } from "@/components/ui/GlassCard";
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
  AlertCircle,
  Eye,
  Trash2
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Link, useNavigate } from "react-router-dom";
import { QuoteActionButtons } from "@/components/quotes/QuoteActionButtons";
import { EditQuoteDialog } from "@/components/quotes/EditQuoteDialog";
import { CreateInvoiceDialog } from "@/components/invoices/CreateInvoiceDialog";
import { InvoiceDisplay } from "@/components/invoices/InvoiceDisplay";
import { InvoiceActionButtons } from "@/components/invoices/InvoiceActionButtons";
import { CreateInvoiceFromQuoteDialog } from "@/components/invoices/CreateInvoiceFromQuoteDialog";
import { SendToClientModal } from "@/components/billing/SendToClientModal";
import { Quote } from "@/hooks/useQuotes";
import { Invoice } from "@/hooks/useInvoices";
import { motion } from "framer-motion";
import PaymentsTab from "@/components/payments/PaymentsTab";
import QuoteStatusBadge from "@/components/quotes/QuoteStatusBadge";
import { Checkbox } from "@/components/ui/checkbox";
import { useDeleteInvoicesBulk } from "@/hooks/useInvoices";
import { useDeleteQuotesBulk } from "@/hooks/useQuotes";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const Facturation = () => {
  const navigate = useNavigate();
  const { data: quotes = [], isLoading: quotesLoading } = useQuotes();
  const { data: invoices = [], isLoading: invoicesLoading } = useInvoices();
  const { data: payments = [], isLoading: paymentsLoading } = usePaymentsQuery();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isEditQuoteOpen, setIsEditQuoteOpen] = useState(false);
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [isCreateFromQuoteOpen, setIsCreateFromQuoteOpen] = useState(false);
  const [isSendToClientOpen, setIsSendToClientOpen] = useState(false);
  const [sendToClientDocument, setSendToClientDocument] = useState<{ type: "quote" | "invoice"; document: any } | null>(null);
  const [selectedQuoteIds, setSelectedQuoteIds] = useState<Set<string>>(new Set());
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());
  const [selectionModeQuotes, setSelectionModeQuotes] = useState(false);
  const [selectionModeInvoices, setSelectionModeInvoices] = useState(false);
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrentPos, setDragCurrentPos] = useState<{ x: number; y: number } | null>(null);
  const deleteInvoicesBulk = useDeleteInvoicesBulk();
  const deleteQuotesBulk = useDeleteQuotesBulk();

  const filteredQuotes = quotes.filter((quote) =>
    quote.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    quote.quote_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredInvoices = invoices.filter((invoice) =>
    invoice.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    invoice.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ✅ DEBUG: Log pour vérifier les factures récupérées (après déclaration)
  console.log("📊 [Facturation] Factures récupérées:", invoices.length, invoices);
  console.log("📊 [Facturation] Factures filtrées:", filteredInvoices.length, filteredInvoices);

  const filteredPayments = payments.filter((payment) =>
    payment.reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    payment.payment_method?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  // Fonctions de sélection pour les devis
  const handleSelectAllQuotes = () => {
    setSelectionModeQuotes(true);
    // Ne sélectionne pas tout, juste active le mode sélection
  };

  const handleSelectOneQuote = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedQuoteIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedQuoteIds(newSelected);
  };

  const handleDeleteSelectedQuotes = async () => {
    if (selectedQuoteIds.size === 0) return;
    await deleteQuotesBulk.mutateAsync(Array.from(selectedQuoteIds));
    setSelectedQuoteIds(new Set());
    setSelectionModeQuotes(false);
  };

  // Fonctions de sélection pour les factures
  const handleSelectInvoice = (id: string) => {
    setSelectionModeInvoices(true);
    const newSelected = new Set(selectedInvoiceIds);
    newSelected.add(id);
    setSelectedInvoiceIds(newSelected);
  };

  const handleSelectAllInvoices = () => {
    setSelectionModeInvoices(true);
    // Ne sélectionne pas tout, juste active le mode sélection
  };

  const handleSelectOneInvoice = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedInvoiceIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedInvoiceIds(newSelected);
  };

  const handleDeleteSelectedInvoices = async () => {
    if (selectedInvoiceIds.size === 0) return;
    await deleteInvoicesBulk.mutateAsync(Array.from(selectedInvoiceIds));
    setSelectedInvoiceIds(new Set());
    setSelectionModeInvoices(false);
  };

  const allQuotesSelected = filteredQuotes.length > 0 && selectedQuoteIds.size === filteredQuotes.length;
  const allInvoicesSelected = filteredInvoices.length > 0 && selectedInvoiceIds.size === filteredInvoices.length;

  // Gestion de la sélection par clic sur la carte
  const handleQuoteCardClick = (quoteId: string, e: React.MouseEvent) => {
    if (!selectionModeQuotes) return;
    // Ne pas sélectionner si on clique sur un bouton ou une action
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('[role="button"]')) {
      return;
    }
    e.stopPropagation();
    handleSelectOneQuote(quoteId, !selectedQuoteIds.has(quoteId));
  };

  const handleInvoiceCardClick = (invoiceId: string, e: React.MouseEvent) => {
    if (!selectionModeInvoices) return;
    // Ne pas sélectionner si on clique sur un bouton ou une action
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('[role="button"]')) {
      return;
    }
    e.stopPropagation();
    handleSelectOneInvoice(invoiceId, !selectedInvoiceIds.has(invoiceId));
  };

  // Gestion de la sélection par glissement (comme Apple Photos)
  const handleMouseDown = (e: React.MouseEvent, type: 'quotes' | 'invoices') => {
    if (!(type === 'quotes' ? selectionModeQuotes : selectionModeInvoices)) return;
    // Ne pas déclencher le glissement si on clique sur un bouton ou une action
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('[role="button"]') || (e.target as HTMLElement).closest('input[type="checkbox"]')) {
      return;
    }
    setIsDraggingSelection(true);
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setDragCurrentPos({ x: e.clientX, y: e.clientY });
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent, type: 'quotes' | 'invoices') => {
    if (!isDraggingSelection || !dragStartPos) return;
    handleDragSelection(e.clientX, e.clientY, type);
  };

  const handleDragSelection = (clientX: number, clientY: number, type: 'quotes' | 'invoices') => {
    if (!dragStartPos) return;
    setDragCurrentPos({ x: clientX, y: clientY });

    // Trouver toutes les cartes dans la zone de glissement
    const cards = document.querySelectorAll(`[data-${type}-card-id]`);
    const start = dragStartPos;
    const current = { x: clientX, y: clientY };
    
    const minX = Math.min(start.x, current.x);
    const maxX = Math.max(start.x, current.x);
    const minY = Math.min(start.y, current.y);
    const maxY = Math.max(start.y, current.y);

    const selectedIds = new Set(type === 'quotes' ? selectedQuoteIds : selectedInvoiceIds);
    
    cards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      const cardCenterX = rect.left + rect.width / 2;
      const cardCenterY = rect.top + rect.height / 2;
      
      // Si la carte est dans la zone de glissement, la sélectionner
      if (cardCenterX >= minX && cardCenterX <= maxX && cardCenterY >= minY && cardCenterY <= maxY) {
        const cardId = card.getAttribute(`data-${type}-card-id`);
        if (cardId) {
          selectedIds.add(cardId);
        }
      }
    });

    if (type === 'quotes') {
      setSelectedQuoteIds(selectedIds);
    } else {
      setSelectedInvoiceIds(selectedIds);
    }
  };

  const handleMouseUp = () => {
    setIsDraggingSelection(false);
    setDragStartPos(null);
    setDragCurrentPos(null);
  };

  // Ajouter les event listeners globaux pour le glissement (fonctionne même en dehors des cartes)
  useEffect(() => {
    if (isDraggingSelection && dragStartPos) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        const type = selectionModeQuotes ? 'quotes' : selectionModeInvoices ? 'invoices' : null;
        if (!type) return;
        handleDragSelection(e.clientX, e.clientY, type);
      };

      const handleGlobalMouseUp = () => {
        handleMouseUp();
      };

      document.addEventListener('mousemove', handleGlobalMouseMove, { passive: true });
      document.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDraggingSelection, dragStartPos, selectionModeQuotes, selectionModeInvoices, selectedQuoteIds, selectedInvoiceIds]);

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
            <GlassCard className="p-4 sm:p-6">
              <div className="flex flex-col gap-3 sm:gap-4">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher un devis..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50 text-sm sm:text-base"
                    />
                  </div>
                  <Link to="/ai?tab=quotes" className="w-full sm:w-auto">
                    <Button className="w-full sm:w-auto gap-2">
                      <Plus className="w-4 h-4" />
                      <span className="hidden sm:inline">Nouveau devis</span>
                      <span className="sm:hidden">Nouveau</span>
                    </Button>
                  </Link>
                </div>
                
                {/* Barre d'actions de sélection */}
                {selectedQuoteIds.size > 0 && (
                  <div className="flex items-center justify-between p-3 bg-primary/10 dark:bg-primary/20 rounded-lg border border-primary/20">
                    <span className="text-sm font-medium">
                      {selectedQuoteIds.size} devis sélectionné{selectedQuoteIds.size > 1 ? 's' : ''}
                    </span>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="gap-2">
                          <Trash2 className="h-4 w-4" />
                          Supprimer ({selectedQuoteIds.size})
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>⚠️ Confirmer la suppression</AlertDialogTitle>
                          <AlertDialogDescription>
                            Êtes-vous sûr de vouloir supprimer {selectedQuoteIds.size} devis ?
                            <br /><br />
                            Cette action est <strong>irréversible</strong>.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => {
                      setSelectedQuoteIds(new Set());
                      setSelectionModeQuotes(false);
                    }}>Annuler</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteSelectedQuotes}
                            className="bg-destructive hover:bg-destructive/90"
                            disabled={deleteQuotesBulk.isPending}
                          >
                            {deleteQuotesBulk.isPending ? "Suppression..." : `Supprimer ${selectedQuoteIds.size} devis`}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
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
              <div className="space-y-4">
                {/* Bouton unique pour activer le mode sélection */}
                {!selectionModeQuotes && filteredQuotes.length > 0 && (
                  <GlassCard className="p-3">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-0">
                      <span className="text-xs sm:text-sm text-muted-foreground">
                        {filteredQuotes.length} devis disponible{filteredQuotes.length > 1 ? 's' : ''}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectionModeQuotes(true)}
                        className="gap-2 w-full sm:w-auto"
                      >
                        Sélectionner
                      </Button>
                    </div>
                  </GlassCard>
                )}

                {/* Bandeau mode sélection activé */}
                {selectionModeQuotes && (
                  <GlassCard className="p-3">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-0">
                      <span className="text-xs sm:text-sm text-muted-foreground">
                        Mode sélection activé - {selectedQuoteIds.size} devis sélectionné{selectedQuoteIds.size > 1 ? 's' : ''}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectionModeQuotes(false);
                            setSelectedQuoteIds(new Set());
                          }}
                          className="flex-1 sm:flex-initial"
                        >
                          Annuler
                        </Button>
                      </div>
                    </div>
                  </GlassCard>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {filteredQuotes.map((quote) => (
                    <GlassCard 
                      key={quote.id}
                      data-quotes-card-id={quote.id}
                      className={`p-3 sm:p-4 md:p-6 hover:border-primary/30 transition-colors ${selectionModeQuotes ? 'cursor-pointer select-none' : ''} ${selectedQuoteIds.has(quote.id) ? 'ring-2 ring-primary border-primary' : ''}`}
                      onClick={(e) => handleQuoteCardClick(quote.id, e)}
                      onMouseDown={(e) => handleMouseDown(e, 'quotes')}
                      onMouseMove={(e) => handleMouseMove(e, 'quotes')}
                      onMouseUp={handleMouseUp}
                    >
                      <div className="flex items-start gap-3 mb-4">
                        {selectionModeQuotes && (
                          <Checkbox
                            checked={selectedQuoteIds.has(quote.id)}
                            onCheckedChange={(checked) => handleSelectOneQuote(quote.id, checked as boolean)}
                            aria-label={`Sélectionner ${quote.quote_number}`}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        <div className={selectionModeQuotes ? "flex-1" : "w-full"}>
                          {!selectionModeQuotes && (
                            <>
                              <div className="flex items-start justify-between mb-4">
                                <div 
                                  className="flex-1 cursor-pointer"
                                  onClick={() => navigate(`/quotes/${quote.id}`)}
                                >
                                  <div>
                                    <h3 className="font-semibold text-lg">{quote.quote_number}</h3>
                                    <p className="text-sm text-muted-foreground">{quote.client_name}</p>
                                  </div>
                                </div>
                                <QuoteStatusBadge
                                  status={
                                    quote.signed ? 'signed' : 
                                    quote.sent_at ? 'sent' : 
                                    'draft'
                                  }
                                  signedAt={quote.signed_at}
                                />
                              </div>

                              <div className="space-y-2 mb-4">
                                <div className="flex items-center gap-2 text-sm">
                                  <Euro className="w-4 h-4 text-muted-foreground" />
                                  <span className="font-semibold">
                                    {(quote.total_ttc ?? quote.estimated_cost ?? 0).toLocaleString("fr-FR", {
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
                                {quote.signed && quote.signed_at && (
                                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span className="font-medium">
                                      Signé le {format(new Date(quote.signed_at), "d MMM", { locale: fr })}
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center justify-end gap-1 sm:gap-2 pt-2 border-t border-border/50">
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
                              </div>
                            </>
                          )}
                          {selectionModeQuotes && (
                            <>
                              <div 
                                className="flex items-start justify-between cursor-pointer mb-4"
                                onClick={() => navigate(`/quotes/${quote.id}`)}
                              >
                                <div>
                                  <h3 className="font-semibold text-lg">{quote.quote_number}</h3>
                                  <p className="text-sm text-muted-foreground">{quote.client_name}</p>
                                </div>
                                <QuoteStatusBadge
                                  status={
                                    quote.signed ? 'signed' : 
                                    quote.sent_at ? 'sent' : 
                                    'draft'
                                  }
                                  signedAt={quote.signed_at}
                                />
                              </div>

                              <div className="space-y-2 mb-4">
                                <div className="flex items-center gap-2 text-sm">
                                  <Euro className="w-4 h-4 text-muted-foreground" />
                                  <span className="font-semibold">
                                    {(quote.total_ttc ?? quote.estimated_cost ?? 0).toLocaleString("fr-FR", {
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
                                {quote.signed && quote.signed_at && (
                                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span className="font-medium">
                                      Signé le {format(new Date(quote.signed_at), "d MMM", { locale: fr })}
                                    </span>
                                  </div>
                                )}
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
                            </>
                          )}
                        </div>
                      </div>
                  </GlassCard>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="invoices" className="mt-0 space-y-6">
            {/* Recherche et Actions */}
            <GlassCard className="p-4 sm:p-6">
              <div className="flex flex-col gap-3 sm:gap-4">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher une facture..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50 text-sm sm:text-base"
                    />
                  </div>
                  <Button onClick={() => navigate("/ai?tab=invoices")} className="w-full sm:w-auto gap-2">
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Nouvelle facture</span>
                    <span className="sm:hidden">Nouvelle</span>
                  </Button>
                </div>
                
                {/* Barre d'actions de sélection */}
                {selectedInvoiceIds.size > 0 && (
                  <div className="flex items-center justify-between p-3 bg-primary/10 dark:bg-primary/20 rounded-lg border border-primary/20">
                    <span className="text-sm font-medium">
                      {selectedInvoiceIds.size} facture{selectedInvoiceIds.size > 1 ? 's' : ''} sélectionnée{selectedInvoiceIds.size > 1 ? 's' : ''}
                    </span>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="gap-2">
                          <Trash2 className="h-4 w-4" />
                          Supprimer ({selectedInvoiceIds.size})
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>⚠️ Confirmer la suppression</AlertDialogTitle>
                          <AlertDialogDescription>
                            Êtes-vous sûr de vouloir supprimer {selectedInvoiceIds.size} facture{selectedInvoiceIds.size > 1 ? 's' : ''} ?
                            <br /><br />
                            Cette action est <strong>irréversible</strong>.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => {
                      setSelectedInvoiceIds(new Set());
                      setSelectionModeInvoices(false);
                    }}>Annuler</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteSelectedInvoices}
                            className="bg-destructive hover:bg-destructive/90"
                            disabled={deleteInvoicesBulk.isPending}
                          >
                            {deleteInvoicesBulk.isPending ? "Suppression..." : `Supprimer ${selectedInvoiceIds.size} facture${selectedInvoiceIds.size > 1 ? 's' : ''}`}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
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
                  <Button onClick={() => navigate("/ai?tab=invoices")}>
                    <Plus className="w-4 h-4 mr-2" />
                    Créer une facture
                  </Button>
                )}
              </GlassCard>
            ) : (
              <div className="space-y-4">
                {/* Bouton unique pour activer le mode sélection */}
                {!selectionModeInvoices && filteredInvoices.length > 0 && (
                  <GlassCard className="p-3">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-0">
                      <span className="text-xs sm:text-sm text-muted-foreground">
                        {filteredInvoices.length} facture{filteredInvoices.length > 1 ? 's' : ''} disponible{filteredInvoices.length > 1 ? 's' : ''}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectionModeInvoices(true)}
                        className="gap-2 w-full sm:w-auto"
                      >
                        Sélectionner
                      </Button>
                    </div>
                  </GlassCard>
                )}

                {/* Bandeau mode sélection activé */}
                {selectionModeInvoices && (
                  <GlassCard className="p-3">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-0">
                      <span className="text-xs sm:text-sm text-muted-foreground">
                        Mode sélection activé - {selectedInvoiceIds.size} facture{selectedInvoiceIds.size > 1 ? 's' : ''} sélectionnée{selectedInvoiceIds.size > 1 ? 's' : ''}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectionModeInvoices(false);
                            setSelectedInvoiceIds(new Set());
                          }}
                          className="flex-1 sm:flex-initial"
                        >
                          Annuler
                        </Button>
                      </div>
                    </div>
                  </GlassCard>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {filteredInvoices.map((invoice) => (
                    <GlassCard 
                      key={invoice.id}
                      data-invoices-card-id={invoice.id}
                      className={`p-3 sm:p-4 md:p-6 ${selectionModeInvoices ? 'cursor-pointer select-none' : ''} ${selectedInvoiceIds.has(invoice.id) ? 'ring-2 ring-primary border-primary' : ''}`}
                      onClick={(e) => handleInvoiceCardClick(invoice.id, e)}
                      onMouseDown={(e) => handleMouseDown(e, 'invoices')}
                      onMouseMove={(e) => handleMouseMove(e, 'invoices')}
                      onMouseUp={handleMouseUp}
                    >
                      <div className="flex items-start gap-3 mb-4">
                        {selectionModeInvoices && (
                          <Checkbox
                            checked={selectedInvoiceIds.has(invoice.id)}
                            onCheckedChange={(checked) => handleSelectOneInvoice(invoice.id, checked as boolean)}
                            aria-label={`Sélectionner ${invoice.invoice_number}`}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        <div className={selectionModeInvoices ? "flex-1" : "w-full"}>
                          {!selectionModeInvoices && (
                            <>
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
                                    {(invoice.total_ttc ?? invoice.amount_ttc ?? invoice.amount ?? 0).toLocaleString("fr-FR", {
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


                              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedInvoice(invoice)}
                                  className="gap-2"
                                >
                                  <Eye className="w-4 h-4" />
                                  Voir
                                </Button>
                                <InvoiceActionButtons
                                  invoice={invoice}
                                  onDelete={() => {
                                    if (selectedInvoice?.id === invoice.id) {
                                      setSelectedInvoice(null);
                                    }
                                  }}
                                />
                              </div>
                            </>
                          )}
                          {selectionModeInvoices && (
                            <>
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
                                    {(invoice.total_ttc ?? invoice.amount_ttc ?? invoice.amount ?? 0).toLocaleString("fr-FR", {
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

                              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedInvoice(invoice)}
                                  className="gap-2"
                                >
                                  <Eye className="w-4 h-4" />
                                  Voir
                                </Button>
                                <InvoiceActionButtons
                                  invoice={invoice}
                                  onDelete={() => {
                                    if (selectedInvoice?.id === invoice.id) {
                                      setSelectedInvoice(null);
                                    }
                                    handleSelectOneInvoice(invoice.id, false);
                                  }}
                                />
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                  </GlassCard>
                ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="payments" className="mt-0">
            <PaymentsTab
              payments={payments}
              quotes={quotes}
              loading={paymentsLoading}
            />
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


