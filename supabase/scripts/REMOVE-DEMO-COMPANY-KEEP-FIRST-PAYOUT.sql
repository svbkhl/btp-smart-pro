-- =====================================================
-- SUPPRIMER L'ENTREPRISE "Démo BTP Smart Pro"
-- =====================================================
-- Garde uniquement "first payout" (et les autres entreprises réelles).
-- À exécuter dans Supabase Dashboard → SQL Editor
-- =====================================================

DO $$
DECLARE
  v_demo_company_id UUID;
BEGIN
  -- Trouver l'id de l'entreprise "Démo BTP Smart Pro"
  SELECT id INTO v_demo_company_id
  FROM public.companies
  WHERE name ILIKE 'Démo BTP Smart Pro'
  LIMIT 1;

  IF v_demo_company_id IS NULL THEN
    RAISE NOTICE 'Aucune entreprise "Démo BTP Smart Pro" trouvée.';
    RETURN;
  END IF;

  -- Supprimer les données liées (ordre pour respecter les FK)
  DELETE FROM public.role_permissions
  WHERE role_id IN (SELECT id FROM public.roles WHERE company_id = v_demo_company_id);

  DELETE FROM public.roles
  WHERE company_id = v_demo_company_id;

  DELETE FROM public.company_users
  WHERE company_id = v_demo_company_id;

  -- employees, user_permissions si les tables existent
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employees') THEN
    DELETE FROM public.employees WHERE company_id = v_demo_company_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_permissions') THEN
    DELETE FROM public.user_permissions WHERE company_id = v_demo_company_id;
  END IF;

  DELETE FROM public.companies
  WHERE id = v_demo_company_id;

  RAISE NOTICE '✅ Entreprise "Démo BTP Smart Pro" supprimée. Il ne reste que "first payout" (et vos autres entreprises).';
END $$;
