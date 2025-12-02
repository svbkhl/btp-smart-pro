import { supabase } from "@/integrations/supabase/client";
import { generateDevisNumber } from "@/utils/generateDevisNumber";
import { useCreateQuote } from "@/hooks/useQuotes";

export interface SimpleQuoteData {
  prestation: string; // Nom de la prestation
  surface: number; // Surface en m²
  prix: number; // Prix en €
  clientId: string; // ID du client sélectionné
}

export interface SimpleQuoteResult {
  id: string;
  quote_number: string;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  client_address?: string;
  prestation: string;
  surface: number;
  estimated_cost: number;
  description: string; // Avec phrase standard incluse
  created_at: string;
  status: "draft" | "sent" | "accepted" | "rejected" | "expired";
  details: {
    estimatedCost: number;
    description: string;
    workSteps: Array<{ step: string; description: string; cost: number }>;
    materials?: Array<{ name: string; quantity: number; unitPrice: number; total: number }>;
  };
}

/**
 * Phrase standard à inclure dans tous les devis
 */
export const STANDARD_PHRASE = "La prestation inclut le matériel, les équipements nécessaires à la réalisation du service, ainsi que la main-d'œuvre.";

/**
 * Génère un devis simple avec intégration automatique des données
 */
export async function generateSimpleQuote(
  data: SimpleQuoteData,
  companyInfo: any,
  clientInfo: any
): Promise<SimpleQuoteResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Vous devez être connecté");

  // Générer le numéro de devis
  const quoteNumber = await generateDevisNumber();

  // Calculer le total HT et TTC
  // S'assurer que les valeurs sont des nombres valides
  const prixSaisi = typeof data.prix === 'string' ? parseFloat(data.prix.replace(',', '.')) : data.prix;
  const surfaceSaisie = typeof data.surface === 'string' ? parseFloat(data.surface.replace(',', '.')) : data.surface;
  
  if (isNaN(prixSaisi) || isNaN(surfaceSaisie)) {
    throw new Error("Les montants ne sont pas valides");
  }
  
  // Le prix saisi est considéré comme HT
  const totalHT = Math.round(prixSaisi * 100) / 100;
  const tvaRate = 0.20; // 20% par défaut
  const tva = Math.round(totalHT * tvaRate * 100) / 100;
  const totalTTC = Math.round((totalHT + tva) * 100) / 100;

  // Construire la description avec la phrase standard
  const description = `${data.prestation}\n\n${STANDARD_PHRASE}`;

  // Créer les détails du devis
  const details = {
    estimatedCost: totalHT,
    description: description,
    workSteps: [
      {
        step: data.prestation,
        description: `${data.prestation} - Surface: ${data.surface} m²\n\n${STANDARD_PHRASE}`,
        cost: totalHT,
      },
    ],
    materials: [],
  };

  // Créer le devis en base de données (table ai_quotes pour compatibilité)
  const { data: quote, error } = await supabase
    .from("ai_quotes")
    .insert({
      user_id: session.user.id,
      client_name: clientInfo.name,
      quote_number: quoteNumber,
      status: "draft",
      estimated_cost: totalHT,
      details: details,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating quote:", error);
    throw new Error("Impossible de créer le devis en base de données");
  }

  return {
    id: quote.id,
    quote_number: quoteNumber,
    client_name: clientInfo.name,
    client_email: clientInfo.email,
    client_phone: clientInfo.phone,
    client_address: clientInfo.location,
    prestation: data.prestation,
    surface: data.surface,
    estimated_cost: totalHT,
    description: description,
    created_at: quote.created_at,
    status: quote.status as any,
    details: details,
  };
}

