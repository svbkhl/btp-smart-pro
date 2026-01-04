/**
 * Timeline visuelle du workflow d'un devis
 * Affiche les étapes : Création → Envoi → Signature → Paiement
 */

import { CheckCircle2, Circle, Clock, Send, FileText, DollarSign, Award } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuoteTimelineProps {
  quote: {
    created_at: string;
    sent_at?: string | null;
    signed?: boolean;
    signed_at?: string | null;
    status?: string;
    payment_status?: 'pending' | 'partially_paid' | 'paid' | null;
  };
  className?: string;
}

interface TimelineStep {
  id: string;
  label: string;
  icon: typeof FileText;
  completed: boolean;
  date?: string | null;
  current?: boolean;
}

export default function QuoteTimeline({ quote, className }: QuoteTimelineProps) {
  const steps: TimelineStep[] = [
    {
      id: 'created',
      label: 'Devis créé',
      icon: FileText,
      completed: true,
      date: quote.created_at,
    },
    {
      id: 'sent',
      label: 'Envoyé au client',
      icon: Send,
      completed: !!quote.sent_at,
      date: quote.sent_at,
      current: !!quote.sent_at && !quote.signed,
    },
    {
      id: 'signed',
      label: 'Signé électroniquement',
      icon: Award,
      completed: !!quote.signed,
      date: quote.signed_at,
      current: !!quote.signed && quote.payment_status === 'pending',
    },
    {
      id: 'paid',
      label: quote.payment_status === 'partially_paid' ? 'Acompte reçu' : 'Paiement reçu',
      icon: DollarSign,
      completed: quote.payment_status === 'paid' || quote.payment_status === 'partially_paid',
      current: quote.payment_status === 'paid',
    },
  ];

  return (
    <div className={cn("space-y-4", className)}>
      <h4 className="text-sm font-semibold text-muted-foreground mb-4">Suivi du devis</h4>
      
      <div className="relative">
        {/* Ligne verticale de connexion */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

        <div className="space-y-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isLast = index === steps.length - 1;

            return (
              <div key={step.id} className="relative flex items-start gap-4">
                {/* Icône */}
                <div 
                  className={cn(
                    "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2",
                    step.completed
                      ? "border-primary bg-primary text-primary-foreground"
                      : step.current
                      ? "border-primary bg-background text-primary animate-pulse"
                      : "border-muted bg-background text-muted-foreground"
                  )}
                >
                  {step.completed ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : step.current ? (
                    <Clock className="h-4 w-4" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                </div>

                {/* Contenu */}
                <div className="flex-1 pt-0.5">
                  <div className="flex items-center justify-between">
                    <p 
                      className={cn(
                        "text-sm font-medium",
                        step.completed || step.current
                          ? "text-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      {step.label}
                    </p>
                    {step.date && (
                      <p className="text-xs text-muted-foreground">
                        {new Date(step.date).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    )}
                  </div>

                  {step.current && !step.completed && (
                    <p className="text-xs text-muted-foreground mt-1">
                      En attente...
                    </p>
                  )}

                  {step.completed && step.id === 'signed' && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Signature électronique valide</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Prochaine étape */}
      {!steps[steps.length - 1].completed && (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-xs font-medium text-blue-900 dark:text-blue-100">
            {quote.signed && quote.payment_status === 'pending' && (
              <>📧 Prochaine étape : Envoyer le lien de paiement au client</>
            )}
            {quote.sent_at && !quote.signed && (
              <>⏳ En attente de signature du client</>
            )}
            {!quote.sent_at && (
              <>📤 Prochaine étape : Envoyer le devis au client</>
            )}
          </p>
        </div>
      )}
    </div>
  );
}



