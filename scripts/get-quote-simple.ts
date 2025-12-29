/**
 * 🔹 Exemple simple : Récupération de devis avec UUID valide
 * 
 * Ce script démontre comment extraire correctement un UUID depuis un ID
 * qui peut contenir un suffixe de sécurité, puis récupérer le devis depuis Supabase.
 */

import { createClient } from '@supabase/supabase-js';
import { extractUUID } from '../src/utils/uuidExtractor';

// Configuration Supabase
const SUPABASE_URL = 'https://renmjmqlmafqjzldmsgs.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_PUBLIC_ANON_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// UUID fourni (potentiellement invalide avec suffixe)
const rawId = "0e74a1bf-0178-4d8d-ad4f-a6e1297bae6b-mixads3x";

// ✅ Nettoyage automatique de l'UUID pour Supabase (version robuste)
// Au lieu de : rawId.match(/^[0-9a-fA-F]{8}-.../)[0] qui peut échouer si match retourne null
const validUuid = extractUUID(rawId);

if (!validUuid) {
  console.error('❌ Impossible d\'extraire un UUID valide de:', rawId);
  process.exit(1);
}

console.log('🔍 ID brut:', rawId);
console.log('✅ UUID extrait:', validUuid);

/**
 * Fonction pour récupérer un devis
 */
async function getQuote() {
  try {
    const { data, error } = await supabase
      .from('ai_quotes')
      .select('*')
      .eq('id', validUuid) // Utilisation de l'UUID nettoyé
      .single();

    if (error) {
      console.error('❌ Erreur chargement devis:', error);
      console.error('   Code:', error.code);
      console.error('   Message:', error.message);
      console.error('   Détails:', error.details);
      return null;
    }

    console.log('✅ Devis récupéré avec succès:');
    console.log('   ID:', data.id);
    console.log('   Numéro:', data.quote_number || 'N/A');
    console.log('   Client:', data.client_name || 'N/A');
    console.log('   Montant:', data.estimated_cost ? `${data.estimated_cost}€` : 'N/A');
    console.log('   Statut:', data.status || 'N/A');
    console.log('   Signé:', data.signed ? 'Oui' : 'Non');
    console.log('   Créé le:', data.created_at ? new Date(data.created_at).toLocaleDateString('fr-FR') : 'N/A');

    return data;
  } catch (error: any) {
    console.error('❌ Erreur inattendue:', error);
    return null;
  }
}

// Exécution
if (SUPABASE_ANON_KEY && SUPABASE_ANON_KEY !== 'YOUR_PUBLIC_ANON_KEY') {
  getQuote().catch(console.error);
} else {
  console.log('⚠️  Clé API Supabase non configurée.');
  console.log('   Configurez VITE_SUPABASE_ANON_KEY pour tester.');
  console.log('   Exemple: VITE_SUPABASE_ANON_KEY=your_key npx tsx scripts/get-quote-simple.ts');
}





