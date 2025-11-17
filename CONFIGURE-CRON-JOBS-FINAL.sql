-- =====================================================
-- CONFIGURATION FINALE DES CRON JOBS
-- =====================================================
-- Ce script configure les cron jobs avec les valeurs correctes
-- ⚠️ REMPLACEZ SEULEMENT YOUR_SERVICE_ROLE_KEY
-- =====================================================

-- Activer les extensions nécessaires
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- =====================================================
-- ⚠️ IMPORTANT : REMPLACEZ YOUR_SERVICE_ROLE_KEY
-- =====================================================
-- 1. Allez dans Supabase Dashboard → Settings → API
-- 2. Copiez la clé "service_role" (secret)
-- 3. Remplacez YOUR_SERVICE_ROLE_KEY dans ce script
-- 4. Exécutez le script

-- =====================================================
-- CRON JOB 1 : Smart Notifications (toutes les heures)
-- =====================================================

-- Supprimer l'ancien cron job s'il existe
SELECT cron.unschedule('smart-notifications-hourly') 
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'smart-notifications-hourly'
);

-- Créer le cron job
-- ⚠️ REMPLACEZ YOUR_SERVICE_ROLE_KEY ci-dessous
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
-- ⚠️ REMPLACEZ YOUR_SERVICE_ROLE_KEY ci-dessous
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
-- RÉSULTAT ATTENDU
-- =====================================================
-- Vous devriez voir 2 lignes :
-- - smart-notifications-hourly | 0 * * * * | active: true
-- - process-email-queue | */5 * * * * | active: true
-- =====================================================

