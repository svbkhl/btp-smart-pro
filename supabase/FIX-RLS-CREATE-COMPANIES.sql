-- =====================================================
-- 🔧 CORRECTION RLS POUR CRÉATION D'ENTREPRISES
-- =====================================================
-- Ce script corrige la RLS policy pour permettre aux admins système
-- de créer des entreprises sans avoir besoin d'être dans company_users
-- =====================================================

-- Supprimer l'ancienne policy
DROP POLICY IF EXISTS "Admins can manage all companies" ON public.companies;

-- Créer une nouvelle policy qui permet aux admins système de créer des entreprises
CREATE POLICY "Admins can manage all companies"
  ON public.companies FOR ALL
  USING (
    -- Pour SELECT/UPDATE/DELETE : vérifier si l'utilisateur est dans company_users OU est admin système
    EXISTS (
      SELECT 1 FROM public.company_users 
      WHERE company_id = companies.id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'administrateur'
    )
  )
  WITH CHECK (
    -- Pour INSERT : permettre uniquement aux admins système
    -- (car une nouvelle entreprise n'a pas encore de company_users)
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'administrateur'
    )
  );

-- Vérification
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'companies' 
AND policyname = 'Admins can manage all companies';

