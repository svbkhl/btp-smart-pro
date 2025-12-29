/**
 * Script de test pour la récupération d'un devis avec UUID valide
 * Démontre l'extraction robuste de l'UUID depuis un ID avec suffixe
 */

import { createClient } from '@supabase/supabase-js';

// Configuration Supabase
const SUPABASE_URL = 'https://renmjmqlmafqjzldmsgs.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_PUBLIC_ANON_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Extrait l'UUID d'un ID qui peut contenir un suffixe de sécurité
 * Format accepté: "uuid" ou "uuid-suffix"
 * Exemple: "63bd2333-b130-4bf2-b25f-c7e194e588e8-mix72c7d" → "63bd2333-b130-4bf2-b25f-c7e194e588e8"
 * 
 * Cette fonction est la même que celle utilisée dans SignaturePage.tsx et les Edge Functions
 */
function extractUUID(rawId: string): string | null {
  if (!rawId) return null;
  
  // Méthode 1: Extraire les 36 premiers caractères (format UUID standard)
  if (rawId.length >= 36) {
    const uuid = rawId.slice(0, 36);
    // Vérifier que c'est un UUID valide (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
    if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(uuid)) {
      return uuid;
    }
  }
  
  // Méthode 2: Utiliser une regex pour trouver l'UUID dans la chaîne
  const uuidMatch = rawId.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/i);
  if (uuidMatch && uuidMatch[0]) {
    return uuidMatch[0];
  }
  
  // Si aucune méthode ne fonctionne, retourner l'ID original s'il est un UUID valide
  return rawId.length === 36 && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i.test(rawId) 
    ? rawId 
    : null;
}

/**
 * Récupère un devis depuis Supabase en utilisant l'UUID extrait
 */
async function getQuote(rawId: string) {
  console.log('🔍 [getQuote] ID brut reçu:', rawId);
  
  // Extraire l'UUID valide
  const validUuid = extractUUID(rawId);
  
  if (!validUuid) {
    console.error('❌ [getQuote] Impossible d\'extraire un UUID valide de:', rawId);
    return null;
  }
  
  console.log('✅ [getQuote] UUID extrait:', validUuid);
  
  // Récupérer le devis depuis Supabase
  const { data, error } = await supabase
    .from('ai_quotes')
    .select('*')
    .eq('id', validUuid)
    .single();
  
  if (error) {
    console.error('❌ [getQuote] Erreur chargement devis:', error);
    console.error('   Code:', error.code);
    console.error('   Message:', error.message);
    console.error('   Détails:', error.details);
    return null;
  }
  
  console.log('✅ [getQuote] Devis récupéré avec succès:');
  console.log('   ID:', data.id);
  console.log('   Numéro:', data.quote_number || 'N/A');
  console.log('   Client:', data.client_name || 'N/A');
  console.log('   Montant:', data.estimated_cost || 'N/A');
  console.log('   Statut:', data.status || 'N/A');
  console.log('   Signé:', data.signed ? 'Oui' : 'Non');
  
  return data;
}

// Exemples de test
async function runTests() {
  console.log('='.repeat(60));
  console.log('TESTS D\'EXTRACTION D\'UUID');
  console.log('='.repeat(60));
  
  // Test 1: UUID avec suffixe
  const testId1 = "63bd2333-b130-4bf2-b25f-c7e194e588e8-mix72c7d";
  console.log('\n📝 Test 1: UUID avec suffixe');
  console.log('   Input:', testId1);
  const uuid1 = extractUUID(testId1);
  console.log('   UUID extrait:', uuid1);
  console.log('   ✅ Attendu: 63bd2333-b130-4bf2-b25f-c7e194e588e8');
  console.log('   Résultat:', uuid1 === "63bd2333-b130-4bf2-b25f-c7e194e588e8" ? '✅ PASS' : '❌ FAIL');
  
  // Test 2: UUID propre (sans suffixe)
  const testId2 = "63bd2333-b130-4bf2-b25f-c7e194e588e8";
  console.log('\n📝 Test 2: UUID propre');
  console.log('   Input:', testId2);
  const uuid2 = extractUUID(testId2);
  console.log('   UUID extrait:', uuid2);
  console.log('   Résultat:', uuid2 === testId2 ? '✅ PASS' : '❌ FAIL');
  
  // Test 3: ID invalide
  const testId3 = "invalid-id";
  console.log('\n📝 Test 3: ID invalide');
  console.log('   Input:', testId3);
  const uuid3 = extractUUID(testId3);
  console.log('   UUID extrait:', uuid3);
  console.log('   Résultat:', uuid3 === null ? '✅ PASS' : '❌ FAIL');
  
  // Test 4: UUID avec suffixe différent
  const testId4 = "63bd2333-b130-4bf2-b25f-c7e194e588e8-abc123xyz";
  console.log('\n📝 Test 4: UUID avec suffixe différent');
  console.log('   Input:', testId4);
  const uuid4 = extractUUID(testId4);
  console.log('   UUID extrait:', uuid4);
  console.log('   ✅ Attendu: 63bd2333-b130-4bf2-b25f-c7e194e588e8');
  console.log('   Résultat:', uuid4 === "63bd2333-b130-4bf2-b25f-c7e194e588e8" ? '✅ PASS' : '❌ FAIL');
  
  console.log('\n' + '='.repeat(60));
  console.log('TEST DE RÉCUPÉRATION DEPUIS SUPABASE');
  console.log('='.repeat(60));
  
  // Test réel avec Supabase (si une clé API est configurée)
  if (SUPABASE_ANON_KEY && SUPABASE_ANON_KEY !== 'YOUR_PUBLIC_ANON_KEY') {
    const testQuoteId = "63bd2333-b130-4bf2-b25f-c7e194e588e8-mix72c7d";
    console.log('\n📝 Test réel: Récupération du devis');
    await getQuote(testQuoteId);
  } else {
    console.log('\n⚠️  Clé API Supabase non configurée. Configurez VITE_SUPABASE_ANON_KEY pour tester la récupération réelle.');
  }
}

// Exécution
if (require.main === module) {
  runTests().catch(console.error);
}

// Export pour utilisation dans d'autres fichiers
export { extractUUID, getQuote };





