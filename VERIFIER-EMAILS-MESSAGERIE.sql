-- =====================================================
-- VÉRIFIER LES EMAILS DANS MESSAGERIE
-- =====================================================

-- 1️⃣ Vérifier si des emails sont enregistrés
SELECT 
  id,
  recipient_email,
  subject,
  email_type,
  status,
  sent_at,
  created_at
FROM email_messages
ORDER BY sent_at DESC NULLS LAST, created_at DESC
LIMIT 20;

-- 2️⃣ Compter les emails par type
SELECT 
  email_type,
  status,
  COUNT(*) as count
FROM email_messages
GROUP BY email_type, status
ORDER BY count DESC;

-- 3️⃣ Vérifier les emails récents (dernières 24h)
SELECT 
  id,
  recipient_email,
  subject,
  email_type,
  status,
  sent_at
FROM email_messages
WHERE sent_at > NOW() - INTERVAL '24 hours'
ORDER BY sent_at DESC;

-- 4️⃣ Vérifier si la table existe et ses colonnes
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'email_messages'
ORDER BY ordinal_position;

-- 5️⃣ Vérifier les RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'email_messages';

