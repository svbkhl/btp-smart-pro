-- Script sécurisé pour supprimer toutes les factures (avec confirmation)
-- ⚠️ ATTENTION: Cette action est IRRÉVERSIBLE

-- Cette fonction nécessite une confirmation explicite
-- Pour exécuter, décommentez les lignes ci-dessous après vérification

DO $$
DECLARE
  invoice_count INTEGER;
  invoice_line_count INTEGER;
  payment_count INTEGER;
  deleted_invoices INTEGER;
  deleted_lines INTEGER;
  deleted_payments INTEGER;
BEGIN
  -- Compter les éléments à supprimer
  SELECT COUNT(*) INTO invoice_count FROM public.invoices;
  SELECT COUNT(*) INTO invoice_line_count FROM public.invoice_lines;
  SELECT COUNT(*) INTO payment_count FROM public.payments WHERE invoice_id IS NOT NULL;
  
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '⚠️  SUPPRESSION DE TOUTES LES FACTURES';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '📊 ÉLÉMENTS À SUPPRIMER:';
  RAISE NOTICE '   Factures: %', invoice_count;
  RAISE NOTICE '   Lignes de facture: %', invoice_line_count;
  RAISE NOTICE '   Paiements liés: %', payment_count;
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  
  -- ⚠️ DÉCOMMENTEZ LES LIGNES CI-DESSOUS POUR EXÉCUTER LA SUPPRESSION
  -- ⚠️ UNCOMMENT THE LINES BELOW TO EXECUTE THE DELETION
  
  -- Supprimer les lignes de facture
  -- DELETE FROM public.invoice_lines;
  -- GET DIAGNOSTICS deleted_lines = ROW_COUNT;
  
  -- Supprimer les paiements liés aux factures
  -- DELETE FROM public.payments WHERE invoice_id IS NOT NULL;
  -- GET DIAGNOSTICS deleted_payments = ROW_COUNT;
  
  -- Supprimer toutes les factures
  -- DELETE FROM public.invoices;
  -- GET DIAGNOSTICS deleted_invoices = ROW_COUNT;
  
  -- RAISE NOTICE '✅ Suppression terminée:';
  -- RAISE NOTICE '   Factures supprimées: %', deleted_invoices;
  -- RAISE NOTICE '   Lignes supprimées: %', deleted_lines;
  -- RAISE NOTICE '   Paiements supprimés: %', deleted_payments;
  
  RAISE NOTICE 'ℹ️  Pour exécuter la suppression, décommentez les lignes dans le script';
END $$;
