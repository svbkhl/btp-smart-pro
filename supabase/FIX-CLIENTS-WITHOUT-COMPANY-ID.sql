-- =====================================================
-- CORRECTION : Clients sans company_id
-- =====================================================
-- Certains clients peuvent avoir été créés avant l'implémentation
-- de l'isolation multi-tenant et n'ont donc pas de company_id.
-- Ce script identifie et corrige ces clients.
-- =====================================================

-- 1. Identifier les clients sans company_id
SELECT 
  id,
  name,
  user_id,
  company_id,
  created_at,
  '⚠️ Client sans company_id' as statut
FROM public.clients
WHERE company_id IS NULL
ORDER BY created_at DESC;

-- 2. Tenter de rattacher les clients sans company_id à une entreprise
-- en utilisant le user_id du client
UPDATE public.clients
SET company_id = (
  SELECT cu.company_id
  FROM public.company_users cu
  WHERE cu.user_id = public.clients.user_id
  ORDER BY cu.created_at ASC
  LIMIT 1
)
WHERE company_id IS NULL
AND EXISTS (
  SELECT 1
  FROM public.company_users cu
  WHERE cu.user_id = public.clients.user_id
);

-- 3. Afficher combien de clients ont été corrigés
SELECT 
  COUNT(*) as clients_corriges
FROM public.clients
WHERE company_id IS NOT NULL;

-- 4. Supprimer les clients qui ne peuvent pas être rattachés à une entreprise
-- (sécurité : ces clients ne doivent pas exister sans company_id)
DELETE FROM public.clients
WHERE company_id IS NULL;

-- 5. Vérifier qu'il n'y a plus de clients sans company_id
SELECT 
  COUNT(*) as clients_sans_company_id_restants
FROM public.clients
WHERE company_id IS NULL;
