import { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, Building2, Settings, Palette, ToggleLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";

interface UserSettings {
  id: string;
  user_id: string;
  company_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  siret?: string;
  vat_number?: string;
  legal_form?: string;
  company_logo_url?: string;
  terms_and_conditions?: string;
  app_base_url?: string;
  custom_features?: Record<string, boolean>;
  custom_primary_color?: string;
  custom_secondary_color?: string;
  custom_settings?: Record<string, any>;
  admin_notes?: string;
  custom_status?: string;
}

// Liste des fonctionnalités personnalisables
const AVAILABLE_FEATURES = [
  { key: "show_advanced_analytics", label: "Analyses avancées", description: "Afficher les analyses détaillées" },
  { key: "enable_ai_assistant", label: "Assistant IA", description: "Activer l'assistant IA" },
  { key: "show_custom_reports", label: "Rapports personnalisés", description: "Afficher les rapports personnalisés" },
  { key: "enable_api_access", label: "Accès API", description: "Permettre l'accès à l'API" },
  { key: "show_beta_features", label: "Fonctionnalités bêta", description: "Afficher les fonctionnalités en test" },
  { key: "enable_export_all", label: "Export complet", description: "Permettre l'export de toutes les données" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Actif", description: "Entreprise active et fonctionnelle" },
  { value: "suspended", label: "Suspendu", description: "Entreprise temporairement suspendue" },
  { value: "testing", label: "En test", description: "Entreprise en phase de test" },
  { value: "inactive", label: "Inactif", description: "Entreprise inactive" },
];

// Hook pour récupérer tous les utilisateurs (admin seulement)
const useAllUsers = () => {
  const { user, isAdmin } = useAuth();
  
  return useQuery({
    queryKey: ["all_users"],
    queryFn: async () => {
      if (!user || !isAdmin) throw new Error("Unauthorized");
      
      // Récupérer tous les utilisateurs avec leurs settings
      const { data: users, error } = await supabase
        .from("user_settings")
        .select(`
          *,
          user:auth.users(id, email, raw_user_meta_data)
        `)
        .order("company_name", { ascending: true });
      
      if (error) throw error;
      return users || [];
    },
    enabled: !!user && isAdmin,
  });
};

// Hook pour mettre à jour les settings d'un utilisateur (admin)
const useUpdateUserSettingsAdmin = () => {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: Partial<UserSettings> }) => {
      if (!user || !isAdmin) throw new Error("Unauthorized");
      
      const { data, error } = await supabase
        .from("user_settings")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .select()
        .single();
      
      if (error) throw error;
      return data as UserSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all_users"] });
      queryClient.invalidateQueries({ queryKey: ["user_settings"] });
    },
  });
};

export const AdminCompanySettings = () => {
  const { isAdmin } = useAuth();
  const { data: users = [], isLoading } = useAllUsers();
  const updateSettings = useUpdateUserSettingsAdmin();
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  const selectedUser = users.find((u: any) => u.user_id === selectedUserId);
  const selectedSettings = selectedUser as UserSettings | undefined;

  const [formData, setFormData] = useState({
    custom_features: {} as Record<string, boolean>,
    custom_primary_color: "",
    custom_secondary_color: "",
    custom_settings: {} as Record<string, any>,
    admin_notes: "",
    custom_status: "active",
  });

  useEffect(() => {
    if (selectedSettings) {
      setFormData({
        custom_features: selectedSettings.custom_features || {},
        custom_primary_color: selectedSettings.custom_primary_color || "",
        custom_secondary_color: selectedSettings.custom_secondary_color || "",
        custom_settings: selectedSettings.custom_settings || {},
        admin_notes: selectedSettings.admin_notes || "",
        custom_status: selectedSettings.custom_status || "active",
      });
    }
  }, [selectedSettings]);

  if (!isAdmin) {
    return (
      <GlassCard className="p-12 text-center">
        <p className="text-muted-foreground">Accès réservé aux administrateurs</p>
      </GlassCard>
    );
  }

  const handleSave = async () => {
    if (!selectedUserId) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une entreprise",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      await updateSettings.mutateAsync({
        userId: selectedUserId,
        updates: formData,
      });
      
      toast({
        title: "Paramètres sauvegardés",
        description: `Les paramètres personnalisés pour ${selectedSettings?.company_name || "cette entreprise"} ont été mis à jour.`,
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de sauvegarder les paramètres",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleFeature = (featureKey: string) => {
    setFormData({
      ...formData,
      custom_features: {
        ...formData.custom_features,
        [featureKey]: !formData.custom_features[featureKey],
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          Configuration Personnalisée par Entreprise
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Personnalisez les fonctionnalités et paramètres pour chaque entreprise
        </p>
      </div>

      {/* Sélection de l'entreprise */}
      <GlassCard className="p-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="select-company">Sélectionner une entreprise</Label>
            <Select
              value={selectedUserId || ""}
              onValueChange={setSelectedUserId}
            >
              <SelectTrigger id="select-company" className="mt-2">
                <SelectValue placeholder="Choisir une entreprise..." />
              </SelectTrigger>
              <SelectContent>
                {users.map((user: any) => (
                  <SelectItem key={user.user_id} value={user.user_id}>
                    {user.company_name || user.email || `Utilisateur ${user.user_id.substring(0, 8)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedSettings && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6 pt-4 border-t"
            >
              {/* Informations de l'entreprise */}
              <div className="p-4 rounded-lg bg-white/50 dark:bg-gray-800/50 border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold">Informations</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  <strong>Nom:</strong> {selectedSettings.company_name || "Non défini"}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Email:</strong> {selectedSettings.email || "Non défini"}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>User ID:</strong> {selectedUserId?.substring(0, 8)}...
                </p>
              </div>

              {/* Statut personnalisé */}
              <div>
                <Label htmlFor="custom_status">Statut de l'entreprise</Label>
                <Select
                  value={formData.custom_status}
                  onValueChange={(value) => setFormData({ ...formData, custom_status: value })}
                >
                  <SelectTrigger id="custom_status" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label} - {status.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Fonctionnalités personnalisées */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <ToggleLeft className="w-5 h-5 text-primary" />
                  <Label className="text-lg font-semibold">Fonctionnalités Personnalisées</Label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {AVAILABLE_FEATURES.map((feature) => (
                    <div
                      key={feature.key}
                      className="flex items-center justify-between p-3 rounded-lg bg-white/50 dark:bg-gray-800/50 border border-border/50"
                    >
                      <div className="flex-1">
                        <Label className="font-medium cursor-pointer">{feature.label}</Label>
                        <p className="text-xs text-muted-foreground">{feature.description}</p>
                      </div>
                      <Switch
                        checked={formData.custom_features[feature.key] === true}
                        onCheckedChange={() => toggleFeature(feature.key)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Couleurs personnalisées */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Palette className="w-5 h-5 text-primary" />
                  <Label className="text-lg font-semibold">Couleurs Personnalisées</Label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="custom_primary_color">Couleur primaire (hex)</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        id="custom_primary_color"
                        type="text"
                        placeholder="#FF5733"
                        value={formData.custom_primary_color}
                        onChange={(e) => setFormData({ ...formData, custom_primary_color: e.target.value })}
                        className="flex-1"
                      />
                      {formData.custom_primary_color && (
                        <div
                          className="w-12 h-10 rounded border border-border"
                          style={{ backgroundColor: formData.custom_primary_color }}
                        />
                      )}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="custom_secondary_color">Couleur secondaire (hex)</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        id="custom_secondary_color"
                        type="text"
                        placeholder="#33FF57"
                        value={formData.custom_secondary_color}
                        onChange={(e) => setFormData({ ...formData, custom_secondary_color: e.target.value })}
                        className="flex-1"
                      />
                      {formData.custom_secondary_color && (
                        <div
                          className="w-12 h-10 rounded border border-border"
                          style={{ backgroundColor: formData.custom_secondary_color }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes admin */}
              <div>
                <Label htmlFor="admin_notes">Notes administrateur</Label>
                <Textarea
                  id="admin_notes"
                  placeholder="Notes privées sur cette entreprise..."
                  value={formData.admin_notes}
                  onChange={(e) => setFormData({ ...formData, admin_notes: e.target.value })}
                  className="mt-2 min-h-[100px]"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Ces notes sont visibles uniquement par les administrateurs
                </p>
              </div>

              {/* Bouton de sauvegarde */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="gap-2 rounded-xl"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sauvegarde...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Sauvegarder les modifications
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </GlassCard>
    </div>
  );
};

















