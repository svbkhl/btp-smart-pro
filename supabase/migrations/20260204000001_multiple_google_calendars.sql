-- ============================================================================
-- 📅 SUPPORT MULTIPLE CALENDRIERS GOOGLE (Planning, Agenda, Événements)
-- ============================================================================
-- Description: Permet de connecter 3 calendriers Google séparés par entreprise
-- Date: 2026-02-04
-- ============================================================================

-- ============================================================================
-- ÉTAPE 1 : Ajouter calendar_type à google_calendar_connections
-- ============================================================================

-- Ajouter la colonne calendar_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'google_calendar_connections' 
    AND column_name = 'calendar_type'
  ) THEN
    ALTER TABLE public.google_calendar_connections 
    ADD COLUMN calendar_type TEXT NOT NULL DEFAULT 'planning' 
    CHECK (calendar_type IN ('planning', 'agenda', 'events'));
    
    RAISE NOTICE '✅ Colonne calendar_type ajoutée';
  END IF;
END $$;

-- Ajouter calendar_name pour stocker le nom du calendrier Google
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'google_calendar_connections' 
    AND column_name = 'calendar_name'
  ) THEN
    ALTER TABLE public.google_calendar_connections 
    ADD COLUMN calendar_name TEXT;
    
    RAISE NOTICE '✅ Colonne calendar_name ajoutée';
  END IF;
END $$;

-- ============================================================================
-- ÉTAPE 2 : Modifier la contrainte UNIQUE
-- ============================================================================

-- Supprimer l'ancienne contrainte UNIQUE(user_id, company_id)
ALTER TABLE public.google_calendar_connections 
DROP CONSTRAINT IF EXISTS google_calendar_connections_user_id_company_id_key;

-- Créer une nouvelle contrainte UNIQUE incluant calendar_type
-- Une entreprise peut avoir 3 connexions : une par type (planning, agenda, events)
ALTER TABLE public.google_calendar_connections 
ADD CONSTRAINT google_calendar_connections_company_calendar_type_key 
UNIQUE (company_id, calendar_type);

-- ============================================================================
-- ÉTAPE 3 : Modifier owner_user_id au lieu de user_id
-- ============================================================================

-- Renommer user_id en owner_user_id pour clarifier
-- (La connexion est au niveau entreprise, pas utilisateur individuel)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'google_calendar_connections' 
    AND column_name = 'user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'google_calendar_connections' 
    AND column_name = 'owner_user_id'
  ) THEN
    ALTER TABLE public.google_calendar_connections 
    RENAME COLUMN user_id TO owner_user_id;
    
    RAISE NOTICE '✅ Colonne user_id renommée en owner_user_id';
  END IF;
END $$;

-- ============================================================================
-- ÉTAPE 4 : Ajouter sync_planning_enabled
-- ============================================================================

-- Permet de désactiver la sync des plannings sans déconnecter tout le calendrier
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'google_calendar_connections' 
    AND column_name = 'sync_planning_enabled'
  ) THEN
    ALTER TABLE public.google_calendar_connections 
    ADD COLUMN sync_planning_enabled BOOLEAN DEFAULT true;
    
    RAISE NOTICE '✅ Colonne sync_planning_enabled ajoutée';
  END IF;
END $$;

-- ============================================================================
-- ÉTAPE 5 : Mettre à jour les index
-- ============================================================================

-- Index pour calendar_type
CREATE INDEX IF NOT EXISTS idx_google_calendar_connections_calendar_type 
ON public.google_calendar_connections(calendar_type);

-- Index composite pour queries fréquentes
CREATE INDEX IF NOT EXISTS idx_google_calendar_connections_company_type_enabled 
ON public.google_calendar_connections(company_id, calendar_type, enabled) 
WHERE enabled = true;

-- ============================================================================
-- ÉTAPE 6 : Mettre à jour les RLS policies
-- ============================================================================

-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "Users can view their own google calendar connections" ON public.google_calendar_connections;
DROP POLICY IF EXISTS "Users can create their own google calendar connections" ON public.google_calendar_connections;
DROP POLICY IF EXISTS "Users can update their own google calendar connections" ON public.google_calendar_connections;
DROP POLICY IF EXISTS "Users can delete their own google calendar connections" ON public.google_calendar_connections;

-- Créer les nouvelles policies (niveau entreprise)
CREATE POLICY "Company users can view google calendar connections"
ON public.google_calendar_connections FOR SELECT
USING (
  company_id = public.current_company_id()
);

CREATE POLICY "Company admins can create google calendar connections"
ON public.google_calendar_connections FOR INSERT
WITH CHECK (
  company_id = public.current_company_id()
  AND (
    EXISTS (
      SELECT 1 FROM public.company_users cu
      INNER JOIN public.roles r ON r.id = cu.role_id
      WHERE cu.user_id = auth.uid()
      AND cu.company_id = public.current_company_id()
      AND r.slug IN ('admin', 'owner', 'dirigeant')
    )
  )
);

CREATE POLICY "Company admins can update google calendar connections"
ON public.google_calendar_connections FOR UPDATE
USING (
  company_id = public.current_company_id()
  AND (
    EXISTS (
      SELECT 1 FROM public.company_users cu
      INNER JOIN public.roles r ON r.id = cu.role_id
      WHERE cu.user_id = auth.uid()
      AND cu.company_id = public.current_company_id()
      AND r.slug IN ('admin', 'owner', 'dirigeant')
    )
  )
);

CREATE POLICY "Company admins can delete google calendar connections"
ON public.google_calendar_connections FOR DELETE
USING (
  company_id = public.current_company_id()
  AND (
    EXISTS (
      SELECT 1 FROM public.company_users cu
      INNER JOIN public.roles r ON r.id = cu.role_id
      WHERE cu.user_id = auth.uid()
      AND cu.company_id = public.current_company_id()
      AND r.slug IN ('admin', 'owner', 'dirigeant')
    )
  )
);

-- ============================================================================
-- ÉTAPE 7 : Fonction helper pour récupérer les connexions par type
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_google_calendar_connection_by_type(
  p_company_id UUID,
  p_calendar_type TEXT
)
RETURNS TABLE (
  id UUID,
  owner_user_id UUID,
  company_id UUID,
  google_email TEXT,
  calendar_id TEXT,
  calendar_name TEXT,
  calendar_type TEXT,
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
    gcc.owner_user_id,
    gcc.company_id,
    gcc.google_email,
    gcc.calendar_id,
    gcc.calendar_name,
    gcc.calendar_type,
    gcc.sync_direction,
    gcc.sync_planning_enabled,
    gcc.enabled,
    gcc.expires_at,
    gcc.last_sync_at
  FROM public.google_calendar_connections gcc
  WHERE gcc.company_id = p_company_id
  AND gcc.calendar_type = p_calendar_type
  AND gcc.enabled = true
  AND gcc.expires_at > now()
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION public.get_google_calendar_connection_by_type IS 'Retourne la connexion Google Calendar d''une entreprise pour un type spécifique';

-- ============================================================================
-- ÉTAPE 8 : Fonction pour récupérer toutes les connexions d'une entreprise
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_all_google_calendar_connections(
  p_company_id UUID
)
RETURNS TABLE (
  id UUID,
  owner_user_id UUID,
  company_id UUID,
  google_email TEXT,
  calendar_id TEXT,
  calendar_name TEXT,
  calendar_type TEXT,
  sync_direction TEXT,
  sync_planning_enabled BOOLEAN,
  enabled BOOLEAN,
  expires_at TIMESTAMP WITH TIME ZONE,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gcc.id,
    gcc.owner_user_id,
    gcc.company_id,
    gcc.google_email,
    gcc.calendar_id,
    gcc.calendar_name,
    gcc.calendar_type,
    gcc.sync_direction,
    gcc.sync_planning_enabled,
    gcc.enabled,
    gcc.expires_at,
    gcc.last_sync_at,
    gcc.created_at,
    gcc.updated_at
  FROM public.google_calendar_connections gcc
  WHERE gcc.company_id = p_company_id
  ORDER BY gcc.calendar_type;
END;
$$;

COMMENT ON FUNCTION public.get_all_google_calendar_connections IS 'Retourne toutes les connexions Google Calendar d''une entreprise';

-- ============================================================================
-- RAPPORT
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ SUPPORT MULTIPLE CALENDRIERS GOOGLE ACTIVÉ !';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Colonne calendar_type ajoutée (planning/agenda/events)';
  RAISE NOTICE '✅ Colonne calendar_name ajoutée';
  RAISE NOTICE '✅ Colonne sync_planning_enabled ajoutée';
  RAISE NOTICE '✅ Contrainte UNIQUE modifiée (3 calendriers max)';
  RAISE NOTICE '✅ RLS policies mises à jour';
  RAISE NOTICE '✅ Fonctions helper créées';
  RAISE NOTICE '';
  RAISE NOTICE '📅 Une entreprise peut maintenant avoir :';
  RAISE NOTICE '   • Un calendrier "Planning" (affectations employés)';
  RAISE NOTICE '   • Un calendrier "Agenda" (événements généraux)';
  RAISE NOTICE '   • Un calendrier "Événements" (autres événements)';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;

-- ============================================================================
-- FIN DU SCRIPT
-- ============================================================================
