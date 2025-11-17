-- =====================================================
-- CONFIGURATION DU CRON JOB POUR LES RAPPELS D'ÉVÉNEMENTS
-- =====================================================
-- Ce script configure un cron job pour vérifier et envoyer
-- les rappels d'événements toutes les 15 minutes
-- =====================================================

-- IMPORTANT : Remplacez YOUR_PROJECT_REF et YOUR_SERVICE_ROLE_KEY
-- par vos vraies valeurs avant d'exécuter ce script

-- Supprimer le cron job existant s'il existe
SELECT cron.unschedule('send-event-reminders');

-- Créer le cron job pour vérifier les rappels toutes les 15 minutes
SELECT cron.schedule(
  'send-event-reminders',
  '*/15 * * * *', -- Toutes les 15 minutes
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-event-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Alternative : Si vous avez configuré CRON_SECRET, utilisez :
-- SELECT cron.schedule(
--   'send-event-reminders',
--   '*/15 * * * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-event-reminders',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer YOUR_CRON_SECRET'
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );

-- Vérifier que le cron job est créé
SELECT * FROM cron.job WHERE jobname = 'send-event-reminders';

-- =====================================================
-- NOTES
-- =====================================================
-- 
-- Fréquence recommandée : Toutes les 15 minutes
-- Cela permet de capturer les rappels avec précision
-- sans surcharger le système
--
-- Pour modifier la fréquence :
-- - '*/5 * * * *'  : Toutes les 5 minutes
-- - '*/15 * * * *' : Toutes les 15 minutes (recommandé)
-- - '*/30 * * * *' : Toutes les 30 minutes
-- - '0 * * * *'    : Toutes les heures
--
-- =====================================================


