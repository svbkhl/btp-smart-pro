import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { queryWithTimeout } from "@/utils/queryWithTimeout";
import { FAKE_EMPLOYEES_RH, FAKE_CANDIDATURES, FAKE_TACHES_RH, FAKE_RH_ACTIVITIES, FAKE_RH_STATS } from "@/fakeData/rh";

// =====================================================
// TYPES
// =====================================================

export interface Team {
  id: string;
  name: string;
  description?: string;
  team_leader_id?: string;
  created_at: string;
  updated_at: string;
}

interface BaseEmployee {
  id: string;
  user_id: string;
  nom: string;
  prenom: string;
  email?: string;
  poste: string;
  specialites?: string[];
}

export interface EmployeeRH extends BaseEmployee {
  team_id?: string;
  statut: "actif" | "inactif" | "congé" | "suspension";
  date_entree?: string;
  date_fin_contrat?: string;
  telephone?: string;
  adresse?: string;
  salaire_base?: number;
  team?: Team;
}

export interface Candidature {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  poste_souhaite: string;
  cv_url?: string;
  lettre_motivation?: string;
  statut: "en_attente" | "entretien" | "accepte" | "refuse" | "archive";
  score_correspondance: number;
  notes_internes?: string;
  date_candidature: string;
  date_entretien?: string;
  recruteur_id?: string;
  created_at: string;
  updated_at: string;
}

export interface TacheRH {
  id: string;
  titre: string;
  description?: string;
  type_tache: "validation" | "entretien" | "mise_a_jour" | "formation" | "autre";
  priorite: "basse" | "moyenne" | "haute" | "urgente";
  statut: "en_cours" | "en_attente" | "termine" | "annule";
  assigne_a?: string;
  employee_id?: string;
  candidature_id?: string;
  date_echeance?: string;
  date_completion?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Performance {
  id: string;
  employee_id: string;
  periode_debut: string;
  periode_fin: string;
  taux_presence: number;
  taux_ponctualite: number;
  productivite_score: number;
  nombre_absences: number;
  nombre_retards: number;
  heures_travaillees: number;
  notes?: string;
  evaluated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface RHActivity {
  id: string;
  type_activite: "candidature" | "contrat" | "absence" | "formation" | "evaluation" | "tache" | "autre";
  titre: string;
  description?: string;
  employee_id?: string;
  candidature_id?: string;
  tache_id?: string;
  created_by?: string;
  created_at: string;
}

// =====================================================
// HOOKS POUR EMPLOYÉS
// =====================================================

export const useEmployeesRH = () => {
  return useQuery({
    queryKey: ["employees-rh"],
    queryFn: async () => {
      return queryWithTimeout(
        async () => {
          try {
            const { data, error } = await supabase
              .from("employees" as any)
              .select("*")
              .order("created_at", { ascending: false });

            if (error) {
              // En cas d'erreur, queryWithTimeout retournera automatiquement FAKE_EMPLOYEES_RH
              throw error;
            }
            
            // Récupérer tous les admins (utilisateurs avec rôle administrateur)
            const { data: adminRoles } = await supabase
              .from("user_roles")
              .select("user_id")
              .eq("role", "administrateur");

            const adminUserIds = new Set(
              (adminRoles || []).map((r: any) => r.user_id)
            );

            // Filtrer pour exclure les admins
            const filteredData = (data || []).filter(
              (emp: any) => !adminUserIds.has(emp.user_id)
            );
            
            // Mapper les données avec les valeurs par défaut pour les colonnes RH
            const mapped = filteredData.map((emp: any) => ({
              ...emp,
              statut: emp.statut || "actif",
              team_id: emp.team_id || null,
              date_entree: emp.date_entree || null,
              date_fin_contrat: emp.date_fin_contrat || null,
              telephone: emp.telephone || null,
              adresse: emp.adresse || null,
              salaire_base: emp.salaire_base || null,
            })) as EmployeeRH[];

            // Si tableau vide, queryWithTimeout retournera automatiquement FAKE_EMPLOYEES_RH
            return mapped;
          } catch (error) {
            // En cas d'erreur, queryWithTimeout retournera automatiquement FAKE_EMPLOYEES_RH
            throw error;
          }
        },
        FAKE_EMPLOYEES_RH,
        "useEmployeesRH"
      );
    },
    retry: 1,
    staleTime: 30000,
    gcTime: 300000,
    throwOnError: false, // Ne pas bloquer l'UI en cas d'erreur
  });
};

export const useEmployeeRH = (id: string) => {
  return useQuery({
    queryKey: ["employee-rh", id],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("employees" as any)
          .select("*")
          .eq("id", id)
          .single();

        if (error) {
          return null;
        }
        
        // Mapper avec valeurs par défaut
        return {
          ...data,
          statut: data?.statut || "actif",
          team_id: data?.team_id || null,
          date_entree: data?.date_entree || null,
          date_fin_contrat: data?.date_fin_contrat || null,
          telephone: data?.telephone || null,
          adresse: data?.adresse || null,
          salaire_base: data?.salaire_base || null,
        } as EmployeeRH;
      } catch (error) {
        return null;
      }
    },
    enabled: !!id,
    retry: 1,
    staleTime: 30000,
  });
};

// =====================================================
// HOOKS POUR CANDIDATURES
// =====================================================

export const useCandidatures = (statut?: string) => {
  return useQuery({
    queryKey: ["candidatures", statut],
    queryFn: async () => {
      return queryWithTimeout(
        async () => {
          try {
            let query = supabase
              .from("candidatures" as any)
              .select("*")
              .order("date_candidature", { ascending: false ,
    throwOnError: false,
  });

            if (statut) {
              query = query.eq("statut", statut);
            }

            const { data, error } = await query;
            if (error) {
              // En cas d'erreur, queryWithTimeout retournera automatiquement FAKE_CANDIDATURES
              throw error;
            }
            const candidatures = (data || []) as Candidature[];
            // Si tableau vide, queryWithTimeout retournera automatiquement FAKE_CANDIDATURES
            return candidatures;
          } catch (error) {
            // En cas d'erreur, queryWithTimeout retournera automatiquement FAKE_CANDIDATURES
            throw error;
          }
        },
        statut ? FAKE_CANDIDATURES.filter(c => c.statut === statut) : FAKE_CANDIDATURES,
        "useCandidatures"
      );
    },
    retry: 1,
    staleTime: 30000,
    gcTime: 300000,
  });
};

export const useCreateCandidature = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (candidature: Partial<Candidature>) => {
      const { data, error } = await supabase
        .from("candidatures" as any)
        .insert(candidature)
        .select()
        .single();

      if (error) throw error;

      // Créer une activité RH
      await supabase.from("rh_activities" as any).insert({
        type_activite: "candidature",
        titre: `Nouvelle candidature de ${candidature.prenom} ${candidature.nom}`,
        description: `Candidature pour le poste de ${candidature.poste_souhaite}`,
        candidature_id: data.id,
      });

      return data as Candidature;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidatures"] });
      queryClient.invalidateQueries({ queryKey: ["rh-activities"] });
      toast({
        title: "Candidature créée",
        description: "La candidature a été enregistrée avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la création de la candidature",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateCandidature = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Candidature> & { id: string }) => {
      const { data, error } = await supabase
        .from("candidatures" as any)
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Candidature;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidatures"] });
      queryClient.invalidateQueries({ queryKey: ["rh-activities"] });
      toast({
        title: "Candidature mise à jour",
        description: "Les modifications ont été enregistrées.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la mise à jour",
        variant: "destructive",
      });
    },
  });
};

// =====================================================
// HOOKS POUR TÂCHES RH
// =====================================================

export const useTachesRH = (statut?: string) => {
  return useQuery({
    queryKey: ["taches-rh", statut],
    queryFn: async () => {
      return queryWithTimeout(
        async () => {
          try {
            let query = supabase
              .from("taches_rh" as any)
              .select("*")
              .order("created_at", { ascending: false ,
    throwOnError: false,
  });

            if (statut) {
              query = query.eq("statut", statut);
            }

            const { data, error } = await query;
            if (error) {
              // En cas d'erreur, queryWithTimeout retournera automatiquement FAKE_TACHES_RH
              throw error;
            }
            const taches = (data || []) as TacheRH[];
            // Si tableau vide, queryWithTimeout retournera automatiquement FAKE_TACHES_RH
            return taches;
          } catch (error) {
            // En cas d'erreur, queryWithTimeout retournera automatiquement FAKE_TACHES_RH
            throw error;
          }
        },
        statut ? FAKE_TACHES_RH.filter(t => t.statut === statut) : FAKE_TACHES_RH,
        "useTachesRH"
      );
    },
    retry: 1,
    staleTime: 30000,
    gcTime: 300000,
  });
};

export const useCreateTacheRH = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (tache: Partial<TacheRH>) => {
      const { data: { user } } = await supabase.auth.getSession();
      const { data, error } = await supabase
        .from("taches_rh" as any)
        .insert({
          ...tache,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Créer une activité RH
      await supabase.from("rh_activities" as any).insert({
        type_activite: "tache",
        titre: `Nouvelle tâche : ${tache.titre}`,
        description: tache.description,
        tache_id: data.id,
        employee_id: tache.employee_id,
      });

      return data as TacheRH;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taches-rh"] });
      queryClient.invalidateQueries({ queryKey: ["rh-activities"] });
      toast({
        title: "Tâche créée",
        description: "La tâche RH a été créée avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la création de la tâche",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateTacheRH = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TacheRH> & { id: string }) => {
      const updateData: any = { ...updates };
      
      // Si la tâche est terminée, ajouter la date de completion
      if (updates.statut === "termine" && !updates.date_completion) {
        updateData.date_completion = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("taches_rh" as any)
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as TacheRH;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taches-rh"] });
      queryClient.invalidateQueries({ queryKey: ["rh-activities"] });
      toast({
        title: "Tâche mise à jour",
        description: "Les modifications ont été enregistrées.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la mise à jour",
        variant: "destructive",
      });
    },
  });
};

// =====================================================
// HOOKS POUR STATISTIQUES RH
// =====================================================

export const useRHStats = () => {
  return useQuery({
    queryKey: ["rh-stats"],
    queryFn: async () => {
      return queryWithTimeout(
        async () => {
          try {
            // Nombre total d'employés
            const { count: totalEmployees, error: employeesError } = await supabase
              .from("employees" as any)
              .select("*", { count: "exact", head: true });

            if (employeesError) {
              const { isFakeDataEnabled } = await import("@/utils/queryWithTimeout");
              if (isFakeDataEnabled()) {
                return FAKE_RH_STATS;
              }
              throw employeesError;
            }

            // Nombre d'employés actifs (si la colonne statut existe)
            let activeEmployees = 0;
            try {
              const { count, error: activeError } = await supabase
                .from("employees" as any)
                .select("*", { count: "exact", head: true })
                .eq("statut", "actif");
              
              if (!activeError) {
                activeEmployees = count || 0;
              } else {
                // Si la colonne statut n'existe pas, considérer tous les employés comme actifs
                activeEmployees = totalEmployees || 0;
              }
            } catch (e) {
              activeEmployees = totalEmployees || 0;
            }

            // Candidatures actives (gérer l'erreur si la table n'existe pas)
            let activeCandidatures = 0;
            try {
              const { count, error: candidaturesError } = await supabase
                .from("candidatures" as any)
                .select("*", { count: "exact", head: true })
                .in("statut", ["en_attente", "entretien"]);
              
              if (!candidaturesError) {
                activeCandidatures = count || 0;
              }
            } catch (e) {
              // Table n'existe pas encore
              activeCandidatures = 0;
            }

            // Tâches RH (gérer l'erreur si la table n'existe pas)
            let totalTaches = 0;
            let completedTaches = 0;
            try {
              const { count: total, error: tachesError } = await supabase
                .from("taches_rh" as any)
                .select("*", { count: "exact", head: true });
              
              if (!tachesError) {
                totalTaches = total || 0;

                const { count: completed, error: completedError } = await supabase
                  .from("taches_rh" as any)
                  .select("*", { count: "exact", head: true })
                  .eq("statut", "termine");
                
                if (!completedError) {
                  completedTaches = completed || 0;
                }
              }
            } catch (e) {
              // Table n'existe pas encore
              totalTaches = 0;
              completedTaches = 0;
            }

            // Calculer les pourcentages
            const tauxPresence = totalEmployees && totalEmployees > 0 
              ? parseFloat(((activeEmployees / totalEmployees) * 100).toFixed(1))
              : 0;
            
            const tauxCompletion = totalTaches && totalTaches > 0
              ? parseFloat(((completedTaches / totalTaches) * 100).toFixed(1))
              : 0;

            const stats = {
              totalEmployees: totalEmployees || 0,
              activeEmployees: activeEmployees || 0,
              tauxPresence,
              activeCandidatures,
              totalTaches,
              completedTaches,
              tauxCompletion,
            };

            // Retourner les stats calculées
            // Si toutes les stats sont à 0, queryWithTimeout retournera automatiquement FAKE_RH_STATS
            return stats;
          } catch (error) {
            // En cas d'erreur, queryWithTimeout retournera automatiquement FAKE_RH_STATS
            throw error;
          }
        },
        FAKE_RH_STATS,
        "useRHStats"
      );
    },
    retry: 1,
    staleTime: 30000,
    gcTime: 300000,
    throwOnError: false, // Ne pas bloquer l'UI en cas d'erreur
  });
};

// =====================================================
// HOOKS POUR ACTIVITÉS RH
// =====================================================

export const useRHActivities = (limit: number = 10) => {
  return useQuery({
    queryKey: ["rh-activities", limit],
    queryFn: async () => {
      return queryWithTimeout(
        async () => {
          try {
            const { data, error } = await supabase
              .from("rh_activities" as any)
              .select("*")
              .order("created_at", { ascending: false })
              .limit(limit);

            if (error) {
              // En cas d'erreur, queryWithTimeout retournera automatiquement FAKE_RH_ACTIVITIES
              throw error;
            }
            const activities = (data || []) as RHActivity[];
            // Si tableau vide, queryWithTimeout retournera automatiquement FAKE_RH_ACTIVITIES
            return activities;
          } catch (error) {
            // En cas d'erreur, queryWithTimeout retournera automatiquement FAKE_RH_ACTIVITIES
            throw error;
          }
        },
        FAKE_RH_ACTIVITIES.slice(0, limit),
        "useRHActivities"
      );
    },
    retry: 1,
    staleTime: 30000,
    gcTime: 300000,
    throwOnError: false, // Ne pas bloquer l'UI en cas d'erreur
  });
};

// =====================================================
// HOOKS POUR PERFORMANCES
// =====================================================

export const useEmployeePerformances = (employeeId?: string) => {
  return useQuery({
    queryKey: ["employee-performances", employeeId],
    queryFn: async () => {
      let query = supabase
        .from("employee_performances" as any)
        .select("*")
        .order("periode_debut", { ascending: false ,
    throwOnError: false,
  });

      if (employeeId) {
        query = query.eq("employee_id", employeeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Performance[];
    },
    enabled: !!employeeId,
  });
};

