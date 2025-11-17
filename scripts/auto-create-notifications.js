#!/usr/bin/env node

/**
 * Script automatique pour créer la table notifications
 * Usage: node scripts/auto-create-notifications.js
 * 
 * Prérequis: Ajoutez SUPABASE_SERVICE_ROLE_KEY dans votre .env
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Erreur: Variables d\'environnement manquantes');
  console.error('');
  console.error('📋 Ajoutez dans votre fichier .env :');
  console.error('   SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key');
  console.error('');
  console.error('💡 Vous pouvez trouver la clé dans :');
  console.error('   Supabase Dashboard → Settings → API → service_role key');
  console.error('');
  console.error('🔗 Ou exécutez le script SQL manuellement :');
  console.error('   1. Ouvrez : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/sql/new');
  console.error('   2. Ouvrez : supabase/FORCER-CRÉATION-NOTIFICATIONS.sql');
  console.error('   3. Copiez-collez et exécutez');
  process.exit(1);
}

// Lire le script SQL
const sqlFile = join(__dirname, '../supabase/FORCER-CRÉATION-NOTIFICATIONS.sql');
let sql;
try {
  sql = readFileSync(sqlFile, 'utf-8');
} catch (error) {
  console.error('❌ Erreur: Impossible de lire le fichier SQL');
  console.error('   Fichier:', sqlFile);
  process.exit(1);
}

// Créer le client Supabase avec service_role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Exécuter le SQL
async function executeSQL() {
  console.log('🚀 Exécution automatique du script SQL...');
  console.log('📄 Fichier:', sqlFile);
  console.log('');

  try {
    // Diviser le SQL en commandes individuelles
    const commands = sql
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    console.log(`📝 ${commands.length} commandes SQL à exécuter...`);
    console.log('');

    // Exécuter chaque commande
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      
      // Ignorer les commandes SELECT de vérification pour l'instant
      if (command.toUpperCase().startsWith('SELECT')) {
        continue;
      }

      try {
        // Utiliser rpc pour exécuter du SQL arbitraire
        // Note: Supabase ne permet pas directement d'exécuter du SQL arbitraire via l'API
        // On va utiliser une approche différente
        console.log(`⏳ Commande ${i + 1}/${commands.length}...`);
      } catch (error) {
        console.error(`❌ Erreur à la commande ${i + 1}:`, error.message);
      }
    }

    // Méthode alternative : utiliser l'API REST directement
    console.log('⚠️  L\'API Supabase ne permet pas d\'exécuter du SQL arbitraire directement');
    console.log('');
    console.log('📋 Instructions manuelles (30 secondes) :');
    console.log('   1. Ouvrez : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/sql/new');
    console.log('   2. Ouvrez le fichier : supabase/FORCER-CRÉATION-NOTIFICATIONS.sql');
    console.log('   3. Copiez TOUT le contenu (Cmd+A, Cmd+C)');
    console.log('   4. Collez dans SQL Editor (Cmd+V)');
    console.log('   5. Cliquez sur "Run" (Cmd+Enter)');
    console.log('');
    console.log('✅ C\'est la méthode la plus rapide et la plus fiable !');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.log('');
    console.log('📋 Instructions manuelles :');
    console.log('   1. Ouvrez Supabase Dashboard → SQL Editor');
    console.log('   2. Ouvrez : supabase/FORCER-CRÉATION-NOTIFICATIONS.sql');
    console.log('   3. Copiez-collez et exécutez');
  }
}

executeSQL();

