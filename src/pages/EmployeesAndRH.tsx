import { PageLayout } from "@/components/layout/PageLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { KPIBlock } from "@/components/ui/KPIBlock";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { 
  Users, 
  UserCheck,
  ArrowRight,
  Briefcase,
  Calendar,
  TrendingUp,
  AlertCircle,
  Plus,
  Clock,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { useRHStats, useRHActivities, useEmployeesRH, useCandidatures, useTachesRH } from "@/hooks/useRH";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { CalendarWidget } from "@/components/widgets/CalendarWidget";

const EmployeesAndRH = () => {
  const { data: stats, isLoading: statsLoading } = useRHStats();
  const { data: activities, isLoading: activitiesLoading } = useRHActivities(10);
  const { data: employees = [], isLoading: employeesLoading } = useEmployeesRH();
  const { data: candidatures = [], isLoading: candidaturesLoading } = useCandidatures();
  const { data: taches = [], isLoading: tachesLoading } = useTachesRH();

  const displayStats = stats || {
    totalEmployees: 0,
    activeEmployees: 0,
    tauxPresence: 0,
    activeCandidatures: 0,
    totalTaches: 0,
    completedTaches: 0,
    tauxCompletion: 0,
  };


  // Contrats expirant bientôt
  const expiringContracts = useMemo(() => {
    const today = new Date();
    return employees.filter(emp => {
      if (!emp.date_fin_contrat) return false;
      const finContrat = new Date(emp.date_fin_contrat);
      const daysUntilEnd = Math.ceil((finContrat.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilEnd <= 30 && daysUntilEnd > 0;
    }).slice(0, 5);
  }, [employees]);

  // Tâches urgentes
  const urgentTaches = useMemo(() => {
    const today = new Date();
    return taches.filter(tache => {
      if (!tache.echeance || tache.statut === "termine") return false;
      const echeance = new Date(tache.echeance);
      const daysUntil = Math.ceil((echeance.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntil <= 3 && daysUntil >= 0;
    }).slice(0, 5);
  }, [taches]);


  const getStatutBadge = (statut: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      actif: "default",
      inactif: "secondary",
      congé: "outline",
      suspension: "destructive",
    };
    const labels: Record<string, string> = {
      actif: "Actif",
      inactif: "Inactif",
      congé: "En congé",
      suspension: "Suspendu",
    };
    return (
      <Badge variant={variants[statut] || "default"} className="text-xs">
        {labels[statut] || statut}
      </Badge>
    );
  };

  return (
    <PageLayout>
      <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6">
        {/* En-tête */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="space-y-1 sm:space-y-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
              Employés
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Gérez vos employés et leurs plannings
            </p>
          </div>
          <Link to="/rh/employees">
            <Button className="gap-2 rounded-xl">
              <Plus className="h-4 w-4" />
              Nouvel employé
            </Button>
          </Link>
        </motion.div>

        {/* Alertes importantes */}
        {(expiringContracts.length > 0 || urgentTaches.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            {expiringContracts.length > 0 && (
              <GlassCard className="p-4 border-orange-500/50 bg-orange-500/5">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-sm">Contrats expirant bientôt</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {expiringContracts.length} employé{expiringContracts.length > 1 ? "s" : ""} avec contrat expirant dans moins de 30 jours
                    </p>
                  </div>
                </div>
              </GlassCard>
            )}
            {urgentTaches.length > 0 && (
              <GlassCard className="p-4 border-red-500/50 bg-red-500/5">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-sm">Tâches urgentes</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {urgentTaches.length} tâche{urgentTaches.length > 1 ? "s" : ""} avec échéance dans moins de 3 jours
                    </p>
                  </div>
                </div>
              </GlassCard>
            )}
          </motion.div>
        )}

        {/* KPI Blocks */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <KPIBlock
            title="Total Employés"
            value={displayStats.totalEmployees.toString()}
            icon={Users}
            trend={displayStats.totalEmployees > 0 ? { value: 5, isPositive: true } : undefined}
            description={`${displayStats.activeEmployees} actifs`}
            delay={0.1}
            gradient="blue"
          />
          <KPIBlock
            title="Taux de présence"
            value={`${displayStats.tauxPresence}%`}
            icon={TrendingUp}
            trend={displayStats.tauxPresence > 90 ? { value: 3, isPositive: true } : undefined}
            description="Présence moyenne"
            delay={0.2}
            gradient="green"
          />
          <KPIBlock
            title="Tâches complétées"
            value={`${displayStats.tauxCompletion}%`}
            icon={CheckCircle2}
            description={`${displayStats.completedTaches}/${displayStats.totalTaches} terminées`}
            delay={0.3}
            gradient="orange"
          />
        </div>

        {/* Actions rapides */}
        <div className="flex flex-col gap-3">
          <Link to="/employees-planning" className="h-full">
            <GlassCard className="p-4 hover:bg-accent/50 transition-all cursor-pointer h-full">
              <div className="flex items-center gap-3 min-h-[2.5rem]">
                <Calendar className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="font-semibold text-sm flex-1 whitespace-nowrap">Planning employés</span>
                <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </div>
            </GlassCard>
          </Link>

          <Link to="/my-planning" className="h-full">
            <GlassCard className="p-4 hover:bg-accent/50 transition-all cursor-pointer h-full">
              <div className="flex items-center gap-3 min-h-[2.5rem]">
                <Clock className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <span className="font-semibold text-sm flex-1">Mon planning</span>
                <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </div>
            </GlassCard>
          </Link>
        </div>

        {/* Calendrier Google Calendar */}
        <div className="mb-6">
          <CalendarWidget />
        </div>

        {/* Contrats expirant bientôt */}
        {expiringContracts.length > 0 && (
          <GlassCard className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                <h3 className="text-base sm:text-lg font-semibold">Contrats expirant bientôt</h3>
              </div>
              <Badge variant="outline" className="text-xs">
                {expiringContracts.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {expiringContracts.map((emp) => {
                const finContrat = new Date(emp.date_fin_contrat!);
                const today = new Date();
                const daysUntilEnd = Math.ceil((finContrat.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={emp.id} className="flex items-center justify-between p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
                    <div className="flex items-center gap-3">
                      <Users className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      <div>
                        <p className="text-sm font-medium">
                          {emp.prenom || ""} {emp.nom || "N/A"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {emp.poste || "-"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-orange-600 dark:text-orange-400">
                        {daysUntilEnd} jour{daysUntilEnd > 1 ? "s" : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(finContrat, "dd MMM yyyy", { locale: fr })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <Link to="/rh/employees" className="block mt-4">
              <Button variant="outline" size="sm" className="w-full gap-2 rounded-xl">
                Voir tous les employés
                <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </GlassCard>
        )}
      </div>
    </PageLayout>
  );
};

export default EmployeesAndRH;
