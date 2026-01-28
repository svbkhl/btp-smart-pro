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
  Plus
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useUserStats } from "@/hooks/useUserStats";
import { useProjects } from "@/hooks/useProjects";
import { useClients } from "@/hooks/useClients";
import { useQuotes } from "@/hooks/useQuotes";
import { useInvoices } from "@/hooks/useInvoices";
import { RecentProjectsWidget, CalendarWidget, MessagesWidget } from "@/components/widgets";
import { useMemo } from "react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { motion } from "framer-motion";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar, PieChart, Pie, Cell, BarChart, Bar, Legend, Label } from "recharts";
import { BarChart3, Sparkles } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = useUserStats();
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const { data: clients, isLoading: clientsLoading } = useClients();
  const { data: quotes, isLoading: quotesLoading } = useQuotes();
  const { data: invoices = [], isLoading: invoicesLoading } = useInvoices();


  const calculatedStats = useMemo(() => {
    // Calculer le CA réel depuis les projets (actual_revenue si disponible, sinon budget)
    const totalRevenue = (projects || []).reduce((sum, project) => {
      const revenue = project.actual_revenue || project.budget || 0;
      return sum + Number(revenue);
    }, 0);

    // Calculer les coûts totaux
    const totalCosts = (projects || []).reduce((sum, project) => {
      return sum + Number(project.costs || 0);
    }, 0);

    // Calculer le bénéfice réel
    const totalProfit = totalRevenue - totalCosts;

    const activeProjects = stats?.active_projects || 0;
    const totalClients = clients?.length || 0;
    const completedProjects = stats?.completed_projects || 0;
    const totalProjects = stats?.total_projects || 0;

    return {
      totalRevenue,
      totalProfit,
      totalCosts,
      activeProjects,
      totalClients,
      completedProjects,
      totalProjects,
    };
  }, [stats, clients, projects]);

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

  // Calculer les données de revenus mensuels sur les 6 derniers mois
  const revenueData = useMemo(() => {
    const months = [];
    const now = new Date();
    
    // Générer les 6 derniers mois
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const monthName = format(monthDate, "MMM", { locale: fr });
      
      // Calculer le CA pour ce mois depuis les factures payées
      const monthRevenue = (invoices || [])
        .filter(inv => {
          const invDate = new Date(inv.created_at);
          return invDate >= monthStart && invDate <= monthEnd && inv.status === "paid";
        })
        .reduce((sum, inv) => sum + (inv.amount_ttc || 0), 0);
      
      // Si pas de factures, utiliser les projets terminés dans ce mois
      let fallbackRevenue = 0;
      if (monthRevenue === 0 && projects) {
        fallbackRevenue = projects
          .filter(p => {
            if (p.status !== "terminé" || !p.updated_at) return false;
            const projectDate = new Date(p.updated_at);
            return projectDate >= monthStart && projectDate <= monthEnd;
          })
          .reduce((sum, p) => sum + (p.actual_revenue || p.budget || 0), 0);
      }
      
      months.push({
        month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        revenue: monthRevenue || fallbackRevenue,
      });
    }
    
    return months;
  }, [invoices, projects]);

  const projectStatusData = [
    { name: "Terminés", value: stats?.completed_projects || 0, fill: "#10b981" },
    { name: "En cours", value: stats?.active_projects || 0, fill: "#3b82f6" },
    { name: "Planifiés", value: (stats?.total_projects || 0) - (stats?.active_projects || 0) - (stats?.completed_projects || 0), fill: "#8b5cf6" },
  ];

  const isLoading = statsLoading || projectsLoading || clientsLoading || quotesLoading;

  return (
    <PageLayout>
      <div className="p-3 sm:p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-4 sm:space-y-6 md:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2">
              Tableau de bord
            </h1>
            <p className="text-muted-foreground text-base">
              Bienvenue ! Voici un aperçu de votre activité
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              <Link to="/analytics">
                <Button
                  variant="outline"
                  className="gap-2 rounded-xl"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span className="hidden sm:inline">Analyses Avancées</span>
                  <span className="sm:hidden">Analyses</span>
                </Button>
              </Link>
              <Link to="/ai-insights">
                <Button
                  variant="outline"
                  className="gap-2 rounded-xl"
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="hidden sm:inline">Insights IA</span>
                  <span className="sm:hidden">Insights</span>
                </Button>
              </Link>
            </div>
            <Link to="/projects">
              <Button className="gap-2 w-full sm:w-auto rounded-xl shadow-lg hover:shadow-xl transition-all">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Nouveau chantier</span>
                <span className="sm:hidden">Nouveau</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* KPI Blocks */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <KPIBlock
            title="Chiffre d'affaires"
            value={new Intl.NumberFormat('fr-FR', { 
              style: 'currency', 
              currency: 'EUR', 
              maximumFractionDigits: 0 
            }).format(calculatedStats.totalRevenue)}
            icon={Euro}
            trend={calculatedStats.totalRevenue > 0 ? { value: 12, isPositive: true } : undefined}
            description={`${calculatedStats.totalProjects} chantiers`}
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
            trend={calculatedStats.totalProfit > 0 ? { value: 8, isPositive: true } : calculatedStats.totalProfit < 0 ? { value: 5, isPositive: false } : undefined}
            description={`Coûts: ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(calculatedStats.totalCosts)}`}
            delay={0.2}
            gradient={calculatedStats.totalProfit >= 0 ? "green" : "orange"}
          />
          <KPIBlock
            title="Chantiers actifs"
            value={calculatedStats.activeProjects.toString()}
            icon={FolderKanban}
            trend={calculatedStats.activeProjects > 0 ? { value: 8, isPositive: true } : undefined}
            description={`${stats?.total_projects || 0} projets au total`}
            delay={0.3}
            gradient="blue"
          />
          <KPIBlock
            title="Clients"
            value={calculatedStats.totalClients.toString()}
            icon={Users}
            trend={calculatedStats.totalClients > 0 ? { value: 15, isPositive: true } : undefined}
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
              description="CA mensuel sur les 6 derniers mois"
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
