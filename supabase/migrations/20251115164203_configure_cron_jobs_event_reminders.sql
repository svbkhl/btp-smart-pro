-- =====================================================
-- CONFIGURATION DU CRON JOB POUR LES RAPPELS D'ÉVÉNEMENTS
-- =====================================================

-- S'assurer que l'extension pg_cron est disponible
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Donner accès au schéma cron aux rôles standards
GRANT USAGE ON SCHEMA cron TO postgres, anon, authenticated, service_role;

-- Supprimer le cron job existant s'il existe
SELECT cron.unschedule('send-event-reminders');

-- Créer le cron job (toutes les 15 minutes) qui appelle l'Edge Function
SELECT cron.schedule(
  'send-event-reminders',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/send-event-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer cron-secret-2025-demo'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Vérifier que le cron job est bien enregistré
SELECT * FROM cron.job WHERE jobname = 'send-event-reminders';

