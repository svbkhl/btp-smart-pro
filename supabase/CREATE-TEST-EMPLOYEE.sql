-- ============================================
-- SCRIPT : Créer un employé de test
-- ============================================
-- Ce script crée un compte employé de test avec :
-- - Email : karim@btp-smartpro.fr
-- - Mot de passe : (à définir via Supabase Auth)
-- - Rôle : salarie
-- ============================================
-- INSTRUCTIONS :
-- 1. Créer d'abord l'utilisateur dans Supabase Auth (Table Editor > Authentication > Users)
-- 2. Copier l'UUID de l'utilisateur créé
-- 3. Exécuter ce script en remplaçant USER_ID_HERE par l'UUID
-- ============================================

-- Étape 1 : Créer le rôle 'salarie' pour l'utilisateur
-- REMPLACER 'USER_ID_HERE' par l'UUID de l'utilisateur créé dans Auth
INSERT INTO public.user_roles (user_id, role)
VALUES ('USER_ID_HERE', 'salarie'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;

-- Étape 2 : Créer l'entrée dans la table employees
-- REMPLACER 'USER_ID_HERE' par l'UUID de l'utilisateur créé dans Auth
INSERT INTO public.employees (user_id, nom, prenom, email, poste, specialites)
VALUES (
  'USER_ID_HERE',
  'Ben Ali',
  'Karim',
  'karim@btp-smartpro.fr',
  'Maçon',
  ARRAY['Maçonnerie', 'Enduit', 'Carrelage']
)
ON CONFLICT (user_id) DO UPDATE
SET nom = EXCLUDED.nom,
    prenom = EXCLUDED.prenom,
    email = EXCLUDED.email,
    poste = EXCLUDED.poste,
    specialites = EXCLUDED.specialites;

-- ============================================
-- EXEMPLE COMPLET :
-- ============================================
-- Si l'UUID de l'utilisateur est : 123e4567-e89b-12d3-a456-426614174000
-- 
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('123e4567-e89b-12d3-a456-426614174000', 'salarie'::app_role);
-- 
-- INSERT INTO public.employees (user_id, nom, prenom, email, poste, specialites)
-- VALUES (
--   '123e4567-e89b-12d3-a456-426614174000',
--   'Ben Ali',
--   'Karim',
--   'karim@btp-smartpro.fr',
--   'Maçon',
--   ARRAY['Maçonnerie', 'Enduit', 'Carrelage']
-- );

