-- ============================================
-- VÉRIFICATION FINALE COMPLÈTE
-- ============================================
-- Ce script vérifie TOUT automatiquement
-- ============================================

-- 1. VÉRIFIER RLS
DO $$
DECLARE
  v_rls_enabled BOOLEAN;
BEGIN
  SELECT relforcerowsecurity OR relrowsecurity INTO v_rls_enabled
  FROM pg_class
  WHERE relname = 'clients'
  AND relnamespace = 'public'::regnamespace;
  
  IF v_rls_enabled THEN
    RAISE NOTICE '✅ RLS activé sur clients';
  ELSE
    RAISE WARNING '❌ RLS désactivé sur clients';
  END IF;
END $$;

-- 2. VÉRIFIER POLICIES
DO $$
DECLARE
  v_policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'clients';
  
  IF v_policy_count >= 4 THEN
    RAISE NOTICE '✅ % policies RLS trouvées', v_policy_count;
  ELSE
    RAISE WARNING '❌ Seulement % policies RLS trouvées (4 attendues)', v_policy_count;
  END IF;
END $$;

-- 3. VÉRIFIER TRIGGER
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.clients'::regclass
    AND tgname = 'force_company_id'
    AND tgenabled = 'O'
  ) THEN
    RAISE NOTICE '✅ Trigger force_company_id actif';
  ELSE
    RAISE WARNING '❌ Trigger force_company_id inactif ou manquant';
  END IF;
END $$;

-- 4. VÉRIFIER FONCTION current_company_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'current_company_id'
    AND pronamespace = 'public'::regnamespace
  ) THEN
    RAISE NOTICE '✅ Fonction current_company_id() existe';
  ELSE
    RAISE WARNING '❌ Fonction current_company_id() manquante';
  END IF;
END $$;

-- 5. VÉRIFIER DONNÉES
DO $$
DECLARE
  v_total_clients INTEGER;
  v_orphaned_clients INTEGER;
  v_duplicate_clients INTEGER;
  v_companies_with_clients INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_clients FROM public.clients;
  SELECT COUNT(*) INTO v_orphaned_clients FROM public.clients WHERE company_id IS NULL;
  SELECT COUNT(*) INTO v_companies_with_clients FROM (
    SELECT DISTINCT company_id FROM public.clients WHERE company_id IS NOT NULL
  ) sub;
  SELECT COUNT(*) INTO v_duplicate_clients FROM (
    SELECT id FROM public.clients GROUP BY id HAVING COUNT(DISTINCT company_id) > 1
  ) sub;
  
  RAISE NOTICE '📊 Total clients: %', v_total_clients;
  RAISE NOTICE '📊 Entreprises avec clients: %', v_companies_with_clients;
  
  IF v_orphaned_clients = 0 THEN
    RAISE NOTICE '✅ Aucun client orphelin (sans company_id)';
  ELSE
    RAISE WARNING '❌ % clients orphelins trouvés', v_orphaned_clients;
  END IF;
  
  IF v_duplicate_clients = 0 THEN
    RAISE NOTICE '✅ Aucun client dupliqué entre entreprises';
  ELSE
    RAISE WARNING '❌ % clients dupliqués trouvés', v_duplicate_clients;
  END IF;
END $$;

-- 6. VÉRIFIER UTILISATEURS MULTI-ENTREPRISES
DO $$
DECLARE
  v_multi_company_users INTEGER;
  v_user_record RECORD;
BEGIN
  SELECT COUNT(DISTINCT user_id) INTO v_multi_company_users
  FROM (
    SELECT user_id, COUNT(DISTINCT company_id) as company_count
    FROM public.company_users
    GROUP BY user_id
    HAVING COUNT(DISTINCT company_id) > 1
  ) sub;
  
  IF v_multi_company_users > 0 THEN
    RAISE WARNING '⚠️  % utilisateur(s) appartiennent à plusieurs entreprises', v_multi_company_users;
    RAISE WARNING '   Ces utilisateurs verront toujours la première entreprise:';
    
    FOR v_user_record IN
      SELECT p.email, COUNT(DISTINCT cu.company_id) as company_count,
             STRING_AGG(c.name, ', ' ORDER BY cu.created_at) as companies
      FROM public.profiles p
      JOIN public.company_users cu ON cu.user_id = p.id
      JOIN public.companies c ON c.id = cu.company_id
      GROUP BY p.id, p.email
      HAVING COUNT(DISTINCT cu.company_id) > 1
    LOOP
      RAISE WARNING '   - % appartient à: %', v_user_record.email, v_user_record.companies;
    END LOOP;
    
    RAISE WARNING '';
    RAISE WARNING '   SOLUTION: Utilisez le CompanySelector dans l''UI ou testez avec des utilisateurs séparés';
  ELSE
    RAISE NOTICE '✅ Chaque utilisateur appartient à une seule entreprise';
  END IF;
END $$;

-- 7. RÉSUMÉ FINAL
SELECT 
  '🎯 RÉSUMÉ FINAL' as section,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_class 
      WHERE relname = 'clients' 
      AND relnamespace = 'public'::regnamespace
      AND (relforcerowsecurity OR relrowsecurity)
    ) THEN '✅'
    ELSE '❌'
  END as rls_status,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'clients')::TEXT as policies_count,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_trigger 
      WHERE tgrelid = 'public.clients'::regclass 
      AND tgname = 'force_company_id'
      AND tgenabled = 'O'
    ) THEN '✅'
    ELSE '❌'
  END as trigger_status,
  (SELECT COUNT(*) FROM public.clients WHERE company_id IS NULL)::TEXT as orphaned_clients,
  (SELECT COUNT(*) FROM (
    SELECT id FROM public.clients GROUP BY id HAVING COUNT(DISTINCT company_id) > 1
  ) sub)::TEXT as duplicate_clients,
  (SELECT COUNT(DISTINCT user_id) FROM (
    SELECT user_id FROM public.company_users GROUP BY user_id HAVING COUNT(DISTINCT company_id) > 1
  ) sub)::TEXT as multi_company_users;

-- 8. CONCLUSION
DO $$
DECLARE
  v_rls_ok BOOLEAN;
  v_policies_ok BOOLEAN;
  v_trigger_ok BOOLEAN;
  v_data_ok BOOLEAN;
  v_all_ok BOOLEAN;
BEGIN
  -- Vérifier RLS
  SELECT relforcerowsecurity OR relrowsecurity INTO v_rls_ok
  FROM pg_class
  WHERE relname = 'clients'
  AND relnamespace = 'public'::regnamespace;
  
  -- Vérifier policies (au moins 4)
  SELECT COUNT(*) >= 4 INTO v_policies_ok
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'clients';
  
  -- Vérifier trigger
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.clients'::regclass
    AND tgname = 'force_company_id'
    AND tgenabled = 'O'
  ) INTO v_trigger_ok;
  
  -- Vérifier données (pas d'orphelins, pas de doublons)
  SELECT NOT EXISTS (
    SELECT 1 FROM public.clients WHERE company_id IS NULL
  ) AND NOT EXISTS (
    SELECT 1 FROM (
      SELECT id FROM public.clients GROUP BY id HAVING COUNT(DISTINCT company_id) > 1
    ) sub
  ) INTO v_data_ok;
  
  v_all_ok := v_rls_ok AND v_policies_ok AND v_trigger_ok AND v_data_ok;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CONCLUSION';
  RAISE NOTICE '========================================';
  
  IF v_all_ok THEN
    RAISE NOTICE '🎉 TOUT EST CORRECT AU NIVEAU BACKEND !';
    RAISE NOTICE '';
    RAISE NOTICE 'L''isolation multi-tenant est configurée correctement:';
    RAISE NOTICE '✅ RLS activé';
    RAISE NOTICE '✅ Policies en place';
    RAISE NOTICE '✅ Trigger actif';
    RAISE NOTICE '✅ Données propres';
    RAISE NOTICE '';
    RAISE NOTICE 'Si le problème persiste dans l''application:';
    RAISE NOTICE '1. Rechargez avec Ctrl+Shift+R';
    RAISE NOTICE '2. Vérifiez les logs console (F12)';
    RAISE NOTICE '3. Testez avec des utilisateurs DIFFÉRENTS (un par entreprise)';
  ELSE
    RAISE WARNING '⚠️  PROBLÈMES DÉTECTÉS:';
    IF NOT v_rls_ok THEN RAISE WARNING '❌ RLS non activé'; END IF;
    IF NOT v_policies_ok THEN RAISE WARNING '❌ Policies manquantes'; END IF;
    IF NOT v_trigger_ok THEN RAISE WARNING '❌ Trigger manquant'; END IF;
    IF NOT v_data_ok THEN RAISE WARNING '❌ Données incohérentes'; END IF;
    RAISE WARNING '';
    RAISE WARNING 'Exécutez: supabase/FIX-COMPLET-MULTI-TENANT-ULTIME.sql';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;
