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
import { useUpdateQuote, Quote } from "@/hooks/useQuotes";
import { Loader2 } from "lucide-react";

const quoteSchema = z.object({
  client_name: z.string().min(1, "Le nom du client est requis"),
  estimated_cost: z.string().min(1, "Le montant est requis"),
  status: z.enum(["draft", "sent", "accepted", "rejected", "expired"]),
});

type QuoteFormData = z.infer<typeof quoteSchema>;

interface EditQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: Quote | null;
}

export const EditQuoteDialog = ({ open, onOpenChange, quote }: EditQuoteDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const updateQuote = useUpdateQuote();

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
      client_name: "",
      estimated_cost: "",
      status: "draft",
    },
  });

  useEffect(() => {
    if (quote) {
      reset({
        client_name: quote.client_name,
        estimated_cost: quote.estimated_cost.toString(),
        status: quote.status,
      });
    }
  }, [quote, reset]);

  const onSubmit = async (data: QuoteFormData) => {
    if (!quote) {
      alert("Aucun devis sélectionné");
      return;
    }

    console.log("Quote form submitted:", data);
    setIsSubmitting(true);
    try {
      await updateQuote.mutateAsync({
        id: quote.id,
        client_name: data.client_name,
        estimated_cost: parseFloat(data.estimated_cost),
        status: data.status,
      });
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating quote:", error);
      alert(`Erreur: ${error.message || "Impossible de modifier le devis"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le devis</DialogTitle>
          <DialogDescription>
            Modifiez les informations du devis
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
            <Label htmlFor="estimated_cost">
              Montant estimé <span className="text-red-500">*</span>
            </Label>
            <Input
              id="estimated_cost"
              type="number"
              step="0.01"
              {...register("estimated_cost")}
              placeholder="0.00"
            />
            {errors.estimated_cost && (
              <p className="text-sm text-red-500">{errors.estimated_cost.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Statut</Label>
            <Select
              value={watch("status")}
              onValueChange={(value) => setValue("status", value as Quote["status"])}
            >
              <SelectTrigger>
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

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                "Enregistrer"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};



