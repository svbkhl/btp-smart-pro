import { useState, useEffect, useRef, useCallback } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Save, Mail } from "lucide-react";
import { useReminderTemplates, useUpsertReminderTemplate } from "@/hooks/usePaymentReminders";
import { motion } from "framer-motion";
import type { ReminderTemplate } from "@/types/reminders";

const LEVEL_LABELS: Record<1 | 2 | 3, string> = {
  1: "Relance 1 — Premier rappel",
  2: "Relance 2 — Rappel renforcé",
  3: "Relance 3 — Mise en demeure",
};

const DEFAULT_TEMPLATES: Record<1 | 2 | 3, { subject: string; body: string }> = {
  1: {
    subject: "Rappel – Facture {{invoice_number}} – {{amount}}€",
    body: `Bonjour {{client_name}},

Nous vous remercions pour votre confiance.

Rappel de paiement

• Facture : {{invoice_number}}
• Montant : {{amount}}€
• Échéance : {{due_date}}
• Retard : {{days_overdue}} jour(s)

Nous n'avons pas encore reçu le règlement de cette facture. S'il s'agit d'un oubli, merci de régulariser votre situation au plus tôt.

Si le paiement a déjà été effectué, veuillez ignorer ce message.

Cordialement,`,
  },
  2: {
    subject: "URGENT – Facture {{invoice_number}} impayée – {{amount}}€",
    body: `Bonjour {{client_name}},

Nous vous avons adressé un premier rappel concernant la facture {{invoice_number}}.

État du dossier

• Montant dû : {{amount}}€
• Échéance : {{due_date}}
• Retard actuel : {{days_overdue}} jour(s)

Malgré ce rappel, cette facture demeure impayée. Nous vous demandons de régulariser votre situation sous 7 jours.

En cas de difficulté, contactez-nous sans délai afin de trouver une solution amiable.

Cordialement,`,
  },
  3: {
    subject: "Mise en demeure – Facture {{invoice_number}} – {{amount}}€",
    body: `Bonjour {{client_name}},

Malgré nos relances successives, la facture {{invoice_number}} demeure impayée.

Récapitulatif

• Montant : {{amount}}€
• Échéance : {{due_date}}
• Retard : {{days_overdue}} jour(s)

Nous vous adressons une mise en demeure formelle de régler ce montant sous 8 jours à compter de la réception de ce courrier.

Passé ce délai, nous serons contraints d'entamer une procédure de recouvrement contentieux.

Nous restons à votre disposition pour toute régularisation avant cette échéance.

Cordialement,`,
  },
};

// En base et à l'envoi on utilise {{...}} ; dans l'interface on affiche [Libellé] pour ne pas montrer les parenthèses techniques
const STORAGE_TO_DISPLAY: [string, string][] = [
  ["{{client_name}}", "[Nom du client]"],
  ["{{invoice_number}}", "[Numéro de facture]"],
  ["{{amount}}", "[Montant]"],
  ["{{due_date}}", "[Date d'échéance]"],
  ["{{days_overdue}}", "[Jours de retard]"],
];
const DISPLAY_TO_STORAGE: [string, string][] = STORAGE_TO_DISPLAY.map(([a, b]) => [b, a]);

function storageToDisplay(text: string): string {
  let out = text;
  for (const [from, to] of STORAGE_TO_DISPLAY) out = out.split(from).join(to);
  return out;
}
function displayToStorage(text: string): string {
  let out = text;
  for (const [from, to] of DISPLAY_TO_STORAGE) out = out.split(from).join(to);
  return out;
}

const VARIABLE_BUTTONS: { label: string; displayValue: string }[] = [
  { label: "Nom du client", displayValue: "[Nom du client]" },
  { label: "Numéro de facture", displayValue: "[Numéro de facture]" },
  { label: "Montant", displayValue: "[Montant]" },
  { label: "Date d'échéance", displayValue: "[Date d'échéance]" },
  { label: "Jours de retard", displayValue: "[Jours de retard]" },
];

export const RelanceTemplatesSettings = () => {
  const { toast } = useToast();
  const { data: templates = [], isLoading } = useReminderTemplates();
  const upsert = useUpsertReminderTemplate();

  const subjectRefs = useRef<Record<1 | 2 | 3, HTMLInputElement | null>>({ 1: null, 2: null, 3: null });
  const bodyRefs = useRef<Record<1 | 2 | 3, HTMLTextAreaElement | null>>({ 1: null, 2: null, 3: null });

  const [edits, setEdits] = useState<Record<1 | 2 | 3, { subject: string; body: string; is_active: boolean }>>({
    1: { subject: "", body: "", is_active: true },
    2: { subject: "", body: "", is_active: true },
    3: { subject: "", body: "", is_active: true },
  });

  const insertVariable = useCallback(
    (level: 1 | 2 | 3, field: "subject" | "body", displayValue: string) => {
      const inputEl = field === "subject" ? subjectRefs.current[level] : bodyRefs.current[level];

      setEdits((e) => {
        const currentValue = e[level][field];
        if (inputEl) {
          const start = inputEl.selectionStart ?? currentValue.length;
          const end = inputEl.selectionEnd ?? currentValue.length;
          const newValue = currentValue.slice(0, start) + displayValue + currentValue.slice(end);

          requestAnimationFrame(() => {
            inputEl.focus();
            const newPos = start + displayValue.length;
            inputEl.setSelectionRange(newPos, newPos);
          });

          return { ...e, [level]: { ...e[level], [field]: newValue } };
        }
        return { ...e, [level]: { ...e[level], [field]: currentValue + displayValue } };
      });
    },
    []
  );

  useEffect(() => {
    const next = { ...edits };
    ([1, 2, 3] as const).forEach((level) => {
      const t = templates.find((x: ReminderTemplate) => x.reminder_level === level);
      const rawSubject = t ? t.subject : DEFAULT_TEMPLATES[level].subject;
      const rawBody = t ? t.body : DEFAULT_TEMPLATES[level].body;
      next[level] = {
        subject: storageToDisplay(rawSubject),
        body: storageToDisplay(rawBody),
        is_active: t?.is_active ?? true,
      };
    });
    setEdits(next);
  }, [templates]);

  const handleSave = async (level: 1 | 2 | 3) => {
    try {
      const t = templates.find((x: ReminderTemplate) => x.reminder_level === level);
      const payload = {
        id: t?.id,
        reminder_level: level,
        subject: displayToStorage(edits[level].subject),
        body: displayToStorage(edits[level].body),
        is_active: edits[level].is_active,
      };
      await upsert.mutateAsync(payload);
      toast({ title: "Enregistré", description: `Niveau ${level} enregistré.` });
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer le modèle.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <GlassCard className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </GlassCard>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <GlassCard className="p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <Mail className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-semibold">Modèles de relances</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Modifiez les modèles d’emails de relance (niveaux 1, 2 et 3) envoyés aux clients pour les factures impayées.
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mb-6">
          Cliquez dans l’objet ou le corps du message, puis sur les boutons pour insérer les variables dynamiques.
        </p>

        <div className="space-y-6">
          {([1, 2, 3] as const).map((level) => (
            <div
              key={level}
              className="rounded-lg border border-border/40 bg-background/50 p-4 space-y-4"
            >
              <div className="flex items-center justify-between gap-4">
                <h3 className="font-semibold">{LEVEL_LABELS[level]}</h3>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`active-${level}`} className="text-sm text-muted-foreground">Actif</Label>
                  <Switch
                    id={`active-${level}`}
                    checked={edits[level].is_active}
                    onCheckedChange={(checked) =>
                      setEdits((e) => ({ ...e, [level]: { ...e[level], is_active: checked } }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`subject-${level}`}>Objet de l’email</Label>
                <Input
                  ref={(el) => { subjectRefs.current[level] = el; }}
                  id={`subject-${level}`}
                  value={edits[level].subject}
                  onChange={(e) =>
                    setEdits((e) => ({ ...e, [level]: { ...e[level], subject: e.target.value } }))
                  }
                  placeholder="Ex : Rappel de paiement - Facture impayée"
                  className="rounded-lg"
                />
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Insérer :</span>
                  {VARIABLE_BUTTONS.map(({ label, displayValue }) => (
                    <button
                      key={displayValue}
                      type="button"
                      onClick={() => insertVariable(level, "subject", displayValue)}
                      className="inline-flex items-center px-2.5 py-1 text-xs rounded-md bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`body-${level}`}>Corps du message</Label>
                <Textarea
                  ref={(el) => { bodyRefs.current[level] = el; }}
                  id={`body-${level}`}
                  value={edits[level].body}
                  onChange={(e) =>
                    setEdits((e) => ({ ...e, [level]: { ...e[level], body: e.target.value } }))
                  }
                  rows={10}
                  className="rounded-lg text-sm"
                  placeholder="Cliquez dans le texte puis utilisez les boutons pour insérer des variables."
                />
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Insérer :</span>
                  {VARIABLE_BUTTONS.map(({ label, displayValue }) => (
                    <button
                      key={displayValue}
                      type="button"
                      onClick={() => insertVariable(level, "body", displayValue)}
                      className="inline-flex items-center px-2.5 py-1 text-xs rounded-md bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <Button
                onClick={() => handleSave(level)}
                disabled={upsert.isPending}
                className="gap-2 rounded-xl"
              >
                {upsert.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Enregistrer le niveau {level}
              </Button>
            </div>
          ))}
        </div>
      </GlassCard>
    </motion.div>
  );
};
