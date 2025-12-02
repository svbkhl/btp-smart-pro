-- =====================================================
-- AJOUT DES COLONNES heure_debut et heure_fin
-- =====================================================
-- Ce script ajoute les colonnes pour les horaires de début et fin
-- dans la table employee_assignments
-- =====================================================

-- Ajouter les colonnes si elles n'existent pas
ALTER TABLE public.employee_assignments 
ADD COLUMN IF NOT EXISTS heure_debut TIME,
ADD COLUMN IF NOT EXISTS heure_fin TIME;

-- Commentaires pour documentation
COMMENT ON COLUMN public.employee_assignments.heure_debut IS 'Heure de début de travail (format HH:mm)';
COMMENT ON COLUMN public.employee_assignments.heure_fin IS 'Heure de fin de travail (format HH:mm)';

-- Vérification
SELECT 
  '✅ Colonnes ajoutées' as status,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'employee_assignments'
  AND column_name IN ('heure_debut', 'heure_fin');

