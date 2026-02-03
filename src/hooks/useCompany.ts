import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Company {
  id: string;
  name: string;
  plan: "basic" | "pro" | "enterprise" | "custom";
  features: {
    planning?: boolean;
    facturation?: boolean;
    devis?: boolean;
    projets?: boolean;
    documents?: boolean;
    messagerie?: boolean;
    ia_assistant?: boolean;
    employes?: boolean;
  };
  settings: {
    color_theme?: string;
    logo_url?: string;
    menu_items?: string[];
  };
  support_level: 0 | 1 | 2;
  status: "active" | "suspended" | "no_support";
  created_at: string;
  updated_at: string;
}

export interface CompanyUser {
  id: string;
  company_id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  created_at: string;
}

/**
 * Récupère toutes les companies de l'utilisateur connecté
 */
export const useCompanies = () => {
  const { user } = useAuth();

  return useQuery<Company[], Error>({
    queryKey: ["companies", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Récupérer toutes les companies de l'utilisateur
      const { data: companyUsers, error: companyUserError } = await supabase
        .from("company_users")
        .select("company_id, role")
        .eq("user_id", user.id);

      // Gérer le cas où la table n'existe pas ou erreur RLS
      if (companyUserError) {
        if (
          companyUserError.code === "42P01" ||
          companyUserError.message?.includes("does not exist") ||
          companyUserError.message?.includes("relation") ||
          companyUserError.code === "42501"
        ) {
          console.warn("⚠️ Table company_users n'existe pas ou erreur RLS. Exécutez COMPLETE-COMPANIES-SYSTEM-REBUILD.sql");
          return [];
        }
        console.warn("⚠️ Erreur lors de la récupération des companies:", companyUserError);
        return [];
      }

      if (!companyUsers || companyUsers.length === 0) {
        // L'utilisateur n'a pas de company assignée, ce n'est pas une erreur
        return [];
      }

      // Récupérer les détails de toutes les companies
      const companyIds = companyUsers.map(cu => cu.company_id);
      const { data: companies, error: companyError } = await supabase
        .from("companies")
        .select("*")
        .in("id", companyIds);

      if (companyError) {
        // Si la table n'existe pas, retourner un tableau vide gracieusement
        if (
          companyError.code === "42P01" ||
          companyError.message?.includes("does not exist") ||
          companyError.message?.includes("relation") ||
          companyError.code === "PGRST116"
        ) {
          console.warn("⚠️ Table companies n'existe pas encore");
          return [];
        }
        console.error("❌ Error fetching companies:", companyError);
        throw companyError;
      }

      return (companies || []) as Company[];
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes - Cache modéré pour afficher les modifications rapidement
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
};

/**
 * Récupère la première company de l'utilisateur connecté (pour compatibilité)
 */
export const useCompany = () => {
  const { data: companies } = useCompanies();
  return { data: companies && companies.length > 0 ? companies[0] : null };
};

/**
 * Récupère toutes les companies (admin seulement)
 */
export const useAllCompanies = () => {
  const { user, isAdmin } = useAuth();

  return useQuery<Company[], Error>({
    queryKey: ["all_companies"],
    queryFn: async () => {
      if (!user || !isAdmin) {
        throw new Error("Unauthorized");
      }

      try {
        const { data, error } = await supabase
          .from("companies")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          // Si la table n'existe pas (code 42P01 ou message contenant "does not exist")
          if (
            error.code === "42P01" ||
            error.message?.includes("does not exist") ||
            error.message?.includes("relation") ||
            error.code === "PGRST116"
          ) {
            console.warn("⚠️ Table companies n'existe pas encore. Exécutez le script CREATE-COMPANIES-SYSTEM.sql");
            return [];
          }
          console.error("❌ Error fetching companies:", error);
          throw error;
        }

        return (data || []) as Company[];
      } catch (err: any) {
        // Gérer les erreurs de manière gracieuse
        if (
          err?.code === "42P01" ||
          err?.message?.includes("does not exist") ||
          err?.message?.includes("relation")
        ) {
          console.warn("⚠️ Table companies n'existe pas encore");
          return [];
        }
        throw err;
      }
    },
    enabled: !!user && !!isAdmin,
    retry: false, // Ne pas réessayer si la table n'existe pas
    throwOnError: false, // Ne pas bloquer l'UI
  });
};

/**
 * Met à jour une company
 */
export const useUpdateCompany = () => {
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuth();

  return useMutation({
    mutationFn: async ({
      companyId,
      updates,
    }: {
      companyId: string;
      updates: Partial<Company>;
    }) => {
      if (!user || !isAdmin) {
        throw new Error("Unauthorized");
      }

      const { data, error } = await supabase
        .from("companies")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", companyId)
        .select()
        .single();

      if (error) {
        // Vérifier si la table n'existe pas
        if (
          error.code === "42P01" ||
          error.message?.includes("does not exist") ||
          error.message?.includes("relation")
        ) {
          throw new Error("La table companies n'existe pas encore. Exécutez le script CREATE-COMPANIES-SYSTEM.sql dans Supabase.");
        }
        console.error("❌ Error updating company:", error);
        throw error;
      }

      return data as Company;
    },
    onSuccess: () => {
      // Invalider TOUS les caches liés aux entreprises pour affichage immédiat
      queryClient.invalidateQueries({ queryKey: ["company"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["all_companies"] });
    },
  });
};

/**
 * Crée une nouvelle company
 */
export const useCreateCompany = () => {
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuth();

  return useMutation({
    mutationFn: async (companyData: {
      name: string;
      plan?: Company["plan"];
      features?: Company["features"];
      settings?: Company["settings"];
      support_level?: Company["support_level"];
    }) => {
      if (!user || !isAdmin) {
        throw new Error("Unauthorized");
      }

      console.log("🔄 Insertion dans Supabase...", {
        name: companyData.name,
        plan: companyData.plan || "custom",
        features: companyData.features || {},
        settings: companyData.settings || {},
        support_level: companyData.support_level || 0,
        status: "active",
      });

      // Récupérer l'utilisateur actuel pour définir owner_id
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("companies")
        .insert({
          name: companyData.name,
          owner_id: currentUser?.id || null,
          plan: companyData.plan || "custom",
          features: companyData.features || {},
          settings: companyData.settings || {},
          support_level: companyData.support_level || 0,
          status: "active",
        })
        .select()
        .single();

      if (error) {
        // Vérifier si la table n'existe pas
        if (
          error.code === "42P01" ||
          error.message?.includes("does not exist") ||
          error.message?.includes("relation") ||
          error.message?.includes("La table companies n'existe pas")
        ) {
          throw new Error("La table companies n'existe pas encore. Veuillez exécuter le script FIX-ALL-TABLES-URGENT.sql dans Supabase Dashboard → SQL Editor.");
        }
        // Vérifier si c'est une erreur RLS
        if (error.code === "42501" || error.message?.includes("permission denied") || error.message?.includes("new row violates")) {
          console.error("❌ Erreur RLS lors de la création:", error);
          throw new Error("Permission refusée. Assurez-vous d'être administrateur et d'avoir exécuté le script FIX-RLS-CREATE-COMPANIES.sql");
        }
        console.error("❌ Error creating company:", error);
        throw error;
      }

      console.log("✅ Entreprise créée:", data);

      return data as Company;
    },
    onSuccess: () => {
      // Invalider TOUS les caches liés aux entreprises
      queryClient.invalidateQueries({ queryKey: ["company"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["all_companies"] });
    },
  });
};

/**
 * Supprime une company (admin seulement)
 */
export const useDeleteCompany = () => {
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuth();

  return useMutation({
    mutationFn: async (companyId: string) => {
      if (!user || !isAdmin) {
        throw new Error("Unauthorized");
      }

      const { error } = await supabase
        .from("companies")
        .delete()
        .eq("id", companyId);

      if (error) {
        // Vérifier si la table n'existe pas
        if (
          error.code === "42P01" ||
          error.message?.includes("does not exist") ||
          error.message?.includes("relation")
        ) {
          throw new Error("La table companies n'existe pas encore. Exécutez le script CREATE-COMPANIES-SYSTEM.sql dans Supabase.");
        }
        console.error("❌ Error deleting company:", error);
        throw error;
      }

      return companyId;
    },
    onSuccess: () => {
      // Invalider TOUS les caches liés aux entreprises
      queryClient.invalidateQueries({ queryKey: ["company"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["all_companies"] });
    },
  });
};

/**
 * Vérifie si une feature est activée pour la company de l'utilisateur
 */
export const useIsFeatureEnabled = (featureName: keyof Company["features"]) => {
  const { data: company } = useCompany();

  return company?.features?.[featureName] === true;
};

/**
 * Vérifie le niveau de support de la company
 */
export const useSupportLevel = () => {
  const { data: company } = useCompany();

  return company?.support_level || 0;
};

