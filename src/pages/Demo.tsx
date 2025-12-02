import { useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import StatsCard from "@/components/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Euro, 
  FolderKanban, 
  Users, 
  TrendingUp, 
  Clock,
  AlertCircle,
  ArrowRight,
  Calendar,
  ShieldCheck
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { FAKE_PROJECTS } from "@/fakeData/projects";
import { FAKE_CLIENTS } from "@/fakeData/clients";
import { FAKE_EVENTS } from "@/fakeData/calendar";
import { FAKE_QUOTES } from "@/fakeData/quotes";
import { FAKE_USER_STATS } from "@/fakeData/stats";
import { useToast } from "@/components/ui/use-toast";
import { useFakeDataStore } from "@/store/useFakeDataStore";
import { useAuth } from "@/hooks/useAuth";

const Demo = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { setFakeDataEnabled } = useFakeDataStore();

  // Activer automatiquement les fake data quand on arrive sur la page Demo
  useEffect(() => {
    console.log("🎮 Activation du mode fake data pour la page Demo");
    
    // Si l'utilisateur est connecté mais n'est pas administrateur, rediriger vers le dashboard réel
    if (user && userRole !== 'administrateur') {
      console.log("🔒 Utilisateur connecté (non-admin) détecté - Redirection vers dashboard réel");
      setFakeDataEnabled(false);
      navigate("/dashboard", { replace: true });
      return;
    }
    
    // Activer le mode démo seulement si :
    // 1. L'utilisateur n'est pas connecté (démo publique depuis landing page)
    // 2. OU l'utilisateur est administrateur (démo dans l'app)
    if (!user || userRole === 'administrateur') {
      setFakeDataEnabled(true);
    }

    // Nettoyer à la sortie de la page
    return () => {
      // Ne pas désactiver automatiquement, laisser l'utilisateur contrôler
      // setFakeDataEnabled(false);
    };
  }, [user, setFakeDataEnabled, navigate]);

  // Utiliser directement les fake data
  const stats = FAKE_USER_STATS;
  const projects = FAKE_PROJECTS;
  const clients = FAKE_CLIENTS;
  const todayEvents = FAKE_EVENTS;
  const quotes = FAKE_QUOTES;

  const displayProjects = useMemo(() => {
    return projects?.slice(0, 3) || [];
  }, [projects]);

  const displayEvents = useMemo(() => {
    if (!todayEvents || todayEvents.length === 0) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return todayEvents
      .filter(e => {
        const eventDate = new Date(e.start_date);
        return eventDate >= today && eventDate < tomorrow;
      })
      .slice(0, 3);
  }, [todayEvents]);

  // Calculer les statistiques
  const calculatedStats = useMemo(() => {
    const totalRevenue = stats?.total_revenue || 0;
    const activeProjects = stats?.active_projects || 0;
    const totalClients = clients?.length || 0;
    const completedProjects = stats?.completed_projects || 0;
    const totalProjects = stats?.total_projects || 0;
    const profitability = totalProjects > 0 
      ? Math.round((completedProjects / totalProjects) * 100) 
      : 0;

    return {
      totalRevenue,
      activeProjects,
      totalClients,
      profitability,
    };
  }, [stats, clients]);

  // Calculer les alertes
  const alerts = useMemo(() => {
    const alertsList = [];
    
    // Projets en retard
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

    // Devis en attente
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

    // Si aucune alerte, afficher un message par défaut
    if (alertsList.length === 0) {
      alertsList.push({
        type: "default",
        message: "Tout va bien",
        description: "Aucune alerte pour le moment",
      });
    }

    return alertsList;
  }, [projects, quotes]);

  // Si l'utilisateur est connecté, ne pas afficher la page Demo
  if (user) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto w-full">
        <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6 md:space-y-8">
          {/* Header avec badge démo */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground">Tableau de bord</h1>
                  <Badge variant="secondary" className="text-xs">
                    <ShieldCheck className="w-3 h-3 mr-1" />
                    Mode démo
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-1 text-sm md:text-base">
                  Bienvenue ! Voici un aperçu de votre activité (données fictives)
                </p>
              </div>
            </div>
            <Link to="/projects/new">
              <Button className="gap-2 w-full sm:w-auto">
                <FolderKanban className="w-4 h-4" />
                <span className="hidden sm:inline">Nouveau chantier</span>
                <span className="sm:hidden">Nouveau</span>
              </Button>
            </Link>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <StatsCard
              title="Chiffre d'affaires"
              value={new Intl.NumberFormat('fr-FR', { 
                style: 'currency', 
                currency: 'EUR', 
                maximumFractionDigits: 0 
              }).format(calculatedStats.totalRevenue)}
              icon={Euro}
              trend={`${stats?.completed_projects || 0} projets terminés`}
              trendUp={calculatedStats.totalRevenue > 0}
            />
            <StatsCard
              title="Chantiers actifs"
              value={calculatedStats.activeProjects.toString()}
              icon={FolderKanban}
              trend={`${stats?.total_projects || 0} projets au total`}
              trendUp={calculatedStats.activeProjects > 0}
            />
            <StatsCard
              title="Clients"
              value={calculatedStats.totalClients.toString()}
              icon={Users}
              trend={`${projects?.filter(p => p.status === "en_cours").length || 0} projets en cours`}
              trendUp={calculatedStats.totalClients > 0}
            />
            <StatsCard
              title="Rentabilité moyenne"
              value={`${calculatedStats.profitability}%`}
              icon={TrendingUp}
              trend={`${stats?.completed_projects || 0} projets terminés`}
              trendUp={calculatedStats.profitability > 50}
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Recent Projects */}
            <Card className="lg:col-span-2 w-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Chantiers récents</CardTitle>
                  <Link to="/projects">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="gap-2"
                    >
                      Voir tout
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {displayProjects.length > 0 ? (
                  <div className="space-y-4">
                    {displayProjects.map((project) => {
                      // Calculer la progression
                      const progress = project.status === "terminé" ? 100 :
                                     project.status === "en_cours" ? 65 :
                                     project.status === "planifié" ? 20 : 10;
                      
                      return (
                        <Link
                          key={project.id}
                          to={`/projects/${project.id}`}
                          className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer gap-3 sm:gap-4"
                        >
                          <div className="flex-1 space-y-2 w-full">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                              <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">
                                {project.name}
                              </h3>
                              <Badge variant={
                                project.status === "en_cours" ? "default" :
                                project.status === "terminé" ? "outline" :
                                project.status === "planifié" ? "secondary" : "secondary"
                              } className="text-xs w-fit">
                                {project.status === "en_cours" ? "En cours" :
                                 project.status === "terminé" ? "Terminé" :
                                 project.status === "planifié" ? "Planifié" :
                                 project.status === "en_attente" ? "En attente" : project.status}
                              </Badge>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                              {project.client && (
                                <span className="flex items-center gap-1 truncate">
                                  <Users className="w-3 h-3 flex-shrink-0" />
                                  <span className="truncate">{typeof project.client === "string" ? project.client : project.client.name}</span>
                                </span>
                              )}
                              {project.end_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3 flex-shrink-0" />
                                  {format(new Date(project.end_date), "dd/MM/yyyy", { locale: fr })}
                                </span>
                              )}
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Progression</span>
                                <span className="font-medium text-foreground">{progress}%</span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-primary to-accent transition-all"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Aucun projet récent</p>
                    <Link to="/projects/new">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                      >
                        Créer un projet
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Alerts & Quick Actions */}
            <div className="space-y-4 sm:space-y-6 w-full">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-accent" />
                    Alertes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {alerts.length > 0 ? (
                    alerts.map((alert, index) => (
                      <div
                        key={index}
                        onClick={() => {
                          if (alert.action) {
                            navigate(alert.action);
                          }
                        }}
                        className={`p-3 rounded-lg border cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md ${
                          alert.type === "warning" ? "bg-accent/10 border-accent/20 hover:bg-accent/15" :
                          alert.type === "info" ? "bg-primary/10 border-primary/20 hover:bg-primary/15" :
                          "bg-muted border-border hover:bg-muted/80"
                        }`}
                      >
                        <p className="text-sm font-medium text-foreground">{alert.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">{alert.description}</p>
                        {alert.action && (
                          <p className="text-xs text-primary mt-2 font-medium hover:underline">
                            {alert.actionLabel} →
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-3 rounded-lg bg-muted border border-border">
                      <p className="text-sm font-medium text-foreground">Aucune alerte</p>
                      <p className="text-xs text-muted-foreground mt-1">Tout va bien</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    Aujourd'hui
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {displayEvents.length > 0 ? (
                    displayEvents.map((event) => {
                      const eventDate = new Date(event.start_date);
                      const eventEnd = event.end_date ? new Date(event.end_date) : null;
                      const duration = eventEnd 
                        ? Math.round((eventEnd.getTime() - eventDate.getTime()) / (1000 * 60))
                        : 60;
                      
                      return (
                        <div key={event.id} className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full mt-2" style={{ backgroundColor: event.color }} />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">
                              {format(eventDate, "HH:mm", { locale: fr })} - {event.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {duration} min{event.location ? ` • ${event.location}` : ""}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <p className="text-sm">Aucun événement aujourd'hui</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default Demo;
