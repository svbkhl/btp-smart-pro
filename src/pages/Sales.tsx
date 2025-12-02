import { useState } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { KPIBlock } from "@/components/ui/KPIBlock";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuotes } from "@/hooks/useQuotes";
import { useInvoices } from "@/hooks/useInvoices";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  Euro,
  FileText,
  Calendar,
  ArrowUp,
  ArrowDown,
  DollarSign,
  Receipt,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { useMemo } from "react";

const Sales = () => {
  const { data: quotes = [] } = useQuotes();
  const { data: invoices = [] } = useInvoices();
  const [period, setPeriod] = useState<"month" | "quarter" | "year">("month");

  const stats = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let endDate = endOfMonth(now);

    switch (period) {
      case "month":
        startDate = startOfMonth(now);
        break;
      case "quarter":
        startDate = startOfMonth(subMonths(now, 2));
        break;
      case "year":
        startDate = startOfMonth(subMonths(now, 11));
        break;
      default:
        startDate = startOfMonth(now);
    }

    const periodQuotes = quotes.filter((q) => {
      const quoteDate = new Date(q.created_at);
      return quoteDate >= startDate && quoteDate <= endDate;
    });

    const periodInvoices = invoices.filter((inv) => {
      const invDate = new Date(inv.created_at);
      return invDate >= startDate && invDate <= endDate;
    });

    const acceptedQuotes = periodQuotes.filter((q) => q.status === "accepted");
    const paidInvoices = periodInvoices.filter((inv) => inv.status === "paid");

    const totalQuotesValue = periodQuotes.reduce((sum, q) => sum + q.estimated_cost, 0);
    const acceptedQuotesValue = acceptedQuotes.reduce((sum, q) => sum + q.estimated_cost, 0);
    const totalInvoicesValue = periodInvoices.reduce((sum, inv) => sum + inv.amount_ttc, 0);
    const paidInvoicesValue = paidInvoices.reduce((sum, inv) => sum + inv.amount_ttc, 0);

    const conversionRate =
      periodQuotes.length > 0
        ? ((acceptedQuotes.length / periodQuotes.length) * 100).toFixed(1)
        : "0";

    const paymentRate =
      periodInvoices.length > 0
        ? ((paidInvoices.length / periodInvoices.length) * 100).toFixed(1)
        : "0";

    return {
      totalQuotes: periodQuotes.length,
      acceptedQuotes: acceptedQuotes.length,
      totalQuotesValue,
      acceptedQuotesValue,
      totalInvoices: periodInvoices.length,
      paidInvoices: paidInvoices.length,
      totalInvoicesValue,
      paidInvoicesValue,
      conversionRate: parseFloat(conversionRate),
      paymentRate: parseFloat(paymentRate),
    };
  }, [quotes, invoices, period]);

  const recentQuotes = quotes
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const recentInvoices = invoices
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <PageLayout>
      <div className="p-3 sm:p-3 sm:p-4 md:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2">
              Ventes
            </h1>
            <p className="text-muted-foreground">
              Suivez vos ventes et performances commerciales
            </p>
          </div>
          <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Ce mois</SelectItem>
              <SelectItem value="quarter">Ce trimestre</SelectItem>
              <SelectItem value="year">Cette année</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* KPI Blocks */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPIBlock
            title="Chiffre d'affaires"
            value={stats.paidInvoicesValue.toLocaleString("fr-FR", {
              style: "currency",
              currency: "EUR",
              maximumFractionDigits: 0,
            })}
            icon={Euro}
            description={`${stats.paidInvoices} factures payées`}
            delay={0.1}
            gradient="green"
          />
          <KPIBlock
            title="Devis acceptés"
            value={stats.acceptedQuotes.toString()}
            icon={CheckCircle2}
            description={`${stats.conversionRate}% de conversion`}
            delay={0.2}
            gradient="blue"
          />
          <KPIBlock
            title="Factures émises"
            value={stats.totalInvoices.toString()}
            icon={Receipt}
            description={`${stats.paymentRate}% payées`}
            delay={0.3}
            gradient="purple"
          />
          <KPIBlock
            title="Valeur devis"
            value={stats.totalQuotesValue.toLocaleString("fr-FR", {
              style: "currency",
              currency: "EUR",
              maximumFractionDigits: 0,
            })}
            icon={TrendingUp}
            description={`${stats.totalQuotes} devis créés`}
            delay={0.4}
            gradient="orange"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Devis récents */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Devis récents
              </h2>
              <Link to="/quotes">
                <Button variant="outline" size="sm">
                  Voir tout
                </Button>
              </Link>
            </div>
            <div className="space-y-3">
              {recentQuotes.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Aucun devis récent
                </p>
              ) : (
                recentQuotes.map((quote) => (
                  <div
                    key={quote.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{quote.quote_number}</span>
                        <Badge
                          variant={
                            quote.status === "accepted"
                              ? "default"
                              : quote.status === "sent"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {quote.status === "accepted"
                            ? "Accepté"
                            : quote.status === "sent"
                            ? "Envoyé"
                            : "Brouillon"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{quote.client_name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(quote.created_at), "d MMM yyyy", { locale: fr })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {quote.estimated_cost.toLocaleString("fr-FR", {
                          style: "currency",
                          currency: "EUR",
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassCard>

          {/* Factures récentes */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Factures récentes
              </h2>
              <Link to="/invoices">
                <Button variant="outline" size="sm">
                  Voir tout
                </Button>
              </Link>
            </div>
            <div className="space-y-3">
              {recentInvoices.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Aucune facture récente
                </p>
              ) : (
                recentInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{invoice.invoice_number}</span>
                        <Badge
                          variant={
                            invoice.status === "paid"
                              ? "default"
                              : invoice.status === "signed"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {invoice.status === "paid"
                            ? "Payée"
                            : invoice.status === "signed"
                            ? "Signée"
                            : "Brouillon"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {invoice.client_name || "Client non spécifié"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(invoice.created_at), "d MMM yyyy", { locale: fr })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {invoice.amount_ttc.toLocaleString("fr-FR", {
                          style: "currency",
                          currency: "EUR",
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </PageLayout>
  );
};

export default Sales;
