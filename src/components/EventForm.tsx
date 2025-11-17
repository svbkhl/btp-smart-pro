import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateEvent, useUpdateEvent, CreateEventData, Event } from "@/hooks/useEvents";
import { useProjects } from "@/hooks/useProjects";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const eventSchema = z.object({
  title: z.string().min(1, "Le titre est requis"),
  project_id: z.string().optional(),
  description: z.string().optional(),
  start_date: z.string().min(1, "La date de début est requise"),
  end_date: z.string().optional(),
  all_day: z.boolean().optional(),
  location: z.string().optional(),
  type: z.enum(["meeting", "task", "deadline", "reminder", "other"]).optional(),
  color: z.string().optional(),
  reminder_minutes: z.union([z.number(), z.string()]).optional(),
  reminder_recurring: z.boolean().optional(),
});

type EventFormData = z.infer<typeof eventSchema>;

interface EventFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: Event;
  defaultDate?: Date;
}

const EVENT_TYPES = [
  { value: "meeting", label: "Réunion", color: "#3b82f6" },
  { value: "task", label: "Tâche", color: "#10b981" },
  { value: "deadline", label: "Échéance", color: "#f59e0b" },
  { value: "reminder", label: "Rappel", color: "#8b5cf6" },
  { value: "other", label: "Autre", color: "#6b7280" },
];

export const EventForm = ({ open, onOpenChange, event, defaultDate }: EventFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const { data: projects } = useProjects();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      project_id: "none",
      description: "",
      start_date: defaultDate
        ? format(defaultDate, "yyyy-MM-dd'T'HH:mm")
        : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      end_date: "",
      all_day: false,
      location: "",
      type: "meeting",
      color: "#3b82f6",
      reminder_minutes: "none",
      reminder_recurring: false,
    },
  });

  const selectedType = watch("type");
  const allDay = watch("all_day");

  useEffect(() => {
    if (event) {
      reset({
        title: event.title,
        project_id: event.project_id || "none",
        description: event.description || "",
        start_date: event.start_date ? format(new Date(event.start_date), "yyyy-MM-dd'T'HH:mm") : "",
        end_date: event.end_date ? format(new Date(event.end_date), "yyyy-MM-dd'T'HH:mm") : "",
        all_day: event.all_day,
        location: event.location || "",
        type: event.type,
        color: event.color,
        reminder_minutes: event.reminder_minutes ? event.reminder_minutes.toString() : "none",
        reminder_recurring: (event as any).reminder_recurring || false,
      });
    } else if (defaultDate) {
      reset({
        title: "",
        project_id: "none",
        description: "",
        start_date: format(defaultDate, "yyyy-MM-dd'T'HH:mm"),
        end_date: "",
        all_day: false,
        location: "",
        type: "meeting",
        color: "#3b82f6",
        reminder_minutes: "none",
        reminder_recurring: false,
      });
    }
  }, [event, defaultDate, reset]);

  // Mettre à jour la couleur quand le type change
  useEffect(() => {
    if (selectedType) {
      const typeConfig = EVENT_TYPES.find((t) => t.value === selectedType);
      if (typeConfig) {
        setValue("color", typeConfig.color);
      }
    }
  }, [selectedType, setValue]);

  const onSubmit = async (data: EventFormData) => {
    setIsSubmitting(true);
    try {
      const eventData: CreateEventData = {
        ...data,
        start_date: allDay
          ? format(new Date(data.start_date), "yyyy-MM-dd") + "T00:00:00"
          : data.start_date,
        end_date: data.end_date
          ? allDay
            ? format(new Date(data.end_date), "yyyy-MM-dd") + "T23:59:59"
            : data.end_date
          : allDay
          ? format(new Date(data.start_date), "yyyy-MM-dd") + "T23:59:59"
          : undefined,
        project_id: data.project_id && data.project_id !== "none" ? data.project_id : undefined,
        reminder_minutes: typeof data.reminder_minutes === "number" ? data.reminder_minutes : undefined,
        reminder_recurring: data.reminder_recurring || false,
      };

      if (event) {
        await updateEvent.mutateAsync({ id: event.id, ...eventData });
      } else {
        await createEvent.mutateAsync(eventData);
      }
      onOpenChange(false);
      reset();
    } catch (error) {
      console.error("Error saving event:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{event ? "Modifier l'événement" : "Nouvel événement"}</DialogTitle>
          <DialogDescription>
            {event
              ? "Modifiez les informations de l'événement."
              : "Créez un nouvel événement dans votre calendrier."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titre *</Label>
            <Input
              id="title"
              {...register("title")}
              placeholder="Réunion client"
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={watch("type")}
                onValueChange={(value) => setValue("type", value as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: type.color }}
                        />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="project_id">Projet (optionnel)</Label>
              <Select
                value={watch("project_id") || "none"}
                onValueChange={(value) => setValue("project_id", value === "none" ? undefined : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un projet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun projet</SelectItem>
                  {projects?.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="all_day"
                checked={watch("all_day")}
                onCheckedChange={(checked) => setValue("all_day", checked as boolean)}
              />
              <Label htmlFor="all_day" className="cursor-pointer">
                Toute la journée
              </Label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Date de début *</Label>
              <Input
                id="start_date"
                type={allDay ? "date" : "datetime-local"}
                {...register("start_date")}
              />
              {errors.start_date && (
                <p className="text-sm text-red-500">{errors.start_date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">Date de fin</Label>
              <Input
                id="end_date"
                type={allDay ? "date" : "datetime-local"}
                {...register("end_date")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Lieu</Label>
            <Input
              id="location"
              {...register("location")}
              placeholder="Bureau, Site de construction, etc."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Détails de l'événement..."
              rows={3}
            />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reminder_minutes">Rappel (avant l'événement)</Label>
              <Select
                value={watch("reminder_minutes")?.toString() || "none"}
                onValueChange={(value) =>
                  setValue("reminder_minutes", value === "none" ? undefined : parseInt(value))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pas de rappel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Pas de rappel</SelectItem>
                  <SelectItem value="5">5 minutes avant</SelectItem>
                  <SelectItem value="15">15 minutes avant</SelectItem>
                  <SelectItem value="30">30 minutes avant</SelectItem>
                  <SelectItem value="60">1 heure avant</SelectItem>
                  <SelectItem value="1440">1 jour avant</SelectItem>
                  <SelectItem value="2880">2 jours avant</SelectItem>
                  <SelectItem value="4320">3 jours avant</SelectItem>
                  <SelectItem value="7200">5 jours avant</SelectItem>
                  <SelectItem value="10080">1 semaine avant</SelectItem>
                  <SelectItem value="20160">2 semaines avant</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choisissez quand vous souhaitez recevoir un rappel avant l'événement
              </p>
            </div>
            {watch("reminder_minutes") && watch("reminder_minutes") !== "none" && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="reminder_recurring"
                    checked={watch("reminder_recurring")}
                    onCheckedChange={(checked) => setValue("reminder_recurring", checked as boolean)}
                  />
                  <Label htmlFor="reminder_recurring" className="cursor-pointer">
                    Rappeler à chaque fois (récurrent)
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Si activé, vous recevrez un rappel tous les jours jusqu'au jour de l'événement (inclus)
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {event ? "Modification..." : "Création..."}
                </>
              ) : event ? (
                "Modifier"
              ) : (
                "Créer"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

