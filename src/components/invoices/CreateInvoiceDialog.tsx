import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
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
import { useCreateInvoice, CreateInvoiceData } from "@/hooks/useInvoices";
import { useClients, useCreateClient } from "@/hooks/useClients";
import { useQuotes } from "@/hooks/useQuotes";
import { Loader2, Plus } from "lucide-react";
import { calculateFromTTC } from "@/utils/priceCalculations";
import { useToast } from "@/hooks/use-toast";

const invoiceSchema = z.object({
  client_id: z.string().optional(),
  client_name: z.string().min(1, "Le nom du client est requis"),
  client_email: z.string().email("Email invalide").optional().or(z.literal("")),
  client_address: z.string().optional(),
  quote_id: z.string().optional(),
  description: z.string().min(1, "La description est requise"),
  amount_ht: z.string().optional(),
  vat_rate: z.string().optional(),
  due_date: z.string().optional(),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface CreateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteId?: string;
}

export const CreateInvoiceDialog = ({ open, onOpenChange, quoteId }: CreateInvoiceDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNewClient, setIsNewClient] = useState(false);
  const navigate = useNavigate();
  const createInvoice = useCreateInvoice();
  const { data: clients } = useClients();
  const { data: quotes } = useQuotes();
  const createClient = useCreateClient();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      client_id: "",
      client_name: "",
      client_email: "",
      client_address: "",
      quote_id: "",
      description: "",
      amount_ht: "",
      vat_rate: "20",
      due_date: "",
    },
  });

  const selectedClientId = watch("client_id");
  const amountHt = watch("amount_ht");
  const vatRate = watch("vat_rate");
  const selectedQuoteId = watch("quote_id");

  // Charger les données du devis si quoteId est fourni
  useEffect(() => {
    if (quoteId && quotes) {
      const quote = quotes.find((q) => q.id === quoteId);
      if (quote) {
        setValue("quote_id", quoteId);
        setValue("client_name", quote.client_name);
        setValue("description", `Facture pour ${quote.client_name}`);
        setValue("amount_ttc", quote.estimated_cost.toString());
      }
    }
  }, [quoteId, quotes, setValue]);

  const onSubmit = async (data: InvoiceFormData) => {
    // Validation: vérifier qu'on a un montant TTC
    if (!data.amount_ttc || parseFloat(data.amount_ttc) <= 0) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un montant TTC valide",
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
            location: data.client_address || undefined,
          });
          finalClientId = newClient.id;
        } catch (error) {
          console.error("Error creating client:", error);
          toast({
            title: "Erreur",
            description: "Impossible de créer le client",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
      }

      // Calculer HT et TVA à partir du TTC (MODE TTC FIRST)
      const ttcAmount = parseFloat(data.amount_ttc);
      const vatRateValue = parseFloat(data.vat_rate || "20");
      const prices = calculateFromTTC(ttcAmount, vatRateValue);

      // Préparer les données de la facture
      const invoiceData: CreateInvoiceData = {
        client_id: finalClientId || undefined,
        client_name: data.client_name,
        client_email: data.client_email || undefined,
        client_address: data.client_address || undefined,
        quote_id: data.quote_id || undefined,
        description: data.description,
        amount_ht: prices.total_ht,  // HT calculé à partir du TTC
        vat_rate: vatRateValue,
        due_date: data.due_date || undefined,
      };

      await createInvoice.mutateAsync(invoiceData);
      
      toast({
        title: "Facture créée",
        description: "La facture a été créée avec succès",
      });

      onOpenChange(false);
      reset();
      setIsNewClient(false);
    } catch (error: any) {
      console.error("Error creating invoice:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la facture",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvelle facture</DialogTitle>
          <DialogDescription>
            Créez une nouvelle facture pour votre client
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Client */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isNewClient"
                checked={isNewClient}
                onChange={(e) => setIsNewClient(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="isNewClient" className="cursor-pointer">
                Créer un nouveau client
              </Label>
            </div>

            {!isNewClient ? (
              <div className="space-y-2">
                <Label htmlFor="client_id">
                  Client existant <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={selectedClientId || ""}
                  onValueChange={(value) => {
                    if (value === "new") {
                      navigate("/clients?action=create");
                      onOpenChange(false);
                    } else {
                      setValue("client_id", value);
                      const client = clients?.find((c) => c.id === value);
                      if (client) {
                        setValue("client_name", client.name);
                        setValue("client_email", client.email || "");
                        setValue("client_address", client.location || "");
                      }
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un client" />
                  </SelectTrigger>
                  <SelectContent>
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
                {errors.client_name && !selectedClientId && (
                  <p className="text-sm text-red-500">Veuillez sélectionner un client</p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client_name">
                    Nom du client <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="client_name"
                    {...register("client_name")}
                    placeholder="M. Martin"
                  />
                  {errors.client_name && (
                    <p className="text-sm text-red-500">{errors.client_name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client_email">Email</Label>
                  <Input
                    id="client_email"
                    type="email"
                    {...register("client_email")}
                    placeholder="client@example.com"
                  />
                </div>
              </div>
            )}

            {isNewClient && (
              <div className="space-y-2">
                <Label htmlFor="client_address">Adresse</Label>
                <Input
                  id="client_address"
                  {...register("client_address")}
                  placeholder="123 Rue Example, 75001 Paris"
                />
              </div>
            )}
          </div>

          {/* Devis associé */}
          {quotes && quotes.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="quote_id">Devis associé (optionnel)</Label>
              <Select
                value={selectedQuoteId || ""}
                onValueChange={(value) => setValue("quote_id", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un devis" />
                </SelectTrigger>
                <SelectContent>
                  {quotes.map((quote) => (
                    <SelectItem key={quote.id} value={quote.id}>
                      {quote.quote_number} - {quote.client_name} ({quote.estimated_cost}€)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Description des travaux <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Décrivez les travaux effectués..."
              rows={3}
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description.message}</p>
            )}
          </div>

          {/* Montant TTC */}
          <div className="space-y-2">
            <Label htmlFor="amount_ttc">
              Montant TTC (€) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="amount_ttc"
              type="number"
              step="0.01"
              {...register("amount_ttc")}
              placeholder="0.00"
              className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            {errors.amount_ttc && (
              <p className="text-sm text-red-500">{errors.amount_ttc.message}</p>
            )}
          </div>

          {/* TVA et Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vat_rate">Taux de TVA (%)</Label>
              <Select
                value={watch("vat_rate") || "20"}
                onValueChange={(value) => setValue("vat_rate", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0%</SelectItem>
                  <SelectItem value="5.5">5.5%</SelectItem>
                  <SelectItem value="10">10%</SelectItem>
                  <SelectItem value="20">20%</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">Date d'échéance</Label>
              <Input
                id="due_date"
                type="date"
                {...register("due_date")}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                reset();
                setIsNewClient(false);
              }}
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
                "Créer la facture"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};



