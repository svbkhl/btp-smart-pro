import { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Calendar, Loader2, Mail, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";

const JOURS = [
  { value: 0, label: "Dimanche" },
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
];

const HEURES = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${String(i).padStart(2, "0")}:00`,
}));

interface PlanningEmailSettingsData {
  enabled: boolean;
  send_day: number;
  send_hour: number;
  send_minute: number;
}

export const PlanningEmailSettings = () => {
  const companyId = useCompanyId();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PlanningEmailSettingsData>({
    enabled: false,
    send_day: 5,
    send_hour: 18,
    send_minute: 0,
  });

  useEffect(() => {
    if (!companyId) return;
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("company_planning_email_settings")
          .select("*")
          .eq("company_id", companyId)
          .maybeSingle();

        if (error && error.code !== "PGRST116") throw error;
        if (data) {
          setSettings({
            enabled: data.enabled ?? false,
            send_day: data.send_day ?? 5,
            send_hour: data.send_hour ?? 18,
            send_minute: data.send_minute ?? 0,
          });
        }
      } catch {
        // Table peut ne pas exister
        setSettings({
          enabled: false,
          send_day: 5,
          send_hour: 18,
          send_minute: 0,
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [companyId]);

  const handleSave = async () => {
    if (!companyId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("company_planning_email_settings")
        .upsert(
          {
            company_id: companyId,
            enabled: settings.enabled,
            send_day: settings.send_day,
            send_hour: settings.send_hour,
            send_minute: settings.send_minute,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "company_id" }
        );

      if (error) throw error;
      toast({
        title: "Paramètres sauvegardés",
        description: settings.enabled
          ? `Le planning sera envoyé automatiquement le ${JOURS[settings.send_day]?.label} à ${String(settings.send_hour).padStart(2, "0")}:00`
          : "L'envoi automatique du planning est désactivé.",
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({
        title: "Erreur",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <GlassCard className="p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-primary/10 p-3">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <h3 className="font-semibold text-foreground">Envoi automatique du planning</h3>
              <p className="text-sm text-muted-foreground">
                Envoyer le planning de la semaine prochaine par email à vos employés
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <Switch
                  id="planning-email-enabled"
                  checked={settings.enabled}
                  onCheckedChange={(v) => setSettings((s) => ({ ...s, enabled: v }))}
                />
                <Label htmlFor="planning-email-enabled" className="cursor-pointer">
                  Activer l'envoi automatique
                </Label>
              </div>
            </div>

            {settings.enabled && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Jour d'envoi</Label>
                  <Select
                    value={String(settings.send_day)}
                    onValueChange={(v) => setSettings((s) => ({ ...s, send_day: parseInt(v, 10) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {JOURS.map((j) => (
                        <SelectItem key={j.value} value={String(j.value)}>
                          {j.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Heure d'envoi</Label>
                  <Select
                    value={String(settings.send_hour)}
                    onValueChange={(v) => setSettings((s) => ({ ...s, send_hour: parseInt(v, 10) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HEURES.map((h) => (
                        <SelectItem key={h.value} value={String(h.value)}>
                          {h.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {settings.enabled && (
              <p className="text-xs text-muted-foreground">
                Le planning de la semaine prochaine sera envoyé chaque {JOURS[settings.send_day]?.label} à{" "}
                {String(settings.send_hour).padStart(2, "0")}:00.
              </p>
            )}

            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Enregistrer
            </Button>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
};
