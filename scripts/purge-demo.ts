#!/usr/bin/env node
/**
 * Script de purge pour supprimer toutes les données de démo
 * Usage: npm run purge:demo
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Erreur : Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function purgeDemo() {
  console.log('🗑️  Démarrage de la purge des données de démo...\n');

  const tables = [
    'clients',
    'projects',
    'ai_quotes',
    'notifications',
    'employees',
    'candidatures',
    'taches_rh',
    'rh_activities',
    'employee_performances'
  ];

  let totalDeleted = 0;

  for (const table of tables) {
    try {
      // Vérifier si la table existe
      const { data, error: checkError } = await supabase
        .from(table)
        .select('id', { count: 'exact', head: true })
        .eq('is_demo', true)
        .limit(1);

      if (checkError && checkError.message.includes('does not exist')) {
        console.log(`⏭️  Table ${table} n'existe pas, ignorée`);
        continue;
      }

      // Supprimer les données de démo
      const { data: deleted, error } = await supabase
        .from(table)
        .delete()
        .eq('is_demo', true)
        .select();

      if (error) {
        console.warn(`⚠️  Erreur lors de la purge de ${table}:`, error.message);
      } else {
        const count = deleted?.length || 0;
        totalDeleted += count;
        console.log(`✅ ${table}: ${count} enregistrement(s) supprimé(s)`);
      }
    } catch (error: any) {
      console.warn(`⚠️  Erreur sur ${table}:`, error.message);
    }
  }

  // Mettre à jour les statistiques
  try {
    const { data: { users } } = await supabase.auth.admin.listUsers();
    if (users && users.length > 0) {
      const userId = users[0].id;
      
      // Recalculer les stats
      const { data: projects } = await supabase
        .from('projects')
        .select('id, status, budget')
        .eq('user_id', userId)
        .eq('is_demo', false);

      const { data: clients } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', userId)
        .eq('is_demo', false);

      const totalProjects = projects?.length || 0;
      const totalClients = clients?.length || 0;
      const activeProjects = projects?.filter(p => ['en_cours', 'planifié', 'en_attente'].includes(p.status)).length || 0;
      const completedProjects = projects?.filter(p => p.status === 'terminé').length || 0;
      const totalRevenue = projects?.filter(p => p.status === 'terminé').reduce((sum, p) => sum + (Number(p.budget) || 0), 0) || 0;

      await supabase
        .from('user_stats')
        .upsert({
          user_id: userId,
          total_projects: totalProjects,
          total_clients: totalClients,
          active_projects: activeProjects,
          completed_projects: completedProjects,
          total_revenue: totalRevenue,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
    }
  } catch (error) {
    console.warn('⚠️  Erreur lors de la mise à jour des stats:', error);
  }

  console.log(`\n✅ Purge terminée : ${totalDeleted} enregistrement(s) supprimé(s)`);
}

purgeDemo().catch(console.error);

