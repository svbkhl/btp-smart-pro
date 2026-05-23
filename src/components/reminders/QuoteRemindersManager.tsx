import { useState } from "react";
import { Send, AlertCircle, CheckCircle, Clock, FileText, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

// Separate component so useRecommendedQuoteReminderLevel is called at top level
const QuoteReminderRow = ({
  quote,
  onRelancer,
}: {
  quote: PendingQuote;
  onRelancer: (quote: PendingQuote, level: 1 | 2 | 3) => void;
}) => {
  const { recommendedLevel } = useRecommendedQuoteReminderLevel(quote);

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{quote.quote_number || "—"}</p>
          <p className="text-sm text-muted-foreground truncate">{quote.client_name || "N/A"}</p>
          {quote.client_email && (
            <p className="text-xs text-muted-foreground truncate">{quote.client_email}</p>
          )}
        </div>
        <Badge
          variant={
            quote.days_since_sent >= 14
              ? "destructive"
              : quote.days_since_sent >= 7
              ? "default"
              : "secondary"
          }
          className="shrink-0"
        >
          +{quote.days_since_sent}j
        </Badge>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <span className="font-medium">{(quote.amount_ttc ?? 0).toFixed(2)} €</span>
        <span className="text-muted-foreground">
          Envoyé le : {new Date(quote.sent_at_quote).toLocaleDateString("fr-FR")}
        </span>
        <span className="text-muted-foreground">
          {quote.reminder_count > 0
            ? `${quote.reminder_count} relance(s)`
            : "Aucune relance"}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => onRelancer(quote, recommendedLevel)}
          disabled={!quote.client_email}
          className="gap-2"
        >
          <Send className="h-3 w-3" />
          Relancer (Niv. {recommendedLevel})
        </Button>
        {!quote.client_email && (
          <span className="text-xs text-red-500">Email manquant</span>
        )}
      </div>
    </Card>
  );
};

// Separate component so useRecommendedQuoteReminderLevel is called at top level
const QuoteReminderDialog = ({
  quote,
  onClose,
}: {
  quote: PendingQuote;
  onClose: () => void;
}) => {
  const { recommendedLevel, reason } = useRecommendedQuoteReminderLevel(quote);
  const [selectedLevel, setSelectedLevel] = useState<1 | 2 | 3>(recommendedLevel);
  const sendReminder = useSendQuoteReminder();

  const handleSend = () => {
    sendReminder.mutate(
      { quoteId: quote.id, reminderLevel: selectedLevel },
      { onSuccess: onClose }
    );
  };

  return (
    <div className="space-y-4">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{reason}</AlertDescription>
      </Alert>

      <div className="space-y-2">
        <label className="text-sm font-medium">Niveau de relance</label>
        <div className="grid grid-cols-3 gap-2">
          {([1, 2, 3] as const).map((level) => (
            <Button
              key={level}
              variant={selectedLevel === level ? "default" : "outline"}
              onClick={() => setSelectedLevel(level)}
              className="flex flex-col h-auto py-2"
            >
              <span className="font-medium">Niveau {level}</span>
              <span className="text-xs opacity-80">
                {level === 1 ? "Premier rappel" : level === 2 ? "Rappel de suivi" : "Dernier rappel"}
              </span>
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-md bg-muted p-4 text-sm space-y-1">
        <div className="font-medium mb-2">Récapitulatif</div>
        <div className="text-muted-foreground">Montant : <strong>{(quote.amount_ttc ?? 0).toFixed(2)} €</strong></div>
        <div className="text-muted-foreground">En attente depuis : <strong>{quote.days_since_sent} jours</strong></div>
        <div className="text-muted-foreground">Destinataire : <strong>{quote.client_email || "—"}</strong></div>
        <div className="text-muted-foreground">Relances précédentes : <strong>{quote.reminder_count}</strong></div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Annuler</Button>
        <Button onClick={handleSend} disabled={sendReminder.isPending}>
          {sendReminder.isPending ? "Envoi..." : "Envoyer la relance"}
        </Button>
      </DialogFooter>
    </div>
  );
};

export const QuoteRemindersManager = () => {
  const { data: pendingQuotes = [], isLoading } = usePendingQuotesForReminder();
  const stats = useQuoteReminderStats();
  const [selectedQuote, setSelectedQuote] = useState<PendingQuote | null>(null);

  const handleRelancer = (quote: PendingQuote, level: 1 | 2 | 3) => {
    setSelectedQuote(quote);
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <FileText className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_pending}</div>
            <p className="text-xs text-muted-foreground">{stats.total_amount.toFixed(2)} €</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">J+3 → J+6</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.level_1_count}</div>
            <p className="text-xs text-muted-foreground">Premier rappel</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">J+7 → J+13</CardTitle>
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

      {/* Empty state */}
      {pendingQuotes.length === 0 && !isLoading && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Aucun devis en attente de relance. Tous les devis envoyés ont été signés ou sont encore récents !
          </AlertDescription>
        </Alert>
      )}

      {isLoading && (
        <div className="text-center py-8 text-muted-foreground">Chargement...</div>
      )}

      {/* Liste des devis */}
      {pendingQuotes.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-base">Devis en attente ({pendingQuotes.length})</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pendingQuotes.map((quote) => (
              <QuoteReminderRow
                key={quote.id}
                quote={quote}
                onRelancer={handleRelancer}
              />
            ))}
          </div>
        </div>
      )}

      {/* Dialog confirmation */}
      <Dialog open={!!selectedQuote} onOpenChange={(open) => !open && setSelectedQuote(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Envoyer une relance de devis</DialogTitle>
            <DialogDescription>
              Devis {selectedQuote?.quote_number} — {selectedQuote?.client_name}
            </DialogDescription>
          </DialogHeader>
          {selectedQuote && (
            <QuoteReminderDialog
              quote={selectedQuote}
              onClose={() => setSelectedQuote(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
