-- =====================================================
-- PERMETTRE AUX UTILISATEURS DE CRÉER LEUR PROPRE ENREGISTREMENT EMPLOYEE
-- =====================================================
-- Ce script ajoute une politique RLS qui permet aux utilisateurs
-- de créer leur propre enregistrement dans la table employees
-- =====================================================

-- Ajouter la politique pour permettre aux utilisateurs de créer leur propre enregistrement employee
DROP POLICY IF EXISTS "Users can create their own employee record" ON public.employees;
CREATE POLICY "Users can create their own employee record"
ON public.employees FOR INSERT
WITH CHECK (
  auth.uid() = user_id
);

-- Permettre également aux dirigeants de créer des enregistrements employees
DROP POLICY IF EXISTS "Dirigeants can create employee records" ON public.employees;
CREATE POLICY "Dirigeants can create employee records"
ON public.employees FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'dirigeant'::app_role)
  OR public.has_role(auth.uid(), 'administrateur'::app_role)
);

-- Vérification
SELECT 
  '✅ Politiques ajoutées' as status,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'employees'
  AND policyname IN ('Users can create their own employee record', 'Dirigeants can create employee records');
