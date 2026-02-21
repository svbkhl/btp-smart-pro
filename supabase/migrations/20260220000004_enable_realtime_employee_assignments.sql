-- Activer Realtime pour employee_assignments
-- Permet aux employés de voir en temps réel les modifications du planning par l'owner

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'employee_assignments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.employee_assignments;
  END IF;
END $$;
