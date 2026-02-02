import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";

/**
 * Hook pour synchroniser automatiquement les affectations de planning avec le calendrier
 * Crée, met à jour ou supprime un événement dans le calendrier quand une affectation change
 */

interface SyncPlanningToCalendarParams {
  assignmentId: string;
  action: "create" | "update" | "delete";
}

interface Assignment {
  id: string;
  employee_id: string;
  project_id?: string;
  title?: string;
  jour: string;
  date: string;
  heures: number;
  heure_debut?: string;
  heure_fin?: string;
  project?: {
    name: string;
    location?: string;
  };
  linked_event_id?: string; // ID de l'événement lié dans le calendrier
}

export const useSyncPlanningToCalendar = () => {
  const { user, currentCompanyId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ assignmentId, action }: SyncPlanningToCalendarParams) => {
      console.log(`🔄 [SyncPlanningToCalendar] Action: ${action}, Assignment ID: ${assignmentId}`);

      if (!user || !currentCompanyId) {
        throw new Error("Utilisateur non connecté ou pas de company_id");
      }

      // Récupérer l'affectation complète avec les infos du projet
      const { data: assignment, error: fetchError } = await supabase
        .from("employee_assignments")
        .select(`
          *,
          projects:project_id (
            id,
            name,
            location
          )
        `)
        .eq("id", assignmentId)
        .single();

      if (fetchError) {
        console.error("❌ [SyncPlanningToCalendar] Erreur récupération affectation:", fetchError);
        throw fetchError;
      }

      const assignmentData = assignment as any;

      if (action === "delete") {
        // Supprimer l'événement lié s'il existe
        if (assignmentData.linked_event_id) {
          const { error: deleteError } = await supabase
            .from("events")
            .delete()
            .eq("id", assignmentData.linked_event_id);

          if (deleteError) {
            console.error("❌ [SyncPlanningToCalendar] Erreur suppression événement:", deleteError);
          } else {
            console.log("✅ [SyncPlanningToCalendar] Événement supprimé du calendrier");
          }
        }
        return { success: true, action: "delete" };
      }

      // Préparer les données de l'événement
      const projectName = assignmentData.projects?.name || assignmentData.title || "Affectation";
      const location = assignmentData.projects?.location || "";

      // Calculer les dates de début et fin
      const dateStr = assignmentData.date; // Format YYYY-MM-DD
      let startDate: string;
      let endDate: string;

      if (assignmentData.heure_debut && assignmentData.heure_fin) {
        // Si on a des horaires précis
        startDate = `${dateStr}T${assignmentData.heure_debut}:00`;
        endDate = `${dateStr}T${assignmentData.heure_fin}:00`;
      } else {
        // Sinon, créer un événement journée complète (8h-17h par défaut)
        startDate = `${dateStr}T08:00:00`;
        const heures = assignmentData.heures || 8;
        const endHour = 8 + heures;
        endDate = `${dateStr}T${endHour.toString().padStart(2, '0')}:00:00`;
      }

      const eventData = {
        user_id: user.id,
        company_id: currentCompanyId,
        project_id: assignmentData.project_id || null,
        title: `🏗️ Chantier: ${projectName}`,
        description: `Affectation de travail\n\n📍 Lieu: ${location || "Non spécifié"}\n⏰ Durée: ${assignmentData.heures}h\n\nCet événement est synchronisé automatiquement depuis vos affectations de chantier.`,
        start_date: startDate,
        end_date: endDate,
        all_day: false,
        location: location || null,
        type: "task" as const,
        color: "#f59e0b", // Orange pour les chantiers
        reminder_minutes: 720, // Rappel 12h avant (le soir pour le lendemain)
      };

      if (action === "create" || !assignmentData.linked_event_id) {
        // Créer un nouvel événement
        const { data: newEvent, error: createError } = await supabase
          .from("events")
          .insert(eventData)
          .select("id")
          .single();

        if (createError) {
          console.error("❌ [SyncPlanningToCalendar] Erreur création événement:", createError);
          throw createError;
        }

        // Mettre à jour l'affectation avec le linked_event_id
        const { error: updateAssignmentError } = await supabase
          .from("employee_assignments")
          .update({ linked_event_id: newEvent.id })
          .eq("id", assignmentId);

        if (updateAssignmentError) {
          console.error("❌ [SyncPlanningToCalendar] Erreur mise à jour linked_event_id:", updateAssignmentError);
        }

        console.log("✅ [SyncPlanningToCalendar] Événement créé dans le calendrier:", newEvent.id);
        return { success: true, action: "create", eventId: newEvent.id };
      } else {
        // Mettre à jour l'événement existant
        const { error: updateError } = await supabase
          .from("events")
          .update(eventData)
          .eq("id", assignmentData.linked_event_id);

        if (updateError) {
          console.error("❌ [SyncPlanningToCalendar] Erreur mise à jour événement:", updateError);
          throw updateError;
        }

        console.log("✅ [SyncPlanningToCalendar] Événement mis à jour dans le calendrier");
        return { success: true, action: "update", eventId: assignmentData.linked_event_id };
      }
    },
    onSuccess: (data) => {
      // Invalider les caches pour rafraîchir les données
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["employee_assignments"] });
      
      console.log("✅ [SyncPlanningToCalendar] Synchronisation réussie:", data);
    },
    onError: (error: any) => {
      console.error("❌ [SyncPlanningToCalendar] Erreur de synchronisation:", error);
      toast({
        title: "Erreur de synchronisation",
        description: "L'affectation n'a pas pu être synchronisée avec le calendrier.",
        variant: "destructive",
      });
    },
  });
};
