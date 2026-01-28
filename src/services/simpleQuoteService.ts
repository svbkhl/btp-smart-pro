import { supabase } from "@/integrations/supabase/client";
import { generateDevisNumber } from "@/utils/generateDevisNumber";
import { useCreateQuote } from "@/hooks/useQuotes";
import { calculateFromTTC } from "@/utils/priceCalculations";
import { getCompanyIdForUser } from "@/utils/companyHelpers";

export interface SimpleQuoteData {
  prestation: string; // Nom de la prestation
  surface: number; // Surface en m²
  prix: number; // Prix en €
  clientId: string; // ID du client sélectionné
  tvaRate?: number; // Taux TVA (0-1)
  tva293b?: boolean; // TVA non applicable 293B
  customPhrase?: string; // Phrase personnalisée (remplace STANDARD_PHRASE si fournie)
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

  // Calculer le total HT et TTC - MODE TTC FIRST
  // S'assurer que les valeurs sont des nombres valides
  const prixSaisi = typeof data.prix === 'string' ? parseFloat(data.prix.replace(',', '.')) : data.prix;
  const surfaceSaisie = typeof data.surface === 'string' ? parseFloat(data.surface.replace(',', '.')) : data.surface;
  
  if (isNaN(prixSaisi) || isNaN(surfaceSaisie)) {
    throw new Error("Les montants ne sont pas valides");
  }
  
  // ⚠️ RÈGLE MÉTIER: Le prix saisi est TOUJOURS un prix TTC
  // Taux TVA : utiliser celui fourni ou 20% par défaut (sauf si 293B)
  const tvaRate = data.tva293b ? 0 : (data.tvaRate ?? 0.20);
  const tvaPercent = tvaRate * 100;
  // Utilisation de la fonction utilitaire pour les calculs précis
  const prices = calculateFromTTC(prixSaisi, tvaPercent);
  const { total_ttc, total_ht, vat_amount } = prices;

  // Construire la description avec la phrase standard ou personnalisée
  const phrase = data.customPhrase || STANDARD_PHRASE;
  const description = `${data.prestation}\n\n${phrase}`;

  // Créer les détails du devis - MODE TTC FIRST
  const details = {
    estimatedCost: total_ttc, // TTC = source de vérité
    total_ttc: total_ttc,     // Ajouter explicitement
    total_ht: total_ht,       // Ajouter explicitement
    vat_amount: vat_amount,   // Ajouter explicitement
    description: description,
    workSteps: [
      {
        step: data.prestation,
        description: `${data.prestation} - Surface: ${data.surface} m²\n\n${phrase}`,
        cost: total_ttc, // TTC
      },
    ],
    materials: [],
  };

  // Récupérer company_id
  const companyId = await getCompanyIdForUser(session.user.id);
  if (!companyId) {
    throw new Error("Vous devez être membre d'une entreprise pour créer un devis");
  }

  // Créer le devis en base de données (table ai_quotes pour compatibilité)
  // ✅ CORRECTION: Inclure total_ttc, subtotal_ht, total_tva, tva_rate, et tva_non_applicable_293b
  const { data: quote, error } = await supabase
    .from("ai_quotes")
    .insert({
      user_id: session.user.id,
      company_id: companyId, // ✅ Ajouter company_id
      client_name: clientInfo.name,
      quote_number: quoteNumber,
      status: "draft",
      mode: "simple",
      estimated_cost: total_ttc, // ⚠️ TTC = source de vérité (compatibilité)
      subtotal_ht: total_ht, // ✅ Total HT calculé
      total_tva: vat_amount, // ✅ TVA calculée
      total_ttc: total_ttc, // ✅ Total TTC (source de vérité)
      tva_rate: tvaRate, // ✅ Taux TVA
      tva_non_applicable_293b: data.tva293b || false, // ✅ TVA 293B
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
    estimated_cost: total_ttc, // ⚠️ Retourner le TTC, pas le HT
    description: description,
    created_at: quote.created_at,
    status: quote.status as any,
    tva_rate: tvaRate, // ✅ Ajouter le taux TVA
    tva_non_applicable_293b: data.tva293b || false, // ✅ Ajouter le flag 293B
    details: details,
  };
}

