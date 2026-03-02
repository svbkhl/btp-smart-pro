-- Assignation par job_dept (département du job) pour pouvoir assigner tous les leads d'un job.

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
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE LOWER(email) = LOWER(p_closer_email)
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Closer non trouvé : %', p_closer_email;
  END IF;

  -- Assigner par job_dept (ou dept_code si job_dept non renseigné)
  UPDATE public.leads
  SET owner_id = v_user_id
  WHERE (job_dept = p_dept_code OR (job_dept IS NULL AND dept_code = p_dept_code))
    AND status = 'NEW'
    AND owner_id IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_leads_to_closer(TEXT, TEXT) TO authenticated;
