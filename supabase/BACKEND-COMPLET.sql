-- ============================================
-- BACKEND COMPLET - TOUTES LES TABLES
-- ============================================
-- Ce script crée TOUTES les tables nécessaires pour l'application
-- Exécutez-le dans Supabase Dashboard > SQL Editor
-- ============================================

-- ============================================
-- 1. TABLE: profiles
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nom TEXT,
  prenom TEXT,
  email TEXT,
  phone TEXT,
  role TEXT DEFAULT 'salarie' CHECK (role IN ('dirigeant', 'salarie', 'administrateur')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- 2. TABLE: user_roles
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  role TEXT NOT NULL DEFAULT 'salarie' CHECK (role IN ('dirigeant', 'salarie', 'administrateur')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- 3. TABLE: clients
-- ============================================
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  location TEXT,
  avatar_url TEXT,
  status TEXT DEFAULT 'actif' CHECK (status IN ('actif', 'terminé', 'planifié', 'VIP')),
  total_spent NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- 4. TABLE: projects
-- ============================================
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'planifié' CHECK (status IN ('planifié', 'en_attente', 'en_cours', 'terminé', 'annulé')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  budget NUMERIC,
  costs NUMERIC DEFAULT 0,
  benefice NUMERIC,
  location TEXT,
  start_date DATE,
  end_date DATE,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ajouter les colonnes manquantes si la table existe déjà
DO $$ 
BEGIN
  -- costs
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'costs'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN costs NUMERIC DEFAULT 0;
  END IF;
  
  -- benefice
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'benefice'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN benefice NUMERIC;
  END IF;
END $$;

-- ============================================
-- 5. TABLE: user_stats
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  total_projects INTEGER DEFAULT 0,
  total_clients INTEGER DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0,
  total_profit NUMERIC DEFAULT 0,
  active_projects INTEGER DEFAULT 0,
  completed_projects INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ajouter les colonnes manquantes si la table existe déjà
DO $$ 
BEGIN
  -- total_profit
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'user_stats' AND column_name = 'total_profit'
  ) THEN
    ALTER TABLE public.user_stats ADD COLUMN total_profit NUMERIC DEFAULT 0;
  END IF;
END $$;

-- ============================================
-- 6. TABLE: user_settings
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  company_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'France',
  siret TEXT,
  vat_number TEXT,
  legal_form TEXT,
  company_logo_url TEXT,
  terms_and_conditions TEXT,
  signature_data TEXT,
  signature_name TEXT,
  notifications_enabled BOOLEAN DEFAULT true,
  reminder_enabled BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ajouter les colonnes manquantes si la table existe déjà
DO $$ 
BEGIN
  -- city
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'user_settings' AND column_name = 'city'
  ) THEN
    ALTER TABLE public.user_settings ADD COLUMN city TEXT;
  END IF;
  
  -- postal_code
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'user_settings' AND column_name = 'postal_code'
  ) THEN
    ALTER TABLE public.user_settings ADD COLUMN postal_code TEXT;
  END IF;
  
  -- country
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'user_settings' AND column_name = 'country'
  ) THEN
    ALTER TABLE public.user_settings ADD COLUMN country TEXT DEFAULT 'France';
  END IF;
  
  -- siret
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'user_settings' AND column_name = 'siret'
  ) THEN
    ALTER TABLE public.user_settings ADD COLUMN siret TEXT;
  END IF;
  
  -- vat_number
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'user_settings' AND column_name = 'vat_number'
  ) THEN
    ALTER TABLE public.user_settings ADD COLUMN vat_number TEXT;
  END IF;
  
  -- legal_form
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'user_settings' AND column_name = 'legal_form'
  ) THEN
    ALTER TABLE public.user_settings ADD COLUMN legal_form TEXT;
  END IF;
  
  -- company_logo_url
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'user_settings' AND column_name = 'company_logo_url'
  ) THEN
    ALTER TABLE public.user_settings ADD COLUMN company_logo_url TEXT;
  END IF;
  
  -- terms_and_conditions
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'user_settings' AND column_name = 'terms_and_conditions'
  ) THEN
    ALTER TABLE public.user_settings ADD COLUMN terms_and_conditions TEXT;
  END IF;
  
  -- signature_data
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'user_settings' AND column_name = 'signature_data'
  ) THEN
    ALTER TABLE public.user_settings ADD COLUMN signature_data TEXT;
  END IF;
  
  -- signature_name
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'user_settings' AND column_name = 'signature_name'
  ) THEN
    ALTER TABLE public.user_settings ADD COLUMN signature_name TEXT;
  END IF;
END $$;

-- ============================================
-- 7. TABLE: events
-- ============================================
CREATE TABLE IF NOT EXISTS public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  all_day BOOLEAN DEFAULT false,
  location TEXT,
  type TEXT DEFAULT 'meeting' CHECK (type IN ('meeting', 'task', 'deadline', 'reminder', 'other')),
  color TEXT DEFAULT '#3b82f6',
  reminder_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- 8. TABLE: employees
-- ============================================
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  nom TEXT NOT NULL,
  prenom TEXT,
  email TEXT,
  poste TEXT NOT NULL,
  specialites TEXT[],
  statut TEXT DEFAULT 'actif' CHECK (statut IN ('actif', 'inactif', 'congé', 'suspension')),
  team_id UUID,
  date_entree DATE,
  date_fin_contrat DATE,
  telephone TEXT,
  adresse TEXT,
  salaire_base NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ajouter les colonnes manquantes si la table existe déjà
DO $$ 
BEGIN
  -- statut
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'statut'
  ) THEN
    ALTER TABLE public.employees ADD COLUMN statut TEXT DEFAULT 'actif' CHECK (statut IN ('actif', 'inactif', 'congé', 'suspension'));
  END IF;
  
  -- team_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'team_id'
  ) THEN
    ALTER TABLE public.employees ADD COLUMN team_id UUID;
  END IF;
  
  -- date_entree
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'date_entree'
  ) THEN
    ALTER TABLE public.employees ADD COLUMN date_entree DATE;
  END IF;
  
  -- date_fin_contrat
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'date_fin_contrat'
  ) THEN
    ALTER TABLE public.employees ADD COLUMN date_fin_contrat DATE;
  END IF;
  
  -- telephone
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'telephone'
  ) THEN
    ALTER TABLE public.employees ADD COLUMN telephone TEXT;
  END IF;
  
  -- adresse
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'adresse'
  ) THEN
    ALTER TABLE public.employees ADD COLUMN adresse TEXT;
  END IF;
  
  -- salaire_base
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'salaire_base'
  ) THEN
    ALTER TABLE public.employees ADD COLUMN salaire_base NUMERIC;
  END IF;
  
  -- email
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'email'
  ) THEN
    ALTER TABLE public.employees ADD COLUMN email TEXT;
  END IF;
END $$;

-- ============================================
-- 9. TABLE: employee_assignments
-- ============================================
CREATE TABLE IF NOT EXISTS public.employee_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  jour TEXT NOT NULL CHECK (jour IN ('lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche')),
  heures NUMERIC DEFAULT 0 CHECK (heures >= 0 AND heures <= 24),
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, project_id, jour, date)
);

-- ============================================
-- 10. TABLE: ai_quotes
-- ============================================
CREATE TABLE IF NOT EXISTS public.ai_quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name TEXT,
  surface NUMERIC,
  work_type TEXT,
  materials TEXT[],
  image_urls TEXT[],
  estimated_cost NUMERIC,
  details JSONB,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'signed', 'accepted', 'rejected')),
  signature_data TEXT,
  signed_at TIMESTAMP WITH TIME ZONE,
  signed_by TEXT,
  quote_number TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ajouter les colonnes manquantes si la table existe déjà
DO $$ 
BEGIN
  -- Ajouter quote_number si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_quotes' 
    AND column_name = 'quote_number'
  ) THEN
    ALTER TABLE public.ai_quotes ADD COLUMN quote_number TEXT UNIQUE;
  END IF;
  
  -- Ajouter signature_data si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_quotes' 
    AND column_name = 'signature_data'
  ) THEN
    ALTER TABLE public.ai_quotes ADD COLUMN signature_data TEXT;
  END IF;
  
  -- Ajouter signed_at si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_quotes' 
    AND column_name = 'signed_at'
  ) THEN
    ALTER TABLE public.ai_quotes ADD COLUMN signed_at TIMESTAMP WITH TIME ZONE;
  END IF;
  
  -- Ajouter signed_by si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_quotes' 
    AND column_name = 'signed_by'
  ) THEN
    ALTER TABLE public.ai_quotes ADD COLUMN signed_by TEXT;
  END IF;
END $$;

-- ============================================
-- 11. TABLE: notifications
-- ============================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  read BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ajouter les colonnes manquantes si la table existe déjà
DO $$ 
BEGIN
  -- read
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'read'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN read BOOLEAN DEFAULT false;
  END IF;
  
  -- link
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'link'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN link TEXT;
  END IF;
END $$;

-- ============================================
-- 12. TABLE: candidatures
-- ============================================
CREATE TABLE IF NOT EXISTS public.candidatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  email TEXT NOT NULL,
  telephone TEXT,
  poste_souhaite TEXT NOT NULL,
  cv_url TEXT,
  lettre_motivation TEXT,
  statut TEXT DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'entretien', 'accepte', 'refuse', 'archive')),
  score_correspondance INTEGER DEFAULT 0,
  notes_internes TEXT,
  date_candidature DATE NOT NULL DEFAULT CURRENT_DATE,
  date_entretien DATE,
  recruteur_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- 13. TABLE: taches_rh
-- ============================================
CREATE TABLE IF NOT EXISTS public.taches_rh (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titre TEXT NOT NULL,
  description TEXT,
  type_tache TEXT DEFAULT 'autre' CHECK (type_tache IN ('validation', 'entretien', 'mise_a_jour', 'formation', 'autre')),
  priorite TEXT DEFAULT 'moyenne' CHECK (priorite IN ('basse', 'moyenne', 'haute', 'urgente')),
  statut TEXT DEFAULT 'en_attente' CHECK (statut IN ('en_cours', 'en_attente', 'termine', 'annule')),
  assigne_a UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  candidature_id UUID REFERENCES public.candidatures(id) ON DELETE SET NULL,
  date_echeance DATE,
  date_completion TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- 14. TABLE: rh_activities
-- ============================================
CREATE TABLE IF NOT EXISTS public.rh_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type_activite TEXT NOT NULL CHECK (type_activite IN ('candidature', 'contrat', 'absence', 'formation', 'evaluation', 'tache', 'autre')),
  titre TEXT NOT NULL,
  description TEXT,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  candidature_id UUID REFERENCES public.candidatures(id) ON DELETE SET NULL,
  tache_id UUID REFERENCES public.taches_rh(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- 15. TABLE: employee_performances
-- ============================================
CREATE TABLE IF NOT EXISTS public.employee_performances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  periode_debut DATE NOT NULL,
  periode_fin DATE NOT NULL,
  taux_presence NUMERIC DEFAULT 0,
  taux_ponctualite NUMERIC DEFAULT 0,
  productivite_score NUMERIC DEFAULT 0,
  nombre_absences INTEGER DEFAULT 0,
  nombre_retards INTEGER DEFAULT 0,
  heures_travaillees NUMERIC DEFAULT 0,
  notes TEXT,
  evaluated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- 16. TABLE: maintenance_reminders
-- ============================================
CREATE TABLE IF NOT EXISTS public.maintenance_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  equipment_type TEXT NOT NULL,
  installation_date DATE,
  last_maintenance DATE,
  next_maintenance DATE NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'overdue')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- 17. TABLE: image_analysis
-- ============================================
CREATE TABLE IF NOT EXISTS public.image_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  analysis_result JSONB,
  defects_detected TEXT[],
  estimated_repair_cost NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- 18. TABLE: ai_conversations
-- ============================================
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  context JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- 19. TABLE: email_queue
-- ============================================
CREATE TABLE IF NOT EXISTS public.email_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- INDEXES POUR PERFORMANCE
-- ============================================

-- Indexes pour clients
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(status);

-- Indexes pour projects
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON public.projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);

-- Indexes pour events
CREATE INDEX IF NOT EXISTS idx_events_user_id ON public.events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_project_id ON public.events(project_id);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON public.events(start_date);

-- Indexes pour employees
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON public.employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_statut ON public.employees(statut);

-- Indexes pour employee_assignments
CREATE INDEX IF NOT EXISTS idx_employee_assignments_employee_id ON public.employee_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_assignments_project_id ON public.employee_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_employee_assignments_date ON public.employee_assignments(date);

-- Indexes pour ai_quotes
CREATE INDEX IF NOT EXISTS idx_ai_quotes_user_id ON public.ai_quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_quotes_status ON public.ai_quotes(status);
CREATE INDEX IF NOT EXISTS idx_ai_quotes_quote_number ON public.ai_quotes(quote_number);

-- Indexes pour notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Indexes pour candidatures
CREATE INDEX IF NOT EXISTS idx_candidatures_statut ON public.candidatures(statut);
CREATE INDEX IF NOT EXISTS idx_candidatures_date_candidature ON public.candidatures(date_candidature DESC);

-- Indexes pour taches_rh
CREATE INDEX IF NOT EXISTS idx_taches_rh_statut ON public.taches_rh(statut);
CREATE INDEX IF NOT EXISTS idx_taches_rh_employee_id ON public.taches_rh(employee_id);
CREATE INDEX IF NOT EXISTS idx_taches_rh_assigne_a ON public.taches_rh(assigne_a);

-- Indexes pour rh_activities
CREATE INDEX IF NOT EXISTS idx_rh_activities_created_at ON public.rh_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rh_activities_employee_id ON public.rh_activities(employee_id);

-- Indexes pour email_queue
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON public.email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_created_at ON public.email_queue(created_at);

-- ============================================
-- TRIGGERS POUR UPDATED_AT
-- ============================================

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger à toutes les tables avec updated_at
-- Supprimer les triggers existants avant de les recréer (pour éviter les erreurs)
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_user_roles_updated_at ON public.user_roles;
DROP TRIGGER IF EXISTS update_clients_updated_at ON public.clients;
DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
DROP TRIGGER IF EXISTS update_user_stats_updated_at ON public.user_stats;
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON public.user_settings;
DROP TRIGGER IF EXISTS update_events_updated_at ON public.events;
DROP TRIGGER IF EXISTS update_employees_updated_at ON public.employees;
DROP TRIGGER IF EXISTS update_employee_assignments_updated_at ON public.employee_assignments;
DROP TRIGGER IF EXISTS update_ai_quotes_updated_at ON public.ai_quotes;
DROP TRIGGER IF EXISTS update_candidatures_updated_at ON public.candidatures;
DROP TRIGGER IF EXISTS update_taches_rh_updated_at ON public.taches_rh;
DROP TRIGGER IF EXISTS update_employee_performances_updated_at ON public.employee_performances;
DROP TRIGGER IF EXISTS update_maintenance_reminders_updated_at ON public.maintenance_reminders;

-- Créer les triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_stats_updated_at BEFORE UPDATE ON public.user_stats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employee_assignments_updated_at BEFORE UPDATE ON public.employee_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_quotes_updated_at BEFORE UPDATE ON public.ai_quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_candidatures_updated_at BEFORE UPDATE ON public.candidatures FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_taches_rh_updated_at BEFORE UPDATE ON public.taches_rh FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employee_performances_updated_at BEFORE UPDATE ON public.employee_performances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_maintenance_reminders_updated_at BEFORE UPDATE ON public.maintenance_reminders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Activer RLS sur toutes les tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taches_rh ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_performances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.image_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLITIQUES RLS - PROFILES
-- ============================================

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- POLITIQUES RLS - USER_ROLES
-- ============================================

DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
CREATE POLICY "Users can view their own role"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'administrateur'
  )
);

-- ============================================
-- POLITIQUES RLS - CLIENTS
-- ============================================

DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
CREATE POLICY "Users can view their own clients"
ON public.clients FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own clients" ON public.clients;
CREATE POLICY "Users can insert their own clients"
ON public.clients FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own clients" ON public.clients;
CREATE POLICY "Users can update their own clients"
ON public.clients FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own clients" ON public.clients;
CREATE POLICY "Users can delete their own clients"
ON public.clients FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- POLITIQUES RLS - PROJECTS
-- ============================================

DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
CREATE POLICY "Users can view their own projects"
ON public.projects FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own projects" ON public.projects;
CREATE POLICY "Users can insert their own projects"
ON public.projects FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
CREATE POLICY "Users can update their own projects"
ON public.projects FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;
CREATE POLICY "Users can delete their own projects"
ON public.projects FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- POLITIQUES RLS - USER_STATS
-- ============================================

DROP POLICY IF EXISTS "Users can view their own stats" ON public.user_stats;
CREATE POLICY "Users can view their own stats"
ON public.user_stats FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own stats" ON public.user_stats;
CREATE POLICY "Users can update their own stats"
ON public.user_stats FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own stats" ON public.user_stats;
CREATE POLICY "Users can insert their own stats"
ON public.user_stats FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- POLITIQUES RLS - USER_SETTINGS
-- ============================================

DROP POLICY IF EXISTS "Users can view their own settings" ON public.user_settings;
CREATE POLICY "Users can view their own settings"
ON public.user_settings FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;
CREATE POLICY "Users can update their own settings"
ON public.user_settings FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own settings" ON public.user_settings;
CREATE POLICY "Users can insert their own settings"
ON public.user_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- POLITIQUES RLS - EVENTS
-- ============================================

DROP POLICY IF EXISTS "Users can view their own events" ON public.events;
CREATE POLICY "Users can view their own events"
ON public.events FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own events" ON public.events;
CREATE POLICY "Users can insert their own events"
ON public.events FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own events" ON public.events;
CREATE POLICY "Users can update their own events"
ON public.events FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own events" ON public.events;
CREATE POLICY "Users can delete their own events"
ON public.events FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- POLITIQUES RLS - EMPLOYEES
-- ============================================

DROP POLICY IF EXISTS "Admins can view all employees" ON public.employees;
CREATE POLICY "Admins can view all employees"
ON public.employees FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('administrateur', 'dirigeant')
  )
);

DROP POLICY IF EXISTS "Employees can view their own record" ON public.employees;
CREATE POLICY "Employees can view their own record"
ON public.employees FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can insert employees" ON public.employees;
CREATE POLICY "Admins can insert employees"
ON public.employees FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('administrateur', 'dirigeant')
  )
);

DROP POLICY IF EXISTS "Admins can update employees" ON public.employees;
CREATE POLICY "Admins can update employees"
ON public.employees FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('administrateur', 'dirigeant')
  )
);

DROP POLICY IF EXISTS "Admins can delete employees" ON public.employees;
CREATE POLICY "Admins can delete employees"
ON public.employees FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('administrateur', 'dirigeant')
  )
);

-- ============================================
-- POLITIQUES RLS - EMPLOYEE_ASSIGNMENTS
-- ============================================

DROP POLICY IF EXISTS "Users can view all assignments" ON public.employee_assignments;
CREATE POLICY "Users can view all assignments"
ON public.employee_assignments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('administrateur', 'dirigeant')
  )
  OR
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE id = employee_assignments.employee_id AND user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins can insert assignments" ON public.employee_assignments;
CREATE POLICY "Admins can insert assignments"
ON public.employee_assignments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('administrateur', 'dirigeant')
  )
);

DROP POLICY IF EXISTS "Admins can update assignments" ON public.employee_assignments;
CREATE POLICY "Admins can update assignments"
ON public.employee_assignments FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('administrateur', 'dirigeant')
  )
);

DROP POLICY IF EXISTS "Admins can delete assignments" ON public.employee_assignments;
CREATE POLICY "Admins can delete assignments"
ON public.employee_assignments FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('administrateur', 'dirigeant')
  )
);

-- ============================================
-- POLITIQUES RLS - AI_QUOTES
-- ============================================

DROP POLICY IF EXISTS "Users can view their own quotes" ON public.ai_quotes;
CREATE POLICY "Users can view their own quotes"
ON public.ai_quotes FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own quotes" ON public.ai_quotes;
CREATE POLICY "Users can insert their own quotes"
ON public.ai_quotes FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own quotes" ON public.ai_quotes;
CREATE POLICY "Users can update their own quotes"
ON public.ai_quotes FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own quotes" ON public.ai_quotes;
CREATE POLICY "Users can delete their own quotes"
ON public.ai_quotes FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- POLITIQUES RLS - NOTIFICATIONS
-- ============================================

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- ============================================
-- POLITIQUES RLS - CANDIDATURES
-- ============================================

DROP POLICY IF EXISTS "Admins can view all candidatures" ON public.candidatures;
CREATE POLICY "Admins can view all candidatures"
ON public.candidatures FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('administrateur', 'dirigeant')
  )
);

DROP POLICY IF EXISTS "Admins can insert candidatures" ON public.candidatures;
CREATE POLICY "Admins can insert candidatures"
ON public.candidatures FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update candidatures" ON public.candidatures;
CREATE POLICY "Admins can update candidatures"
ON public.candidatures FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('administrateur', 'dirigeant')
  )
);

-- ============================================
-- POLITIQUES RLS - TACHES_RH
-- ============================================

DROP POLICY IF EXISTS "Admins can view all taches" ON public.taches_rh;
CREATE POLICY "Admins can view all taches"
ON public.taches_rh FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('administrateur', 'dirigeant')
  )
  OR assigne_a = auth.uid()
);

DROP POLICY IF EXISTS "Admins can insert taches" ON public.taches_rh;
CREATE POLICY "Admins can insert taches"
ON public.taches_rh FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('administrateur', 'dirigeant')
  )
);

DROP POLICY IF EXISTS "Admins can update taches" ON public.taches_rh;
CREATE POLICY "Admins can update taches"
ON public.taches_rh FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('administrateur', 'dirigeant')
  )
  OR assigne_a = auth.uid()
);

-- ============================================
-- POLITIQUES RLS - RH_ACTIVITIES
-- ============================================

DROP POLICY IF EXISTS "Admins can view all rh activities" ON public.rh_activities;
CREATE POLICY "Admins can view all rh activities"
ON public.rh_activities FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('administrateur', 'dirigeant')
  )
);

DROP POLICY IF EXISTS "Admins can insert rh activities" ON public.rh_activities;
CREATE POLICY "Admins can insert rh activities"
ON public.rh_activities FOR INSERT
WITH CHECK (true);

-- ============================================
-- POLITIQUES RLS - EMPLOYEE_PERFORMANCES
-- ============================================

DROP POLICY IF EXISTS "Admins can view all performances" ON public.employee_performances;
CREATE POLICY "Admins can view all performances"
ON public.employee_performances FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('administrateur', 'dirigeant')
  )
);

DROP POLICY IF EXISTS "Employees can view their own performances" ON public.employee_performances;
CREATE POLICY "Employees can view their own performances"
ON public.employee_performances FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE id = employee_performances.employee_id AND user_id = auth.uid()
  )
);

-- ============================================
-- POLITIQUES RLS - MAINTENANCE_REMINDERS
-- ============================================

DROP POLICY IF EXISTS "Users can view their own reminders" ON public.maintenance_reminders;
CREATE POLICY "Users can view their own reminders"
ON public.maintenance_reminders FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own reminders" ON public.maintenance_reminders;
CREATE POLICY "Users can insert their own reminders"
ON public.maintenance_reminders FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own reminders" ON public.maintenance_reminders;
CREATE POLICY "Users can update their own reminders"
ON public.maintenance_reminders FOR UPDATE
USING (auth.uid() = user_id);

-- ============================================
-- POLITIQUES RLS - IMAGE_ANALYSIS
-- ============================================

DROP POLICY IF EXISTS "Users can view their own analyses" ON public.image_analysis;
CREATE POLICY "Users can view their own analyses"
ON public.image_analysis FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own analyses" ON public.image_analysis;
CREATE POLICY "Users can insert their own analyses"
ON public.image_analysis FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- POLITIQUES RLS - AI_CONVERSATIONS
-- ============================================

DROP POLICY IF EXISTS "Users can view their own conversations" ON public.ai_conversations;
CREATE POLICY "Users can view their own conversations"
ON public.ai_conversations FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own conversations" ON public.ai_conversations;
CREATE POLICY "Users can insert their own conversations"
ON public.ai_conversations FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- POLITIQUES RLS - EMAIL_QUEUE
-- ============================================

DROP POLICY IF EXISTS "Users can view their own emails" ON public.email_queue;
CREATE POLICY "Users can view their own emails"
ON public.email_queue FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "System can insert emails" ON public.email_queue;
CREATE POLICY "System can insert emails"
ON public.email_queue FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "System can update emails" ON public.email_queue;
CREATE POLICY "System can update emails"
ON public.email_queue FOR UPDATE
USING (true);

-- ============================================
-- FONCTIONS UTILITAIRES
-- ============================================

-- Fonction pour créer automatiquement user_stats et user_settings
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_stats (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'statut')::text, 'salarie'))
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour créer automatiquement stats/settings/role pour nouveaux utilisateurs
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- FIN DU SCRIPT
-- ============================================
-- Toutes les tables, indexes, triggers et politiques RLS sont maintenant créés
-- ============================================

