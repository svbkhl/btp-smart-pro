/**
 * 🔹 Exemple : Récupération de devis avec UUID valide et gestion du suffixe invalide
 * Version JavaScript (peut être exécutée directement avec Node.js)
 * 
 * Usage: node scripts/get-quote-example.js
 */

const { createClient } = require('@supabase/supabase-js');

// Importer la fonction extractUUID depuis le fichier utilitaire
// Note: En production, utilisez le chemin correct vers votre fonction
function extractUUID(rawId) {
  if (!rawId) return null;
  
  // Méthode 1: Extraire les 36 premiers caractères (format UUID standard)
  if (rawId.length >= 36) {
    const uuid = rawId.slice(0, 36);
    // Vérifier que c'est un UUID valide
    if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(uuid)) {
      return uuid;
    }
  }
  
  // Méthode 2: Utiliser une regex pour trouver l'UUID dans la chaîne
  const uuidMatch = rawId.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/i);
  if (uuidMatch && uuidMatch[0]) {
    return uuidMatch[0];
  }
  
  // Si aucune méthode ne fonctionne, vérifier si l'ID original est un UUID valide
  return rawId.length === 36 && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i.test(rawId) 
    ? rawId 
    : null;
}

// Configuration Supabase
const SUPABASE_URL = 'https://renmjmqlmafqjzldmsgs.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_PUBLIC_ANON_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Fonction pour récupérer un devis par ID
 * Gère automatiquement l'extraction de l'UUID si l'ID contient un suffixe
 */
async function getQuote(rawId) {
  console.log('🔍 [getQuote] ID brut reçu:', rawId);

  // ✅ Utiliser la fonction robuste extractUUID au lieu de split('-mix')[0]
  const validUuid = extractUUID(rawId);

  if (!validUuid) {
    console.error('❌ [getQuote] Impossible d\'extraire un UUID valide de:', rawId);
    return null;
  }

  console.log('✅ [getQuote] UUID extrait:', validUuid);

  // Récupérer le devis avec l'UUID valide
  const { data, error } = await supabase
    .from('ai_quotes')
    .select('*')
    .eq('id', validUuid) // Utilisation de l'UUID nettoyé
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

/**
 * Fonction pour récupérer plusieurs devis avec pagination (cursor)
 * 
 * @param {string|null} lastId - ID du dernier devis récupéré (pour la pagination)
 * @param {number} limit - Nombre de devis à récupérer (défaut: 10)
 * @param {string} userId - ID de l'utilisateur (optionnel, pour filtrer)
 */
async function getQuotesCursor(lastId = null, limit = 10, userId = null) {
  console.log('🔍 [getQuotesCursor] Récupération avec pagination...');
  console.log('   lastId:', lastId || 'null (premier lot)');
  console.log('   limit:', limit);
  console.log('   userId:', userId || 'non filtré');

  let query = supabase
    .from('ai_quotes')
    .select('*')
    .order('created_at', { ascending: false }); // Trier par date de création (plus récent en premier)

  // Filtrer par utilisateur si fourni
  if (userId) {
    query = query.eq('user_id', userId);
  }

  // Pagination cursor : récupérer les devis créés avant le dernier ID
  if (lastId) {
    // Extraire l'UUID si nécessaire
    const validLastId = extractUUID(lastId);
    if (validLastId) {
      // Utiliser created_at pour la pagination (plus fiable que id)
      // On récupère d'abord le devis avec lastId pour obtenir son created_at
      const { data: lastQuote } = await supabase
        .from('ai_quotes')
        .select('created_at')
        .eq('id', validLastId)
        .single();

      if (lastQuote?.created_at) {
        query = query.lt('created_at', lastQuote.created_at);
      }
    }
  }

  query = query.limit(limit);

  const { data, error } = await query;

  if (error) {
    console.error('❌ [getQuotesCursor] Erreur chargement devis avec cursor:', error);
    console.error('   Code:', error.code);
    console.error('   Message:', error.message);
    return null;
  }

  console.log(`✅ [getQuotesCursor] ${data?.length || 0} devis récupérés`);
  if (data && data.length > 0) {
    console.log('   Premier devis:', data[0].quote_number || data[0].id);
    console.log('   Dernier devis:', data[data.length - 1].quote_number || data[data.length - 1].id);
  }

  return data;
}

/**
 * Fonction pour récupérer tous les devis d'un utilisateur (avec pagination automatique)
 */
async function getAllQuotesForUser(userId, batchSize = 50) {
  console.log('🔍 [getAllQuotesForUser] Récupération de tous les devis...');
  console.log('   userId:', userId);
  console.log('   batchSize:', batchSize);

  const allQuotes = [];
  let lastId = null;
  let hasMore = true;

  while (hasMore) {
    const quotes = await getQuotesCursor(lastId, batchSize, userId);
    
    if (!quotes || quotes.length === 0) {
      hasMore = false;
      break;
    }

    allQuotes.push(...quotes);

    // Si on a récupéré moins que le batchSize, c'est qu'il n'y a plus de devis
    if (quotes.length < batchSize) {
      hasMore = false;
    } else {
      // Utiliser l'ID du dernier devis pour la prochaine itération
      lastId = quotes[quotes.length - 1].id;
    }
  }

  console.log(`✅ [getAllQuotesForUser] Total: ${allQuotes.length} devis récupérés`);
  return allQuotes;
}

// ============================================
// EXEMPLES D'UTILISATION
// ============================================

async function runExamples() {
  console.log('='.repeat(60));
  console.log('EXEMPLES DE RÉCUPÉRATION DE DEVIS');
  console.log('='.repeat(60));

  // Exemple 1: Récupérer un devis avec ID contenant un suffixe
  if (SUPABASE_ANON_KEY && SUPABASE_ANON_KEY !== 'YOUR_PUBLIC_ANON_KEY') {
    const rawId = "0e74a1bf-0178-4d8d-ad4f-a6e1297bae6b-mixads3x";
    console.log('\n📝 Exemple 1: Récupération d\'un devis avec suffixe');
    await getQuote(rawId);

    // Exemple 2: Récupérer un devis avec UUID propre
    console.log('\n📝 Exemple 2: Récupération d\'un devis avec UUID propre');
    const cleanUuid = "0e74a1bf-0178-4d8d-ad4f-a6e1297bae6b";
    await getQuote(cleanUuid);

    // Exemple 3: Pagination cursor
    console.log('\n📝 Exemple 3: Pagination avec cursor');
    const firstBatch = await getQuotesCursor(null, 5);
    if (firstBatch && firstBatch.length > 0) {
      const lastId = firstBatch[firstBatch.length - 1].id;
      console.log('\n   Récupération du lot suivant...');
      await getQuotesCursor(lastId, 5);
    }
  } else {
    console.log('\n⚠️  Clé API Supabase non configurée.');
    console.log('   Configurez VITE_SUPABASE_ANON_KEY pour tester les exemples.');
    console.log('   Exemple: VITE_SUPABASE_ANON_KEY=your_key node scripts/get-quote-example.js');
  }
}

// Exécution si le script est appelé directement
if (require.main === module) {
  runExamples().catch(console.error);
}

// Export pour utilisation dans d'autres fichiers
module.exports = { getQuote, getQuotesCursor, getAllQuotesForUser };





