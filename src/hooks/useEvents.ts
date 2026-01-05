import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// ============================================================================
// TYPES
// ============================================================================

export interface Event {
  id: string;
  user_id: string;
  company_id: string;
  project_id?: string | null;
  title: string;
  description?: string | null;
  start_date: string;
  end_date?: string | null;
  all_day: boolean;
  location?: string | null;
  type: "meeting" | "task" | "deadline" | "reminder" | "other";
  color: string;
  reminder_minutes?: number | null;
  reminder_recurring?: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface CreateEventData {
  title: string;
  description?: string;
  start_date: string;
  end_date?: string;
  all_day?: boolean;
  location?: string;
  type?: "meeting" | "task" | "deadline" | "reminder" | "other";
  color?: string;
  project_id?: string;
  reminder_minutes?: number;
  reminder_recurring?: boolean;
}

export interface UpdateEventData extends Partial<CreateEventData> {
  id: string;
}

// ============================================================================
// VALIDATION UUID
// ============================================================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(value: any): boolean {
  if (!value || typeof value !== 'string') return false;
  return UUID_REGEX.test(value);
}

function validateUUIDField(fieldName: string, value: any): void {
  if (!isValidUUID(value)) {
    const error = new Error(`Champ ${fieldName} invalide : attendu UUID, reçu "${value}" (type: ${typeof value})`);
    console.error(`❌ [useEvents] Validation UUID échouée:`, {
      fieldName,
      value,
      valueType: typeof value,
      valueLength: value?.length,
    });
    throw error;
  }
}

// ============================================================================
// HOOKS
// ============================================================================

export const useEvents = (startDate?: Date, endDate?: Date) => {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ["events", currentCompanyId, startDate, endDate],
    queryFn: async () => {
      if (!currentCompanyId) {
        console.warn("⚠️ [useEvents] Pas de company_id, retour vide");
        return [];
      }

      let query = supabase
        .from("events")
        .select("*")
        .eq("company_id", currentCompanyId)
        .order("start_date", { ascending: true });

      if (startDate) {
        query = query.gte("start_date", startDate.toISOString());
      }
      if (endDate) {
        query = query.lte("start_date", endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error("❌ [useEvents] Erreur récupération:", error);
        throw error;
      }

      return (data || []) as Event[];
    },
    enabled: !!currentCompanyId,
  });
};

export const useCreateEvent = () => {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateEventData) => {
      console.log("🔵 [useCreateEvent] DÉBUT - Données reçues:", data);

      // ========================================================================
      // ÉTAPE 1: Récupérer l'utilisateur authentifié
      // ========================================================================
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !currentUser) {
        console.error("❌ [useCreateEvent] Erreur auth:", authError);
        throw new Error("Vous devez être connecté pour créer un événement");
      }

      const user_id = currentUser.id;
      console.log("✅ [useCreateEvent] User ID récupéré:", user_id);

      // Validation UUID user_id
      validateUUIDField("user_id", user_id);

      // ========================================================================
      // ÉTAPE 2: Récupérer le company_id
      // ========================================================================
      let company_id: string;

      // Essayer d'abord depuis le contexte (plus rapide)
      if (currentCompanyId && isValidUUID(currentCompanyId)) {
        company_id = currentCompanyId;
        console.log("✅ [useCreateEvent] Company ID depuis contexte:", company_id);
      } else {
        // Sinon, récupérer depuis company_users
        const { data: companyUserData, error: companyError } = await supabase
          .from("company_users")
          .select("company_id")
          .eq("user_id", user_id)
          .single();

        if (companyError || !companyUserData?.company_id) {
          console.error("❌ [useCreateEvent] Erreur company_id:", companyError);
          throw new Error("Impossible de récupérer votre entreprise. Veuillez contacter le support.");
        }

        company_id = companyUserData.company_id;
        console.log("✅ [useCreateEvent] Company ID depuis DB:", company_id);
      }

      // Validation UUID company_id
      validateUUIDField("company_id", company_id);

      // ========================================================================
      // ÉTAPE 3: Valider les données d'entrée
      // ========================================================================
      if (!data.title || typeof data.title !== 'string' || data.title.trim() === '') {
        throw new Error('Le titre est requis');
      }

      if (!data.start_date || typeof data.start_date !== 'string') {
        throw new Error('La date de début est requise');
      }

      // ========================================================================
      // ÉTAPE 4: Construire l'objet d'insertion STRICT
      // ========================================================================
      const insertData: Record<string, any> = {
        // UUIDs (OBLIGATOIRES et VALIDÉS)
        user_id: user_id,
        company_id: company_id,
        
        // Champs obligatoires
        title: data.title.trim(),
        start_date: data.start_date,
        all_day: data.all_day ?? false,
        
        // Champs avec valeurs par défaut
        type: data.type || "meeting",
        color: data.color || "#3b82f6",
      };

      // Champs optionnels (seulement si définis et valides)
      if (data.description && typeof data.description === 'string' && data.description.trim() !== '') {
        insertData.description = data.description.trim();
      }

      if (data.end_date && typeof data.end_date === 'string' && data.end_date.trim() !== '') {
        insertData.end_date = data.end_date;
      }

      if (data.location && typeof data.location === 'string' && data.location.trim() !== '') {
        insertData.location = data.location.trim();
      }

      if (typeof data.reminder_minutes === 'number' && data.reminder_minutes >= 0) {
        insertData.reminder_minutes = data.reminder_minutes;
      }

      if (typeof data.reminder_recurring === 'boolean') {
        insertData.reminder_recurring = data.reminder_recurring;
      }

      // project_id (UUID valide uniquement)
      if (data.project_id) {
        if (isValidUUID(data.project_id)) {
          insertData.project_id = data.project_id;
        } else {
          console.warn("⚠️ [useCreateEvent] project_id invalide ignoré:", data.project_id);
        }
      }

      // ========================================================================
      // ÉTAPE 5: VALIDATION FINALE STRICTE
      // ========================================================================
      console.log("🔍 [useCreateEvent] VALIDATION FINALE - Objet à insérer:", {
        ...insertData,
        // Logs détaillés pour chaque champ UUID
        user_id_info: {
          value: insertData.user_id,
          type: typeof insertData.user_id,
          isValid: isValidUUID(insertData.user_id),
          length: insertData.user_id?.length,
        },
        company_id_info: {
          value: insertData.company_id,
          type: typeof insertData.company_id,
          isValid: isValidUUID(insertData.company_id),
          length: insertData.company_id?.length,
        },
        project_id_info: insertData.project_id ? {
          value: insertData.project_id,
          type: typeof insertData.project_id,
          isValid: isValidUUID(insertData.project_id),
        } : "non défini",
      });

      // Vérifier qu'aucun champ UUID ne contient "events" ou autre valeur invalide
      const invalidValues = ["events", "calendar", "event", "table", "null", "undefined"];
      for (const [key, value] of Object.entries(insertData)) {
        if (key.includes('_id') && typeof value === 'string') {
          if (invalidValues.includes(value.toLowerCase())) {
            const error = new Error(`Valeur invalide détectée dans ${key}: "${value}". Ce champ doit être un UUID valide.`);
            console.error("❌ [useCreateEvent] Valeur invalide détectée:", { key, value });
            throw error;
          }
        }
      }

      // Validation finale des UUID
      validateUUIDField("user_id (final)", insertData.user_id);
      validateUUIDField("company_id (final)", insertData.company_id);
      if (insertData.project_id) {
        validateUUIDField("project_id (final)", insertData.project_id);
      }

      // ========================================================================
      // ÉTAPE 6: INSERTION
      // ========================================================================
      console.log("🚀 [useCreateEvent] INSERTION - Envoi à Supabase:", JSON.stringify(insertData, null, 2));

      const { data: event, error } = await supabase
        .from("events")
        .insert([insertData])
        .select("*")
        .single();

      if (error) {
        console.error("❌ [useCreateEvent] Erreur insertion Supabase:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          // Log de l'objet envoyé pour debug
          payload_sent: JSON.stringify(insertData, null, 2),
        });
        throw error;
      }
      
      console.log("✅ [useCreateEvent] Événement créé avec succès:", event);
      return event as Event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
};

export const useUpdateEvent = () => {
  const queryClient = useQueryClient();
  const { currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (data: UpdateEventData) => {
      const { id, ...updateData } = data;

      if (!isValidUUID(id)) {
        throw new Error("ID d'événement invalide");
      }

      const { data: event, error } = await supabase
        .from("events")
        .update(updateData)
        .eq("id", id)
        .eq("company_id", currentCompanyId || "")
        .select("*")
        .single();

      if (error) {
        console.error("❌ [useUpdateEvent] Erreur:", error);
        throw error;
      }

      return event as Event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
};

export const useDeleteEvent = () => {
  const queryClient = useQueryClient();
  const { currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!isValidUUID(id)) {
        throw new Error("ID d'événement invalide");
      }

      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", id)
        .eq("company_id", currentCompanyId || "");

      if (error) {
        console.error("❌ [useDeleteEvent] Erreur:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
};
