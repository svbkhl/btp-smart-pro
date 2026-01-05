import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGoogleCalendarConnection, useSyncEventWithGoogle } from "@/hooks/useGoogleCalendar";

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

// ⚠️ REGEX UUID STRICTE (RFC 4122 compliant)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(value: any): boolean {
  if (!value || typeof value !== 'string') return false;
  
  // ⚠️ BLOQUER EXPLICITEMENT "events" et autres valeurs invalides
  const invalidValues = ["events", "calendar", "event", "table", "null", "undefined", ""];
  if (invalidValues.includes(value.toLowerCase())) {
    return false;
  }
  
  // ⚠️ VÉRIFIER LE FORMAT UUID STRICT
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
  // ⚠️ NE PAS utiliser currentCompanyId depuis useAuth - récupérer directement depuis DB
  // pour éviter toute contamination par des valeurs invalides
  const { data: googleConnection } = useGoogleCalendarConnection();
  const syncWithGoogle = useSyncEventWithGoogle();

  return useMutation({
    mutationFn: async (data: CreateEventData) => {
      console.log("🔵 [useCreateEvent] DÉBUT - Données reçues:", data);

      // ========================================================================
      // ÉTAPE 1: Récupérer l'utilisateur authentifié (SEULE SOURCE)
      // ========================================================================
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !currentUser) {
        console.error("❌ [useCreateEvent] Erreur auth:", authError);
        throw new Error("Vous devez être connecté pour créer un événement");
      }

      // ⚠️ FORCER user_id depuis auth.getUser() UNIQUEMENT
      const user_id = currentUser.id;
      
      console.log("✅ [useCreateEvent] User ID récupéré depuis auth.getUser():", {
        user_id,
        type: typeof user_id,
        length: user_id?.length,
        isString: typeof user_id === 'string',
      });

      // Validation UUID user_id STRICTE
      if (!user_id || typeof user_id !== 'string') {
        const error = new Error(`user_id invalide : type ${typeof user_id}, valeur "${user_id}"`);
        console.error("❌ [useCreateEvent] user_id invalide (type):", error);
        throw error;
      }

      validateUUIDField("user_id (depuis auth)", user_id);

      // Vérifier que user_id n'est PAS "events" ou autre valeur invalide
      const invalidUserIds = ["events", "calendar", "event", "table", "null", "undefined", ""];
      if (invalidUserIds.includes(user_id.toLowerCase())) {
        const error = new Error(`user_id contient une valeur invalide: "${user_id}". Ce doit être un UUID valide.`);
        console.error("❌ [useCreateEvent] user_id valeur invalide:", error);
        throw error;
      }

      // ========================================================================
      // ÉTAPE 2: Récupérer le company_id (SEULE SOURCE : company_users)
      // ========================================================================
      // ⚠️ NE JAMAIS utiliser de valeur depuis contexte, route, ou paramètre
      // ⚠️ TOUJOURS récupérer depuis company_users avec user_id validé
      
      const { data: companyUserData, error: companyError } = await supabase
        .from("company_users")
        .select("company_id")
        .eq("user_id", user_id)
        .limit(1)
        .maybeSingle(); // Utiliser maybeSingle() au lieu de single() pour éviter erreur si plusieurs

      if (companyError) {
        console.error("❌ [useCreateEvent] Erreur récupération company_id:", {
          error: companyError,
          code: companyError.code,
          message: companyError.message,
          user_id_used: user_id,
        });
        throw new Error("Impossible de récupérer votre entreprise. Veuillez contacter le support.");
      }

      if (!companyUserData?.company_id) {
        const error = new Error("Aucune entreprise associée à votre compte. Veuillez contacter le support.");
        console.error("❌ [useCreateEvent] Aucun company_id trouvé:", {
          companyUserData,
          user_id_used: user_id,
        });
        throw error;
      }

      // ⚠️ FORCER company_id depuis company_users UNIQUEMENT
      const company_id = companyUserData.company_id;

      console.log("✅ [useCreateEvent] Company ID récupéré depuis company_users:", {
        company_id,
        type: typeof company_id,
        length: company_id?.length,
        isString: typeof company_id === 'string',
      });

      // Validation UUID company_id STRICTE
      if (!company_id || typeof company_id !== 'string') {
        const error = new Error(`company_id invalide : type ${typeof company_id}, valeur "${company_id}"`);
        console.error("❌ [useCreateEvent] company_id invalide (type):", error);
        throw error;
      }

      validateUUIDField("company_id (depuis DB)", company_id);

      // Vérifier que company_id n'est PAS "events" ou autre valeur invalide
      const invalidCompanyIds = ["events", "calendar", "event", "table", "null", "undefined", ""];
      if (invalidCompanyIds.includes(company_id.toLowerCase())) {
        const error = new Error(`company_id contient une valeur invalide: "${company_id}". Ce doit être un UUID valide.`);
        console.error("❌ [useCreateEvent] company_id valeur invalide:", error);
        throw error;
      }

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
      // ÉTAPE 6: DEBUG EVENT PAYLOAD (OBLIGATOIRE - TRACE FORCÉE)
      // ========================================================================
      console.log("🔍 [DEBUG EVENT PAYLOAD] Valeurs AVANT insertion:", {
        user_id: insertData.user_id,
        company_id: insertData.company_id,
        title: insertData.title,
        start_date: insertData.start_date,
        all_day: insertData.all_day,
        type: insertData.type,
        color: insertData.color,
        description: insertData.description,
        location: insertData.location,
        project_id: insertData.project_id,
      });

      console.log("🔍 [DEBUG EVENT VALUES] Types et validations:", {
        user_id: {
          value: insertData.user_id,
          type: typeof insertData.user_id,
          isString: typeof insertData.user_id === 'string',
          length: insertData.user_id?.length,
          isUUID: isValidUUID(insertData.user_id),
          isEvents: insertData.user_id === "events",
          containsEvents: String(insertData.user_id).includes("events"),
        },
        company_id: {
          value: insertData.company_id,
          type: typeof insertData.company_id,
          isString: typeof insertData.company_id === 'string',
          length: insertData.company_id?.length,
          isUUID: isValidUUID(insertData.company_id),
          isEvents: insertData.company_id === "events",
          containsEvents: String(insertData.company_id).includes("events"),
        },
      });

      // ⚠️ VALIDATION UUID BLOQUANTE (OBLIGATOIRE)
      if (!isValidUUID(insertData.user_id)) {
        const error = new Error(`🚨 user_id invalide : "${insertData.user_id}" (type: ${typeof insertData.user_id}) - Insertion BLOQUÉE`);
        console.error("❌ [useCreateEvent] VALIDATION UUID ÉCHOUÉE - user_id:", {
          value: insertData.user_id,
          type: typeof insertData.user_id,
          isEvents: insertData.user_id === "events",
          full_payload: JSON.stringify(insertData, null, 2),
        });
        throw error;
      }

      if (!isValidUUID(insertData.company_id)) {
        const error = new Error(`🚨 company_id invalide : "${insertData.company_id}" (type: ${typeof insertData.company_id}) - Insertion BLOQUÉE`);
        console.error("❌ [useCreateEvent] VALIDATION UUID ÉCHOUÉE - company_id:", {
          value: insertData.company_id,
          type: typeof insertData.company_id,
          isEvents: insertData.company_id === "events",
          full_payload: JSON.stringify(insertData, null, 2),
        });
        throw error;
      }

      // ⚠️ VÉRIFICATION FINALE ABSOLUE - BLOQUER SI "events" DÉTECTÉ
      if (insertData.user_id === "events" || insertData.company_id === "events") {
        const error = new Error(`🚨 ERREUR CRITIQUE : Valeur "events" détectée dans les UUID ! user_id="${insertData.user_id}", company_id="${insertData.company_id}" - Insertion BLOQUÉE`);
        console.error("❌ [useCreateEvent] ERREUR CRITIQUE - Valeur 'events' détectée:", {
          user_id: insertData.user_id,
          company_id: insertData.company_id,
          user_id_is_events: insertData.user_id === "events",
          company_id_is_events: insertData.company_id === "events",
          full_payload: JSON.stringify(insertData, null, 2),
        });
        throw error;
      }

      // Vérifier qu'aucun champ ne contient "events" (même partiellement)
      const allValues = Object.values(insertData).map(v => String(v));
      const containsEvents = allValues.some(v => v.toLowerCase().includes("events"));
      if (containsEvents) {
        console.warn("⚠️ [useCreateEvent] ATTENTION : La valeur 'events' apparaît quelque part dans le payload:", {
          allValues,
          full_payload: JSON.stringify(insertData, null, 2),
        });
      }

      // ========================================================================
      // ÉTAPE 7: LOG ULTRA-DÉTAILLÉ AVANT INSERTION (TRACE ABSOLUE)
      // ========================================================================
      console.log("🚨 [TRACE ABSOLUE] PAYLOAD FINAL AVANT INSERTION SUPABASE:", {
        payload_complet: insertData,
        payload_stringified: JSON.stringify(insertData, null, 2),
        payload_keys: Object.keys(insertData),
        payload_values: Object.values(insertData),
        verification_uuid_fields: {
          user_id: {
            value: insertData.user_id,
            isUUID: isValidUUID(insertData.user_id),
            isEvents: insertData.user_id === "events",
            type: typeof insertData.user_id,
          },
          company_id: {
            value: insertData.company_id,
            isUUID: isValidUUID(insertData.company_id),
            isEvents: insertData.company_id === "events",
            type: typeof insertData.company_id,
          },
          project_id: insertData.project_id ? {
            value: insertData.project_id,
            isUUID: isValidUUID(insertData.project_id),
            isEvents: insertData.project_id === "events",
            type: typeof insertData.project_id,
          } : null,
        },
        // Vérifier chaque valeur individuellement
        toutes_les_valeurs: Object.entries(insertData).map(([key, value]) => ({
          key,
          value: String(value),
          type: typeof value,
          isEvents: String(value) === "events",
          containsEvents: String(value).toLowerCase().includes("events"),
        })),
      });

      // ⚠️ VÉRIFICATION FINALE ABSOLUE - BLOQUER TOUT CHAMP UUID INVALIDE
      const uuidFields = ['user_id', 'company_id', 'project_id', 'id', 'created_by', 'calendar_id'];
      for (const field of uuidFields) {
        if (field in insertData && insertData[field] !== null && insertData[field] !== undefined) {
          const value = insertData[field];
          if (typeof value === 'string') {
            // Vérifier que ce n'est pas "events" ou autre valeur invalide
            if (value.toLowerCase() === "events" || value.toLowerCase() === "calendar" || value.toLowerCase() === "event") {
              const error = new Error(`🚨 ERREUR CRITIQUE : Le champ ${field} contient la valeur invalide "${value}". Insertion BLOQUÉE.`);
              console.error("❌ [useCreateEvent] ERREUR CRITIQUE - Champ UUID invalide:", {
                field,
                value,
                full_payload: JSON.stringify(insertData, null, 2),
              });
              throw error;
            }
            // Vérifier que c'est un UUID valide
            if (!isValidUUID(value)) {
              const error = new Error(`🚨 ERREUR CRITIQUE : Le champ ${field} n'est pas un UUID valide : "${value}". Insertion BLOQUÉE.`);
              console.error("❌ [useCreateEvent] ERREUR CRITIQUE - Champ UUID invalide:", {
                field,
                value,
                full_payload: JSON.stringify(insertData, null, 2),
              });
              throw error;
            }
          }
        }
      }

      // ========================================================================
      // ÉTAPE 8: INSERTION STRICTE (SANS CHAMP id) - COLONNES EXPLICITES
      // ========================================================================
      // ⚠️ S'ASSURER QU'AUCUN CHAMP id N'EST ENVOYÉ (auto-généré par PostgreSQL)
      // ⚠️ UTILISER DES COLONNES EXPLICITES pour éviter toute injection accidentelle
      const finalPayload: Record<string, any> = {};
      
      // Construire le payload avec SEULEMENT les colonnes autorisées
      const allowedColumns = [
        'user_id',
        'company_id',
        'title',
        'start_date',
        'end_date',
        'all_day',
        'location',
        'type',
        'color',
        'description',
        'project_id',
        'reminder_minutes',
        'reminder_recurring'
      ];
      
      for (const col of allowedColumns) {
        if (col in insertData && insertData[col] !== undefined && insertData[col] !== null) {
          // Validation finale pour chaque champ UUID
          if (col.endsWith('_id')) {
            if (!isValidUUID(insertData[col])) {
              const error = new Error(`🚨 ERREUR CRITIQUE : Le champ ${col} n'est pas un UUID valide : "${insertData[col]}"`);
              console.error("❌ [useCreateEvent] Validation UUID finale échouée:", {
                field: col,
                value: insertData[col],
                full_payload: JSON.stringify(insertData, null, 2),
              });
              throw error;
            }
            // Vérifier explicitement que ce n'est pas "events"
            if (String(insertData[col]).toLowerCase() === "events") {
              const error = new Error(`🚨 ERREUR CRITIQUE : Le champ ${col} contient "events" : "${insertData[col]}"`);
              console.error("❌ [useCreateEvent] Valeur 'events' détectée dans champ UUID:", {
                field: col,
                value: insertData[col],
                full_payload: JSON.stringify(insertData, null, 2),
              });
              throw error;
            }
          }
          finalPayload[col] = insertData[col];
        }
      }

      console.log("🚨 [TRACE ABSOLUE] PAYLOAD FINAL NETTOYÉ (colonnes explicites):", {
        payload_final: finalPayload,
        payload_stringified: JSON.stringify(finalPayload, null, 2),
        colonnes_autorisees: allowedColumns,
        colonnes_utilisees: Object.keys(finalPayload),
      });

      // ⚠️ VALIDATION FINALE ABSOLUE AVANT INSERTION
      if (!isValidUUID(finalPayload.user_id)) {
        throw new Error(`🚨 user_id invalide avant insertion : "${finalPayload.user_id}"`);
      }
      if (!isValidUUID(finalPayload.company_id)) {
        throw new Error(`🚨 company_id invalide avant insertion : "${finalPayload.company_id}"`);
      }
      if (finalPayload.user_id === "events" || finalPayload.company_id === "events") {
        throw new Error(`🚨 Valeur "events" détectée avant insertion ! user_id="${finalPayload.user_id}", company_id="${finalPayload.company_id}"`);
      }

      // ⚠️ INSERTION AVEC COLONNES EXPLICITES
      const { data: event, error } = await supabase
        .from("events")
        .insert([finalPayload], {
          // Ne pas spécifier de colonnes ici, mais le payload est déjà strict
        })
        .select("*")
        .single();

      if (error) {
        console.error("❌ [useCreateEvent] Erreur insertion Supabase:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          // Log de l'objet envoyé pour debug (payload final nettoyé)
          payload_sent: JSON.stringify(finalPayload, null, 2),
          payload_original: JSON.stringify(insertData, null, 2),
        });
        throw error;
      }
      
      console.log("✅ [useCreateEvent] Événement créé avec succès:", event);

      // Synchroniser avec Google Calendar si connecté
      if (googleConnection && googleConnection.enabled && googleConnection.sync_direction !== "google_to_app") {
        try {
          await syncWithGoogle.mutateAsync({
            action: "create",
            eventId: event.id,
          });
          console.log("✅ [useCreateEvent] Événement synchronisé avec Google Calendar");
        } catch (syncError) {
          console.error("⚠️ [useCreateEvent] Erreur synchronisation Google Calendar:", syncError);
          // Ne pas bloquer la création si la sync échoue
        }
      }

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

      // Synchroniser avec Google Calendar si connecté
      if (googleConnection && googleConnection.enabled && googleConnection.sync_direction !== "google_to_app") {
        try {
          await syncWithGoogle.mutateAsync({
            action: "update",
            eventId: id,
          });
          console.log("✅ [useUpdateEvent] Événement synchronisé avec Google Calendar");
        } catch (syncError) {
          console.error("⚠️ [useUpdateEvent] Erreur synchronisation Google Calendar:", syncError);
          // Ne pas bloquer la mise à jour si la sync échoue
        }
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
  const { data: googleConnection } = useGoogleCalendarConnection();
  const syncWithGoogle = useSyncEventWithGoogle();

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

      // Synchroniser avec Google Calendar si connecté
      if (googleConnection && googleConnection.enabled && googleConnection.sync_direction !== "google_to_app") {
        try {
          await syncWithGoogle.mutateAsync({
            action: "delete",
            eventId: id,
          });
          console.log("✅ [useDeleteEvent] Événement supprimé de Google Calendar");
        } catch (syncError) {
          console.error("⚠️ [useDeleteEvent] Erreur synchronisation Google Calendar:", syncError);
          // Ne pas bloquer la suppression si la sync échoue
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
};
