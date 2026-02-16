import { useState, useEffect, useRef, useCallback } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Save, Mail } from "lucide-react";
import { useQuoteReminderTemplates, useUpsertQuoteReminderTemplate } from "@/hooks/useQuoteReminders";
import { motion } from "framer-motion";
import type { QuoteReminderTemplate } from "@/types/reminders";

const LEVEL_LABELS: Record<1 | 2 | 3, string> = {
  1: "Relance 1 — Premier rappel",
  2: "Relance 2 — Rappel de suivi",
  3: "Relance 3 — Dernier rappel",
};

const DEFAULT_TEMPLATES: Record<1 | 2 | 3, { subject: string; body: string }> = {
  1: {
    subject: "Rappel : Devis {{quote_number}} en attente",
    body: `Bonjour {{client_name}},

Nous vous avons transmis notre devis {{quote_number}} d'un montant de {{amount}}€, envoyé il y a {{days_since_sent}} jours.

Nous restons à votre disposition pour toute question ou pour convenir d'un rendez-vous afin de finaliser ce projet.

Cordialement,`,
  },
  2: {
    subject: "Rappel : Devis {{quote_number}} — Suite à notre envoi",
    body: `Bonjour {{client_name}},

Nous revenons vers vous concernant notre devis {{quote_number}} ({{amount}}€), transmis il y a {{days_since_sent}} jours.

Avez-vous pu prendre connaissance de notre proposition ? Nous restons disponibles pour en discuter et répondre à vos questions.

Cordialement,`,
  },
  3: {
    subject: "Dernier rappel : Devis {{quote_number}}",
    body: `Bonjour {{client_name}},

Malgré nos précédents rappels, nous n'avons pas reçu de retour concernant notre devis {{quote_number}} ({{amount}}€), envoyé il y a {{days_since_sent}} jours.

Souhaitez-vous que nous maintenions cette proposition à disposition ou préférez-vous la laisser expirer ?

Nous restons à votre écoute.

Cordialement,`,
  },
};

// Variables pour relances DEVIS (pas factures)
const STORAGE_TO_DISPLAY: [string, string][] = [
  ["{{client_name}}", "[Nom du client]"],
  ["{{quote_number}}", "[Numéro de devis]"],
  ["{{amount}}", "[Montant]"],
  ["{{days_since_sent}}", "[Jours depuis envoi]"],
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
  { label: "Numéro de devis", displayValue: "[Numéro de devis]" },
  { label: "Montant", displayValue: "[Montant]" },
  { label: "Jours depuis envoi", displayValue: "[Jours depuis envoi]" },
];

export const RelanceTemplatesSettings = () => {
  const { toast } = useToast();
  const { data: templates = [], isLoading } = useQuoteReminderTemplates();
  const upsert = useUpsertQuoteReminderTemplate();

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
      const t = templates.find((x: QuoteReminderTemplate) => x.reminder_level === level);
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
      const t = templates.find((x: QuoteReminderTemplate) => x.reminder_level === level);
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
                  placeholder="Ex : Rappel - Devis en attente de signature"
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
