// =====================================================
// SCRIPT DE TEST - À EXÉCUTER DANS LA CONSOLE (F12)
// =====================================================

// Copie-colle ce script dans la console de l'app
// pour vérifier si les emails sont bien en base

console.log('🔍 Début des vérifications...');

// 1️⃣ Vérifier le mode démo
const fakeDataEnabled = localStorage.getItem('fake-data-enabled');
console.log('1️⃣ Mode démo:', fakeDataEnabled);

if (fakeDataEnabled === 'true') {
  console.error('❌ MODE DÉMO ACTIVÉ ! Les vrais emails ne s\'afficheront pas !');
  console.log('🔧 Désactive avec: localStorage.removeItem("fake-data-enabled")');
} else {
  console.log('✅ Mode démo désactivé');
}

// 2️⃣ Vérifier si Supabase est disponible
if (typeof supabase === 'undefined') {
  console.error('❌ Supabase client non disponible');
  console.log('💡 Importe-le : import { supabase } from "@/integrations/supabase/client"');
} else {
  console.log('✅ Supabase client disponible');
  
  // 3️⃣ Tester la requête sur email_messages
  console.log('3️⃣ Test requête email_messages...');
  
  supabase
    .from('email_messages')
    .select('*')
    .order('sent_at', { ascending: false })
    .limit(10)
    .then(({ data, error }) => {
      if (error) {
        console.error('❌ Erreur requête email_messages:', error);
        if (error.code === 'PGRST116') {
          console.error('❌ La table email_messages n\'existe pas !');
          console.log('🔧 Exécute le script CREATE-EMAIL-MESSAGES-TABLE.sql dans Supabase');
        }
      } else {
        console.log(`✅ Emails trouvés: ${data?.length || 0}`);
        if (data && data.length > 0) {
          console.log('📧 Emails:', data);
          console.table(data.map(e => ({
            destinataire: e.recipient_email,
            sujet: e.subject,
            type: e.email_type,
            status: e.status,
            envoyé: e.sent_at || e.created_at
          })));
        } else {
          console.warn('⚠️ Aucun email trouvé dans email_messages');
          console.log('💡 Envoie un email de test (devis, paiement, etc.)');
        }
      }
    });
  
  // 4️⃣ Vérifier l'utilisateur connecté
  supabase.auth.getUser().then(({ data: { user }, error }) => {
    if (error) {
      console.error('❌ Erreur user:', error);
    } else if (!user) {
      console.error('❌ Aucun utilisateur connecté');
    } else {
      console.log('✅ Utilisateur:', user.email, '(ID:', user.id, ')');
    }
  });
}

console.log('🎯 Vérifications terminées ! Regarde les résultats ci-dessus.');
