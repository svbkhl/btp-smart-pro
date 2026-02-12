import { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Bell, Loader2, CheckCircle2, AlertCircle, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Switch } from "@/components/ui/switch";
import { motion } from "framer-motion";

interface NotificationPreferences {
  push_notifications: boolean;
  quote_reminders: boolean;
  payment_reminders: boolean;
  project_reminders: boolean;
  maintenance_reminders: boolean;
  quote_reminder_days: number;
  payment_reminder_days: number;
  signed_quote_notifications: boolean;
  payment_received_notifications: boolean;
  planning_assignment_notifications: boolean;
}

export const NotificationSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pushRequesting, setPushRequesting] = useState(false);
  const [tableError, setTableError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    push_notifications: true,
    quote_reminders: true,
    payment_reminders: true,
    project_reminders: true,
    maintenance_reminders: true,
    quote_reminder_days: 3,
    payment_reminder_days: 3,
    signed_quote_notifications: true,
    payment_received_notifications: true,
    planning_assignment_notifications: true,
  });

  // Charger les préférences au montage
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) return;

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("user_notification_preferences")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (data && !error) {
          setPreferences({
            push_notifications: data.push_notifications ?? true,
            quote_reminders: data.quote_reminders ?? true,
            payment_reminders: data.payment_reminders ?? true,
            project_reminders: data.project_reminders ?? true,
            maintenance_reminders: data.maintenance_reminders ?? true,
            quote_reminder_days: data.quote_reminder_days ?? 3,
            payment_reminder_days: data.payment_reminder_days ?? 3,
            signed_quote_notifications: (data as Record<string, unknown>).signed_quote_notifications ?? true,
            payment_received_notifications: (data as Record<string, unknown>).payment_received_notifications ?? true,
            planning_assignment_notifications: (data as Record<string, unknown>).planning_assignment_notifications ?? true,
          });
        }
        setTableError(null);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        const err = error as { code?: string; status?: number };
        const isTableMissing = msg.includes("does not exist") || msg.includes("relation") || msg.includes("42P01") || err?.code === "PGRST301" || err?.status === 404;
        if (isTableMissing) {
          setTableError("La table des préférences n'existe pas encore. Exécutez la migration Supabase « user_notification_preferences » puis réessayez.");
        }
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [user]);

  // Demander la permission pour les notifications push (doit être appelé au clic utilisateur)
  const requestPushPermission = async () => {
    if (!("Notification" in window)) {
      toast({
        title: "Non supporté",
        description: "Votre navigateur ne supporte pas les notifications push",
        variant: "destructive",
      });
      return;
    }

    if (Notification.permission === "granted") {
      setPreferences((p) => ({ ...p, push_notifications: true }));
      toast({
        title: "Déjà autorisé",
        description: "Les notifications push sont déjà activées",
      });
      return;
    }

    if (Notification.permission === "denied") {
      toast({
        title: "Notifications bloquées",
        description: "Autorisez les notifications dans les paramètres du navigateur pour ce site.",
        variant: "destructive",
      });
      return;
    }

    setPushRequesting(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        const next = { ...preferences, push_notifications: true };
        setPreferences(next);
        toast({
          title: "Autorisation accordée",
          description: "Les notifications push sont activées.",
        });
        try {
          await supabase.from("user_notification_preferences").upsert(
            { user_id: user!.id, email_notifications: true, ...next, updated_at: new Date().toISOString() },
            { onConflict: "user_id" }
          );
        } catch {
          // Table peut ne pas exister
        }
      } else {
        setPreferences((p) => ({ ...p, push_notifications: false }));
        toast({
          title: "Autorisation refusée",
          description: "Activez-les plus tard via ce bouton si vous changez d'avis.",
          variant: "destructive",
        });
      }
    } finally {
      setPushRequesting(false);
    }
  };

  // Sauvegarder les préférences
  const handleSave = async () => {
    if (!user) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("user_notification_preferences")
        .upsert(
          {
            user_id: user.id,
            email_notifications: true,
            ...preferences,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        )
        .select()
        .single();

      if (error) throw error;

      console.log("✅ Préférences sauvegardées");
      
      toast({
        title: "Préférences sauvegardées",
        description: "Vos préférences de notifications ont été mises à jour",
      });
    } catch (error: unknown) {
      console.error("❌ Erreur sauvegarde préférences:", error);
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("does not exist") || msg.includes("relation") || msg.includes("42P01")) {
        setTableError("La table des préférences n'existe pas. Exécutez la migration Supabase « user_notification_preferences ».");
      }
      toast({
        title: "Erreur",
        description: msg || "Impossible de sauvegarder les préférences",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <GlassCard className="p-4 sm:p-6">
        <div className="flex items-center justify-center py-12">
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
          <Bell className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-semibold">Notifications et rappels</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Configurez les notifications push, les rappels automatiques et les délais. Les modèles d’emails de relance sont réglés dans la section « Configuration des relances » ci-dessous.
            </p>
          </div>
        </div>

        {tableError && (
          <div className="mb-6 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-200">
            {tableError}
          </div>
        )}

        {/* Notifications push */}
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Notifications push</h3>
            <div className="space-y-4 p-4 sm:p-5 rounded-lg bg-white/50 dark:bg-gray-800/50 border border-border/50">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-0.5 min-w-0">
                  <Label htmlFor="push_notifications" className="text-base">Notifications dans le navigateur</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Recevoir des alertes pour les événements importants (devis, paiements, rappels).
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  {Notification.permission === "denied" && (
                    <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" aria-hidden />
                  )}
                  {Notification.permission === "granted" ? (
                    <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                      <CheckCircle2 className="h-5 w-5" />
                      <span>Activées</span>
                    </div>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={requestPushPermission}
                      disabled={pushRequesting || Notification.permission === "denied"}
                      className="gap-2 rounded-xl shrink-0"
                    >
                      {pushRequesting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Demande en cours…
                        </>
                      ) : (
                        <>
                          <Bell className="h-4 w-4" />
                          Activer les notifications push
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
              {Notification.permission !== "granted" && Notification.permission !== "denied" && (
                <p className="text-xs text-muted-foreground">
                  Cliquez sur le bouton pour demander l&apos;autorisation au navigateur (requis pour activer).
                </p>
              )}
              {Notification.permission === "denied" && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Les notifications sont bloquées. Autorisez-les dans les paramètres du site (icône cadenas dans la barre d&apos;adresse).
                </p>
              )}
            </div>
          </div>

          {/* Notifications pour les responsables (owners) */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Pour les responsables</h3>
            <p className="text-sm text-muted-foreground">Alertes lorsque des événements importants se produisent.</p>
            <div className="space-y-4 p-4 sm:p-5 rounded-lg bg-white/50 dark:bg-gray-800/50 border border-border/50">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                <div className="space-y-0.5 min-w-0">
                  <Label htmlFor="signed_quote_notifications">Devis signé</Label>
                  <p className="text-xs text-muted-foreground">Être notifié quand un client signe un devis</p>
                </div>
                <Switch
                  id="signed_quote_notifications"
                  checked={preferences.signed_quote_notifications}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, signed_quote_notifications: checked })
                  }
                  className="sm:flex-shrink-0"
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                <div className="space-y-0.5 min-w-0">
                  <Label htmlFor="payment_received_notifications">Paiement reçu</Label>
                  <p className="text-xs text-muted-foreground">Être notifié quand un paiement est enregistré</p>
                </div>
                <Switch
                  id="payment_received_notifications"
                  checked={preferences.payment_received_notifications}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, payment_received_notifications: checked })
                  }
                  className="sm:flex-shrink-0"
                />
              </div>
            </div>
          </div>

          {/* Notifications pour les employés */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Pour les employés</h3>
            <p className="text-sm text-muted-foreground">Alertes liées à votre planning et vos affectations.</p>
            <div className="space-y-4 p-4 sm:p-5 rounded-lg bg-white/50 dark:bg-gray-800/50 border border-border/50">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                <div className="space-y-0.5 min-w-0">
                  <Label htmlFor="planning_assignment_notifications">Affectations planning</Label>
                  <p className="text-xs text-muted-foreground">Être notifié lors d&apos;une affectation ou modification sur votre planning</p>
                </div>
                <Switch
                  id="planning_assignment_notifications"
                  checked={preferences.planning_assignment_notifications}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, planning_assignment_notifications: checked })
                  }
                  className="sm:flex-shrink-0"
                />
              </div>
            </div>
          </div>

          {/* Rappels spécifiques */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Rappels automatiques</h3>
            <div className="space-y-4 p-4 sm:p-5 rounded-lg bg-white/50 dark:bg-gray-800/50 border border-border/50">
              {[
                { id: "quote_reminders", label: "Rappels de devis", desc: "Rappels pour les devis en attente", key: "quote_reminders" as const },
                { id: "payment_reminders", label: "Rappels de paiement", desc: "Rappels pour les paiements dus ou en retard", key: "payment_reminders" as const },
                { id: "project_reminders", label: "Rappels de projets", desc: "Rappels pour les débuts et fins de chantiers", key: "project_reminders" as const },
                { id: "maintenance_reminders", label: "Rappels de maintenance", desc: "Rappels pour les échéances de maintenance", key: "maintenance_reminders" as const },
              ].map(({ id, label, desc, key }) => (
                <div key={key} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                  <div className="space-y-0.5 min-w-0">
                    <Label htmlFor={id}>{label}</Label>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                  <Switch
                    id={id}
                    checked={preferences[key]}
                    onCheckedChange={(checked) =>
                      setPreferences({ ...preferences, [key]: checked })
                    }
                    className="sm:flex-shrink-0"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Délais de rappel */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Délais de rappel</h3>
            <div className="space-y-4 p-4 sm:p-5 rounded-lg bg-white/50 dark:bg-gray-800/50 border border-border/50">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quote_reminder_days">Rappeler les devis en attente après (jours)</Label>
                  <input
                    id="quote_reminder_days"
                    type="number"
                    min={1}
                    max={30}
                    value={preferences.quote_reminder_days}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        quote_reminder_days: parseInt(e.target.value, 10) || 3,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment_reminder_days">Rappeler les paiements avant l&apos;échéance (jours)</Label>
                  <input
                    id="payment_reminder_days"
                    type="number"
                    min={1}
                    max={30}
                    value={preferences.payment_reminder_days}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        payment_reminder_days: parseInt(e.target.value, 10) || 3,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bouton de sauvegarde */}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="gap-2 rounded-xl w-full"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sauvegarde...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Sauvegarder les préférences
              </>
            )}
          </Button>
        </div>
      </GlassCard>
    </motion.div>
  );
};

