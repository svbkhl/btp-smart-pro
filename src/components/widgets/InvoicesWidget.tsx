import { Link } from "react-router-dom";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { useInvoicesData } from "@/lib/data/orchestrator";
import { WidgetSkeleton } from "./WidgetSkeleton";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

/**
 * Widget affichant les factures (payées, en attente, en retard)
 * Se met à jour automatiquement toutes les 60s
 */
export const InvoicesWidget = () => {
  const {
    data: invoices,
    paidInvoices,
    pendingInvoices,
    overdueInvoices,
    pendingAmount,
    isLoading,
    error,
  } = useInvoicesData();

  if (isLoading) {
    return <WidgetSkeleton />;
  }

  if (error) {
    return (
      <GlassCard className="p-6">
        <div className="text-center text-muted-foreground text-sm">
          Erreur de chargement des factures
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Factures</h3>
        </div>
        <Link to="/facturation">
          <Button variant="ghost" size="sm" className="gap-2 rounded-xl">
            Voir tout
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-2 rounded-lg bg-green-500/10 border border-green-500/20">
          <p className="text-lg font-bold text-green-600 dark:text-green-400">
            {paidInvoices.length}
          </p>
          <p className="text-xs text-muted-foreground">Payées</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {pendingInvoices.length}
          </p>
          <p className="text-xs text-muted-foreground">En attente</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-lg font-bold text-red-600 dark:text-red-400">
            {overdueInvoices.length}
          </p>
          <p className="text-xs text-muted-foreground">En retard</p>
        </div>
      </div>

      {/* Montant en attente */}
      {pendingAmount > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-4 h-4 text-orange-500" />
            <p className="text-sm font-medium text-foreground">
              Montant en attente
            </p>
          </div>
          <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
            {new Intl.NumberFormat("fr-FR", {
              style: "currency",
              currency: "EUR",
            }).format(pendingAmount)}
          </p>
        </div>
      )}

      {/* Dernières factures */}
      {invoices.length > 0 ? (
        <div className="space-y-2">
          {invoices.slice(0, 3).map((invoice, index) => (
            <motion.div
              key={invoice.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link
                to={`/facturation?invoice=${invoice.id}`}
                className="block"
              >
                <div className="flex items-center justify-between p-2 rounded-lg border border-white/20 dark:border-gray-700/30 hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">
                        {invoice.invoice_number || `Facture #${invoice.id.slice(0, 8)}`}
                      </p>
                      <Badge
                        variant={
                          invoice.status === "paid"
                            ? "default"
                            : invoice.status === "sent"
                            ? "secondary"
                            : "outline"
                        }
                        className="rounded-lg text-xs"
                      >
                        {invoice.status === "paid"
                          ? "Payée"
                          : invoice.status === "sent"
                          ? "Envoyée"
                          : invoice.status === "signed"
                          ? "Signée"
                          : invoice.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      {invoice.due_date && (
                        <span>
                          Échéance:{" "}
                          {format(new Date(invoice.due_date), "dd MMM yyyy", {
                            locale: fr,
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {invoice.status === "paid" ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-orange-500" />
                    )}
                    <p className="text-sm font-bold text-foreground mt-1">
                      {new Intl.NumberFormat("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                        maximumFractionDigits: 0,
                      }).format(invoice.amount_ttc || 0)}
                    </p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-muted-foreground">
          <p className="text-sm">Aucune facture</p>
        </div>
      )}
    </GlassCard>
  );
};







