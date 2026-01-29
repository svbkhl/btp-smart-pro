import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCompanyId } from "./useCompanyId";
import { useToast } from "@/components/ui/use-toast";
import { QUERY_CONFIG } from "@/utils/reactQueryConfig";
import { logger } from "@/utils/logger";
import type { TextSnippet, CreateTextSnippetData, UpdateTextSnippetData, TextSuggestion } from "@/types/textLibrary";

// Hook pour récupérer tous les snippets de texte
export const useTextSnippets = () => {
  const { user } = useAuth();
  const { companyId, isLoading: isLoadingCompanyId } = useCompanyId();

  return useQuery({
    queryKey: ["text-snippets", companyId],
    queryFn: async () => {
      if (!user || !companyId) {
        logger.warn("useTextSnippets: No user or company_id");
        return [];
      }

      const { data, error } = await supabase
        .from("text_snippets")
        .select("*")
        .eq("company_id", companyId)
        .order("usage_count", { ascending: false }); // Les plus utilisés en premier

      // Table absente ou inaccessible : signaler pour afficher le message de migration
      if (error) {
        const msg = (error as any)?.message || "";
        const code = (error as any)?.code;
        if (
          code === "PGRST204" ||
          (msg.includes("relation") && msg.includes("does not exist")) ||
          msg.includes("Could not find")
        ) {
          logger.warn("useTextSnippets: table text_snippets absente ou non accessible", { code, message: msg });
          throw new Error("TABLE_TEXT_SNIPPETS_MISSING");
        }
        throw error;
      }
      return (data || []) as TextSnippet[];
    },
    enabled: !!user && !isLoadingCompanyId && !!companyId,
    ...QUERY_CONFIG.MODERATE,
  });
};

// Hook pour créer un snippet
export const useCreateTextSnippet = () => {
  const { user } = useAuth();
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateTextSnippetData) => {
      if (!user || !companyId) throw new Error("User not authenticated");

      const { data: snippet, error } = await supabase
        .from("text_snippets")
        .insert({
          ...data,
          user_id: user.id,
          company_id: companyId,
          usage_count: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return snippet as TextSnippet;
    },
    onMutate: async (newSnippet) => {
      await queryClient.cancelQueries({ queryKey: ["text-snippets", companyId] });
      
      const previousSnippets = queryClient.getQueryData<TextSnippet[]>(["text-snippets", companyId]);
      
      if (previousSnippets && user && companyId) {
        const tempSnippet: TextSnippet = {
          id: `temp-${Date.now()}`,
          user_id: user.id,
          company_id: companyId,
          category: newSnippet.category,
          title: newSnippet.title,
          content: newSnippet.content,
          tags: newSnippet.tags,
          usage_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        queryClient.setQueryData<TextSnippet[]>(
          ["text-snippets", companyId],
          [tempSnippet, ...previousSnippets]
        );
      }
      
      return { previousSnippets };
    },
    onSuccess: (createdSnippet) => {
      queryClient.setQueryData<TextSnippet[]>(
        ["text-snippets", companyId],
        (old) => {
          if (!old) return [createdSnippet];
          return old.map(s => s.id.startsWith('temp-') ? createdSnippet : s);
        }
      );
      
      toast({
        title: "Phrase enregistrée",
        description: "Ce texte est maintenant disponible pour réutilisation.",
      });
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousSnippets) {
        queryClient.setQueryData(["text-snippets", companyId], context.previousSnippets);
      }
      
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// Hook pour mettre à jour un snippet
export const useUpdateTextSnippet = () => {
  const { user } = useAuth();
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateTextSnippetData) => {
      if (!user || !companyId) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("text_snippets")
        .update(updates)
        .eq("id", id)
        .eq("company_id", companyId)
        .select()
        .single();

      if (error) throw error;
      return data as TextSnippet;
    },
    onMutate: async (updateData) => {
      const { id, ...updates } = updateData;
      
      await queryClient.cancelQueries({ queryKey: ["text-snippets", companyId] });
      
      const previousSnippets = queryClient.getQueryData<TextSnippet[]>(["text-snippets", companyId]);
      
      if (previousSnippets) {
        queryClient.setQueryData<TextSnippet[]>(
          ["text-snippets", companyId],
          previousSnippets.map(s =>
            s.id === id ? { ...s, ...updates, updated_at: new Date().toISOString() } : s
          )
        );
      }
      
      return { previousSnippets };
    },
    onSuccess: (updatedSnippet) => {
      queryClient.setQueryData<TextSnippet[]>(
        ["text-snippets", companyId],
        (old) => old?.map(s => s.id === updatedSnippet.id ? updatedSnippet : s)
      );
      
      toast({
        title: "Phrase mise à jour",
        description: "Les modifications ont été enregistrées.",
      });
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousSnippets) {
        queryClient.setQueryData(["text-snippets", companyId], context.previousSnippets);
      }
      
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// Hook pour supprimer un snippet
export const useDeleteTextSnippet = () => {
  const { user } = useAuth();
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user || !companyId) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("text_snippets")
        .delete()
        .eq("id", id)
        .eq("company_id", companyId);

      if (error) throw error;
      return id;
    },
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ["text-snippets", companyId] });
      
      const previousSnippets = queryClient.getQueryData<TextSnippet[]>(["text-snippets", companyId]);
      
      if (previousSnippets) {
        queryClient.setQueryData<TextSnippet[]>(
          ["text-snippets", companyId],
          previousSnippets.filter(s => s.id !== deletedId)
        );
      }
      
      return { previousSnippets };
    },
    onSuccess: () => {
      toast({
        title: "Phrase supprimée",
        description: "Le texte a été supprimé de votre bibliothèque.",
      });
    },
    onError: (error: Error, _deletedId, context) => {
      if (context?.previousSnippets) {
        queryClient.setQueryData(["text-snippets", companyId], context.previousSnippets);
      }
      
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// Hook pour incrémenter l'utilisation d'un snippet
export const useIncrementSnippetUsage = () => {
  const queryClient = useQueryClient();
  const { companyId } = useCompanyId();

  return useMutation({
    mutationFn: async (id: string) => {
      // Incrémenter usage_count et mettre à jour last_used_at
      const { data, error } = await supabase.rpc('increment_snippet_usage', {
        snippet_id: id
      });

      if (error) {
        // Fallback si la fonction RPC n'existe pas encore
        const { data: snippet, error: fetchError } = await supabase
          .from("text_snippets")
          .select("usage_count")
          .eq("id", id)
          .single();

        if (fetchError) throw fetchError;

        const { error: updateError } = await supabase
          .from("text_snippets")
          .update({
            usage_count: (snippet.usage_count || 0) + 1,
            last_used_at: new Date().toISOString(),
          })
          .eq("id", id);

        if (updateError) throw updateError;
      }

      return id;
    },
    onSuccess: (usedId) => {
      // Mettre à jour le cache optimistiquement
      queryClient.setQueryData<TextSnippet[]>(
        ["text-snippets", companyId],
        (old) => old?.map(s => s.id === usedId ? {
          ...s,
          usage_count: (s.usage_count || 0) + 1,
          last_used_at: new Date().toISOString()
        } : s)
      );
    },
  });
};

// Hook pour obtenir des suggestions intelligentes de texte
export const useTextSuggestions = (context: string, category?: TextSnippet['category']) => {
  const { data: snippets = [] } = useTextSnippets();

  // Fonction pour calculer la pertinence d'un snippet
  const calculateRelevance = (snippet: TextSnippet, searchContext: string): number => {
    let score = 0;
    
    // Filtrer par catégorie si spécifié
    if (category && snippet.category !== category) return 0;
    
    // Points pour les mots-clés communs
    const contextWords = searchContext.toLowerCase().split(' ').filter(w => w.length > 3);
    const snippetWords = (snippet.content + ' ' + snippet.title).toLowerCase().split(' ');
    
    contextWords.forEach(word => {
      if (snippetWords.some(sw => sw.includes(word) || word.includes(sw))) {
        score += 0.2;
      }
    });
    
    // Points pour les tags correspondants
    if (snippet.tags) {
      contextWords.forEach(word => {
        if (snippet.tags!.some(tag => tag.toLowerCase().includes(word))) {
          score += 0.3;
        }
      });
    }
    
    // Bonus pour les snippets souvent utilisés
    if (snippet.usage_count > 5) score += 0.1;
    if (snippet.usage_count > 10) score += 0.1;
    
    // Bonus pour les snippets utilisés récemment
    if (snippet.last_used_at) {
      const daysSinceLastUse = (Date.now() - new Date(snippet.last_used_at).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLastUse < 7) score += 0.15;
      else if (daysSinceLastUse < 30) score += 0.05;
    }
    
    return Math.min(score, 1); // Cap à 1
  };

  // Générer les suggestions
  const suggestions: TextSuggestion[] = snippets
    .map(snippet => ({
      snippet,
      relevance: calculateRelevance(snippet, context),
      reason: snippet.usage_count > 5 
        ? `Utilisé ${snippet.usage_count} fois` 
        : snippet.last_used_at 
        ? "Utilisé récemment"
        : "Disponible",
    }))
    .filter(s => s.relevance > 0.1) // Seuil minimum de pertinence
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 5); // Top 5 suggestions

  return suggestions;
};
