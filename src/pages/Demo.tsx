import { useEffect, useLayoutEffect, useRef } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { KPIBlock } from "@/components/ui/KPIBlock";
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
  ShieldCheck
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { FAKE_PROJECTS } from "@/fakeData/projects";
import { FAKE_CLIENTS } from "@/fakeData/clients";
import { FAKE_EVENTS } from "@/fakeData/calendar";
import { FAKE_QUOTES } from "@/fakeData/quotes";
import { FAKE_USER_STATS } from "@/fakeData/stats";
import { FAKE_INVOICES } from "@/fakeData/invoices";
import { useFakeDataStore } from "@/store/useFakeDataStore";
import { useLandingDemoStore } from "@/store/useLandingDemoStore";
import { useAuth } from "@/hooks/useAuth";
import { RecentProjectsWidget, CalendarWidget, MessagesWidget } from "@/components/widgets";

const Demo = () => {
  const navigate = useNavigate();
  const { user, userRole, loading: authLoading } = useAuth();
  const { setFakeDataEnabled } = useFakeDataStore();
  const { activateDemo, deactivateDemo } = useLandingDemoStore();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Activer le mode démo immédiatement au montage (avant le premier paint) pour que la démo fonctionne directement
  useLayoutEffect(() => {
    activateDemo();
    setFakeDataEnabled(true);
  }, [activateDemo, setFakeDataEnabled]);

  // Redirection et focus une fois l'auth connue
  useEffect(() => {
    // Attendre la fin du chargement auth avant de décider
    if (authLoading) return;

    // Utilisateur connecté mais non-admin → quitter la démo et aller sur le dashboard réel
    if (user && userRole !== 'admin') {
      setFakeDataEnabled(false);
      deactivateDemo();
      navigate("/dashboard", { replace: true });
      return;
    }

    // Démo publique (non connecté) ou admin : s'assurer que le mode démo reste actif
    if (!user || userRole === 'admin') {
      activateDemo();
      setFakeDataEnabled(true);
    }

    // Auto-focus sur le champ de recherche principal
    // Utiliser MutationObserver pour détecter quand le champ est ajouté au DOM
    const focusSearch = () => {
      // Chercher le champ de recherche dans la TopBar (le premier input de type text visible)
      const searchInputs = Array.from(document.querySelectorAll('input[type="text"]')) as HTMLInputElement[];
      const visibleInput = searchInputs.find(input => {
        const rect = input.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && input.offsetParent !== null;
      });
      
      if (visibleInput) {
        // Petit délai pour s'assurer que le composant est complètement monté
        setTimeout(() => {
          visibleInput.focus();
          visibleInput.select();
        }, 100);
        return true;
      }
      return false;
    };

    // Essayer immédiatement
    let focused = focusSearch();
    
    if (!focused) {
      // Utiliser MutationObserver pour détecter quand le champ est ajouté
      const observer = new MutationObserver(() => {
        if (focusSearch()) {
          observer.disconnect();
          focused = true;
        }
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
      
      // Timeout de sécurité après 2 secondes
      const timeout = setTimeout(() => {
        observer.disconnect();
        if (!focused) {
          focusSearch();
        }
      }, 2000);
      
      return () => {
        observer.disconnect();
        clearTimeout(timeout);
      };
    }
  }, [user, userRole, authLoading, setFakeDataEnabled, navigate, activateDemo, deactivateDemo]);

  // Utiliser directement les fake data
  const stats = FAKE_USER_STATS;
  const projects = FAKE_PROJECTS;
  const clients = FAKE_CLIENTS;
  const todayEvents = FAKE_EVENTS;
  const quotes = FAKE_QUOTES;
  const invoices = FAKE_INVOICES;

  // Calculer les statistiques exactement comme dans Dashboard
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

  // Calculer les alertes exactement comme dans Dashboard
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

  // Graphique Projets par statut - exactement comme Dashboard
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

  // Calculer les données de revenus mensuels sur les 6 derniers mois - exactement comme Dashboard
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

  // Si l'utilisateur est connecté (non-admin), ne pas afficher la page Demo
  if (user && userRole !== 'admin') {
    return null;
  }

  return (
    <PageLayout>
      <div className="p-3 sm:p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-4 sm:space-y-6 md:space-y-8">
        {/* Header - exactement comme Dashboard */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-2xl sm:text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
                Tableau de bord
              </h1>
              <Badge variant="secondary" className="text-xs">
                <ShieldCheck className="w-3 h-3 mr-1" />
                Mode démo
              </Badge>
            </div>
            <p className="text-muted-foreground text-base">
              Bienvenue ! Voici un aperçu de votre activité (données fictives)
            </p>
          </div>
          {user ? (
            <Link to="/projects">
              <Button className="gap-2 w-full sm:w-auto rounded-xl shadow-lg hover:shadow-xl transition-all">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Nouveau chantier</span>
                <span className="sm:hidden">Nouveau</span>
              </Button>
            </Link>
          ) : (
            <Button 
              onClick={() => navigate("/?openTrialForm=true")}
              className="gap-2 w-full sm:w-auto rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nouveau chantier</span>
              <span className="sm:hidden">Nouveau</span>
            </Button>
          )}
        </div>

        {/* KPI Blocks - exactement comme Dashboard */}
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

        {/* Main Content Grid - exactement comme Dashboard */}
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
            {/* Alerts - exactement comme Dashboard */}
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
                        // Si l'utilisateur n'est pas connecté en mode démo, rediriger vers la page d'accueil avec le formulaire
                        if (!user) {
                          navigate("/?openTrialForm=true", { replace: true });
                        } else {
                          navigate(alert.action);
                        }
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

            {/* Graphiques Stats - Compact - exactement comme Dashboard */}
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

export default Demo;
