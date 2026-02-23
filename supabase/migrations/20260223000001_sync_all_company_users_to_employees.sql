-- ============================================================================
-- Synchroniser TOUS les membres de chaque entreprise vers la table employees
-- Pour que CHAQUE employé de CHAQUE entreprise puisse voir les affectations
-- créées par son patron sur son planning
-- ============================================================================
-- Les employés doivent avoir une fiche dans "employees" pour :
-- 1. Apparaître dans le Planning employés (côté patron)
-- 2. Voir leurs affectations dans Mon planning (RLS fallback)
-- ============================================================================

DO $$
DECLARE
  v_count INTEGER := 0;
  r RECORD;
  v_company_id UUID;
BEGIN
  FOR r IN
    SELECT DISTINCT ON (cu.user_id)
      cu.user_id,
      cu.company_id,
      COALESCE(u.email, 'membre@company.local') AS email,
      COALESCE(NULLIF(TRIM(u.raw_user_meta_data->>'nom'), ''), u.raw_user_meta_data->>'last_name', 'Employé') AS nom,
      COALESCE(NULLIF(TRIM(u.raw_user_meta_data->>'prenom'), ''), u.raw_user_meta_data->>'first_name', ' ') AS prenom
    FROM company_users cu
    JOIN auth.users u ON u.id = cu.user_id
    WHERE cu.company_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM employees e 
      WHERE e.user_id = cu.user_id AND e.company_id = cu.company_id
    )
    ORDER BY cu.user_id, cu.company_id
  LOOP
    v_company_id := r.company_id;
    IF v_company_id IS NULL THEN
      SELECT c2.company_id INTO v_company_id
      FROM company_users c2
      WHERE c2.user_id = r.user_id AND c2.company_id IS NOT NULL
      LIMIT 1;
    END IF;
    IF v_company_id IS NULL THEN
      CONTINUE;
    END IF;
    BEGIN
      INSERT INTO public.employees (company_id, user_id, nom, prenom, email, poste)
      VALUES (v_company_id, r.user_id, r.nom, r.prenom, r.email, 'Employé');
      v_count := v_count + 1;
    EXCEPTION 
      WHEN unique_violation THEN
        UPDATE public.employees 
        SET company_id = COALESCE(company_id, v_company_id), 
            nom = CASE WHEN nom IS NULL OR nom = '' THEN r.nom ELSE nom END,
            prenom = CASE WHEN prenom IS NULL OR prenom = '' THEN r.prenom ELSE prenom END,
            email = COALESCE(NULLIF(TRIM(email), ''), r.email)
        WHERE user_id = r.user_id;
        v_count := v_count + 1;
    END;
  END LOOP;
  
  RAISE NOTICE '✅ % membre(s) synchronisé(s) - chaque employé peut voir le planning de son patron', v_count;
END $$;
