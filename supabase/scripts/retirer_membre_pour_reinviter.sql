-- Retirer un membre d'une entreprise pour pouvoir renvoyer l'invitation
-- Exécuter dans Supabase Dashboard -> SQL Editor
-- Modifier l'email et le company_id si besoin

-- Retirer sabbg.du73100@gmail.com de l'entreprise (pour renvoyer l'invitation)
DELETE FROM public.company_users
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'sabbg.du73100@gmail.com')
  AND company_id = 'ac116d15-f978-4899-b657-268b87f15aff';

-- Vérification
SELECT cu.user_id, u.email, cu.company_id, cu.role
FROM public.company_users cu
JOIN auth.users u ON u.id = cu.user_id
WHERE u.email = 'sabbg.du73100@gmail.com';
-- Doit retourner 0 lignes après le DELETE
