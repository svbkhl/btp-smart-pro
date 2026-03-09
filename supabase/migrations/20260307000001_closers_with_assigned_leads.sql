-- Liste des closers (actuels ou anciens) qui ont au moins un lead assigné — pour la réassignation.
CREATE OR REPLACE FUNCTION public.get_closers_with_assigned_leads()
RETURNS TABLE (
  owner_email text,
  owner_name text,
  lead_count bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.email::text AS owner_email,
    COALESCE(
      NULLIF(TRIM(
        COALESCE(u.raw_user_meta_data->>'first_name', u.raw_user_meta_data->>'prenom', '') || ' ' ||
        COALESCE(u.raw_user_meta_data->>'nom', u.raw_user_meta_data->>'last_name', '')
      ), ''),
      u.raw_user_meta_data->>'full_name',
      split_part(u.email, '@', 1)
    )::text AS owner_name,
    COUNT(l.id)::bigint AS lead_count
  FROM public.leads l
  JOIN auth.users u ON u.id = l.owner_id
  WHERE l.owner_id IS NOT NULL
  GROUP BY u.id, u.email, u.raw_user_meta_data
  ORDER BY COUNT(l.id) DESC, u.email;
$$;

GRANT EXECUTE ON FUNCTION public.get_closers_with_assigned_leads() TO authenticated;
