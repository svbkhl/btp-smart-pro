-- =====================================================
-- CONFIGURATION SIMPLE DES CRON JOBS
-- =====================================================
-- Copiez ce script et remplacez les valeurs ci-dessous
-- =====================================================

-- Activer les extensions nécessaires
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- =====================================================
-- VALEURS À REMPLACER
-- =====================================================
-- Remplacez ces valeurs avant d'exécuter :
-- 1. YOUR_PROJECT_REF → renmjmqlmafqjzldmsgs
-- 2. YOUR_SERVICE_ROLE_KEY → Votre clé service_role (Settings → API)

-- =====================================================
-- CRON JOB 1 : Smart Notifications (toutes les heures)
-- =====================================================

-- Supprimer l'ancien cron job s'il existe
SELECT cron.unschedule('smart-notifications-hourly') 
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'smart-notifications-hourly'
);

-- Créer le cron job
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
-- CRON JOB 2 : Process Email Queue (toutes les 5 minutes)
-- =====================================================

-- Supprimer l'ancien cron job s'il existe
SELECT cron.unschedule('process-email-queue') 
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-email-queue'
);

-- Créer le cron job
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

-- Afficher les cron jobs créés
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  database
FROM cron.job
WHERE jobname IN ('smart-notifications-hourly', 'process-email-queue');

-- =====================================================
-- INSTRUCTIONS
-- =====================================================
-- 1. Remplacez YOUR_SERVICE_ROLE_KEY par votre clé service_role
--    (Trouvez-la dans Supabase Dashboard → Settings → API → service_role key)
-- 2. Exécutez ce script dans SQL Editor
-- 3. Vérifiez que les 2 cron jobs sont créés et actifs (active = true)

