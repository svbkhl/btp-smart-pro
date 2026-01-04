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
import { Quote } from "@/hooks/useQuotes";
import { 
  Search, 
  Eye, 
  Send, 
  FileSignature, 
  Download, 
  Edit, 
  Trash2,
  Euro,
  Calendar,
  User
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { QuoteActionButtons } from "@/components/quotes/QuoteActionButtons";
import QuoteStatusBadge, { QuoteStatus } from "@/components/quotes/QuoteStatusBadge";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

  const handleDeleteQuote = async (quoteId: string) => {
    try {
      const { error } = await supabase
        .from('ai_quotes')  // ← Correction: table s'appelle ai_quotes
        .delete()
        .eq('id', quoteId);

      if (error) throw error;

      toast({
        title: "✅ Devis supprimé",
        description: "Le devis a été supprimé avec succès",
      });

      // Rafraîchir la page
      window.location.reload();
    } catch (error: any) {
      console.error("Error deleting quote:", error);
      toast({
        title: "❌ Erreur",
        description: error.message || "Impossible de supprimer le devis",
        variant: "destructive",
      });
    }
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

  const filteredQuotes = quotes.filter((quote) => {
    const matchesSearch = 
      quote.quote_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.client_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || quote.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

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
      {/* Filtres */}
      <GlassCard className="p-4">
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
      </GlassCard>

      {/* Tableau */}
      <GlassCard className="p-4 sm:p-6 overflow-x-auto">
        {filteredQuotes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchQuery || statusFilter !== "all" 
                ? "Aucun devis ne correspond aux filtres" 
                : "Aucun devis"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
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
                    {quote.estimated_cost?.toLocaleString("fr-FR", {
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
                              Êtes-vous sûr de vouloir supprimer ce devis ?
                              <br /><br />
                              <strong>Numéro :</strong> {quote.quote_number || quote.id.substring(0, 8)}
                              <br />
                              <strong>Client :</strong> {quote.client_name}
                              <br />
                              <strong>Montant :</strong> {quote.estimated_cost?.toLocaleString("fr-FR", {
                                style: "currency",
                                currency: "EUR",
                              })}
                              <br />
                              <strong>Statut :</strong> {getQuoteStatus(quote)}
                              <br /><br />
                              Cette action est <strong>irréversible</strong>.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteQuote(quote.id)}
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



















