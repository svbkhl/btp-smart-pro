-- =====================================================
-- CONFIGURATION DES CRON JOBS POUR NOTIFICATIONS
-- =====================================================
-- Ce script configure les cron jobs pour exécuter
-- automatiquement les fonctions de notifications
-- =====================================================

-- =====================================================
-- 1. ACTIVER L'EXTENSION PG_CRON ET PG_NET
-- =====================================================

-- Vérifier si l'extension est déjà activée
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- =====================================================
-- 2. CONFIGURER LE CRON JOB POUR SMART-NOTIFICATIONS
-- =====================================================

-- Supprimer le cron job s'il existe déjà
SELECT cron.unschedule('smart-notifications-hourly') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'smart-notifications-hourly'
);

-- Créer le cron job pour exécuter smart-notifications toutes les heures
-- ⚠️ REMPLACEZ YOUR_SERVICE_ROLE_KEY par votre clé de service (2 fois dans le script)
SELECT cron.schedule(
  'smart-notifications-hourly',
  '0 * * * *', -- Toutes les heures à la minute 0
  $$
  SELECT net.http_post(
    url := 'https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/smart-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY' -- REMPLACEZ CECI
    ),
    body := '{}'::jsonb
  );
  $$
);

-- =====================================================
-- 3. CONFIGURER LE CRON JOB POUR PROCESS-EMAIL-QUEUE
-- =====================================================

-- Supprimer le cron job s'il existe déjà
SELECT cron.unschedule('process-email-queue') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-email-queue'
);

-- Créer le cron job pour traiter la queue d'emails toutes les 5 minutes
SELECT cron.schedule(
  'process-email-queue',
  '*/5 * * * *', -- Toutes les 5 minutes
  $$
  SELECT net.http_post(
    url := 'https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/process-email-queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY' -- REMPLACEZ CECI
    ),
    body := '{}'::jsonb
  );
  $$
);

-- =====================================================
-- 4. VÉRIFIER LES CRON JOBS
-- =====================================================

-- Afficher tous les cron jobs configurés
SELECT 
  jobid,
  jobname,
  schedule,
  active
FROM cron.job
WHERE jobname IN ('smart-notifications-hourly', 'process-email-queue');

-- =====================================================
-- INSTRUCTIONS IMPORTANTES
-- =====================================================

-- 1. REMPLACEZ YOUR_SERVICE_ROLE_KEY (2 fois dans le script) :
--    - Allez dans Supabase Dashboard → Settings → API
--    - Copiez la clé "service_role" (secret, longue chaîne commençant par eyJ...)
--    - ⚠️ NE PARTAGEZ JAMAIS CETTE CLÉ
--
-- 2. Le project_ref est déjà pré-rempli : renmjmqlmafqjzldmsgs
--
-- 3. Les cron jobs s'exécutent automatiquement selon le schedule :
--    - smart-notifications : toutes les heures
--    - process-email-queue : toutes les 5 minutes
--
-- 4. Vous pouvez vérifier les logs dans Supabase Dashboard → Logs → Postgres Logs

-- =====================================================
-- COMMANDES UTILES
-- =====================================================

-- Désactiver un cron job
-- SELECT cron.unschedule('smart-notifications-hourly');

-- Voir l'historique d'exécution
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- =====================================================
-- FIN DU SCRIPT
-- =====================================================

