-- Activité d'un closer : stats leads + répartition par département (pour admin / clic sur un closer)
CREATE OR REPLACE FUNCTION public.get_closer_activity(p_closer_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id uuid;
  v_stats json;
  v_by_dept json;
BEGIN
  IF p_closer_email IS NULL OR TRIM(p_closer_email) = '' THEN
    RETURN json_build_object('stats', json_build_object('total', 0, 'new', 0, 'contacted', 0, 'qualified', 0, 'signed', 0, 'lost', 0), 'by_dept', '[]'::json);
  END IF;

  SELECT id INTO v_owner_id
  FROM auth.users
  WHERE LOWER(email) = LOWER(TRIM(p_closer_email))
  LIMIT 1;

  IF v_owner_id IS NULL THEN
    RETURN json_build_object('stats', json_build_object('total', 0, 'new', 0, 'contacted', 0, 'qualified', 0, 'signed', 0, 'lost', 0), 'by_dept', '[]'::json);
  END IF;

  SELECT json_build_object(
    'total',     COUNT(*),
    'new',       COUNT(*) FILTER (WHERE status = 'NEW'),
    'contacted', COUNT(*) FILTER (WHERE status = 'CONTACTED'),
    'qualified', COUNT(*) FILTER (WHERE status = 'QUALIFIED'),
    'signed',    COUNT(*) FILTER (WHERE status = 'SIGNED'),
    'lost',      COUNT(*) FILTER (WHERE status = 'LOST')
  ) INTO v_stats
  FROM public.leads
  WHERE owner_id = v_owner_id;

  SELECT COALESCE(
    json_agg(
      json_build_object('dept_code', dept_code, 'count', cnt)
      ORDER BY cnt DESC, dept_code
    ),
    '[]'::json
  ) INTO v_by_dept
  FROM (
    SELECT COALESCE(job_dept, dept_code) AS dept_code, COUNT(*)::int AS cnt
    FROM public.leads
    WHERE owner_id = v_owner_id
    GROUP BY COALESCE(job_dept, dept_code)
  ) t;

  RETURN json_build_object('stats', COALESCE(v_stats, '{}'::json), 'by_dept', COALESCE(v_by_dept, '[]'::json));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_closer_activity(text) TO authenticated;
