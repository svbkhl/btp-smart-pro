-- Aligne le sens de « Nouveaux » dans les KPI admin avec get_my_lead_stats / closer :
-- « Nouveaux » = leads jamais encore ouverts/traités (first_seen_at IS NULL),
-- pas status = 'NEW' (sinon écart massif après 20260318000001).
--
-- Prérequis : si la migration 20260318000001 n’est pas sur la base distante,
-- la colonne n’existe pas — on la crée ici (idempotent).

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS first_seen_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_leads_first_seen_at ON public.leads(first_seen_at) WHERE first_seen_at IS NULL;

CREATE OR REPLACE FUNCTION public.set_lead_first_seen_at_on_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.first_seen_at IS NULL THEN
    NEW.first_seen_at := NOW();
  ELSE
    NEW.first_seen_at := OLD.first_seen_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_leads_first_seen_at ON public.leads;
CREATE TRIGGER trg_leads_first_seen_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.set_lead_first_seen_at_on_update();

-- Anciennes versions des RPC KPI peuvent avoir un type de retour TABLE différent
-- (ex. colonne « contacted »). CREATE OR REPLACE ne change pas le row type → DROP d’abord.
DROP FUNCTION IF EXISTS public.get_global_closers_kpi();
DROP FUNCTION IF EXISTS public.get_all_closers_kpi();
DROP FUNCTION IF EXISTS public.get_all_owners_lead_kpi();
DROP FUNCTION IF EXISTS public.get_lead_kpi_by_day(integer);

-- 1) KPI globaux
CREATE OR REPLACE FUNCTION public.get_global_closers_kpi()
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'total',          COUNT(*)::bigint,
    'new',            COUNT(*) FILTER (WHERE first_seen_at IS NULL)::bigint,
    'to_callback',    COUNT(*) FILTER (WHERE status = 'TO_CALLBACK')::bigint,
    'no_answer',      COUNT(*) FILTER (WHERE status = 'NO_ANSWER')::bigint,
    'not_interested', COUNT(*) FILTER (WHERE status = 'NOT_INTERESTED')::bigint,
    'qualified',      COUNT(*) FILTER (WHERE status = 'QUALIFIED')::bigint,
    'signed',         COUNT(*) FILTER (WHERE status = 'SIGNED')::bigint,
    'lost',           COUNT(*) FILTER (WHERE status = 'LOST')::bigint
  )
  FROM public.leads
  WHERE owner_id IS NOT NULL;
$$;

-- 2) KPI par closer (closer_emails)
CREATE OR REPLACE FUNCTION public.get_all_closers_kpi()
RETURNS TABLE (
  closer_id uuid,
  closer_email text,
  closer_name text,
  total bigint,
  new bigint,
  to_callback bigint,
  no_answer bigint,
  not_interested bigint,
  qualified bigint,
  signed bigint,
  lost bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.id AS closer_id,
    u.email AS closer_email,
    COALESCE(
      NULLIF(TRIM(
        COALESCE(u.raw_user_meta_data->>'first_name', u.raw_user_meta_data->>'prenom', '') || ' ' ||
        COALESCE(u.raw_user_meta_data->>'nom', u.raw_user_meta_data->>'last_name', '')
      ), ''),
      u.raw_user_meta_data->>'full_name',
      split_part(u.email, '@', 1)
    )::text AS closer_name,
    COUNT(l.id)::bigint AS total,
    COUNT(l.id) FILTER (WHERE l.first_seen_at IS NULL)::bigint AS new,
    COUNT(l.id) FILTER (WHERE l.status = 'TO_CALLBACK')::bigint AS to_callback,
    COUNT(l.id) FILTER (WHERE l.status = 'NO_ANSWER')::bigint AS no_answer,
    COUNT(l.id) FILTER (WHERE l.status = 'NOT_INTERESTED')::bigint AS not_interested,
    COUNT(l.id) FILTER (WHERE l.status = 'QUALIFIED')::bigint AS qualified,
    COUNT(l.id) FILTER (WHERE l.status = 'SIGNED')::bigint AS signed,
    COUNT(l.id) FILTER (WHERE l.status = 'LOST')::bigint AS lost
  FROM public.closer_emails ce
  JOIN auth.users u ON LOWER(u.email) = LOWER(ce.email)
  LEFT JOIN public.leads l ON l.owner_id = u.id
  GROUP BY u.id, u.email, u.raw_user_meta_data
  ORDER BY COUNT(l.id) DESC, u.email;
$$;

-- 3) KPI par propriétaire (fallback)
CREATE OR REPLACE FUNCTION public.get_all_owners_lead_kpi()
RETURNS TABLE (
  closer_id uuid,
  closer_email text,
  closer_name text,
  total bigint,
  new bigint,
  to_callback bigint,
  no_answer bigint,
  not_interested bigint,
  qualified bigint,
  signed bigint,
  lost bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.id AS closer_id,
    u.email AS closer_email,
    COALESCE(
      NULLIF(TRIM(
        COALESCE(u.raw_user_meta_data->>'first_name', u.raw_user_meta_data->>'prenom', '') || ' ' ||
        COALESCE(u.raw_user_meta_data->>'nom', u.raw_user_meta_data->>'last_name', '')
      ), ''),
      u.raw_user_meta_data->>'full_name',
      split_part(u.email, '@', 1)
    )::text AS closer_name,
    COUNT(l.id)::bigint AS total,
    COUNT(l.id) FILTER (WHERE l.first_seen_at IS NULL)::bigint AS new,
    COUNT(l.id) FILTER (WHERE l.status = 'TO_CALLBACK')::bigint AS to_callback,
    COUNT(l.id) FILTER (WHERE l.status = 'NO_ANSWER')::bigint AS no_answer,
    COUNT(l.id) FILTER (WHERE l.status = 'NOT_INTERESTED')::bigint AS not_interested,
    COUNT(l.id) FILTER (WHERE l.status = 'QUALIFIED')::bigint AS qualified,
    COUNT(l.id) FILTER (WHERE l.status = 'SIGNED')::bigint AS signed,
    COUNT(l.id) FILTER (WHERE l.status = 'LOST')::bigint AS lost
  FROM public.leads l
  JOIN auth.users u ON u.id = l.owner_id
  WHERE l.owner_id IS NOT NULL
  GROUP BY u.id, u.email, u.raw_user_meta_data
  ORDER BY COUNT(l.id) DESC, u.email;
$$;

-- 4) KPI par jour : même définition pour la colonne « new »
CREATE OR REPLACE FUNCTION public.get_lead_kpi_by_day(p_days integer DEFAULT 30)
RETURNS TABLE (
  day date,
  total bigint,
  new bigint,
  to_callback bigint,
  no_answer bigint,
  not_interested bigint,
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
    COUNT(*) FILTER (WHERE first_seen_at IS NULL)::bigint AS new,
    COUNT(*) FILTER (WHERE status = 'TO_CALLBACK')::bigint AS to_callback,
    COUNT(*) FILTER (WHERE status = 'NO_ANSWER')::bigint AS no_answer,
    COUNT(*) FILTER (WHERE status = 'NOT_INTERESTED')::bigint AS not_interested,
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
GRANT EXECUTE ON FUNCTION public.get_all_closers_kpi() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_owners_lead_kpi() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_lead_kpi_by_day(integer) TO authenticated;
