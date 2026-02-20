-- Fix: projects_status_check - assure que le statut accepte les valeurs françaises
-- Erreur: new row for relation "projects" violates check constraint "projects_status_check"

-- Supprimer toute contrainte CHECK existante sur status
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_status_check;

-- Recréer avec les valeurs françaises attendues par l'app
ALTER TABLE public.projects
  ADD CONSTRAINT projects_status_check
  CHECK (status IN ('planifié', 'en_attente', 'en_cours', 'terminé', 'annulé'));

-- S'assurer que la valeur par défaut est correcte
ALTER TABLE public.projects
  ALTER COLUMN status SET DEFAULT 'planifié';
