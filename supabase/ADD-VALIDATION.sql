-- ============================================
-- VALIDATION CÔTÉ SERVEUR - Améliorations
-- ============================================
-- Ce script ajoute des validations supplémentaires
-- pour améliorer la sécurité et la cohérence des données
--
-- INSTRUCTIONS :
-- 1. Ouvrez Supabase Dashboard > SQL Editor
-- 2. Copiez TOUT le contenu de ce fichier
-- 3. Collez dans l'éditeur SQL
-- 4. Cliquez sur "Run"
-- ============================================

-- ============================================
-- FONCTION : Validation de l'email
-- ============================================
CREATE OR REPLACE FUNCTION public.validate_email(email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF email IS NULL OR email = '' THEN
    RETURN TRUE; -- Email optionnel
  END IF;
  
  -- Vérifier le format de l'email
  RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- FONCTION : Validation du téléphone
-- ============================================
CREATE OR REPLACE FUNCTION public.validate_phone(phone TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF phone IS NULL OR phone = '' THEN
    RETURN TRUE; -- Téléphone optionnel
  END IF;
  
  -- Vérifier le format du téléphone (supporte les formats français et internationaux)
  RETURN phone ~ '^[+]?[0-9\s\-\(\)]{8,20}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- FONCTION : Validation des dates de projet
-- ============================================
CREATE OR REPLACE FUNCTION public.validate_project_dates(
  start_date DATE,
  end_date DATE
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Si les deux dates sont définies, la date de fin doit être après la date de début
  IF start_date IS NOT NULL AND end_date IS NOT NULL THEN
    RETURN end_date >= start_date;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- TRIGGER : Validation avant INSERT/UPDATE sur clients
-- ============================================
CREATE OR REPLACE FUNCTION public.validate_client()
RETURNS TRIGGER AS $$
BEGIN
  -- Valider l'email
  IF NOT public.validate_email(NEW.email) THEN
    RAISE EXCEPTION 'Email invalide: %', NEW.email;
  END IF;
  
  -- Valider le téléphone
  IF NOT public.validate_phone(NEW.phone) THEN
    RAISE EXCEPTION 'Téléphone invalide: %', NEW.phone;
  END IF;
  
  -- Valider que le nom n'est pas vide
  IF NEW.name IS NULL OR TRIM(NEW.name) = '' THEN
    RAISE EXCEPTION 'Le nom du client est requis';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger
DROP TRIGGER IF EXISTS validate_client_trigger ON public.clients;
CREATE TRIGGER validate_client_trigger
BEFORE INSERT OR UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.validate_client();

-- ============================================
-- TRIGGER : Validation avant INSERT/UPDATE sur projects
-- ============================================
CREATE OR REPLACE FUNCTION public.validate_project()
RETURNS TRIGGER AS $$
BEGIN
  -- Valider que le nom n'est pas vide
  IF NEW.name IS NULL OR TRIM(NEW.name) = '' THEN
    RAISE EXCEPTION 'Le nom du projet est requis';
  END IF;
  
  -- Valider la progression (déjà fait avec CHECK, mais on le rappelle)
  IF NEW.progress < 0 OR NEW.progress > 100 THEN
    RAISE EXCEPTION 'La progression doit être entre 0 et 100';
  END IF;
  
  -- Valider les dates
  IF NOT public.validate_project_dates(NEW.start_date, NEW.end_date) THEN
    RAISE EXCEPTION 'La date de fin doit être après la date de début';
  END IF;
  
  -- Valider que le budget est positif
  IF NEW.budget IS NOT NULL AND NEW.budget < 0 THEN
    RAISE EXCEPTION 'Le budget doit être positif';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger
DROP TRIGGER IF EXISTS validate_project_trigger ON public.projects;
CREATE TRIGGER validate_project_trigger
BEFORE INSERT OR UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.validate_project();

-- ============================================
-- TRIGGER : Validation avant INSERT/UPDATE sur user_settings
-- ============================================
CREATE OR REPLACE FUNCTION public.validate_user_settings()
RETURNS TRIGGER AS $$
BEGIN
  -- Valider l'email
  IF NEW.email IS NOT NULL AND NEW.email != '' THEN
    IF NOT public.validate_email(NEW.email) THEN
      RAISE EXCEPTION 'Email invalide: %', NEW.email;
    END IF;
  END IF;
  
  -- Valider le téléphone
  IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
    IF NOT public.validate_phone(NEW.phone) THEN
      RAISE EXCEPTION 'Téléphone invalide: %', NEW.phone;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger
DROP TRIGGER IF EXISTS validate_user_settings_trigger ON public.user_settings;
CREATE TRIGGER validate_user_settings_trigger
BEFORE INSERT OR UPDATE ON public.user_settings
FOR EACH ROW
EXECUTE FUNCTION public.validate_user_settings();

-- ============================================
-- CONTRAINTES SUPPLÉMENTAIRES
-- ============================================

-- Ajouter une contrainte pour s'assurer que les budgets sont positifs
ALTER TABLE public.projects
DROP CONSTRAINT IF EXISTS projects_budget_positive;

ALTER TABLE public.projects
ADD CONSTRAINT projects_budget_positive
CHECK (budget IS NULL OR budget >= 0);

-- Ajouter une contrainte pour s'assurer que les totaux sont positifs
ALTER TABLE public.clients
DROP CONSTRAINT IF EXISTS clients_total_spent_positive;

ALTER TABLE public.clients
ADD CONSTRAINT clients_total_spent_positive
CHECK (total_spent IS NULL OR total_spent >= 0);

-- Ajouter une contrainte pour les statistiques
ALTER TABLE public.user_stats
DROP CONSTRAINT IF EXISTS user_stats_positive;

ALTER TABLE public.user_stats
ADD CONSTRAINT user_stats_positive
CHECK (
  total_projects >= 0 AND
  total_clients >= 0 AND
  total_revenue >= 0 AND
  active_projects >= 0 AND
  completed_projects >= 0
);

-- ============================================
-- INDEXES SUPPLÉMENTAIRES pour les performances
-- ============================================

-- Index sur les dates de projet pour les requêtes de filtrage
CREATE INDEX IF NOT EXISTS idx_projects_start_date ON public.projects(start_date);
CREATE INDEX IF NOT EXISTS idx_projects_end_date ON public.projects(end_date);
CREATE INDEX IF NOT EXISTS idx_projects_budget ON public.projects(budget) WHERE budget IS NOT NULL;

-- Index sur l'email des clients pour les recherches
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients(email) WHERE email IS NOT NULL;

-- ============================================
-- VÉRIFICATION
-- ============================================

-- Vérifier que les triggers existent
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name LIKE 'validate%';

-- Vérifier que les contraintes existent
SELECT constraint_name, table_name
FROM information_schema.table_constraints
WHERE constraint_schema = 'public'
AND constraint_name LIKE '%positive%'
OR constraint_name LIKE '%validate%';

-- ============================================
-- FIN DE LA VALIDATION
-- ============================================

