-- ============================================================
-- RPC create_lead_job : créer un job de génération (admin par email ou JWT)
-- Permet aux admins définis par email d'ajouter des jobs sans is_system_admin dans le JWT
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_lead_job(p_dept_code TEXT, p_dept_name TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_job_id UUID;
  v_admin_emails TEXT[] := ARRAY[
    'sabri.khalfallah6@gmail.com',
    'sabri.khalallah6@gmail.com',
    'khalfallahs.ndrc@gmail.com',
    'sabbg.du73100@gmail.com'
  ];
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

  -- Admin : JWT is_system_admin OU email dans la liste
  IF (auth.jwt() -> 'user_metadata' ->> 'is_system_admin')::boolean IS TRUE THEN
    NULL; -- OK
  ELSIF v_user_email IS NOT NULL AND LOWER(v_user_email) = ANY(SELECT LOWER(unnest(v_admin_emails))) THEN
    NULL; -- OK
  ELSE
    RAISE EXCEPTION 'Accès refusé : admin requis pour créer un job de leads';
  END IF;

  INSERT INTO public.lead_jobs (dept_code, dept_name, status)
  VALUES (p_dept_code, COALESCE(p_dept_name, p_dept_code), 'PENDING')
  RETURNING id INTO v_job_id;

  RETURN v_job_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_lead_job(TEXT, TEXT) TO authenticated;
