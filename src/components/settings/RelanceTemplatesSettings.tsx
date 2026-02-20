import { useState, useEffect, useRef, useCallback } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { VariableTemplateField, type VariableTemplateFieldHandle } from "./VariableTemplateField";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Save, Mail, Receipt, FileText } from "lucide-react";
import { useReminderTemplates, useUpsertReminderTemplate } from "@/hooks/usePaymentReminders";
import { useQuoteReminderTemplates, useUpsertQuoteReminderTemplate } from "@/hooks/useQuoteReminders";
import { motion } from "framer-motion";
import type { ReminderTemplate } from "@/types/reminders";
import type { QuoteReminderTemplate } from "@/types/reminders";

const LEVEL_LABELS: Record<1 | 2 | 3, string> = {
  1: "Relance 1 — Premier rappel",
  2: "Relance 2 — Rappel renforcé / suivi",
  3: "Relance 3 — Mise en demeure / Dernier rappel",
};

const DEFAULT_FACTURE_TEMPLATES: Record<1 | 2 | 3, { subject: string; body: string }> = {
  1: {
    subject: "Rappel – Facture {{invoice_number}} – {{amount}}€",
    body: `Bonjour {{client_name}},

Rappel de paiement

• Facture : {{invoice_number}}
• Montant : {{amount}}€
• Échéance : {{due_date}}
• Retard : {{days_overdue}} jour(s)

Nous n'avons pas encore reçu le règlement de cette facture. S'il s'agit d'un oubli, merci de régulariser votre situation au plus tôt.

Cordialement,`,
  },
  2: {
    subject: "URGENT – Facture {{invoice_number}} impayée – {{amount}}€",
    body: `Bonjour {{client_name}},

Nous vous avons adressé un premier rappel concernant la facture {{invoice_number}} ({{amount}}€, retard {{days_overdue}} jours).

Malgré ce rappel, cette facture demeure impayée. Nous vous demandons de régulariser votre situation sous 7 jours.

Cordialement,`,
  },
  3: {
    subject: "Mise en demeure – Facture {{invoice_number}} – {{amount}}€",
    body: `Bonjour {{client_name}},

Malgré nos relances successives, la facture {{invoice_number}} demeure impayée ({{amount}}€, retard {{days_overdue}} jours).

Nous vous adressons une mise en demeure formelle de régler ce montant sous 8 jours à compter de la réception de ce courrier.

Cordialement,`,
  },
};

const DEFAULT_DEVIS_TEMPLATES: Record<1 | 2 | 3, { subject: string; body: string }> = {
  1: {
    subject: "Rappel : Devis {{quote_number}} en attente",
    body: `Bonjour {{client_name}},

Nous vous avons transmis notre devis {{quote_number}} d'un montant de {{amount}}€ il y a {{days_since_sent}} jours.

Avez-vous pu en prendre connaissance ? Nous restons à votre disposition pour toute question, visite sur site ou ajustement de notre proposition.

N'hésitez pas à nous contacter pour convenir d'un rendez-vous si nécessaire.

Cordialement,`,
  },
  2: {
    subject: "Rappel : Devis {{quote_number}} — Suite à notre proposition",
    body: `Bonjour {{client_name}},

Nous revenons vers vous concernant notre devis {{quote_number}} ({{amount}}€), transmis il y a {{days_since_sent}} jours.

Nous n'avons pas reçu de retour de votre part. Notre proposition reste valable, mais nous devons avancer sur la planification de nos chantiers.

Pouvez-vous nous indiquer si notre offre vous convient, ou si vous souhaitez la modifier ? Nous sommes disponibles pour en discuter et adapter notre proposition à vos besoins.

Dans l'attente de votre retour,

Cordialement,`,
  },
  3: {
    subject: "Dernier rappel : Devis {{quote_number}} — Clôture de notre proposition",
    body: `Bonjour {{client_name}},

Malgré nos deux précédents rappels, nous n'avons reçu aucune réponse concernant notre devis {{quote_number}} ({{amount}}€), envoyé il y a {{days_since_sent}} jours.

Faute de retour de votre part sous 8 jours, nous considérerons que vous renoncez à notre proposition. Nous serons alors contraints de libérer le créneau réservé pour ce projet et de réaffecter nos équipes.

Si ce projet vous intéresse toujours, merci de nous contacter rapidement.

Cordialement,`,
  },
};

const FACTURE_VARIABLES: [string, string][] = [
  ["{{client_name}}", "[Nom du client]"],
  ["{{invoice_number}}", "[Numéro de facture]"],
  ["{{amount}}", "[Montant]"],
  ["{{due_date}}", "[Date d'échéance]"],
  ["{{days_overdue}}", "[Jours de retard]"],
];

const DEVIS_VARIABLES: [string, string][] = [
  ["{{client_name}}", "[Nom du client]"],
  ["{{quote_number}}", "[Numéro de devis]"],
  ["{{amount}}", "[Montant]"],
  ["{{days_since_sent}}", "[Jours depuis envoi]"],
];

const FACTURE_VARIABLE_BUTTONS = FACTURE_VARIABLES.map(([, display]) => ({ displayValue: display, label: display.slice(1, -1) }));
const DEVIS_VARIABLE_BUTTONS = DEVIS_VARIABLES.map(([, display]) => ({ displayValue: display, label: display.slice(1, -1) }));
const FACTURE_VARIABLE_PATTERNS = FACTURE_VARIABLES.map(([, d]) => d);
const DEVIS_VARIABLE_PATTERNS = DEVIS_VARIABLES.map(([, d]) => d);

function createStorageDisplay(vars: [string, string][]) {
  const displayToStorage = vars.map(([a, b]) => [b, a] as [string, string]);
  return {
    toDisplay: (text: string) => {
      let out = text;
      for (const [from, to] of vars) out = out.split(from).join(to);
      return out;
    },
    toStorage: (text: string) => {
      let out = text;
      for (const [from, to] of displayToStorage) out = out.split(from).join(to);
      return out;
    },
  };
}

const factureTransform = createStorageDisplay(FACTURE_VARIABLES);
const devisTransform = createStorageDisplay(DEVIS_VARIABLES);

const DEFAULT_SEND_AFTER_DAYS_FACTURE: Record<1 | 2 | 3, number> = { 1: 7, 2: 15, 3: 30 };
const DEFAULT_SEND_AFTER_DAYS_DEVIS: Record<1 | 2 | 3, number> = { 1: 3, 2: 7, 3: 14 };

type TemplateEditorProps = {
  templates: (ReminderTemplate | QuoteReminderTemplate)[];
  defaultTemplates: Record<1 | 2 | 3, { subject: string; body: string }>;
  defaultSendAfterDays: Record<1 | 2 | 3, number>;
  variableButtons: { label: string; displayValue: string }[];
  variablePatterns: string[];
  sendAfterDaysLabel: string; // ex: "Jours de retard" ou "Jours après envoi"
  transform: { toDisplay: (s: string) => string; toStorage: (s: string) => string };
  onSave: (level: 1 | 2 | 3, payload: { id?: string; reminder_level: number; subject: string; body: string; is_active: boolean; send_after_days: number }) => Promise<void>;
  isPending: boolean;
};

function TemplateEditor({ templates, defaultTemplates, defaultSendAfterDays, variableButtons, variablePatterns, sendAfterDaysLabel, transform, onSave, isPending }: TemplateEditorProps) {
  const subjectRefs = useRef<Record<1 | 2 | 3, VariableTemplateFieldHandle | null>>({ 1: null, 2: null, 3: null });
  const bodyRefs = useRef<Record<1 | 2 | 3, VariableTemplateFieldHandle | null>>({ 1: null, 2: null, 3: null });
  const [edits, setEdits] = useState<Record<1 | 2 | 3, { subject: string; body: string; is_active: boolean; send_after_days: number }>>({
    1: { subject: "", body: "", is_active: true, send_after_days: 7 },
    2: { subject: "", body: "", is_active: true, send_after_days: 15 },
    3: { subject: "", body: "", is_active: true, send_after_days: 30 },
  });

  const insertVariable = useCallback(
    (level: 1 | 2 | 3, field: "subject" | "body", displayValue: string) => {
      const fieldRef = field === "subject" ? subjectRefs.current[level] : bodyRefs.current[level];
      if (fieldRef) {
        fieldRef.focus();
        fieldRef.insertVariableAtCursor(displayValue);
      } else {
        setEdits((e) => ({ ...e, [level]: { ...e[level], [field]: e[level][field] + displayValue } }));
      }
    },
    []
  );

  useEffect(() => {
    const next = { ...edits };
    ([1, 2, 3] as const).forEach((level) => {
      const t = templates.find((x) => x.reminder_level === level);
      next[level] = {
        subject: transform.toDisplay(t ? t.subject : defaultTemplates[level].subject),
        body: transform.toDisplay(t ? t.body : defaultTemplates[level].body),
        is_active: t?.is_active ?? true,
        send_after_days: (t as { send_after_days?: number })?.send_after_days ?? defaultSendAfterDays[level],
      };
    });
    setEdits(next);
  }, [templates]);

  return (
    <div className="space-y-6">
      {([1, 2, 3] as const).map((level) => (
        <div key={level} className="rounded-lg border border-border/40 bg-background/50 p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h3 className="font-semibold">{LEVEL_LABELS[level]}</h3>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor={`send-days-${level}`} className="text-sm text-muted-foreground whitespace-nowrap">{sendAfterDaysLabel}</Label>
                <input
                  id={`send-days-${level}`}
                  type="number"
                  min={1}
                  max={365}
                  value={edits[level].send_after_days}
                  onChange={(e) => setEdits((prev) => ({ ...prev, [level]: { ...prev[level], send_after_days: Math.max(1, Math.min(365, parseInt(e.target.value, 10) || 1)) } }))}
                  className="w-16 rounded-md border border-input bg-background px-2 py-1 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor={`active-${level}`} className="text-sm text-muted-foreground">Actif</Label>
                <Switch
                  id={`active-${level}`}
                  checked={edits[level].is_active}
                  onCheckedChange={(checked) => setEdits((e) => ({ ...e, [level]: { ...e[level], is_active: checked } }))}
                />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Objet de l'email</Label>
            <VariableTemplateField
              ref={(el) => { subjectRefs.current[level] = el; }}
              value={edits[level].subject}
              onChange={(v) => setEdits((prev) => ({ ...prev, [level]: { ...prev[level], subject: v } }))}
              placeholder="Objet de l'email"
              variablePatterns={variablePatterns}
              rows={1}
              className="min-h-[40px]"
            />
            <div className="flex flex-wrap gap-1.5">
              {variableButtons.map(({ label, displayValue }) => (
                <button key={displayValue} type="button" onClick={() => insertVariable(level, "subject", displayValue)}
                  className="inline-flex px-2.5 py-1 text-xs rounded-md bg-muted/60 hover:bg-muted transition-colors">
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Corps du message</Label>
            <VariableTemplateField
              ref={(el) => { bodyRefs.current[level] = el; }}
              value={edits[level].body}
              onChange={(v) => setEdits((prev) => ({ ...prev, [level]: { ...prev[level], body: v } }))}
              variablePatterns={variablePatterns}
              rows={8}
              className="rounded-lg text-sm"
            />
            <div className="flex flex-wrap gap-1.5">
              {variableButtons.map(({ label, displayValue }) => (
                <button key={displayValue} type="button" onClick={() => insertVariable(level, "body", displayValue)}
                  className="inline-flex px-2.5 py-1 text-xs rounded-md bg-muted/60 hover:bg-muted transition-colors">
                  {label}
                </button>
              ))}
            </div>
          </div>
          <Button
            onClick={async () => {
              const t = templates.find((x) => x.reminder_level === level);
              await onSave(level, {
                id: t?.id,
                reminder_level: level,
                subject: transform.toStorage(edits[level].subject),
                body: transform.toStorage(edits[level].body),
                is_active: edits[level].is_active,
                send_after_days: edits[level].send_after_days,
              });
            }}
            disabled={isPending}
            className="gap-2 rounded-xl"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer le niveau {level}
          </Button>
        </div>
      ))}
    </div>
  );
}

export const RelanceTemplatesSettings = () => {
  const { toast } = useToast();
  const { data: factureTemplates = [], isLoading: loadingFactures, isError: errorFactures } = useReminderTemplates();
  const { data: devisTemplates = [], isLoading: loadingDevis, isError: errorDevis } = useQuoteReminderTemplates();
  const upsertFacture = useUpsertReminderTemplate();
  const upsertDevis = useUpsertQuoteReminderTemplate();

  if (loadingFactures && loadingDevis) {
    return (
      <GlassCard className="p-6">
        <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      </GlassCard>
    );
  }

  if (errorFactures || errorDevis) {
    return (
      <GlassCard className="p-6">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Modèles de relances</h2>
          <p className="text-sm text-muted-foreground">
            Les tables de configuration des relances ne sont pas encore créées. Exécutez le script SQL dans le Supabase Dashboard → SQL Editor puis rechargez la page.
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Script : <code className="rounded bg-muted px-1">supabase/scripts/APPLY-RELANCES-TABLES.sql</code>
          </p>
        </div>
      </GlassCard>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <GlassCard className="p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <Mail className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-semibold">Modèles de relances</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Modèles d'emails pour les relances factures impayées et devis en attente.
            </p>
          </div>
        </div>

        <Tabs defaultValue="devis" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="devis" className="gap-2">
              <FileText className="h-4 w-4" />
              Devis
            </TabsTrigger>
            <TabsTrigger value="factures" className="gap-2">
              <Receipt className="h-4 w-4" />
              Factures
            </TabsTrigger>
          </TabsList>

          <TabsContent value="devis" className="space-y-4">
            <p className="text-xs text-muted-foreground">Relances pour devis en attente de signature (variables : devis, montant, jours depuis envoi)</p>
            <TemplateEditor
              templates={devisTemplates}
              defaultTemplates={DEFAULT_DEVIS_TEMPLATES}
              defaultSendAfterDays={DEFAULT_SEND_AFTER_DAYS_DEVIS}
              variableButtons={DEVIS_VARIABLE_BUTTONS}
              variablePatterns={DEVIS_VARIABLE_PATTERNS}
              sendAfterDaysLabel="Envoyer après (j. envoi)"
              transform={devisTransform}
              onSave={async (level, payload) => {
                await upsertDevis.mutateAsync(payload);
                toast({ title: "Enregistré", description: `Niveau ${level} (devis) enregistré.` });
              }}
              isPending={upsertDevis.isPending}
            />
          </TabsContent>

          <TabsContent value="factures" className="space-y-4">
            <p className="text-xs text-muted-foreground">Relances pour factures impayées (variables : facture, montant, échéance, retard)</p>
            <TemplateEditor
              templates={factureTemplates}
              defaultTemplates={DEFAULT_FACTURE_TEMPLATES}
              defaultSendAfterDays={DEFAULT_SEND_AFTER_DAYS_FACTURE}
              variableButtons={FACTURE_VARIABLE_BUTTONS}
              variablePatterns={FACTURE_VARIABLE_PATTERNS}
              sendAfterDaysLabel="Envoyer après (j. retard)"
              transform={factureTransform}
              onSave={async (level, payload) => {
                await upsertFacture.mutateAsync(payload);
                toast({ title: "Enregistré", description: `Niveau ${level} (factures) enregistré.` });
              }}
              isPending={upsertFacture.isPending}
            />
          </TabsContent>
        </Tabs>
      </GlassCard>
    </motion.div>
  );
};
