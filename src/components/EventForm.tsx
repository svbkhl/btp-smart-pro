import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

const eventSchema = z.object({
  title: z.string().min(1, "Le titre est requis"),
  description: z.string().optional(),
  start_date: z.string().min(1, "La date de début est requise"),
  end_date: z.string().optional(),
  all_day: z.boolean().optional(),
  location: z.string().optional(),
  type: z.enum(["meeting", "task", "deadline", "reminder", "other"]).optional(),
  color: z.string().optional(),
  project_id: z.string().optional(),
});

type EventFormData = z.infer<typeof eventSchema>;

interface EventFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: Event;
  defaultDate?: Date;
}

export const EventForm = ({ open, onOpenChange, event, defaultDate }: EventFormProps) => {
  console.log("🟢 [EventForm] Render - open:", open, "event:", event?.id);
  
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
      description: "",
      start_date: defaultDate ? format(defaultDate, "yyyy-MM-dd'T'HH:mm") : "",
      end_date: "",
      all_day: false,
      location: "",
      type: "meeting",
      color: "#3b82f6",
      project_id: "",
    },
  });

  useEffect(() => {
    if (event) {
      reset({
        title: event.title,
        description: event.description || "",
        start_date: event.start_date ? format(new Date(event.start_date), "yyyy-MM-dd'T'HH:mm") : "",
        end_date: event.end_date ? format(new Date(event.end_date), "yyyy-MM-dd'T'HH:mm") : "",
        all_day: event.all_day || false,
        location: event.location || "",
        type: event.type || "meeting",
        color: event.color || "#3b82f6",
        project_id: event.project_id || "",
      });
    } else if (defaultDate) {
      reset({
        title: "",
        description: "",
        start_date: format(defaultDate, "yyyy-MM-dd'T'HH:mm"),
        end_date: "",
        all_day: false,
        location: "",
        type: "meeting",
        color: "#3b82f6",
        project_id: "",
      });
    }
  }, [event, defaultDate, open, reset]);

  const onSubmit = async (data: EventFormData) => {
    console.log("✅ [EventForm] Soumission du formulaire:", data);
    
    setIsSubmitting(true);
    try {
      // Valider project_id (UUID valide ou undefined)
      let validProjectId: string | undefined = undefined;
      if (data.project_id && 
          data.project_id.trim() !== "" &&
          data.project_id !== "none" && 
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.project_id)) {
        validProjectId = data.project_id;
      }

      const eventData: CreateEventData = {
        title: data.title,
        description: data.description || undefined,
        start_date: data.start_date,
        end_date: data.end_date || undefined,
        all_day: data.all_day || false,
        location: data.location || undefined,
        type: data.type || "meeting",
        color: data.color || "#3b82f6",
        project_id: validProjectId,
      };
      
      console.log("📝 [EventForm] Données à envoyer:", eventData);

      if (event) {
        await updateEvent.mutateAsync({ id: event.id, ...eventData });
        console.log("✅ [EventForm] Événement mis à jour");
      } else {
        await createEvent.mutateAsync(eventData);
        console.log("✅ [EventForm] Événement créé");
      }
      
      // Fermer le modal et réinitialiser
      onOpenChange(false);
      reset();
    } catch (error: any) {
      console.error("❌ [EventForm] Erreur:", error);
      alert(`Erreur: ${error.message || "Impossible de sauvegarder l'événement"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const typeColors: Record<string, string> = {
    meeting: "#3b82f6",
    task: "#10b981",
    deadline: "#f59e0b",
    reminder: "#8b5cf6",
    other: "#6b7280",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {event ? "Modifier l'événement" : "Nouvel événement"}
          </DialogTitle>
          <DialogDescription>
            {event
              ? "Modifiez les informations de l'événement"
              : "Créez un nouvel événement dans votre calendrier"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titre *</Label>
            <Input
              id="title"
              {...register("title")}
              placeholder="Ex: Réunion équipe"
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={watch("type") || "meeting"}
                onValueChange={(value) => {
                  setValue("type", value as any);
                  setValue("color", typeColors[value] || "#3b82f6");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="meeting">Réunion</SelectItem>
                  <SelectItem value="task">Tâche</SelectItem>
                  <SelectItem value="deadline">Échéance</SelectItem>
                  <SelectItem value="reminder">Rappel</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="project_id">Chantier</Label>
              <Select
                value={watch("project_id") || ""}
                onValueChange={(value) => {
                  // ⚠️ SÉCURITÉ : Ne jamais accepter "events" comme valeur
                  if (value === "events") {
                    console.error("❌ [EventForm] Tentative de définir project_id à 'events' - bloqué!");
                    setValue("project_id", "");
                    return;
                  }
                  // Si "none" ou vide, définir à chaîne vide (sera traité comme undefined)
                  setValue("project_id", value === "none" ? "" : value);
                }}
              >
              <SelectTrigger>
                <SelectValue placeholder="Aucun chantier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Aucun chantier</SelectItem>
                {projects?.map((project) => {
                  // ⚠️ SÉCURITÉ : Vérifier que project.id est un UUID valide
                  if (!project.id || project.id === "events" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(project.id)) {
                    console.warn("⚠️ [EventForm] Projet avec ID invalide ignoré:", project);
                    return null;
                  }
                  return (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  );
                })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Date de début *</Label>
              <Input
                id="start_date"
                type="datetime-local"
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
                type="datetime-local"
                {...register("end_date")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Lieu</Label>
            <Input
              id="location"
              {...register("location")}
              placeholder="Adresse ou lieu de l'événement"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Description de l'événement..."
              rows={4}
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="all_day"
              {...register("all_day")}
              className="rounded"
            />
            <Label htmlFor="all_day" className="cursor-pointer">
              Toute la journée
            </Label>
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
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {event ? "Modifier" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};



