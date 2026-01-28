-- =====================================================
-- VÉRIFICATION : Client spécifique après suppression
-- =====================================================
-- Utilisez ce script pour vérifier un client spécifique
-- REMPLACEZ 'CLIENT_ID_HERE' par l'ID du client testé
-- =====================================================

-- 1. Vérifier un client spécifique par ID
-- REMPLACEZ 'CLIENT_ID_HERE' par l'ID réel du client
SELECT 
  'Client spécifique' as info,
  id,
  name,
  company_id,
  user_id,
  created_at,
  updated_at
FROM public.clients
WHERE id = 'CLIENT_ID_HERE';  -- ⚠️ REMPLACEZ PAR L'ID RÉEL

-- 2. Vérifier TOUS les clients avec cet ID (devrait être 0 ou 1)
-- REMPLACEZ 'CLIENT_ID_HERE' par l'ID réel du client
SELECT 
  'Tous les clients avec cet ID' as info,
  COUNT(*) as total_count
FROM public.clients
WHERE id = 'CLIENT_ID_HERE';  -- ⚠️ REMPLACEZ PAR L'ID RÉEL

-- 3. Vérifier les clients avec le même nom (pour voir s'il y a confusion)
-- REMPLACEZ 'NOM_CLIENT_HERE' par le nom du client testé
SELECT 
  'Clients avec le même nom' as info,
  id,
  name,
  company_id,
  user_id
FROM public.clients
WHERE name = 'NOM_CLIENT_HERE'  -- ⚠️ REMPLACEZ PAR LE NOM RÉEL
ORDER BY created_at DESC;
