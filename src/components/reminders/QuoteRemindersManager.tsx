import { useState } from "react";
import { Send, AlertCircle, CheckCircle, Clock, FileText, TrendingUp } from "lucide-react";
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
import {
  usePendingQuotesForReminder,
  useSendQuoteReminder,
  useQuoteReminderStats,
  useRecommendedQuoteReminderLevel,
} from "@/hooks/useQuoteReminders";
import type { PendingQuote } from "@/types/reminders";

export const QuoteRemindersManager = () => {
  const { data: pendingQuotes = [], isLoading } = usePendingQuotesForReminder();
  const sendReminder = useSendQuoteReminder();
  const stats = useQuoteReminderStats();

  const [selectedQuote, setSelectedQuote] = useState<PendingQuote | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<1 | 2 | 3>(1);

  const handleSendReminder = () => {
    if (!selectedQuote) return;

    sendReminder.mutate(
      { quoteId: selectedQuote.id, reminderLevel: selectedLevel },
      {
        onSuccess: () => {
          setSelectedQuote(null);
        },
      }
    );
  };

  const openReminderDialog = (quote: PendingQuote) => {
    setSelectedQuote(quote);
    setSelectedLevel(useRecommendedQuoteReminderLevel(quote).recommendedLevel);
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Devis en attente</CardTitle>
            <FileText className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_pending}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total_amount.toFixed(2)}€ au total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">J+3 à J+6</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.level_1_count}</div>
            <p className="text-xs text-muted-foreground">Premier rappel possible</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">J+7 à J+13</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.level_2_count}</div>
            <p className="text-xs text-muted-foreground">Rappel de suivi</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">J+14+</CardTitle>
            <TrendingUp className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.level_3_count}</div>
            <p className="text-xs text-muted-foreground">Dernier rappel</p>
          </CardContent>
        </Card>
      </div>

      {/* Alert si aucun devis en attente */}
      {pendingQuotes.length === 0 && !isLoading && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Aucun devis en attente de relance. Tous les devis envoyés ont été signés ou sont encore récents !
          </AlertDescription>
        </Alert>
      )}

      {/* Table des devis en attente */}
      {pendingQuotes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Devis en attente de signature</CardTitle>
            <CardDescription>
              Relancez les clients pour les devis envoyés mais non signés
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Devis</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Envoyé le</TableHead>
                  <TableHead>Jours</TableHead>
                  <TableHead>Relances</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingQuotes.map((quote) => {
                  const { recommendedLevel, reason } = useRecommendedQuoteReminderLevel(quote);

                  return (
                    <TableRow key={quote.id}>
                      <TableCell className="font-medium">{quote.quote_number || "—"}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{quote.client_name || "N/A"}</div>
                          <div className="text-xs text-muted-foreground">
                            {quote.client_email || "Email manquant"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {(quote.amount_ttc ?? 0).toFixed(2)}€
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(quote.sent_at_quote).toLocaleDateString("fr-FR")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            quote.days_since_sent >= 14
                              ? "destructive"
                              : quote.days_since_sent >= 7
                              ? "default"
                              : "secondary"
                          }
                        >
                          +{quote.days_since_sent}j
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {quote.reminder_count > 0 ? (
                          <div className="text-sm">
                            <div>{quote.reminder_count} envoyée(s)</div>
                            {quote.last_reminder_sent_at && (
                              <div className="text-xs text-muted-foreground">
                                Dernier:{" "}
                                {new Date(quote.last_reminder_sent_at).toLocaleDateString("fr-FR")}
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
                          onClick={() => openReminderDialog(quote)}
                          disabled={!quote.client_email}
                        >
                          <Send className="h-3 w-3 mr-1" />
                          Relancer
                        </Button>
                        {!quote.client_email && (
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
      <Dialog open={!!selectedQuote} onOpenChange={(open) => !open && setSelectedQuote(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Envoyer une relance de devis</DialogTitle>
            <DialogDescription>
              Devis {selectedQuote?.quote_number} — {selectedQuote?.client_name}
            </DialogDescription>
          </DialogHeader>

          {selectedQuote && (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {useRecommendedQuoteReminderLevel(selectedQuote).reason}
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <label className="text-sm font-medium">Niveau de relance</label>
                <div className="flex gap-2">
                  {([1, 2, 3] as const).map((level) => (
                    <Button
                      key={level}
                      variant={selectedLevel === level ? "default" : "outline"}
                      onClick={() => setSelectedLevel(level)}
                      className="flex-1"
                    >
                      Niveau {level}
                      <br />
                      <span className="text-xs">
                        {level === 1
                          ? "Premier rappel"
                          : level === 2
                          ? "Rappel de suivi"
                          : "Dernier rappel"}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>

              <div className="rounded-md bg-muted p-4 text-sm">
                <div className="font-medium mb-2">Détails</div>
                <div className="space-y-1 text-muted-foreground">
                  <div>Montant : {(selectedQuote.amount_ttc ?? 0).toFixed(2)}€</div>
                  <div>Envoyé il y a : {selectedQuote.days_since_sent} jours</div>
                  <div>Destinataire : {selectedQuote.client_email || "—"}</div>
                  <div>Relances précédentes : {selectedQuote.reminder_count}</div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedQuote(null)}>
              Annuler
            </Button>
            <Button onClick={handleSendReminder} disabled={sendReminder.isPending}>
              {sendReminder.isPending ? "Envoi…" : "Envoyer la relance"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
