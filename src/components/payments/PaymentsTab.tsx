/**
 * Onglet Paiements complet dans Facturation
 * Gestion complète des paiements Stripe après signature
 */

import { useState, useMemo } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { KPIBlock } from "@/components/ui/KPIBlock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  CreditCard,
  Euro,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  ExternalLink,
  Copy,
  Filter,
  DollarSign,
  AlertCircle,
  FileText,
  Trash2
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/components/ui/use-toast";
import CreatePaymentLinkDialog from "./CreatePaymentLinkDialog";
import QuoteStatusBadge from "@/components/quotes/QuoteStatusBadge";
import { useNavigate } from "react-router-dom";
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
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { useQueryClient } from "@tanstack/react-query";

interface PaymentsTabProps {
  payments: any[];
  quotes: any[];
  loading: boolean;
}

export default function PaymentsTab({ payments, quotes, loading }: PaymentsTabProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  // Dédupliquer les paiements en attente (ne garder que le plus récent par devis)
  const deduplicatedPayments = useMemo(() => {
    const paymentsByQuote = new Map();
    
    payments.forEach(payment => {
      if (payment.status === 'pending' && payment.quote_id) {
        const existing = paymentsByQuote.get(payment.quote_id);
        if (!existing || new Date(payment.created_at) > new Date(existing.created_at)) {
          paymentsByQuote.set(payment.quote_id, payment);
        }
      } else {
        // Pour les paiements non-pending ou sans quote_id, les garder tous
        const key = `other_${payment.id}`;
        paymentsByQuote.set(key, payment);
      }
    });
    
    return Array.from(paymentsByQuote.values());
  }, [payments]);

  // Devis signés en attente de paiement (sans lien de paiement créé)
  const signedQuotesNeedingPayment = useMemo(() => {
    // Récupérer les IDs des devis qui ont déjà un paiement pending (dédupliqué)
    const quoteIdsWithPendingPayment = new Set(
      deduplicatedPayments
        .filter(p => p.status === 'pending' && p.quote_id)
        .map(p => p.quote_id)
    );
    
    // Filtrer les devis signés qui n'ont PAS de paiement pending
    return quotes.filter(q => 
      q.signed && 
      (!q.payment_status || q.payment_status === 'pending') &&
      !quoteIdsWithPendingPayment.has(q.id)  // Exclure si paiement pending existe
    );
  }, [quotes, deduplicatedPayments]);

  // Statistiques des paiements (calculées APRÈS déduplication)
  const stats = useMemo(() => {
    const succeeded = deduplicatedPayments.filter(p => p.status === 'succeeded');
    const pending = deduplicatedPayments.filter(p => p.status === 'pending');
    const failed = deduplicatedPayments.filter(p => p.status === 'failed');
    
    const totalSucceeded = succeeded.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalPending = pending.reduce((sum, p) => sum + (p.amount || 0), 0);
    
    return {
      total: totalSucceeded,
      pending: totalPending,
      count: succeeded.length,
      pendingCount: pending.length,
      failedCount: failed.length,
      conversionRate: deduplicatedPayments.length > 0 ? (succeeded.length / deduplicatedPayments.length) * 100 : 0,
    };
  }, [deduplicatedPayments]);

  const filteredPayments = deduplicatedPayments.filter((payment) => {
    const matchesSearch = 
      payment.reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.payment_method?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.stripe_payment_intent_id?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
    
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
    
    for (const id of Array.from(selectedIds)) {
      await handleDeletePayment(id);
    }
    
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

  const allSelected = filteredPayments.length > 0 && selectedIds.size === filteredPayments.length;

  const copyLink = async (link: string) => {
    await navigator.clipboard.writeText(link);
    toast({
      title: "✅ Lien copié",
      description: "Le lien de paiement a été copié",
    });
  };

  const handleDeletePayment = async (paymentId: string) => {
    try {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', paymentId);

      if (error) throw error;

      toast({
        title: "✅ Paiement supprimé",
        description: "Le paiement a été supprimé avec succès",
      });

      // Rafraîchir la page
      window.location.reload();
    } catch (error: any) {
      console.error('Erreur suppression paiement:', error);
      toast({
        title: "❌ Erreur",
        description: error.message || "Impossible de supprimer le paiement",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Chargement des paiements...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPIBlock
          title="Total encaissé"
          value={new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 0,
          }).format(stats.total)}
          icon={Euro}
          description={`${stats.count} paiement${stats.count > 1 ? 's' : ''} réussi${stats.count > 1 ? 's' : ''}`}
          gradient="green"
        />
        
        <KPIBlock
          title="En attente"
          value={new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 0,
          }).format(stats.pending)}
          icon={Clock}
          description={`${stats.pendingCount} paiement${stats.pendingCount > 1 ? 's' : ''} en cours`}
          gradient="orange"
        />
        
        <KPIBlock
          title="Taux de réussite"
          value={`${stats.conversionRate.toFixed(0)}%`}
          icon={TrendingUp}
          trend={
            stats.conversionRate >= 80 
              ? { value: 15, isPositive: true } 
              : stats.conversionRate < 50 
              ? { value: 10, isPositive: false }
              : undefined
          }
          description={`${stats.count} paiement${stats.count > 1 ? 's' : ''} réussi${stats.count > 1 ? 's' : ''}`}
          gradient="blue"
        />
        
        <KPIBlock
          title="Échecs"
          value={stats.failedCount.toString()}
          icon={XCircle}
          trend={stats.failedCount > 0 ? { value: stats.failedCount, isPositive: false } : undefined}
          description={stats.failedCount > 0 ? "À relancer" : "Aucun échec"}
          gradient="pink"
        />
      </div>

      {/* Devis signés en attente de paiement */}
      {signedQuotesNeedingPayment.length > 0 && (
        <GlassCard className="p-6 border-l-4 border-l-orange-500">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                Devis signés en attente de paiement
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {signedQuotesNeedingPayment.length} devis signé{signedQuotesNeedingPayment.length > 1 ? 's' : ''} nécessite{signedQuotesNeedingPayment.length > 1 ? 'nt' : ''} un lien de paiement
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {signedQuotesNeedingPayment.slice(0, 5).map((quote) => (
              <div
                key={quote.id}
                className="flex items-center justify-between p-4 bg-transparent backdrop-blur-xl rounded-lg border hover:border-primary/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">{quote.quote_number}</span>
                    <QuoteStatusBadge status="signed" signedAt={quote.signed_at} />
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{quote.client_name}</span>
                    <span className="text-primary font-semibold">
                      {new Intl.NumberFormat('fr-FR', {
                        style: 'currency',
                        currency: 'EUR',
                      }).format(quote.estimated_cost || 0)}
                    </span>
                    <span className="text-xs">
                      Signé le {new Date(quote.signed_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>

                <CreatePaymentLinkDialog
                  quote={quote}
                  onSuccess={() => {
                    // Rafraîchir paiements et devis sans recharger la page
                    queryClient.invalidateQueries({ queryKey: ["payments"] });
                    queryClient.invalidateQueries({ queryKey: ["quotes"] });
                  }}
                  trigger={
                    <Button size="sm" className="gap-2">
                      <CreditCard className="h-4 w-4" />
                      Créer lien de paiement
                    </Button>
                  }
                />
              </div>
            ))}

            {signedQuotesNeedingPayment.length > 5 && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/ai?tab=quotes')}
              >
                Voir tous les devis ({signedQuotesNeedingPayment.length})
              </Button>
            )}
          </div>
        </GlassCard>
      )}

      {/* Filtres et recherche */}
      <GlassCard className="p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un paiement (référence, méthode, ID Stripe)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 sm:pl-12"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="succeeded">✓ Payés</SelectItem>
                <SelectItem value="pending">⏳ En attente</SelectItem>
                <SelectItem value="failed">✗ Échoués</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Barre d'actions de sélection */}
          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between p-3 bg-primary/10 dark:bg-primary/20 rounded-lg border border-primary/20">
              <span className="text-sm font-medium">
                {selectedIds.size} paiement{selectedIds.size > 1 ? 's' : ''} sélectionné{selectedIds.size > 1 ? 's' : ''}
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
                      Êtes-vous sûr de vouloir supprimer {selectedIds.size} paiement{selectedIds.size > 1 ? 's' : ''} ?
                      <br /><br />
                      Cette action est <strong>irréversible</strong>.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setSelectedIds(new Set())}>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteSelected}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Supprimer {selectedIds.size} paiement{selectedIds.size > 1 ? 's' : ''}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Liste des paiements */}
      {filteredPayments.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <CreditCard className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-xl font-semibold mb-2">Aucun paiement</h3>
          <p className="text-muted-foreground mb-6">
            {searchQuery || statusFilter !== "all"
              ? "Aucun paiement ne correspond aux filtres"
              : signedQuotesNeedingPayment.length > 0
              ? "Créez des liens de paiement pour vos devis signés ci-dessus"
              : "Les paiements apparaîtront ici après la signature des devis"}
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {/* Bouton Tout sélectionner - visible seulement en mode sélection */}
          {selectionMode && (
            <GlassCard className="p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Mode sélection activé - {selectedIds.size} paiement{selectedIds.size > 1 ? 's' : ''} sélectionné{selectedIds.size > 1 ? 's' : ''}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  Activer la sélection pour tous
                </Button>
              </div>
            </GlassCard>
          )}

          {filteredPayments.map((payment) => (
            <GlassCard key={payment.id} className="p-6 hover:border-primary/30 transition-colors">
              <div className="flex items-start gap-3">
                {selectionMode && (
                  <Checkbox
                    checked={selectedIds.has(payment.id)}
                    onCheckedChange={(checked) => handleSelectOne(payment.id, checked as boolean)}
                    aria-label={`Sélectionner le paiement ${payment.id}`}
                    className="mt-1"
                  />
                )}
                <div className={`flex items-start justify-between ${selectionMode ? 'flex-1' : 'w-full'}`}>
                <div className="flex-1">
                  {/* En-tête */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-lg ${
                      payment.status === 'succeeded' 
                        ? 'bg-green-100 dark:bg-green-900/30' 
                        : payment.status === 'pending'
                        ? 'bg-orange-100 dark:bg-orange-900/30'
                        : 'bg-red-100 dark:bg-red-900/30'
                    }`}>
                      <DollarSign className={`h-5 w-5 ${
                        payment.status === 'succeeded' 
                          ? 'text-green-600' 
                          : payment.status === 'pending'
                          ? 'text-orange-600'
                          : 'text-red-600'
                      }`} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-lg">
                          {new Intl.NumberFormat('fr-FR', {
                            style: 'currency',
                            currency: 'EUR',
                          }).format(payment.amount || 0)}
                        </h4>
                        
                        <Badge variant={
                          payment.status === 'succeeded' ? 'default' : 
                          payment.status === 'pending' ? 'secondary' : 
                          'destructive'
                        }>
                          {payment.status === 'succeeded' && '✓ Payé'}
                          {payment.status === 'pending' && '⏳ En attente'}
                          {payment.status === 'failed' && '✗ Échoué'}
                        </Badge>

                        {payment.payment_type && (
                          <Badge variant="outline">
                            {payment.payment_type === 'total' && '💰 Total'}
                            {payment.payment_type === 'deposit' && '💵 Acompte'}
                            {payment.payment_type === 'installments' && '📅 Échéance'}
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground mt-1">
                        {payment.reference || `Paiement #${payment.id.slice(0, 8)}`}
                      </p>
                    </div>
                  </div>

                  {/* Informations */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Date</p>
                      <p className="text-sm font-medium">
                        {format(new Date(payment.created_at), "d MMM yyyy", { locale: fr })}
                      </p>
                    </div>

                    {payment.paid_date && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Payé le</p>
                        <p className="text-sm font-medium flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          {format(new Date(payment.paid_date), "d MMM", { locale: fr })}
                        </p>
                      </div>
                    )}

                    {payment.payment_method && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Méthode</p>
                        <p className="text-sm font-medium capitalize">
                          {payment.payment_method}
                        </p>
                      </div>
                    )}

                    {payment.quote_id && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Devis lié</p>
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-sm font-medium"
                          onClick={() => navigate(`/quotes/${payment.quote_id}`)}
                        >
                          Voir le devis
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Informations Stripe */}
                  {payment.stripe_payment_intent_id && (
                    <div className="mt-3 p-3 bg-blue-50/50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">ID Stripe Payment Intent</p>
                      <code className="text-xs font-mono text-blue-600 dark:text-blue-400">
                        {payment.stripe_payment_intent_id}
                      </code>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-4">
                    {payment.stripe_checkout_url && payment.status === 'pending' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(payment.stripe_checkout_url, '_blank')}
                          className="gap-2"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Ouvrir le lien
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyLink(payment.stripe_checkout_url)}
                          className="gap-2"
                        >
                          <Copy className="h-3 w-3" />
                          Copier
                        </Button>
                      </>
                    )}
                    
                    {/* Bouton supprimer avec confirmation */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 ml-auto"
                        >
                          <Trash2 className="h-3 w-3" />
                          Supprimer
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>⚠️ Confirmer la suppression</AlertDialogTitle>
                          <AlertDialogDescription>
                            Êtes-vous sûr de vouloir supprimer ce paiement ?
                            <br /><br />
                            <strong>Montant :</strong> {new Intl.NumberFormat('fr-FR', {
                              style: 'currency',
                              currency: 'EUR',
                            }).format(payment.amount || 0)}
                            <br />
                            <strong>Statut :</strong> {payment.status === 'succeeded' ? 'Payé' : payment.status === 'pending' ? 'En attente' : 'Échoué'}
                            <br /><br />
                            Cette action est <strong>irréversible</strong>.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeletePayment(payment.id)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Supprimer définitivement
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Message si aucun paiement après filtres */}
      {filteredPayments.length === 0 && payments.length > 0 && (
        <GlassCard className="p-8 text-center">
          <p className="text-muted-foreground">
            Aucun paiement ne correspond à vos critères de recherche
          </p>
        </GlassCard>
      )}
    </div>
  );
}

