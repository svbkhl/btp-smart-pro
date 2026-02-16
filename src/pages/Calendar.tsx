import { useState, useMemo } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MyPlanning from "@/pages/MyPlanning";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Tag,
  Loader2,
  User,
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
import { motion } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarWidget } from "@/components/widgets/CalendarWidget";
import { usePermissions } from "@/hooks/usePermissions";

type ViewMode = "day" | "week" | "month";

const EVENT_TYPES = {
  meeting: { label: "Réunion", color: "#3b82f6" },
  task: { label: "Tâche", color: "#10b981" },
  deadline: { label: "Échéance", color: "#f59e0b" },
  reminder: { label: "Rappel", color: "#8b5cf6" },
  other: { label: "Autre", color: "#6b7280" },
};

const Calendar = () => {
  const { isEmployee } = usePermissions();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isEventFormOpen, setIsEventFormOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  const [agendaDate, setAgendaDate] = useState(new Date()); // Date pour l'agenda
  const deleteEvent = useDeleteEvent();
  const { toast } = useToast();

  const { startDate, endDate } = useMemo(() => {
    const date = new Date(currentDate);
    switch (viewMode) {
      case "day":
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);
        return { startDate: dayStart, endDate: dayEnd };
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
  const displayEvents = events || [];

  const goToPrevious = () => {
    switch (viewMode) {
      case "day": setCurrentDate(subDays(currentDate, 1)); break;
      case "week": setCurrentDate(subWeeks(currentDate, 1)); break;
      case "month": setCurrentDate(subMonths(currentDate, 1)); break;
    }
  };

  const goToNext = () => {
    switch (viewMode) {
      case "day": setCurrentDate(addDays(currentDate, 1)); break;
      case "week": setCurrentDate(addWeeks(currentDate, 1)); break;
      case "month": setCurrentDate(addMonths(currentDate, 1)); break;
    }
  };

  const goToToday = () => setCurrentDate(new Date());

  const getEventsForDay = (day: Date) => {
    if (!displayEvents || displayEvents.length === 0) return [];
    return displayEvents.filter((event) => {
      const eventStart = parseISO(event.start_date);
      return isSameDay(eventStart, day);
    });
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { locale: fr });
    const calendarEnd = endOfWeek(monthEnd, { locale: fr });
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    return (
      <div className="grid grid-cols-7 gap-2">
        {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => (
          <div key={day} className="p-2 text-center text-sm font-semibold text-muted-foreground">
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{day.charAt(0)}</span>
          </div>
        ))}
        {days.map((day) => {
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isDayToday = isToday(day);

          return (
            <motion.div
              key={day.toISOString()}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className={`min-h-24 rounded-xl border p-2 transition-all ${
                isCurrentMonth 
                  ? "bg-transparent backdrop-blur-xl border-white/20 dark:border-gray-700/30" 
                  : "bg-muted/30 border-muted"
              } ${isDayToday ? "ring-2 ring-primary shadow-lg" : ""}`}
            >
              <div className={`text-sm font-medium mb-1 ${
                isDayToday ? "text-primary" : isCurrentMonth ? "text-foreground" : "text-muted-foreground"
              }`}>
                {format(day, "d")}
              </div>
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    className="text-xs p-1 rounded cursor-pointer hover:opacity-80 transition-opacity"
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
                  <div className="text-xs text-muted-foreground">
                    +{dayEvents.length - 3} autre(s)
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { locale: fr });
    const days = eachDayOfInterval({
      start: weekStart,
      end: endOfWeek(currentDate, { locale: fr }),
    });

    return (
      <div className="grid grid-cols-1 sm:grid-cols-7 gap-4">
        <div className="col-span-1 sm:col-span-7 grid grid-cols-1 sm:grid-cols-7 gap-2 mb-4">
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className={`text-center p-3 rounded-xl ${
                isToday(day) 
                  ? "bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/20 text-primary" 
                  : "bg-transparent backdrop-blur-xl border border-white/20 dark:border-gray-700/30"
              }`}
            >
              <div className="font-semibold text-sm">{format(day, "EEE", { locale: fr })}</div>
              <div className="text-xs">{format(day, "d MMM", { locale: fr })}</div>
            </div>
          ))}
        </div>
        {days.map((day) => {
          const dayEvents = getEventsForDay(day);
          return (
              <GlassCard key={day.toISOString()} className="min-h-96 p-6">
              <div className="space-y-2">
                {dayEvents.map((event) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-3 rounded-xl border-l-4 cursor-pointer hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all"
                    style={{ borderLeftColor: event.color }}
                    onClick={() => setSelectedEvent(event)}
                  >
                    <div className="font-semibold text-sm">{event.title}</div>
                    {!event.all_day && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3" />
                        {format(parseISO(event.start_date), "HH:mm")}
                        {event.end_date && ` - ${format(parseISO(event.end_date), "HH:mm")}`}
                      </div>
                    )}
                    {event.location && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" />
                        {event.location}
                      </div>
                    )}
                  </motion.div>
                ))}
                {dayEvents.length === 0 && (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    Aucun événement
                  </div>
                )}
              </div>
            </GlassCard>
          );
        })}
      </div>
    );
  };

  const renderDayView = () => {
    const dayEvents = getEventsForDay(currentDate);
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="space-y-4">
        <div className="text-center text-lg font-semibold mb-4">
          {format(currentDate, "EEEE d MMMM yyyy", { locale: fr })}
        </div>
        <div className="grid grid-cols-12 md:grid-cols-24 gap-2">
          <div className="col-span-2 space-y-2 hidden md:block">
            {hours.map((hour) => (
              <div key={hour} className="text-xs text-muted-foreground text-right pr-2 h-16">
                {format(new Date().setHours(hour, 0), "HH:mm")}
              </div>
            ))}
          </div>
          <div className="col-span-12 md:col-span-22 space-y-2">
            {hours.map((hour) => {
              const hourEvents = dayEvents.filter((event) => {
                const eventStart = parseISO(event.start_date);
                return getHours(eventStart) === hour;
              });

              return (
                <div key={hour} className="min-h-16 border-t border-muted p-1">
                  {hourEvents.map((event) => (
                    <GlassCard key={event.id} className="p-2 mb-1 cursor-pointer hover:scale-[1.02] transition-all" onClick={() => setSelectedEvent(event)}>
                      <div className="font-semibold text-sm">{event.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(parseISO(event.start_date), "HH:mm")}
                        {event.end_date && ` - ${format(parseISO(event.end_date), "HH:mm")}`}
                      </div>
                    </GlassCard>
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
    <PageLayout>
      <div className="p-3 sm:p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6 md:space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2">
              Calendrier
            </h1>
            <p className="text-muted-foreground text-base">
              Gérez vos événements et rendez-vous
            </p>
          </div>
        </motion.div>

        {/* Tabs - Ordre différent pour employés : Mon planning, Agenda, Événements (en dernier) */}
        <Tabs defaultValue={isEmployee ? "planning" : "events"} className="w-full space-y-0">
          <TabsList className="grid w-full grid-cols-3 rounded-xl shrink-0 mb-0">
            {isEmployee ? (
              <>
                <TabsTrigger value="planning" className="gap-2">
                  <User className="w-4 h-4" />
                  Mon planning
                </TabsTrigger>
                <TabsTrigger value="agenda" className="gap-2">
                  <Clock className="w-4 h-4" />
                  Agenda
                </TabsTrigger>
                <TabsTrigger value="events" className="gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  Événements
                </TabsTrigger>
              </>
            ) : (
              <>
                <TabsTrigger value="events" className="gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  Événements
                </TabsTrigger>
                <TabsTrigger value="planning" className="gap-2">
                  <User className="w-4 h-4" />
                  Mon planning
                </TabsTrigger>
                <TabsTrigger value="agenda" className="gap-2">
                  <Clock className="w-4 h-4" />
                  Agenda
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="events" className="space-y-4 mt-6 pt-6 border-t border-white/10 dark:border-white/5 focus-visible:outline-none">
            {/* Bouton Nouvel événement */}
            <div className="flex justify-end">
              <Button 
                onClick={() => {
                  console.log("🔵 [Calendar] Click bouton Nouvel événement");
                  setSelectedEvent(null);
                  setIsEventFormOpen(true);
                  console.log("🔵 [Calendar] isEventFormOpen défini à true");
                }} 
                className="rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nouvel événement
              </Button>
            </div>

        {/* Controls */}
        <GlassCard delay={0.2} className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={goToPrevious} className="rounded-xl">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" onClick={goToToday} className="rounded-xl">
                Aujourd'hui
              </Button>
              <Button variant="outline" size="icon" onClick={goToNext} className="rounded-xl">
                <ChevronRight className="w-4 h-4" />
              </Button>
              <div className="ml-4 text-lg font-semibold">
                {viewMode === "month" && format(currentDate, "MMMM yyyy", { locale: fr })}
                {viewMode === "week" && `Semaine du ${format(startDate, "d MMM", { locale: fr })}`}
                {viewMode === "day" && format(currentDate, "EEEE d MMMM yyyy", { locale: fr })}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "day" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("day")}
                className="rounded-xl"
              >
                Jour
              </Button>
              <Button
                variant={viewMode === "week" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("week")}
                className="rounded-xl"
              >
                Semaine
              </Button>
              <Button
                variant={viewMode === "month" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("month")}
                className="rounded-xl"
              >
                Mois
              </Button>
            </div>
          </div>

          {/* Calendar View */}
          <div className="relative">
            {viewMode === "month" && renderMonthView()}
            {viewMode === "week" && renderWeekView()}
            {viewMode === "day" && renderDayView()}
            {isLoading && displayEvents.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-xl z-10">
                <div className="text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Chargement des événements...</p>
                </div>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Event Details */}
        {selectedEvent && (
          <GlassCard delay={0.3} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: selectedEvent.color }} />
                <h3 className="text-lg font-semibold">{selectedEvent.title}</h3>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { 
                  console.log("🔵 [Calendar] Clic Modifier - selectedEvent:", selectedEvent);
                  setIsEventFormOpen(true);
                }} className="rounded-xl">
                  Modifier
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setEventToDelete(selectedEvent)} className="rounded-xl">
                  Supprimer
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedEvent(null)} className="rounded-xl">
                  Fermer
                </Button>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <CalendarIcon className="w-4 h-4" />
                  Date
                </div>
                <div className="font-medium">
                  {format(parseISO(selectedEvent.start_date), "EEEE d MMMM yyyy", { locale: fr })}
                  {selectedEvent.all_day ? " (Toute la journée)" : ` à ${format(parseISO(selectedEvent.start_date), "HH:mm")}`}
                  {selectedEvent.end_date && !selectedEvent.all_day && ` - ${format(parseISO(selectedEvent.end_date), "HH:mm")}`}
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
                  <Badge className="rounded-lg">{selectedEvent.project_name}</Badge>
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
                  className="rounded-lg"
                >
                  {EVENT_TYPES[selectedEvent.type]?.label || selectedEvent.type}
                </Badge>
              </div>
            </div>
          </GlassCard>
        )}
          </TabsContent>

          <TabsContent value="planning" className="mt-6 pt-6 border-t border-white/10 dark:border-white/5 focus-visible:outline-none">
            <MyPlanning embedded />
          </TabsContent>

          <TabsContent value="agenda" className="mt-6 pt-6 border-t border-white/10 dark:border-white/5 focus-visible:outline-none">
            {/* Section Agenda du jour */}
            <GlassCard className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Mon Agenda
                </h2>
                
                {/* Sélecteur de date */}
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAgendaDate(subDays(agendaDate, 1))}
                      className="rounded-lg"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAgendaDate(new Date())}
                      className="rounded-lg min-w-[140px]"
                    >
                      {format(agendaDate, "dd MMM yyyy", { locale: fr })}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAgendaDate(addDays(agendaDate, 1))}
                      className="rounded-lg"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Vue Agenda avec heures (7h - 20h uniquement) */}
              <div className="max-h-[400px] overflow-y-auto space-y-0 border rounded-lg">
                {Array.from({ length: 14 }, (_, index) => {
                  const hour = index + 7; // Commencer à 7h
                  
                  // Récupérer les événements de cette heure pour la date sélectionnée
                  const hourEvents = displayEvents.filter((event) => {
                    const eventStart = parseISO(event.start_date);
                    return isSameDay(eventStart, agendaDate) && getHours(eventStart) === hour;
                  });

                  const isCurrentHour = isToday(agendaDate) && new Date().getHours() === hour;

                  return (
                    <div 
                      key={hour} 
                      className={`flex gap-3 min-h-[50px] border-b border-border/30 last:border-0 ${
                        isCurrentHour ? 'bg-primary/5' : ''
                      }`}
                    >
                      {/* Colonne des heures */}
                      <div className="w-16 flex-shrink-0 pt-2 px-3">
                        <span className={`text-xs font-medium ${
                          isCurrentHour ? 'text-primary font-semibold' : 'text-muted-foreground'
                        }`}>
                          {hour.toString().padStart(2, '0')}:00
                        </span>
                      </div>
                      
                      {/* Colonne des événements */}
                      <div className="flex-1 py-2 pr-3 space-y-1.5">
                        {hourEvents.length > 0 ? (
                          hourEvents.map((event) => {
                            const eventStart = parseISO(event.start_date);
                            const eventEnd = event.end_date ? parseISO(event.end_date) : null;
                            const duration = eventEnd 
                              ? Math.round((eventEnd.getTime() - eventStart.getTime()) / (1000 * 60))
                              : 60;

                            return (
                              <div
                                key={event.id}
                                className="p-2 sm:p-3 rounded-lg cursor-pointer transition-all hover:shadow-md group"
                                style={{
                                  backgroundColor: `${event.color || '#3b82f6'}10`,
                                  borderLeft: `3px solid ${event.color || '#3b82f6'}`,
                                }}
                                onClick={() => {
                                  setSelectedEvent(event);
                                  setIsEventFormOpen(true);
                                }}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-xs sm:text-sm mb-0.5 truncate">
                                      {event.title}
                                    </h4>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <Clock className="w-3 h-3" />
                                      <span>
                                        {format(eventStart, "HH:mm", { locale: fr })}
                                        {eventEnd && ` - ${format(eventEnd, "HH:mm", { locale: fr })}`}
                                      </span>
                                    </div>
                                    {event.location && (
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5 truncate">
                                        <MapPin className="w-3 h-3 flex-shrink-0" />
                                        <span className="truncate">{event.location}</span>
                                      </div>
                                    )}
                                  </div>
                                  {event.event_type && (
                                    <Badge 
                                      variant="outline" 
                                      className="text-xs flex-shrink-0 hidden sm:flex"
                                      style={{
                                        borderColor: event.color || '#3b82f6',
                                        color: event.color || '#3b82f6',
                                      }}
                                    >
                                      {EVENT_TYPES[event.event_type as keyof typeof EVENT_TYPES]?.label || event.event_type}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Note si aucun événement */}
              {displayEvents.filter(e => isSameDay(parseISO(e.start_date), agendaDate)).length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-sm">Aucun événement prévu pour cette journée</p>
                  <Button
                    onClick={() => {
                      setIsEventFormOpen(true);
                      setSelectedEvent(null);
                    }}
                    variant="outline"
                    size="sm"
                    className="mt-3 gap-2 rounded-xl"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter un événement
                  </Button>
                </div>
              )}
            </GlassCard>
          </TabsContent>
        </Tabs>

        {/* EventForm - En dehors des onglets pour être accessible partout */}
        <EventForm
          open={isEventFormOpen}
          onOpenChange={(open) => {
            console.log("🔵 [Calendar] EventForm onOpenChange:", open);
            console.log("🔵 [Calendar] selectedEvent:", selectedEvent);
            console.log("🔵 [Calendar] selectedEvent?.title:", selectedEvent?.title);
            setIsEventFormOpen(open);
            // Réinitialiser selectedEvent quand on ferme le formulaire
            if (!open) {
              setSelectedEvent(null);
            }
          }}
          event={selectedEvent || undefined}
          defaultDate={currentDate}
        />

        {/* AlertDialog - En dehors des onglets pour être accessible partout */}
        <AlertDialog open={!!eventToDelete} onOpenChange={(open) => !open && setEventToDelete(null)}>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer l'événement</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir supprimer l'événement "{eventToDelete?.title}" ? Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteEvent} className="rounded-xl">Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PageLayout>
  );
};

export default Calendar;
