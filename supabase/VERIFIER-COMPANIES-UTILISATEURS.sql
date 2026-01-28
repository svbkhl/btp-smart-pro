-- =====================================================
-- VÉRIFICATION : Companies et utilisateurs
-- =====================================================
-- Ce script vérifie si plusieurs utilisateurs partagent
-- le même company_id, ce qui expliquerait le problème
-- =====================================================

-- 1. Lister tous les company_id et compter les utilisateurs par entreprise
SELECT 
  'Utilisateurs par entreprise' as info,
  company_id,
  COUNT(DISTINCT user_id) as nombre_utilisateurs,
  STRING_AGG(DISTINCT user_id::TEXT, ', ') as user_ids
FROM public.company_users
GROUP BY company_id
ORDER BY nombre_utilisateurs DESC;

-- 2. Vérifier si des utilisateurs sont membres de plusieurs entreprises
SELECT 
  'Utilisateurs membres de plusieurs entreprises' as info,
  user_id,
  COUNT(DISTINCT company_id) as nombre_entreprises,
  STRING_AGG(DISTINCT company_id::TEXT, ', ') as company_ids
FROM public.company_users
GROUP BY user_id
HAVING COUNT(DISTINCT company_id) > 1;

-- 3. Lister toutes les entreprises
SELECT 
  'Liste des entreprises' as info,
  id as company_id,
  name as company_name,
  created_at
FROM public.companies
ORDER BY created_at DESC;

-- 4. Vérifier les clients et leurs company_id
SELECT 
  'Clients et leurs entreprises' as info,
  c.id as client_id,
  c.name as client_name,
  c.company_id,
  comp.name as company_name
FROM public.clients c
LEFT JOIN public.companies comp ON comp.id = c.company_id
ORDER BY c.created_at DESC
LIMIT 20;
