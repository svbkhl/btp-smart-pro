-- ============================================================================
-- CORRECTION : Mettre à jour role_id dans company_users pour les utilisateurs existants
-- ============================================================================
-- Ce script corrige les utilisateurs qui ont été invités avant la correction
-- et qui ont un role_id NULL ou incorrect dans company_users
-- ============================================================================

-- 1. Identifier les utilisateurs avec role_id NULL ou incorrect
DO $$
DECLARE
  user_record RECORD;
  target_role_id UUID;
  role_slug TEXT;
  db_role TEXT;
BEGIN
  -- Parcourir tous les company_users sans role_id ou avec role_id NULL
  FOR user_record IN 
    SELECT 
      cu.company_id,
      cu.user_id,
      cu.role_id,
      ur.role as user_role
    FROM public.company_users cu
    LEFT JOIN public.user_roles ur ON ur.user_id = cu.user_id
    WHERE cu.role_id IS NULL
  LOOP
    -- Déterminer le role_slug basé sur user_roles.role
    -- Mapping: dirigeant -> owner, administrateur -> admin, salarie -> employee
    IF user_record.user_role = 'dirigeant' THEN
      role_slug := 'owner';
      db_role := 'dirigeant';
    ELSIF user_record.user_role = 'administrateur' THEN
      role_slug := 'admin';
      db_role := 'administrateur';
    ELSIF user_record.user_role = 'salarie' THEN
      role_slug := 'employee';
      db_role := 'salarie';
    ELSE
      -- Rôle inconnu, passer au suivant
      RAISE NOTICE '⚠️ Rôle inconnu pour user_id %: %', user_record.user_id, user_record.user_role;
      CONTINUE;
    END IF;

    -- Récupérer le role_id depuis la table roles
    SELECT id INTO target_role_id
    FROM public.roles
    WHERE slug = role_slug
    LIMIT 1;

    IF target_role_id IS NULL THEN
      RAISE NOTICE '⚠️ Rôle % (slug: %) non trouvé dans la table roles', db_role, role_slug;
      CONTINUE;
    END IF;

    -- Mettre à jour company_users avec le bon role_id
    UPDATE public.company_users
    SET role_id = target_role_id
    WHERE company_id = user_record.company_id
      AND user_id = user_record.user_id;

    RAISE NOTICE '✅ Mis à jour: company_id=%, user_id=%, role=% -> role_id=%', 
      user_record.company_id, 
      user_record.user_id, 
      db_role, 
      target_role_id;
  END LOOP;

  RAISE NOTICE '✅ Correction terminée pour tous les utilisateurs existants';
END $$;

-- 2. Vérifier les résultats
SELECT 
  cu.company_id,
  cu.user_id,
  cu.role_id,
  r.slug as role_slug,
  r.name as role_name,
  ur.role as user_role,
  CASE 
    WHEN cu.role_id IS NULL THEN '❌ role_id NULL'
    WHEN r.slug IS NULL THEN '❌ role_id invalide'
    ELSE '✅ OK'
  END as status
FROM public.company_users cu
LEFT JOIN public.roles r ON r.id = cu.role_id
LEFT JOIN public.user_roles ur ON ur.user_id = cu.user_id
ORDER BY cu.company_id, cu.user_id;

-- 3. Statistiques
SELECT 
  COUNT(*) as total_company_users,
  COUNT(cu.role_id) as with_role_id,
  COUNT(*) - COUNT(cu.role_id) as without_role_id
FROM public.company_users cu;
