-- ============================================
-- VÉRIFICATION RAPIDE DU PROBLÈME D'ISOLATION
-- ============================================
-- Ce script identifie rapidement les problèmes d'isolation
-- ============================================

-- 1. VÉRIFIER LES CLIENTS PAR ENTREPRISE
SELECT 
  '📊 Clients par entreprise' as check_type,
  company_id,
  COUNT(*) as client_count,
  STRING_AGG(name, ', ' ORDER BY created_at DESC) FILTER (WHERE name IS NOT NULL) as recent_clients
FROM public.clients
WHERE company_id IS NOT NULL
GROUP BY company_id
ORDER BY client_count DESC;

-- 2. ⚠️ CLIENTS SANS company_id (PROBLÈME CRITIQUE)
SELECT 
  '❌ PROBLÈME: Clients sans company_id' as check_type,
  id,
  name,
  user_id,
  created_at
FROM public.clients
WHERE company_id IS NULL
ORDER BY created_at DESC
LIMIT 10;

-- 3. ⚠️ CLIENTS AVEC LE MÊME ID DANS PLUSIEURS ENTREPRISES (PROBLÈME CRITIQUE)
SELECT 
  '❌ PROBLÈME: Doublons (même ID, entreprises différentes)' as check_type,
  id,
  COUNT(DISTINCT company_id) as company_count,
  STRING_AGG(DISTINCT company_id::TEXT, ', ') as company_ids,
  STRING_AGG(DISTINCT name, ' | ') as names
FROM public.clients
GROUP BY id
HAVING COUNT(DISTINCT company_id) > 1;

-- 4. VÉRIFIER LES CLIENTS RÉCENTS (derniers 5)
SELECT 
  '📋 Clients récents' as check_type,
  id,
  name,
  company_id,
  user_id,
  created_at
FROM public.clients
ORDER BY created_at DESC
LIMIT 5;

-- 5. VÉRIFIER LES POLICIES RLS
SELECT 
  '🔒 Policies RLS' as check_type,
  policyname,
  cmd as operation,
  CASE 
    WHEN qual LIKE '%company_id%' OR qual LIKE '%current_company_id%' THEN '✅ Filtre company_id'
    WHEN with_check LIKE '%company_id%' OR with_check LIKE '%current_company_id%' THEN '✅ Filtre company_id'
    ELSE '❌ Pas de filtre company_id'
  END as has_company_filter
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'clients'
ORDER BY cmd;

-- 6. VÉRIFIER LE TRIGGER
SELECT 
  '⚙️ Trigger' as check_type,
  tgname as trigger_name,
  CASE 
    WHEN tgenabled = 'O' THEN '✅ Actif'
    ELSE '❌ Inactif'
  END as status
FROM pg_trigger
WHERE tgrelid = 'public.clients'::regclass
  AND tgname = 'force_company_id';

-- 7. RÉSUMÉ
SELECT 
  '📊 RÉSUMÉ' as section,
  (SELECT COUNT(*) FROM public.clients) as total_clients,
  (SELECT COUNT(DISTINCT company_id) FROM public.clients WHERE company_id IS NOT NULL) as companies_with_clients,
  (SELECT COUNT(*) FROM public.clients WHERE company_id IS NULL) as clients_without_company_id,
  (SELECT COUNT(*) FROM (
    SELECT id FROM public.clients GROUP BY id HAVING COUNT(DISTINCT company_id) > 1
  ) sub) as duplicate_clients,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_class 
      WHERE relname = 'clients' 
      AND relnamespace = 'public'::regnamespace
      AND (relforcerowsecurity OR relrowsecurity)
    ) THEN '✅ RLS Activé'
    ELSE '❌ RLS Désactivé'
  END as rls_status;
