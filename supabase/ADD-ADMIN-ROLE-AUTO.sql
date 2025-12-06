-- =====================================================
-- SCRIPT POUR AJOUTER AUTOMATIQUEMENT LE RÔLE ADMIN
-- =====================================================
-- Ce script ajoute le rôle admin à l'utilisateur actuellement connecté
-- À exécuter dans Supabase Dashboard → SQL Editor
-- =====================================================

-- IMPORTANT : Ce script doit être exécuté APRÈS vous être connecté dans Supabase
-- Il utilise auth.uid() pour récupérer votre UID automatiquement

-- Option 1 : Utiliser la fonction set_user_admin
SELECT public.set_user_admin(auth.uid());

-- Option 2 : Insertion directe (si la fonction n'existe pas)
INSERT INTO public.user_roles (user_id, role)
VALUES (auth.uid(), 'admin'::app_role)
ON CONFLICT (user_id) 
DO UPDATE SET role = 'admin'::app_role;

-- Vérification
SELECT 
  ur.user_id,
  ur.role,
  au.email
FROM public.user_roles ur
JOIN auth.users au ON au.id = ur.user_id
WHERE ur.user_id = auth.uid();

-- Message de confirmation
DO $$ 
BEGIN
  RAISE NOTICE '✅ Rôle admin ajouté avec succès pour l''utilisateur : %', auth.uid();
  RAISE NOTICE '📋 Vous pouvez maintenant créer des entreprises sans erreur 403';
END $$;





