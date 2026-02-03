-- ═══════════════════════════════════════════════════════════════════════════
-- FIX AUTOMATIQUE : Company ID pour TOUS les utilisateurs + Trigger auto
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- Ce script :
-- 1. Assigne TOUS les utilisateurs de company_users dans employees
-- 2. Installe un trigger pour assigner automatiquement les futurs utilisateurs
-- 3. Pas besoin de modifier l'email - fonctionne pour TOUS
--
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- PARTIE 1 : Migration des utilisateurs existants
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_user_record RECORD;
  v_count INTEGER := 0;
  v_owner_role_id UUID;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════════════';
  RAISE NOTICE '🔧 MIGRATION : Assignation de TOUS les utilisateurs';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  -- Trouver l'ID du rôle owner
  SELECT id INTO v_owner_role_id
  FROM public.roles
  WHERE slug = 'owner'
  LIMIT 1;
  
  -- Pour chaque utilisateur dans company_users qui n'est PAS dans employees
  FOR v_user_record IN 
    SELECT DISTINCT 
      cu.user_id, 
      cu.company_id, 
      cu.role_id, 
      u.email, 
      u.raw_user_metadata,
      c.name as company_name
    FROM public.company_users cu
    INNER JOIN auth.users u ON u.id = cu.user_id
    INNER JOIN public.companies c ON c.id = cu.company_id
    WHERE NOT EXISTS (
      SELECT 1 
      FROM public.employees e 
      WHERE e.user_id = cu.user_id 
        AND e.company_id = cu.company_id
    )
  LOOP
    BEGIN
      -- Insérer dans employees
      INSERT INTO public.employees (
        user_id,
        company_id,
        nom,
        prenom,
        email,
        poste,
        statut,
        created_at,
        updated_at
      ) VALUES (
        v_user_record.user_id,
        v_user_record.company_id,
        COALESCE(
          v_user_record.raw_user_metadata->>'last_name',
          v_user_record.raw_user_metadata->>'nom',
          'Utilisateur'
        ),
        COALESCE(
          v_user_record.raw_user_metadata->>'first_name',
          v_user_record.raw_user_metadata->>'prenom',
          ''
        ),
        v_user_record.email,
        CASE 
          WHEN v_user_record.role_id = v_owner_role_id THEN 'Propriétaire'
          ELSE 'Employé'
        END,
        'actif',
        NOW(),
        NOW()
      )
      ON CONFLICT (user_id, company_id) DO NOTHING;
      
      v_count := v_count + 1;
      RAISE NOTICE '✅ % -> %', v_user_record.email, v_user_record.company_name;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '⚠️ Erreur pour % : %', v_user_record.email, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Migration terminée : % utilisateurs ajoutés', v_count;
  RAISE NOTICE '';
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- PARTIE 2 : Trigger automatique pour les futurs utilisateurs
-- ═══════════════════════════════════════════════════════════════════════════

-- Fonction trigger : Assigner automatiquement dans employees quand ajouté dans company_users
CREATE OR REPLACE FUNCTION auto_assign_employee_on_company_user_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_user_email TEXT;
  v_user_metadata JSONB;
  v_owner_role_id UUID;
BEGIN
  -- Récupérer les infos de l'utilisateur
  SELECT email, raw_user_metadata
  INTO v_user_email, v_user_metadata
  FROM auth.users
  WHERE id = NEW.user_id;
  
  -- Récupérer l'ID du rôle owner
  SELECT id INTO v_owner_role_id
  FROM public.roles
  WHERE slug = 'owner'
  LIMIT 1;
  
  -- Insérer automatiquement dans employees
  INSERT INTO public.employees (
    user_id,
    company_id,
    nom,
    prenom,
    email,
    poste,
    statut,
    created_at,
    updated_at
  ) VALUES (
    NEW.user_id,
    NEW.company_id,
    COALESCE(
      v_user_metadata->>'last_name',
      v_user_metadata->>'nom',
      'Utilisateur'
    ),
    COALESCE(
      v_user_metadata->>'first_name',
      v_user_metadata->>'prenom',
      ''
    ),
    v_user_email,
    CASE 
      WHEN NEW.role_id = v_owner_role_id THEN 'Propriétaire'
      ELSE 'Employé'
    END,
    'actif',
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id, company_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Supprimer le trigger s'il existe
DROP TRIGGER IF EXISTS trigger_auto_assign_employee ON public.company_users;

-- Créer le trigger
CREATE TRIGGER trigger_auto_assign_employee
  AFTER INSERT ON public.company_users
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_employee_on_company_user_insert();

-- ═══════════════════════════════════════════════════════════════════════════
-- VÉRIFICATION FINALE
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_company_users_count INTEGER;
  v_employees_count INTEGER;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ INSTALLATION TERMINÉE !';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  -- Compter les utilisateurs
  SELECT COUNT(DISTINCT user_id) INTO v_company_users_count
  FROM public.company_users;
  
  SELECT COUNT(DISTINCT user_id) INTO v_employees_count
  FROM public.employees;
  
  RAISE NOTICE '📊 Statistiques :';
  RAISE NOTICE '  • Utilisateurs dans company_users : %', v_company_users_count;
  RAISE NOTICE '  • Utilisateurs dans employees : %', v_employees_count;
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Ce qui a été fait :';
  RAISE NOTICE '  1. ✅ Tous les utilisateurs existants ont été assignés';
  RAISE NOTICE '  2. ✅ Trigger installé pour les futurs utilisateurs';
  RAISE NOTICE '  3. ✅ Assignation automatique activée';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Actions suivantes :';
  RAISE NOTICE '  • Rechargez votre application';
  RAISE NOTICE '  • Les currentCompanyId sont maintenant définis';
  RAISE NOTICE '  • Les nouveaux utilisateurs seront assignés automatiquement';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════════════';
END $$;
