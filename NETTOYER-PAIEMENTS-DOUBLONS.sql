-- =====================================================
-- NETTOYER LES PAIEMENTS EN ATTENTE EN DOUBLE
-- =====================================================
-- Script pour supprimer les paiements en attente dupliqués
-- Ne garde que le plus récent par devis

-- 1️⃣ Voir les paiements en attente dupliqués
SELECT 
  '📊 PAIEMENTS EN ATTENTE DUPLIQUÉS' as info,
  quote_id,
  COUNT(*) as nombre_duplicatas,
  STRING_AGG(id::text, ', ') as payment_ids,
  MAX(created_at) as dernier_paiement
FROM payments
WHERE status = 'pending'
  AND quote_id IS NOT NULL
GROUP BY quote_id
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- 2️⃣ Supprimer les doublons (garder le plus récent)
WITH ranked_payments AS (
  SELECT 
    id,
    quote_id,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY quote_id 
      ORDER BY created_at DESC
    ) as rn
  FROM payments
  WHERE status = 'pending'
    AND quote_id IS NOT NULL
)
DELETE FROM payments
WHERE id IN (
  SELECT id 
  FROM ranked_payments 
  WHERE rn > 1  -- Supprimer tous sauf le plus récent
);

-- 3️⃣ Vérifier le résultat
SELECT 
  '✅ APRÈS NETTOYAGE' as info,
  quote_id,
  COUNT(*) as nombre_paiements,
  STRING_AGG(id::text, ', ') as payment_ids
FROM payments
WHERE status = 'pending'
  AND quote_id IS NOT NULL
GROUP BY quote_id
ORDER BY quote_id;

-- 4️⃣ Statistiques finales
SELECT 
  '📊 STATISTIQUES' as info,
  COUNT(DISTINCT quote_id) as devis_uniques,
  COUNT(*) as total_paiements_pending,
  SUM(amount) as montant_total_pending
FROM payments
WHERE status = 'pending'
  AND quote_id IS NOT NULL;
