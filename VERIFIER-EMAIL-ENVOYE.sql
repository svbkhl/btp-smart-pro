-- =====================================================
-- VÉRIFIER SI L'EMAIL EST BIEN ENREGISTRÉ
-- =====================================================

-- 1️⃣ Vérifier le nombre total d'emails
SELECT 
  '📊 TOTAL EMAILS' as info,
  COUNT(*) as count
FROM email_messages;

-- 2️⃣ Voir les 5 derniers emails (tous users)
SELECT 
  '📧 DERNIERS EMAILS (TOUS)' as info,
  id,
  recipient_email,
  subject,
  email_type,
  status,
  sent_at,
  created_at,
  user_id
FROM email_messages
ORDER BY COALESCE(sent_at, created_at) DESC
LIMIT 5;

-- 3️⃣ Voir les emails de l'utilisateur spécifique
-- REMPLACE 'TON_USER_ID' par ton vrai user_id
SELECT 
  '📧 TES EMAILS' as info,
  id,
  recipient_email,
  subject,
  email_type,
  status,
  sent_at,
  created_at
FROM email_messages
WHERE user_id = 'de5b6ce5-9525-4678-83f7-e46538272a54'  -- ← TON USER ID
ORDER BY COALESCE(sent_at, created_at) DESC
LIMIT 10;

-- 4️⃣ Compter les emails par user_id
SELECT 
  '📊 EMAILS PAR USER' as info,
  user_id,
  COUNT(*) as email_count
FROM email_messages
GROUP BY user_id
ORDER BY email_count DESC;

-- 5️⃣ Vérifier les emails des dernières 10 minutes
SELECT 
  '📧 EMAILS RÉCENTS (10 MIN)' as info,
  id,
  recipient_email,
  subject,
  email_type,
  status,
  sent_at,
  created_at
FROM email_messages
WHERE created_at > NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC;
