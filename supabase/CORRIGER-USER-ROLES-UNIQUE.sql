-- =====================================================
-- 🔧 CORRIGER LA TABLE user_roles - Ajouter UNIQUE
-- =====================================================
-- Ce script corrige la contrainte UNIQUE manquante
-- =====================================================

-- Vérifier si la table existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'user_roles'
  ) THEN
    -- Créer la table avec la contrainte UNIQUE
    CREATE TABLE public.user_roles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('administrateur', 'utilisateur')),
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      UNIQUE(user_id, role)  -- ⚠️ CONTRAINTE UNIQUE IMPORTANTE
    );
    
    ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can view their own roles"
      ON public.user_roles FOR SELECT
      USING (auth.uid() = user_id);
    
    CREATE POLICY "Admins can manage all roles"
      ON public.user_roles FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.user_roles 
          WHERE user_id = auth.uid() 
          AND role = 'administrateur'
        )
      );
    
    RAISE NOTICE '✅ Table user_roles créée avec contrainte UNIQUE !';
  ELSE
    -- La table existe, vérifier si la contrainte UNIQUE existe
    IF NOT EXISTS (
      SELECT 1 
      FROM pg_constraint 
      WHERE conname = 'user_roles_user_id_role_key'
      AND conrelid = 'public.user_roles'::regclass
    ) THEN
      -- Ajouter la contrainte UNIQUE si elle n'existe pas
      ALTER TABLE public.user_roles 
      ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
      
      RAISE NOTICE '✅ Contrainte UNIQUE ajoutée à user_roles !';
    ELSE
      RAISE NOTICE '✅ Table user_roles existe déjà avec contrainte UNIQUE';
    END IF;
  END IF;
END $$;

-- Vérification
SELECT 
  '✅ Vérification terminée' as status,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_roles') as table_exists,
  (SELECT COUNT(*) FROM pg_constraint WHERE conname = 'user_roles_user_id_role_key') as unique_constraint_exists;







