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
import { useCompanySettings, useUpdateCompanySettings } from "@/hooks/useCompanySettings";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QuoteLinesEditor } from "./QuoteLinesEditor";

const quoteSchema = z.object({
  client_name: z.string().min(1, "Le nom du client est requis"),
  estimated_cost: z.string().min(1, "Le montant est requis"),
  status: z.enum(["draft", "sent", "accepted", "rejected", "expired"]),
  mode: z.enum(["simple", "detailed"]).optional(),
  tva_rate: z.number().min(0).max(1).optional(),
});

type QuoteFormData = z.infer<typeof quoteSchema>;

interface EditQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: Quote | null;
}

export const EditQuoteDialog = ({ open, onOpenChange, quote }: EditQuoteDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const updateQuote = useUpdateQuote();
  const { data: companySettings } = useCompanySettings();
  const updateCompanySettings = useUpdateCompanySettings();

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
      mode: "simple",
      tva_rate: 0.20,
    },
  });

  useEffect(() => {
    if (quote) {
      reset({
        client_name: quote.client_name,
        estimated_cost: quote.estimated_cost.toString(),
        status: quote.status,
        mode: quote.mode || "simple",
        tva_rate: quote.tva_rate ?? companySettings?.default_quote_tva_rate ?? 0.20,
      });
    }
  }, [quote, reset, companySettings]);

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
        mode: data.mode,
        tva_rate: data.tva_rate,
      });

      // Persister les préférences company si mode ou TVA changent
      if (data.mode || data.tva_rate !== undefined) {
        try {
          await updateCompanySettings.mutateAsync({
            default_quote_mode: data.mode,
            default_quote_tva_rate: data.tva_rate,
          });
        } catch (error) {
          console.error("Error updating company settings:", error);
        }
      }

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
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le devis</DialogTitle>
          <DialogDescription>
            Modifiez les informations du devis
          </DialogDescription>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">Informations générales</TabsTrigger>
            {quote?.mode === "detailed" && (
              <TabsTrigger value="lines">Lignes détaillées</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="general">
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

          <div className="space-y-2">
            <Label htmlFor="mode">Mode du devis</Label>
            <Select
              value={watch("mode") || "simple"}
              onValueChange={(value) => setValue("mode", value as "simple" | "detailed")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="simple">Simplifié</SelectItem>
                <SelectItem value="detailed">Détaillé</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tva_rate">Taux de TVA (%)</Label>
            <div className="flex items-center gap-2">
              <Select
                value={(watch("tva_rate") ?? 0.20).toString()}
                onValueChange={(value) => setValue("tva_rate", parseFloat(value))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0%</SelectItem>
                  <SelectItem value="0.055">5.5%</SelectItem>
                  <SelectItem value="0.10">10%</SelectItem>
                  <SelectItem value="0.20">20%</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={((watch("tva_rate") ?? 0.20) * 100).toFixed(2)}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value) && value >= 0 && value <= 100) {
                    setValue("tva_rate", value / 100);
                  }
                }}
                className="w-24"
                placeholder="Taux personnalisé"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
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
          </TabsContent>

          {quote?.mode === "detailed" && (
            <TabsContent value="lines">
              <QuoteLinesEditor
                quoteId={quote.id}
                tvaRate={watch("tva_rate") ?? quote.tva_rate ?? 0.20}
              />
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};



