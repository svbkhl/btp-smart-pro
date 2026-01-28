import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCompanyId } from "./useCompanyId";
import { QUERY_CONFIG } from "@/utils/reactQueryConfig";
import { logger } from "@/utils/logger";

// Types pour les insights IA
export interface PriceSuggestion {
  category: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  quoteCount: number;
  recommendedPrice: number;
  confidence: number; // 0-1
}

export interface ProfitabilityAnalysis {
  projectId: string;
  projectName: string;
  revenue: number;
  costs: number;
  profit: number;
  profitMargin: number; // Pourcentage
  status: 'profitable' | 'breakeven' | 'loss';
  recommendations: string[];
}

export interface RevenuePrediction {
  period: string; // 'month' ou 'quarter'
  periodLabel: string; // 'Janvier 2026', 'Q1 2026'
  predictedRevenue: number;
  confidence: number; // 0-1
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
}

export interface AIRecommendation {
  id: string;
  type: 'pricing' | 'profitability' | 'cash_flow' | 'customer' | 'efficiency';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string; // Impact estimé
  actionable: boolean;
  action?: string; // Action suggérée
}

// Hook pour obtenir des suggestions de prix basées sur l'historique
export const usePriceSuggestions = () => {
  const { user } = useAuth();
  const { companyId, isLoading: isLoadingCompanyId } = useCompanyId();

  return useQuery({
    queryKey: ["price-suggestions", companyId],
    queryFn: async () => {
      if (!user || !companyId) {
        logger.warn("usePriceSuggestions: No user or company_id");
        return [];
      }

      // Récupérer les devis des 12 derniers mois
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const { data: quotes, error } = await supabase
        .from("ai_quotes")
        .select("estimated_cost, mode, status, created_at")
        .eq("company_id", companyId)
        .gte("created_at", oneYearAgo.toISOString())
        .not("estimated_cost", "is", null);

      if (error) throw error;

      // Grouper par mode (simple/detailed) comme proxy de catégorie
      const groupedByMode: Record<string, number[]> = {};
      
      quotes?.forEach(quote => {
        const category = quote.mode || 'standard';
        if (!groupedByMode[category]) {
          groupedByMode[category] = [];
        }
        groupedByMode[category].push(quote.estimated_cost);
      });

      // Calculer les statistiques par catégorie
      const suggestions: PriceSuggestion[] = Object.entries(groupedByMode).map(([category, prices]) => {
        prices.sort((a, b) => a - b);
        
        const avg = prices.reduce((sum, p) => sum + p, 0) / prices.length;
        const min = prices[0];
        const max = prices[prices.length - 1];
        
        // Prix recommandé = médiane légèrement ajustée vers le haut
        const medianIndex = Math.floor(prices.length / 2);
        const median = prices[medianIndex];
        const recommended = median * 1.05; // +5% sur la médiane
        
        // Confiance basée sur le nombre de données
        const confidence = Math.min(prices.length / 10, 1); // Max confiance à 10+ devis

        return {
          category,
          avgPrice: avg,
          minPrice: min,
          maxPrice: max,
          quoteCount: prices.length,
          recommendedPrice: recommended,
          confidence,
        };
      });

      return suggestions;
    },
    enabled: !!user && !isLoadingCompanyId && !!companyId,
    ...QUERY_CONFIG.MODERATE,
  });
};

// Hook pour analyser la rentabilité des projets
export const useProfitabilityAnalysis = () => {
  const { user } = useAuth();
  const { companyId, isLoading: isLoadingCompanyId } = useCompanyId();

  return useQuery({
    queryKey: ["profitability-analysis", companyId],
    queryFn: async () => {
      if (!user || !companyId) {
        logger.warn("useProfitabilityAnalysis: No user or company_id");
        return [];
      }

      const { data: projects, error } = await supabase
        .from("projects")
        .select("*")
        .eq("company_id", companyId)
        .not("budget", "is", null);

      if (error) throw error;

      const analyses: ProfitabilityAnalysis[] = (projects || []).map(project => {
        const revenue = project.budget || 0;
        const costs = project.actual_cost || (revenue * 0.7); // Estimation si pas de coût réel
        const profit = revenue - costs;
        const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

        let status: 'profitable' | 'breakeven' | 'loss';
        if (profitMargin > 5) status = 'profitable';
        else if (profitMargin >= -5) status = 'breakeven';
        else status = 'loss';

        const recommendations: string[] = [];
        if (profitMargin < 15) {
          recommendations.push("Marjebasse : Revoir les coûts ou augmenter le prix");
        }
        if (costs > revenue * 0.8) {
          recommendations.push("Coûts élevés : Optimiser les dépenses");
        }
        if (profitMargin > 40) {
          recommendations.push("Excellente marge : Modèle à répliquer");
        }

        return {
          projectId: project.id,
          projectName: project.name,
          revenue,
          costs,
          profit,
          profitMargin,
          status,
          recommendations,
        };
      });

      return analyses.sort((a, b) => a.profitMargin - b.profitMargin); // Moins rentables en premier
    },
    enabled: !!user && !isLoadingCompanyId && !!companyId,
    ...QUERY_CONFIG.MODERATE,
  });
};

// Hook pour prédire le CA des prochains mois
export const useRevenuePredictions = () => {
  const { user } = useAuth();
  const { companyId, isLoading: isLoadingCompanyId } = useCompanyId();

  return useQuery({
    queryKey: ["revenue-predictions", companyId],
    queryFn: async () => {
      if (!user || !companyId) {
        logger.warn("useRevenuePredictions: No user or company_id");
        return [];
      }

      // Récupérer l'historique des 12 derniers mois
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const { data: invoices, error } = await supabase
        .from("invoices")
        .select("total_ttc, amount, created_at")
        .eq("company_id", companyId)
        .gte("created_at", oneYearAgo.toISOString());

      if (error) throw error;

      // Grouper par mois
      const monthlyRevenue: Record<string, number> = {};
      
      invoices?.forEach(invoice => {
        const date = new Date(invoice.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const amount = invoice.total_ttc || invoice.amount || 0;
        monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + amount;
      });

      // Calculer la tendance (régression linéaire simple)
      const months = Object.keys(monthlyRevenue).sort();
      const revenues = months.map(m => monthlyRevenue[m]);
      
      const avgRevenue = revenues.reduce((sum, r) => sum + r, 0) / revenues.length;
      
      // Tendance basée sur les 3 derniers mois vs les 3 précédents
      const recent3 = revenues.slice(-3).reduce((sum, r) => sum + r, 0) / 3;
      const previous3 = revenues.slice(-6, -3).reduce((sum, r) => sum + r, 0) / 3;
      
      let trend: 'up' | 'down' | 'stable' = 'stable';
      let trendPercentage = 0;
      
      if (previous3 > 0) {
        trendPercentage = ((recent3 - previous3) / previous3) * 100;
        if (trendPercentage > 5) trend = 'up';
        else if (trendPercentage < -5) trend = 'down';
      }

      // Prédire les 3 prochains mois
      const predictions: RevenuePrediction[] = [];
      const now = new Date();
      
      for (let i = 1; i <= 3; i++) {
        const futureDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const monthLabel = futureDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
        
        // Prédiction simple : moyenne + tendance
        const predicted = avgRevenue * (1 + (trendPercentage / 100) * i);
        
        // Confiance diminue avec le temps
        const confidence = Math.max(0.5, 1 - (i * 0.15));

        predictions.push({
          period: 'month',
          periodLabel: monthLabel,
          predictedRevenue: predicted,
          confidence,
          trend,
          trendPercentage,
        });
      }

      return predictions;
    },
    enabled: !!user && !isLoadingCompanyId && !!companyId,
    ...QUERY_CONFIG.MODERATE,
  });
};

// Hook pour obtenir des recommandations IA
export const useAIRecommendations = () => {
  const { data: profitability = [] } = useProfitabilityAnalysis();
  const { data: predictions = [] } = useRevenuePredictions();
  const { data: priceSuggestions = [] } = usePriceSuggestions();

  const recommendations: AIRecommendation[] = [];

  // Recommandations basées sur la rentabilité
  const lowProfitProjects = profitability.filter(p => p.profitMargin < 10);
  if (lowProfitProjects.length > 0) {
    recommendations.push({
      id: 'low-profit-1',
      type: 'profitability',
      priority: 'high',
      title: `${lowProfitProjects.length} projet(s) peu rentable(s)`,
      description: `Certains projets ont une marge inférieure à 10%. Analyse recommandée.`,
      impact: `Potentiel d'optimisation de ${lowProfitProjects.reduce((sum, p) => sum + Math.abs(p.profit), 0).toFixed(0)}€`,
      actionable: true,
      action: 'Revoir les coûts et la tarification',
    });
  }

  // Recommandations basées sur les prédictions
  if (predictions.length > 0 && predictions[0].trend === 'down') {
    recommendations.push({
      id: 'trend-1',
      type: 'cash_flow',
      priority: 'high',
      title: 'Tendance à la baisse détectée',
      description: `Le CA est en baisse de ${Math.abs(predictions[0].trendPercentage).toFixed(1)}%. Action recommandée.`,
      impact: 'Risque sur la trésorerie',
      actionable: true,
      action: 'Intensifier la prospection commerciale',
    });
  }

  // Recommandations basées sur les prix
  const lowConfidencePrices = priceSuggestions.filter(p => p.confidence < 0.5);
  if (lowConfidencePrices.length > 0) {
    recommendations.push({
      id: 'pricing-1',
      type: 'pricing',
      priority: 'medium',
      title: 'Données de pricing insuffisantes',
      description: `Pas assez de devis dans certaines catégories pour des suggestions fiables.`,
      impact: 'Risque de sous-tarification',
      actionable: true,
      action: 'Créer plus de devis pour affiner les suggestions',
    });
  }

  // Recommandation générale si tout va bien
  if (recommendations.length === 0) {
    recommendations.push({
      id: 'all-good-1',
      type: 'efficiency',
      priority: 'low',
      title: 'Performance solide',
      description: 'Vos indicateurs sont bons. Continuez sur cette voie !',
      impact: 'Maintien de la croissance',
      actionable: false,
    });
  }

  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
};
