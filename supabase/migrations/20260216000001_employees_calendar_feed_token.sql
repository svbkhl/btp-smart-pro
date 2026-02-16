-- ============================================================================
-- Ajout du token de flux calendrier pour les employés
-- ============================================================================
-- Permet aux employés d'abonner leur Google Calendar à leur planning via URL iCal
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'calendar_feed_token'
  ) THEN
    ALTER TABLE public.employees
    ADD COLUMN calendar_feed_token UUID UNIQUE;
    
    CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_calendar_feed_token
    ON public.employees(calendar_feed_token)
    WHERE calendar_feed_token IS NOT NULL;
    
    RAISE NOTICE '✅ Colonne calendar_feed_token ajoutée à employees';
  END IF;
END $$;

-- RPC: obtenir ou créer le token de flux calendrier pour l'employé connecté
CREATE OR REPLACE FUNCTION public.get_or_create_calendar_feed_token(p_company_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_employee_id UUID;
  v_token UUID;
BEGIN
  -- Trouver l'employé pour (auth.uid(), company_id)
  SELECT id, calendar_feed_token INTO v_employee_id, v_token
  FROM public.employees
  WHERE user_id = auth.uid() AND company_id = p_company_id
  LIMIT 1;

  IF v_employee_id IS NULL THEN
    RAISE EXCEPTION 'Employé non trouvé pour cette entreprise';
  END IF;

  -- Générer le token si absent
  IF v_token IS NULL THEN
    v_token := gen_random_uuid();
    UPDATE public.employees
    SET calendar_feed_token = v_token
    WHERE id = v_employee_id;
  END IF;

  RETURN v_token;
END;
$$;

COMMENT ON FUNCTION public.get_or_create_calendar_feed_token IS 'Retourne le token iCal pour l''employé connecté (ou en crée un). Utilisé pour le flux planning dans Google Calendar.';
