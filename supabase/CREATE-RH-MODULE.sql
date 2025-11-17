-- =====================================================
-- MODULE RH (RESSOURCES HUMAINES) - TABLES COMPLÈTES
-- =====================================================
-- Ce script crée toutes les tables nécessaires pour le module RH
-- =====================================================

-- =====================================================
-- 1. TABLE ÉQUIPES (TEAMS)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  team_leader_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all teams"
  ON public.teams
  FOR ALL
  USING (public.has_role(auth.uid(), 'dirigeant'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'dirigeant'::app_role));

-- =====================================================
-- 2. AMÉLIORATION TABLE EMPLOYEES (si elle existe déjà)
-- =====================================================
-- Ajouter des colonnes si elles n'existent pas
DO $$
BEGIN
  -- Ajouter colonne team_id si elle n'existe pas
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'employees' 
                 AND column_name = 'team_id') THEN
    ALTER TABLE public.employees ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;
  END IF;

  -- Ajouter colonne statut si elle n'existe pas
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'employees' 
                 AND column_name = 'statut') THEN
    ALTER TABLE public.employees ADD COLUMN statut TEXT DEFAULT 'actif' CHECK (statut IN ('actif', 'inactif', 'congé', 'suspension'));
  END IF;

  -- Ajouter colonne date_entree si elle n'existe pas
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'employees' 
                 AND column_name = 'date_entree') THEN
    ALTER TABLE public.employees ADD COLUMN date_entree DATE;
  END IF;

  -- Ajouter colonne date_fin_contrat si elle n'existe pas
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'employees' 
                 AND column_name = 'date_fin_contrat') THEN
    ALTER TABLE public.employees ADD COLUMN date_fin_contrat DATE;
  END IF;

  -- Ajouter colonne telephone si elle n'existe pas
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'employees' 
                 AND column_name = 'telephone') THEN
    ALTER TABLE public.employees ADD COLUMN telephone TEXT;
  END IF;

  -- Ajouter colonne adresse si elle n'existe pas
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'employees' 
                 AND column_name = 'adresse') THEN
    ALTER TABLE public.employees ADD COLUMN adresse TEXT;
  END IF;

  -- Ajouter colonne salaire_base si elle n'existe pas
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'employees' 
                 AND column_name = 'salaire_base') THEN
    ALTER TABLE public.employees ADD COLUMN salaire_base NUMERIC(10, 2);
  END IF;
END $$;

-- =====================================================
-- 3. TABLE CANDIDATURES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.candidatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  email TEXT NOT NULL,
  telephone TEXT,
  poste_souhaite TEXT NOT NULL,
  cv_url TEXT,
  lettre_motivation TEXT,
  statut TEXT DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'entretien', 'accepte', 'refuse', 'archive')),
  score_correspondance INTEGER DEFAULT 0 CHECK (score_correspondance >= 0 AND score_correspondance <= 100),
  notes_internes TEXT,
  date_candidature TIMESTAMP WITH TIME ZONE DEFAULT now(),
  date_entretien TIMESTAMP WITH TIME ZONE,
  recruteur_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.candidatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all candidatures"
  ON public.candidatures
  FOR ALL
  USING (public.has_role(auth.uid(), 'dirigeant'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'dirigeant'::app_role));

-- =====================================================
-- 4. TABLE TÂCHES RH
-- =====================================================
CREATE TABLE IF NOT EXISTS public.taches_rh (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titre TEXT NOT NULL,
  description TEXT,
  type_tache TEXT NOT NULL CHECK (type_tache IN ('validation', 'entretien', 'mise_a_jour', 'formation', 'autre')),
  priorite TEXT DEFAULT 'moyenne' CHECK (priorite IN ('basse', 'moyenne', 'haute', 'urgente')),
  statut TEXT DEFAULT 'en_cours' CHECK (statut IN ('en_cours', 'en_attente', 'termine', 'annule')),
  assigne_a UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  candidature_id UUID REFERENCES public.candidatures(id) ON DELETE CASCADE,
  date_echeance DATE,
  date_completion TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.taches_rh ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all taches_rh"
  ON public.taches_rh
  FOR ALL
  USING (public.has_role(auth.uid(), 'dirigeant'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'dirigeant'::app_role));

-- =====================================================
-- 5. TABLE PERFORMANCES EMPLOYÉS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.employee_performances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  periode_debut DATE NOT NULL,
  periode_fin DATE NOT NULL,
  taux_presence NUMERIC(5, 2) DEFAULT 0 CHECK (taux_presence >= 0 AND taux_presence <= 100),
  taux_ponctualite NUMERIC(5, 2) DEFAULT 0 CHECK (taux_ponctualite >= 0 AND taux_ponctualite <= 100),
  productivite_score INTEGER DEFAULT 0 CHECK (productivite_score >= 0 AND productivite_score <= 100),
  nombre_absences INTEGER DEFAULT 0,
  nombre_retards INTEGER DEFAULT 0,
  heures_travaillees NUMERIC(10, 2) DEFAULT 0,
  notes TEXT,
  evaluated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(employee_id, periode_debut, periode_fin)
);

ALTER TABLE public.employee_performances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all performances"
  ON public.employee_performances
  FOR ALL
  USING (public.has_role(auth.uid(), 'dirigeant'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'dirigeant'::app_role));

CREATE POLICY "Employees can view their own performance"
  ON public.employee_performances
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.employees WHERE id = employee_id AND user_id = auth.uid()));

-- =====================================================
-- 6. TABLE ACTIVITÉS RH (pour le feed d'activité)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.rh_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_activite TEXT NOT NULL CHECK (type_activite IN ('candidature', 'contrat', 'absence', 'formation', 'evaluation', 'tache', 'autre')),
  titre TEXT NOT NULL,
  description TEXT,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  candidature_id UUID REFERENCES public.candidatures(id) ON DELETE CASCADE,
  tache_id UUID REFERENCES public.taches_rh(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.rh_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all rh_activities"
  ON public.rh_activities
  FOR SELECT
  USING (public.has_role(auth.uid(), 'dirigeant'::app_role));

CREATE POLICY "Admins can insert rh_activities"
  ON public.rh_activities
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'dirigeant'::app_role));

-- =====================================================
-- 7. INDEXES POUR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_employees_team_id ON public.employees(team_id);
CREATE INDEX IF NOT EXISTS idx_employees_statut ON public.employees(statut);
CREATE INDEX IF NOT EXISTS idx_candidatures_statut ON public.candidatures(statut);
CREATE INDEX IF NOT EXISTS idx_candidatures_date ON public.candidatures(date_candidature);
CREATE INDEX IF NOT EXISTS idx_taches_rh_statut ON public.taches_rh(statut);
CREATE INDEX IF NOT EXISTS idx_taches_rh_assigne ON public.taches_rh(assigne_a);
CREATE INDEX IF NOT EXISTS idx_performances_employee ON public.employee_performances(employee_id);
CREATE INDEX IF NOT EXISTS idx_performances_periode ON public.employee_performances(periode_debut, periode_fin);
CREATE INDEX IF NOT EXISTS idx_rh_activities_date ON public.rh_activities(created_at DESC);

-- =====================================================
-- 8. TRIGGERS POUR MISE À JOUR AUTOMATIQUE
-- =====================================================

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger aux tables
DROP TRIGGER IF EXISTS update_teams_updated_at ON public.teams;
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_employees_updated_at ON public.employees;
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_candidatures_updated_at ON public.candidatures;
CREATE TRIGGER update_candidatures_updated_at
  BEFORE UPDATE ON public.candidatures
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_taches_rh_updated_at ON public.taches_rh;
CREATE TRIGGER update_taches_rh_updated_at
  BEFORE UPDATE ON public.taches_rh
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_performances_updated_at ON public.employee_performances;
CREATE TRIGGER update_performances_updated_at
  BEFORE UPDATE ON public.employee_performances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 9. FONCTIONS UTILITAIRES
-- =====================================================

-- Fonction pour calculer le taux de présence global
CREATE OR REPLACE FUNCTION get_taux_presence_global()
RETURNS NUMERIC AS $$
DECLARE
  total_employees INTEGER;
  employees_presents INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_employees
  FROM public.employees
  WHERE statut = 'actif';

  -- Calcul simplifié : on peut améliorer avec les données réelles
  SELECT COUNT(*) INTO employees_presents
  FROM public.employees
  WHERE statut = 'actif';

  IF total_employees = 0 THEN
    RETURN 0;
  END IF;

  RETURN (employees_presents::NUMERIC / total_employees::NUMERIC) * 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour créer une activité RH automatiquement
CREATE OR REPLACE FUNCTION create_rh_activity(
  p_type TEXT,
  p_titre TEXT,
  p_description TEXT,
  p_employee_id UUID DEFAULT NULL,
  p_candidature_id UUID DEFAULT NULL,
  p_tache_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  activity_id UUID;
BEGIN
  INSERT INTO public.rh_activities (
    type_activite,
    titre,
    description,
    employee_id,
    candidature_id,
    tache_id,
    created_by
  ) VALUES (
    p_type,
    p_titre,
    p_description,
    p_employee_id,
    p_candidature_id,
    p_tache_id,
    auth.uid()
  )
  RETURNING id INTO activity_id;

  RETURN activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FIN DU SCRIPT
-- =====================================================

-- Vérification
SELECT '✅ Tables RH créées avec succès !' AS message;

