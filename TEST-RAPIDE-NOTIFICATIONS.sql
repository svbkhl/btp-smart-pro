-- ============================================
-- TEST : Créer une Notification de Test
-- ============================================
-- Ce script crée une notification de test
-- Exécutez-le dans Supabase Dashboard → SQL Editor
-- ============================================

-- IMPORTANT : Remplacez YOUR_USER_ID par votre user_id
-- Pour trouver votre user_id :
-- 1. Allez dans Supabase Dashboard → Authentication → Users
-- 2. Copiez votre user_id (UUID)
-- 3. Remplacez YOUR_USER_ID ci-dessous

-- Créer une notification de test
INSERT INTO public.notifications (user_id, title, message, type)
VALUES (
  'YOUR_USER_ID'::UUID,  -- ⚠️ REMPLACEZ PAR VOTRE USER_ID
  'Notification de test',
  'Ceci est une notification de test. Si vous voyez ce message, les notifications fonctionnent !',
  'info'
);

-- Vérifier que la notification a été créée
SELECT 
    '✅ Notification de test créée' as status,
    id,
    title,
    message,
    type,
    is_read,
    created_at
FROM public.notifications
WHERE title = 'Notification de test'
ORDER BY created_at DESC
LIMIT 1;

-- ============================================
-- RÉSULTAT ATTENDU
-- ============================================
-- Vous devriez voir une notification avec :
-- - title: "Notification de test"
-- - message: "Ceci est une notification de test..."
-- - type: "info"
-- - is_read: false
-- ============================================

