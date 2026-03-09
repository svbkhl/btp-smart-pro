-- KPI de tous les closers en une requête (pour l'admin : vue 1 par 1)
CREATE OR REPLACE FUNCTION public.get_all_closers_kpi()
RETURNS TABLE (
  closer_id uuid,
  closer_email text,
  closer_name text,
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
    COUNT(l.id) FILTER (WHERE l.status = 'CONTACTED')::bigint AS contacted,
    COUNT(l.id) FILTER (WHERE l.status = 'QUALIFIED')::bigint AS qualified,
    COUNT(l.id) FILTER (WHERE l.status = 'SIGNED')::bigint AS signed,
    COUNT(l.id) FILTER (WHERE l.status = 'LOST')::bigint AS lost
  FROM public.closer_emails ce
  JOIN auth.users u ON LOWER(u.email) = LOWER(ce.email)
  LEFT JOIN public.leads l ON l.owner_id = u.id
  GROUP BY u.id, u.email, u.raw_user_meta_data
  ORDER BY COUNT(l.id) DESC, u.email;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_closers_kpi() TO authenticated;
