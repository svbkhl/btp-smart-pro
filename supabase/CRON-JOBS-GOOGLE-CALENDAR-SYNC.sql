-- ============================================================================
-- ⏰ CRON JOBS POUR SYNCHRONISATION GOOGLE CALENDAR
-- ============================================================================
-- Description: Configure les tâches cron pour traiter la queue et sync incrémentale
-- ============================================================================

-- Prérequis: Extension pg_cron doit être activée
-- Vérifier: SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- ============================================================================
-- CRON 1: Traiter la queue de synchronisation (app → Google)
-- ============================================================================
-- Exécution: Toutes les 5 minutes
-- ============================================================================

-- Supprimer le cron existant si présent
SELECT cron.unschedule('process-google-calendar-sync-queue')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-google-calendar-sync-queue'
);

-- Créer le cron job
SELECT cron.schedule(
  'process-google-calendar-sync-queue',
  '*/5 * * * *', -- Toutes les 5 minutes
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/google-calendar-sync-processor',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- ============================================================================
-- CRON 2: Synchronisation incrémentale (Google → App)
-- ============================================================================
-- Exécution: Toutes les 15 minutes
-- ============================================================================

-- Supprimer le cron existant si présent
SELECT cron.unschedule('sync-google-calendar-incremental')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'sync-google-calendar-incremental'
);

-- Créer le cron job
SELECT cron.schedule(
  'sync-google-calendar-incremental',
  '*/15 * * * *', -- Toutes les 15 minutes
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/google-calendar-sync-incremental',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- ============================================================================
-- CRON 3: Nettoyer la queue (supprimer les entrées complétées anciennes)
-- ============================================================================
-- Exécution: Tous les jours à 2h du matin
-- ============================================================================

-- Supprimer le cron existant si présent
SELECT cron.unschedule('cleanup-google-calendar-sync-queue')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-google-calendar-sync-queue'
);

-- Créer le cron job
SELECT cron.schedule(
  'cleanup-google-calendar-sync-queue',
  '0 2 * * *', -- Tous les jours à 2h
  $$
  SELECT public.cleanup_google_calendar_sync_queue();
  $$
);

-- ============================================================================
-- CRON 4: Renouveler les webhooks expirés (avant expiration)
-- ============================================================================
-- Exécution: Tous les jours à 3h du matin
-- ============================================================================

-- Supprimer le cron existant si présent
SELECT cron.unschedule('renew-google-calendar-webhooks')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'renew-google-calendar-webhooks'
);

-- Créer le cron job
SELECT cron.schedule(
  'renew-google-calendar-webhooks',
  '0 3 * * *', -- Tous les jours à 3h
  $$
  -- Renouveler les webhooks qui expirent dans moins de 24h
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/google-calendar-watch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body := jsonb_build_object('company_id', w.company_id)
  ) AS request_id
  FROM public.google_calendar_webhooks w
  WHERE w.enabled = true
  AND w.expiration_timestamp < (EXTRACT(EPOCH FROM now())::BIGINT * 1000) + (24 * 60 * 60 * 1000)
  AND w.expiration_timestamp > EXTRACT(EPOCH FROM now())::BIGINT * 1000;
  $$
);

-- ============================================================================
-- CRON 5: Nettoyer les webhooks expirés
-- ============================================================================
-- Exécution: Tous les jours à 4h du matin
-- ============================================================================

-- Supprimer le cron existant si présent
SELECT cron.unschedule('cleanup-expired-google-webhooks')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-expired-google-webhooks'
);

-- Créer le cron job
SELECT cron.schedule(
  'cleanup-expired-google-webhooks',
  '0 4 * * *', -- Tous les jours à 4h
  $$
  SELECT public.cleanup_expired_google_webhooks();
  $$
);

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================

DO $$
DECLARE
  cron_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO cron_count
  FROM cron.job
  WHERE jobname IN (
    'process-google-calendar-sync-queue',
    'sync-google-calendar-incremental',
    'cleanup-google-calendar-sync-queue',
    'renew-google-calendar-webhooks',
    'cleanup-expired-google-webhooks'
  );
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ CRON JOBS GOOGLE CALENDAR SYNC CONFIGURÉS !';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Cron jobs créés: %', cron_count;
  RAISE NOTICE '';
  RAISE NOTICE '✅ process-google-calendar-sync-queue (toutes les 5 min)';
  RAISE NOTICE '✅ sync-google-calendar-incremental (toutes les 15 min)';
  RAISE NOTICE '✅ cleanup-google-calendar-sync-queue (quotidien 2h)';
  RAISE NOTICE '✅ renew-google-calendar-webhooks (quotidien 3h)';
  RAISE NOTICE '✅ cleanup-expired-google-webhooks (quotidien 4h)';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  
  IF cron_count < 5 THEN
    RAISE WARNING '⚠️ ATTENTION: Seulement % cron job(s) créé(s) sur 5 attendus', cron_count;
  END IF;
END $$;

-- ============================================================================
-- Voir tous les cron jobs
-- ============================================================================
-- SELECT jobid, jobname, schedule, command FROM cron.job 
-- WHERE jobname LIKE '%google-calendar%'
-- ORDER BY jobname;
