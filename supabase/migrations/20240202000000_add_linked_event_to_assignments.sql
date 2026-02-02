-- Migration: Ajouter la colonne linked_event_id à employee_assignments
-- Cette colonne permet de lier une affectation de chantier à un événement du calendrier
-- pour une synchronisation automatique bidirectionnelle

-- Ajouter la colonne linked_event_id si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employee_assignments' 
    AND column_name = 'linked_event_id'
  ) THEN
    ALTER TABLE employee_assignments 
    ADD COLUMN linked_event_id UUID REFERENCES events(id) ON DELETE SET NULL;
    
    -- Ajouter un index pour améliorer les performances des requêtes
    CREATE INDEX IF NOT EXISTS idx_employee_assignments_linked_event 
    ON employee_assignments(linked_event_id);
    
    -- Ajouter un commentaire pour documenter la colonne
    COMMENT ON COLUMN employee_assignments.linked_event_id IS 
    'ID de l''événement lié dans le calendrier. Permet la synchronisation automatique entre les affectations de chantier et les événements du calendrier.';
    
    RAISE NOTICE 'Colonne linked_event_id ajoutée avec succès à employee_assignments';
  ELSE
    RAISE NOTICE 'La colonne linked_event_id existe déjà dans employee_assignments';
  END IF;
END $$;

-- Note: Lors de la synchronisation:
-- - Quand une affectation est créée -> un événement est créé automatiquement
-- - Quand une affectation est modifiée -> l'événement lié est mis à jour
-- - Quand une affectation est supprimée -> l'événement lié est supprimé
-- - Si l'événement est supprimé manuellement -> linked_event_id est mis à NULL (ON DELETE SET NULL)
