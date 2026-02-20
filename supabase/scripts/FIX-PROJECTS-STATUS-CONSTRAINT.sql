-- ============================================================================
-- FIX : Contrainte projects_status_check
-- ============================================================================
-- Erreur : new row for relation "projects" violates check constraint "projects_status_check"
-- À exécuter dans Supabase SQL Editor si la migration ne suffit pas
-- ============================================================================

ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_status_check;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_status_check
  CHECK (status IN ('planifié', 'en_attente', 'en_cours', 'terminé', 'annulé'));

ALTER TABLE public.projects
  ALTER COLUMN status SET DEFAULT 'planifié';

-- Vérification
SELECT 'Contrainte projects_status_check mise à jour' AS resultat;
