import Sidebar from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  UserCheck, 
  ClipboardList, 
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Briefcase,
  FileText,
  Calendar,
  Sparkles
} from "lucide-react";
import { useRHStats, useRHActivities, useEmployeesRH, useCandidatures, useTachesRH } from "@/hooks/useRH";
import { FAKE_RH_STATS } from "@/fakeData/rh";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useMemo } from "react";
import { useFakeDataStore } from "@/store/useFakeDataStore";

const RHDashboard = () => {
  const { data: stats, isLoading: statsLoading } = useRHStats();
  const { data: activities, isLoading: activitiesLoading } = useRHActivities(10);
  const { data: employees, isLoading: employeesLoading } = useEmployeesRH();
  const { data: candidatures, isLoading: candidaturesLoading } = useCandidatures();
  const { data: taches, isLoading: tachesLoading } = useTachesRH();

  // Les hooks utilisent queryWithTimeout qui gère automatiquement le fallback
  // Si fake data activé → les hooks retournent fake data
  // Si fake data désactivé → les hooks retournent vraies données (même si vide) ou null/tableau vide en cas d'erreur
  // On utilise directement les données des hooks sans vérification supplémentaire
  // Si stats est null (erreur + fake data désactivé), utiliser des stats vides
  const displayStats = stats || {
    totalEmployees: 0,
    activeEmployees: 0,
    tauxPresence: 0,
    activeCandidatures: 0,
    totalTaches: 0,
    completedTaches: 0,
    tauxCompletion: 0,
  };
  const displayEmployees = employees || [];
  const displayCandidatures = candidatures || [];
  const displayTaches = taches || [];
  const displayActivities = activities || [];

  // Générer les insights IA basés sur les données
  const insights = useMemo(() => {
    const insightsList: Array<{ type: "warning" | "info" | "success"; message: string; icon: any }> = [];

    // Vérifier les contrats arrivant à terme
    const today = new Date();
    const employeesAvecContrat = displayEmployees.filter(emp => emp.date_fin_contrat) || [];
    const contratsExpirant = employeesAvecContrat.filter(emp => {
      if (!emp.date_fin_contrat) return false;
      const finContrat = new Date(emp.date_fin_contrat);
      const daysUntilEnd = Math.ceil((finContrat.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilEnd <= 30 && daysUntilEnd > 0;
    });

    if (contratsExpirant.length > 0) {
      insightsList.push({
        type: "warning",
        message: `${contratsExpirant.length} employé${contratsExpirant.length > 1 ? "s" : ""} avec contrat expirant dans moins de 30 jours`,
        icon: AlertCircle,
      });
    }

    // Vérifier les candidatures en baisse
    const candidaturesCeMois = displayCandidatures.filter(cand => {
      const dateCand = new Date(cand.date_candidature);
      const moisActuel = today.getMonth();
      const anneeActuelle = today.getFullYear();
      return dateCand.getMonth() === moisActuel && dateCand.getFullYear() === anneeActuelle;
    }).length || 0;

    const candidaturesMoisDernier = displayCandidatures.filter(cand => {
      const dateCand = new Date(cand.date_candidature);
      const moisDernier = today.getMonth() - 1;
      const annee = moisDernier < 0 ? today.getFullYear() - 1 : today.getFullYear();
      const mois = moisDernier < 0 ? 11 : moisDernier;
      return dateCand.getMonth() === mois && dateCand.getFullYear() === annee;
    }).length || 0;

    if (candidaturesMoisDernier > 0) {
      const baisse = Math.round(((candidaturesMoisDernier - candidaturesCeMois) / candidaturesMoisDernier) * 100);
      if (baisse > 20) {
        insightsList.push({
          type: "warning",
          message: `Candidatures en baisse de ${baisse}% ce mois-ci`,
          icon: TrendingUp,
        });
      }
    }

    // Vérifier les tâches urgentes
    const tachesUrgentes = displayTaches.filter(tache => {
      if (tache.statut === "termine" || tache.statut === "annule") return false;
      if (!tache.date_echeance) return false;
      const echeance = new Date(tache.date_echeance);
      const daysUntilDeadline = Math.ceil((echeance.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilDeadline <= 3 && daysUntilDeadline >= 0;
    }).length || 0;

    if (tachesUrgentes > 0) {
      insightsList.push({
        type: "warning",
        message: `${tachesUrgentes} tâche${tachesUrgentes > 1 ? "s" : ""} avec échéance dans moins de 3 jours`,
        icon: Clock,
      });
    }

    // Vérifier les candidatures en attente depuis longtemps
    const candidaturesEnAttente = displayCandidatures.filter(cand => {
      if (cand.statut !== "en_attente") return false;
      const dateCand = new Date(cand.date_candidature);
      const daysSince = Math.ceil((today.getTime() - dateCand.getTime()) / (1000 * 60 * 60 * 24));
      return daysSince > 7;
    }).length || 0;

    if (candidaturesEnAttente > 0) {
      insightsList.push({
        type: "info",
        message: `${candidaturesEnAttente} candidature${candidaturesEnAttente > 1 ? "s" : ""} en attente depuis plus de 7 jours`,
        icon: FileText,
      });
    }

    // Message positif si tout va bien
    if (insightsList.length === 0) {
      insightsList.push({
        type: "success",
        message: "Tout va bien ! Aucun point d'attention pour le moment.",
        icon: CheckCircle2,
      });
    }

    return insightsList;
  }, [displayEmployees, displayCandidatures, displayTaches]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "candidature":
        return <FileText className="h-4 w-4 text-blue-500" />;
      case "contrat":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "absence":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "formation":
        return <Briefcase className="h-4 w-4 text-purple-500" />;
      case "evaluation":
        return <TrendingUp className="h-4 w-4 text-orange-500" />;
      case "tache":
        return <ClipboardList className="h-4 w-4 text-indigo-500" />;
      default:
        return <Calendar className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "candidature":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "contrat":
        return "bg-green-50 text-green-700 border-green-200";
      case "absence":
        return "bg-red-50 text-red-700 border-red-200";
      case "formation":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "evaluation":
        return "bg-orange-50 text-orange-700 border-orange-200";
      case "tache":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* En-tête */}
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard RH</h1>
            <p className="text-muted-foreground mt-2">
              Vue d'ensemble des ressources humaines
            </p>
          </div>

          {/* Actions rapides */}
          <Card>
            <CardHeader>
              <CardTitle>Actions Rapides</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link to="/rh/employees">
                <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Gérer les Employés</p>
                    <p className="text-xs text-muted-foreground">Voir et modifier les employés</p>
                  </div>
                </div>
              </Link>
              <Link to="/rh/candidatures">
                <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors">
                  <UserCheck className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Candidatures</p>
                    <p className="text-xs text-muted-foreground">Gérer les recrutements</p>
                  </div>
                </div>
              </Link>
              <Link to="/rh/taches">
                <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Tâches RH</p>
                    <p className="text-xs text-muted-foreground">Suivre les tâches en cours</p>
                  </div>
                </div>
              </Link>
            </CardContent>
          </Card>

          {/* Cartes statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Employés</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{displayStats?.totalEmployees ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                  {displayStats?.activeEmployees ?? 0} actifs
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taux de Présence</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{displayStats?.tauxPresence ?? 0}%</div>
                <p className="text-xs text-muted-foreground">
                  Sur les employés actifs
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Candidatures Actives</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{displayStats?.activeCandidatures ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                  En attente ou entretien
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tâches Complétées</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{displayStats?.tauxCompletion ?? 0}%</div>
                <p className="text-xs text-muted-foreground">
                  {displayStats?.completedTaches ?? 0} / {displayStats?.totalTaches ?? 0} tâches
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Insights IA */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Insights RH
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {insights.map((insight, idx) => {
                  const Icon = insight.icon;
                  const colorClasses = {
                    warning: "bg-orange-50 text-orange-700 border-orange-200",
                    info: "bg-blue-50 text-blue-700 border-blue-200",
                    success: "bg-green-50 text-green-700 border-green-200",
                  };
                  return (
                    <div
                      key={idx}
                      className={`flex items-start gap-3 p-3 rounded-lg border ${colorClasses[insight.type]}`}
                    >
                      <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                      <p className="text-sm font-medium">{insight.message}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Graphiques et Activité */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Activité récente */}
            <Card>
              <CardHeader>
                <CardTitle>Activité Récente</CardTitle>
              </CardHeader>
              <CardContent>
                {activitiesLoading && displayActivities.length === 0 ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : displayActivities.length > 0 ? (
                  <div className="space-y-4">
                    {displayActivities.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-start gap-3 p-3 rounded-lg border"
                      >
                        <div className={`p-2 rounded-full ${getActivityColor(activity.type_activite)}`}>
                          {getActivityIcon(activity.type_activite)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{activity.titre}</p>
                          {activity.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {activity.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(activity.created_at), {
                              addSuffix: true,
                              locale: fr,
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Aucune activité récente
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default RHDashboard;

