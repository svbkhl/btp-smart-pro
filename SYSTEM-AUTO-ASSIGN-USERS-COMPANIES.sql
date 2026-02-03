-- ============================================================================
-- SYSTÈME AUTOMATIQUE D'ASSIGNATION UTILISATEURS-ENTREPRISES
-- ============================================================================
-- Ce script crée un système complet qui assigne automatiquement chaque 
-- utilisateur à son entreprise dans toutes les tables nécessaires.
-- ============================================================================

-- ============================================================================
-- ÉTAPE 1: AJOUTER LES CONTRAINTES UNIQUES
-- ============================================================================

-- 1.1 Contrainte unique sur employees (user_id, company_id)
DO $$
BEGIN
  -- Supprimer la contrainte si elle existe déjà
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'employees_user_company_unique'
  ) THEN
    ALTER TABLE public.employees DROP CONSTRAINT employees_user_company_unique;
    RAISE NOTICE '✅ Ancienne contrainte supprimée';
  END IF;

  -- Ajouter la nouvelle contrainte
  ALTER TABLE public.employees 
  ADD CONSTRAINT employees_user_company_unique 
  UNIQUE (user_id, company_id);
  
  RAISE NOTICE '✅ Contrainte unique ajoutée sur employees (user_id, company_id)';
EXCEPTION
  WHEN duplicate_table THEN
    RAISE NOTICE '⚠️ Contrainte existe déjà';
END $$;

-- 1.2 Vérifier que company_users a déjà la contrainte unique
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname LIKE '%company_users%' 
    AND contype = 'u'
  ) THEN
    ALTER TABLE public.company_users 
    ADD CONSTRAINT company_users_user_company_unique 
    UNIQUE (user_id, company_id);
    
    RAISE NOTICE '✅ Contrainte unique ajoutée sur company_users (user_id, company_id)';
  ELSE
    RAISE NOTICE '✅ Contrainte unique existe déjà sur company_users';
  END IF;
END $$;

-- ============================================================================
-- ÉTAPE 2: FONCTION POUR AUTO-ASSIGNER UN UTILISATEUR
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
  -- Récupérer les infos utilisateur depuis auth.users
  SELECT 
    email,
    raw_user_meta_data->>'first_name',
    raw_user_meta_data->>'last_name'
  INTO v_user_email, v_user_first_name, v_user_last_name
  FROM auth.users
  WHERE id = NEW.user_id;

  -- Récupérer le rôle par défaut (ou utiliser celui fourni)
  IF NEW.role_id IS NULL THEN
    SELECT id INTO v_role_id
    FROM public.roles
    WHERE slug = 'owner'
    LIMIT 1;
    
    NEW.role_id := v_role_id;
  END IF;

  -- Créer automatiquement l'entrée dans employees
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

  RAISE NOTICE '✅ Auto-assignation: user % → company %', NEW.user_id, NEW.company_id;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.auto_assign_user_to_company() IS 
'Fonction trigger: Assigne automatiquement un utilisateur à une entreprise dans employees quand il est ajouté dans company_users';

-- ============================================================================
-- ÉTAPE 3: CRÉER LE TRIGGER
-- ============================================================================

-- Supprimer le trigger s'il existe
DROP TRIGGER IF EXISTS trigger_auto_assign_user_to_company ON public.company_users;

-- Créer le nouveau trigger
CREATE TRIGGER trigger_auto_assign_user_to_company
  AFTER INSERT ON public.company_users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_user_to_company();

COMMENT ON TRIGGER trigger_auto_assign_user_to_company ON public.company_users IS
'Trigger: Crée automatiquement une entrée dans employees quand un utilisateur est ajouté à company_users';

-- ============================================================================
-- ÉTAPE 4: FONCTION POUR CRÉER ENTREPRISE + ASSIGNER OWNER
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

  RAISE NOTICE '✅ Entreprise créée: % (id: %)', p_company_name, v_company_id;

  -- Récupérer le rôle owner
  SELECT id INTO v_role_id
  FROM public.roles
  WHERE slug = 'owner'
  LIMIT 1;

  -- Assigner l'owner à l'entreprise (le trigger s'occupera de employees)
  INSERT INTO public.company_users (user_id, company_id, role_id, status, created_at)
  VALUES (p_owner_user_id, v_company_id, v_role_id, 'active', NOW());

  RAISE NOTICE '✅ Owner assigné: user % → company %', p_owner_user_id, v_company_id;
  RAISE NOTICE '✅ Entrée employees créée automatiquement par le trigger';

  RETURN v_company_id;
END;
$$;

COMMENT ON FUNCTION public.create_company_and_assign_owner(TEXT, UUID) IS
'Crée une entreprise et assigne automatiquement un owner (avec création auto dans employees via trigger)';

-- ============================================================================
-- ÉTAPE 5: MIGRATION DES DONNÉES EXISTANTES
-- ============================================================================

DO $$
DECLARE
  v_count INTEGER := 0;
  v_cu RECORD;
BEGIN
  RAISE NOTICE '🔵 Migration des utilisateurs existants...';

  -- Pour chaque utilisateur dans company_users qui n'est pas dans employees
  FOR v_cu IN
    SELECT DISTINCT cu.user_id, cu.company_id, cu.role_id
    FROM public.company_users cu
    LEFT JOIN public.employees e ON e.user_id = cu.user_id AND e.company_id = cu.company_id
    WHERE e.id IS NULL
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

    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE '✅ Migration terminée: % utilisateurs ajoutés à employees', v_count;
END $$;

-- ============================================================================
-- ÉTAPE 6: GRANTS ET PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.auto_assign_user_to_company() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_company_and_assign_owner(TEXT, UUID) TO authenticated;

-- ============================================================================
-- RÉSUMÉ ET VÉRIFICATIONS
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  🎉 SYSTÈME AUTOMATIQUE INSTALLÉ AVEC SUCCÈS !           ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Contraintes uniques ajoutées';
  RAISE NOTICE '✅ Fonction auto_assign_user_to_company() créée';
  RAISE NOTICE '✅ Trigger trigger_auto_assign_user_to_company créé';
  RAISE NOTICE '✅ Fonction create_company_and_assign_owner() créée';
  RAISE NOTICE '✅ Migration des données existantes effectuée';
  RAISE NOTICE '';
  RAISE NOTICE '📋 UTILISATION:';
  RAISE NOTICE '  1. Créer entreprise + owner:';
  RAISE NOTICE '     SELECT create_company_and_assign_owner(''Nom'', ''user-uuid'');';
  RAISE NOTICE '';
  RAISE NOTICE '  2. Ajouter utilisateur à entreprise:';
  RAISE NOTICE '     INSERT INTO company_users (user_id, company_id, ...) VALUES (...);';
  RAISE NOTICE '     → Création automatique dans employees !';
  RAISE NOTICE '';
END $$;

-- Afficher les statistiques
SELECT 
  'company_users' as table_name,
  COUNT(*) as total
FROM public.company_users
UNION ALL
SELECT 
  'employees' as table_name,
  COUNT(*) as total
FROM public.employees;
