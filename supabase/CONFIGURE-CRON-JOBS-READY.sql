-- =====================================================
-- CONFIGURATION DES CRON JOBS - PRÊT À EXÉCUTER
-- =====================================================
-- Ce script configure les cron jobs pour exécuter
-- automatiquement les fonctions de notifications
-- 
-- ⚠️ IMPORTANT : Utilise le CRON_SECRET déjà configuré
-- Si vous préférez utiliser SERVICE_ROLE_KEY, utilisez CONFIGURE-CRON-JOBS-FINAL.sql
-- =====================================================

-- =====================================================
-- 1. ACTIVER L'EXTENSION PG_CRON ET PG_NET
-- =====================================================

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
-- ⚠️ REMPLACEZ 'YOUR_CRON_SECRET' par la valeur de votre CRON_SECRET
-- Vous pouvez la trouver dans Settings → Edge Functions → Secrets
SELECT cron.schedule(
  'smart-notifications-hourly',
  '0 * * * *', -- Toutes les heures à la minute 0
  $$
  SELECT net.http_post(
    url := 'https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/smart-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Alternative : Utiliser directement le secret (si vous connaissez sa valeur)
-- Remplacez 'votre-cron-secret-ici' par la valeur réelle de CRON_SECRET
/*
SELECT cron.schedule(
  'smart-notifications-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/smart-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer votre-cron-secret-ici'
    ),
    body := '{}'::jsonb
  );
  $$
);
*/

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
      'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Alternative : Utiliser directement le secret (si vous connaissez sa valeur)
-- Remplacez 'votre-cron-secret-ici' par la valeur réelle de CRON_SECRET
/*
SELECT cron.schedule(
  'process-email-queue',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/process-email-queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer votre-cron-secret-ici'
    ),
    body := '{}'::jsonb
  );
  $$
);
*/

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
-- INSTRUCTIONS
-- =====================================================
-- 
-- 1. Le script utilise current_setting() pour récupérer le CRON_SECRET
--    Si cela ne fonctionne pas, utilisez la version alternative (commentée)
--    et remplacez 'votre-cron-secret-ici' par la valeur réelle
--
-- 2. Pour trouver votre CRON_SECRET :
--    - Allez dans Supabase Dashboard → Settings → Edge Functions → Secrets
--    - Copiez la valeur de CRON_SECRET
--
-- 3. Les cron jobs s'exécutent automatiquement :
--    - smart-notifications : toutes les heures
--    - process-email-queue : toutes les 5 minutes
--
-- =====================================================

