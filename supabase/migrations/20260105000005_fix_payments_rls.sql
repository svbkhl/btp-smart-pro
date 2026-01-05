-- ============================================================================
-- FIX: RLS Policies pour la table payments (isolation par company_id)
-- Description: Empêcher le mélange de données entre entreprises sur les paiements
-- Date: 2026-01-05
-- ============================================================================

-- ============================================================================
-- 1) VÉRIFIER SI LA COLONNE company_id EXISTE DANS payments
-- ============================================================================

-- Ajouter company_id si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'payments' 
    AND column_name = 'company_id'
  ) THEN
    -- Ajouter la colonne company_id
    ALTER TABLE public.payments
    ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    
    RAISE NOTICE '✅ Colonne company_id ajoutée à payments';
  ELSE
    RAISE NOTICE 'ℹ️  Colonne company_id existe déjà dans payments';
  END IF;
END $$;

-- ============================================================================
-- 2) MIGRER LES DONNÉES EXISTANTES (associer payments aux companies)
-- ============================================================================

-- Méthode 1: Via quote_id (si le payment est lié à un devis)
UPDATE public.payments p
SET company_id = q.company_id
FROM public.quotes q
WHERE p.quote_id = q.id
AND p.company_id IS NULL;

-- Méthode 2: Via invoice_id (si le payment est lié à une facture)
UPDATE public.payments p
SET company_id = i.company_id
FROM public.invoices i
WHERE p.invoice_id = i.id
AND p.company_id IS NULL;

-- Méthode 3: Via user_id (si le payment a un user_id créateur)
UPDATE public.payments p
SET company_id = cu.company_id
FROM public.company_users cu
WHERE p.user_id = cu.user_id
AND p.company_id IS NULL
LIMIT 1;

-- ============================================================================
-- 3) RENDRE company_id OBLIGATOIRE (après migration)
-- ============================================================================

DO $$
DECLARE
  null_payments INTEGER;
BEGIN
  -- Vérifier s'il reste des payments sans company_id
  SELECT COUNT(*) INTO null_payments
  FROM public.payments
  WHERE company_id IS NULL;
  
  IF null_payments > 0 THEN
    RAISE WARNING '⚠️  Il reste % paiement(s) sans company_id. Vérifiez manuellement avant de rendre la colonne NOT NULL.', null_payments;
  ELSE
    -- Rendre la colonne NOT NULL
    ALTER TABLE public.payments
    ALTER COLUMN company_id SET NOT NULL;
    
    RAISE NOTICE '✅ Colonne company_id rendue obligatoire';
  END IF;
END $$;

-- ============================================================================
-- 4) CRÉER UN INDEX SUR company_id
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_payments_company_id ON public.payments(company_id);

COMMENT ON COLUMN public.payments.company_id IS 'Référence à l''entreprise propriétaire du paiement';

-- ============================================================================
-- 5) ACTIVER RLS SUR payments
-- ============================================================================

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6) SUPPRIMER LES ANCIENNES POLICIES (si elles existent)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view payments of their company" ON public.payments;
DROP POLICY IF EXISTS "Users can insert payments for their company" ON public.payments;
DROP POLICY IF EXISTS "Users can update payments of their company" ON public.payments;
DROP POLICY IF EXISTS "Users can delete payments of their company" ON public.payments;

-- ============================================================================
-- 7) CRÉER LES NOUVELLES RLS POLICIES STRICTES
-- ============================================================================

-- SELECT: Utilisateurs de la même entreprise
CREATE POLICY "Users can view payments of their company"
ON public.payments FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT company_id 
    FROM public.company_users 
    WHERE user_id = auth.uid()
  )
);

-- INSERT: Utilisateurs de la même entreprise
CREATE POLICY "Users can insert payments for their company"
ON public.payments FOR INSERT
TO authenticated
WITH CHECK (
  company_id IN (
    SELECT company_id 
    FROM public.company_users 
    WHERE user_id = auth.uid()
  )
);

-- UPDATE: Utilisateurs de la même entreprise
CREATE POLICY "Users can update payments of their company"
ON public.payments FOR UPDATE
TO authenticated
USING (
  company_id IN (
    SELECT company_id 
    FROM public.company_users 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  company_id IN (
    SELECT company_id 
    FROM public.company_users 
    WHERE user_id = auth.uid()
  )
);

-- DELETE: Seulement OWNER
CREATE POLICY "Only owners can delete payments"
ON public.payments FOR DELETE
TO authenticated
USING (
  company_id IN (
    SELECT cu.company_id
    FROM public.company_users cu
    JOIN public.roles r ON r.id = cu.role_id
    WHERE cu.user_id = auth.uid()
    AND r.slug = 'owner'
  )
);

-- ============================================================================
-- 8) VÉRIFICATION
-- ============================================================================

DO $$
DECLARE
  policy_count INTEGER;
  total_payments INTEGER;
  payments_with_company INTEGER;
BEGIN
  -- Compter les policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'payments';
  
  -- Compter les payments
  SELECT COUNT(*) INTO total_payments FROM public.payments;
  SELECT COUNT(*) INTO payments_with_company FROM public.payments WHERE company_id IS NOT NULL;
  
  RAISE NOTICE '✅ % policies RLS créées pour payments', policy_count;
  RAISE NOTICE '✅ % / % paiements ont un company_id', payments_with_company, total_payments;
END $$;

-- ============================================================================
-- FIN DE LA MIGRATION
-- ============================================================================
