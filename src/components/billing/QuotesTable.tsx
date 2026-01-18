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
import { Quote } from "@/hooks/useQuotes";
import { 
  Search, 
  Eye, 
  Send, 
  FileSignature, 
  Download, 
  Edit, 
  Euro,
  Calendar,
  User,
  Trash2
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { QuoteActionButtons } from "@/components/quotes/QuoteActionButtons";
import QuoteStatusBadge, { QuoteStatus } from "@/components/quotes/QuoteStatusBadge";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
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

interface QuotesTableProps {
  quotes: Quote[];
  onView?: (quote: Quote) => void;
  onEdit?: (quote: Quote) => void;
  onSend?: (quote: Quote) => void;
  onSign?: (quote: Quote) => void;
  onDelete?: (quote: Quote) => void;
  loading?: boolean;
}

export const QuotesTable = ({
  quotes,
  onView,
  onEdit,
  onSend,
  onSign,
  onDelete,
  loading = false,
}: QuotesTableProps) => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const deleteBulk = useDeleteQuotesBulk();

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

  const filteredQuotes = quotes.filter((quote) => {
    const matchesSearch = 
      quote.quote_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.client_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || quote.status === statusFilter;
    
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

  const allSelected = filteredQuotes.length > 0 && selectedIds.size === filteredQuotes.length;

  if (loading) {
    return (
      <GlassCard className="p-6">
        <div className="text-center py-12 text-muted-foreground">
          Chargement des devis...
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
                placeholder="Rechercher un devis..."
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
                <SelectItem value="sent">Envoyé</SelectItem>
                <SelectItem value="accepted">Accepté</SelectItem>
                <SelectItem value="rejected">Refusé</SelectItem>
                <SelectItem value="expired">Expiré</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Barre d'actions de sélection */}
          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between p-3 bg-primary/10 dark:bg-primary/20 rounded-lg border border-primary/20">
              <span className="text-sm font-medium">
                {selectedIds.size} devis sélectionné{selectedIds.size > 1 ? 's' : ''}
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
                      Êtes-vous sûr de vouloir supprimer {selectedIds.size} devis ?
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
                      {deleteBulk.isPending ? "Suppression..." : `Supprimer ${selectedIds.size} devis`}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Bouton unique pour activer le mode sélection */}
      {!selectionMode && filteredQuotes.length > 0 && (
        <GlassCard className="p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {filteredQuotes.length} devis disponible{filteredQuotes.length > 1 ? 's' : ''}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectionMode(true)}
              className="gap-2"
            >
              Sélectionner
            </Button>
          </div>
        </GlassCard>
      )}

      {/* Bandeau mode sélection activé */}
      {selectionMode && (
        <GlassCard className="p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Mode sélection activé - {selectedIds.size} devis sélectionné{selectedIds.size > 1 ? 's' : ''}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectionMode(false);
                  setSelectedIds(new Set());
                }}
              >
                Annuler
              </Button>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Tableau */}
      <GlassCard className="p-4 sm:p-6 overflow-x-auto">
        {filteredQuotes.length === 0 ? (
          <div className="text-center py-12">
            {searchQuery || statusFilter !== "all" ? (
              <div>
                <p className="text-muted-foreground mb-2">
                  Aucun devis ne correspond aux filtres
                </p>
                <p className="text-sm text-muted-foreground">
                  Essayez de modifier vos critères de recherche
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-lg font-medium text-muted-foreground">
                  Aucun devis
                </p>
                <p className="text-sm text-muted-foreground">
                  Commencez par créer votre premier devis.
                </p>
              </div>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">{selectionMode ? "Sélection" : "Action"}</TableHead>
                <TableHead className="w-[120px]">Numéro</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuotes.map((quote) => (
                <TableRow key={quote.id}>
                  {selectionMode && (
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(quote.id)}
                        onCheckedChange={(checked) => handleSelectOne(quote.id, checked as boolean)}
                        aria-label={`Sélectionner ${quote.quote_number}`}
                      />
                    </TableCell>
                  )}
                  {!selectionMode && <TableCell></TableCell>}
                  <TableCell className="font-medium">
                    {quote.quote_number || quote.id.substring(0, 8)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      {quote.client_name}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {(quote.total_ttc ?? quote.estimated_cost ?? 0).toLocaleString("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                    })}
                  </TableCell>
                  <TableCell>
                    <QuoteStatusBadge 
                      status={getQuoteStatus(quote)} 
                      signedAt={quote.signed_at}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(quote.created_at), "d MMM yyyy", { locale: fr })}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {onView && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onView(quote)}
                          className="h-8 w-8"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                      <QuoteActionButtons
                        quote={quote}
                        onEdit={onEdit ? () => onEdit(quote) : undefined}
                        onSend={onSend ? () => onSend(quote) : undefined}
                        onSign={onSign ? () => onSign(quote) : undefined}
                      />
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



















