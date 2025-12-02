import { PageLayout } from "@/components/layout/PageLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { KPIBlock } from "@/components/ui/KPIBlock";
import { Badge } from "@/components/ui/badge";
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
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useMemo } from "react";
import { motion } from "framer-motion";

const RHDashboard = () => {
  const { data: stats, isLoading: statsLoading } = useRHStats();
  const { data: activities, isLoading: activitiesLoading } = useRHActivities(10);
  const { data: employees, isLoading: employeesLoading } = useEmployeesRH();
  const { data: candidatures, isLoading: candidaturesLoading } = useCandidatures();
  const { data: taches, isLoading: tachesLoading } = useTachesRH();

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

  const insights = useMemo(() => {
    const insightsList: Array<{ type: "warning" | "info" | "success"; message: string; icon: any }> = [];

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
      case "candidature": return <FileText className="h-4 w-4 text-blue-500" />;
      case "contrat": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "absence": return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "formation": return <Briefcase className="h-4 w-4 text-purple-500" />;
      case "evaluation": return <TrendingUp className="h-4 w-4 text-orange-500" />;
      case "tache": return <ClipboardList className="h-4 w-4 text-indigo-500" />;
      default: return <Calendar className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "candidature": return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800";
      case "contrat": return "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800";
      case "absence": return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800";
      case "formation": return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800";
      case "evaluation": return "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800";
      case "tache": return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800";
      default: return "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950 dark:text-gray-300 dark:border-gray-800";
    }
  };

  return (
    <PageLayout>
      <div className="p-3 sm:p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6 md:space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="space-y-2"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl flex items-center justify-center border border-blue-500/20">
              <Briefcase className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
                Dashboard RH
              </h1>
              <p className="text-muted-foreground text-base">
                Vue d'ensemble des ressources humaines
              </p>
            </div>
          </div>
        </motion.div>

        {/* Actions Rapides */}
        <GlassCard delay={0.2} className="p-6">
          <h2 className="text-lg font-semibold mb-4">Actions Rapides</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link to="/rh/employees">
                <div className="flex items-center gap-3 p-4 rounded-xl border border-white/20 dark:border-gray-700/30 bg-white/50 dark:bg-gray-800/50 hover:bg-white/70 dark:hover:bg-gray-800/70 transition-all cursor-pointer">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="text-sm font-medium">Gérer les Employés</p>
                    <p className="text-xs text-muted-foreground">Voir et modifier les employés</p>
                  </div>
                </div>
              </Link>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link to="/rh/candidatures">
                <div className="flex items-center gap-3 p-4 rounded-xl border border-white/20 dark:border-gray-700/30 bg-white/50 dark:bg-gray-800/50 hover:bg-white/70 dark:hover:bg-gray-800/70 transition-all cursor-pointer">
                  <UserCheck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  <div>
                    <p className="text-sm font-medium">Candidatures</p>
                    <p className="text-xs text-muted-foreground">Gérer les recrutements</p>
                  </div>
                </div>
              </Link>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link to="/rh/taches">
                <div className="flex items-center gap-3 p-4 rounded-xl border border-white/20 dark:border-gray-700/30 bg-white/50 dark:bg-gray-800/50 hover:bg-white/70 dark:hover:bg-gray-800/70 transition-all cursor-pointer">
                  <ClipboardList className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <div>
                    <p className="text-sm font-medium">Tâches RH</p>
                    <p className="text-xs text-muted-foreground">Suivre les tâches en cours</p>
                  </div>
                </div>
              </Link>
            </motion.div>
          </div>
        </GlassCard>

        {/* KPI Blocks */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPIBlock
            title="Total Employés"
            value={displayStats?.totalEmployees?.toString() || "0"}
            icon={Users}
            description={`${displayStats?.activeEmployees || 0} actifs`}
            delay={0.3}
            gradient="blue"
          />
          <KPIBlock
            title="Taux de Présence"
            value={`${displayStats?.tauxPresence || 0}%`}
            icon={TrendingUp}
            description="Sur les employés actifs"
            delay={0.4}
            gradient="green"
          />
          <KPIBlock
            title="Candidatures Actives"
            value={displayStats?.activeCandidatures?.toString() || "0"}
            icon={UserCheck}
            description="En attente ou entretien"
            delay={0.5}
            gradient="purple"
          />
          <KPIBlock
            title="Tâches Complétées"
            value={`${displayStats?.tauxCompletion || 0}%`}
            icon={CheckCircle2}
            description={`${displayStats?.completedTaches || 0} / ${displayStats?.totalTaches || 0} tâches`}
            delay={0.6}
            gradient="orange"
          />
        </div>

        {/* Insights IA */}
        <GlassCard delay={0.7} className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <h2 className="text-lg font-semibold">Insights RH</h2>
          </div>
          <div className="space-y-3">
            {insights.map((insight, idx) => {
              const Icon = insight.icon;
              const colorClasses = {
                warning: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800",
                info: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
                success: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800",
              };
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 + idx * 0.1 }}
                  className={`flex items-start gap-3 p-3 rounded-xl border ${colorClasses[insight.type]}`}
                >
                  <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <p className="text-sm font-medium">{insight.message}</p>
                </motion.div>
              );
            })}
          </div>
        </GlassCard>

        {/* Activité récente */}
        <GlassCard delay={0.9} className="p-6">
          <h2 className="text-lg font-semibold mb-4">Activité Récente</h2>
          {activitiesLoading && displayActivities.length === 0 ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : displayActivities.length > 0 ? (
            <div className="space-y-3">
              {displayActivities.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.0 + index * 0.05 }}
                  className="flex items-start gap-3 p-3 rounded-xl border border-white/20 dark:border-gray-700/30 bg-white/50 dark:bg-gray-800/50 hover:bg-white/70 dark:hover:bg-gray-800/70 transition-all"
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
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Aucune activité récente
            </p>
          )}
        </GlassCard>
      </div>
    </PageLayout>
  );
};

export default RHDashboard;
