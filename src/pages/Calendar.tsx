import { useState, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Tag,
  Loader2,
} from "lucide-react";
import { useEvents, Event, useDeleteEvent } from "@/hooks/useEvents";
import { EventForm } from "@/components/EventForm";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  addDays,
  subDays,
  isToday,
  getHours,
  getMinutes,
  parseISO,
} from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { safeAction } from "@/utils/safeAction";

type ViewMode = "day" | "week" | "month";

const EVENT_TYPES = {
  meeting: { label: "Réunion", color: "#3b82f6" },
  task: { label: "Tâche", color: "#10b981" },
  deadline: { label: "Échéance", color: "#f59e0b" },
  reminder: { label: "Rappel", color: "#8b5cf6" },
  other: { label: "Autre", color: "#6b7280" },
};

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isEventFormOpen, setIsEventFormOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  const deleteEvent = useDeleteEvent();
  const { toast } = useToast();

  // Calculer les dates pour la vue actuelle
  const { startDate, endDate } = useMemo(() => {
    const date = new Date(currentDate);
    switch (viewMode) {
      case "day":
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);
        return {
          startDate: dayStart,
          endDate: dayEnd,
        };
      case "week":
        return {
          startDate: startOfWeek(date, { locale: fr }),
          endDate: endOfWeek(date, { locale: fr }),
        };
      case "month":
        return {
          startDate: startOfMonth(date),
          endDate: endOfMonth(date),
        };
    }
  }, [currentDate, viewMode]);

  const { data: events, isLoading } = useEvents(startDate, endDate);
  
  // Utiliser des données par défaut si chargement
  // Les hooks retournent déjà des données mock en cas de timeout (3 secondes)
  // Cette approche évite les chargements infinis en affichant toujours du contenu
  const displayEvents = events || [];

  // Navigation
  const goToPrevious = () => {
    switch (viewMode) {
      case "day":
        setCurrentDate(subDays(currentDate, 1));
        break;
      case "week":
        setCurrentDate(subWeeks(currentDate, 1));
        break;
      case "month":
        setCurrentDate(subMonths(currentDate, 1));
        break;
    }
  };

  const goToNext = () => {
    switch (viewMode) {
      case "day":
        setCurrentDate(addDays(currentDate, 1));
        break;
      case "week":
        setCurrentDate(addWeeks(currentDate, 1));
        break;
      case "month":
        setCurrentDate(addMonths(currentDate, 1));
        break;
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Filtrer les événements pour un jour donné
  const getEventsForDay = (day: Date) => {
    if (!displayEvents || displayEvents.length === 0) return [];
    return displayEvents.filter((event) => {
      const eventStart = parseISO(event.start_date);
      return isSameDay(eventStart, day);
    });
  };

  // Vue Mois
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { locale: fr });
    const calendarEnd = endOfWeek(monthEnd, { locale: fr });
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    return (
      <div className="grid grid-cols-7 gap-1 md:gap-2">
        {/* En-têtes des jours */}
        {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => (
          <div key={day} className="p-1 md:p-2 text-center text-xs md:text-sm font-semibold text-muted-foreground">
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{day.charAt(0)}</span>
          </div>
        ))}

        {/* Jours du mois */}
        {days.map((day) => {
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isDayToday = isToday(day);

          return (
            <div
              key={day.toISOString()}
              className={`min-h-16 md:min-h-24 border rounded-lg p-1 md:p-2 ${
                isCurrentMonth ? "bg-background" : "bg-muted/30"
              } ${isDayToday ? "ring-2 ring-primary" : ""}`}
            >
              <div
                className={`text-xs md:text-sm font-medium mb-1 ${
                  isDayToday ? "text-primary" : isCurrentMonth ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {format(day, "d")}
              </div>
              <div className="space-y-0.5 md:space-y-1">
                {dayEvents.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    className="text-[10px] md:text-xs p-0.5 md:p-1 rounded cursor-pointer hover:opacity-80"
                    style={{
                      backgroundColor: event.color + "20",
                      color: event.color,
                      borderLeft: `2px solid ${event.color}`,
                    }}
                    onClick={() => setSelectedEvent(event)}
                    title={event.title}
                  >
                    <div className="truncate font-medium">{event.title}</div>
                    {!event.all_day && (
                      <div className="text-[10px] opacity-70 hidden sm:block">
                        {format(parseISO(event.start_date), "HH:mm")}
                      </div>
                    )}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] md:text-xs text-muted-foreground">
                    +{dayEvents.length - 3} autre(s)
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Vue Semaine
  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { locale: fr });
    const days = eachDayOfInterval({
      start: weekStart,
      end: endOfWeek(currentDate, { locale: fr }),
    });

    return (
      <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
        {/* En-têtes */}
        <div className="col-span-1 sm:col-span-7 grid grid-cols-1 sm:grid-cols-7 gap-2 mb-2">
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className={`text-center p-2 rounded ${
                isToday(day) ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}
            >
              <div className="font-semibold text-sm md:text-base">{format(day, "EEE", { locale: fr })}</div>
              <div className="text-xs md:text-sm">{format(day, "d MMM", { locale: fr })}</div>
            </div>
          ))}
        </div>

        {/* Événements par jour */}
        {days.map((day) => {
          const dayEvents = getEventsForDay(day);
          return (
            <div key={day.toISOString()} className="min-h-48 sm:min-h-96 border rounded-lg p-2">
              <div className="space-y-2">
                {dayEvents.map((event) => (
                  <Card
                    key={event.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedEvent(event)}
                    style={{ borderLeftColor: event.color, borderLeftWidth: "4px" }}
                  >
                    <CardContent className="p-3">
                      <div className="font-semibold text-sm">{event.title}</div>
                      {!event.all_day && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3" />
                          {format(parseISO(event.start_date), "HH:mm")}
                          {event.end_date &&
                            ` - ${format(parseISO(event.end_date), "HH:mm")}`}
                        </div>
                      )}
                      {event.location && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" />
                          {event.location}
                        </div>
                      )}
                      {event.project_name && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Projet: {event.project_name}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {dayEvents.length === 0 && (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    Aucun événement
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Vue Jour
  const renderDayView = () => {
    const dayEvents = getEventsForDay(currentDate);
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="space-y-4">
        <div className="text-center text-lg font-semibold mb-4">
          {format(currentDate, "EEEE d MMMM yyyy", { locale: fr })}
        </div>
        <div className="grid grid-cols-12 md:grid-cols-24 gap-2">
          {/* Heures */}
          <div className="col-span-2 space-y-2 hidden md:block">
            {hours.map((hour) => (
              <div key={hour} className="text-xs text-muted-foreground text-right pr-2 h-16">
                {format(new Date().setHours(hour, 0), "HH:mm")}
              </div>
            ))}
          </div>

          {/* Événements */}
          <div className="col-span-12 md:col-span-22 space-y-2">
            {hours.map((hour) => {
              const hourEvents = dayEvents.filter((event) => {
                const eventStart = parseISO(event.start_date);
                return getHours(eventStart) === hour;
              });

              return (
                <div key={hour} className="min-h-16 border-t border-muted p-1">
                  {hourEvents.map((event) => (
                    <Card
                      key={event.id}
                      className="cursor-pointer hover:shadow-md transition-shadow mb-1"
                      onClick={() => setSelectedEvent(event)}
                      style={{ borderLeftColor: event.color, borderLeftWidth: "4px" }}
                    >
                      <CardContent className="p-2">
                        <div className="font-semibold text-sm">{event.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(parseISO(event.start_date), "HH:mm")}
                          {event.end_date &&
                            ` - ${format(parseISO(event.end_date), "HH:mm")}`}
                        </div>
                        {event.location && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3" />
                            {event.location}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const handleDeleteEvent = async () => {
    if (!eventToDelete) return;
    await safeAction(
      async () => {
        await deleteEvent.mutateAsync(eventToDelete.id);
        setEventToDelete(null);
      },
      {
        successMessage: "Événement supprimé avec succès",
        errorMessage: "Erreur lors de la suppression de l'événement",
      }
    );
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Calendrier</h1>
              <p className="text-muted-foreground mt-1">
                Gérez vos événements et rendez-vous
              </p>
            </div>
            <Button onClick={() => setIsEventFormOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nouvel événement
            </Button>
          </div>

          {/* Contrôles */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={goToPrevious}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" onClick={goToToday}>
                    Aujourd'hui
                  </Button>
                  <Button variant="outline" size="icon" onClick={goToNext}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <div className="ml-4 text-lg font-semibold">
                    {viewMode === "month" && format(currentDate, "MMMM yyyy", { locale: fr })}
                    {viewMode === "week" &&
                      `Semaine du ${format(startDate, "d MMM", { locale: fr })}`}
                    {viewMode === "day" && format(currentDate, "EEEE d MMMM yyyy", { locale: fr })}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={viewMode === "day" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("day")}
                  >
                    Jour
                  </Button>
                  <Button
                    variant={viewMode === "week" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("week")}
                  >
                    Semaine
                  </Button>
                  <Button
                    variant={viewMode === "month" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("month")}
                  >
                    Mois
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative">
              {/* Afficher toujours le contenu, même pendant le chargement initial
                  Les hooks retournent des données mock après 3 secondes de timeout
                  Cela évite les chargements infinis */}
              {viewMode === "month" && renderMonthView()}
              {viewMode === "week" && renderWeekView()}
              {viewMode === "day" && renderDayView()}
              {isLoading && displayEvents.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg z-10">
                  <div className="text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Chargement des événements...</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Détails de l'événement */}
          {selectedEvent && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: selectedEvent.color }}
                    />
                    {selectedEvent.title}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsEventFormOpen(true);
                        setSelectedEvent(null);
                      }}
                    >
                      Modifier
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setEventToDelete(selectedEvent)}
                    >
                      Supprimer
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedEvent(null)}>
                      Fermer
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <CalendarIcon className="w-4 h-4" />
                    Date
                  </div>
                  <div className="font-medium">
                    {format(parseISO(selectedEvent.start_date), "EEEE d MMMM yyyy", {
                      locale: fr,
                    })}
                    {selectedEvent.all_day
                      ? " (Toute la journée)"
                      : ` à ${format(parseISO(selectedEvent.start_date), "HH:mm")}`}
                    {selectedEvent.end_date &&
                      !selectedEvent.all_day &&
                      ` - ${format(parseISO(selectedEvent.end_date), "HH:mm")}`}
                  </div>
                </div>
                {selectedEvent.location && (
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <MapPin className="w-4 h-4" />
                      Lieu
                    </div>
                    <div className="font-medium">{selectedEvent.location}</div>
                  </div>
                )}
                {selectedEvent.description && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Description</div>
                    <div>{selectedEvent.description}</div>
                  </div>
                )}
                {selectedEvent.project_name && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Projet</div>
                    <Badge>{selectedEvent.project_name}</Badge>
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Tag className="w-4 h-4" />
                    Type
                  </div>
                  <Badge
                    style={{
                      backgroundColor: selectedEvent.color + "20",
                      color: selectedEvent.color,
                    }}
                  >
                    {EVENT_TYPES[selectedEvent.type]?.label || selectedEvent.type}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Formulaire d'événement */}
          <EventForm
            open={isEventFormOpen}
            onOpenChange={setIsEventFormOpen}
            event={selectedEvent || undefined}
            defaultDate={currentDate}
          />

          {/* Dialog de confirmation de suppression */}
          <AlertDialog
            open={!!eventToDelete}
            onOpenChange={(open) => !open && setEventToDelete(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer l'événement</AlertDialogTitle>
                <AlertDialogDescription>
                  Êtes-vous sûr de vouloir supprimer l'événement "{eventToDelete?.title}" ? Cette
                  action est irréversible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteEvent}>Supprimer</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </main>
    </div>
  );
};

export default Calendar;

