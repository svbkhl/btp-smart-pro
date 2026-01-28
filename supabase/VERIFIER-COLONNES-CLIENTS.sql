-- Vérifier les colonnes de la table clients
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'clients'
ORDER BY ordinal_position;

-- Vérifier le dernier client créé avec TOUS ses champs
SELECT 
  id,
  name,
  prenom,      -- ← Devrait maintenant exister
  titre,       -- ← Devrait maintenant exister
  email,
  phone,
  location,
  company_id,
  created_at
FROM public.clients
ORDER BY created_at DESC
LIMIT 3;
