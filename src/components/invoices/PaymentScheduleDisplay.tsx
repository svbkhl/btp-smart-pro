/**
 * Composant: PaymentScheduleDisplay
 * 
 * Affiche l'échéancier d'une facture (paiement en plusieurs fois)
 * 
 * Features:
 * - Liste toutes les échéances
 * - Statut de chaque échéance
 * - Bouton pour envoyer le lien de l'échéance suivante
 * - Empêche l'envoi si l'échéance précédente n'est pas payée
 */

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, CheckCircle2, Clock, Send, XCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface PaymentScheduleDisplayProps {
  invoiceId: string;
  onScheduleUpdate?: () => void;
}

export default function PaymentScheduleDisplay({ 
  invoiceId,
  onScheduleUpdate 
}: PaymentScheduleDisplayProps) {
  const { toast } = useToast();
  const [sendingScheduleId, setSendingScheduleId] = useState<string | null>(null);

  // Charger les échéances
  const { data: schedules, isLoading, refetch } = useQuery({
    queryKey: ['payment-schedules', invoiceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_schedules')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('installment_number', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!invoiceId,
  });

  const handleSendPaymentLink = async (scheduleId: string, installmentNumber: number) => {
    setSendingScheduleId(scheduleId);

    try {
      // Appeler l'Edge Function pour générer le lien de cette échéance
      const { data, error } = await supabase.functions.invoke("create-payment-link-v2", {
        body: {
          invoice_id: invoiceId,
          payment_type: 'installments',
          schedule_id: scheduleId,
        },
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || "Erreur lors de la génération du lien");
      }

      // Copier le lien dans le presse-papiers
      if (data.payment_link && navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(data.payment_link);
          toast({
            title: "✅ Lien copié !",
            description: `Le lien pour l'échéance ${installmentNumber} a été copié.`,
          });
        } catch (clipboardError) {
          console.warn("Impossible de copier dans le presse-papiers:", clipboardError);
        }
      }

      toast({
        title: "✅ Lien de paiement créé !",
        description: `Lien pour l'échéance ${installmentNumber} généré.`,
        duration: 5000,
      });

      refetch();
      onScheduleUpdate?.();
    } catch (error: any) {
      console.error("Erreur:", error);
      toast({
        title: "❌ Erreur",
        description: error.message || "Impossible de créer le lien de paiement",
        variant: "destructive",
      });
    } finally {
      setSendingScheduleId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">Chargement de l'échéancier...</p>
        </CardContent>
      </Card>
    );
  }

  if (!schedules || schedules.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          Échéancier de Paiement
        </CardTitle>
        <CardDescription>
          Paiement en {schedules.length}x - Échéances espacées de 30 jours
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {schedules.map((schedule) => (
            <div
              key={schedule.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors"
            >
              {/* Infos échéance */}
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    Échéance {schedule.installment_number}/{schedule.total_installments}
                  </span>
                  <Badge variant={getStatusVariant(schedule.status)}>
                    {getStatusLabel(schedule.status)}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {schedule.amount.toLocaleString("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                    })}
                  </span>
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    Échéance : {new Date(schedule.due_date).toLocaleDateString("fr-FR")}
                  </span>
                  {schedule.paid_at && (
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle2 className="h-3 w-3" />
                      Payé le {new Date(schedule.paid_at).toLocaleDateString("fr-FR")}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {schedule.status === 'pending' && !schedule.payment_link && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSendPaymentLink(schedule.id, schedule.installment_number)}
                    disabled={!!sendingScheduleId}
                  >
                    <Send className="mr-2 h-3 w-3" />
                    Envoyer lien
                  </Button>
                )}
                {schedule.status === 'processing' && schedule.payment_link && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (schedule.payment_link) {
                        navigator.clipboard.writeText(schedule.payment_link);
                        toast({
                          title: "✅ Lien copié !",
                          description: "Le lien a été copié dans le presse-papiers.",
                        });
                      }
                    }}
                  >
                    Copier lien
                  </Button>
                )}
                {schedule.status === 'paid' && (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Résumé */}
        <div className="mt-4 p-4 bg-muted/30 rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Échéances payées :</span>
            <span className="font-medium">
              {schedules.filter(s => s.status === 'paid').length} / {schedules.length}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Montant total payé :</span>
            <span className="font-medium text-green-600">
              {schedules
                .filter(s => s.status === 'paid')
                .reduce((sum, s) => sum + s.amount, 0)
                .toLocaleString("fr-FR", {
                  style: "currency",
                  currency: "EUR",
                })}
            </span>
          </div>
          <div className="flex justify-between text-sm pt-2 border-t border-border/50">
            <span className="text-muted-foreground">Montant restant :</span>
            <span className="font-bold text-primary">
              {schedules
                .filter(s => s.status !== 'paid')
                .reduce((sum, s) => sum + s.amount, 0)
                .toLocaleString("fr-FR", {
                  style: "currency",
                  currency: "EUR",
                })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Helpers
function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case 'paid':
      return 'default';
    case 'pending':
      return 'secondary';
    case 'processing':
      return 'outline';
    case 'overdue':
      return 'destructive';
    default:
      return 'secondary';
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'paid':
      return 'Payé';
    case 'pending':
      return 'En attente';
    case 'processing':
      return 'En cours';
    case 'overdue':
      return 'En retard';
    case 'cancelled':
      return 'Annulé';
    default:
      return status;
  }
}

