-- =====================================================
-- FIX: Ajouter 'signed' et 'paid' aux contraintes CHECK
-- =====================================================
-- Les contraintes CHECK bloquent les statuts 'signed' et 'paid'
-- qui sont nécessaires pour le flow de signature et paiement
-- =====================================================

-- 1️⃣ Supprimer la contrainte existante sur ai_quotes
DO $$
BEGIN
  -- Trouver et supprimer la contrainte CHECK sur status
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'ai_quotes'
    AND column_name = 'status'
    AND constraint_name LIKE '%status%check%'
  ) THEN
    -- Récupérer le nom exact de la contrainte
    DECLARE
      constraint_name_var TEXT;
    BEGIN
      SELECT constraint_name INTO constraint_name_var
      FROM information_schema.table_constraints
      WHERE table_name = 'ai_quotes'
      AND constraint_type = 'CHECK'
      AND constraint_name LIKE '%status%';
      
      IF constraint_name_var IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.ai_quotes DROP CONSTRAINT IF EXISTS ' || constraint_name_var;
        RAISE NOTICE '✅ Contrainte % supprimée', constraint_name_var;
      END IF;
    END;
  END IF;
END $$;

-- 2️⃣ Recréer la contrainte avec les nouveaux statuts
ALTER TABLE public.ai_quotes
ADD CONSTRAINT ai_quotes_status_check 
CHECK (status IN ('draft', 'sent', 'signed', 'accepted', 'rejected', 'paid', 'cancelled'));

DO $$
BEGIN
  RAISE NOTICE '✅ Contrainte ai_quotes_status_check recréée avec signed et paid';
END $$;

-- 3️⃣ Faire la même chose pour quotes si elle existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'quotes'
  ) THEN
    -- Supprimer l'ancienne contrainte
    DECLARE
      constraint_name_var TEXT;
    BEGIN
      SELECT constraint_name INTO constraint_name_var
      FROM information_schema.table_constraints
      WHERE table_name = 'quotes'
      AND constraint_type = 'CHECK'
      AND constraint_name LIKE '%status%';
      
      IF constraint_name_var IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.quotes DROP CONSTRAINT IF EXISTS ' || constraint_name_var;
        RAISE NOTICE '✅ Contrainte % supprimée de quotes', constraint_name_var;
      END IF;
    END;
    
    -- Recréer avec les nouveaux statuts
    ALTER TABLE public.quotes
    ADD CONSTRAINT quotes_status_check 
    CHECK (status IN ('draft', 'sent', 'signed', 'accepted', 'rejected', 'paid', 'cancelled'));
    
    RAISE NOTICE '✅ Contrainte quotes_status_check recréée';
  END IF;
END $$;

-- 4️⃣ Commentaires pour documentation
COMMENT ON COLUMN public.ai_quotes.status IS 'Statut du devis: draft, sent, signed (après signature), accepted, rejected, paid (après paiement), cancelled';

-- Message de succès
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ CONTRAINTES STATUS MISES À JOUR';
  RAISE NOTICE 'Statuts autorisés: draft, sent, signed, accepted, rejected, paid, cancelled';
  RAISE NOTICE '========================================';
END $$;

