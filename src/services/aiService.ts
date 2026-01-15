import { supabase } from '@/integrations/supabase/client';

/**
 * Interface pour les paramètres de génération de devis
 */
export interface GenerateQuoteParams {
  clientName: string;
  surface: number;
  workType: string;
  materials: string[];
  imageUrls?: string[];
  manualPrice?: number;
  region?: string;
  description?: string;
  quoteFormat?: string; // Ancien format (compatibilité)
  mode?: "simple" | "detailed"; // Nouveau format
  tvaRate?: number; // Taux TVA personnalisable
}

/**
 * Interface pour la réponse de génération de devis
 */
export interface GenerateQuoteResponse {
  success: boolean;
  aiResponse?: {
    estimatedCost: number;
    description: string;
    workSteps: Array<{ step: string; description: string; cost: number }>;
    materials?: Array<{ name: string; quantity: string; unitCost: number }>;
    estimatedDuration?: string;
    recommendations?: string[];
    quote_number?: string;
    priceValidation?: {
      isValid: boolean;
      message: string;
      warning?: string;
    };
    [key: string]: any;
  };
  quote?: {
    id: string;
    quote_number: string;
    signature_data?: string;
    [key: string]: any;
  };
  quoteNumber?: string;
  error?: string;
}

/**
 * Interface pour l'appel à l'assistant IA
 */
export interface AIAssistantRequest {
  message: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  conversationId?: string;
  currentPage?: string;
  context?: Record<string, any>;
}

/**
 * Interface pour la réponse de l'assistant IA
 */
export interface AIAssistantResponse {
  response: string;
  conversationId?: string;
  [key: string]: any;
}

/**
 * Génère un devis avec l'IA via l'Edge Function Supabase
 */
export async function generateQuote(
  params: GenerateQuoteParams
): Promise<GenerateQuoteResponse> {
  try {
    // Vérifier que l'utilisateur est connecté
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('Vous devez être connecté pour générer un devis');
    }

    // Préparer les données pour l'Edge Function
    const requestData = {
      clientName: params.clientName,
      surface: params.surface,
      workType: params.workType,
      materials: params.materials || [],
      imageUrls: params.imageUrls,
      manualPrice: params.manualPrice,
      region: params.region,
      description: params.description,
      quoteFormat: params.quoteFormat || (params.mode === "simple" ? "simplified" : "detailed") || 'standard', // Compatibilité
      mode: params.mode || (params.quoteFormat === "simplified" ? "simple" : "detailed") || "simple", // Nouveau format
      tvaRate: params.tvaRate ?? 0.20, // Taux TVA
    };

    // Appeler l'Edge Function generate-quote
    const { data, error } = await supabase.functions.invoke('generate-quote', {
      body: requestData,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      console.error('Error calling generate-quote:', error);
      throw new Error(
        error.message || 'Erreur lors de la génération du devis'
      );
    }

    if (!data || !data.success) {
      throw new Error(
        data?.error || 'Erreur lors de la génération du devis'
      );
    }

    return data as GenerateQuoteResponse;
  } catch (error: any) {
    console.error('Error in generateQuote:', error);
    throw new Error(
      error.message || 'Impossible de générer le devis. Veuillez réessayer.'
    );
  }
}

/**
 * Appelle l'assistant IA via l'Edge Function ai-assistant
 */
export async function callAIAssistant(
  request: AIAssistantRequest
): Promise<AIAssistantResponse> {
  try {
    // Vérifier que l'utilisateur est connecté
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('Vous devez être connecté pour utiliser l\'assistant IA');
    }

    // Préparer les données pour l'Edge Function
    const requestData = {
      message: request.message,
      history: request.history || [],
      conversationId: request.conversationId,
      currentPage: request.currentPage,
      context: request.context,
    };

    // Appeler l'Edge Function ai-assistant
    console.log('📤 Appel de l\'Edge Function ai-assistant avec:', {
      message: request.message,
      conversationId: request.conversationId,
      historyLength: request.history?.length || 0,
    });

    const { data, error } = await supabase.functions.invoke('ai-assistant', {
      body: requestData,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    console.log('📥 Réponse de l\'Edge Function:', { data, error });

    if (error) {
      console.error('❌ Error calling ai-assistant:', error);
      throw new Error(
        error.message || 'Erreur lors de l\'appel à l\'assistant IA'
      );
    }

    if (!data) {
      console.error('❌ Aucune donnée retournée par l\'Edge Function');
      throw new Error('Aucune réponse reçue de l\'assistant IA');
    }

    // Gérer différents formats de réponse
    let responseText: string | null = null;
    let conversationId: string | undefined = undefined;

    if (data.success === false) {
      console.error('❌ L\'Edge Function a retourné une erreur:', data.error);
      throw new Error(
        data?.error || 'Erreur lors de l\'appel à l\'assistant IA'
      );
    }

    // Essayer différents formats de réponse
    if (data.response) {
      responseText = data.response;
      conversationId = data.conversationId;
    } else if (data.data?.response) {
      responseText = data.data.response;
      conversationId = data.data.conversationId;
    } else if (typeof data === 'string') {
      responseText = data;
    } else if (data.message) {
      responseText = data.message;
    }

    if (!responseText || responseText.trim().length === 0) {
      console.error('❌ La réponse ne contient pas de champ "response":', data);
      throw new Error('La réponse de l\'IA est vide');
    }

    console.log('✅ Réponse IA reçue avec succès, longueur:', responseText.length);
    
    return {
      response: responseText,
      conversationId: conversationId || request.conversationId,
    } as AIAssistantResponse;
  } catch (error: any) {
    console.error('Error in callAIAssistant:', error);
    throw new Error(
      error.message || 'Impossible de contacter l\'assistant IA. Veuillez réessayer.'
    );
  }
}

/**
 * Interface pour les paramètres d'analyse d'image
 */
export interface AnalyzeImageParams {
  imageUrl: string;
  analysisType?: 'wall' | 'roof' | 'general';
}

/**
 * Interface pour la réponse d'analyse d'image
 */
export interface AnalyzeImageResponse {
  analysis: {
    defects: string[];
    severity: 'low' | 'medium' | 'high';
    estimatedCost: number;
    recommendations: string[];
    urgency: 'low' | 'medium' | 'high';
    details: string;
  };
}

/**
 * Analyse une image avec l'IA via l'Edge Function analyze-image
 */
export async function analyzeImage(
  params: AnalyzeImageParams
): Promise<AnalyzeImageResponse> {
  try {
    // Vérifier que l'utilisateur est connecté
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('Vous devez être connecté pour analyser une image');
    }

    // Préparer les données pour l'Edge Function
    const requestData = {
      imageUrl: params.imageUrl,
      analysisType: params.analysisType || 'general',
    };

    // Appeler l'Edge Function analyze-image
    const { data, error } = await supabase.functions.invoke('analyze-image', {
      body: requestData,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      console.error('Error calling analyze-image:', error);
      throw new Error(
        error.message || 'Erreur lors de l\'analyse de l\'image'
      );
    }

    if (!data || !data.analysis) {
      throw new Error(
        'Réponse invalide de l\'Edge Function'
      );
    }

    return data as AnalyzeImageResponse;
  } catch (error: any) {
    console.error('Error in analyzeImage:', error);
    throw new Error(
      error.message || 'Impossible d\'analyser l\'image. Veuillez réessayer.'
    );
  }
}

/**
 * Signe un devis
 */
export async function signQuote(
  quoteId: string,
  signatureData: string,
  signerName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('Vous devez être connecté pour signer un devis');
    }

    const { data, error } = await supabase.functions.invoke(
      'create-signature-session',
      {
        body: {
          quoteId,
          signatureData,
          signerName,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    if (error) {
      throw new Error(error.message || 'Erreur lors de la signature');
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in signQuote:', error);
    return {
      success: false,
      error: error.message || 'Impossible de signer le devis',
    };
  }
}

