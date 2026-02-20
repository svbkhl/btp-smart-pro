import { useState, useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate } from "react-router-dom";
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
import { useCreateProject, useUpdateProject, CreateProjectData } from "@/hooks/useProjects";
import { useClients } from "@/hooks/useClients";
import { Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Project } from "@/fakeData/projects";

const projectSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  client_id: z.string().optional(),
  status: z.enum(["planifié", "en_attente", "en_cours", "terminé", "annulé"]).optional(),
  budget: z.string().optional().transform((val) => val ? parseFloat(val) : undefined),
  costs: z.string().optional().transform((val) => val ? parseFloat(val) : undefined),
  actual_revenue: z.string().optional().transform((val) => val ? parseFloat(val) : undefined),
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
  const navigate = useNavigate();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const { data: clients } = useClients();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      client_id: "",
      status: "planifié",
      budget: "",
      costs: "",
      actual_revenue: "",
      start_date: "",
      end_date: "",
      description: "",
    },
  });

  const prevOpenRef = useRef(false);
  useEffect(() => {
    const justOpened = open && !prevOpenRef.current;
    prevOpenRef.current = open;
    if (!justOpened) return;

    if (project) {
      reset({
        name: project.name,
        client_id: project.client_id || "",
        status: project.status || "planifié",
        budget: project.budget?.toString() || "",
        costs: project.costs?.toString() || "",
        actual_revenue: project.actual_revenue?.toString() || "",
        start_date: project.start_date || "",
        end_date: project.end_date || "",
        description: project.description || "",
      });
    } else {
      reset({
        name: "",
        client_id: "",
        status: "planifié",
        budget: "",
        costs: "",
        actual_revenue: "",
        start_date: "",
        end_date: "",
        description: "",
      });
    }
  }, [open, project, reset]);

  const onSubmit = async (data: ProjectFormData) => {
    console.log("Project form submitted:", data);
    setIsSubmitting(true);
    try {
      // Valider et normaliser le statut
      const validStatuses = ["planifié", "en_attente", "en_cours", "terminé", "annulé"] as const;
      const status = (data.status && validStatuses.includes(data.status as any)) 
        ? data.status 
        : "planifié";

      const projectData: CreateProjectData = {
        name: data.name.trim(),
        client_id: (data.client_id && data.client_id !== "none") ? data.client_id : undefined,
        status: status,
        budget: data.budget ? parseFloat(data.budget.toString()) : undefined,
        costs: data.costs ? parseFloat(data.costs.toString()) : undefined,
        actual_revenue: data.actual_revenue ? parseFloat(data.actual_revenue.toString()) : undefined,
        start_date: data.start_date || undefined,
        end_date: data.end_date || undefined,
        description: data.description?.trim() || undefined,
      };

      if (project) {
        await updateProject.mutateAsync({ id: project.id, ...projectData });
      } else {
        await createProject.mutateAsync(projectData);
      }
      onOpenChange(false);
      reset();
    } catch (error: any) {
      console.error("Error saving project:", error);
      const errorMessage = error?.message || error?.error?.message || "Impossible de sauvegarder le chantier";
      alert(`Erreur: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
          className="max-w-[95vw] sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl max-h-[90vh] overflow-y-auto z-[60]"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            const nameInput = document.getElementById("project-form-name");
            if (nameInput instanceof HTMLInputElement) nameInput.focus();
          }}
        >
        <DialogHeader>
          <DialogTitle>
            {project ? "Modifier le chantier" : "Nouveau chantier"}
          </DialogTitle>
          <DialogDescription>
            {project
              ? "Modifiez les informations du chantier"
              : "Créez un nouveau chantier pour suivre vos travaux"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom du chantier *</Label>
            <Controller
              name="name"
              control={control}
              defaultValue=""
              render={({ field }) => (
                <Input
                  {...field}
                  id="project-form-name"
                  placeholder="Ex: Rénovation Maison Martin"
                />
              )}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="client_id">Client</Label>
            <Select
              value={watch("client_id") || ""}
              onValueChange={(value) => {
                if (value === "new") {
                  navigate("/clients?action=create");
                  onOpenChange(false);
                } else {
                  setValue("client_id", value);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun client</SelectItem>
                {clients?.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
                <div className="border-t border-border mt-1 pt-1">
                  <SelectItem value="new" className="text-primary font-semibold">
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Nouveau client
                    </div>
                  </SelectItem>
                </div>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Statut</Label>
              <Select
                value={watch("status") || "planifié"}
                onValueChange={(value) => setValue("status", value as any)}
              >
                <SelectTrigger>
                  <SelectValue />
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
              <Label htmlFor="budget">Budget prévu (€)</Label>
              <Input
                id="budget"
                type="number"
                {...register("budget")}
                placeholder="10000"
              />
              <p className="text-xs text-muted-foreground">Montant estimé du devis</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="costs">Coûts engagés (€)</Label>
              <Input
                id="costs"
                type="number"
                {...register("costs")}
                placeholder="7000"
              />
              <p className="text-xs text-muted-foreground">Dépenses réelles</p>
            </div>

            <div className={cn("space-y-2", watch("status") === "planifié" && "opacity-60")}>
              <Label htmlFor="actual_revenue" className={watch("status") === "planifié" ? "text-muted-foreground" : ""}>
                CA réel (€)
              </Label>
              <Input
                id="actual_revenue"
                type="number"
                {...register("actual_revenue")}
                placeholder="10000"
                disabled={watch("status") === "planifié"}
                className={watch("status") === "planifié" ? "cursor-not-allowed bg-muted" : ""}
              />
              <p className="text-xs text-muted-foreground">
                {watch("status") === "planifié"
                  ? "Disponible lorsque le chantier n’est plus planifié"
                  : "Montant réellement facturé"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <Controller
              name="description"
              control={control}
              defaultValue=""
              render={({ field }) => (
                <Textarea
                  {...field}
                  id="description"
                  placeholder="Description du chantier..."
                  rows={4}
                />
              )}
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



