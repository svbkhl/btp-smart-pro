-- Retrait du statut CONTACTED : les leads existants passent en TO_CALLBACK (À rappeler)

-- 1) Migrer les leads "Contacté" vers "À rappeler"
UPDATE public.leads SET status = 'TO_CALLBACK' WHERE status = 'CONTACTED';

-- 2) Contrainte sans CONTACTED
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_status_check CHECK (
  status IN (
    'NEW',
    'TO_CALLBACK',
    'NO_ANSWER',
    'NOT_INTERESTED',
    'QUALIFIED',
    'SIGNED',
    'LOST'
  )
);

-- 3) get_my_lead_stats (sans contacted)
CREATE OR REPLACE FUNCTION public.get_my_lead_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total     BIGINT;
  v_new       BIGINT;
  v_to_callback BIGINT;
  v_no_answer BIGINT;
  v_not_interested BIGINT;
  v_qualified BIGINT;
  v_signed    BIGINT;
  v_lost      BIGINT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object(
      'total', 0, 'new', 0, 'to_callback', 0, 'no_answer', 0, 'not_interested', 0,
      'qualified', 0, 'signed', 0, 'lost', 0
    );
  END IF;

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'NEW'),
    COUNT(*) FILTER (WHERE status = 'TO_CALLBACK'),
    COUNT(*) FILTER (WHERE status = 'NO_ANSWER'),
    COUNT(*) FILTER (WHERE status = 'NOT_INTERESTED'),
    COUNT(*) FILTER (WHERE status = 'QUALIFIED'),
    COUNT(*) FILTER (WHERE status = 'SIGNED'),
    COUNT(*) FILTER (WHERE status = 'LOST')
  INTO v_total, v_new, v_to_callback, v_no_answer, v_not_interested, v_qualified, v_signed, v_lost
  FROM public.leads
  WHERE owner_id = auth.uid();

  RETURN json_build_object(
    'total',          COALESCE(v_total, 0),
    'new',            COALESCE(v_new, 0),
    'to_callback',    COALESCE(v_to_callback, 0),
    'no_answer',      COALESCE(v_no_answer, 0),
    'not_interested', COALESCE(v_not_interested, 0),
    'qualified',      COALESCE(v_qualified, 0),
    'signed',         COALESCE(v_signed, 0),
    'lost',           COALESCE(v_lost, 0)
  );
END;
$$;

-- 4) get_closer_activity (sans contacted)
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
    RETURN json_build_object(
      'stats', json_build_object(
        'total', 0, 'new', 0, 'to_callback', 0, 'no_answer', 0, 'not_interested', 0,
        'qualified', 0, 'signed', 0, 'lost', 0
      ),
      'by_dept', '[]'::json
    );
  END IF;

  SELECT id INTO v_owner_id
  FROM auth.users
  WHERE LOWER(email) = LOWER(TRIM(p_closer_email))
  LIMIT 1;

  IF v_owner_id IS NULL THEN
    RETURN json_build_object(
      'stats', json_build_object(
        'total', 0, 'new', 0, 'to_callback', 0, 'no_answer', 0, 'not_interested', 0,
        'qualified', 0, 'signed', 0, 'lost', 0
      ),
      'by_dept', '[]'::json
    );
  END IF;

  SELECT json_build_object(
    'total',          COUNT(*),
    'new',            COUNT(*) FILTER (WHERE status = 'NEW'),
    'to_callback',    COUNT(*) FILTER (WHERE status = 'TO_CALLBACK'),
    'no_answer',      COUNT(*) FILTER (WHERE status = 'NO_ANSWER'),
    'not_interested', COUNT(*) FILTER (WHERE status = 'NOT_INTERESTED'),
    'qualified',      COUNT(*) FILTER (WHERE status = 'QUALIFIED'),
    'signed',         COUNT(*) FILTER (WHERE status = 'SIGNED'),
    'lost',           COUNT(*) FILTER (WHERE status = 'LOST')
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

-- 5) get_global_closers_kpi (sans contacted)
CREATE OR REPLACE FUNCTION public.get_global_closers_kpi()
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'total',          COUNT(*)::bigint,
    'new',            COUNT(*) FILTER (WHERE status = 'NEW')::bigint,
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

-- 6) get_all_closers_kpi (TABLE sans colonne contacted)
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
    COUNT(l.id) FILTER (WHERE l.status = 'NEW')::bigint AS new,
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

-- 7) get_all_owners_lead_kpi (TABLE sans colonne contacted)
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
    COUNT(l.id) FILTER (WHERE l.status = 'NEW')::bigint AS new,
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

-- 8) get_lead_kpi_by_day (sans contacted, avec to_callback, no_answer, not_interested)
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
    COUNT(*) FILTER (WHERE status = 'NEW')::bigint AS new,
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

GRANT EXECUTE ON FUNCTION public.get_my_lead_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_closer_activity(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_global_closers_kpi() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_closers_kpi() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_owners_lead_kpi() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_lead_kpi_by_day(integer) TO authenticated;
