-- ═══════════════════════════════════════════════════════════════════════════
-- FIX AUTOMATIQUE : Company ID pour TOUS les utilisateurs + Trigger auto
-- VERSION FINALE CORRIGÉE
-- ═══════════════════════════════════════════════════════════════════════════

-- PARTIE 1 : Migration des utilisateurs existants
DO $$
DECLARE
  v_user_record RECORD;
  v_count INTEGER := 0;
  v_owner_role_id UUID;
BEGIN
  RAISE NOTICE '🔧 MIGRATION : Assignation de TOUS les utilisateurs';
  
  SELECT id INTO v_owner_role_id FROM public.roles WHERE slug = 'owner' LIMIT 1;
  
  FOR v_user_record IN 
    SELECT DISTINCT 
      cu.user_id, cu.company_id, cu.role_id, u.email, 
      u.raw_user_meta_data, c.name as company_name
    FROM public.company_users cu
    INNER JOIN auth.users u ON u.id = cu.user_id
    INNER JOIN public.companies c ON c.id = cu.company_id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.employees e 
      WHERE e.user_id = cu.user_id AND e.company_id = cu.company_id
    )
  LOOP
    BEGIN
      INSERT INTO public.employees (
        user_id, company_id, nom, prenom, email, poste, statut, created_at, updated_at
      ) VALUES (
        v_user_record.user_id, v_user_record.company_id,
        COALESCE(v_user_record.raw_user_meta_data->>'last_name', v_user_record.raw_user_meta_data->>'nom', 'Utilisateur'),
        COALESCE(v_user_record.raw_user_meta_data->>'first_name', v_user_record.raw_user_meta_data->>'prenom', ''),
        v_user_record.email,
        CASE WHEN v_user_record.role_id = v_owner_role_id THEN 'Propriétaire' ELSE 'Employé' END,
        'actif', NOW(), NOW()
      ) ON CONFLICT (user_id, company_id) DO NOTHING;
      
      v_count := v_count + 1;
      RAISE NOTICE '✅ % -> %', v_user_record.email, v_user_record.company_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '⚠️ Erreur : %', SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '✅ Migration terminée : % utilisateurs ajoutés', v_count;
END $$;

-- PARTIE 2 : Trigger automatique
CREATE OR REPLACE FUNCTION auto_assign_employee_on_company_user_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_user_email TEXT;
  v_user_metadata JSONB;
  v_owner_role_id UUID;
BEGIN
  SELECT email, raw_user_meta_data INTO v_user_email, v_user_metadata
  FROM auth.users WHERE id = NEW.user_id;
  
  SELECT id INTO v_owner_role_id FROM public.roles WHERE slug = 'owner' LIMIT 1;
  
  INSERT INTO public.employees (
    user_id, company_id, nom, prenom, email, poste, statut, created_at, updated_at
  ) VALUES (
    NEW.user_id, NEW.company_id,
    COALESCE(v_user_metadata->>'last_name', v_user_metadata->>'nom', 'Utilisateur'),
    COALESCE(v_user_metadata->>'first_name', v_user_metadata->>'prenom', ''),
    v_user_email,
    CASE WHEN NEW.role_id = v_owner_role_id THEN 'Propriétaire' ELSE 'Employé' END,
    'actif', NOW(), NOW()
  ) ON CONFLICT (user_id, company_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_assign_employee ON public.company_users;

CREATE TRIGGER trigger_auto_assign_employee
  AFTER INSERT ON public.company_users
  FOR EACH ROW EXECUTE FUNCTION auto_assign_employee_on_company_user_insert();

-- PARTIE 3 : Vérification finale
DO $$
BEGIN
  RAISE NOTICE '✅ INSTALLATION TERMINÉE !';
END $$;
