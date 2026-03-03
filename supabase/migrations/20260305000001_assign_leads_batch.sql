-- Assignation par lots de 1000 pour éviter toute limite implicite (timeout, max rows, etc.)

CREATE OR REPLACE FUNCTION public.assign_leads_to_closer(
  p_dept_code TEXT,
  p_closer_email TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_count INTEGER;
  v_batch INTEGER;
  v_total INTEGER := 0;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE LOWER(email) = LOWER(p_closer_email)
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Closer non trouvé : %', p_closer_email;
  END IF;

  LOOP
    -- Lot de 1000 pour éviter timeout / limite
    WITH candidates AS (
      SELECT id FROM public.leads
      WHERE (job_dept = p_dept_code OR (job_dept IS NULL AND dept_code = p_dept_code))
        AND status = 'NEW'
        AND owner_id IS NULL
      LIMIT 1000
    )
    UPDATE public.leads l
    SET owner_id = v_user_id
    FROM candidates c
    WHERE l.id = c.id;

    GET DIAGNOSTICS v_batch = ROW_COUNT;
    v_total := v_total + v_batch;
    EXIT WHEN v_batch = 0;
  END LOOP;

  RETURN v_total;
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_leads_to_closer(TEXT, TEXT) TO authenticated;
