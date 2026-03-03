-- Stats et liste des depts via RPC (SECURITY DEFINER) pour contourner la RLS
-- et afficher les vrais totaux sur la page Assigner.

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
  v_filter    BOOLEAN;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'NEW' AND owner_id IS NULL),
    COUNT(*) FILTER (WHERE owner_id IS NOT NULL)
  INTO v_total, v_available, v_assigned
  FROM public.leads
  WHERE (job_dept = p_dept_code OR (job_dept IS NULL AND dept_code = p_dept_code));

  RETURN json_build_object(
    'total',    COALESCE(v_total, 0),
    'available', COALESCE(v_available, 0),
    'assigned',  COALESCE(v_assigned, 0)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_generated_depts()
RETURNS TABLE(code TEXT, total BIGINT, available BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(l.job_dept, l.dept_code)::TEXT AS code,
    COUNT(*)::BIGINT AS total,
    COUNT(*) FILTER (WHERE l.status = 'NEW' AND l.owner_id IS NULL)::BIGINT AS available
  FROM public.leads l
  GROUP BY COALESCE(l.job_dept, l.dept_code)
  ORDER BY code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_lead_stats(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_generated_depts() TO authenticated;
