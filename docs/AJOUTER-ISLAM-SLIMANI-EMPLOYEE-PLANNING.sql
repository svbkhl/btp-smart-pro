-- ============================================================================
-- Ajouter Islam Slimani comme employé pour qu'il voie les affectations sur son planning
-- ============================================================================
-- Si Islam Slimani n'a pas de fiche employé, il n'apparaît pas dans le planning
-- et ne peut pas voir les affectations créées par l'owner.
-- Exécuter dans Supabase Dashboard → SQL Editor
-- ============================================================================

DO $$
DECLARE
  v_user_id UUID;
  v_company_id UUID;
  v_email TEXT;
  v_employee_id UUID;
  v_exists BOOLEAN;
BEGIN
  FOR v_user_id, v_email IN 
    SELECT id, email FROM auth.users 
    WHERE LOWER(email) IN ('khalfallahs.ndrc@gmail.com', 'khalfallah.sndrc@gmail.com')
  LOOP
    -- Pour chaque entreprise où il est membre
    FOR v_company_id IN 
      SELECT cu.company_id FROM company_users cu WHERE cu.user_id = v_user_id
    LOOP
      -- Vérifier si une fiche employé existe déjà (user_id + company_id)
      SELECT EXISTS (
        SELECT 1 FROM public.employees e
        WHERE e.user_id = v_user_id AND e.company_id = v_company_id
      ) INTO v_exists;
      
      IF NOT v_exists THEN
        BEGIN
          INSERT INTO public.employees (company_id, user_id, nom, prenom, email, poste)
          SELECT v_company_id, v_user_id, 'Slimani', 'Islam', COALESCE(v_email, 'islam@company.local'), 'Employé'
          WHERE NOT EXISTS (SELECT 1 FROM public.employees e WHERE e.user_id = v_user_id AND e.company_id = v_company_id);
          
          IF FOUND THEN
            RAISE NOTICE '✅ Islam Slimani ajouté comme employé pour company %', v_company_id;
          END IF;
        EXCEPTION WHEN unique_violation THEN
          -- Si contrainte unique(user_id) : mettre à jour company_id si nécessaire
          UPDATE public.employees SET company_id = v_company_id, prenom = 'Islam', nom = 'Slimani'
          WHERE user_id = v_user_id AND (company_id IS NULL OR company_id = v_company_id);
          RAISE NOTICE '✅ Islam Slimani mis à jour pour company %', v_company_id;
        END;
      ELSE
        RAISE NOTICE 'ℹ️ Islam Slimani a déjà une fiche employé pour company %', v_company_id;
      END IF;
      
      -- Mettre à jour le rôle en employé si nécessaire
      UPDATE company_users cu
      SET role_id = (SELECT id FROM roles WHERE slug = 'employee' AND company_id = v_company_id LIMIT 1)
      WHERE cu.user_id = v_user_id AND cu.company_id = v_company_id
        AND cu.role_id != (SELECT id FROM roles WHERE slug = 'employee' AND company_id = v_company_id LIMIT 1);
    END LOOP;
  END LOOP;
  
  RAISE NOTICE '✅ Terminé : vérifiez que Islam Slimani apparaît dans Planning employés et voit son planning';
END $$;

-- Vérification
SELECT 
  u.email,
  e.prenom,
  e.nom,
  e.poste,
  e.company_id,
  c.name AS company_name
FROM public.employees e
JOIN auth.users u ON u.id = e.user_id
LEFT JOIN companies c ON c.id = e.company_id
WHERE LOWER(u.email) IN ('khalfallahs.ndrc@gmail.com', 'khalfallah.sndrc@gmail.com');
