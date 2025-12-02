/**
 * Génère un numéro de devis au format DEVIS-YYYY-NNN
 * Utilise la fonction Supabase get_next_quote_number() si disponible,
 * sinon génère un numéro basé sur le système documentNumbering
 */
import { supabase } from "@/integrations/supabase/client";
import { generateQuoteNumber } from "./documentNumbering";
import { useAuth } from "@/hooks/useAuth";

export async function generateDevisNumber(): Promise<string> {
  try {
    // Récupérer l'utilisateur actuel
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Utiliser le nouveau système de numérotation
    const quoteNumber = await generateQuoteNumber(user.id);
    return quoteNumber;
  } catch (error) {
    console.warn('Error generating quote number, using fallback:', error);

    // Fallback simple avec le nouveau format
    const now = new Date();
    const year = now.getFullYear();
    const timestamp = Date.now().toString().slice(-3).padStart(3, '0');

    return `DEVIS-${year}-${timestamp}`;
  }
}
