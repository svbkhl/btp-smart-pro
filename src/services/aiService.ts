import { supabase } from "@/integrations/supabase/client";

/**
 * Service pour appeler les fonctions Edge Supabase liées à l'IA
 */

export interface AIAssistantRequest {
  message: string;
  context?: Record<string, any>;
}

export interface AIAssistantResponse {
  response: string;
}

export interface GenerateQuoteRequest {
  clientName: string;
  surface: number;
  workType: string;
  materials: string[];
  imageUrls?: string[];
  manualPrice?: number;
  region?: string;
}

export interface GenerateQuoteResponse {
  quote: any;
  aiResponse: {
    estimatedCost: number;
    workSteps: Array<{
      step: string;
      description: string;
      cost: number;
    }>;
    materials: Array<{
      name: string;
      quantity: string;
      unitCost: number;
    }>;
    estimatedDuration: string;
    recommendations: string[];
    priceValidation?: {
      isValid: boolean;
      message: string;
      warning?: string;
    };
    quote_number?: string;
  };
  companyInfo?: any;
  quoteNumber?: string;
}

export interface AnalyzeImageRequest {
  imageUrl: string;
  analysisType?: "wall" | "roof" | "general";
}

export interface AnalyzeImageResponse {
  analysis: {
    defects: string[];
    severity: "low" | "medium" | "high";
    urgency: "low" | "medium" | "high";
    estimatedCost: number;
    recommendations: string[];
    details: string;
  };
}

export interface SignQuoteRequest {
  quoteId: string;
  signatureData: string;
  signerName: string;
}

export interface SignQuoteResponse {
  success: boolean;
  quote: any;
}

/**
 * Appelle l'assistant IA
 */
export async function callAIAssistant(
  request: AIAssistantRequest
): Promise<AIAssistantResponse> {
  try {
    // Récupérer la session pour obtenir le token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      throw new Error("Erreur d'authentification. Veuillez vous reconnecter.");
    }
    
    if (!session) {
      throw new Error("Vous devez être connecté pour utiliser l'assistant IA");
    }

    let responseData: any = null;
    let responseError: any = null;

    try {
      const result = await supabase.functions.invoke("ai-assistant", {
        body: request,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      responseData = result.data;
      responseError = result.error;

      console.log("Response from ai-assistant:", { data: responseData, error: responseError });
    } catch (invokeError: any) {
      console.error("Exception invoking ai-assistant:", invokeError);
      responseError = invokeError;
    }

    if (responseError) {
      console.error("Error calling ai-assistant:", responseError);
      
      // Essayer d'extraire le message d'erreur de différentes sources
      let errorMessage = "Impossible de contacter l'assistant IA";
      
      // 1. Message direct de l'erreur
      if (responseError.message) {
        errorMessage = responseError.message;
      }
      
      // 2. Erreur dans le contexte (status code)
      if (responseError.context?.status) {
        const status = responseError.context.status;
        errorMessage = `Erreur ${status}: ${responseError.message || "Erreur lors de l'appel à l'assistant IA"}`;
      }
      
      // 3. Erreur dans le body de la réponse
      if (responseError.context?.body) {
        try {
          const errorBody = typeof responseError.context.body === 'string' 
            ? JSON.parse(responseError.context.body) 
            : responseError.context.body;
          if (errorBody?.error) {
            errorMessage = typeof errorBody.error === 'string' 
              ? errorBody.error 
              : JSON.stringify(errorBody.error);
          }
        } catch (e) {
          // Erreur silencieuse lors du parsing
        }
      }
      
      // 4. Si data contient une erreur (cas où la fonction retourne 200 mais avec {error: ...})
      if (responseData && 'error' in responseData) {
        errorMessage = typeof responseData.error === 'string' 
          ? responseData.error 
          : JSON.stringify(responseData.error);
      }
      
      throw new Error(errorMessage);
    }

    // Utiliser responseData au lieu de data
    const data = responseData;

    // Vérifier si la réponse contient une erreur
    if (!data) {
      throw new Error("Aucune réponse reçue de l'assistant IA");
    }

    if ('error' in data) {
      const errorMessage = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
      throw new Error(errorMessage);
    }

    // Vérifier que la réponse a le bon format
    if (!data.response || typeof data.response !== 'string') {
      throw new Error("Format de réponse invalide de l'assistant IA");
    }

    return data as AIAssistantResponse;
  } catch (error) {
    // Si c'est déjà une Error avec un message, on la relance
    if (error instanceof Error) {
      throw error;
    }
    // Sinon on crée une nouvelle Error
    throw new Error(error?.message || "Erreur inattendue lors de l'appel à l'assistant IA");
  }
}

/**
 * Génère un devis avec l'IA
 */
export async function generateQuote(
  request: GenerateQuoteRequest
): Promise<GenerateQuoteResponse> {
  try {
    // Récupérer la session pour l'authentification
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error("Vous devez être connecté pour générer un devis");
    }

    const { data, error } = await supabase.functions.invoke("generate-quote", {
      body: request,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      // Si la réponse contient un message d'erreur détaillé
      if (data && typeof data === 'object' && 'error' in data) {
        const errorMessage = (data as { error: unknown }).error;
        throw new Error(
          typeof errorMessage === 'string' 
            ? errorMessage 
            : JSON.stringify(errorMessage)
        );
      }
      
      throw new Error(
        error.message || "Impossible de générer le devis avec l'IA. Vérifiez les logs pour plus de détails."
      );
    }

    // Vérifier si la réponse contient une erreur
    if (data && typeof data === 'object' && 'error' in data) {
      const errorMessage = (data as { error: unknown }).error;
      throw new Error(
        typeof errorMessage === 'string' 
          ? errorMessage 
          : JSON.stringify(errorMessage)
      );
    }

    // Vérifier que la réponse contient les données attendues
    if (!data || (typeof data === 'object' && !('aiResponse' in data))) {
      throw new Error("Réponse invalide de l'Edge Function. Structure de données inattendue.");
    }

    return data as GenerateQuoteResponse;
  } catch (error) {
    // Répercuter l'erreur avec plus de détails
    if (error instanceof Error && error.message) {
      throw error;
    }
    throw new Error("Erreur lors de la génération du devis. Veuillez réessayer.");
  }
}

/**
 * Analyse une image avec l'IA
 */
export async function analyzeImage(
  request: AnalyzeImageRequest
): Promise<AnalyzeImageResponse> {
  const { data, error } = await supabase.functions.invoke("analyze-image", {
    body: request,
  });

  if (error) {
    throw new Error(
      error.message || "Impossible d'analyser l'image avec l'IA"
    );
  }

  return data as AnalyzeImageResponse;
}

/**
 * Signe un devis électroniquement
 */
export async function signQuote(
  request: SignQuoteRequest
): Promise<SignQuoteResponse> {
  const { data, error } = await supabase.functions.invoke("sign-quote", {
    body: request,
  });

  if (error) {
    throw new Error(
      error.message || "Impossible de signer le devis"
    );
  }

  return data as SignQuoteResponse;
}

/**
 * Vérifie les rappels de maintenance (appel périodique depuis le backend)
 * Cette fonction est généralement appelée par un cron job, mais peut être appelée manuellement
 */
export async function checkMaintenanceReminders(): Promise<any> {
  const { data, error } = await supabase.functions.invoke(
    "check-maintenance-reminders",
    {
      body: {},
    }
  );

  if (error) {
    throw new Error(
      error.message || "Impossible de vérifier les rappels de maintenance"
    );
  }

  return data;
}

