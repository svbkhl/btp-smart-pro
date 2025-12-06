import { useMemo } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { KPIBlock } from "@/components/ui/KPIBlock";
import { Badge } from "@/components/ui/badge";
import { QuotesTable } from "@/components/billing/QuotesTable";
import { InvoicesTable } from "@/components/billing/InvoicesTable";
import { useQuotes } from "@/hooks/useQuotes";
import { useInvoices } from "@/hooks/useInvoices";
import { usePaymentsQuery } from "@/hooks/usePaymentsQuery";
import { 
  FileText, 
  Receipt, 
  Euro, 
  TrendingUp,
  CheckCircle2,
  Clock,
  XCircle
} from "lucide-react";
import { Quote } from "@/hooks/useQuotes";
import { Invoice } from "@/hooks/useInvoices";
import { motion } from "framer-motion";

interface BillingOverviewProps {
  onQuoteAction?: (action: string, quote: Quote) => void;
  onInvoiceAction?: (action: string, invoice: Invoice) => void;
}

export const BillingOverview = ({
  onQuoteAction,
  onInvoiceAction,
}: BillingOverviewProps) => {
  const { data: quotes = [], isLoading: quotesLoading } = useQuotes();
  const { data: invoices = [], isLoading: invoicesLoading } = useInvoices();
  const { data: payments = [], isLoading: paymentsLoading } = usePaymentsQuery();

  // Calculer les statistiques
  const stats = useMemo(() => {
    const totalQuotes = quotes.length;
    const totalQuotesValue = quotes.reduce((sum, q) => sum + (q.estimated_cost || 0), 0);
    const acceptedQuotes = quotes.filter(q => q.status === "accepted").length;
    const sentQuotes = quotes.filter(q => q.status === "sent").length;
    const draftQuotes = quotes.filter(q => q.status === "draft").length;

    const totalInvoices = invoices.length;
    const totalInvoicesValue = invoices.reduce((sum, inv) => sum + (inv.amount_ttc || 0), 0);
    const paidInvoices = invoices.filter(inv => inv.status === "paid").length;
    const signedInvoices = invoices.filter(inv => inv.status === "signed").length;
    const overdueInvoices = invoices.filter(inv => {
      if (inv.status === "paid" || !inv.due_date) return false;
      return new Date(inv.due_date) < new Date();
    }).length;

    const totalPayments = payments.length;
    const totalPaymentsValue = payments
      .filter(p => p.status === "paid")
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    return {
      quotes: {
        total: totalQuotes,
        value: totalQuotesValue,
        accepted: acceptedQuotes,
        sent: sentQuotes,
        draft: draftQuotes,
      },
      invoices: {
        total: totalInvoices,
        value: totalInvoicesValue,
        paid: paidInvoices,
        signed: signedInvoices,
        overdue: overdueInvoices,
      },
      payments: {
        total: totalPayments,
        value: totalPaymentsValue,
      },
    };
  }, [quotes, invoices, payments]);

  const isLoading = quotesLoading || invoicesLoading || paymentsLoading;

  return (
    <PageLayout>
      <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2">
            Vue d'ensemble - Facturation
          </h1>
          <p className="text-muted-foreground">
            Tableau de bord complet de vos devis, factures et paiements
          </p>
        </div>

        {/* Statistiques rapides */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <KPIBlock
            title="Total Devis"
            value={stats.quotes.total.toString()}
            icon={FileText}
            description={`${stats.quotes.accepted} acceptés, ${stats.quotes.sent} envoyés`}
            delay={0.1}
            gradient="blue"
          />
          <KPIBlock
            title="Valeur Devis"
            value={new Intl.NumberFormat('fr-FR', { 
              style: 'currency', 
              currency: 'EUR', 
              maximumFractionDigits: 0 
            }).format(stats.quotes.value)}
            icon={Euro}
            description={`${stats.quotes.accepted} acceptés`}
            delay={0.2}
            gradient="green"
          />
          <KPIBlock
            title="Total Factures"
            value={stats.invoices.total.toString()}
            icon={Receipt}
            description={`${stats.invoices.paid} payées, ${stats.invoices.signed} signées`}
            delay={0.3}
            gradient="purple"
          />
          <KPIBlock
            title="Revenus"
            value={new Intl.NumberFormat('fr-FR', { 
              style: 'currency', 
              currency: 'EUR', 
              maximumFractionDigits: 0 
            }).format(stats.payments.value)}
            icon={TrendingUp}
            description={`${stats.payments.total} paiements`}
            delay={0.4}
            gradient="orange"
          />
        </div>

        {/* Alertes */}
        {(stats.invoices.overdue > 0 || stats.quotes.draft > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {stats.invoices.overdue > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <GlassCard className="p-4 sm:p-6 border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
                  <div className="flex items-center gap-3">
                    <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                    <div>
                      <h3 className="font-semibold text-red-900 dark:text-red-100">
                        {stats.invoices.overdue} facture{stats.invoices.overdue > 1 ? "s" : ""} en retard
                      </h3>
                      <p className="text-sm text-red-700 dark:text-red-300">
                        Nécessite votre attention
                      </p>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            )}
            {stats.quotes.draft > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <GlassCard className="p-4 sm:p-6 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
                  <div className="flex items-center gap-3">
                    <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    <div>
                      <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                        {stats.quotes.draft} devis en brouillon
                      </h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Prêts à être envoyés
                      </p>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </div>
        )}

        {/* Tableau des devis */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <GlassCard className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Tous les devis
              </h2>
              <Badge variant="secondary">
                {stats.quotes.total} devis
              </Badge>
            </div>
            <QuotesTable
              quotes={quotes}
              loading={quotesLoading}
              onView={(quote) => onQuoteAction?.("view", quote)}
              onEdit={(quote) => onQuoteAction?.("edit", quote)}
              onSend={(quote) => onQuoteAction?.("send", quote)}
              onSign={(quote) => onQuoteAction?.("sign", quote)}
              onDelete={(quote) => onQuoteAction?.("delete", quote)}
            />
          </GlassCard>
        </motion.div>

        {/* Tableau des factures */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <GlassCard className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Toutes les factures
              </h2>
              <Badge variant="secondary">
                {stats.invoices.total} factures
              </Badge>
            </div>
            <InvoicesTable
              invoices={invoices}
              loading={invoicesLoading}
              onView={(invoice) => onInvoiceAction?.("view", invoice)}
              onSend={(invoice) => onInvoiceAction?.("send", invoice)}
              onSign={(invoice) => onInvoiceAction?.("sign", invoice)}
              onPay={(invoice) => onInvoiceAction?.("pay", invoice)}
            />
          </GlassCard>
        </motion.div>
      </div>
    </PageLayout>
  );
};

