-- =====================================================
-- MIGRATION : Multi-tenant RLS pour clients et projects
-- =====================================================
-- Cette migration ajoute company_id aux tables clients et projects
-- et met à jour les RLS policies pour un modèle SaaS multi-tenant
-- =====================================================

-- =====================================================
-- 1. AJOUTER company_id AUX TABLES
-- =====================================================

-- Ajouter company_id à clients (si absent)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'clients' 
    AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.clients 
    ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_clients_company_id ON public.clients(company_id);
    
    RAISE NOTICE '✅ Colonne company_id ajoutée à clients';
  END IF;
END $$;

-- Ajouter company_id à projects (si absent)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'projects' 
    AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.projects 
    ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_projects_company_id ON public.projects(company_id);
    
    RAISE NOTICE '✅ Colonne company_id ajoutée à projects';
  END IF;
END $$;

-- Ajouter company_id à ai_quotes (si absent) - pour multi-tenant
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_quotes' 
    AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.ai_quotes 
    ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_ai_quotes_company_id ON public.ai_quotes(company_id);
    
    RAISE NOTICE '✅ Colonne company_id ajoutée à ai_quotes';
  END IF;
END $$;

-- Migrer ai_quotes existants
UPDATE public.ai_quotes aq
SET company_id = (
  SELECT cu.company_id 
  FROM public.company_users cu 
  WHERE cu.user_id = aq.user_id 
  AND cu.status = 'active'
  LIMIT 1
)
WHERE aq.company_id IS NULL
AND EXISTS (
  SELECT 1 FROM public.company_users cu 
  WHERE cu.user_id = aq.user_id 
  AND cu.status = 'active'
);

-- =====================================================
-- 2. MIGRER LES DONNÉES EXISTANTES
-- =====================================================

-- Pour chaque client/project existant, associer le company_id du user
-- via company_users (prendre le premier company_id si user appartient à plusieurs)

-- Migrer clients
UPDATE public.clients c
SET company_id = (
  SELECT cu.company_id 
  FROM public.company_users cu 
  WHERE cu.user_id = c.user_id 
  AND cu.status = 'active'
  LIMIT 1
)
WHERE c.company_id IS NULL
AND EXISTS (
  SELECT 1 FROM public.company_users cu 
  WHERE cu.user_id = c.user_id 
  AND cu.status = 'active'
);

-- Si un user n'a pas de company, créer une company par défaut
DO $$
DECLARE
  v_user_id UUID;
  v_company_id UUID;
BEGIN
  FOR v_user_id IN 
    SELECT DISTINCT c.user_id 
    FROM public.clients c 
    WHERE c.company_id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.company_users cu 
      WHERE cu.user_id = c.user_id
    )
  LOOP
    -- Créer une company par défaut pour ce user
    INSERT INTO public.companies (name, owner_id)
    VALUES ('Entreprise par défaut', v_user_id)
    RETURNING id INTO v_company_id;
    
    -- Ajouter user comme owner
    INSERT INTO public.company_users (company_id, user_id, role, status)
    VALUES (v_company_id, v_user_id, 'owner', 'active')
    ON CONFLICT (company_id, user_id) DO NOTHING;
    
    -- Mettre à jour les clients
    UPDATE public.clients
    SET company_id = v_company_id
    WHERE user_id = v_user_id AND company_id IS NULL;
  END LOOP;
END $$;

-- Migrer projects
UPDATE public.projects p
SET company_id = (
  SELECT cu.company_id 
  FROM public.company_users cu 
  WHERE cu.user_id = p.user_id 
  AND cu.status = 'active'
  LIMIT 1
)
WHERE p.company_id IS NULL
AND EXISTS (
  SELECT 1 FROM public.company_users cu 
  WHERE cu.user_id = p.user_id 
  AND cu.status = 'active'
);

-- Pour les projects dont le client a un company_id, utiliser celui du client
UPDATE public.projects p
SET company_id = c.company_id
FROM public.clients c
WHERE p.client_id = c.id
AND p.company_id IS NULL
AND c.company_id IS NOT NULL;

-- =====================================================
-- 3. RENDRE company_id NOT NULL (après migration)
-- =====================================================

-- Pour clients
DO $$
BEGIN
  -- Vérifier qu'il n'y a pas de NULL restants
  IF EXISTS (SELECT 1 FROM public.clients WHERE company_id IS NULL) THEN
    RAISE WARNING '⚠️ Il reste des clients sans company_id. Migration incomplète.';
  ELSE
    -- Rendre NOT NULL si tous ont un company_id
    ALTER TABLE public.clients 
    ALTER COLUMN company_id SET NOT NULL;
    
    RAISE NOTICE '✅ company_id rendu NOT NULL pour clients';
  END IF;
END $$;

-- Pour projects
DO $$
BEGIN
  -- Vérifier qu'il n'y a pas de NULL restants
  IF EXISTS (SELECT 1 FROM public.projects WHERE company_id IS NULL) THEN
    RAISE WARNING '⚠️ Il reste des projects sans company_id. Migration incomplète.';
  ELSE
    -- Rendre NOT NULL si tous ont un company_id
    ALTER TABLE public.projects 
    ALTER COLUMN company_id SET NOT NULL;
    
    RAISE NOTICE '✅ company_id rendu NOT NULL pour projects';
  END IF;
END $$;

-- =====================================================
-- 4. METTRE À JOUR LES RLS POLICIES - CLIENTS
-- =====================================================

-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can create their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete their own clients" ON public.clients;

-- SELECT : Membres de la company
CREATE POLICY "Company members can view clients"
  ON public.clients FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.company_users 
      WHERE user_id = auth.uid() 
      AND status = 'active'
    )
  );

-- INSERT : Membres de la company (avec vérification)
CREATE POLICY "Company members can create clients"
  ON public.clients FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.company_users 
      WHERE user_id = auth.uid() 
      AND status = 'active'
    )
    AND user_id = auth.uid()  -- Garder user_id pour traçabilité
  );

-- UPDATE : Membres de la company
CREATE POLICY "Company members can update clients"
  ON public.clients FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM public.company_users 
      WHERE user_id = auth.uid() 
      AND status = 'active'
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.company_users 
      WHERE user_id = auth.uid() 
      AND status = 'active'
    )
  );

-- DELETE : Membres de la company
CREATE POLICY "Company members can delete clients"
  ON public.clients FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM public.company_users 
      WHERE user_id = auth.uid() 
      AND status = 'active'
    )
  );

-- =====================================================
-- 5. METTRE À JOUR LES RLS POLICIES - PROJECTS
-- =====================================================

-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can create their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;

-- SELECT : Membres de la company
CREATE POLICY "Company members can view projects"
  ON public.projects FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.company_users 
      WHERE user_id = auth.uid() 
      AND status = 'active'
    )
  );

-- INSERT : Membres de la company (avec vérification)
CREATE POLICY "Company members can create projects"
  ON public.projects FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.company_users 
      WHERE user_id = auth.uid() 
      AND status = 'active'
    )
    AND user_id = auth.uid()  -- Garder user_id pour traçabilité
  );

-- UPDATE : Membres de la company
CREATE POLICY "Company members can update projects"
  ON public.projects FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM public.company_users 
      WHERE user_id = auth.uid() 
      AND status = 'active'
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.company_users 
      WHERE user_id = auth.uid() 
      AND status = 'active'
    )
  );

-- DELETE : Membres de la company
CREATE POLICY "Company members can delete projects"
  ON public.projects FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM public.company_users 
      WHERE user_id = auth.uid() 
      AND status = 'active'
    )
  );

-- =====================================================
-- 6. FONCTION HELPER : Vérifier appartenance company
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_company_member(
  p_user_id UUID,
  p_company_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.company_users
    WHERE user_id = p_user_id
      AND company_id = p_company_id
      AND status = 'active'
  );
END;
$$;

COMMENT ON FUNCTION public.is_company_member IS 'Vérifie si un user est membre actif d''une company';

-- =====================================================
-- 7. COMMENTAIRES
-- =====================================================

COMMENT ON COLUMN public.clients.company_id IS 'Company à laquelle appartient ce client (multi-tenant)';
COMMENT ON COLUMN public.projects.company_id IS 'Company à laquelle appartient ce projet (multi-tenant)';
COMMENT ON COLUMN public.ai_quotes.company_id IS 'Company à laquelle appartient ce devis (multi-tenant)';

-- =====================================================
-- 8. METTRE À JOUR RLS POLICIES - AI_QUOTES (si table existe)
-- =====================================================

-- Vérifier si la table existe avant de modifier les policies
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_quotes'
  ) THEN
    -- Supprimer les anciennes policies
    DROP POLICY IF EXISTS "Users can view their own quotes" ON public.ai_quotes;
    DROP POLICY IF EXISTS "Users can create their own quotes" ON public.ai_quotes;
    DROP POLICY IF EXISTS "Users can update their own quotes" ON public.ai_quotes;
    DROP POLICY IF EXISTS "Users can delete their own quotes" ON public.ai_quotes;

    -- SELECT : Membres de la company
    CREATE POLICY "Company members can view quotes"
      ON public.ai_quotes FOR SELECT
      USING (
        company_id IN (
          SELECT company_id FROM public.company_users 
          WHERE user_id = auth.uid() 
          AND status = 'active'
        )
      );

    -- INSERT : Membres de la company
    CREATE POLICY "Company members can create quotes"
      ON public.ai_quotes FOR INSERT
      WITH CHECK (
        company_id IN (
          SELECT company_id FROM public.company_users 
          WHERE user_id = auth.uid() 
          AND status = 'active'
        )
        AND user_id = auth.uid()
      );

    -- UPDATE : Membres de la company
    CREATE POLICY "Company members can update quotes"
      ON public.ai_quotes FOR UPDATE
      USING (
        company_id IN (
          SELECT company_id FROM public.company_users 
          WHERE user_id = auth.uid() 
          AND status = 'active'
        )
      )
      WITH CHECK (
        company_id IN (
          SELECT company_id FROM public.company_users 
          WHERE user_id = auth.uid() 
          AND status = 'active'
        )
      );

    -- DELETE : Membres de la company
    CREATE POLICY "Company members can delete quotes"
      ON public.ai_quotes FOR DELETE
      USING (
        company_id IN (
          SELECT company_id FROM public.company_users 
          WHERE user_id = auth.uid() 
          AND status = 'active'
        )
      );

    RAISE NOTICE '✅ RLS policies mises à jour pour ai_quotes';
  END IF;
END $$;

-- =====================================================
-- FIN DE LA MIGRATION
-- =====================================================
