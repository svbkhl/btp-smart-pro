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
import { Invoice } from "@/hooks/useInvoices";
import { InvoiceActionButtons } from "@/components/invoices/InvoiceActionButtons";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useDeleteInvoicesBulk } from "@/hooks/useInvoices";
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

interface InvoicesTableProps {
  invoices: Invoice[];
  onView?: (invoice: Invoice) => void;
  onSend?: (invoice: Invoice) => void;
  onSign?: (invoice: Invoice) => void;
  onPay?: (invoice: Invoice) => void;
  onDelete?: (invoiceId: string) => void;
  loading?: boolean;
}

export const InvoicesTable = ({
  invoices,
  onView,
  onSend,
  onSign,
  onPay,
  onDelete,
  loading = false,
}: InvoicesTableProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const deleteBulk = useDeleteInvoicesBulk();

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

  const handleSelect = (id: string) => {
    setSelectionMode(true);
    const newSelected = new Set(selectedIds);
    newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    setSelectionMode(true);
    // Ne sélectionne pas tout, juste active le mode sélection
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    await deleteBulk.mutateAsync(Array.from(selectedIds));
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

  const allSelected = filteredInvoices.length > 0 && selectedIds.size === filteredInvoices.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < filteredInvoices.length;

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
      {/* Filtres et Actions */}
      <GlassCard className="p-4">
        <div className="flex flex-col gap-4">
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
          
          {/* Barre d'actions de sélection */}
          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between p-3 bg-primary/10 dark:bg-primary/20 rounded-lg border border-primary/20">
              <span className="text-sm font-medium">
                {selectedIds.size} facture{selectedIds.size > 1 ? 's' : ''} sélectionnée{selectedIds.size > 1 ? 's' : ''}
              </span>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="gap-2">
                    <Trash2 className="h-4 w-4" />
                    Supprimer ({selectedIds.size})
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>⚠️ Confirmer la suppression</AlertDialogTitle>
                    <AlertDialogDescription>
                      Êtes-vous sûr de vouloir supprimer {selectedIds.size} facture{selectedIds.size > 1 ? 's' : ''} ?
                      <br /><br />
                      Cette action est <strong>irréversible</strong>.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => {
                      setSelectedIds(new Set());
                      setSelectionMode(false);
                    }}>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteSelected}
                      className="bg-destructive hover:bg-destructive/90"
                      disabled={deleteBulk.isPending}
                    >
                      {deleteBulk.isPending ? "Suppression..." : `Supprimer ${selectedIds.size} facture${selectedIds.size > 1 ? 's' : ''}`}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Tableau */}
      <GlassCard className="p-2 sm:p-4 md:p-6">
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <p className="text-sm sm:text-base text-muted-foreground">
              {searchQuery || statusFilter !== "all" 
                ? "Aucune facture ne correspond aux filtres" 
                : "Aucune facture"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <Table className="min-w-[800px] sm:min-w-0">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px] sm:w-[120px]">{selectionMode ? "Sélection" : "Action"}</TableHead>
                  <TableHead className="w-[100px] sm:w-[120px]">Numéro</TableHead>
                  <TableHead className="min-w-[120px]">Client</TableHead>
                  <TableHead className="text-right w-[100px]">Montant</TableHead>
                  <TableHead className="hidden sm:table-cell">Statut</TableHead>
                  <TableHead className="hidden md:table-cell w-[100px]">Date</TableHead>
                  <TableHead className="text-right w-[100px] sm:w-auto">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    {selectionMode && (
                      <TableCell className="w-[60px] sm:w-[120px]">
                        <Checkbox
                          checked={selectedIds.has(invoice.id)}
                          onCheckedChange={(checked) => handleSelectOne(invoice.id, checked as boolean)}
                          aria-label={`Sélectionner ${invoice.invoice_number}`}
                        />
                      </TableCell>
                    )}
                    {!selectionMode && <TableCell className="w-[60px] sm:w-[120px]"></TableCell>}
                    <TableCell className="font-medium text-sm sm:text-base">
                      {invoice.invoice_number || invoice.id.substring(0, 8)}
                    </TableCell>
                    <TableCell className="min-w-[120px]">
                      <div className="flex items-center gap-2">
                        <User className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate">{invoice.client_name || "Non spécifié"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-sm sm:text-base whitespace-nowrap">
                      {/* ✅ CORRECTION P0: Lire total_ttc (colonne réelle) avec fallback */}
                      {(invoice.total_ttc ?? invoice.amount_ttc ?? invoice.amount ?? invoice.total_amount ?? 0).toLocaleString("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                      })}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant={getStatusColor(invoice.status) as any}>
                        {getStatusLabel(invoice.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                        {format(new Date(invoice.created_at), "d MMM yyyy", { locale: fr })}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 sm:gap-2">
                        {onView && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onView(invoice)}
                            className="h-7 w-7 sm:h-8 sm:w-8"
                          >
                            <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                        )}
                        <InvoiceActionButtons
                          invoice={invoice}
                          onDelete={onDelete ? () => onDelete(invoice.id) : undefined}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </GlassCard>
    </div>
  );
};




















