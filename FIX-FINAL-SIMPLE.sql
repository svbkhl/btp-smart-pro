-- ============================================================================
-- FIX FINAL SIMPLE - CORRECTION COMPLÈTE
-- ============================================================================
-- Script ultra-simple qui corrige tout étape par étape
-- ============================================================================

-- ============================================================================
-- ÉTAPE 1: SUPPRIMER LES ENTRÉES PROBLÉMATIQUES
-- ============================================================================

DO $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  RAISE NOTICE '🧹 SUPPRESSION DES DONNÉES INVALIDES...';
  
  -- Supprimer les entrées company_users avec company_id NULL
  DELETE FROM public.company_users
  WHERE company_id IS NULL;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RAISE NOTICE '✅ Supprimé % entrées avec company_id NULL', v_deleted_count;
END $$;

-- ============================================================================
-- ÉTAPE 2: CRÉER ENTREPRISE PAR DÉFAUT SI NÉCESSAIRE
-- ============================================================================

DO $$
DECLARE
  v_company_id UUID;
  v_company_count INTEGER;
BEGIN
  RAISE NOTICE '🏢 VÉRIFICATION DES ENTREPRISES...';
  
  -- Compter les entreprises existantes
  SELECT COUNT(*) INTO v_company_count FROM public.companies;
  
  IF v_company_count = 0 THEN
    -- Créer une entreprise par défaut
    INSERT INTO public.companies (name, created_at, updated_at)
    VALUES ('SK Agency', NOW(), NOW())
    RETURNING id INTO v_company_id;
    
    RAISE NOTICE '✅ Entreprise créée: SK Agency (%)', v_company_id;
  ELSE
    RAISE NOTICE '✅ % entreprise(s) existante(s)', v_company_count;
  END IF;
END $$;

-- ============================================================================
-- ÉTAPE 3: ASSIGNER TOUS LES UTILISATEURS À UNE ENTREPRISE
-- ============================================================================

DO $$
DECLARE
  v_company_id UUID;
  v_role_id UUID;
  v_user RECORD;
  v_assigned_count INTEGER := 0;
BEGIN
  RAISE NOTICE '👥 ASSIGNATION DES UTILISATEURS...';
  
  -- Récupérer la première entreprise disponible
  SELECT id INTO v_company_id
  FROM public.companies
  ORDER BY created_at ASC
  LIMIT 1;
  
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Aucune entreprise trouvée !';
  END IF;
  
  RAISE NOTICE 'ℹ️  Utilisation de l''entreprise: %', v_company_id;
  
  -- Récupérer le rôle owner
  SELECT id INTO v_role_id
  FROM public.roles
  WHERE slug = 'owner'
  LIMIT 1;
  
  -- Assigner tous les utilisateurs sans entreprise
  FOR v_user IN
    SELECT u.id, u.email
    FROM auth.users u
    WHERE NOT EXISTS (
      SELECT 1 FROM public.company_users cu 
      WHERE cu.user_id = u.id
    )
  LOOP
    BEGIN
      INSERT INTO public.company_users (user_id, company_id, role_id, status, created_at)
      VALUES (v_user.id, v_company_id, v_role_id, 'active', NOW());
      
      v_assigned_count := v_assigned_count + 1;
      RAISE NOTICE '  ✅ Assigné: %', v_user.email;
    EXCEPTION
      WHEN unique_violation THEN
        RAISE NOTICE '  ⚠️ Déjà assigné: %', v_user.email;
    END;
  END LOOP;
  
  RAISE NOTICE '✅ Total assigné: % utilisateurs', v_assigned_count;
END $$;

-- ============================================================================
-- ÉTAPE 4: AJOUTER CONTRAINTE UNIQUE SUR EMPLOYEES
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '🔧 AJOUT CONTRAINTE UNIQUE...';
  
  BEGIN
    ALTER TABLE public.employees 
    DROP CONSTRAINT IF EXISTS employees_user_company_unique CASCADE;
    
    ALTER TABLE public.employees 
    ADD CONSTRAINT employees_user_company_unique 
    UNIQUE (user_id, company_id);
    
    RAISE NOTICE '✅ Contrainte ajoutée sur employees';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Contrainte: %', SQLERRM;
  END;
END $$;

-- ============================================================================
-- ÉTAPE 5: MIGRATION VERS EMPLOYEES (ultra-sécurisée)
-- ============================================================================

DO $$
DECLARE
  v_cu RECORD;
  v_migrated_count INTEGER := 0;
  v_skipped_count INTEGER := 0;
BEGIN
  RAISE NOTICE '📦 MIGRATION VERS EMPLOYEES...';
  
  -- Pour chaque utilisateur dans company_users
  FOR v_cu IN
    SELECT DISTINCT 
      cu.user_id, 
      cu.company_id, 
      cu.role_id,
      u.email,
      u.raw_user_meta_data
    FROM public.company_users cu
    JOIN auth.users u ON u.id = cu.user_id
    WHERE cu.company_id IS NOT NULL
  LOOP
    -- Vérifier que company_id n'est pas NULL (double sécurité)
    IF v_cu.company_id IS NULL THEN
      RAISE NOTICE '  ⚠️ Sauté (company_id NULL): %', v_cu.email;
      v_skipped_count := v_skipped_count + 1;
      CONTINUE;
    END IF;
    
    -- Vérifier si déjà dans employees
    IF EXISTS (
      SELECT 1 FROM public.employees 
      WHERE user_id = v_cu.user_id 
      AND company_id = v_cu.company_id
    ) THEN
      RAISE NOTICE '  ℹ️  Déjà présent: %', v_cu.email;
      CONTINUE;
    END IF;
    
    -- Insérer dans employees
    BEGIN
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
        v_cu.user_id,
        v_cu.company_id,
        COALESCE(
          v_cu.raw_user_meta_data->>'last_name', 
          v_cu.raw_user_meta_data->>'nom', 
          'Utilisateur'
        ),
        COALESCE(
          v_cu.raw_user_meta_data->>'first_name', 
          v_cu.raw_user_meta_data->>'prenom', 
          ''
        ),
        v_cu.email,
        CASE 
          WHEN v_cu.role_id = (SELECT id FROM roles WHERE slug = 'owner' LIMIT 1) 
          THEN 'Propriétaire'
          ELSE 'Employé'
        END,
        NOW(),
        NOW()
      );
      
      v_migrated_count := v_migrated_count + 1;
      RAISE NOTICE '  ✅ Migré: %', v_cu.email;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '  ❌ Erreur pour %: %', v_cu.email, SQLERRM;
        v_skipped_count := v_skipped_count + 1;
    END;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Migration terminée:';
  RAISE NOTICE '   - Migrés: %', v_migrated_count;
  RAISE NOTICE '   - Sautés: %', v_skipped_count;
END $$;

-- ============================================================================
-- ÉTAPE 6: CRÉER FONCTION ET TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_assign_user_to_company()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_email TEXT;
  v_user_first_name TEXT;
  v_user_last_name TEXT;
BEGIN
  -- Vérification stricte
  IF NEW.company_id IS NULL THEN
    RAISE WARNING '[TRIGGER] company_id NULL pour user %', NEW.user_id;
    RETURN NEW;
  END IF;

  -- Récupérer infos utilisateur
  SELECT 
    email,
    raw_user_meta_data->>'first_name',
    raw_user_meta_data->>'last_name'
  INTO v_user_email, v_user_first_name, v_user_last_name
  FROM auth.users
  WHERE id = NEW.user_id;

  -- Insérer dans employees
  BEGIN
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
        WHEN NEW.role_id = (SELECT id FROM roles WHERE slug = 'owner' LIMIT 1) 
        THEN 'Propriétaire'
        ELSE 'Employé'
      END,
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id, company_id) 
    DO UPDATE SET updated_at = NOW();
    
    RAISE NOTICE '[TRIGGER] Créé dans employees: %', v_user_email;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING '[TRIGGER] Erreur pour %: %', v_user_email, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Supprimer et recréer le trigger
DROP TRIGGER IF EXISTS trigger_auto_assign_user_to_company ON public.company_users;

CREATE TRIGGER trigger_auto_assign_user_to_company
  AFTER INSERT ON public.company_users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_user_to_company();

GRANT EXECUTE ON FUNCTION public.auto_assign_user_to_company() TO authenticated;

-- ============================================================================
-- RÉSUMÉ FINAL
-- ============================================================================

DO $$
DECLARE
  v_company_users_count INTEGER;
  v_employees_count INTEGER;
  v_null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_company_users_count FROM public.company_users;
  SELECT COUNT(*) INTO v_employees_count FROM public.employees;
  SELECT COUNT(*) INTO v_null_count 
  FROM public.company_users WHERE company_id IS NULL;
  
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║          🎉 INSTALLATION RÉUSSIE !                       ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '📊 STATISTIQUES FINALES:';
  RAISE NOTICE '   - Company_users: %', v_company_users_count;
  RAISE NOTICE '   - Employees: %', v_employees_count;
  RAISE NOTICE '   - Company_id NULL: %', v_null_count;
  RAISE NOTICE '';
  
  IF v_null_count = 0 THEN
    RAISE NOTICE '✅ AUCUNE DONNÉE INVALIDE !';
  ELSE
    RAISE WARNING '⚠️ % company_id NULL restants', v_null_count;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Rechargez votre application maintenant !';
  RAISE NOTICE '';
END $$;

-- Vérification visuelle
SELECT 
  '✅ VÉRIFICATION' as status,
  u.email,
  c.name as company_name,
  CASE WHEN e.id IS NOT NULL THEN 'OUI ✅' ELSE 'NON ❌' END as dans_employees
FROM public.company_users cu
JOIN auth.users u ON u.id = cu.user_id
LEFT JOIN public.companies c ON c.id = cu.company_id
LEFT JOIN public.employees e ON e.user_id = cu.user_id AND e.company_id = cu.company_id
ORDER BY u.email
LIMIT 20;
