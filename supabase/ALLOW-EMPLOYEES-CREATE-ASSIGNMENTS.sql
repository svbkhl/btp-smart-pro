-- =====================================================
-- PERMETTRE AUX EMPLOYÉS DE CRÉER LEURS PROPRES AFFECTATIONS
-- =====================================================
-- Ce script ajoute une politique RLS qui permet aux employés
-- de créer leurs propres affectations dans employee_assignments
-- =====================================================

-- Ajouter la politique pour permettre aux employés de créer leurs propres affectations
DROP POLICY IF EXISTS "Employees can create their own assignments" ON public.employee_assignments;
CREATE POLICY "Employees can create their own assignments"
ON public.employee_assignments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE employees.id = employee_assignments.employee_id
    AND employees.user_id = auth.uid()
  )
);

-- Permettre également aux employés de supprimer leurs propres affectations
DROP POLICY IF EXISTS "Employees can delete their own assignments" ON public.employee_assignments;
CREATE POLICY "Employees can delete their own assignments"
ON public.employee_assignments FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE employees.id = employee_assignments.employee_id
    AND employees.user_id = auth.uid()
  )
);

-- Vérification
SELECT 
  '✅ Politiques ajoutées' as status,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'employee_assignments'
  AND policyname IN ('Employees can create their own assignments', 'Employees can delete their own assignments');
