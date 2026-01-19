-- Script pour supprimer toutes les factures
-- ⚠️ ATTENTION: Cette action est IRRÉVERSIBLE
-- Toutes les factures, leurs lignes (invoice_lines) et les paiements associés seront supprimés

DO $$
DECLARE
  invoice_count INTEGER;
  invoice_line_count INTEGER;
  payment_count INTEGER;
  deleted_invoices INTEGER;
  deleted_lines INTEGER;
  deleted_payments INTEGER;
BEGIN
  -- Afficher l'état avant suppression
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
  
  -- 1. Supprimer les paiements liés aux factures (avant de supprimer les factures)
  DELETE FROM public.payments WHERE invoice_id IS NOT NULL;
  GET DIAGNOSTICS deleted_payments = ROW_COUNT;
  RAISE NOTICE '✅ % paiements liés supprimés', deleted_payments;
  
  -- 2. Supprimer toutes les factures
  -- Les invoice_lines seront supprimées automatiquement grâce à ON DELETE CASCADE
  DELETE FROM public.invoices;
  GET DIAGNOSTICS deleted_invoices = ROW_COUNT;
  RAISE NOTICE '✅ % factures supprimées', deleted_invoices;
  
  -- Vérifier que les invoice_lines ont été supprimées (grâce à CASCADE)
  SELECT COUNT(*) INTO invoice_line_count FROM public.invoice_lines;
  
  -- Afficher le résumé final
  SELECT COUNT(*) INTO invoice_count FROM public.invoices;
  SELECT COUNT(*) INTO payment_count FROM public.payments WHERE invoice_id IS NOT NULL;
  
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ SUPPRESSION TERMINÉE';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '📊 ÉTAT FINAL:';
  RAISE NOTICE '   Factures restantes: %', invoice_count;
  RAISE NOTICE '   Lignes de facture restantes: %', invoice_line_count;
  RAISE NOTICE '   Paiements liés restants: %', payment_count;
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  
  IF invoice_count = 0 THEN
    RAISE NOTICE '✅ Toutes les factures ont été supprimées avec succès!';
  ELSE
    RAISE WARNING '⚠️  Il reste % facture(s)', invoice_count;
  END IF;
END $$;
