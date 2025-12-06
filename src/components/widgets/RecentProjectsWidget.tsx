import { Link } from "react-router-dom";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, FolderKanban, Calendar, Users } from "lucide-react";
import { motion } from "framer-motion";
import { useProjectsData } from "@/lib/data/orchestrator";
import { WidgetSkeleton } from "./WidgetSkeleton";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

/**
 * Widget affichant les derniers chantiers
 * Se met à jour automatiquement toutes les 60s
 */
export const RecentProjectsWidget = () => {
  const { data: projects, recentProjects, isLoading, error } = useProjectsData();

  if (isLoading) {
    return <WidgetSkeleton />;
  }

  if (error) {
    return (
      <GlassCard className="p-6">
        <div className="text-center text-muted-foreground text-sm">
          Erreur de chargement des chantiers
        </div>
      </GlassCard>
    );
  }

  const displayProjects = recentProjects.slice(0, 5);

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FolderKanban className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">
            Chantiers récents
          </h3>
        </div>
        <Link to="/projects">
          <Button variant="ghost" size="sm" className="gap-2 rounded-xl">
            Voir tout
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>

      {displayProjects.length > 0 ? (
        <div className="space-y-3">
          {displayProjects.map((project, index) => {
            const progress =
              project.status === "terminé"
                ? 100
                : project.status === "en_cours"
                ? 65
                : project.status === "planifié"
                ? 20
                : 10;

            return (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link to={`/projects/${project.id}`} className="block">
                  <div className="flex items-center justify-between p-3 rounded-xl border border-white/20 dark:border-gray-700/30 hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all group">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {project.name}
                        </h4>
                        <Badge
                          variant={
                            project.status === "en_cours"
                              ? "default"
                              : project.status === "terminé"
                              ? "outline"
                              : "secondary"
                          }
                          className="rounded-lg text-xs"
                        >
                          {project.status === "en_cours"
                            ? "En cours"
                            : project.status === "terminé"
                            ? "Terminé"
                            : project.status === "planifié"
                            ? "Planifié"
                            : project.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {project.client && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {typeof project.client === "string"
                              ? project.client
                              : project.client.name}
                          </span>
                        )}
                        {project.end_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(project.end_date), "dd/MM/yyyy", {
                              locale: fr,
                            })}
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Progression</span>
                          <span className="font-medium text-foreground">
                            {progress}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.3, delay: 0.2 + index * 0.1 }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">Aucun chantier récent</p>
          <Link to="/projects">
            <Button variant="outline" size="sm" className="mt-2 rounded-xl">
              Créer un chantier
            </Button>
          </Link>
        </div>
      )}
    </GlassCard>
  );
};







