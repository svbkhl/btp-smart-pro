/**
 * Service pour parser une description libre de devis avec l'IA
 */

import { callAIAssistant } from "./aiService";

export interface ParsedQuoteInfo {
  clientName: string;
  surface?: number;
  workType: string;
  materials: string[];
  region?: string;
  manualPrice?: number;
  description?: string;
}

/**
 * Parse une description libre de devis avec l'IA
 * L'IA extrait les informations structurées depuis la description
 */
export async function parseQuoteDescription(
  description: string
): Promise<ParsedQuoteInfo> {
  const prompt = `Tu es un assistant expert en BTP. Analyse cette description de devis et extrais les informations structurées.

Description du devis:
"${description}"

Extrais les informations suivantes et réponds UNIQUEMENT en JSON avec cette structure exacte:
{
  "clientName": "nom du client ou 'Client' si non spécifié",
  "surface": nombre en m² (ou null si non spécifié),
  "workType": "type de travaux (ex: Rénovation toiture, Isolation thermique, etc.)",
  "materials": ["matériau1", "matériau2", ...],
  "region": "région ou ville (ou null si non spécifié)",
  "manualPrice": nombre en euros (ou null si non spécifié),
  "description": "description complète des travaux"
}

IMPORTANT:
- Si le client n'est pas mentionné, utilise "Client"
- Si la surface n'est pas mentionnée, mets null
- Pour workType, utilise un des types standards: Rénovation toiture, Isolation thermique, Rénovation électrique, Plomberie, Peinture, Carrelage, Parquet, Menuiserie, Maçonnerie, Charpente, Couverture, Zinguerie, Étanchéité, Ventilation, Chauffage, Climatisation, Électricité, Plomberie sanitaire, Rénovation complète, Extension, Surélévation, Ravalement de façade, ou "Autre"
- Pour materials, liste tous les matériaux mentionnés
- Si un prix est mentionné, mets-le dans manualPrice
- Réponds UNIQUEMENT en JSON, sans texte avant ou après`;

  try {
    const response = await callAIAssistant({ message: prompt });
    
    // Extraire le JSON de la réponse
    let jsonText = response.response.trim();
    
    // Nettoyer le texte (enlever markdown code blocks si présents)
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Si le texte commence par {, c'est du JSON
    if (jsonText.startsWith('{')) {
      const parsed = JSON.parse(jsonText);
      return parsed as ParsedQuoteInfo;
    } else {
      // Essayer d'extraire le JSON du texte
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed as ParsedQuoteInfo;
      } else {
        throw new Error('Impossible de parser la réponse de l\'IA');
      }
    }
  } catch (error: any) {
    console.error('Error parsing quote description:', error);
    throw new Error(`Erreur lors de l'analyse de la description: ${error.message || 'Erreur inconnue'}`);
  }
}


