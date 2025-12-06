import { Link } from "react-router-dom";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { useCalendarData } from "@/lib/data/orchestrator";
import { WidgetSkeleton } from "./WidgetSkeleton";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

/**
 * Widget affichant les événements du calendrier
 * Se met à jour automatiquement toutes les 60s
 */
export const CalendarWidget = () => {
  const { todayEvents, upcomingEvents, isLoading, error } = useCalendarData();

  if (isLoading) {
    return <WidgetSkeleton />;
  }

  if (error) {
    return (
      <GlassCard className="p-6">
        <div className="text-center text-muted-foreground text-sm">
          Erreur de chargement des événements
        </div>
      </GlassCard>
    );
  }

  const displayEvents = todayEvents.length > 0 ? todayEvents : upcomingEvents.slice(0, 3);

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">
            {todayEvents.length > 0 ? "Aujourd'hui" : "Prochains événements"}
          </h3>
        </div>
        <Link to="/calendar">
          <Button variant="ghost" size="sm" className="gap-2 rounded-xl">
            Voir tout
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>

      {displayEvents.length > 0 ? (
        <div className="space-y-3">
          {displayEvents.map((event, index) => {
            const eventDate = new Date(event.start_date);
            const eventEnd = event.end_date ? new Date(event.end_date) : null;
            const duration = eventEnd
              ? Math.round(
                  (eventEnd.getTime() - eventDate.getTime()) / (1000 * 60)
                )
              : 60;

            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-r from-blue-500/5 to-purple-500/5 border border-blue-500/10"
              >
                <div
                  className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                  style={{ backgroundColor: event.color || "#3b82f6" }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {event.title}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <Clock className="w-3 h-3" />
                    <span>
                      {format(eventDate, "HH:mm", { locale: fr })} - {duration} min
                    </span>
                    {event.location && (
                      <span className="truncate">• {event.location}</span>
                    )}
                  </div>
                  {event.project_name && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Projet: {event.project_name}
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">
            {todayEvents.length === 0
              ? "Aucun événement aujourd'hui"
              : "Aucun événement à venir"}
          </p>
          <Link to="/calendar">
            <Button variant="outline" size="sm" className="mt-2 rounded-xl">
              Ajouter un événement
            </Button>
          </Link>
        </div>
      )}
    </GlassCard>
  );
};







