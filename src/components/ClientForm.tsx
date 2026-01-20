import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useCreateClient, useUpdateClient, CreateClientData, Client } from "@/hooks/useClients";
import { ImageUpload } from "@/components/ImageUpload";
import { Loader2 } from "lucide-react";

const clientSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  prenom: z.string().optional(),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  phone: z.string().optional(),
  location: z.string().optional(),
  status: z.enum(["actif", "terminé", "planifié"]).optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

interface ClientFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client;
}

export const ClientForm = ({ open, onOpenChange, client }: ClientFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      prenom: "",
      email: "",
      phone: "",
      location: "",
      status: "actif",
    },
  });

  const status = watch("status");
  const [avatarUrl, setAvatarUrl] = useState<string>("");

  useEffect(() => {
    if (client) {
      reset({
        name: client.name,
        prenom: (client as any).prenom || "",
        email: client.email || "",
        phone: client.phone || "",
        location: client.location || "",
        status: client.status === "VIP" ? "actif" : (client.status || "actif"),
      });
      setAvatarUrl(client.avatar_url || "");
    } else {
      reset({
        name: "",
        prenom: "",
        email: "",
        phone: "",
        location: "",
        status: "actif",
      });
      setAvatarUrl("");
    }
  }, [client, open, reset]);

  const onSubmit = async (data: ClientFormData) => {
    console.log("Client form submitted:", data);
    setIsSubmitting(true);
    try {
      const clientData: CreateClientData = {
        name: data.name,
        prenom: data.prenom || undefined,
        email: data.email || undefined,
        phone: data.phone || undefined,
        location: data.location || undefined,
        status: data.status || "actif",
        avatar_url: avatarUrl || undefined,
      };

      if (client) {
        await updateClient.mutateAsync({ id: client.id, ...clientData });
      } else {
        await createClient.mutateAsync(clientData);
      }
      onOpenChange(false);
      reset();
      setAvatarUrl("");
    } catch (error: any) {
      console.error("Error saving client:", error);
      alert(`Erreur: ${error.message || "Impossible de sauvegarder le client"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{client ? "Modifier le client" : "Nouveau client"}</DialogTitle>
          <DialogDescription>
            {client ? "Modifiez les informations du client." : "Ajoutez un nouveau client à votre liste."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prenom">Prénom</Label>
            <Input
              id="prenom"
              {...register("prenom")}
              placeholder="Jean"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">
              Nom <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="Martin"
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              placeholder="martin@email.com"
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone</Label>
            <Input
              id="phone"
              {...register("phone")}
              placeholder="06 12 34 56 78"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Adresse</Label>
            <Input
              id="location"
              {...register("location")}
              placeholder="Paris 15e"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Statut</Label>
            <Select value={status} onValueChange={(value) => setValue("status", value as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="actif">Actif</SelectItem>
                <SelectItem value="terminé">Terminé</SelectItem>
                <SelectItem value="planifié">Planifié</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <ImageUpload
              value={avatarUrl}
              onChange={setAvatarUrl}
              folder="clients"
              label="Photo du client"
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
              {client ? "Modifier" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

