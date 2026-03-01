-- Étendre admin_get_all_companies pour inclure les closers
-- (pas seulement les admins hardcodés)

CREATE OR REPLACE FUNCTION public.admin_get_all_companies()
RETURNS SETOF public.companies
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.companies
  WHERE
    -- Admins système (hardcodés)
    LOWER(COALESCE(auth.jwt() ->> 'email', '')) IN (
      'sabri.khalfallah6@gmail.com',
      'sabri.khalallah6@gmail.com',
      'khalfallahs.ndrc@gmail.com'
    )
    OR
    -- Closers enregistrés en base
    EXISTS (
      SELECT 1 FROM public.closer_emails
      WHERE LOWER(email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
    )
  ORDER BY created_at DESC;
$$;
