/**
 * Composant Analytics Avancé
 * 
 * Fournit des graphiques et analyses approfondies pour les projets, clients, et finances.
 * 
 * Features:
 * - Graphiques de tendances (CA, projets, clients)
 * - Analyse de rentabilité par projet
 * - Prévisions basées sur l'historique
 * - Comparaisons périodiques
 * - Export Excel avec données
 */

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, TrendingDown, DollarSign, Briefcase, Users, Calendar } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { useClients } from "@/hooks/useClients";
import { useInvoices } from "@/hooks/useInvoices";
import { exportAnalytics } from "@/utils/exportAnalytics";
import { useToast } from "@/components/ui/use-toast";
import type { Project } from "@/fakeData/projects";

// Types
type Period = "week" | "month" | "quarter" | "year";
type MetricType = "revenue" | "projects" | "clients";

interface TimeSeriesData {
  period: string;
  revenue: number;
  projects: number;
  clients: number;
  budget: number;
  costs: number;
}

interface ProfitabilityData {
  name: string;
  budget: number;
  costs: number;
  revenue: number;
  profit: number;
  margin: number;
}

// Couleurs pour les graphiques
const COLORS = {
  primary: "#3b82f6",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  purple: "#a855f7",
  teal: "#14b8a6",
};

const STATUS_COLORS: Record<string, string> = {
  "planifié": COLORS.primary,
  "en_attente": COLORS.warning,
  "en_cours": COLORS.teal,
  "terminé": COLORS.success,
  "annulé": COLORS.danger,
};

export function AdvancedAnalytics() {
  const [period, setPeriod] = useState<Period>("month");
  const [metricType, setMetricType] = useState<MetricType>("revenue");
  
  const { data: projects = [] } = useProjects();
  const { data: clients = [] } = useClients();
  const { data: invoices = [] } = useInvoices();
  const { toast } = useToast();

  // ============================================================================
  // CALCULS DES DONNÉES
  // ============================================================================

  /**
   * Données de séries temporelles
   */
  const timeSeriesData = useMemo<TimeSeriesData[]>(() => {
    if (!projects.length) return [];

    const now = new Date();
    const periods: TimeSeriesData[] = [];
    
    // Déterminer le nombre de périodes à afficher
    const periodCount = period === "week" ? 12 : period === "month" ? 12 : period === "quarter" ? 8 : 5;
    
    for (let i = periodCount - 1; i >= 0; i--) {
      const periodStart = new Date(now);
      const periodEnd = new Date(now);
      
      switch (period) {
        case "week":
          periodStart.setDate(now.getDate() - (i + 1) * 7);
          periodEnd.setDate(now.getDate() - i * 7);
          break;
        case "month":
          periodStart.setMonth(now.getMonth() - (i + 1));
          periodEnd.setMonth(now.getMonth() - i);
          break;
        case "quarter":
          periodStart.setMonth(now.getMonth() - (i + 1) * 3);
          periodEnd.setMonth(now.getMonth() - i * 3);
          break;
        case "year":
          periodStart.setFullYear(now.getFullYear() - (i + 1));
          periodEnd.setFullYear(now.getFullYear() - i);
          break;
      }

      // Filtrer les projets de cette période
      const periodProjects = projects.filter((p: Project) => {
        const createdAt = new Date(p.created_at);
        return createdAt >= periodStart && createdAt < periodEnd;
      });

      // Calculer les métriques
      const revenue = periodProjects.reduce((sum: number, p: Project) => sum + (p.actual_revenue || 0), 0);
      const budget = periodProjects.reduce((sum: number, p: Project) => sum + (p.budget || 0), 0);
      const costs = periodProjects.reduce((sum: number, p: Project) => sum + (p.costs || 0), 0);

      // Clients uniques dans cette période
      const uniqueClients = new Set(
        periodProjects.filter((p: Project) => p.client_id).map((p: Project) => p.client_id)
      );

      periods.push({
        period: formatPeriod(periodStart, period),
        revenue,
        projects: periodProjects.length,
        clients: uniqueClients.size,
        budget,
        costs,
      });
    }

    return periods;
  }, [projects, period]);

  /**
   * Données de rentabilité par projet
   */
  const profitabilityData = useMemo<ProfitabilityData[]>(() => {
    return projects
      .filter((p: Project) => p.status === "terminé" || p.status === "en_cours")
      .map((p: Project) => {
        const budget = p.budget || 0;
        const costs = p.costs || 0;
        const revenue = p.actual_revenue || 0;
        const profit = revenue - costs;
        const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

        return {
          name: p.name.length > 20 ? p.name.substring(0, 20) + "..." : p.name,
          budget,
          costs,
          revenue,
          profit,
          margin,
        };
      })
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10); // Top 10
  }, [projects]);

  /**
   * Distribution des projets par statut
   */
  const statusDistribution = useMemo(() => {
    const distribution: Record<string, number> = {};
    
    projects.forEach((p: Project) => {
      distribution[p.status] = (distribution[p.status] || 0) + 1;
    });

    return Object.entries(distribution).map(([status, count]) => ({
      name: status.replace("_", " "),
      value: count,
      color: STATUS_COLORS[status] || COLORS.primary,
    }));
  }, [projects]);

  /**
   * KPIs Globaux
   */
  const kpis = useMemo(() => {
    const totalRevenue = projects.reduce((sum: number, p: Project) => sum + (p.actual_revenue || 0), 0);
    const totalCosts = projects.reduce((sum: number, p: Project) => sum + (p.costs || 0), 0);
    const totalBudget = projects.reduce((sum: number, p: Project) => sum + (p.budget || 0), 0);
    const totalProfit = totalRevenue - totalCosts;
    const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // Calcul de la tendance (comparaison avec période précédente)
    const currentPeriodRevenue = timeSeriesData[timeSeriesData.length - 1]?.revenue || 0;
    const previousPeriodRevenue = timeSeriesData[timeSeriesData.length - 2]?.revenue || 0;
    const revenueTrend = previousPeriodRevenue > 0
      ? ((currentPeriodRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100
      : 0;

    return {
      totalRevenue,
      totalCosts,
      totalBudget,
      totalProfit,
      avgMargin,
      revenueTrend,
      activeProjects: projects.filter((p: Project) => p.status === "en_cours").length,
      totalClients: clients.length,
    };
  }, [projects, clients, timeSeriesData]);

  // ============================================================================
  // FONCTIONS UTILITAIRES
  // ============================================================================

  function formatPeriod(date: Date, period: Period): string {
    const options: Intl.DateTimeFormatOptions = {};
    
    switch (period) {
      case "week":
        return `S${getWeekNumber(date)}`;
      case "month":
        return date.toLocaleDateString("fr-FR", { month: "short" });
      case "quarter":
        return `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
      case "year":
        return date.getFullYear().toString();
    }
  }

  function getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  function formatPercent(value: number): string {
    return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
  }

  /**
   * Export des données en CSV
   */
  function handleExport() {
    try {
      exportAnalytics(projects, clients, invoices, 'csv');
      toast({
        title: "Export réussi",
        description: "Les données analytics ont été exportées en CSV.",
      });
    } catch (error) {
      toast({
        title: "Erreur d'export",
        description: "Impossible d'exporter les données.",
        variant: "destructive",
      });
    }
  }

  // ============================================================================
  // RENDU
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* En-tête avec contrôles */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Analyses Avancées</h2>
          <p className="text-muted-foreground">
            Analyses approfondies de vos performances
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Par semaine</SelectItem>
              <SelectItem value="month">Par mois</SelectItem>
              <SelectItem value="quarter">Par trimestre</SelectItem>
              <SelectItem value="year">Par année</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={handleExport} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exporter
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chiffre d'Affaires</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              {kpis.revenueTrend >= 0 ? (
                <>
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span className="text-green-500">{formatPercent(kpis.revenueTrend)}</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 text-red-500" />
                  <span className="text-red-500">{formatPercent(kpis.revenueTrend)}</span>
                </>
              )}
              <span className="ml-1">vs période précédente</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Marge Moyenne</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.avgMargin.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Profit: {formatCurrency(kpis.totalProfit)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projets Actifs</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.activeProjects}</div>
            <p className="text-xs text-muted-foreground">
              {projects.length} projets au total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalClients}</div>
            <p className="text-xs text-muted-foreground">
              Clients actifs
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Onglets de graphiques */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Tendances</TabsTrigger>
          <TabsTrigger value="profitability">Rentabilité</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
        </TabsList>

        {/* Graphique de tendances */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Évolution Temporelle</CardTitle>
              <CardDescription>
                Suivi de vos métriques clés sur la période sélectionnée
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={timeSeriesData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={COLORS.success} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorCosts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.danger} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={COLORS.danger} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    labelStyle={{ color: "#000" }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke={COLORS.success}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                    name="Chiffre d'affaires"
                  />
                  <Area
                    type="monotone"
                    dataKey="costs"
                    stroke={COLORS.danger}
                    fillOpacity={1}
                    fill="url(#colorCosts)"
                    name="Coûts"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Nombre de Projets et Clients</CardTitle>
              <CardDescription>
                Évolution du nombre de projets et clients actifs
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip labelStyle={{ color: "#000" }} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="projects"
                    stroke={COLORS.primary}
                    strokeWidth={2}
                    name="Projets"
                  />
                  <Line
                    type="monotone"
                    dataKey="clients"
                    stroke={COLORS.purple}
                    strokeWidth={2}
                    name="Clients"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Graphique de rentabilité */}
        <TabsContent value="profitability" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Projets par Rentabilité</CardTitle>
              <CardDescription>
                Comparaison des revenus, coûts et profits par projet
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={profitabilityData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    labelStyle={{ color: "#000" }}
                  />
                  <Legend />
                  <Bar dataKey="revenue" fill={COLORS.success} name="Revenus" />
                  <Bar dataKey="costs" fill={COLORS.danger} name="Coûts" />
                  <Bar dataKey="profit" fill={COLORS.primary} name="Profit" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Marge par Projet (%)</CardTitle>
              <CardDescription>
                Pourcentage de marge bénéficiaire par projet
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={profitabilityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => `${value.toFixed(1)}%`}
                    labelStyle={{ color: "#000" }}
                  />
                  <Bar dataKey="margin" fill={COLORS.teal} name="Marge (%)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Graphique de distribution */}
        <TabsContent value="distribution" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Distribution des Projets par Statut</CardTitle>
              <CardDescription>
                Répartition des projets selon leur état d'avancement
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name} (${entry.value})`}
                    outerRadius={150}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip labelStyle={{ color: "#000" }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
