-- =====================================================
-- CONFIGURATION AUTOMATIQUE DES CRON JOBS
-- =====================================================
-- Ce script utilise SERVICE_ROLE_KEY qui est déjà configuré
-- Plus simple que d'utiliser CRON_SECRET
-- =====================================================

-- Activer les extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Supprimer les anciens cron jobs s'ils existent
SELECT cron.unschedule('smart-notifications-hourly') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'smart-notifications-hourly'
);

SELECT cron.unschedule('process-email-queue') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-email-queue'
);

-- =====================================================
-- CRON JOB 1 : SMART-NOTIFICATIONS (toutes les heures)
-- =====================================================
-- ⚠️ REMPLACEZ YOUR_SERVICE_ROLE_KEY par votre SERVICE_ROLE_KEY
-- Trouvez-la dans : Settings → API → service_role key

SELECT cron.schedule(
  'smart-notifications-hourly',
  '0 * * * *', -- Toutes les heures à la minute 0
  $$
  SELECT net.http_post(
    url := 'https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/smart-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- =====================================================
-- CRON JOB 2 : PROCESS-EMAIL-QUEUE (toutes les 5 minutes)
-- =====================================================

SELECT cron.schedule(
  'process-email-queue',
  '*/5 * * * *', -- Toutes les 5 minutes
  $$
  SELECT net.http_post(
    url := 'https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/process-email-queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- =====================================================
-- VÉRIFICATION
-- =====================================================

SELECT 
  jobid,
  jobname,
  schedule,
  active,
  CASE 
    WHEN active THEN '✅ Actif'
    ELSE '❌ Inactif'
  END as status
FROM cron.job
WHERE jobname IN ('smart-notifications-hourly', 'process-email-queue');

-- =====================================================
-- INSTRUCTIONS
-- =====================================================
-- 
-- 1. Trouvez votre SERVICE_ROLE_KEY :
--    - Supabase Dashboard → Settings → API
--    - Copiez la clé "service_role" (longue chaîne commençant par eyJ...)
--
-- 2. Remplacez YOUR_SERVICE_ROLE_KEY (2 fois dans le script) par cette clé
--
-- 3. Exécutez le script dans SQL Editor
--
-- 4. Vérifiez que les 2 cron jobs sont actifs (colonne status = ✅ Actif)
--
-- =====================================================

