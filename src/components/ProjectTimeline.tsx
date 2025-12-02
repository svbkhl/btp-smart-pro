import { useEvents } from "@/hooks/useEvents";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ProjectTimelineProps {
  projectId: string;
}

export const ProjectTimeline = ({ projectId }: ProjectTimelineProps) => {
  const { data: events = [] } = useEvents();
  const projectEvents = events.filter((e) => e.project_id === projectId);

  const sortedEvents = [...projectEvents].sort(
    (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
  );

  const getEventIcon = (type: string) => {
    switch (type) {
      case "deadline":
        return AlertCircle;
      case "task":
        return CheckCircle2;
      case "meeting":
        return Calendar;
      default:
        return FileText;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case "deadline":
        return "destructive";
      case "task":
        return "default";
      case "meeting":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (sortedEvents.length === 0) {
    return (
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold mb-4">Timeline du projet</h3>
        <p className="text-muted-foreground text-center py-8">
          Aucun événement enregistré pour ce projet
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-6">
      <h3 className="text-lg font-semibold mb-6">Timeline du projet</h3>
      <div className="space-y-4">
        {sortedEvents.map((event, index) => {
          const Icon = getEventIcon(event.type || "other");
          const isLast = index === sortedEvents.length - 1;

          return (
            <div key={event.id} className="relative flex gap-4">
              {/* Timeline line */}
              {!isLast && (
                <div className="absolute left-5 top-12 bottom-0 w-0.5 bg-border" />
              )}

              {/* Icon */}
              <div className="relative z-10 flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 pb-6">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold">{event.title}</h4>
                    {event.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {event.description}
                      </p>
                    )}
                  </div>
                  <Badge variant={getEventColor(event.type || "other")}>
                    {event.type || "Événement"}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mt-2">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>
                      {format(new Date(event.start_date), "d MMM yyyy à HH:mm", {
                        locale: fr,
                      })}
                    </span>
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span>{event.location}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
};






