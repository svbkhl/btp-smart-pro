import { useState } from "react";
import { Send, AlertCircle, CheckCircle, Clock, DollarSign, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useOverdueInvoices, useSendReminder, useReminderStats, useRecommendedReminderLevel } from "@/hooks/usePaymentReminders";
import type { OverdueInvoice } from "@/types/reminders";

export const PaymentRemindersManager = () => {
  const { data: overdueInvoices = [], isLoading } = useOverdueInvoices();
  const sendReminder = useSendReminder();
  const stats = useReminderStats();
  
  const [selectedInvoice, setSelectedInvoice] = useState<OverdueInvoice | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<1 | 2 | 3>(1);

  const handleSendReminder = () => {
    if (!selectedInvoice) return;

    sendReminder.mutate(
      { invoiceId: selectedInvoice.id, reminderLevel: selectedLevel },
      {
        onSuccess: () => {
          setSelectedInvoice(null);
        },
      }
    );
  };

  const openReminderDialog = (invoice: OverdueInvoice) => {
    setSelectedInvoice(invoice);
    const { recommendedLevel } = useRecommendedReminderLevel(invoice);
    setSelectedLevel(recommendedLevel);
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Factures impayées</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_overdue}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total_amount_overdue.toFixed(2)}€ au total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">J+7 à J+14</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.level_1_count}</div>
            <p className="text-xs text-muted-foreground">
              Premier rappel à envoyer
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">J+15 à J+29</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.level_2_count}</div>
            <p className="text-xs text-muted-foreground">
              Rappel urgent à envoyer
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">J+30+</CardTitle>
            <TrendingUp className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.level_3_count}</div>
            <p className="text-xs text-muted-foreground">
              Mise en demeure à envoyer
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alert si aucune facture impayée */}
      {overdueInvoices.length === 0 && !isLoading && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Aucune facture en retard de paiement. Tous vos clients sont à jour ! 🎉
          </AlertDescription>
        </Alert>
      )}

      {/* Table des factures impayées */}
      {overdueInvoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Factures en retard</CardTitle>
            <CardDescription>
              Gérez les relances de paiement pour vos factures impayées
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Facture</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Date d'échéance</TableHead>
                  <TableHead>Retard</TableHead>
                  <TableHead>Relances</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overdueInvoices.map((invoice) => {
                  const { recommendedLevel, reason } = useRecommendedReminderLevel(invoice);
                  
                  return (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{invoice.client_name || 'N/A'}</div>
                          <div className="text-xs text-muted-foreground">{invoice.client_email || 'N/A'}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{invoice.amount_ttc?.toFixed(2)}€</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(invoice.due_date).toLocaleDateString('fr-FR')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            invoice.days_overdue >= 30
                              ? "destructive"
                              : invoice.days_overdue >= 15
                              ? "default"
                              : "secondary"
                          }
                        >
                          +{invoice.days_overdue}j
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {invoice.reminder_count > 0 ? (
                          <div className="text-sm">
                            <div>{invoice.reminder_count} envoyée(s)</div>
                            {invoice.last_reminder_sent_at && (
                              <div className="text-xs text-muted-foreground">
                                Dernier: {new Date(invoice.last_reminder_sent_at).toLocaleDateString('fr-FR')}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Aucune</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => openReminderDialog(invoice)}
                          disabled={!invoice.client_email}
                        >
                          <Send className="h-3 w-3 mr-1" />
                          Relancer
                        </Button>
                        {!invoice.client_email && (
                          <div className="text-xs text-red-500 mt-1">Email manquant</div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Dialog d'envoi de relance */}
      <Dialog open={!!selectedInvoice} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Envoyer une relance de paiement</DialogTitle>
            <DialogDescription>
              Facture {selectedInvoice?.invoice_number} - {selectedInvoice?.client_name}
            </DialogDescription>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {useRecommendedReminderLevel(selectedInvoice).reason}
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <label className="text-sm font-medium">Niveau de relance</label>
                <div className="flex gap-2">
                  {[1, 2, 3].map((level) => (
                    <Button
                      key={level}
                      variant={selectedLevel === level ? "default" : "outline"}
                      onClick={() => setSelectedLevel(level as 1 | 2 | 3)}
                      className="flex-1"
                    >
                      Niveau {level}
                      <br />
                      <span className="text-xs">
                        {level === 1 ? "Rappel" : level === 2 ? "Urgent" : "Mise en demeure"}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>

              <div className="rounded-md bg-muted p-4 text-sm">
                <div className="font-medium mb-2">Détails</div>
                <div className="space-y-1 text-muted-foreground">
                  <div>Montant : {selectedInvoice.amount_ttc?.toFixed(2)}€</div>
                  <div>Retard : {selectedInvoice.days_overdue} jours</div>
                  <div>Destinataire : {selectedInvoice.client_email}</div>
                  <div>Relances précédentes : {selectedInvoice.reminder_count}</div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedInvoice(null)}>
              Annuler
            </Button>
            <Button onClick={handleSendReminder} disabled={sendReminder.isPending}>
              {sendReminder.isPending ? "Envoi..." : "Envoyer la relance"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
