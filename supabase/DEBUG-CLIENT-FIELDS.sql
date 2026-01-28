-- 🔍 DEBUG : Vérifier pourquoi les champs clients disparaissent

-- 1. Vérifier le schéma de la table clients
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'clients'
ORDER BY ordinal_position;

-- 2. Vérifier tous les triggers sur la table clients
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'clients'
  AND trigger_schema = 'public';

-- 3. Vérifier le dernier client créé (celui avec "bouhajji")
SELECT 
  id,
  name,
  prenom,
  email,
  phone,
  location,
  titre,
  company_id,
  user_id,
  created_at
FROM public.clients
WHERE name = 'bouhajji'
ORDER BY created_at DESC
LIMIT 1;

-- 4. Vérifier les contraintes
SELECT
  con.conname AS constraint_name,
  con.contype AS constraint_type,
  pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'clients';
