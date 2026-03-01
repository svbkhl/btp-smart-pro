-- Closers voient uniquement les entreprises qu'ils ont créées (owner_id = leur uid)
-- Les admins voient toujours toutes les entreprises

CREATE OR REPLACE FUNCTION public.admin_get_all_companies()
RETURNS SETOF public.companies
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.companies
  WHERE
    -- Admins système : voient TOUTES les entreprises
    LOWER(COALESCE(auth.jwt() ->> 'email', '')) IN (
      'sabri.khalfallah6@gmail.com',
      'sabri.khalallah6@gmail.com',
      'khalfallahs.ndrc@gmail.com'
    )
    OR
    -- Closers : uniquement leurs entreprises créées (owner_id = leur user_id)
    (
      EXISTS (
        SELECT 1 FROM public.closer_emails
        WHERE LOWER(email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
      )
      AND owner_id = auth.uid()
    )
  ORDER BY created_at DESC;
$$;
