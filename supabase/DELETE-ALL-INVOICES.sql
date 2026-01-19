-- =====================================================
-- SCRIPT : SUPPRIMER TOUTES LES FACTURES
-- =====================================================
-- Ce script supprime toutes les factures et leurs
-- lignes associées de la base de données
-- =====================================================

DO $$
DECLARE
  v_lines_count INTEGER;
  v_invoices_count INTEGER;
BEGIN
  -- 1. Supprimer toutes les lignes de facture (invoice_lines)
  -- (nécessaire avant de supprimer les factures à cause des contraintes FK)
  DELETE FROM public.invoice_lines;
  GET DIAGNOSTICS v_lines_count = ROW_COUNT;
  RAISE NOTICE '✅ % lignes de facture (invoice_lines) supprimées', v_lines_count;

  -- 2. Supprimer toutes les factures
  DELETE FROM public.invoices;
  GET DIAGNOSTICS v_invoices_count = ROW_COUNT;
  RAISE NOTICE '✅ % factures supprimées', v_invoices_count;

  RAISE NOTICE '🎉 Suppression terminée avec succès';
END $$;
