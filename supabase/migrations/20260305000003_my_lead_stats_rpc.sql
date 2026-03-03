-- Stats des leads du closer (sans limite 1000) : comptage en SQL.

CREATE OR REPLACE FUNCTION public.get_my_lead_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total     BIGINT;
  v_new       BIGINT;
  v_contacted BIGINT;
  v_qualified BIGINT;
  v_signed    BIGINT;
  v_lost      BIGINT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('total', 0, 'new', 0, 'contacted', 0, 'qualified', 0, 'signed', 0, 'lost', 0);
  END IF;

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'NEW'),
    COUNT(*) FILTER (WHERE status = 'CONTACTED'),
    COUNT(*) FILTER (WHERE status = 'QUALIFIED'),
    COUNT(*) FILTER (WHERE status = 'SIGNED'),
    COUNT(*) FILTER (WHERE status = 'LOST')
  INTO v_total, v_new, v_contacted, v_qualified, v_signed, v_lost
  FROM public.leads
  WHERE owner_id = auth.uid();

  RETURN json_build_object(
    'total',     COALESCE(v_total, 0),
    'new',       COALESCE(v_new, 0),
    'contacted', COALESCE(v_contacted, 0),
    'qualified', COALESCE(v_qualified, 0),
    'signed',    COALESCE(v_signed, 0),
    'lost',      COALESCE(v_lost, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_lead_stats() TO authenticated;
