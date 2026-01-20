-- =====================================================
-- SCRIPT : RETIRER ADMIN DE SK AGENCY
-- =====================================================
-- Ce script retire l'utilisateur sabri.khalfallah6@gmail.com
-- de l'entreprise "SK Agency" et le place dans une autre
-- entreprise (ou en crée une nouvelle) pour tester la
-- séparation des données multi-tenant
-- =====================================================

-- Supprimer complètement le trigger updated_at pour company_users
DROP TRIGGER IF EXISTS update_company_users_updated_at ON public.company_users;

DO $$
DECLARE
  v_admin_user_id UUID;
  v_sk_agency_company_id UUID;
  v_admin_company_id UUID;
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
  
  -- 2. Trouver l'entreprise "SK Agency"
  SELECT id INTO v_sk_agency_company_id
  FROM public.companies
  WHERE LOWER(name) LIKE '%sk agency%'
  OR LOWER(name) LIKE '%sk%agency%'
  LIMIT 1;
  
  IF v_sk_agency_company_id IS NOT NULL THEN
    RAISE NOTICE '✅ Entreprise "SK Agency" trouvée: %', v_sk_agency_company_id;
    
    -- 3. Retirer l'admin de SK Agency
    DELETE FROM public.company_users
    WHERE company_id = v_sk_agency_company_id
    AND user_id = v_admin_user_id;
    
    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    IF v_row_count > 0 THEN
      RAISE NOTICE '✅ Admin retiré de SK Agency';
    ELSE
      RAISE NOTICE 'ℹ️ Admin n''était pas membre de SK Agency';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️ Entreprise "SK Agency" non trouvée (peut-être n''existe pas)';
  END IF;
  
  -- 4. Vérifier si l'admin est déjà dans une autre entreprise
  SELECT company_id INTO v_admin_company_id
  FROM public.company_users
  WHERE user_id = v_admin_user_id
  LIMIT 1;
  
  -- 5. Si l'admin n'est dans aucune entreprise, créer ou trouver une entreprise pour lui
  IF v_admin_company_id IS NULL THEN
    -- Chercher d'abord si "BTP Smart Pro - Admin" existe
    SELECT id INTO v_admin_company_id
    FROM public.companies
    WHERE LOWER(name) LIKE '%btp smart pro%admin%'
    OR LOWER(name) = 'BTP Smart Pro - Admin'
    LIMIT 1;
    
    -- Si elle n'existe pas, la créer
    IF v_admin_company_id IS NULL THEN
      INSERT INTO public.companies (name, owner_id)
      VALUES (
        'BTP Smart Pro - Admin',
        v_admin_user_id
      )
      RETURNING id INTO v_admin_company_id;
      
      RAISE NOTICE '✅ Nouvelle entreprise créée pour admin: %', v_admin_company_id;
    ELSE
      RAISE NOTICE '✅ Entreprise existante trouvée pour admin: %', v_admin_company_id;
    END IF;
    
    -- Ajouter l'admin à cette entreprise comme owner
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'company_users'
      AND column_name = 'status'
    ) THEN
      INSERT INTO public.company_users (company_id, user_id, role, status)
      VALUES (v_admin_company_id, v_admin_user_id, 'owner', 'active')
      ON CONFLICT (company_id, user_id) DO UPDATE
      SET role = 'owner', status = 'active';
    ELSE
      INSERT INTO public.company_users (company_id, user_id, role)
      VALUES (v_admin_company_id, v_admin_user_id, 'owner')
      ON CONFLICT (company_id, user_id) DO UPDATE
      SET role = 'owner';
    END IF;
    
    RAISE NOTICE '✅ Admin ajouté comme owner de l''entreprise: %', v_admin_company_id;
  ELSE
    RAISE NOTICE '✅ Admin est déjà membre d''une entreprise: %', v_admin_company_id;
    
    -- S'assurer qu'il est owner
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'company_users'
      AND column_name = 'status'
    ) THEN
      UPDATE public.company_users
      SET role = 'owner', status = 'active'
      WHERE company_id = v_admin_company_id
      AND user_id = v_admin_user_id;
    ELSE
      UPDATE public.company_users
      SET role = 'owner'
      WHERE company_id = v_admin_company_id
      AND user_id = v_admin_user_id;
    END IF;
    
    RAISE NOTICE '✅ Rôle admin confirmé (owner)';
  END IF;
  
  -- 6. Mettre à jour toutes les données de l'admin pour utiliser sa nouvelle entreprise
  -- (au cas où certaines données seraient encore associées à SK Agency)
  IF v_admin_company_id IS NOT NULL THEN
    
    -- Clients
    UPDATE public.clients
    SET company_id = v_admin_company_id
    WHERE user_id = v_admin_user_id
    AND (company_id IS NULL OR company_id = v_sk_agency_company_id OR company_id != v_admin_company_id);
    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    IF v_row_count > 0 THEN
      RAISE NOTICE '✅ % clients assignés à l''entreprise admin', v_row_count;
    END IF;
    
    -- Projects
    UPDATE public.projects
    SET company_id = v_admin_company_id
    WHERE user_id = v_admin_user_id
    AND (company_id IS NULL OR company_id = v_sk_agency_company_id OR company_id != v_admin_company_id);
    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    IF v_row_count > 0 THEN
      RAISE NOTICE '✅ % projets assignés à l''entreprise admin', v_row_count;
    END IF;
    
    -- AI Quotes
    UPDATE public.ai_quotes
    SET company_id = v_admin_company_id
    WHERE user_id = v_admin_user_id
    AND (company_id IS NULL OR company_id = v_sk_agency_company_id OR company_id != v_admin_company_id);
    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    IF v_row_count > 0 THEN
      RAISE NOTICE '✅ % devis assignés à l''entreprise admin', v_row_count;
    END IF;
    
    -- Invoices
    UPDATE public.invoices
    SET company_id = v_admin_company_id
    WHERE user_id = v_admin_user_id
    AND (company_id IS NULL OR company_id = v_sk_agency_company_id OR company_id != v_admin_company_id);
    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    IF v_row_count > 0 THEN
      RAISE NOTICE '✅ % factures assignées à l''entreprise admin', v_row_count;
    END IF;
    
    -- Payments
    UPDATE public.payments
    SET company_id = v_admin_company_id
    WHERE user_id = v_admin_user_id
    AND (company_id IS NULL OR company_id = v_sk_agency_company_id OR company_id != v_admin_company_id);
    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    IF v_row_count > 0 THEN
      RAISE NOTICE '✅ % paiements assignés à l''entreprise admin', v_row_count;
    END IF;
    
    -- Employees
    UPDATE public.employees
    SET company_id = v_admin_company_id
    WHERE user_id = v_admin_user_id
    AND (company_id IS NULL OR company_id = v_sk_agency_company_id OR company_id != v_admin_company_id);
    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    IF v_row_count > 0 THEN
      RAISE NOTICE '✅ % employés assignés à l''entreprise admin', v_row_count;
    END IF;
    
    -- Events
    UPDATE public.events
    SET company_id = v_admin_company_id
    WHERE user_id = v_admin_user_id
    AND (company_id IS NULL OR company_id = v_sk_agency_company_id OR company_id != v_admin_company_id);
    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    IF v_row_count > 0 THEN
      RAISE NOTICE '✅ % événements assignés à l''entreprise admin', v_row_count;
    END IF;
    
    -- Notifications
    UPDATE public.notifications
    SET company_id = v_admin_company_id
    WHERE user_id = v_admin_user_id
    AND (company_id IS NULL OR company_id = v_sk_agency_company_id OR company_id != v_admin_company_id);
    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    IF v_row_count > 0 THEN
      RAISE NOTICE '✅ % notifications assignées à l''entreprise admin', v_row_count;
    END IF;
    
    RAISE NOTICE '✅ Toutes les données de l''admin ont été assignées à l''entreprise: %', v_admin_company_id;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '📋 RÉSUMÉ:';
  RAISE NOTICE '   - Utilisateur: sabri.khalfallah6@gmail.com';
  IF v_sk_agency_company_id IS NOT NULL THEN
    RAISE NOTICE '   - Retiré de SK Agency: %', v_sk_agency_company_id;
  END IF;
  IF v_admin_company_id IS NOT NULL THEN
    RAISE NOTICE '   - Nouvelle entreprise: % (BTP Smart Pro - Admin)', v_admin_company_id;
  END IF;
  
END $$;

-- Vérification finale : lister toutes les entreprises de l'admin
SELECT 
  c.id AS company_id,
  c.name AS company_name,
  cu.role,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'company_users'
      AND column_name = 'status'
    ) THEN cu.status
    ELSE NULL
  END AS status
FROM public.companies c
JOIN public.company_users cu ON cu.company_id = c.id
JOIN auth.users u ON u.id = cu.user_id
WHERE u.email = 'sabri.khalfallah6@gmail.com'
ORDER BY c.name;

-- Vérifier qu'il n'est plus dans SK Agency
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ OK: L''admin n''est plus dans SK Agency'
    ELSE '❌ ATTENTION: L''admin est encore dans SK Agency'
  END AS status_check
FROM public.company_users cu
JOIN public.companies c ON c.id = cu.company_id
JOIN auth.users u ON u.id = cu.user_id
WHERE u.email = 'sabri.khalfallah6@gmail.com'
AND (LOWER(c.name) LIKE '%sk agency%' OR LOWER(c.name) LIKE '%sk%agency%');
