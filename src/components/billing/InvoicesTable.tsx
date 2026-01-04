import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Invoice } from "@/hooks/useInvoices";
import { 
  Search, 
  Eye, 
  Send, 
  FileSignature, 
  Download, 
  CreditCard,
  Euro,
  Calendar,
  User,
  Trash2
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface InvoicesTableProps {
  invoices: Invoice[];
  onView?: (invoice: Invoice) => void;
  onSend?: (invoice: Invoice) => void;
  onSign?: (invoice: Invoice) => void;
  onPay?: (invoice: Invoice) => void;
  loading?: boolean;
}

export const InvoicesTable = ({
  invoices,
  onView,
  onSend,
  onSign,
  onPay,
  loading = false,
}: InvoicesTableProps) => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const handleDeleteInvoice = async (invoiceId: string) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId);

      if (error) throw error;

      toast({
        title: "✅ Facture supprimée",
        description: "La facture a été supprimée avec succès",
      });

      // Rafraîchir la page
      window.location.reload();
    } catch (error: any) {
      console.error("Error deleting invoice:", error);
      toast({
        title: "❌ Erreur",
        description: error.message || "Impossible de supprimer la facture",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
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
      case "overdue":
        return "destructive";
      default:
        return "default";
    }
  };

  const getStatusLabel = (status: string) => {
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
      case "overdue":
        return "En retard";
      default:
        return status;
    }
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch = 
      invoice.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.client_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <GlassCard className="p-6">
        <div className="text-center py-12 text-muted-foreground">
          Chargement des factures...
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <GlassCard className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une facture..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50">
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="draft">Brouillon</SelectItem>
              <SelectItem value="sent">Envoyée</SelectItem>
              <SelectItem value="signed">Signée</SelectItem>
              <SelectItem value="paid">Payée</SelectItem>
              <SelectItem value="overdue">En retard</SelectItem>
              <SelectItem value="cancelled">Annulée</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </GlassCard>

      {/* Tableau */}
      <GlassCard className="p-4 sm:p-6 overflow-x-auto">
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchQuery || statusFilter !== "all" 
                ? "Aucune facture ne correspond aux filtres" 
                : "Aucune facture"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Numéro</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Montant TTC</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Échéance</TableHead>
                <TableHead>Paiement</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">
                    {invoice.invoice_number || invoice.id.substring(0, 8)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      {invoice.client_name || "Non spécifié"}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {invoice.amount_ttc?.toLocaleString("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(invoice.status) as any}>
                      {getStatusLabel(invoice.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {invoice.due_date ? (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {format(new Date(invoice.due_date), "d MMM yyyy", { locale: fr })}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Non définie</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {invoice.paid_at ? (
                      <div className="text-sm text-green-600 dark:text-green-400">
                        Payé le {format(new Date(invoice.paid_at), "d MMM yyyy", { locale: fr })}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">En attente</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {onView && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onView(invoice)}
                          className="h-8 w-8"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                      {invoice.status === "draft" && onSend && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onSend(invoice)}
                          className="h-8 w-8"
                          title="Envoyer au client"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      )}
                      {invoice.status === "signed" && onPay && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onPay(invoice)}
                          className="h-8 w-8"
                          title="Payer"
                        >
                          <CreditCard className="w-4 h-4" />
                        </Button>
                      )}
                      
                      {/* Bouton Supprimer avec confirmation */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>⚠️ Confirmer la suppression</AlertDialogTitle>
                            <AlertDialogDescription>
                              Êtes-vous sûr de vouloir supprimer cette facture ?
                              <br /><br />
                              <strong>Numéro :</strong> {invoice.invoice_number || invoice.id.substring(0, 8)}
                              <br />
                              <strong>Client :</strong> {invoice.client_name}
                              <br />
                              <strong>Montant :</strong> {invoice.amount_ttc?.toLocaleString("fr-FR", {
                                style: "currency",
                                currency: "EUR",
                              })}
                              <br /><br />
                              Cette action est <strong>irréversible</strong>.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteInvoice(invoice.id)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Supprimer définitivement
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </GlassCard>
    </div>
  );
};




















