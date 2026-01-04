-- =====================================================
-- DIAGNOSTIC COMPLET : EMAILS MESSAGERIE
-- =====================================================
-- Exécute ce script dans Supabase SQL Editor
-- pour voir exactement ce qui se passe

-- 1️⃣ Vérifier si la table email_messages existe
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'email_messages'
  ) THEN
    RAISE NOTICE '✅ Table email_messages existe';
  ELSE
    RAISE NOTICE '❌ Table email_messages n''existe PAS !';
    RAISE NOTICE '🔧 Exécute le script CREATE-EMAIL-MESSAGES-TABLE.sql';
  END IF;
END $$;

-- 2️⃣ Compter tous les emails
SELECT 
  '📊 TOTAL EMAILS' as info,
  COUNT(*) as count
FROM email_messages;

-- 3️⃣ Compter les emails par statut
SELECT 
  '📊 PAR STATUT' as info,
  status,
  COUNT(*) as count
FROM email_messages
GROUP BY status;

-- 4️⃣ Compter les emails par type
SELECT 
  '📊 PAR TYPE' as info,
  email_type,
  COUNT(*) as count
FROM email_messages
GROUP BY email_type
ORDER BY count DESC;

-- 5️⃣ Voir les 10 derniers emails envoyés
SELECT 
  '📧 DERNIERS EMAILS' as info,
  id,
  recipient_email,
  subject,
  email_type,
  status,
  sent_at,
  created_at,
  user_id
FROM email_messages
ORDER BY 
  COALESCE(sent_at, created_at) DESC 
LIMIT 10;

-- 6️⃣ Vérifier les RLS policies
SELECT 
  '🔒 RLS POLICIES' as info,
  policyname,
  permissive,
  roles,
  cmd,
  SUBSTRING(qual::text, 1, 50) as condition
FROM pg_policies
WHERE tablename = 'email_messages';

-- 7️⃣ Vérifier si RLS est activé
SELECT 
  '🔒 RLS STATUS' as info,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'email_messages';

-- 8️⃣ Lister tous les utilisateurs avec leurs emails
SELECT 
  '👤 UTILISATEURS' as info,
  id,
  email,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- 9️⃣ Compter les emails par utilisateur
SELECT 
  '📊 EMAILS PAR USER' as info,
  u.email as user_email,
  COUNT(em.id) as email_count
FROM auth.users u
LEFT JOIN email_messages em ON em.user_id = u.id
GROUP BY u.id, u.email
ORDER BY email_count DESC;

-- 🔟 Vérifier les colonnes de la table
SELECT 
  '📋 COLONNES' as info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'email_messages'
ORDER BY ordinal_position;

-- =====================================================
-- RÉSUMÉ FINAL
-- =====================================================
DO $$
DECLARE
  total_emails INTEGER;
  total_users INTEGER;
  rls_enabled BOOLEAN;
BEGIN
  -- Compter emails
  SELECT COUNT(*) INTO total_emails FROM email_messages;
  
  -- Compter users
  SELECT COUNT(*) INTO total_users FROM auth.users;
  
  -- Vérifier RLS
  SELECT rowsecurity INTO rls_enabled 
  FROM pg_tables 
  WHERE tablename = 'email_messages';
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🎯 RÉSUMÉ DU DIAGNOSTIC';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total emails : %', total_emails;
  RAISE NOTICE 'Total utilisateurs : %', total_users;
  RAISE NOTICE 'RLS activé : %', rls_enabled;
  RAISE NOTICE '';
  
  IF total_emails = 0 THEN
    RAISE NOTICE '⚠️  PROBLÈME: Aucun email en base !';
    RAISE NOTICE '🔧 SOLUTION: Envoie un email de test';
  ELSIF total_emails > 0 THEN
    RAISE NOTICE '✅ Des emails existent en base';
    RAISE NOTICE '🔍 Si Messagerie est vide = problème RLS ou frontend';
  END IF;
  
  IF NOT rls_enabled THEN
    RAISE NOTICE '⚠️  RLS non activé sur email_messages';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;
