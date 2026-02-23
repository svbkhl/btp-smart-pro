-- Fallback RLS pour employee_assignments : les affectations créées par l'owner
-- doivent apparaître sur le planning du member (employé)
-- Permet à l'employé de voir SES affectations même si current_company_id bloque

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employee_assignments') THEN
    -- SELECT : l'employé peut toujours voir ses propres affectations
    DROP POLICY IF EXISTS "Employees can always view own assignments fallback" ON public.employee_assignments;
    CREATE POLICY "Employees can always view own assignments fallback"
      ON public.employee_assignments FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.employees e
          WHERE e.id = employee_assignments.employee_id
          AND e.user_id = auth.uid()
        )
      );

    RAISE NOTICE '✅ Policy fallback employee_assignments créée : les members voient les affectations de l''owner';
  END IF;
END $$;
