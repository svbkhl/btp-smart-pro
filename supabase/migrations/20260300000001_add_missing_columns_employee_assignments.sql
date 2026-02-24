-- Ajoute les colonnes manquantes à employee_assignments
-- heure_debut et heure_fin : horaires de travail
-- title        : libellé libre quand pas de chantier (congé, formation…)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'employee_assignments' AND column_name = 'heure_debut'
  ) THEN
    ALTER TABLE public.employee_assignments ADD COLUMN heure_debut TIME;
    COMMENT ON COLUMN public.employee_assignments.heure_debut IS 'Heure de début (HH:mm)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'employee_assignments' AND column_name = 'heure_fin'
  ) THEN
    ALTER TABLE public.employee_assignments ADD COLUMN heure_fin TIME;
    COMMENT ON COLUMN public.employee_assignments.heure_fin IS 'Heure de fin (HH:mm)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'employee_assignments' AND column_name = 'title'
  ) THEN
    ALTER TABLE public.employee_assignments ADD COLUMN title TEXT;
    COMMENT ON COLUMN public.employee_assignments.title IS 'Libellé libre si pas de chantier (congé, formation…)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'employee_assignments' AND column_name = 'temps_pause'
  ) THEN
    ALTER TABLE public.employee_assignments ADD COLUMN temps_pause INTEGER DEFAULT 60 CHECK (temps_pause >= 0 AND temps_pause <= 480);
    COMMENT ON COLUMN public.employee_assignments.temps_pause IS 'Temps de pause en minutes';
  END IF;
END $$;
