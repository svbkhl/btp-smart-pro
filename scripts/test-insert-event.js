/**
 * Script de test pour insérer un événement (version JavaScript)
 * 
 * Usage :
 * 1. Configurez vos variables d'environnement :
 *    - VITE_SUPABASE_URL
 *    - VITE_SUPABASE_ANON_KEY
 * 2. Exécutez : node scripts/test-insert-event.js
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://renmjmqlmafqjzldmsgs.supabase.co'
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_PUBLIC_ANON_KEY'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testInsertEvent() {
  console.log('🧪 Test d\'insertion d\'un événement...\n')

  // 1. Vérifier l'authentification
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    console.error('❌ Erreur : Vous devez être authentifié pour créer un événement')
    console.error('💡 Connectez-vous d\'abord via l\'application web')
    return
  }

  console.log('✅ Utilisateur authentifié:', user.id)
  console.log('📧 Email:', user.email)

  // 2. Préparer les données de l'événement
  const eventData = {
    user_id: user.id, // ⚠️ IMPORTANT : Inclure le user_id
    title: 'Événement test',
    description: 'Insertion test via script',
    start_date: new Date('2025-12-08T16:58:00Z').toISOString(),
    end_date: new Date('2025-12-25T16:58:00Z').toISOString(),
    all_day: false,
    type: 'meeting',
    color: '#3b82f6',
  }

  console.log('\n📝 Données à insérer:', eventData)

  // 3. Insérer l'événement
  const { data, error } = await supabase
    .from('events')
    .insert([eventData])
    .select()

  if (error) {
    console.error('\n❌ Erreur lors de l\'insertion:', error)
    console.error('Code:', error.code)
    console.error('Message:', error.message)
    console.error('Details:', error.details)
    console.error('Hint:', error.hint)
    return
  }

  console.log('\n✅ Événement inséré avec succès!')
  console.log('📋 Données retournées:', data)
}

// Exécution
testInsertEvent()
  .then(() => {
    console.log('\n✨ Test terminé')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Erreur fatale:', error)
    process.exit(1)
  })





