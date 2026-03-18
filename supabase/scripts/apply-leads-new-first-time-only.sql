-- À exécuter dans Supabase Dashboard > SQL Editor
-- Migration : Leads "Nouveaux" = première fois seulement (first_seen_at)

-- 1) Colonne first_seen_at
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS first_seen_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_leads_first_seen_at ON public.leads(first_seen_at) WHERE first_seen_at IS NULL;

-- 2) Trigger
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

-- 3) get_my_lead_stats
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
    COUNT(*) FILTER (WHERE first_seen_at IS NULL),
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

-- 4) get_closer_activity
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
    'new',            COUNT(*) FILTER (WHERE first_seen_at IS NULL),
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
  ) sub;

  RETURN json_build_object('stats', v_stats, 'by_dept', COALESCE(v_by_dept, '[]'::json));
END;
$$;
