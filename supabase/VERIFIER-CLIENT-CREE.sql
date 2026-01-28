-- =====================================================
-- VÉRIFICATION : Client créé avec company_id
-- =====================================================
-- Ce script vérifie que les clients récemment créés
-- ont bien un company_id défini
-- =====================================================

-- 1. Lister les 10 derniers clients créés avec leur company_id
SELECT 
  'Derniers clients créés' as info,
  id,
  name,
  company_id,
  user_id,
  created_at,
  CASE 
    WHEN company_id IS NULL THEN '❌ MANQUANT'
    ELSE '✅ OK'
  END as company_id_status
FROM public.clients
ORDER BY created_at DESC
LIMIT 10;

-- 2. Compter les clients sans company_id
SELECT 
  'Clients sans company_id' as info,
  COUNT(*) as total_sans_company_id
FROM public.clients
WHERE company_id IS NULL;

-- 3. Vérifier que les triggers force_company_id existent
SELECT 
  'Triggers force_company_id sur clients' as info,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'clients'
  AND trigger_name LIKE '%force_company_id%';

-- 4. Vérifier la fonction force_company_id
SELECT 
  'Fonction force_company_id' as info,
  proname,
  prosrc as function_source
FROM pg_proc
WHERE proname = 'force_company_id';

-- 5. Vérifier la fonction current_company_id
SELECT 
  'Fonction current_company_id' as info,
  proname,
  prosrc as function_source
FROM pg_proc
WHERE proname = 'current_company_id';

-- 6. Lister les clients par entreprise (derniers 10)
SELECT 
  'Clients par entreprise (10 derniers)' as info,
  c.id,
  c.name,
  c.company_id,
  comp.name as company_name,
  c.created_at
FROM public.clients c
LEFT JOIN public.companies comp ON comp.id = c.company_id
ORDER BY c.created_at DESC
LIMIT 10;
