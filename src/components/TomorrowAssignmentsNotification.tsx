import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, MapPin, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTomorrowAssignments } from "@/hooks/usePlanningNotifications";
import { format, addDays } from "date-fns";
import { fr } from "date-fns/locale";

/**
 * Composant de notification pour les affectations du lendemain
 * S'affiche en haut de l'écran si l'utilisateur a des affectations prévues demain
 */

export const TomorrowAssignmentsNotification = () => {
  const { data: tomorrowAssignments = [], isLoading } = useTomorrowAssignments();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Récupérer l'état de dismiss depuis localStorage
  useEffect(() => {
    const dismissedDate = localStorage.getItem("dismissedTomorrowNotification");
    const today = format(new Date(), "yyyy-MM-dd");
    
    // Si déjà dismissed aujourd'hui, ne pas afficher
    if (dismissedDate === today) {
      setIsDismissed(true);
    } else {
      setIsDismissed(false);
      // Nettoyer les anciennes dates
      if (dismissedDate && dismissedDate < today) {
        localStorage.removeItem("dismissedTomorrowNotification");
      }
    }
  }, []);

  const handleDismiss = () => {
    const today = format(new Date(), "yyyy-MM-dd");
    localStorage.setItem("dismissedTomorrowNotification", today);
    setIsDismissed(true);
  };

  // Ne rien afficher si loading, dismissed, ou pas d'affectations
  if (isLoading || isDismissed || tomorrowAssignments.length === 0) {
    return null;
  }

  const tomorrow = addDays(new Date(), 1);
  const tomorrowFormatted = format(tomorrow, "EEEE d MMMM", { locale: fr });

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed top-16 left-0 right-0 z-50 mx-auto max-w-4xl px-4"
      >
        <div className="bg-gradient-to-r from-amber-500/95 to-orange-500/95 backdrop-blur-md border border-amber-300/50 rounded-2xl shadow-2xl shadow-amber-500/20 overflow-hidden">
          <div className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className="mt-0.5">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 text-white">
                  <h3 className="font-bold text-lg mb-1">
                    📅 Vos affectations pour demain
                  </h3>
                  <p className="text-sm text-white/90 capitalize">
                    {tomorrowFormatted} • {tomorrowAssignments.length} affectation{tomorrowAssignments.length > 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-white hover:bg-white/20 h-8 w-8 p-0"
                >
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismiss}
                  className="text-white hover:bg-white/20 h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Liste des affectations (expandable) */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-4 space-y-2 overflow-hidden"
                >
                  {tomorrowAssignments.map((assignment) => {
                    const projectName = assignment.project?.name || assignment.title || "Affectation";
                    const location = assignment.project?.location;
                    const hasHoraires = assignment.heure_debut && assignment.heure_fin;

                    return (
                      <div
                        key={assignment.id}
                        className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-white"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm mb-2">
                              🏗️ {projectName}
                            </h4>
                            {location && (
                              <div className="flex items-center gap-2 text-xs text-white/90 mb-1">
                                <MapPin className="h-3 w-3" />
                                <span>{location}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-xs text-white/90">
                              <Clock className="h-3 w-3" />
                              <span>
                                {hasHoraires
                                  ? `${assignment.heure_debut} - ${assignment.heure_fin} (${assignment.heures}h)`
                                  : `${assignment.heures}h`}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
