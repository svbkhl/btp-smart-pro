-- ============================================
-- VÉRIFIER SI UN UTILISATEUR APPARTIENT À PLUSIEURS ENTREPRISES
-- ============================================
-- Ce script vérifie si vous testez avec un utilisateur qui appartient à plusieurs entreprises
-- ============================================

-- 1. LISTER TOUS LES UTILISATEURS ET LEURS ENTREPRISES
SELECT 
  '👤 Utilisateurs et leurs entreprises' as check_type,
  p.email,
  p.id as user_id,
  STRING_AGG(c.name || ' (' || cu.company_id || ')', ', ' ORDER BY cu.created_at) as companies,
  COUNT(DISTINCT cu.company_id) as company_count
FROM public.profiles p
LEFT JOIN public.company_users cu ON cu.user_id = p.id
LEFT JOIN public.companies c ON c.id = cu.company_id
GROUP BY p.id, p.email
HAVING COUNT(DISTINCT cu.company_id) > 0
ORDER BY COUNT(DISTINCT cu.company_id) DESC, p.email;

-- 2. ⚠️ UTILISATEURS AVEC PLUSIEURS ENTREPRISES (PROBLÈME PROBABLE)
SELECT 
  '⚠️ PROBLÈME: Utilisateurs multi-entreprises' as check_type,
  p.email,
  p.id as user_id,
  COUNT(DISTINCT cu.company_id) as company_count,
  STRING_AGG(c.name, ', ' ORDER BY cu.created_at) as companies,
  STRING_AGG(cu.company_id::TEXT, ', ' ORDER BY cu.created_at) as company_ids,
  (SELECT cu2.company_id FROM public.company_users cu2 WHERE cu2.user_id = p.id ORDER BY cu2.created_at ASC LIMIT 1) as first_company_id
FROM public.profiles p
LEFT JOIN public.company_users cu ON cu.user_id = p.id
LEFT JOIN public.companies c ON c.id = cu.company_id
GROUP BY p.id, p.email
HAVING COUNT(DISTINCT cu.company_id) > 1;

-- 3. EXPLICATION DU PROBLÈME
DO $$
DECLARE
  v_multi_company_users INTEGER;
BEGIN
  SELECT COUNT(DISTINCT user_id) INTO v_multi_company_users
  FROM (
    SELECT user_id, COUNT(DISTINCT company_id) as company_count
    FROM public.company_users
    GROUP BY user_id
    HAVING COUNT(DISTINCT company_id) > 1
  ) sub;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DIAGNOSTIC: Utilisateurs multi-entreprises';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Utilisateurs appartenant à plusieurs entreprises: %', v_multi_company_users;
  RAISE NOTICE '';
  
  IF v_multi_company_users > 0 THEN
    RAISE WARNING '⚠️  PROBLÈME IDENTIFIÉ!';
    RAISE WARNING '   % utilisateur(s) appartiennent à plusieurs entreprises', v_multi_company_users;
    RAISE WARNING '';
    RAISE WARNING '   La fonction getCurrentCompanyId() retourne toujours';
    RAISE WARNING '   la PREMIÈRE entreprise (ORDER BY created_at ASC)';
    RAISE WARNING '';
    RAISE WARNING '   C''est pourquoi vous voyez les mêmes clients';
    RAISE WARNING '   peu importe avec quelle "entreprise" vous vous connectez';
    RAISE WARNING '';
    RAISE WARNING '   SOLUTION:';
    RAISE WARNING '   1. Testez avec des utilisateurs DIFFÉRENTS';
    RAISE WARNING '      (un utilisateur par entreprise)';
    RAISE WARNING '   2. OU implémentez un sélecteur d''entreprise';
    RAISE WARNING '      pour permettre à l''utilisateur de choisir';
  ELSE
    RAISE NOTICE '✅ Pas de problème multi-entreprises détecté';
    RAISE NOTICE '   Chaque utilisateur appartient à une seule entreprise';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;
