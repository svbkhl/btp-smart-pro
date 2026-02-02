/**
 * Page: EmployeeDashboard
 * Description: Dashboard simple pour les employés (accès limité)
 * Permissions: Accessible uniquement aux employés
 */

import { PageLayout } from "@/components/layout/PageLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { KPIBlock } from "@/components/ui/KPIBlock";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { 
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  User,
  FileText,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const EmployeeDashboard = () => {
  const { user } = useAuth();
  
  const firstName = user?.user_metadata?.first_name || '';
  const lastName = user?.user_metadata?.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim() || user?.email || 'Employé';

  return (
    <PageLayout>
      <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6">
        {/* En-tête de bienvenue */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-2"
        >
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
            Bonjour {firstName || 'Employé'} 👋
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Voici un aperçu de votre journée
          </p>
        </motion.div>

        {/* KPIs Employé */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
        >
          <KPIBlock
            title="Mes tâches"
            value="5"
            subtitle="En cours"
            icon={CheckCircle2}
            trend={{ value: 2, isPositive: true }}
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20"
          />
          <KPIBlock
            title="Planning"
            value="3"
            subtitle="Missions aujourd'hui"
            icon={Calendar}
            className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20"
          />
          <KPIBlock
            title="Heures"
            value="35h"
            subtitle="Cette semaine"
            icon={Clock}
            className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20"
          />
          <KPIBlock
            title="Documents"
            value="12"
            subtitle="À consulter"
            icon={FileText}
            className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-orange-500/20"
          />
        </motion.div>

        {/* Contenu principal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Mes tâches du jour */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <GlassCard className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold">Mes tâches du jour</h3>
                </div>
                <Link to="/my-planning">
                  <Button variant="ghost" size="sm">
                    Voir tout
                  </Button>
                </Link>
              </div>

              <div className="space-y-3">
                {/* Tâche exemple 1 */}
                <div className="p-3 bg-muted/50 rounded-lg border border-border/50 hover:border-primary/50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">Chantier rue Victor Hugo</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        8h00 - 12h00
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      En cours
                    </Badge>
                  </div>
                </div>

                {/* Tâche exemple 2 */}
                <div className="p-3 bg-muted/50 rounded-lg border border-border/50 hover:border-primary/50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">Rénovation appartement</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        14h00 - 17h00
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      Planifié
                    </Badge>
                  </div>
                </div>

                {/* Pas de tâches */}
                <div className="p-4 text-center text-sm text-muted-foreground border-2 border-dashed rounded-lg">
                  Aucune tâche assignée pour aujourd'hui
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Mon planning de la semaine */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <GlassCard className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Calendar className="h-5 w-5 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold">Planning de la semaine</h3>
                </div>
                <Link to="/my-planning">
                  <Button variant="ghost" size="sm">
                    Voir tout
                  </Button>
                </Link>
              </div>

              <div className="space-y-3">
                {/* Jour exemple */}
                {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'].map((day, index) => (
                  <div 
                    key={day}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${index < 2 ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span className="text-sm font-medium">{day}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {index < 2 ? '8h - 17h' : 'Repos'}
                    </span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* Actions rapides */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <GlassCard className="p-4 sm:p-6">
            <h3 className="text-lg font-semibold mb-4">Actions rapides</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Link to="/my-planning">
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-3 h-auto py-3"
                >
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">Mon planning</span>
                </Button>
              </Link>
              
              <Link to="/settings">
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-3 h-auto py-3"
                >
                  <User className="h-4 w-4" />
                  <span className="text-sm">Mon profil</span>
                </Button>
              </Link>

              <Button 
                variant="outline" 
                className="w-full justify-start gap-3 h-auto py-3"
                disabled
              >
                <FileText className="h-4 w-4" />
                <span className="text-sm">Mes documents</span>
              </Button>

              <Button 
                variant="outline" 
                className="w-full justify-start gap-3 h-auto py-3"
                disabled
              >
                <Clock className="h-4 w-4" />
                <span className="text-sm">Mes pointages</span>
              </Button>
            </div>
          </GlassCard>
        </motion.div>

        {/* Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Espace employé
              </p>
              <p className="text-xs text-blue-800 dark:text-blue-200 mt-1">
                Vous avez accès uniquement à votre planning, vos tâches et votre profil. 
                Pour toute question, contactez votre responsable.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </PageLayout>
  );
};

export default EmployeeDashboard;
