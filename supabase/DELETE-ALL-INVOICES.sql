-- =====================================================
-- SCRIPT : SUPPRIMER TOUTES LES FACTURES
-- =====================================================
-- Ce script supprime toutes les factures et leurs
-- lignes associées de la base de données
-- =====================================================

BEGIN;

-- 1. Supprimer toutes les lignes de facture (invoice_lines)
-- (nécessaire avant de supprimer les factures à cause des contraintes FK)
DELETE FROM public.invoice_lines;
RAISE NOTICE '✅ Toutes les lignes de facture (invoice_lines) supprimées';

-- 2. Supprimer toutes les factures
DELETE FROM public.invoices;
RAISE NOTICE '✅ Toutes les factures supprimées';

-- 3. (Optionnel) Réinitialiser les séquences si nécessaire
-- SELECT setval('invoices_id_seq', 1, false); -- Si vous utilisez des séquences

COMMIT;

RAISE NOTICE '🎉 Suppression terminée avec succès';
