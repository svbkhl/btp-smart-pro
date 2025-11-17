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
import { useCreateProject, useUpdateProject, CreateProjectData, Project } from "@/hooks/useProjects";
import { useClients } from "@/hooks/useClients";
import { ImageUpload } from "@/components/ImageUpload";
import { Loader2 } from "lucide-react";

const projectSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  client_id: z.string().optional(),
  status: z.enum(["planifié", "en_attente", "en_cours", "terminé", "annulé"]).optional(),
  progress: z.number().min(0).max(100).optional(),
  budget: z.string().optional(),
  location: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  description: z.string().optional(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface ProjectFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project;
}

export const ProjectForm = ({ open, onOpenChange, project }: ProjectFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const { data: clients, error: clientsError, isLoading: clientsLoading } = useClients();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      client_id: "none",
      status: "planifié",
      progress: 0,
      budget: "",
      location: "",
      start_date: "",
      end_date: "",
      description: "",
    },
  });

  const status = watch("status");
  const clientId = watch("client_id");
  const [imageUrl, setImageUrl] = useState<string>("");

  useEffect(() => {
    if (project) {
      reset({
        name: project.name,
        client_id: project.client_id || "none",
        status: project.status || "planifié",
        progress: project.progress || 0,
        budget: project.budget?.toString() || "",
        location: project.location || "",
        start_date: project.start_date || "",
        end_date: project.end_date || "",
        description: project.description || "",
      });
      setImageUrl(project.image_url || "");
    } else {
      reset({
        name: "",
        client_id: "none",
        status: "planifié",
        progress: 0,
        budget: "",
        location: "",
        start_date: "",
        end_date: "",
        description: "",
      });
      setImageUrl("");
    }
  }, [project, open, reset]);

  const onSubmit = async (data: ProjectFormData) => {
    setIsSubmitting(true);
    try {
      const projectData: CreateProjectData = {
        name: data.name.trim(),
        client_id: data.client_id && data.client_id !== "" && data.client_id !== "none" ? data.client_id : undefined,
        status: data.status || "planifié",
        progress: data.progress || 0,
        budget: data.budget && data.budget !== "" ? parseFloat(data.budget) : undefined,
        location: data.location && data.location.trim() !== "" ? data.location : undefined,
        start_date: data.start_date && data.start_date !== "" ? data.start_date : undefined,
        end_date: data.end_date && data.end_date !== "" ? data.end_date : undefined,
        description: data.description && data.description.trim() !== "" ? data.description : undefined,
        image_url: imageUrl && imageUrl !== "" ? imageUrl : undefined,
      };

      if (project) {
        await updateProject.mutateAsync({ id: project.id, ...projectData });
      } else {
        await createProject.mutateAsync(projectData);
      }
      
      // Attendre un peu pour que la mutation se termine
      await new Promise(resolve => setTimeout(resolve, 100));
      
      onOpenChange(false);
      reset();
      setImageUrl("");
    } catch (error: any) {
      // L'erreur est déjà gérée par le hook (toast)
      // Mais on ne ferme pas le dialog en cas d'erreur pour que l'utilisateur puisse corriger
      console.error("Error saving project:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{project ? "Modifier le projet" : "Nouveau projet"}</DialogTitle>
          <DialogDescription>
            {project ? "Modifiez les informations du projet." : "Créez un nouveau projet/chantier."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Nom du projet <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="Rénovation Maison Martin"
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="client_id">Client</Label>
            <Select 
              value={clientId || "none"} 
              onValueChange={(value) => setValue("client_id", value === "none" ? "" : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un client (optionnel)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun client</SelectItem>
                {clientsLoading ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">Chargement...</div>
                ) : clientsError ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">Erreur de chargement</div>
                ) : (
                  clients?.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Statut</Label>
              <Select value={status} onValueChange={(value) => setValue("status", value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planifié">Planifié</SelectItem>
                  <SelectItem value="en_attente">En attente</SelectItem>
                  <SelectItem value="en_cours">En cours</SelectItem>
                  <SelectItem value="terminé">Terminé</SelectItem>
                  <SelectItem value="annulé">Annulé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="progress">Progression (%)</Label>
              <Input
                id="progress"
                type="number"
                min="0"
                max="100"
                {...register("progress", { valueAsNumber: true })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget">Budget (€)</Label>
            <Input
              id="budget"
              type="number"
              step="0.01"
              {...register("budget")}
              placeholder="28000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Lieu du chantier</Label>
            <Input
              id="location"
              {...register("location")}
              placeholder="Paris 15e"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Date de début</Label>
              <Input
                id="start_date"
                type="date"
                {...register("start_date")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">Date de fin</Label>
              <Input
                id="end_date"
                type="date"
                {...register("end_date")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Description du projet..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <ImageUpload
              value={imageUrl}
              onChange={setImageUrl}
              folder="projects"
              label="Image du projet"
              disabled={isSubmitting}
            />
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
              {project ? "Modifier" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

