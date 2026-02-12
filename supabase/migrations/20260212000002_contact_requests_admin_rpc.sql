-- =====================================================
-- RPC pour les admins : récupérer contact_requests (contourne RLS)
-- SECURITY DEFINER = exécuté avec les droits du créateur
-- Permet à l'admin (par email) de voir les demandes même si RLS bloque
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_contact_requests_admin()
RETURNS SETOF public.contact_requests
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.contact_requests
  WHERE LOWER(COALESCE(auth.jwt() ->> 'email', '')) IN (
    'sabri.khalfallah6@gmail.com',
    'sabri.khalallah6@gmail.com'
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role::text IN ('administrateur', 'admin', 'dirigeant')
  )
  ORDER BY created_at DESC;
$$;

-- RPC pour update (admin uniquement)
CREATE OR REPLACE FUNCTION public.update_contact_request_admin(
  p_id uuid,
  p_updates jsonb
)
RETURNS public.contact_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.contact_requests;
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

  UPDATE public.contact_requests
  SET
    status = CASE WHEN p_updates ? 'status' THEN (p_updates->>'status')::text ELSE status END,
    admin_notes = CASE WHEN p_updates ? 'admin_notes' THEN (p_updates->>'admin_notes')::text ELSE admin_notes END,
    invited_by = CASE WHEN p_updates ? 'invited_by' AND p_updates->>'invited_by' IS NOT NULL AND (p_updates->>'invited_by') != '' THEN (p_updates->>'invited_by')::uuid ELSE invited_by END,
    invitation_id = CASE WHEN p_updates ? 'invitation_id' AND p_updates->>'invitation_id' IS NOT NULL AND (p_updates->>'invitation_id') != '' THEN (p_updates->>'invitation_id')::uuid ELSE invitation_id END,
    updated_at = now()
  WHERE id = p_id
  RETURNING * INTO v_row;

  IF v_row IS NULL THEN
    RAISE EXCEPTION 'Contact request not found: %', p_id;
  END IF;

  RETURN v_row;
END;
$$;

-- RPC pour supprimer des demandes (admin uniquement)
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

GRANT EXECUTE ON FUNCTION public.get_contact_requests_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_contact_request_admin(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_contact_requests_admin(uuid[]) TO authenticated;
