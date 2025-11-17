import Sidebar from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart3, TrendingUp, Users, FolderKanban, Loader2 } from "lucide-react";
import StatsCard from "@/components/StatsCard";
import { useUserStats, useRecalculateStats } from "@/hooks/useUserStats";
import { useProjects } from "@/hooks/useProjects";
import { useEffect, useMemo, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { StatsCardSkeleton } from "@/components/LoadingSkeleton";

const Stats = () => {
  const { data: stats, isLoading: statsLoading } = useUserStats();
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const recalculateStats = useRecalculateStats();
  const hasRecalculatedRef = useRef(false);

  // Ne pas bloquer l'affichage, utiliser des données par défaut
  // Les hooks retournent déjà des données mock en cas de timeout (3 secondes)
  // Cette approche évite les chargements infinis en affichant toujours du contenu
  // Utiliser des valeurs par défaut pour éviter les erreurs
  const displayStats = stats || {
    total_revenue: 0,
    total_profit: 0,
    active_projects: 0,
    total_clients: 0,
    completed_projects: 0,
    total_projects: 0,
  };
  const displayProjects = projects || [];

  // Recalculer les stats quand les projets changent (une seule fois au chargement)
  useEffect(() => {
    if (
      displayProjects && 
      displayProjects.length > 0 && 
      !recalculateStats.isPending && 
      !hasRecalculatedRef.current
    ) {
      hasRecalculatedRef.current = true;
      recalculateStats.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayProjects?.length, recalculateStats.isPending]);

  // Calculer les données pour les graphiques avec useMemo pour éviter les recalculs
  const projectsByStatus = useMemo(() => {
    return displayProjects.reduce((acc, project) => {
      const status = project.status;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [displayProjects]);

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

  const COLORS = useMemo(() => ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'], []);

  // Données pour l'évolution mensuelle (simplifié - dernières 6 semaines)
  const monthlyData = useMemo(() => {
    return projects?.reduce((acc, project) => {
      if (!project.created_at) return acc;
      const date = new Date(project.created_at);
      const week = `${date.getFullYear()}-W${Math.ceil((date.getDate() + new Date(date.getFullYear(), date.getMonth(), 0).getDay()) / 7)}`;
      acc[week] = (acc[week] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};
  }, [projects]);

  const barData = useMemo(() => {
    return Object.entries(monthlyData)
      .slice(-6)
      .map(([week, count]) => ({
        semaine: week.split('-W')[1],
        projets: count,
      }));
  }, [monthlyData]);

  // Calculer les statistiques avec useMemo
  const statsCalculated = useMemo(() => {
    const totalRevenue = displayStats.total_revenue || 0;
    const totalProfit = displayStats.total_profit || 0;
    const activeProjects = displayStats.active_projects || 0;
    const totalClients = displayStats.total_clients || 0;
    const completedProjects = displayStats.completed_projects || 0;
    const totalProjects = displayStats.total_projects || 0;
    const profitability = totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0;
    return { totalRevenue, totalProfit, activeProjects, totalClients, completedProjects, totalProjects, profitability };
  }, [displayStats]);
  
  const { totalRevenue, totalProfit, activeProjects, totalClients, completedProjects, totalProjects, profitability } = statsCalculated;
  
  // Calculer les bénéfices par projet terminé pour le graphique avec useMemo
  const profitData = useMemo(() => {
    return displayProjects.filter(p => p.status === 'terminé').map(project => {
      // Calculer le CA depuis les devis liés (TTC)
      let projectRevenue = 0;
      
      if (project.ai_quotes && Array.isArray(project.ai_quotes) && project.ai_quotes.length > 0) {
        project.ai_quotes.forEach((quote: any) => {
          if (quote.status && ['signed', 'accepted', 'sent'].includes(quote.status)) {
            if (quote.estimated_cost) {
              // estimated_cost est en HT, on ajoute la TVA (20%)
              projectRevenue += Number(quote.estimated_cost) * 1.20;
            } else if (quote.details) {
              const details = typeof quote.details === 'string' 
                ? JSON.parse(quote.details) 
                : quote.details;
              if (details?.estimatedCost) {
                projectRevenue += Number(details.estimatedCost) * 1.20;
              }
            }
          }
        });
      }
      
      // Si aucun devis, utiliser le budget
      if (projectRevenue === 0) {
        projectRevenue = Number(project.budget) || 0;
      }
      
      // Utiliser le bénéfice calculé si disponible, sinon le calculer
      const projectCosts = Number(project.costs) || 0;
      const projectProfit = project.benefice !== null && project.benefice !== undefined
        ? Number(project.benefice)
        : projectRevenue - projectCosts;
      
      return {
        name: project.name.length > 15 ? project.name.substring(0, 15) + '...' : project.name,
        CA: projectRevenue,
        Bénéfice: projectProfit,
      };
    });
  }, [displayProjects]);
  
  // Calculer le bénéfice moyen par chantier terminé avec useMemo
  const averageProfit = useMemo(() => {
    const completedProjectsCount = displayProjects.filter(p => p.status === 'terminé').length;
    return completedProjectsCount > 0 ? totalProfit / completedProjectsCount : 0;
  }, [displayProjects, totalProfit]);

  // Afficher les skeletons uniquement si aucune donnée n'est disponible ET qu'on charge
  const showSkeletons = (statsLoading || projectsLoading) && !displayStats.total_projects && displayProjects.length === 0;

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 w-full overflow-y-auto">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Statistiques</h1>
          <p className="text-muted-foreground text-sm md:text-base">Analyse de vos performances</p>
        </div>

        {/* Afficher les skeletons uniquement si aucune donnée n'est disponible */}
        {showSkeletons ? (
          <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6 md:mb-8">
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </div>
        ) : (
          <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6 md:mb-8">
            <StatsCard
              title="Chiffre d'affaires"
              value={new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(totalRevenue)}
              trend={completedProjects > 0 ? `${completedProjects} projets terminés` : "Aucun projet terminé"}
              trendUp={completedProjects > 0}
              icon={TrendingUp}
            />
            <StatsCard
              title="Bénéfice total"
              value={new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(totalProfit)}
              trend={completedProjects > 0 ? `Moyenne: ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(averageProfit)}` : "Aucun projet terminé"}
              trendUp={totalProfit >= 0}
              icon={BarChart3}
            />
            <StatsCard
              title="Projets actifs"
              value={activeProjects.toString()}
              trend={`${totalProjects} projets au total`}
              trendUp={true}
              icon={FolderKanban}
            />
            <StatsCard
              title="Taux de réussite"
              value={`${profitability}%`}
              trend={`${completedProjects} projets terminés`}
              trendUp={profitability > 50}
              icon={Users}
            />
          </div>
        )}
        
        {/* Encart informatif */}
        <div className="mb-6 md:mb-8">
          <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-6">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                ℹ️ <strong>Les montants sont mis à jour automatiquement</strong> à la clôture des chantiers. 
                Le chiffre d'affaires est calculé depuis les devis signés/acceptés liés aux projets terminés (TTC).
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2 mb-6 md:mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Projets par statut</CardTitle>
              <CardDescription>Répartition des projets selon leur statut</CardDescription>
            </CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  <p>Aucune donnée disponible</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Évolution des projets</CardTitle>
              <CardDescription>Nombre de projets créés par semaine</CardDescription>
            </CardHeader>
            <CardContent>
              {barData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="semaine" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="projets" fill="#3b82f6" name="Projets créés" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  <p>Aucune donnée disponible</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Graphique CA / Bénéfice */}
        {profitData.length > 0 && (
          <Card className="mb-6 md:mb-8">
            <CardHeader>
              <CardTitle>Chiffre d'affaires vs Bénéfice</CardTitle>
              <CardDescription>Comparaison du CA et des bénéfices par projet terminé</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={profitData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => 
                      new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value)
                    }
                  />
                  <Legend />
                  <Bar dataKey="CA" fill="#3b82f6" name="Chiffre d'affaires" />
                  <Bar dataKey="Bénéfice" fill={totalProfit >= 0 ? "#10b981" : "#ef4444"} name="Bénéfice" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Stats;
