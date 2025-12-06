import { Link } from "react-router-dom";
import { GlassCard } from "@/components/ui/GlassCard";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, UserCircle, CheckCircle2, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { useEmployeesData } from "@/lib/data/orchestrator";
import { WidgetSkeleton } from "./WidgetSkeleton";

/**
 * Widget affichant les employés
 * Se met à jour automatiquement toutes les 60s
 */
export const EmployeesWidget = () => {
  const {
    data: employees,
    totalEmployees,
    activeEmployees,
    recentEmployees,
    isLoading,
    error,
  } = useEmployeesData();

  if (isLoading) {
    return <WidgetSkeleton />;
  }

  if (error) {
    return (
      <GlassCard className="p-6">
        <div className="text-center text-muted-foreground text-sm">
          Erreur de chargement des employés
        </div>
      </GlassCard>
    );
  }

  const displayEmployees = recentEmployees.slice(0, 5);

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <UserCircle className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">
            Employés & RH
          </h3>
        </div>
        <Link to="/employees-rh">
          <Button variant="ghost" size="sm" className="gap-2 rounded-xl">
            Voir tout
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="text-center p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {totalEmployees}
          </p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-green-500/10 border border-green-500/20">
          <p className="text-lg font-bold text-green-600 dark:text-green-400">
            {activeEmployees.length}
          </p>
          <p className="text-xs text-muted-foreground">Actifs</p>
        </div>
      </div>

      {displayEmployees.length > 0 ? (
        <div className="space-y-3">
          {displayEmployees.map((employee, index) => {
            const fullName = `${employee.prenom || ""} ${employee.nom}`.trim();
            const initials = `${employee.prenom?.charAt(0) || ""}${employee.nom?.charAt(0) || ""}`.toUpperCase();
            const isActive = !!employee.user?.email_confirmed_at;

            return (
              <motion.div
                key={employee.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link to={`/employees-rh/${employee.id}`} className="block">
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-white/20 dark:border-gray-700/30 hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all group">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
                        {initials || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                          {fullName || employee.nom}
                        </p>
                        {isActive ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                        ) : (
                          <Clock className="w-4 h-4 text-orange-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {employee.poste}
                      </p>
                      {employee.specialites && employee.specialites.length > 0 && (
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          {employee.specialites.slice(0, 2).map((spec, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className="rounded-lg text-xs"
                            >
                              {spec}
                            </Badge>
                          ))}
                          {employee.specialites.length > 2 && (
                            <span className="text-xs text-muted-foreground">
                              +{employee.specialites.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">Aucun employé</p>
          <Link to="/employees-rh">
            <Button variant="outline" size="sm" className="mt-2 rounded-xl">
              Ajouter un employé
            </Button>
          </Link>
        </div>
      )}
    </GlassCard>
  );
};







