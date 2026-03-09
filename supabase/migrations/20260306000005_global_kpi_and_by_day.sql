-- KPI globaux (tous les closers réunis) et par jour pour l'admin

-- 1) KPI globaux : tous les leads assignés (tous closers confondus)
CREATE OR REPLACE FUNCTION public.get_global_closers_kpi()
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'total',     COUNT(*)::bigint,
    'new',       COUNT(*) FILTER (WHERE status = 'NEW')::bigint,
    'contacted', COUNT(*) FILTER (WHERE status = 'CONTACTED')::bigint,
    'qualified', COUNT(*) FILTER (WHERE status = 'QUALIFIED')::bigint,
    'signed',    COUNT(*) FILTER (WHERE status = 'SIGNED')::bigint,
    'lost',      COUNT(*) FILTER (WHERE status = 'LOST')::bigint
  )
  FROM public.leads
  WHERE owner_id IS NOT NULL;
$$;

-- 2) KPI par jour : pour chaque jour (derniers N jours), nb de leads par statut (assignés, mis à jour ce jour-là)
CREATE OR REPLACE FUNCTION public.get_lead_kpi_by_day(p_days integer DEFAULT 30)
RETURNS TABLE (
  day date,
  total bigint,
  new bigint,
  contacted bigint,
  qualified bigint,
  signed bigint,
  lost bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (updated_at AT TIME ZONE 'UTC')::date AS day,
    COUNT(*)::bigint AS total,
    COUNT(*) FILTER (WHERE status = 'NEW')::bigint AS new,
    COUNT(*) FILTER (WHERE status = 'CONTACTED')::bigint AS contacted,
    COUNT(*) FILTER (WHERE status = 'QUALIFIED')::bigint AS qualified,
    COUNT(*) FILTER (WHERE status = 'SIGNED')::bigint AS signed,
    COUNT(*) FILTER (WHERE status = 'LOST')::bigint AS lost
  FROM public.leads
  WHERE owner_id IS NOT NULL
    AND (updated_at AT TIME ZONE 'UTC')::date >= (CURRENT_DATE - (p_days - 1))
  GROUP BY (updated_at AT TIME ZONE 'UTC')::date
  ORDER BY day DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_global_closers_kpi() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_lead_kpi_by_day(integer) TO authenticated;
