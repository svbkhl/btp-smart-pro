-- Exécuter dans Supabase SQL Editor pour activer la suppression des demandes de contact
-- (Si la migration 20260212000002 n'a pas été appliquée)

CREATE OR REPLACE FUNCTION public.delete_contact_requests_admin(p_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted integer;
BEGIN
  IF NOT (
    LOWER(COALESCE(auth.jwt() ->> 'email', '')) IN ('sabri.khalfallah6@gmail.com', 'sabri.khalallah6@gmail.com')
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role::text IN ('administrateur', 'admin', 'dirigeant')
    )
  ) THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  DELETE FROM public.contact_requests
  WHERE id = ANY(p_ids);

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_contact_requests_admin(uuid[]) TO authenticated;
