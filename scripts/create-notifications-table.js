#!/usr/bin/env node

/**
 * Script pour créer automatiquement la table notifications dans Supabase
 * Usage: node scripts/create-notifications-table.js
 */

const fs = require('fs');
const path = require('path');

// Lire les variables d'environnement
require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Erreur: Variables d\'environnement manquantes');
  console.error('   VITE_SUPABASE_URL ou SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  console.error('');
  console.error('💡 Ajoutez SUPABASE_SERVICE_ROLE_KEY dans votre fichier .env');
  console.error('   Vous pouvez la trouver dans Supabase Dashboard → Settings → API → service_role key');
  process.exit(1);
}

// Lire le script SQL
const sqlFile = path.join(__dirname, '../supabase/FORCER-CRÉATION-NOTIFICATIONS.sql');
const sql = fs.readFileSync(sqlFile, 'utf-8');

// Exécuter le SQL via l'API Supabase
async function executeSQL() {
  try {
    console.log('🚀 Exécution du script SQL...');
    console.log('📄 Fichier:', sqlFile);
    console.log('');

    // Utiliser l'API REST de Supabase pour exécuter le SQL
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ sql }),
    });

    if (!response.ok) {
      // Essayer une autre méthode : utiliser l'API Management
      console.log('⚠️  Méthode 1 échouée, tentative avec l\'API Management...');
      
      // Note: L'API Management nécessite un access token différent
      // Pour l'instant, on affiche les instructions
      console.log('');
      console.log('❌ Impossible d\'exécuter automatiquement via l\'API');
      console.log('');
      console.log('📋 Instructions manuelles :');
      console.log('   1. Ouvrez Supabase Dashboard → SQL Editor');
      console.log('   2. Ouvrez le fichier : supabase/FORCER-CRÉATION-NOTIFICATIONS.sql');
      console.log('   3. Copiez-collez le contenu');
      console.log('   4. Cliquez sur "Run"');
      console.log('');
      process.exit(1);
    }

    const result = await response.json();
    console.log('✅ Script exécuté avec succès !');
    console.log('📊 Résultat:', result);
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'exécution:', error.message);
    console.log('');
    console.log('📋 Instructions manuelles :');
    console.log('   1. Ouvrez Supabase Dashboard → SQL Editor');
    console.log('   2. Ouvrez le fichier : supabase/FORCER-CRÉATION-NOTIFICATIONS.sql');
    console.log('   3. Copiez-collez le contenu');
    console.log('   4. Cliquez sur "Run"');
    console.log('');
    process.exit(1);
  }
}

// Vérifier si fetch est disponible (Node 18+)
if (typeof fetch === 'undefined') {
  console.error('❌ Node.js version trop ancienne');
  console.error('   Ce script nécessite Node.js 18+ (qui inclut fetch)');
  console.error('');
  console.error('📋 Instructions manuelles :');
  console.error('   1. Ouvrez Supabase Dashboard → SQL Editor');
  console.error('   2. Ouvrez le fichier : supabase/FORCER-CRÉATION-NOTIFICATIONS.sql');
  console.error('   3. Copiez-collez le contenu');
  console.error('   4. Cliquez sur "Run"');
  process.exit(1);
}

executeSQL();

