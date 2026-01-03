-- =====================================================
-- 🔧 DONNER LE RÔLE ADMINISTRATEUR À UN UTILISATEUR
-- =====================================================
-- Remplace TON_EMAIL@example.com par ton email de connexion
-- =====================================================

-- Option 1 : Donner le rôle admin à ton email
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'administrateur' 
FROM auth.users 
WHERE email = 'TON_EMAIL@example.com'  -- ⚠️ REMPLACE PAR TON EMAIL
ON CONFLICT (user_id, role) DO NOTHING;

-- Option 2 : Donner le rôle admin à TOUS les utilisateurs (pour test)
-- Décommente la ligne suivante si tu veux donner le rôle admin à tous :
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















