-- Libérer les leads d'un closer (ex. closer supprimé) et permettre de les réassigner à un autre.

-- 1) Libérer tous les leads assignés à un closer (par email)
CREATE OR REPLACE FUNCTION public.unassign_leads_from_closer(p_closer_email TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
  v_count INTEGER;
BEGIN
  IF p_closer_email IS NULL OR TRIM(p_closer_email) = '' THEN
    RAISE EXCEPTION 'Email du closer requis';
  END IF;

  SELECT id INTO v_owner_id
  FROM auth.users
  WHERE LOWER(email) = LOWER(TRIM(p_closer_email))
  LIMIT 1;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Aucun utilisateur trouvé pour l''email : %', p_closer_email;
  END IF;

  UPDATE public.leads
  SET owner_id = NULL
  WHERE owner_id = v_owner_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- 2) Assigner tous les leads SANS propriétaire (tous statuts) d'un département à un closer (réassignation)
CREATE OR REPLACE FUNCTION public.assign_orphan_leads_to_closer(
  p_dept_code TEXT,
  p_closer_email TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    WITH candidates AS (
      SELECT id FROM public.leads
      WHERE (job_dept = p_dept_code OR (job_dept IS NULL AND dept_code = p_dept_code))
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

-- 3) get_lead_stats : ajouter le nombre de leads "sans propriétaire" (pour réassignation)
CREATE OR REPLACE FUNCTION public.get_lead_stats(p_dept_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total    BIGINT;
  v_available BIGINT;
  v_assigned  BIGINT;
  v_orphan    BIGINT;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'NEW' AND owner_id IS NULL),
    COUNT(*) FILTER (WHERE owner_id IS NOT NULL),
    COUNT(*) FILTER (WHERE owner_id IS NULL)
  INTO v_total, v_available, v_assigned, v_orphan
  FROM public.leads
  WHERE (job_dept = p_dept_code OR (job_dept IS NULL AND dept_code = p_dept_code));

  RETURN json_build_object(
    'total',    COALESCE(v_total, 0),
    'available', COALESCE(v_available, 0),
    'assigned',  COALESCE(v_assigned, 0),
    'orphan',    COALESCE(v_orphan, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.unassign_leads_from_closer(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_orphan_leads_to_closer(TEXT, TEXT) TO authenticated;
