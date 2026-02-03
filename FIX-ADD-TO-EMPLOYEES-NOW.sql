-- ============================================================================
-- FIX IMMÉDIAT: Ajouter les utilisateurs manquants dans employees
-- ============================================================================
-- Script ultra-direct pour ajouter MAINTENANT les utilisateurs dans employees
-- ============================================================================

DO $$
DECLARE
  v_cu RECORD;
  v_added_count INTEGER := 0;
BEGIN
  RAISE NOTICE '🔧 AJOUT DIRECT DANS EMPLOYEES...';
  RAISE NOTICE '';
  
  -- Pour CHAQUE utilisateur dans company_users qui n'est PAS dans employees
  FOR v_cu IN
    SELECT 
      cu.user_id,
      cu.company_id,
      cu.role_id,
      u.email,
      u.raw_user_meta_data,
      c.name as company_name
    FROM public.company_users cu
    JOIN auth.users u ON u.id = cu.user_id
    JOIN public.companies c ON c.id = cu.company_id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.user_id = cu.user_id 
      AND e.company_id = cu.company_id
    )
    AND cu.company_id IS NOT NULL
  LOOP
    BEGIN
      -- Insérer directement dans employees
      INSERT INTO public.employees (
        user_id,
        company_id,
        nom,
        prenom,
        email,
        poste,
        created_at,
        updated_at
      ) VALUES (
        v_cu.user_id,
        v_cu.company_id,
        COALESCE(
          v_cu.raw_user_meta_data->>'last_name',
          v_cu.raw_user_meta_data->>'nom',
          'Utilisateur'
        ),
        COALESCE(
          v_cu.raw_user_meta_data->>'first_name',
          v_cu.raw_user_meta_data->>'prenom',
          ''
        ),
        v_cu.email,
        CASE 
          WHEN v_cu.role_id = (SELECT id FROM roles WHERE slug = 'owner' LIMIT 1)
          THEN 'Propriétaire'
          ELSE 'Employé'
        END,
        NOW(),
        NOW()
      );
      
      v_added_count := v_added_count + 1;
      RAISE NOTICE '  ✅ Ajouté: % → %', v_cu.email, v_cu.company_name;
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '  ❌ Erreur pour %: %', v_cu.email, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Total ajouté: % utilisateurs', v_added_count;
  RAISE NOTICE '';
END $$;

-- Vérification immédiate
SELECT 
  '✅ VÉRIFICATION APRÈS FIX' as status,
  u.email,
  c.name as company_name,
  CASE 
    WHEN e.id IS NOT NULL THEN 'OUI ✅' 
    ELSE 'NON ❌' 
  END as dans_employees
FROM public.company_users cu
JOIN auth.users u ON u.id = cu.user_id
LEFT JOIN public.companies c ON c.id = cu.company_id
LEFT JOIN public.employees e ON e.user_id = cu.user_id AND e.company_id = cu.company_id
WHERE u.email IN (
  'khalfallahs.ndrc@gmail.com',
  'sabbg.du73100@gmail.com',
  'ninis1us@gmail.com',
  'sabri.khalfallah6@gmail.com'
)
ORDER BY u.email;
