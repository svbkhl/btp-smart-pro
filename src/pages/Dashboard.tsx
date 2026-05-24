import { PageLayout } from "@/components/layout/PageLayout";
import { KPIBlock } from "@/components/ui/KPIBlock";
import { KPIBlockSkeleton } from "@/components/ui/KPIBlockSkeleton";
import { ProjectCardSkeleton } from "@/components/ui/ProjectCardSkeleton";
import { GlassCard } from "@/components/ui/GlassCard";
import { ChartCard } from "@/components/ui/ChartCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Euro, 
  FolderKanban, 
  Users, 
  TrendingUp, 
  AlertCircle,
  Plus,
  Calendar,
  Mail,
  FileText
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentUserDisplayName } from "@/hooks/useCurrentUserDisplayName";
import { useUserStats } from "@/hooks/useUserStats";
import { useProjects } from "@/hooks/useProjects";
import { useClients } from "@/hooks/useClients";
import { useQuotes } from "@/hooks/useQuotes";
import { useInvoices } from "@/hooks/useInvoices";
import { usePermissions } from "@/hooks/usePermissions";
import { RecentProjectsWidget, CalendarWidget, MessagesWidget, RecentClientsWidget } from "@/components/widgets";
import { useMemo, useEffect, useState } from "react";
import { format, subMonths, startOfMonth, endOfMonth, getYear } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fr } from "date-fns/locale";
import { motion } from "framer-motion";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar, PieChart, Pie, Cell, BarChart, Bar, Legend, Label } from "recharts";
import { BarChart3, Sparkles } from "lucide-react";
import { useFakeDataStore } from "@/store/useFakeDataStore";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isEmployee, loading: permissionsLoading } = usePermissions();
  const { firstName } = useCurrentUserDisplayName();
  const { fakeDataEnabled, closerEmployeeMode } = useFakeDataStore();

  // En mode "vue employé" (closer en démo), simuler le rôle employé
  const effectiveIsEmployee = isEmployee || (closerEmployeeMode && fakeDataEnabled);
  
  const currentYear = new Date().getFullYear();
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");

  const { data: stats, isLoading: statsLoading } = useUserStats();
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const { data: clients, isLoading: clientsLoading } = useClients();
  const { data: quotes, isLoading: quotesLoading } = useQuotes();
  const { data: invoices = [], isLoading: invoicesLoading } = useInvoices();


  // Années disponibles (depuis factures + projets)
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    invoices.forEach(inv => {
      const y = new Date(inv.created_at).getFullYear();
      if (y >= 2019) years.add(y);
    });
    (projects || []).forEach(p => {
      const y = new Date(p.created_at || 0).getFullYear();
      if (y >= 2019) years.add(y);
    });
    if (years.size === 0) years.add(currentYear);
    return Array.from(years).sort((a, b) => b - a);
  }, [invoices, projects, currentYear]);

  // Filtre période
  const periodYear = selectedPeriod === "year" ? currentYear : selectedPeriod === "all" ? null : parseInt(selectedPeriod);

  const filteredInvoices = useMemo(() => {
    if (!periodYear) return invoices;
    return invoices.filter(inv => new Date(inv.created_at).getFullYear() === periodYear);
  }, [invoices, periodYear]);

  const filteredProjects = useMemo(() => {
    const list = projects || [];
    if (!periodYear) return list;
    return list.filter(p => new Date(p.created_at || 0).getFullYear() === periodYear);
  }, [projects, periodYear]);

  // CA depuis factures (source principale)
  const invoiceCA = useMemo(() =>
    filteredInvoices.reduce((s, inv) => s + (inv.total_ttc || inv.amount || 0), 0),
  [filteredInvoices]);

  const invoicePaid = useMemo(() =>
    filteredInvoices.filter(inv => inv.status === "paid")
      .reduce((s, inv) => s + (inv.total_ttc || inv.amount || 0), 0),
  [filteredInvoices]);

  const calculatedStats = useMemo(() => {
    const projectsList = filteredProjects;
    const hasProjects = projectsList.length > 0;

    const projectRevenue = projectsList.reduce((sum, project) => {
      return sum + Number(project.actual_revenue || project.budget || 0);
    }, 0);
    const totalRevenue = invoicePaid > 0 ? invoicePaid : (invoiceCA > 0 ? invoiceCA : projectRevenue);

    const totalCosts = projectsList.reduce((sum, project) => sum + Number(project.costs || 0), 0);
    const totalProfit = totalRevenue - totalCosts;

    // Chantiers : table projects si disponible, sinon factures comme proxy
    let totalProjects: number;
    let activeProjects: number;
    let completedProjects: number;

    if (hasProjects) {
      totalProjects = projectsList.length;
      activeProjects = projectsList.filter(p =>
        ["planifié", "en_attente", "en_cours"].includes(p.status || "")
      ).length;
      completedProjects = projectsList.filter(p => p.status === "terminé").length;
    } else {
      // Fallback : chaque facture = 1 chantier terminé (facturer = travail fini)
      totalProjects = filteredInvoices.length;
      completedProjects = filteredInvoices.filter(inv => inv.status === "paid").length;
      activeProjects = 0; // impossible à déterminer depuis les factures seules
    }

    const totalClients = clients?.length || 0;

    return { totalRevenue, totalProfit, totalCosts, activeProjects, totalClients, completedProjects, totalProjects };
  }, [stats, clients, filteredProjects, filteredInvoices, invoiceCA, invoicePaid]);

  const alerts = useMemo(() => {
    const alertsList = [];
    
    const overdueProjects = projects?.filter(p => {
      if (!p.end_date || p.status === "terminé" || p.status === "annulé") return false;
      return new Date(p.end_date) < new Date();
    }) || [];
    
    if (overdueProjects.length > 0) {
      alertsList.push({
        type: "warning",
        message: `${overdueProjects.length} chantier${overdueProjects.length > 1 ? "s" : ""} en retard`,
        description: "Nécessite votre attention",
        action: "/projects",
        actionLabel: "Voir les chantiers",
      });
    }

    const pendingQuotes = quotes?.filter(q => 
      q.status === "draft" || q.status === "sent"
    ) || [];
    
    if (pendingQuotes.length > 0) {
      alertsList.push({
        type: "info",
        message: `${pendingQuotes.length} devis en attente`,
        description: "À valider par les clients",
        action: "/quotes",
        actionLabel: "Voir les devis",
      });
    }

    if (alertsList.length === 0) {
      alertsList.push({
        type: "default",
        message: "Tout va bien",
        description: "Aucune alerte pour le moment",
      });
    }

    return alertsList;
  }, [projects, quotes]);

  // Graphique Projets par statut
  const projectsByStatus = useMemo(() => {
    return (projects || []).reduce((acc, project) => {
      const status = project.status;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [projects]);

  const pieData = useMemo(() => {
    return Object.entries(projectsByStatus).map(([status, count]) => ({
      name: status === "en_cours" ? "En cours" :
            status === "en_attente" ? "En attente" :
            status === "terminé" ? "Terminé" :
            status === "planifié" ? "Planifié" :
            status === "annulé" ? "Annulé" : status,
      value: count,
    }));
  }, [projectsByStatus]);

  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

  // Graphique mensuel — adapté à la période sélectionnée
  const revenueData = useMemo(() => {
    const months = [];

    if (selectedPeriod === "all") {
      // Vue "Total" : un point par année disponible
      const yearSet = new Set<number>(availableYears);
      for (const y of Array.from(yearSet).sort()) {
        const yearRevenue = invoices
          .filter(inv => new Date(inv.created_at).getFullYear() === y)
          .reduce((s, inv) => s + (inv.total_ttc || inv.amount || 0), 0);
        const fallback = (projects || [])
          .filter(p => p.status === "terminé" && new Date(p.updated_at || 0).getFullYear() === y)
          .reduce((s, p) => s + (p.actual_revenue || p.budget || 0), 0);
        months.push({ month: String(y), revenue: yearRevenue || fallback });
      }
      return months;
    }

    // Vue année (current ou spécifique) : 12 mois de jan à déc
    const year = periodYear ?? currentYear;
    for (let m = 0; m < 12; m++) {
      const monthDate = new Date(year, m, 1);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      if (monthDate > new Date()) break; // pas de mois futurs
      const monthName = format(monthDate, "MMM", { locale: fr });
      const monthRevenue = invoices
        .filter(inv => {
          const d = new Date(inv.created_at);
          return d >= monthStart && d <= monthEnd;
        })
        .reduce((s, inv) => s + (inv.total_ttc || inv.amount || 0), 0);
      const fallback = (projects || [])
        .filter(p => {
          if (p.status !== "terminé" || !p.updated_at) return false;
          const d = new Date(p.updated_at);
          return d >= monthStart && d <= monthEnd;
        })
        .reduce((s, p) => s + (p.actual_revenue || p.budget || 0), 0);
      months.push({
        month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        revenue: monthRevenue || fallback,
      });
    }
    return months;
  }, [invoices, projects, selectedPeriod, periodYear, currentYear, availableYears]);

  const projectStatusData = [
    { name: "Terminés", value: stats?.completed_projects || 0, fill: "#10b981" },
    { name: "En cours", value: stats?.active_projects || 0, fill: "#3b82f6" },
    { name: "Planifiés", value: (stats?.total_projects || 0) - (stats?.active_projects || 0) - (stats?.completed_projects || 0), fill: "#8b5cf6" },
  ];

  const trends = useMemo(() => {
    if (fakeDataEnabled) {
      return {
        revenue:  { value: 12, isPositive: true },
        profit:   { value: 8,  isPositive: true },
        projects: { value: 20, isPositive: true },
        clients:  { value: 50, isPositive: true },
      };
    }

    const calcPct = (current: number, previous: number): { value: number; isPositive: boolean } | undefined => {
      if (current === 0 && previous === 0) return undefined;
      if (previous === 0 && current > 0) return undefined; // pas de référence = pas de %
      if (previous === 0) return undefined;
      const pct = Math.round(((current - previous) / previous) * 100);
      if (pct === 0) return undefined;
      return { value: Math.abs(pct), isPositive: pct > 0 };
    };

    // Mode "Total" = pas de comparaison pertinente → masquer tous les %
    if (selectedPeriod === "all") {
      return { revenue: undefined, profit: undefined, projects: undefined, clients: undefined };
    }

    // Année de référence
    const refYear = periodYear ?? currentYear;
    const prevYear = refYear - 1;

    // CA : factures payées année N vs N-1
    const paidCA = (year: number) =>
      invoices
        .filter(inv => new Date(inv.created_at).getFullYear() === year && inv.status === "paid")
        .reduce((s, inv) => s + (inv.total_ttc || inv.amount || 0), 0);
    const revenueTrend = calcPct(paidCA(refYear), paidCA(prevYear));

    // Bénéfice : uniquement si des coûts sont renseignés dans les projets
    const hasCostData = (projects || []).some(p => Number(p.costs || 0) > 0);
    const profitForYear = (year: number) =>
      (projects || [])
        .filter(p => new Date(p.created_at || 0).getFullYear() === year)
        .reduce((s, p) => s + ((p.actual_revenue || p.budget || 0) - (p.costs || 0)), 0);
    const profitTrend = hasCostData ? calcPct(profitForYear(refYear), profitForYear(prevYear)) : undefined;

    // Chantiers : créés cette année vs année précédente
    const projectsForYear = (year: number) =>
      (projects || []).filter(p => new Date(p.created_at || 0).getFullYear() === year).length;
    const projectsTrend = calcPct(projectsForYear(refYear), projectsForYear(prevYear));

    // Clients : ajoutés cette année vs année précédente
    const clientsForYear = (year: number) =>
      (clients || []).filter((c: any) => new Date(c.created_at || 0).getFullYear() === year).length;
    const clientsTrend = calcPct(clientsForYear(refYear), clientsForYear(prevYear));

    return { revenue: revenueTrend, profit: profitTrend, projects: projectsTrend, clients: clientsTrend };
  }, [invoices, projects, clients, selectedPeriod, periodYear, currentYear, fakeDataEnabled]);

  const isLoading = statsLoading || projectsLoading || clientsLoading || quotesLoading;

  // Vue employé : pas de stats (CA, nb chantiers), uniquement accès rapide
  if (effectiveIsEmployee) {
    const employeeCards = [
      { to: "/projects", icon: FolderKanban, title: "Mes chantiers", desc: "Voir mes affectations", iconClass: "bg-blue-500/20 text-blue-600 dark:text-blue-400", cardClass: "hover:border-blue-500/40" },
      { to: "/calendar", icon: Calendar, title: "Calendrier", desc: "Agenda et événements", iconClass: "bg-purple-500/20 text-purple-600 dark:text-purple-400", cardClass: "hover:border-purple-500/40" },
      { to: "/my-planning", icon: Calendar, title: "Mon planning", desc: "Affectations et saisie heures", iconClass: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400", cardClass: "hover:border-emerald-500/40" },
      { to: "/messaging", icon: Mail, title: "Messagerie", desc: "Messages", iconClass: "bg-amber-500/20 text-amber-600 dark:text-amber-400", cardClass: "hover:border-amber-500/40" },
      { to: "/facturation", icon: FileText, title: "Facturation", desc: "Devis et factures", iconClass: "bg-rose-500/20 text-rose-600 dark:text-rose-400", cardClass: "hover:border-rose-500/40" },
      { to: "/clients", icon: Users, title: "Clients", desc: "Gérer les clients", iconClass: "bg-cyan-500/20 text-cyan-600 dark:text-cyan-400", cardClass: "hover:border-cyan-500/40" },
    ];
    return (
      <PageLayout>
        <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-6 sm:space-y-8">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-1"
          >
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
              Bonjour {firstName || "Employé"} !
            </h1>
            <p className="text-muted-foreground">
              {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
            </p>
            <p className="text-sm text-muted-foreground/80">Voici un aperçu de votre journée</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {employeeCards.map((card, i) => (
              <motion.div
                key={card.to}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 * i }}
              >
                <Link to={card.to}>
                  <GlassCard
                    className={`p-6 transition-all duration-300 cursor-pointer h-full hover:shadow-xl hover:scale-[1.02] ${card.cardClass}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl shrink-0 ${card.iconClass}`}>
                        <card.icon className="h-6 w-6" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-base">{card.title}</h3>
                        <p className="text-sm text-muted-foreground truncate">{card.desc}</p>
                      </div>
                    </div>
                  </GlassCard>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Widgets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.35 }}
            >
              <RecentProjectsWidget />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.4 }}
            >
              <CalendarWidget />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.45 }}
            >
              <MessagesWidget />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.5 }}
            >
              <RecentClientsWidget />
            </motion.div>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6 md:space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col gap-4"
        >
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2">
              {firstName ? `Bonjour ${firstName} !` : 'Bonjour !'}
            </h1>
            <p className="text-muted-foreground">
              {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
            </p>
            <p className="text-sm text-muted-foreground/80 mt-1">
              Voici un aperçu de votre activité
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
            <div className="flex gap-2">
              <Link to="/analytics">
                <Button variant="outline" className="gap-2 rounded-xl">
                  <BarChart3 className="w-4 h-4" />
                  <span className="hidden sm:inline">Analyses Avancées</span>
                  <span className="sm:hidden">Analyses</span>
                </Button>
              </Link>
              <Link to="/ai-insights">
                <Button variant="outline" className="gap-2 rounded-xl">
                  <Sparkles className="w-4 h-4" />
                  <span className="hidden sm:inline">Insights IA</span>
                  <span className="sm:hidden">Insights</span>
                </Button>
              </Link>
            </div>

            {/* Sélecteur de période */}
            <div className="flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 p-1">
              <button
                onClick={() => setSelectedPeriod("year")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  selectedPeriod === "year"
                    ? "bg-background shadow text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {currentYear}
              </button>
              <button
                onClick={() => setSelectedPeriod("all")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  selectedPeriod === "all"
                    ? "bg-background shadow text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Total
              </button>
              <Select
                value={["year", "all"].includes(selectedPeriod) ? "" : selectedPeriod}
                onValueChange={(v) => v && setSelectedPeriod(v)}
              >
                <SelectTrigger className="h-8 w-[90px] rounded-lg border-0 bg-transparent shadow-none text-sm font-medium text-muted-foreground hover:text-foreground focus:ring-0">
                  <SelectValue placeholder="Année…" />
                </SelectTrigger>
                <SelectContent>
                  {availableYears
                    .filter(y => y !== currentYear)
                    .map(y => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <Link to="/projects" className="sm:ml-auto">
              <Button className="gap-2 rounded-xl shadow-lg hover:shadow-xl transition-all">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Nouveau chantier</span>
                <span className="sm:hidden">+ Nouveau</span>
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* KPI Blocks */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          <KPIBlock
            title="CA encaissé"
            value={new Intl.NumberFormat('fr-FR', {
              style: 'currency',
              currency: 'EUR',
              maximumFractionDigits: 0
            }).format(calculatedStats.totalRevenue)}
            icon={Euro}
            trend={trends.revenue}
            description={`Factures payées`}
            delay={0.1}
            gradient="blue"
          />
          <KPIBlock
            title="Bénéfice total"
            value={new Intl.NumberFormat('fr-FR', {
              style: 'currency',
              currency: 'EUR',
              maximumFractionDigits: 0
            }).format(calculatedStats.totalProfit)}
            icon={TrendingUp}
            trend={trends.profit}
            description={`Coûts: ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(calculatedStats.totalCosts)}`}
            delay={0.2}
            gradient={calculatedStats.totalProfit >= 0 ? "green" : "orange"}
          />
          <KPIBlock
            title="Chantiers actifs"
            value={calculatedStats.activeProjects.toString()}
            icon={FolderKanban}
            trend={trends.projects}
            description={`${calculatedStats.totalProjects} au total${filteredProjects.length === 0 && filteredInvoices.length > 0 ? " (via factures)" : ""}`}
            delay={0.3}
            gradient="blue"
          />
          <KPIBlock
            title="Clients"
            value={calculatedStats.totalClients.toString()}
            icon={Users}
            trend={trends.clients}
            description={`${projects?.filter(p => p.status === "en_cours").length || 0} projets en cours`}
            delay={0.4}
            gradient="purple"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Charts and Projects */}
          <div className="lg:col-span-2 space-y-6">
            <ChartCard
              title="Évolution du chiffre d'affaires"
              description={
                selectedPeriod === "all"
                  ? "CA annuel — toutes années"
                  : `CA mensuel — ${selectedPeriod === "year" ? currentYear : selectedPeriod}`
              }
              delay={0.5}
            >
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
                  <XAxis dataKey="month" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                      borderRadius: '12px',
                      backdropFilter: 'blur(10px)'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    fill="url(#colorRevenue)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Recent Projects Widget */}
            <RecentProjectsWidget />
          </div>

          {/* Sidebar - Alerts, Events & Charts */}
          <div className="space-y-6">
            {/* Alerts */}
            <GlassCard delay={0.6} className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-5 h-5 text-orange-500" />
                <h3 className="text-lg font-semibold text-foreground">Alertes</h3>
              </div>
              <div className="space-y-3">
                {alerts.map((alert, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.8 + index * 0.1 }}
                    className={`p-3 rounded-xl border cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md ${
                      alert.type === "warning" ? "bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/15" :
                      alert.type === "info" ? "bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/15" :
                      "bg-muted border-border hover:bg-muted/80"
                    }`}
                    onClick={() => {
                      if (alert.action) {
                        navigate(alert.action);
                      }
                    }}
                  >
                    <p className="text-sm font-medium text-foreground">{alert.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{alert.description}</p>
                    {alert.action && (
                      <p className="text-xs text-primary mt-2 font-medium hover:underline">
                        {alert.actionLabel} →
                      </p>
                    )}
                  </motion.div>
                ))}
              </div>
            </GlassCard>

            {/* Recent Clients Widget */}
            <RecentClientsWidget />

            {/* Calendar Widget */}
            <CalendarWidget />

            {/* Messages Widget */}
            <MessagesWidget />

            {/* Graphiques Stats - Compact */}
            {/* Projets par statut - PieChart */}
            {pieData.length > 0 && (
              <ChartCard
                title="Projets par statut"
                description="Répartition des projets"
                delay={0.9}
              >
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="45%"
                      labelLine={false}
                      label={({ percent, cx, cy, midAngle, innerRadius, outerRadius, name }) => {
                        const RADIAN = Math.PI / 180;
                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        
                        return (
                          <text 
                            x={x} 
                            y={y} 
                            fill="white" 
                            textAnchor={x > cx ? 'start' : 'end'} 
                            dominantBaseline="central"
                            fontSize={12}
                            fontWeight="bold"
                            style={{ 
                              textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                              pointerEvents: 'none'
                            }}
                          >
                            {`${(percent * 100).toFixed(0)}%`}
                          </text>
                        );
                      }}
                      outerRadius={65}
                      innerRadius={0}
                      fill="#8884d8"
                      dataKey="value"
                      paddingAngle={2}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        `${value} projet${value > 1 ? 's' : ''}`,
                        name
                      ]}
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid rgba(0, 0, 0, 0.1)',
                        borderRadius: '8px',
                        backdropFilter: 'blur(10px)',
                        fontSize: '12px'
                      }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={60}
                      iconType="circle"
                      formatter={(value) => value}
                      wrapperStyle={{ 
                        fontSize: '12px', 
                        paddingTop: '10px',
                        lineHeight: '1.5',
                        overflow: 'visible'
                      }}
                      layout="horizontal"
                    />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default Dashboard;
