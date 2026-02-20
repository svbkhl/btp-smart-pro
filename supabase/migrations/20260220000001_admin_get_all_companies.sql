-- =====================================================
-- RPC pour les admins : récupérer TOUTES les entreprises (contourne RLS)
-- SECURITY DEFINER = exécuté avec les droits du créateur
-- Permet aux admins système de voir la liste des entreprises
-- =====================================================

CREATE OR REPLACE FUNCTION public.admin_get_all_companies()
RETURNS SETOF public.companies
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.companies
  WHERE LOWER(COALESCE(auth.jwt() ->> 'email', '')) IN (
    'sabri.khalfallah6@gmail.com',
    'sabri.khalallah6@gmail.com',
    'khalfallahs.ndrc@gmail.com'
  )
  ORDER BY created_at DESC;
$$;

COMMENT ON FUNCTION public.admin_get_all_companies() IS
  'Retourne toutes les entreprises pour les admins système. Contourne RLS. Emails admin hardcodés (synchroniser avec config/admin.ts).';
