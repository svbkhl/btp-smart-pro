-- ============================================================================
-- Employés : lecture seule sur les affectations (pas de création/modif/suppression)
-- ============================================================================
-- Les employés peuvent voir leurs affectations (créées par le patron) mais
-- ne peuvent pas les créer, modifier ou supprimer.
-- Seuls les patrons (owner) peuvent gérer les affectations.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employee_assignments') THEN
    RAISE NOTICE '⏭️ Table employee_assignments absente, migration ignorée';
    RETURN;
  END IF;

  -- Supprimer les policies existantes
  DROP POLICY IF EXISTS "Employees can always view own assignments fallback" ON public.employee_assignments;
  DROP POLICY IF EXISTS "Strict company isolation - SELECT employee_assignments" ON public.employee_assignments;
  DROP POLICY IF EXISTS "Strict company isolation - INSERT employee_assignments" ON public.employee_assignments;
  DROP POLICY IF EXISTS "Strict company isolation - UPDATE employee_assignments" ON public.employee_assignments;
  DROP POLICY IF EXISTS "Strict company isolation - DELETE employee_assignments" ON public.employee_assignments;

  -- SELECT : patron voit tout de son entreprise OU employé voit ses propres affectations
  CREATE POLICY "Assignments SELECT - owner or own"
    ON public.employee_assignments FOR SELECT
    USING (
      -- Patron : voir toutes les affectations de son entreprise
      (
        company_id = public.current_company_id()
        AND EXISTS (
          SELECT 1 FROM public.company_users cu
          WHERE cu.user_id = auth.uid()
            AND cu.company_id = employee_assignments.company_id
            AND cu.role = 'owner'
        )
      )
      OR
      -- Employé : voir uniquement ses propres affectations
      EXISTS (
        SELECT 1 FROM public.employees e
        WHERE e.id = employee_assignments.employee_id
          AND e.user_id = auth.uid()
      )
    );

  -- INSERT : uniquement le patron (owner)
  CREATE POLICY "Assignments INSERT - owner only"
    ON public.employee_assignments FOR INSERT
    WITH CHECK (
      company_id = public.current_company_id()
      AND EXISTS (
        SELECT 1 FROM public.company_users cu
        WHERE cu.user_id = auth.uid()
          AND cu.company_id = employee_assignments.company_id
          AND cu.role = 'owner'
      )
    );

  -- UPDATE : uniquement le patron (owner)
  CREATE POLICY "Assignments UPDATE - owner only"
    ON public.employee_assignments FOR UPDATE
    USING (
      company_id = public.current_company_id()
      AND EXISTS (
        SELECT 1 FROM public.company_users cu
        WHERE cu.user_id = auth.uid()
          AND cu.company_id = employee_assignments.company_id
          AND cu.role = 'owner'
      )
    )
    WITH CHECK (
      company_id = public.current_company_id()
      AND EXISTS (
        SELECT 1 FROM public.company_users cu
        WHERE cu.user_id = auth.uid()
          AND cu.company_id = employee_assignments.company_id
          AND cu.role = 'owner'
      )
    );

  -- DELETE : uniquement le patron (owner)
  CREATE POLICY "Assignments DELETE - owner only"
    ON public.employee_assignments FOR DELETE
    USING (
      company_id = public.current_company_id()
      AND EXISTS (
        SELECT 1 FROM public.company_users cu
        WHERE cu.user_id = auth.uid()
          AND cu.company_id = employee_assignments.company_id
          AND cu.role = 'owner'
      )
    );

  RAISE NOTICE '✅ employee_assignments : employés en lecture seule, seuls les patrons peuvent modifier';
END $$;
