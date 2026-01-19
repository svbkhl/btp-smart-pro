-- =====================================================
-- SCRIPT : FIX COMPTE ADMINISTRATEUR
-- =====================================================
-- Ce script crée une entreprise pour le compte admin
-- sabri.khalfallah6@gmail.com et assigne toutes ses
-- données existantes à cette entreprise
-- =====================================================

-- Supprimer complètement le trigger updated_at pour company_users
-- car la colonne updated_at n'existe pas dans cette table
DROP TRIGGER IF EXISTS update_company_users_updated_at ON public.company_users;

-- Créer une fonction trigger "vide" qui ne fait rien
-- (au cas où un autre script essaierait de créer le trigger)
CREATE OR REPLACE FUNCTION update_company_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Fonction vide car la colonne updated_at n'existe pas dans company_users
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  v_admin_user_id UUID;
  v_company_id UUID;
  v_user_email TEXT;
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
  
  -- 2. Récupérer l'email
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = v_admin_user_id;
  
  -- 3. Vérifier si l'utilisateur a déjà une entreprise
  SELECT company_id INTO v_company_id
  FROM public.company_users
  WHERE user_id = v_admin_user_id
  LIMIT 1;
  
  -- 4. Créer une entreprise pour l'admin si nécessaire
  IF v_company_id IS NULL THEN
    INSERT INTO public.companies (name, owner_id)
    VALUES (
      'BTP Smart Pro - Admin',
      v_admin_user_id
    )
    RETURNING id INTO v_company_id;
    
    RAISE NOTICE '✅ Entreprise créée pour admin: %', v_company_id;
  ELSE
    RAISE NOTICE '✅ L''utilisateur admin a déjà une entreprise: %', v_company_id;
  END IF;
  
  -- 5. Désactiver temporairement le trigger updated_at s'il existe (AVANT toute opération)
  DROP TRIGGER IF EXISTS update_company_users_updated_at ON public.company_users;
  
  -- 6. Ajouter/mettre à jour l'admin comme owner de l'entreprise
  IF NOT EXISTS (
    SELECT 1 FROM public.company_users
    WHERE company_id = v_company_id
    AND user_id = v_admin_user_id
  ) THEN
    -- Vérifier si la colonne status existe
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'company_users'
      AND column_name = 'status'
    ) THEN
      INSERT INTO public.company_users (company_id, user_id, role, status)
      VALUES (v_company_id, v_admin_user_id, 'owner', 'active');
    ELSE
      INSERT INTO public.company_users (company_id, user_id, role)
      VALUES (v_company_id, v_admin_user_id, 'owner');
    END IF;
    RAISE NOTICE '✅ Admin ajouté comme owner de l''entreprise';
  ELSE
    -- S'assurer qu'il est owner (mise à jour sans trigger)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'company_users'
      AND column_name = 'status'
    ) THEN
      UPDATE public.company_users
      SET role = 'owner', status = 'active'
      WHERE company_id = v_company_id
      AND user_id = v_admin_user_id;
    ELSE
      UPDATE public.company_users
      SET role = 'owner'
      WHERE company_id = v_company_id
      AND user_id = v_admin_user_id;
    END IF;
    RAISE NOTICE '✅ Rôle admin mis à jour (owner)';
  END IF;
  
  -- 7. NE PAS réactiver le trigger updated_at pour company_users
  -- car cette table n'a pas de colonne updated_at
  -- Le trigger reste supprimé (désactivé en début de script)
  
  -- 8. Backfill toutes les données existantes de l'admin avec cette entreprise
  -- Clients
  UPDATE public.clients
  SET company_id = v_company_id
  WHERE user_id = v_admin_user_id
  AND (company_id IS NULL OR company_id != v_company_id);
  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  IF v_row_count > 0 THEN
    RAISE NOTICE '✅ % clients assignés à l''entreprise admin', v_row_count;
  END IF;
  
  -- Projects
  UPDATE public.projects
  SET company_id = v_company_id
  WHERE user_id = v_admin_user_id
  AND (company_id IS NULL OR company_id != v_company_id);
  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  IF v_row_count > 0 THEN
    RAISE NOTICE '✅ % projets assignés à l''entreprise admin', v_row_count;
  END IF;
  
  -- AI Quotes
  UPDATE public.ai_quotes
  SET company_id = v_company_id
  WHERE user_id = v_admin_user_id
  AND (company_id IS NULL OR company_id != v_company_id);
  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  IF v_row_count > 0 THEN
    RAISE NOTICE '✅ % devis assignés à l''entreprise admin', v_row_count;
  END IF;
  
  -- Invoices
  UPDATE public.invoices
  SET company_id = v_company_id
  WHERE user_id = v_admin_user_id
  AND (company_id IS NULL OR company_id != v_company_id);
  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  IF v_row_count > 0 THEN
    RAISE NOTICE '✅ % factures assignées à l''entreprise admin', v_row_count;
  END IF;
  
  -- Payments
  UPDATE public.payments
  SET company_id = v_company_id
  WHERE user_id = v_admin_user_id
  AND (company_id IS NULL OR company_id != v_company_id);
  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  IF v_row_count > 0 THEN
    RAISE NOTICE '✅ % paiements assignés à l''entreprise admin', v_row_count;
  END IF;
  
  -- Employees
  UPDATE public.employees
  SET company_id = v_company_id
  WHERE user_id = v_admin_user_id
  AND (company_id IS NULL OR company_id != v_company_id);
  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  IF v_row_count > 0 THEN
    RAISE NOTICE '✅ % employés assignés à l''entreprise admin', v_row_count;
  END IF;
  
  -- Events
  UPDATE public.events
  SET company_id = v_company_id
  WHERE user_id = v_admin_user_id
  AND (company_id IS NULL OR company_id != v_company_id);
  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  IF v_row_count > 0 THEN
    RAISE NOTICE '✅ % événements assignés à l''entreprise admin', v_row_count;
  END IF;
  
  -- Notifications
  UPDATE public.notifications
  SET company_id = v_company_id
  WHERE user_id = v_admin_user_id
  AND (company_id IS NULL OR company_id != v_company_id);
  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  IF v_row_count > 0 THEN
    RAISE NOTICE '✅ % notifications assignées à l''entreprise admin', v_row_count;
  END IF;
  
  -- Candidatures
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'candidatures') THEN
    UPDATE public.candidatures
    SET company_id = v_company_id
    WHERE recruteur_id = v_admin_user_id
    AND (company_id IS NULL OR company_id != v_company_id);
    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    IF v_row_count > 0 THEN
      RAISE NOTICE '✅ % candidatures assignées à l''entreprise admin', v_row_count;
    END IF;
  END IF;
  
  -- Tâches RH
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'taches_rh') THEN
    UPDATE public.taches_rh
    SET company_id = v_company_id
    WHERE created_by = v_admin_user_id
    AND (company_id IS NULL OR company_id != v_company_id);
    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    IF v_row_count > 0 THEN
      RAISE NOTICE '✅ % tâches RH assignées à l''entreprise admin', v_row_count;
    END IF;
  END IF;
  
  -- Activités RH
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rh_activities') THEN
    UPDATE public.rh_activities
    SET company_id = v_company_id
    WHERE created_by = v_admin_user_id
    AND (company_id IS NULL OR company_id != v_company_id);
    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    IF v_row_count > 0 THEN
      RAISE NOTICE '✅ % activités RH assignées à l''entreprise admin', v_row_count;
    END IF;
  END IF;
  
  -- Employee Assignments (via projects)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employee_assignments') THEN
    UPDATE public.employee_assignments ea
    SET company_id = v_company_id
    FROM public.projects p
    WHERE ea.project_id = p.id
    AND p.user_id = v_admin_user_id
    AND p.company_id = v_company_id
    AND (ea.company_id IS NULL OR ea.company_id != v_company_id);
    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    IF v_row_count > 0 THEN
      RAISE NOTICE '✅ % affectations employés assignées à l''entreprise admin', v_row_count;
    END IF;
  END IF;
  
  -- Messages
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages') THEN
    UPDATE public.messages
    SET company_id = v_company_id
    WHERE user_id = v_admin_user_id
    AND (company_id IS NULL OR company_id != v_company_id);
    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    IF v_row_count > 0 THEN
      RAISE NOTICE '✅ % messages assignés à l''entreprise admin', v_row_count;
    END IF;
  END IF;
  
  -- Email Messages
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'email_messages') THEN
    UPDATE public.email_messages
    SET company_id = v_company_id
    WHERE user_id = v_admin_user_id
    AND (company_id IS NULL OR company_id != v_company_id);
    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    IF v_row_count > 0 THEN
      RAISE NOTICE '✅ % emails assignés à l''entreprise admin', v_row_count;
    END IF;
  END IF;
  
  -- Maintenance Reminders
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'maintenance_reminders') THEN
    UPDATE public.maintenance_reminders
    SET company_id = v_company_id
    WHERE user_id = v_admin_user_id
    AND (company_id IS NULL OR company_id != v_company_id);
    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    IF v_row_count > 0 THEN
      RAISE NOTICE '✅ % rappels maintenance assignés à l''entreprise admin', v_row_count;
    END IF;
  END IF;
  
  -- Image Analysis
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'image_analysis') THEN
    UPDATE public.image_analysis
    SET company_id = v_company_id
    WHERE user_id = v_admin_user_id
    AND (company_id IS NULL OR company_id != v_company_id);
    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    IF v_row_count > 0 THEN
      RAISE NOTICE '✅ % analyses d''images assignées à l''entreprise admin', v_row_count;
    END IF;
  END IF;
  
  -- AI Conversations
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_conversations') THEN
    UPDATE public.ai_conversations
    SET company_id = v_company_id
    WHERE user_id = v_admin_user_id
    AND (company_id IS NULL OR company_id != v_company_id);
    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    IF v_row_count > 0 THEN
      RAISE NOTICE '✅ % conversations IA assignées à l''entreprise admin', v_row_count;
    END IF;
  END IF;
  
  -- Email Queue
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'email_queue') THEN
    UPDATE public.email_queue
    SET company_id = v_company_id
    WHERE user_id = v_admin_user_id
    AND (company_id IS NULL OR company_id != v_company_id);
    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    IF v_row_count > 0 THEN
      RAISE NOTICE '✅ % emails en file assignés à l''entreprise admin', v_row_count;
    END IF;
  END IF;
  
  RAISE NOTICE '✅ Toutes les données de l''admin ont été assignées à l''entreprise: %', v_company_id;
  RAISE NOTICE '📋 Entreprise ID: %', v_company_id;
  RAISE NOTICE '📋 Nom: BTP Smart Pro - Admin';
  
END $$;

-- Vérification finale
SELECT 
  c.id AS company_id,
  c.name AS company_name,
  cu.user_id,
  u.email,
  cu.role,
  cu.status
FROM public.companies c
JOIN public.company_users cu ON cu.company_id = c.id
JOIN auth.users u ON u.id = cu.user_id
WHERE u.email = 'sabri.khalfallah6@gmail.com';

-- Compter les données de l'admin par table
SELECT 'clients' AS table_name, COUNT(*) AS count
FROM public.clients c
JOIN auth.users u ON u.id = c.user_id
WHERE u.email = 'sabri.khalfallah6@gmail.com'
UNION ALL
SELECT 'projects', COUNT(*)
FROM public.projects p
JOIN auth.users u ON u.id = p.user_id
WHERE u.email = 'sabri.khalfallah6@gmail.com'
UNION ALL
SELECT 'invoices', COUNT(*)
FROM public.invoices i
JOIN auth.users u ON u.id = i.user_id
WHERE u.email = 'sabri.khalfallah6@gmail.com'
UNION ALL
SELECT 'payments', COUNT(*)
FROM public.payments p
JOIN auth.users u ON u.id = p.user_id
WHERE u.email = 'sabri.khalfallah6@gmail.com';
