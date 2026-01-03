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
  FileText
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

interface PaymentsTabProps {
  payments: any[];
  quotes: any[];
  loading: boolean;
}

export default function PaymentsTab({ payments, quotes, loading }: PaymentsTabProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Devis signés en attente de paiement
  const signedQuotesNeedingPayment = useMemo(() => {
    return quotes.filter(q => 
      q.signed && 
      (!q.payment_status || q.payment_status === 'pending')
    );
  }, [quotes]);

  // Statistiques des paiements
  const stats = useMemo(() => {
    const total = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const succeeded = payments.filter(p => p.status === 'succeeded');
    const pending = payments.filter(p => p.status === 'pending');
    const failed = payments.filter(p => p.status === 'failed');
    
    const totalSucceeded = succeeded.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalPending = pending.reduce((sum, p) => sum + (p.amount || 0), 0);
    
    return {
      total: totalSucceeded,
      pending: totalPending,
      count: succeeded.length,
      pendingCount: pending.length,
      failedCount: failed.length,
      conversionRate: payments.length > 0 ? (succeeded.length / payments.length) * 100 : 0,
    };
  }, [payments]);

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch = 
      payment.reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.payment_method?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.stripe_payment_intent_id?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const copyLink = async (link: string) => {
    await navigator.clipboard.writeText(link);
    toast({
      title: "✅ Lien copié",
      description: "Le lien de paiement a été copié",
    });
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
          trend={stats.count > 0 ? "up" : undefined}
          trendValue={`${stats.count} paiement${stats.count > 1 ? 's' : ''}`}
        />
        
        <KPIBlock
          title="En attente"
          value={new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 0,
          }).format(stats.pending)}
          icon={Clock}
          trend={stats.pendingCount > 0 ? "neutral" : undefined}
          trendValue={`${stats.pendingCount} en cours`}
        />
        
        <KPIBlock
          title="Taux de réussite"
          value={`${stats.conversionRate.toFixed(0)}%`}
          icon={TrendingUp}
          trend={stats.conversionRate >= 80 ? "up" : stats.conversionRate >= 50 ? "neutral" : "down"}
          trendValue={`${stats.count} succès`}
        />
        
        <KPIBlock
          title="Échecs"
          value={stats.failedCount.toString()}
          icon={XCircle}
          trend={stats.failedCount > 0 ? "down" : undefined}
          trendValue={stats.failedCount > 0 ? "À relancer" : "Aucun"}
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
                className="flex items-center justify-between p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg border hover:border-primary/50 transition-colors"
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
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un paiement (référence, méthode, ID Stripe)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
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
          {filteredPayments.map((payment) => (
            <GlassCard key={payment.id} className="p-6 hover:border-primary/30 transition-colors">
              <div className="flex items-start justify-between">
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
