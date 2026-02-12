-- =====================================================
-- FIX : contact_requests - Admin via JWT (éviter auth.users)
-- auth.users n'est pas accessible par authenticated → "permission denied for table users"
-- Utiliser auth.jwt() ->> 'email' à la place
-- =====================================================

DROP POLICY IF EXISTS "Admins can view all contact requests" ON public.contact_requests;
CREATE POLICY "Admins can view all contact requests"
  ON public.contact_requests FOR SELECT
  USING (
    -- Admin système par email (via JWT, pas auth.users)
    LOWER(COALESCE(auth.jwt() ->> 'email', '')) IN ('sabri.khalfallah6@gmail.com', 'sabri.khalallah6@gmail.com')
    OR
    -- Admin via user_roles
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
    LOWER(COALESCE(auth.jwt() ->> 'email', '')) IN ('sabri.khalfallah6@gmail.com', 'sabri.khalallah6@gmail.com')
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (ur.role::text IN ('administrateur', 'admin', 'dirigeant'))
    )
  );
