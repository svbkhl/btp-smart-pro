import { supabase } from '@/integrations/supabase/client';

/**
 * Service pour les actions IA avancées
 * Actions automatisées basées sur l'IA
 */

/**
 * Analyse un projet et génère des recommandations
 */
export async function analyzeProject(projectId: string): Promise<{
  recommendations: string[];
  risks: string[];
  opportunities: string[];
}> {
  try {
    const { data, error } = await supabase.functions.invoke('ai-action', {
      body: {
        action: 'analyze_project',
        project_id: projectId,
      },
    });

    if (error) throw error;

    return {
      recommendations: data?.recommendations || [],
      risks: data?.risks || [],
      opportunities: data?.opportunities || [],
    };
  } catch (error) {
    console.error('Error analyzing project:', error);
    throw error;
  }
}

/**
 * Génère un rapport automatique basé sur les données
 */
export async function generateAutoReport(type: 'monthly' | 'weekly' | 'project'): Promise<{
  report: string;
  insights: string[];
  metrics: Record<string, number>;
}> {
  try {
    const { data, error } = await supabase.functions.invoke('ai-action', {
      body: {
        action: 'generate_report',
        report_type: type,
      },
    });

    if (error) throw error;

    return {
      report: data?.report || '',
      insights: data?.insights || [],
      metrics: data?.metrics || {},
    };
  } catch (error) {
    console.error('Error generating report:', error);
    throw error;
  }
}

/**
 * Prédit les risques d'un projet
 */
export async function predictProjectRisks(projectId: string): Promise<{
  risks: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    mitigation: string;
  }>;
  confidence: number;
}> {
  try {
    const { data, error } = await supabase.functions.invoke('ai-action', {
      body: {
        action: 'predict_risks',
        project_id: projectId,
      },
    });

    if (error) throw error;

    return {
      risks: data?.risks || [],
      confidence: data?.confidence || 0,
    };
  } catch (error) {
    console.error('Error predicting risks:', error);
    throw error;
  }
}

/**
 * Optimise un devis avec l'IA
 */
export async function optimizeQuote(quoteId: string): Promise<{
  optimizedCost: number;
  suggestions: string[];
  savings: number;
}> {
  try {
    const { data, error } = await supabase.functions.invoke('ai-action', {
      body: {
        action: 'optimize_quote',
        quote_id: quoteId,
      },
    });

    if (error) throw error;

    return {
      optimizedCost: data?.optimized_cost || 0,
      suggestions: data?.suggestions || [],
      savings: data?.savings || 0,
    };
  } catch (error) {
    console.error('Error optimizing quote:', error);
    throw error;
  }
}




















