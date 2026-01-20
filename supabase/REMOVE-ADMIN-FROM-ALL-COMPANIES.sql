-- =====================================================
-- SCRIPT : RETIRER ADMIN DE TOUTES LES ENTREPRISES
-- =====================================================
-- Ce script retire l'utilisateur sabri.khalfallah6@gmail.com
-- de TOUTES les entreprises car il est un admin global
-- et ne doit appartenir à aucune entreprise spécifique
-- =====================================================

-- Supprimer complètement le trigger updated_at pour company_users
DROP TRIGGER IF EXISTS update_company_users_updated_at ON public.company_users;

DO $$
DECLARE
  v_admin_user_id UUID;
  v_companies_count INTEGER;
  v_row_count INTEGER;
BEGIN
  -- 1. Trouver l'ID de l'utilisateur admin
  SELECT id INTO v_admin_user_id
  FROM auth.users
  WHERE email = 'sabri.khalfallah6@gmail.com';
  
  IF v_admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur sabri.khalfallah6@gmail.com non trouvé';
  END IF;
  
  RAISE NOTICE '✅ Utilisateur admin trouvé: %', v_admin_user_id;
  
  -- 2. Compter les entreprises dont l'admin est membre
  SELECT COUNT(*) INTO v_companies_count
  FROM public.company_users
  WHERE user_id = v_admin_user_id;
  
  RAISE NOTICE '📊 Nombre d''entreprises trouvées: %', v_companies_count;
  
  -- 3. Retirer l'admin de TOUTES les entreprises
  DELETE FROM public.company_users
  WHERE user_id = v_admin_user_id;
  
  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  
  IF v_row_count > 0 THEN
    RAISE NOTICE '✅ Admin retiré de % entreprise(s)', v_row_count;
  ELSE
    RAISE NOTICE 'ℹ️ Admin n''était membre d''aucune entreprise';
  END IF;
  
  -- 4. Lister les entreprises dont l'admin était propriétaire
  -- (pour information, on ne les supprime pas, juste pour logging)
  SELECT COUNT(*) INTO v_companies_count
  FROM public.companies
  WHERE owner_id = v_admin_user_id;
  
  IF v_companies_count > 0 THEN
    RAISE NOTICE '⚠️ ATTENTION: L''admin est toujours propriétaire de % entreprise(s)', v_companies_count;
    RAISE NOTICE '   Ces entreprises restent dans la base mais l''admin n''est plus membre';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '📋 RÉSUMÉ:';
  RAISE NOTICE '   - Utilisateur: sabri.khalfallah6@gmail.com';
  RAISE NOTICE '   - Retiré de toutes les entreprises';
  RAISE NOTICE '   - L''admin est maintenant indépendant de toute entreprise';
  RAISE NOTICE '';
  RAISE NOTICE '💡 En tant qu''admin global, l''utilisateur peut maintenant:';
  RAISE NOTICE '   - Accéder à toutes les fonctionnalités admin';
  RAISE NOTICE '   - Gérer toutes les entreprises depuis l''interface admin';
  RAISE NOTICE '   - Ne pas être limité par les restrictions d''entreprise';
  
END $$;

-- Vérification finale : confirmer que l'admin n'est plus dans aucune entreprise
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ OK: L''admin n''est plus membre d''aucune entreprise'
    ELSE '❌ ATTENTION: L''admin est encore membre de ' || COUNT(*) || ' entreprise(s)'
  END AS status_check
FROM public.company_users cu
JOIN auth.users u ON u.id = cu.user_id
WHERE u.email = 'sabri.khalfallah6@gmail.com';

-- Lister toutes les entreprises (pour vérification)
SELECT 
  c.id AS company_id,
  c.name AS company_name,
  c.owner_id,
  CASE 
    WHEN c.owner_id = (SELECT id FROM auth.users WHERE email = 'sabri.khalfallah6@gmail.com') 
    THEN '✅ Propriétaire (mais pas membre)'
    ELSE '❌ Pas propriétaire'
  END AS ownership_status
FROM public.companies c
ORDER BY c.name;
