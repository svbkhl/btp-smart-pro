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
  email_notifications: boolean;
  push_notifications: boolean;
  quote_reminders: boolean;
  payment_reminders: boolean;
  project_reminders: boolean;
  maintenance_reminders: boolean;
  quote_reminder_days: number;
  payment_reminder_days: number;
}

export const NotificationSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email_notifications: true,
    push_notifications: true,
    quote_reminders: true,
    payment_reminders: true,
    project_reminders: true,
    maintenance_reminders: true,
    quote_reminder_days: 3,
    payment_reminder_days: 3,
  });

  // Demander automatiquement la permission pour les notifications push au montage
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          setPreferences((prev) => ({ ...prev, push_notifications: true }));
          console.log("✅ Permission pour les notifications push accordée");
        }
      });
    } else if (Notification.permission === "granted") {
      setPreferences((prev) => ({ ...prev, push_notifications: true }));
    }
  }, []);

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
          .single();

        if (data && !error) {
          setPreferences({
            email_notifications: data.email_notifications ?? true,
            push_notifications: data.push_notifications ?? true,
            quote_reminders: data.quote_reminders ?? true,
            payment_reminders: data.payment_reminders ?? true,
            project_reminders: data.project_reminders ?? true,
            maintenance_reminders: data.maintenance_reminders ?? true,
            quote_reminder_days: data.quote_reminder_days ?? 3,
            payment_reminder_days: data.payment_reminder_days ?? 3,
          });
          console.log("✅ Préférences de notifications chargées");
        } else {
          console.log("ℹ️ Aucune préférence trouvée, utilisation des valeurs par défaut");
        }
      } catch (error) {
        console.error("Erreur chargement préférences:", error);
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [user]);

  // Demander la permission pour les notifications push
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
      toast({
        title: "Déjà autorisé",
        description: "Les notifications push sont déjà activées",
      });
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setPreferences({ ...preferences, push_notifications: true });
      toast({
        title: "Autorisation accordée",
        description: "Les notifications push sont maintenant activées",
      });
    } else {
      setPreferences({ ...preferences, push_notifications: false });
      toast({
        title: "Autorisation refusée",
        description: "Les notifications push ne peuvent pas être activées",
        variant: "destructive",
      });
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
        .upsert({
          user_id: user.id,
          ...preferences,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      console.log("✅ Préférences sauvegardées");
      
      toast({
        title: "Préférences sauvegardées",
        description: "Vos préférences de notifications ont été mises à jour",
      });
    } catch (error: any) {
      console.error("❌ Erreur sauvegarde préférences:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de sauvegarder les préférences",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <GlassCard className="p-6">
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
      <GlassCard className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-semibold">Paramètres de Notifications</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Configurez comment et quand vous souhaitez recevoir des notifications
        </p>

        {/* Types de notifications */}
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Types de notifications</h3>
            
            <div className="space-y-4 p-4 rounded-lg bg-white/50 dark:bg-gray-800/50 border border-border/50">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email_notifications">Notifications par email</Label>
                  <p className="text-xs text-muted-foreground">
                    Recevoir des emails pour les événements importants
                  </p>
                </div>
                <Switch
                  id="email_notifications"
                  checked={preferences.email_notifications}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, email_notifications: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="push_notifications">Notifications push</Label>
                  <p className="text-xs text-muted-foreground">
                    Recevoir des notifications dans le navigateur
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {Notification.permission === "denied" && (
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                  )}
                  <Switch
                    id="push_notifications"
                    checked={preferences.push_notifications && Notification.permission === "granted"}
                    onCheckedChange={(checked) => {
                      if (checked && Notification.permission !== "granted") {
                        requestPushPermission();
                      } else {
                        setPreferences({ ...preferences, push_notifications: checked });
                      }
                    }}
                    disabled={Notification.permission === "denied"}
                  />
                </div>
              </div>

              {Notification.permission !== "granted" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={requestPushPermission}
                  className="w-full gap-2 rounded-xl"
                >
                  <Bell className="h-4 w-4" />
                  Autoriser les notifications push
                </Button>
              )}
            </div>
          </div>

          {/* Rappels spécifiques */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Rappels automatiques</h3>
            
            <div className="space-y-4 p-4 rounded-lg bg-white/50 dark:bg-gray-800/50 border border-border/50">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="quote_reminders">Rappels de devis</Label>
                  <p className="text-xs text-muted-foreground">
                    Rappels pour les devis en attente
                  </p>
                </div>
                <Switch
                  id="quote_reminders"
                  checked={preferences.quote_reminders}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, quote_reminders: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="payment_reminders">Rappels de paiement</Label>
                  <p className="text-xs text-muted-foreground">
                    Rappels pour les paiements dus ou en retard
                  </p>
                </div>
                <Switch
                  id="payment_reminders"
                  checked={preferences.payment_reminders}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, payment_reminders: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="project_reminders">Rappels de projets</Label>
                  <p className="text-xs text-muted-foreground">
                    Rappels pour les débuts et fins de chantiers
                  </p>
                </div>
                <Switch
                  id="project_reminders"
                  checked={preferences.project_reminders}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, project_reminders: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="maintenance_reminders">Rappels de maintenance</Label>
                  <p className="text-xs text-muted-foreground">
                    Rappels pour les échéances de maintenance
                  </p>
                </div>
                <Switch
                  id="maintenance_reminders"
                  checked={preferences.maintenance_reminders}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, maintenance_reminders: checked })
                  }
                />
              </div>
            </div>
          </div>

          {/* Délais de rappel */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Délais de rappel</h3>
            
            <div className="space-y-4 p-4 rounded-lg bg-white/50 dark:bg-gray-800/50 border border-border/50">
              <div className="space-y-2">
                <Label htmlFor="quote_reminder_days">
                  Rappeler les devis en attente après (jours)
                </Label>
                <input
                  id="quote_reminder_days"
                  type="number"
                  min="1"
                  max="30"
                  value={preferences.quote_reminder_days}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      quote_reminder_days: parseInt(e.target.value) || 3,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_reminder_days">
                  Rappeler les paiements avant l'échéance (jours)
                </Label>
                <input
                  id="payment_reminder_days"
                  type="number"
                  min="1"
                  max="30"
                  value={preferences.payment_reminder_days}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      payment_reminder_days: parseInt(e.target.value) || 3,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border"
                />
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

