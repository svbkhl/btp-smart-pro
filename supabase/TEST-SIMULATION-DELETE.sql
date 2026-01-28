-- =====================================================
-- SIMULATION : Test de suppression avec RLS
-- =====================================================
-- Ce script simule une suppression pour tester si
-- les RLS policies fonctionnent correctement
-- =====================================================
-- 
-- IMPORTANT: Ce script doit être exécuté en tant que
-- un utilisateur authentifié pour tester correctement
-- les RLS policies
--

-- Étapes pour tester:
-- 1. Connectez-vous en tant qu'utilisateur A (entreprise 1)
-- 2. Notez l'ID d'un client de votre entreprise
-- 3. Exécutez ce script avec l'ID du client
-- 4. Vérifiez ce qui se passe

-- Pour tester, remplacez 'CLIENT_ID_A_TESTER' par l'ID réel d'un client
\set client_id 'CLIENT_ID_A_TESTER'

-- 1. Vérifier le company_id actuel (selon la fonction current_company_id)
SELECT 
  'Company ID actuel (current_company_id())' as info,
  public.current_company_id() as current_company_id;

-- 2. Vérifier tous les company_id de l'utilisateur connecté
SELECT 
  'Companies de l''utilisateur connecté' as info,
  cu.company_id,
  cu.status,
  cu.created_at
FROM public.company_users cu
WHERE cu.user_id = auth.uid()
ORDER BY cu.created_at;

-- 3. Vérifier si le client existe et son company_id
SELECT 
  'Client à supprimer' as info,
  id,
  name,
  company_id,
  created_at
FROM public.clients
WHERE id = :'client_id';

-- 4. Compter combien de clients avec cet ID existent (toutes entreprises)
SELECT 
  'Clients avec cet ID (toutes entreprises)' as info,
  COUNT(*) as total_count,
  STRING_AGG(DISTINCT company_id::TEXT, ', ') as company_ids
FROM public.clients
WHERE id = :'client_id';

-- 5. Vérifier ce que la RLS policy DELETE permet
-- Cette requête simule ce que Supabase va faire lors d'un DELETE
SELECT 
  'Clients visibles pour DELETE (selon RLS)' as info,
  id,
  name,
  company_id,
  -- Vérifier la condition RLS
  company_id IS NOT NULL as has_company_id,
  company_id = public.current_company_id() as matches_current_company,
  EXISTS (
    SELECT 1 
    FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
    AND cu.company_id = clients.company_id
  ) as user_is_member
FROM public.clients
WHERE id = :'client_id';

-- 6. Si vous voulez vraiment tester la suppression (ATTENTION: supprime réellement!)
-- Décommentez seulement si vous voulez tester:
/*
BEGIN;
  -- Simuler la suppression
  DELETE FROM public.clients
  WHERE id = :'client_id'
    AND company_id = public.current_company_id();
  
  -- Vérifier combien de lignes ont été affectées
  GET DIAGNOSTICS row_count = ROW_COUNT;
  
  RAISE NOTICE 'Nombre de lignes supprimées: %', row_count;
  
  -- Si vous voulez annuler, décommentez:
  -- ROLLBACK;
  
  -- Si vous voulez confirmer, décommentez:
  -- COMMIT;
END;
*/

-- 7. Vérifier si le client existe encore après (si vous avez testé la suppression)
SELECT 
  'Client après suppression (devrait être vide si supprimé)' as info,
  id,
  name,
  company_id
FROM public.clients
WHERE id = :'client_id';
