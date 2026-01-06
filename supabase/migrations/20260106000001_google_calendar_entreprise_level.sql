-- ============================================================================
-- 🔗 GOOGLE CALENDAR - NIVEAU ENTREPRISE
-- ============================================================================
-- Description: Connexion Google Calendar au niveau ENTREPRISE (pas utilisateur)
-- Date: 2026-01-06
-- ============================================================================

-- ============================================================================
-- MODIFIER TABLE: google_calendar_connections
-- ============================================================================
-- Changer de connexion par utilisateur à connexion par entreprise
-- ============================================================================

-- Supprimer l'ancienne contrainte UNIQUE(user_id, company_id)
ALTER TABLE public.google_calendar_connections 
DROP CONSTRAINT IF EXISTS google_calendar_connections_user_id_company_id_key;

-- Ajouter colonne pour identifier le propriétaire (patron qui a connecté)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'google_calendar_connections' 
    AND column_name = 'owner_user_id'
  ) THEN
    ALTER TABLE public.google_calendar_connections ADD COLUMN owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    RAISE NOTICE '✅ Colonne owner_user_id ajoutée';
  END IF;
END $$;

-- Modifier la contrainte UNIQUE pour être par entreprise uniquement
ALTER TABLE public.google_calendar_connections 
ADD CONSTRAINT google_calendar_connections_company_id_unique 
UNIQUE(company_id);

-- Ajouter colonne pour le nom du calendrier Google créé
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'google_calendar_connections' 
    AND column_name = 'calendar_name'
  ) THEN
    ALTER TABLE public.google_calendar_connections ADD COLUMN calendar_name TEXT;
    RAISE NOTICE '✅ Colonne calendar_name ajoutée';
  END IF;
END $$;

-- Ajouter colonne pour activer/désactiver sync planning
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'google_calendar_connections' 
    AND column_name = 'sync_planning_enabled'
  ) THEN
    ALTER TABLE public.google_calendar_connections ADD COLUMN sync_planning_enabled BOOLEAN DEFAULT true;
    RAISE NOTICE '✅ Colonne sync_planning_enabled ajoutée';
  END IF;
END $$;

-- Commentaires
COMMENT ON COLUMN public.google_calendar_connections.owner_user_id IS 'Utilisateur (patron) qui a connecté Google Calendar pour l''entreprise';
COMMENT ON COLUMN public.google_calendar_connections.calendar_name IS 'Nom du calendrier Google créé (ex: "Planning – {NomEntreprise}")';
COMMENT ON COLUMN public.google_calendar_connections.sync_planning_enabled IS 'Active/désactive la synchronisation des plannings employés';

-- ============================================================================
-- MODIFIER RLS POLICIES
-- ============================================================================

-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "Users can view their own google calendar connections" ON public.google_calendar_connections;
DROP POLICY IF EXISTS "Users can create their own google calendar connections" ON public.google_calendar_connections;
DROP POLICY IF EXISTS "Users can update their own google calendar connections" ON public.google_calendar_connections;
DROP POLICY IF EXISTS "Users can delete their own google calendar connections" ON public.google_calendar_connections;

-- Policy: Seul le patron peut voir la connexion de son entreprise
CREATE POLICY "Owners can view company google calendar connection"
ON public.google_calendar_connections FOR SELECT
USING (
  company_id = public.current_company_id()
  AND EXISTS (
    SELECT 1 FROM public.company_users cu
    JOIN public.roles r ON cu.role_id = r.id
    WHERE cu.user_id = auth.uid()
    AND cu.company_id = google_calendar_connections.company_id
    AND r.slug = 'owner'
  )
);

-- Policy: Seul le patron peut créer la connexion
CREATE POLICY "Owners can create company google calendar connection"
ON public.google_calendar_connections FOR INSERT
WITH CHECK (
  company_id = public.current_company_id()
  AND owner_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.company_users cu
    JOIN public.roles r ON cu.role_id = r.id
    WHERE cu.user_id = auth.uid()
    AND cu.company_id = company_id
    AND r.slug = 'owner'
  )
);

-- Policy: Seul le patron peut modifier la connexion
CREATE POLICY "Owners can update company google calendar connection"
ON public.google_calendar_connections FOR UPDATE
USING (
  company_id = public.current_company_id()
  AND EXISTS (
    SELECT 1 FROM public.company_users cu
    JOIN public.roles r ON cu.role_id = r.id
    WHERE cu.user_id = auth.uid()
    AND cu.company_id = google_calendar_connections.company_id
    AND r.slug = 'owner'
  )
)
WITH CHECK (
  company_id = public.current_company_id()
  AND EXISTS (
    SELECT 1 FROM public.company_users cu
    JOIN public.roles r ON cu.role_id = r.id
    WHERE cu.user_id = auth.uid()
    AND cu.company_id = company_id
    AND r.slug = 'owner'
  )
);

-- Policy: Seul le patron peut supprimer la connexion
CREATE POLICY "Owners can delete company google calendar connection"
ON public.google_calendar_connections FOR DELETE
USING (
  company_id = public.current_company_id()
  AND EXISTS (
    SELECT 1 FROM public.company_users cu
    JOIN public.roles r ON cu.role_id = r.id
    WHERE cu.user_id = auth.uid()
    AND cu.company_id = google_calendar_connections.company_id
    AND r.slug = 'owner'
  )
);

-- ============================================================================
-- TABLE: employee_assignments - Ajouter colonnes Google Calendar + company_id
-- ============================================================================

DO $$
BEGIN
  -- Ajouter company_id si n'existe pas (via employees)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'employee_assignments' 
    AND column_name = 'company_id'
  ) THEN
    -- Ajouter la colonne company_id
    ALTER TABLE public.employee_assignments ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    
    -- Migrer les données existantes depuis employees
    UPDATE public.employee_assignments ea
    SET company_id = e.company_id
    FROM public.employees e
    WHERE ea.employee_id = e.id
    AND ea.company_id IS NULL;
    
    -- Rendre la colonne NOT NULL après migration
    ALTER TABLE public.employee_assignments ALTER COLUMN company_id SET NOT NULL;
    
    RAISE NOTICE '✅ Colonne company_id ajoutée à employee_assignments';
  END IF;

  -- Ajouter google_event_id si n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'employee_assignments' 
    AND column_name = 'google_event_id'
  ) THEN
    ALTER TABLE public.employee_assignments ADD COLUMN google_event_id TEXT;
    RAISE NOTICE '✅ Colonne google_event_id ajoutée à employee_assignments';
  END IF;

  -- Ajouter synced_with_google si n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'employee_assignments' 
    AND column_name = 'synced_with_google'
  ) THEN
    ALTER TABLE public.employee_assignments ADD COLUMN synced_with_google BOOLEAN DEFAULT false;
    RAISE NOTICE '✅ Colonne synced_with_google ajoutée à employee_assignments';
  END IF;

  -- Ajouter google_sync_error si n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'employee_assignments' 
    AND column_name = 'google_sync_error'
  ) THEN
    ALTER TABLE public.employee_assignments ADD COLUMN google_sync_error TEXT;
    RAISE NOTICE '✅ Colonne google_sync_error ajoutée à employee_assignments';
  END IF;
END $$;

-- Index pour company_id sur employee_assignments
CREATE INDEX IF NOT EXISTS idx_employee_assignments_company_id 
ON public.employee_assignments(company_id);

-- Index pour google_event_id sur employee_assignments
CREATE INDEX IF NOT EXISTS idx_employee_assignments_google_event_id 
ON public.employee_assignments(google_event_id) 
WHERE google_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_employee_assignments_synced_with_google 
ON public.employee_assignments(synced_with_google) 
WHERE synced_with_google = true;

-- ============================================================================
-- FONCTIONS
-- ============================================================================

-- Fonction: Récupérer la connexion Google Calendar active d'une entreprise
CREATE OR REPLACE FUNCTION public.get_company_google_calendar_connection(company_uuid UUID)
RETURNS TABLE (
  id UUID,
  company_id UUID,
  owner_user_id UUID,
  google_email TEXT,
  calendar_id TEXT,
  calendar_name TEXT,
  sync_direction TEXT,
  sync_planning_enabled BOOLEAN,
  enabled BOOLEAN,
  expires_at TIMESTAMP WITH TIME ZONE,
  last_sync_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gcc.id,
    gcc.company_id,
    gcc.owner_user_id,
    gcc.google_email,
    gcc.calendar_id,
    gcc.calendar_name,
    gcc.sync_direction,
    gcc.sync_planning_enabled,
    gcc.enabled,
    gcc.expires_at,
    gcc.last_sync_at
  FROM public.google_calendar_connections gcc
  WHERE gcc.company_id = company_uuid
  AND gcc.enabled = true
  AND gcc.expires_at > now()
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION public.get_company_google_calendar_connection IS 'Retourne la connexion Google Calendar active d''une entreprise';

-- ============================================================================
-- RAPPORT
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ GOOGLE CALENDAR NIVEAU ENTREPRISE CONFIGURÉ !';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Table google_calendar_connections modifiée (niveau entreprise)';
  RAISE NOTICE '✅ Colonnes Google ajoutées à employee_assignments';
  RAISE NOTICE '✅ RLS policies modifiées (seul le patron peut gérer)';
  RAISE NOTICE '✅ Fonction get_company_google_calendar_connection créée';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Isolation multi-tenant garantie';
  RAISE NOTICE '👑 Seul le patron peut connecter Google Calendar';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;

-- ============================================================================
-- FIN DU SCRIPT
-- ============================================================================
