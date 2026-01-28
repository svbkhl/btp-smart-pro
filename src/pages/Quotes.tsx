import { useState } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQuotes, Quote, useDeleteQuote } from "@/hooks/useQuotes";
import { QuoteActionButtons } from "@/components/quotes/QuoteActionButtons";
import { EditQuoteDialog } from "@/components/quotes/EditQuoteDialog";
import { QuoteDisplay } from "@/components/ai/QuoteDisplay";
import QuoteDetailView from "@/components/quotes/QuoteDetailView";
import QuoteStatusBadge, { QuoteStatus } from "@/components/quotes/QuoteStatusBadge";
import { useUserSettings } from "@/hooks/useUserSettings";
import { Search, FileText, Euro, Calendar, User, Filter, Eye, Plus } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/components/ui/use-toast";
import { safeAction } from "@/utils/safeAction";
import { Link } from "react-router-dom";

const Quotes = () => {
  const { data: quotes = [], isLoading } = useQuotes();
  const deleteQuote = useDeleteQuote();
  const { data: companyInfo } = useUserSettings();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewingQuote, setViewingQuote] = useState<Quote | null>(null);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState<string | null>(null);

  const filteredQuotes = quotes.filter((quote) => {
    const matchesSearch =
      quote.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.quote_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || quote.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleView = (quote: Quote) => {
    setViewingQuote(quote);
  };

  const handleEdit = (quote: Quote) => {
    setEditingQuote(quote);
  };

  const handleDelete = async (id: string) => {
    await safeAction(
      async () => {
        await deleteQuote.mutateAsync(id);
        setDeleteDialogOpen(false);
        setQuoteToDelete(null);
      },
      {
        successMessage: "Devis supprimé avec succès",
        errorMessage: "Erreur lors de la suppression du devis",
      }
    );
  };

  const getQuoteStatus = (quote: Quote): QuoteStatus => {
    // Vérifier d'abord si le devis est payé
    if (quote.payment_status === 'paid') return 'paid';
    if (quote.payment_status === 'partially_paid') return 'partially_paid';
    
    // Vérifier si signé
    if (quote.signed || quote.status === 'signed') return 'signed';
    
    // Vérifier si envoyé
    if (quote.sent_at || quote.status === 'sent') return 'sent';
    
    // Vérifier si expiré ou annulé
    if (quote.status === 'expired') return 'expired';
    if (quote.status === 'cancelled' || quote.status === 'rejected') return 'cancelled';
    
    // Par défaut: brouillon
    return 'draft';
  };

  const getStatusLabel = (status: Quote["status"]) => {
    switch (status) {
      case "accepted":
        return "Accepté";
      case "sent":
        return "Envoyé";
      case "draft":
        return "Brouillon";
      case "rejected":
        return "Refusé";
      case "expired":
        return "Expiré";
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <PageLayout>
        <div className="p-3 sm:p-3 sm:p-4 md:p-6 lg:p-8 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 animate-pulse text-primary" />
            <p className="text-muted-foreground">Chargement des devis...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="p-3 sm:p-3 sm:p-4 md:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2">
              Devis
            </h1>
            <p className="text-muted-foreground">
              Gérez vos devis et suivez leur statut
            </p>
          </div>
          <Link to="/ai">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nouveau devis
            </Button>
          </Link>
        </div>

        {/* Filtres et recherche */}
        <GlassCard className="p-4 sm:p-6">
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
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px] bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50 text-sm sm:text-base">
                  <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="draft">Brouillon</SelectItem>
                  <SelectItem value="sent">Envoyé</SelectItem>
                  <SelectItem value="accepted">Accepté</SelectItem>
                  <SelectItem value="rejected">Refusé</SelectItem>
                  <SelectItem value="expired">Expiré</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </GlassCard>

        {/* Liste des devis */}
        {filteredQuotes.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">Aucun devis</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || statusFilter !== "all"
                ? "Aucun devis ne correspond à vos critères"
                : "Créez votre premier devis pour commencer"}
            </p>
            {!searchQuery && statusFilter === "all" && (
              <Link to="/ai">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Créer un devis
                </Button>
              </Link>
            )}
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredQuotes.map((quote) => (
              <GlassCard key={quote.id} className="p-4 sm:p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">{quote.quote_number}</h3>
                    <QuoteStatusBadge 
                      status={getQuoteStatus(quote)} 
                      signedAt={quote.signed_at}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{quote.client_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Euro className="w-4 h-4 text-muted-foreground" />
                    <span className="font-semibold">
                      {quote.estimated_cost.toLocaleString("fr-FR", {
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

                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleView(quote)}
                    className="flex-1 gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Voir
                  </Button>
                  <QuoteActionButtons
                    quote={quote}
                    onEdit={() => handleEdit(quote)}
                    onSend={() => {
                      toast({
                        title: "Envoi",
                        description: "Fonctionnalité d'envoi à venir",
                      });
                    }}
                  />
                </div>
              </GlassCard>
            ))}
          </div>
        )}

        {/* Dialog de visualisation avec vue détaillée complète */}
        <Dialog open={!!viewingQuote} onOpenChange={(open) => !open && setViewingQuote(null)}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            {viewingQuote && (
              <QuoteDetailView
                quote={viewingQuote}
                onEdit={() => {
                  setViewingQuote(null);
                  setEditingQuote(viewingQuote);
                }}
                onDelete={() => {
                  setViewingQuote(null);
                  setQuoteToDelete(viewingQuote.id);
                  setDeleteDialogOpen(true);
                }}
                onSendEmail={() => {
                  toast({
                    title: "📧 Envoi en cours...",
                    description: "Le devis sera envoyé par email au client",
                  });
                }}
                onDownloadPDF={() => {
                  toast({
                    title: "📄 Téléchargement...",
                    description: "Le PDF du devis est en cours de génération",
                  });
                }}
                onClose={() => setViewingQuote(null)}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog d'édition */}
        <EditQuoteDialog
          open={!!editingQuote}
          onOpenChange={(open) => !open && setEditingQuote(null)}
          quote={editingQuote}
        />


        {/* Dialog de suppression */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer le devis</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir supprimer ce devis ? Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => quoteToDelete && handleDelete(quoteToDelete)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PageLayout>
  );
};

export default Quotes;
