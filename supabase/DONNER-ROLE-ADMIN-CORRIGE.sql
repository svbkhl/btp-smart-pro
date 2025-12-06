-- =====================================================
-- 🔧 DONNER LE RÔLE ADMINISTRATEUR (Version Corrigée)
-- =====================================================
-- Exécute d'abord CORRIGER-USER-ROLES-UNIQUE.sql
-- =====================================================

-- Option 1 : Donner le rôle admin à un email spécifique
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'administrateur' 
FROM auth.users 
WHERE email = 'sabri.khalfallah6@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Option 2 : Donner le rôle admin à TOUS les utilisateurs (pour test)
-- Décommente si tu veux donner le rôle admin à tous :
-- INSERT INTO public.user_roles (user_id, role)
-- SELECT id, 'administrateur' FROM auth.users
-- ON CONFLICT (user_id, role) DO NOTHING;

-- Vérification
SELECT 
  u.email,
  ur.role,
  ur.created_at
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE ur.role = 'administrateur'
ORDER BY ur.created_at DESC;







