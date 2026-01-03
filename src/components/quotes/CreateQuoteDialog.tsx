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
import { useCreateQuote, CreateQuoteData } from "@/hooks/useQuotes";
import { useClients, useCreateClient } from "@/hooks/useClients";
import { Loader2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const quoteSchema = z.object({
  client_id: z.string().optional(),
  client_name: z.string().min(1, "Le nom du client est requis"),
  client_email: z.string().email("Email invalide").optional().or(z.literal("")),
  estimated_cost: z.string().min(1, "Le montant est requis"),
  status: z.enum(["draft", "sent", "accepted", "rejected", "expired"]),
  description: z.string().optional(),
});

type QuoteFormData = z.infer<typeof quoteSchema>;

interface CreateQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateQuoteDialog = ({ open, onOpenChange }: CreateQuoteDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNewClient, setIsNewClient] = useState(false);
  const createQuote = useCreateQuote();
  const { data: clients } = useClients();
  const createClient = useCreateClient();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      client_id: "",
      client_name: "",
      client_email: "",
      estimated_cost: "",
      status: "draft",
      description: "",
    },
  });

  const selectedClientId = watch("client_id");

  // Charger les données du client sélectionné
  useEffect(() => {
    if (selectedClientId && clients) {
      const client = clients.find((c) => c.id === selectedClientId);
      if (client) {
        setValue("client_name", client.name);
        setValue("client_email", client.email || "");
      }
    }
  }, [selectedClientId, clients, setValue]);

  // Réinitialiser le formulaire quand le dialog s'ouvre/ferme
  useEffect(() => {
    if (!open) {
      reset();
      setIsNewClient(false);
    }
  }, [open, reset]);

  const onSubmit = async (data: QuoteFormData) => {
    // Validation
    if (!data.estimated_cost || parseFloat(data.estimated_cost) <= 0) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un montant valide",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      let finalClientId = data.client_id;

      // Créer un nouveau client si nécessaire
      if (isNewClient && data.client_name) {
        try {
          const newClient = await createClient.mutateAsync({
            name: data.client_name,
            email: data.client_email || undefined,
          });
          finalClientId = newClient.id;
        } catch (error: any) {
          console.error("Error creating client:", error);
          toast({
            title: "Erreur",
            description: error.message || "Impossible de créer le client",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
      }

      // Préparer les données du devis
      const quoteData: CreateQuoteData = {
        client_name: data.client_name,
        estimated_cost: parseFloat(data.estimated_cost),
        status: data.status,
      };

      if (finalClientId) {
        quoteData.project_id = finalClientId; // Utiliser client_id comme project_id temporairement
      }

      await createQuote.mutateAsync(quoteData);

      toast({
        title: "Devis créé",
        description: "Le devis a été créé avec succès",
      });

      onOpenChange(false);
      reset();
    } catch (error: any) {
      console.error("Error creating quote:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer le devis",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer un devis</DialogTitle>
          <DialogDescription>
            Remplissez les informations pour créer un nouveau devis
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Sélection ou création de client */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="client-select">Client</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsNewClient(!isNewClient)}
                className="h-7 text-xs"
              >
                {isNewClient ? "Sélectionner un client existant" : "Créer un nouveau client"}
              </Button>
            </div>

            {isNewClient ? (
              <div className="space-y-2">
                <Input
                  id="client-name"
                  placeholder="Nom du client"
                  {...register("client_name")}
                />
                {errors.client_name && (
                  <p className="text-sm text-destructive">{errors.client_name.message}</p>
                )}
                <Input
                  id="client-email"
                  type="email"
                  placeholder="Email (optionnel)"
                  {...register("client_email")}
                />
                {errors.client_email && (
                  <p className="text-sm text-destructive">{errors.client_email.message}</p>
                )}
              </div>
            ) : (
              <Select
                value={selectedClientId || ""}
                onValueChange={(value) => setValue("client_id", value)}
              >
                <SelectTrigger id="client-select">
                  <SelectValue placeholder="Sélectionner un client" />
                </SelectTrigger>
                <SelectContent>
                  {clients?.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Montant estimé */}
          <div className="space-y-2">
            <Label htmlFor="estimated-cost">Montant estimé (€)</Label>
            <Input
              id="estimated-cost"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register("estimated_cost")}
            />
            {errors.estimated_cost && (
              <p className="text-sm text-destructive">{errors.estimated_cost.message}</p>
            )}
          </div>

          {/* Statut */}
          <div className="space-y-2">
            <Label htmlFor="status">Statut</Label>
            <Select
              value={watch("status")}
              onValueChange={(value: "draft" | "sent" | "accepted" | "rejected" | "expired") =>
                setValue("status", value)
              }
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Brouillon</SelectItem>
                <SelectItem value="sent">Envoyé</SelectItem>
                <SelectItem value="accepted">Accepté</SelectItem>
                <SelectItem value="rejected">Refusé</SelectItem>
                <SelectItem value="expired">Expiré</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description (optionnel) */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optionnel)</Label>
            <Textarea
              id="description"
              placeholder="Description du devis..."
              {...register("description")}
              rows={3}
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
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Créer
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};















