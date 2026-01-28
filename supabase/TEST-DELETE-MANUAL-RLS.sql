-- =====================================================
-- TEST MANUEL : Vérifier si RLS bloque vraiment les suppressions
-- =====================================================
-- Ce script teste manuellement si les RLS policies DELETE
-- empêchent vraiment la suppression de clients d'autres entreprises
-- =====================================================

-- ⚠️ IMPORTANT: Exécutez ce script avec un utilisateur connecté dans Supabase Dashboard
-- (utilisez le contexte d'un utilisateur membre d'une entreprise)

-- 1. Voir votre company_id actuel
SELECT 
  'Votre company_id actuel' as info,
  auth.uid() as user_id,
  public.current_company_id() as your_company_id;

-- 2. Lister les clients de VOTRE entreprise
SELECT 
  'Clients de votre entreprise (visibles)' as info,
  id,
  name,
  company_id
FROM public.clients
WHERE company_id = public.current_company_id()
ORDER BY created_at DESC
LIMIT 10;

-- 3. Tester une suppression avec un mauvais company_id (devrait échouer)
-- REMPLACEZ 'CLIENT_ID_HERE' par un ID de client de VOTRE entreprise
-- REMPLACEZ 'WRONG_COMPANY_ID_HERE' par un company_id d'une AUTRE entreprise
-- Cette suppression devrait échouer à cause des RLS policies

DO $$
DECLARE
  v_client_id UUID := 'CLIENT_ID_HERE';  -- ⚠️ REMPLACEZ
  v_wrong_company_id UUID := 'WRONG_COMPANY_ID_HERE';  -- ⚠️ REMPLACEZ
  v_deleted_count INTEGER;
  v_error_message TEXT;
BEGIN
  -- Tenter de supprimer avec un mauvais company_id
  BEGIN
    DELETE FROM public.clients
    WHERE id = v_client_id
    AND company_id = v_wrong_company_id;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    IF v_deleted_count > 0 THEN
      RAISE WARNING '❌ PROBLÈME: % client(s) supprimé(s) avec un mauvais company_id! RLS ne fonctionne pas!', v_deleted_count;
      RAISE EXCEPTION 'ERREUR CRITIQUE: Les RLS policies DELETE ne fonctionnent pas correctement!';
    ELSE
      RAISE NOTICE '✅ OK: Aucun client supprimé avec un mauvais company_id (RLS fonctionne)';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_error_message := SQLERRM;
    RAISE NOTICE '✅ OK: Suppression bloquée par RLS (comme prévu): %', v_error_message;
  END;
END $$;

-- 4. Vérifier les policies DELETE actives
SELECT 
  'Policies DELETE actives' as info,
  policyname,
  permissive,
  qual as condition_usando
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'clients'
AND cmd = 'DELETE';
