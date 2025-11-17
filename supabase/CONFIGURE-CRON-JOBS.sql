-- =====================================================
-- CONFIGURATION DES CRON JOBS POUR NOTIFICATIONS
-- =====================================================
-- Ce script configure les cron jobs pour exécuter
-- automatiquement les fonctions de notifications
-- =====================================================

-- =====================================================
-- 1. ACTIVER L'EXTENSION PG_CRON
-- =====================================================

-- Vérifier si l'extension est déjà activée
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- =====================================================
-- 2. CONFIGURER LE CRON JOB POUR SMART-NOTIFICATIONS
-- =====================================================

-- Supprimer le cron job s'il existe déjà
SELECT cron.unschedule('smart-notifications-hourly') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'smart-notifications-hourly'
);

-- Créer le cron job pour exécuter smart-notifications toutes les heures
-- REMPLACEZ YOUR_PROJECT_REF par votre référence de projet Supabase
-- REMPLACEZ YOUR_SERVICE_ROLE_KEY par votre clé de service
SELECT cron.schedule(
  'smart-notifications-hourly',
  '0 * * * *', -- Toutes les heures à la minute 0
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/smart-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
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
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-email-queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
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
  command,
  nodename,
  nodeport,
  database,
  username,
  active
FROM cron.job
WHERE jobname IN ('smart-notifications-hourly', 'process-email-queue');

-- =====================================================
-- 5. OPTIONS DE SCHEDULE
-- =====================================================

-- Exemples de schedules possibles :
-- '0 * * * *'          - Toutes les heures à la minute 0
-- '*/30 * * * *'       - Toutes les 30 minutes
-- '0 */6 * * *'        - Toutes les 6 heures
-- '0 8 * * *'          - Tous les jours à 8h
-- '0 8 * * 1'          - Tous les lundis à 8h
-- '0 8 1 * *'          - Le 1er de chaque mois à 8h
-- '*/5 * * * *'        - Toutes les 5 minutes (pour process-email-queue)

-- =====================================================
-- 6. COMMANDES UTILES
-- =====================================================

-- Désactiver un cron job
-- SELECT cron.unschedule('smart-notifications-hourly');

-- Réactiver un cron job
-- UPDATE cron.job SET active = true WHERE jobname = 'smart-notifications-hourly';

-- Désactiver un cron job
-- UPDATE cron.job SET active = false WHERE jobname = 'smart-notifications-hourly';

-- Voir l'historique d'exécution
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- =====================================================
-- NOTES IMPORTANTES
-- =====================================================

-- 1. REMPLACEZ YOUR_PROJECT_REF :
--    - Trouvez votre référence de projet dans Supabase Dashboard
--    - Exemple : renmjmqlmafqjzldmsgs
--
-- 2. REMPLACEZ YOUR_SERVICE_ROLE_KEY :
--    - Allez dans Supabase Dashboard → Settings → API
--    - Copiez la clé "service_role" (secret)
--    - ⚠️ NE PARTAGEZ JAMAIS CETTE CLÉ
--
-- 3. Vérifiez que l'extension pg_net est activée :
--    CREATE EXTENSION IF NOT EXISTS pg_net;
--
-- 4. Les cron jobs s'exécutent automatiquement selon le schedule
--
-- 5. Vous pouvez vérifier les logs dans Supabase Dashboard → Logs → Postgres Logs

-- =====================================================
-- FIN DU SCRIPT
-- =====================================================

