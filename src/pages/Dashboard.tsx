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
  Calendar
} from "lucide-react";
import { Link } from "react-router-dom";

const Dashboard = () => {
  const recentProjects = [
    { 
      id: 1, 
      name: "Rénovation Maison Martin", 
      status: "En cours", 
      progress: 65,
      client: "M. Martin",
      deadline: "15/12/2024"
    },
    { 
      id: 2, 
      name: "Extension Garage Dupont", 
      status: "En attente", 
      progress: 30,
      client: "Mme. Dupont",
      deadline: "22/12/2024"
    },
    { 
      id: 3, 
      name: "Peinture Bureau Bernard", 
      status: "En cours", 
      progress: 85,
      client: "Entreprise Bernard",
      deadline: "10/12/2024"
    },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto w-full">
        <div className="p-4 md:p-8 space-y-6 md:space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Tableau de bord</h1>
              <p className="text-muted-foreground mt-1 text-sm md:text-base">
                Bienvenue ! Voici un aperçu de votre activité
              </p>
            </div>
            <Link to="/projects">
              <Button className="gap-2 w-full sm:w-auto">
                <FolderKanban className="w-4 h-4" />
                <span className="hidden sm:inline">Nouveau chantier</span>
                <span className="sm:hidden">Nouveau</span>
              </Button>
            </Link>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="Chiffre d'affaires"
              value="45 280 €"
              icon={Euro}
              trend="+12% ce mois"
              trendUp={true}
            />
            <StatsCard
              title="Chantiers actifs"
              value="8"
              icon={FolderKanban}
              trend="3 en retard"
              trendUp={false}
            />
            <StatsCard
              title="Clients"
              value="24"
              icon={Users}
              trend="+4 ce mois"
              trendUp={true}
            />
            <StatsCard
              title="Rentabilité moyenne"
              value="32%"
              icon={TrendingUp}
              trend="+5% vs mois dernier"
              trendUp={true}
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
            {/* Recent Projects */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Chantiers récents</CardTitle>
                  <Link to="/projects">
                    <Button variant="ghost" size="sm" className="gap-2">
                      Voir tout
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentProjects.map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-foreground">
                            {project.name}
                          </h3>
                          <Badge variant={project.status === "En cours" ? "default" : "secondary"}>
                            {project.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {project.client}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {project.deadline}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Progression</span>
                            <span className="font-medium text-foreground">{project.progress}%</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-primary to-accent transition-all"
                              style={{ width: `${project.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Alerts & Quick Actions */}
            <div className="space-y-4 md:space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-accent" />
                    Alertes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                    <p className="text-sm font-medium text-foreground">3 chantiers en retard</p>
                    <p className="text-xs text-muted-foreground mt-1">Nécessite votre attention</p>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="text-sm font-medium text-foreground">5 devis en attente</p>
                    <p className="text-xs text-muted-foreground mt-1">À valider par les clients</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted border border-border">
                    <p className="text-sm font-medium text-foreground">Stock béton faible</p>
                    <p className="text-xs text-muted-foreground mt-1">Prévoir réapprovisionnement</p>
                  </div>
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
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">9h00 - Visite chantier Martin</p>
                      <p className="text-xs text-muted-foreground">45 min</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-accent mt-2" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">14h30 - RDV client Dupont</p>
                      <p className="text-xs text-muted-foreground">1h</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground mt-2" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">17h00 - Réunion équipe</p>
                      <p className="text-xs text-muted-foreground">30 min</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
