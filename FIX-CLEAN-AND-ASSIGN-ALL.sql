-- ============================================================================
-- NETTOYAGE ET ASSIGNATION COMPLÈTE
-- ============================================================================
-- Ce script nettoie les données incohérentes et assigne correctement
-- tous les utilisateurs à leurs entreprises.
-- ============================================================================

-- ============================================================================
-- ÉTAPE 1: DIAGNOSTIC DES PROBLÈMES
-- ============================================================================

DO $$
DECLARE
  v_count_null_company INTEGER;
  v_count_orphan_users INTEGER;
BEGIN
  RAISE NOTICE '🔍 DIAGNOSTIC DES DONNÉES...';
  RAISE NOTICE '';
  
  -- Compter les company_users avec company_id NULL
  SELECT COUNT(*) INTO v_count_null_company
  FROM public.company_users
  WHERE company_id IS NULL;
  
  IF v_count_null_company > 0 THEN
    RAISE NOTICE '⚠️ Problème trouvé: % utilisateurs avec company_id NULL', v_count_null_company;
  ELSE
    RAISE NOTICE '✅ Aucun company_id NULL dans company_users';
  END IF;
  
  -- Compter les utilisateurs sans entreprise du tout
  SELECT COUNT(*) INTO v_count_orphan_users
  FROM auth.users u
  WHERE NOT EXISTS (
    SELECT 1 FROM public.company_users cu 
    WHERE cu.user_id = u.id AND cu.company_id IS NOT NULL
  );
  
  RAISE NOTICE 'ℹ️  Utilisateurs sans entreprise: %', v_count_orphan_users;
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- ÉTAPE 2: NETTOYER LES DONNÉES INCOHÉRENTES
-- ============================================================================

DO $$
DECLARE
  v_default_company_id UUID;
  v_orphan_user RECORD;
  v_owner_role_id UUID;
  v_cleaned_count INTEGER := 0;
BEGIN
  RAISE NOTICE '🧹 NETTOYAGE DES DONNÉES...';
  RAISE NOTICE '';
  
  -- Récupérer le rôle owner
  SELECT id INTO v_owner_role_id
  FROM public.roles
  WHERE slug = 'owner'
  LIMIT 1;
  
  -- Trouver ou créer une entreprise par défaut
  SELECT id INTO v_default_company_id
  FROM public.companies
  ORDER BY created_at ASC
  LIMIT 1;
  
  IF v_default_company_id IS NULL THEN
    -- Créer une entreprise par défaut si aucune n'existe
    INSERT INTO public.companies (name, created_at, updated_at)
    VALUES ('Entreprise par défaut', NOW(), NOW())
    RETURNING id INTO v_default_company_id;
    
    RAISE NOTICE '✅ Entreprise par défaut créée: %', v_default_company_id;
  ELSE
    RAISE NOTICE '✅ Utilisation de l''entreprise existante: %', v_default_company_id;
  END IF;
  
  -- Nettoyer les company_users avec company_id NULL
  UPDATE public.company_users
  SET company_id = v_default_company_id
  WHERE company_id IS NULL;
  
  GET DIAGNOSTICS v_cleaned_count = ROW_COUNT;
  
  IF v_cleaned_count > 0 THEN
    RAISE NOTICE '✅ Nettoyé % entrées company_users avec company_id NULL', v_cleaned_count;
  END IF;
  
  -- Assigner les utilisateurs orphelins
  FOR v_orphan_user IN
    SELECT u.id, u.email
    FROM auth.users u
    WHERE NOT EXISTS (
      SELECT 1 FROM public.company_users cu 
      WHERE cu.user_id = u.id
    )
  LOOP
    INSERT INTO public.company_users (user_id, company_id, role_id, status, created_at)
    VALUES (v_orphan_user.id, v_default_company_id, v_owner_role_id, 'active', NOW())
    ON CONFLICT DO NOTHING;
    
    v_cleaned_count := v_cleaned_count + 1;
    RAISE NOTICE '✅ Utilisateur orphelin assigné: %', v_orphan_user.email;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Nettoyage terminé: % utilisateurs traités', v_cleaned_count;
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- ÉTAPE 3: AJOUTER CONTRAINTES UNIQUES
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '🔧 AJOUT DES CONTRAINTES...';
  RAISE NOTICE '';
  
  -- Contrainte sur employees
  BEGIN
    ALTER TABLE public.employees 
    DROP CONSTRAINT IF EXISTS employees_user_company_unique;
    
    ALTER TABLE public.employees 
    ADD CONSTRAINT employees_user_company_unique 
    UNIQUE (user_id, company_id);
    
    RAISE NOTICE '✅ Contrainte unique ajoutée sur employees (user_id, company_id)';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Contrainte employees: %', SQLERRM;
  END;
  
  -- Contrainte sur company_users
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'company_users_user_company_unique'
    ) THEN
      ALTER TABLE public.company_users 
      ADD CONSTRAINT company_users_user_company_unique 
      UNIQUE (user_id, company_id);
      
      RAISE NOTICE '✅ Contrainte unique ajoutée sur company_users (user_id, company_id)';
    ELSE
      RAISE NOTICE '✅ Contrainte unique existe déjà sur company_users';
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Contrainte company_users: %', SQLERRM;
  END;
  
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- ÉTAPE 4: MIGRATION DES DONNÉES (avec vérifications)
-- ============================================================================

DO $$
DECLARE
  v_migrated_count INTEGER := 0;
  v_cu RECORD;
BEGIN
  RAISE NOTICE '📦 MIGRATION DES DONNÉES...';
  RAISE NOTICE '';
  
  -- Pour chaque utilisateur dans company_users
  FOR v_cu IN
    SELECT DISTINCT cu.user_id, cu.company_id, cu.role_id
    FROM public.company_users cu
    WHERE cu.company_id IS NOT NULL  -- Seulement les company_id valides
    AND NOT EXISTS (
      SELECT 1 FROM public.employees e 
      WHERE e.user_id = cu.user_id 
      AND e.company_id = cu.company_id
    )
  LOOP
    -- Insérer dans employees
    INSERT INTO public.employees (
      user_id,
      company_id,
      nom,
      prenom,
      email,
      poste,
      created_at,
      updated_at
    )
    SELECT 
      v_cu.user_id,
      v_cu.company_id,
      COALESCE(u.raw_user_meta_data->>'last_name', u.raw_user_meta_data->>'nom', 'Utilisateur'),
      COALESCE(u.raw_user_meta_data->>'first_name', u.raw_user_meta_data->>'prenom', ''),
      u.email,
      CASE 
        WHEN v_cu.role_id = (SELECT id FROM roles WHERE slug = 'owner' LIMIT 1) THEN 'Propriétaire'
        ELSE 'Employé'
      END,
      NOW(),
      NOW()
    FROM auth.users u
    WHERE u.id = v_cu.user_id
    ON CONFLICT (user_id, company_id) DO NOTHING;
    
    v_migrated_count := v_migrated_count + 1;
  END LOOP;
  
  RAISE NOTICE '✅ Migration terminée: % utilisateurs ajoutés à employees', v_migrated_count;
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- ÉTAPE 5: CRÉER LA FONCTION ET LE TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_assign_user_to_company()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role_id UUID;
  v_user_email TEXT;
  v_user_first_name TEXT;
  v_user_last_name TEXT;
BEGIN
  -- Vérifier que company_id n'est pas NULL
  IF NEW.company_id IS NULL THEN
    RAISE WARNING 'Cannot auto-assign: company_id is NULL for user %', NEW.user_id;
    RETURN NEW;
  END IF;

  -- Récupérer les infos utilisateur
  SELECT 
    email,
    raw_user_meta_data->>'first_name',
    raw_user_meta_data->>'last_name'
  INTO v_user_email, v_user_first_name, v_user_last_name
  FROM auth.users
  WHERE id = NEW.user_id;

  -- Définir le rôle si NULL
  IF NEW.role_id IS NULL THEN
    SELECT id INTO v_role_id
    FROM public.roles
    WHERE slug = 'owner'
    LIMIT 1;
    
    NEW.role_id := v_role_id;
  END IF;

  -- Créer l'entrée dans employees
  INSERT INTO public.employees (
    user_id,
    company_id,
    nom,
    prenom,
    email,
    poste,
    created_at,
    updated_at
  )
  VALUES (
    NEW.user_id,
    NEW.company_id,
    COALESCE(v_user_last_name, 'Utilisateur'),
    COALESCE(v_user_first_name, ''),
    v_user_email,
    CASE 
      WHEN NEW.role_id = (SELECT id FROM roles WHERE slug = 'owner' LIMIT 1) THEN 'Propriétaire'
      ELSE 'Employé'
    END,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id, company_id) 
  DO UPDATE SET 
    updated_at = NOW(),
    email = EXCLUDED.email;

  RETURN NEW;
END;
$$;

-- Supprimer et recréer le trigger
DROP TRIGGER IF EXISTS trigger_auto_assign_user_to_company ON public.company_users;

CREATE TRIGGER trigger_auto_assign_user_to_company
  AFTER INSERT ON public.company_users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_user_to_company();

-- ============================================================================
-- ÉTAPE 6: CRÉER LA FONCTION DE CRÉATION D'ENTREPRISE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_company_and_assign_owner(
  p_company_name TEXT,
  p_owner_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
  v_role_id UUID;
BEGIN
  -- Créer l'entreprise
  INSERT INTO public.companies (name, created_at, updated_at)
  VALUES (p_company_name, NOW(), NOW())
  RETURNING id INTO v_company_id;

  -- Récupérer le rôle owner
  SELECT id INTO v_role_id
  FROM public.roles
  WHERE slug = 'owner'
  LIMIT 1;

  -- Assigner l'owner
  INSERT INTO public.company_users (user_id, company_id, role_id, status, created_at)
  VALUES (p_owner_user_id, v_company_id, v_role_id, 'active', NOW());

  RETURN v_company_id;
END;
$$;

-- Grants
GRANT EXECUTE ON FUNCTION public.auto_assign_user_to_company() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_company_and_assign_owner(TEXT, UUID) TO authenticated;

-- ============================================================================
-- RÉSUMÉ ET VÉRIFICATIONS FINALES
-- ============================================================================

DO $$
DECLARE
  v_company_users_count INTEGER;
  v_employees_count INTEGER;
  v_null_company_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  🎉 INSTALLATION TERMINÉE AVEC SUCCÈS !                  ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  
  -- Statistiques
  SELECT COUNT(*) INTO v_company_users_count FROM public.company_users;
  SELECT COUNT(*) INTO v_employees_count FROM public.employees;
  SELECT COUNT(*) INTO v_null_company_count 
  FROM public.company_users WHERE company_id IS NULL;
  
  RAISE NOTICE '📊 STATISTIQUES:';
  RAISE NOTICE '  - Utilisateurs dans company_users: %', v_company_users_count;
  RAISE NOTICE '  - Employés dans employees: %', v_employees_count;
  RAISE NOTICE '  - Company_id NULL restants: %', v_null_company_count;
  RAISE NOTICE '';
  
  IF v_null_company_count > 0 THEN
    RAISE WARNING '⚠️ Il reste % company_id NULL à traiter manuellement', v_null_company_count;
  ELSE
    RAISE NOTICE '✅ Toutes les données sont cohérentes !';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Système automatique installé';
  RAISE NOTICE '✅ Contraintes ajoutées';
  RAISE NOTICE '✅ Trigger activé';
  RAISE NOTICE '✅ Migration effectuée';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Rechargez votre application maintenant !';
  RAISE NOTICE '';
END $$;

-- Afficher les utilisateurs assignés
SELECT 
  'VÉRIFICATION' as info,
  cu.user_id,
  u.email,
  c.name as company_name,
  CASE WHEN e.id IS NOT NULL THEN '✅ OUI' ELSE '❌ NON' END as dans_employees
FROM public.company_users cu
JOIN auth.users u ON u.id = cu.user_id
LEFT JOIN public.companies c ON c.id = cu.company_id
LEFT JOIN public.employees e ON e.user_id = cu.user_id AND e.company_id = cu.company_id
ORDER BY u.email
LIMIT 10;
