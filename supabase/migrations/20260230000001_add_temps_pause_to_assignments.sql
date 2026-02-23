-- Ajouter temps de pause (en minutes) aux affectations
ALTER TABLE public.employee_assignments
ADD COLUMN IF NOT EXISTS temps_pause INTEGER DEFAULT 60 CHECK (temps_pause >= 0 AND temps_pause <= 480);

COMMENT ON COLUMN public.employee_assignments.temps_pause IS 'Temps de pause en minutes (ex: 60 = 1h). Utilisé pour calculer les heures travaillées.';
