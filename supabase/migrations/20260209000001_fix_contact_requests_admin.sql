-- =====================================================
-- FIX : Formulaire de contact et Demandes de contact
-- - Permettre aux visiteurs (anon) d'appeler create_contact_request
-- - Permettre à sabri.khalfallah6@gmail.com (admin) de voir/mettre à jour les demandes
-- =====================================================

-- 1. GRANT EXECUTE : les visiteurs non connectés peuvent créer une demande
-- (La fonction create_contact_request doit exister - exécuter create_contact_requests_system.sql si besoin)
GRANT EXECUTE ON FUNCTION public.create_contact_request(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO anon;
GRANT EXECUTE ON FUNCTION public.create_contact_request(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;

-- 2. RLS contact_requests : ajouter policy pour admin système (sabri.khalfallah6@gmail.com)
-- Drop les anciennes policies et recréer avec support admin email

DROP POLICY IF EXISTS "Admins can view all contact requests" ON public.contact_requests;
CREATE POLICY "Admins can view all contact requests"
  ON public.contact_requests FOR SELECT
  USING (
    -- Admin système par email
    (SELECT email FROM auth.users WHERE id = auth.uid())::text ILIKE 'sabri.khalfallah6@gmail.com'
    OR
    -- Admin via user_roles (administrateur ou admin)
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (ur.role::text IN ('administrateur', 'admin', 'dirigeant'))
    )
  );

DROP POLICY IF EXISTS "Admins can update contact requests" ON public.contact_requests;
CREATE POLICY "Admins can update contact requests"
  ON public.contact_requests FOR UPDATE
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid())::text ILIKE 'sabri.khalfallah6@gmail.com'
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (ur.role::text IN ('administrateur', 'admin', 'dirigeant'))
    )
  );
