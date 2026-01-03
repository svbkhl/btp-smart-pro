-- ============================================
-- ASSIGNER LE RÔLE ADMINISTRATEUR À UN UTILISATEUR
-- ============================================
-- Ce script assigne le rôle "administrateur" à l'utilisateur avec l'email sabri.khalfallah6@gmail.com
-- ============================================

-- Étape 1 : Vérifier que l'utilisateur existe et récupérer son ID
DO $$
DECLARE
  user_uuid UUID;
BEGIN
  -- Récupérer l'UUID de l'utilisateur par son email
  SELECT id INTO user_uuid
  FROM auth.users
  WHERE email = 'sabri.khalfallah6@gmail.com';
  
  -- Si l'utilisateur n'existe pas, afficher un message d'erreur
  IF user_uuid IS NULL THEN
    RAISE EXCEPTION '❌ Utilisateur avec l''email sabri.khalfallah6@gmail.com non trouvé dans auth.users';
  END IF;
  
  RAISE NOTICE '✅ Utilisateur trouvé : %', user_uuid;
  
  -- Étape 2 : Insérer ou mettre à jour le rôle dans user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (user_uuid, 'administrateur'::app_role)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    role = 'administrateur'::app_role,
    updated_at = now();
  
  RAISE NOTICE '✅ Rôle "administrateur" assigné avec succès à sabri.khalfallah6@gmail.com';
  
END $$;

-- Vérification : Afficher le rôle assigné
SELECT 
  u.email,
  ur.role,
  ur.created_at,
  ur.updated_at
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'sabri.khalfallah6@gmail.com';


















