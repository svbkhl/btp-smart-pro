-- Script simple pour supprimer toutes les factures
-- ⚠️ ATTENTION: Cette action est IRRÉVERSIBLE

-- Supprimer les paiements liés aux factures
DELETE FROM public.payments WHERE invoice_id IS NOT NULL;

-- Supprimer toutes les factures
-- Les invoice_lines seront supprimées automatiquement grâce à ON DELETE CASCADE
DELETE FROM public.invoices;

-- Afficher le résultat
SELECT 
  (SELECT COUNT(*) FROM public.invoices) as factures_restantes,
  (SELECT COUNT(*) FROM public.invoice_lines) as lignes_restantes,
  (SELECT COUNT(*) FROM public.payments WHERE invoice_id IS NOT NULL) as paiements_lies_restants;
