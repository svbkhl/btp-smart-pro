-- Remplir company_id manquant sur employee_assignments (depuis employees)
-- Permet aux employés de voir leurs affectations même si company_id était NULL
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'employee_assignments' AND column_name = 'company_id'
  ) THEN
    UPDATE public.employee_assignments ea
    SET company_id = e.company_id, updated_at = now()
    FROM public.employees e
    WHERE ea.employee_id = e.id
      AND ea.company_id IS NULL
      AND e.company_id IS NOT NULL;
  END IF;
END $$;
