#!/usr/bin/env node
/**
 * Script de seed pour les données de démo
 * Usage: npm run seed:demo [--force]
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Erreur : Variables d\'environnement manquantes');
  console.error('   VITE_SUPABASE_URL:', SUPABASE_URL ? '✅' : '❌');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function seedDemo(force: boolean = false) {
  console.log('🌱 Démarrage du seed de données de démo...\n');

  try {
    // Si --force, supprimer d'abord les données de démo existantes
    if (force) {
      console.log('🗑️  Suppression des données de démo existantes...');
      await purgeDemo();
    }

    // Lire et exécuter le script SQL
    const sqlPath = join(__dirname, '../supabase/seeds/demo.sql');
    const sql = readFileSync(sqlPath, 'utf-8');

    console.log('📝 Exécution du script SQL...');
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // Si la fonction RPC n'existe pas, exécuter directement via query
      console.log('⚠️  RPC exec_sql non disponible, exécution directe...');
      
      // Extraire et exécuter les INSERT statements
      const statements = sql.split(';').filter(s => s.trim().length > 0);
      
      for (const statement of statements) {
        if (statement.trim().startsWith('INSERT') || statement.trim().startsWith('DELETE')) {
          const { error: execError } = await supabase.rpc('exec_sql', { sql_query: statement + ';' });
          if (execError && !execError.message.includes('does not exist')) {
            console.warn('⚠️  Erreur sur une requête:', execError.message);
          }
        }
      }
    }

    // Alternative : utiliser directement les fonctions Supabase
    await seedDemoDirect();

    console.log('\n✅ Seed de démo terminé avec succès !');
    console.log('\n📊 Données créées :');
    console.log('   - Clients de démo');
    console.log('   - Projets de démo');
    console.log('   - Devis de démo');
    console.log('   - Notifications de démo');
    console.log('   - Données RH de démo (si tables existent)');
    
  } catch (error: any) {
    console.error('❌ Erreur lors du seed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

async function seedDemoDirect() {
  // Récupérer le premier utilisateur
  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
  
  if (usersError || !users || users.length === 0) {
    throw new Error('Aucun utilisateur trouvé. Créez un compte d\'abord.');
  }

  const demoUserId = users[0].id;
  console.log(`📝 Utilisation de l'utilisateur: ${users[0].email}`);

  // Dates pour les données réalistes
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
  const fiveDaysFromNow = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

  // 1. CLIENTS
  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .upsert([
      {
        user_id: demoUserId,
        name: 'Entreprise Bernard & Fils',
        email: 'contact@bernard-construction.fr',
        phone: '+33 1 23 45 67 89',
        location: '15 Rue de la République, 75001 Paris',
        status: 'actif',
        is_demo: true,
        created_at: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        user_id: demoUserId,
        name: 'Promotion Immobilière Dubois',
        email: 'info@dubois-promotion.fr',
        phone: '+33 1 98 76 54 32',
        location: '42 Avenue des Champs-Élysées, 75008 Paris',
        status: 'VIP',
        is_demo: true,
        created_at: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        user_id: demoUserId,
        name: 'M. et Mme Martin',
        email: 'martin.famille@email.fr',
        phone: '+33 6 12 34 56 78',
        location: '8 Impasse des Roses, 92100 Boulogne-Billancourt',
        status: 'actif',
        is_demo: true,
        created_at: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString()
      }
    ], { onConflict: 'id', ignoreDuplicates: false })
    .select();

  if (clientsError) {
    console.warn('⚠️  Erreur lors de la création des clients:', clientsError.message);
  } else {
    console.log('✅ Clients de démo créés');
  }

  const clientIds = clients?.map(c => c.id) || [];

  // 2. PROJETS
  if (clientIds.length >= 3) {
    const { error: projectsError } = await supabase
      .from('projects')
      .upsert([
        {
          user_id: demoUserId,
          client_id: clientIds[0],
          name: 'Rénovation complète appartement 75m²',
          status: 'en_cours',
          progress: 65,
          budget: 125000.00,
          location: '12 Rue de Rivoli, 75004 Paris',
          start_date: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end_date: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          description: 'Rénovation complète d\'un appartement : électricité, plomberie, carrelage, peinture.',
          is_demo: true,
          created_at: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          user_id: demoUserId,
          client_id: clientIds[1],
          name: 'Extension maison +20m² avec terrasse',
          status: 'planifié',
          progress: 0,
          budget: 85000.00,
          location: '45 Chemin des Vignes, 92160 Antony',
          start_date: fiveDaysFromNow.toISOString().split('T')[0],
          end_date: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          description: 'Extension de 20m² avec création d\'une terrasse couverte.',
          is_demo: true,
          created_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          user_id: demoUserId,
          client_id: clientIds[2],
          name: 'Rénovation salle de bain complète',
          status: 'terminé',
          progress: 100,
          budget: 18500.00,
          location: '8 Impasse des Roses, 92100 Boulogne-Billancourt',
          start_date: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end_date: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          description: 'Rénovation complète : carrelage, sanitaires, miroir, douche italienne.',
          is_demo: true,
          created_at: new Date(now.getTime() - 50 * 24 * 60 * 60 * 1000).toISOString()
        }
      ], { onConflict: 'id', ignoreDuplicates: false });

    if (projectsError) {
      console.warn('⚠️  Erreur lors de la création des projets:', projectsError.message);
    } else {
      console.log('✅ Projets de démo créés');
    }
  }

  // 3. DEVIS
  const { error: quotesError } = await supabase
    .from('ai_quotes')
    .upsert([
      {
        user_id: demoUserId,
        client_name: 'Entreprise Bernard & Fils',
        work_type: 'Rénovation complète',
        surface: 75,
        estimated_cost: 125000.00,
        status: 'pending',
        details: { materials: ['Carrelage', 'Peinture', 'Électricité'], description: 'Rénovation complète' },
        is_demo: true,
        created_at: threeDaysAgo.toISOString()
      },
      {
        user_id: demoUserId,
        client_name: 'M. et Mme Martin',
        work_type: 'Rénovation salle de bain',
        surface: 8,
        estimated_cost: 18500.00,
        status: 'signed',
        signed_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        signed_by: 'M. Martin',
        details: { materials: ['Carrelage', 'Sanitaires'], description: 'Rénovation salle de bain' },
        is_demo: true,
        created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        user_id: demoUserId,
        client_name: 'Promotion Immobilière Dubois',
        work_type: 'Extension maison',
        surface: 20,
        estimated_cost: 85000.00,
        status: 'pending',
        details: { materials: ['Béton', 'Charpente', 'Couverture'], description: 'Extension maison' },
        is_demo: true,
        created_at: oneDayAgo.toISOString()
      }
    ], { onConflict: 'id', ignoreDuplicates: false });

  if (quotesError) {
    console.warn('⚠️  Erreur lors de la création des devis:', quotesError.message);
  } else {
    console.log('✅ Devis de démo créés');
  }

  // 4. NOTIFICATIONS
  const { error: notificationsError } = await supabase
    .from('notifications')
    .upsert([
      {
        user_id: demoUserId,
        title: 'Devis en attente',
        message: 'Le devis pour "Rénovation complète appartement" est en attente de signature depuis 3 jours.',
        type: 'warning',
        related_table: 'ai_quotes',
        is_read: false,
        is_demo: true,
        created_at: threeDaysAgo.toISOString()
      },
      {
        user_id: demoUserId,
        title: 'Chantier à démarrer',
        message: 'Le chantier "Extension maison +20m²" démarre dans 5 jours. Pensez à préparer le matériel.',
        type: 'info',
        related_table: 'projects',
        is_read: false,
        is_demo: true,
        created_at: oneDayAgo.toISOString()
      },
      {
        user_id: demoUserId,
        title: 'Paiement reçu',
        message: 'Paiement de 18 500€ reçu pour le projet "Rénovation salle de bain complète".',
        type: 'success',
        related_table: 'projects',
        is_read: true,
        is_demo: true,
        created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()
      }
    ], { onConflict: 'id', ignoreDuplicates: false });

  if (notificationsError) {
    console.warn('⚠️  Erreur lors de la création des notifications:', notificationsError.message);
  } else {
    console.log('✅ Notifications de démo créées');
  }

  console.log('\n✅ Seed direct terminé !');
}

async function purgeDemo() {
  console.log('🗑️  Purge des données de démo...');
  
  const tables = ['clients', 'projects', 'ai_quotes', 'notifications', 'employees', 'candidatures', 'taches_rh'];
  
  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('is_demo', true);
    
    if (error && !error.message.includes('does not exist')) {
      console.warn(`⚠️  Erreur lors de la purge de ${table}:`, error.message);
    }
  }
  
  console.log('✅ Purge terminée');
}

// Main
const force = process.argv.includes('--force');
seedDemo(force).catch(console.error);

