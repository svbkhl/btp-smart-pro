-- =====================================================
-- DÉSACTIVER LE TRIGGER SUR EVENTS QUI CAUSE LE BUG
-- =====================================================
-- ⚠️ EXÉCUTE CE SCRIPT DANS L'ÉDITEUR SQL DE SUPABASE
-- https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/sql
-- =====================================================

-- Le trigger set_event_user_id() remplace TOUJOURS user_id par auth.uid()
-- Cela cause des problèmes car auth.uid() ne retourne pas toujours le bon UUID
-- depuis le contexte PostgREST/JWT

-- ✅ SOLUTION : Désactiver le trigger et laisser le frontend gérer user_id

-- 1. Supprimer le trigger
DROP TRIGGER IF EXISTS trigger_set_event_user_id ON public.events;

-- 2. Supprimer la fonction (optionnel, mais recommandé pour la propreté)
DROP FUNCTION IF EXISTS public.set_event_user_id();

-- 3. Vérifier que le trigger est bien supprimé
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table, 
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'events';

-- ⚠️ Si la requête ci-dessus retourne des lignes, le trigger existe encore
-- ✅ Si elle ne retourne rien, le trigger est bien supprimé

-- =====================================================
-- RÉSULTAT ATTENDU
-- =====================================================
-- Après exécution de ce script :
-- ✅ Le frontend peut définir user_id directement
-- ✅ Plus d'erreur "invalid input syntax for type uuid: "events""
-- ✅ Les RLS policies continuent de fonctionner normalement
-- =====================================================
