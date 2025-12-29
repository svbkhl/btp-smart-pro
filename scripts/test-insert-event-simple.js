/**
 * Script de test pour insérer un événement
 * 
 * ⚠️ IMPORTANT : 
 * 1. Vous devez d'abord exécuter le script SQL dans Supabase
 *    (voir supabase/FIX-EVENTS-RLS-FINAL.sql)
 * 2. Vous devez être connecté dans votre application web
 *    pour obtenir un token de session
 * 
 * Usage :
 * 1. Configurez vos variables d'environnement :
 *    export VITE_SUPABASE_URL="https://renmjmqlmafqjzldmsgs.supabase.co"
 *    export VITE_SUPABASE_ANON_KEY="votre_clé_anon"
 * 2. Exécutez : node scripts/test-insert-event-simple.js
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://renmjmqlmafqjzldmsgs.supabase.co'
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_PUBLIC_ANON_KEY'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function insertEventTest() {
  console.log('🧪 Test d\'insertion d\'un événement...\n')

  // 1. Vérifier l'authentification
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    console.error('❌ Erreur : Vous devez être authentifié')
    console.error('💡 Connectez-vous d\'abord via l\'application web')
    console.error('💡 Ou utilisez supabase.auth.signInWithPassword() pour vous connecter')
    return
  }

  console.log('✅ Utilisateur authentifié:', user.id)
  console.log('📧 Email:', user.email, '\n')

  // 2. Préparer les données de l'événement
  // ⚠️ IMPORTANT : Inclure user_id pour que la politique RLS fonctionne
  const eventData = {
    user_id: user.id, // ✅ OBLIGATOIRE : Inclure le user_id
    title: 'Événement test Cursor',
    description: 'Insertion test avec user_id',
    start_date: new Date('2025-12-08T18:17:00Z').toISOString(),
    end_date: new Date('2025-12-20T18:17:00Z').toISOString(),
    all_day: false,
    type: 'meeting',
    color: '#3b82f6',
  }

  console.log('📝 Données à insérer:', eventData)
  console.log('')

  // 3. Insérer l'événement
  const { data, error } = await supabase
    .from('events')
    .insert([eventData])
    .select()

  if (error) {
    console.error('❌ Erreur lors de l\'insertion:', error)
    console.error('Code:', error.code)
    console.error('Message:', error.message)
    console.error('Details:', error.details)
    console.error('Hint:', error.hint)
    
    if (error.code === '42501') {
      console.error('\n💡 SOLUTION : Exécutez le script SQL dans Supabase :')
      console.error('   1. Allez sur https://supabase.com/dashboard')
      console.error('   2. Ouvrez SQL Editor')
      console.error('   3. Exécutez le fichier supabase/FIX-EVENTS-RLS-FINAL.sql')
    }
    return
  }

  console.log('✅ Événement inséré avec succès!')
  console.log('📋 Données retournées:', data)
}

// Exécution
insertEventTest()
  .then(() => {
    console.log('\n✨ Test terminé')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Erreur fatale:', error)
    process.exit(1)
  })





