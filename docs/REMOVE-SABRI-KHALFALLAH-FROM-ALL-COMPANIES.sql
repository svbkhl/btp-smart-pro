-- ============================================================================
-- Retirer Sabri Khalfallah de toutes les entreprises
-- ============================================================================
-- Sabri Khalfallah (sabri.khalfallah6@gmail.com) est admin système.
-- Il ne doit pas être membre d'aucune entreprise.
-- À exécuter dans Supabase Dashboard → SQL Editor
-- ============================================================================

DO $$
DECLARE
  v_user_id UUID;
  v_cu_deleted INTEGER;
  v_emp_deleted INTEGER;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE LOWER(email) = 'sabri.khalfallah6@gmail.com'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE '❌ Utilisateur sabri.khalfallah6@gmail.com non trouvé.';
    RETURN;
  END IF;

  -- 1. Supprimer de company_users (toutes les entreprises)
  DELETE FROM public.company_users WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_cu_deleted = ROW_COUNT;
  RAISE NOTICE '✅ % entrée(s) supprimée(s) de company_users', v_cu_deleted;

  -- 2. Supprimer de employees (toutes les entreprises)
  DELETE FROM public.employees WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_emp_deleted = ROW_COUNT;
  RAISE NOTICE '✅ % entrée(s) supprimée(s) de employees', v_emp_deleted;

  RAISE NOTICE '';
  RAISE NOTICE '✅ Sabri Khalfallah a été retiré de toutes les entreprises.';
  RAISE NOTICE '   (Compte admin conservé, il peut toujours accéder au panneau admin)';
END $$;
