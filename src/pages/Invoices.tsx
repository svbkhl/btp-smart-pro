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
import { useInvoices, useDeleteInvoice, Invoice } from "@/hooks/useInvoices";
import { CreateInvoiceDialog } from "@/components/invoices/CreateInvoiceDialog";
import { InvoiceDisplay } from "@/components/invoices/InvoiceDisplay";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Plus, Search, FileText, Euro, Calendar, User, Eye, Trash2, Filter } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/components/ui/use-toast";
import { safeAction } from "@/utils/safeAction";

const Invoices = () => {
  const { data: invoices = [], isLoading } = useInvoices();
  const deleteInvoice = useDeleteInvoice();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.invoice_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleView = (invoice: Invoice) => {
    setViewingInvoice(invoice);
  };

  const handleDelete = async (id: string) => {
    await safeAction(
      async () => {
        await deleteInvoice.mutateAsync(id);
        setDeleteDialogOpen(false);
        setInvoiceToDelete(null);
      },
      {
        successMessage: "Facture supprimée avec succès",
        errorMessage: "Erreur lors de la suppression de la facture",
      }
    );
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

  if (isLoading) {
    return (
      <PageLayout>
        <div className="p-3 sm:p-3 sm:p-4 md:p-6 lg:p-8 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 animate-pulse text-primary" />
            <p className="text-muted-foreground">Chargement des factures...</p>
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
              Factures
            </h1>
            <p className="text-muted-foreground">
              Gérez vos factures et suivez vos paiements
            </p>
          </div>
          <Button onClick={() => setIsFormOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Nouvelle facture
          </Button>
        </div>

        {/* Filtres et recherche */}
        <GlassCard className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une facture..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 sm:pl-12 bg-transparent backdrop-blur-xl border-white/20 dark:border-white/10 text-sm sm:text-base"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px] bg-transparent backdrop-blur-xl border-white/20 dark:border-white/10 text-sm sm:text-base">
                  <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="draft">Brouillon</SelectItem>
                  <SelectItem value="sent">Envoyée</SelectItem>
                  <SelectItem value="signed">Signée</SelectItem>
                  <SelectItem value="paid">Payée</SelectItem>
                  <SelectItem value="cancelled">Annulée</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </GlassCard>

        {/* Liste des factures */}
        {filteredInvoices.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">Aucune facture</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || statusFilter !== "all"
                ? "Aucune facture ne correspond à vos critères"
                : "Créez votre première facture pour commencer"}
            </p>
            {!searchQuery && statusFilter === "all" && (
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Créer une facture
              </Button>
            )}
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredInvoices.map((invoice) => (
              <GlassCard key={invoice.id} className="p-4 sm:p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-1">
                      {invoice.invoice_number}
                    </h3>
                    <Badge variant={getStatusColor(invoice.status)} className="mt-1">
                      {getStatusLabel(invoice.status)}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {invoice.client_name || "Client non spécifié"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Euro className="w-4 h-4 text-muted-foreground" />
                    <span className="font-semibold">
                      {/* ✅ CORRECTION P0: Lire total_ttc (colonne réelle) avec fallback */}
                      {(invoice.total_ttc ?? invoice.amount_ttc ?? invoice.amount ?? 0).toLocaleString("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                      })}
                    </span>
                  </div>
                  {invoice.due_date && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Échéance: {format(new Date(invoice.due_date), "d MMM yyyy", { locale: fr })}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {format(new Date(invoice.created_at), "d MMM yyyy", { locale: fr })}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleView(invoice)}
                    className="flex-1 gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Voir
                  </Button>
                  {invoice.status === "draft" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setInvoiceToDelete(invoice.id);
                        setDeleteDialogOpen(true);
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </GlassCard>
            ))}
          </div>
        )}

        {/* Dialog de création */}
        <CreateInvoiceDialog
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
        />

        {/* Dialog de visualisation - Aperçu en grand */}
        <Dialog open={!!viewingInvoice} onOpenChange={(open) => !open && setViewingInvoice(null)}>
          <DialogContent className="max-w-6xl w-[95vw] max-h-[95vh] overflow-y-auto p-0">
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
              <DialogTitle className="text-2xl">Détails de la facture</DialogTitle>
              <DialogDescription>
                {viewingInvoice ? `Visualisation complète de la facture ${viewingInvoice.invoice_number}` : ""}
              </DialogDescription>
            </DialogHeader>
            <div className="px-6 py-4">
              {viewingInvoice && (
                <InvoiceDisplay
                  invoice={viewingInvoice}
                  onClose={() => setViewingInvoice(null)}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog de suppression */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer la facture</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir supprimer cette facture ? Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => invoiceToDelete && handleDelete(invoiceToDelete)}
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

export default Invoices;
