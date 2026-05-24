import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateClient, Client } from "@/hooks/useClients";
import { Loader2, UserPlus, User, Building2 } from "lucide-react";

type ClientType = "particulier" | "entreprise";

interface FormValues {
  name: string;
  prenom?: string;
  email?: string;
  phone?: string;
}

interface CreateClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (client: Client) => void;
}

export const CreateClientDialog = ({ open, onOpenChange, onCreated }: CreateClientDialogProps) => {
  const createClient = useCreateClient();
  const [clientType, setClientType] = useState<ClientType>("particulier");
  const [titre, setTitre] = useState<"M." | "Mme" | "">("");

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: { name: "", prenom: "", email: "", phone: "" },
  });

  const handleClose = () => {
    reset();
    setTitre("");
    setClientType("particulier");
    onOpenChange(false);
  };

  const onSubmit = async (data: FormValues) => {
    try {
      const newClient = await createClient.mutateAsync({
        titre: clientType === "particulier" ? (titre || undefined) : undefined,
        name: data.name.trim(),
        prenom: clientType === "particulier" ? (data.prenom?.trim() || undefined) : undefined,
        email: data.email?.trim() || undefined,
        phone: data.phone?.trim() || undefined,
        status: "actif",
      });
      onCreated(newClient);
      handleClose();
    } catch {
      // error toast handled in hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Nouveau client
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Toggle particulier / entreprise */}
          <div className="flex rounded-lg border overflow-hidden">
            <button
              type="button"
              onClick={() => setClientType("particulier")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors ${
                clientType === "particulier"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              <User className="w-4 h-4" />
              Particulier
            </button>
            <button
              type="button"
              onClick={() => setClientType("entreprise")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors ${
                clientType === "entreprise"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              <Building2 className="w-4 h-4" />
              Entreprise
            </button>
          </div>

          {/* Champs particulier */}
          {clientType === "particulier" && (
            <div className="flex gap-2">
              <div className="w-28">
                <Label>Titre</Label>
                <Select value={titre} onValueChange={(v) => setTitre(v as "M." | "Mme" | "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M.">M.</SelectItem>
                    <SelectItem value="Mme">Mme</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label htmlFor="prenom">Prénom</Label>
                <Input id="prenom" placeholder="Prénom" {...register("prenom")} />
              </div>
            </div>
          )}

          {/* Nom (particulier) ou Raison sociale (entreprise) */}
          <div>
            <Label htmlFor="name">
              {clientType === "particulier" ? "Nom *" : "Raison sociale *"}
            </Label>
            <Input
              id="name"
              placeholder={clientType === "particulier" ? "Nom de famille" : "Nom de l'entreprise"}
              {...register("name", { required: "Ce champ est requis" })}
            />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="email@exemple.fr" {...register("email")} />
          </div>

          <div>
            <Label htmlFor="phone">Téléphone</Label>
            <Input id="phone" placeholder="06 00 00 00 00" {...register("phone")} />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={createClient.isPending}>
              {createClient.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Création...</>
              ) : (
                <><UserPlus className="w-4 h-4 mr-2" />Créer</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
