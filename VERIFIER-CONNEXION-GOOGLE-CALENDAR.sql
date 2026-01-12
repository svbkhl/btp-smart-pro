-- ============================================================================
-- VÉRIFIER LA CONNEXION GOOGLE CALENDAR
-- ============================================================================
-- Ce script vérifie si Google Calendar est connecté pour votre entreprise
-- ============================================================================

-- Remplacez 'VOTRE_EMAIL@example.com' par votre email
DO $$
DECLARE
  user_email TEXT := 'sabri.khalfallah6@gmail.com'; -- ⚠️ MODIFIEZ ICI
  current_user_id UUID;
  current_company_id UUID;
  connection_record RECORD;
BEGIN
  -- Trouver l'utilisateur
  SELECT id INTO current_user_id
  FROM auth.users
  WHERE email = user_email
  LIMIT 1;
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION '❌ Aucun utilisateur trouvé avec l''email: %', user_email;
  END IF;
  
  RAISE NOTICE '✅ Utilisateur trouvé: %', current_user_id;
  
  -- Trouver l'entreprise
  SELECT company_id INTO current_company_id
  FROM public.company_users
  WHERE user_id = current_user_id
  LIMIT 1;
  
  IF current_company_id IS NULL THEN
    RAISE EXCEPTION '❌ Aucune entreprise trouvée pour cet utilisateur';
  END IF;
  
  RAISE NOTICE '✅ Entreprise trouvée: %', current_company_id;
  
  -- Vérifier la connexion Google Calendar
  SELECT * INTO connection_record
  FROM public.google_calendar_connections
  WHERE company_id = current_company_id
  LIMIT 1;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '📊 ÉTAT DE LA CONNEXION GOOGLE CALENDAR';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  
  IF connection_record IS NULL THEN
    RAISE NOTICE '❌ Aucune connexion Google Calendar trouvée';
    RAISE NOTICE '';
    RAISE NOTICE '💡 Pour connecter Google Calendar:';
    RAISE NOTICE '   1. Allez dans Paramètres > Intégrations';
    RAISE NOTICE '   2. Cliquez sur "Connecter Google Calendar"';
  ELSE
    RAISE NOTICE '✅ Connexion trouvée !';
    RAISE NOTICE '';
    RAISE NOTICE '📧 Compte Google: %', connection_record.google_email;
    RAISE NOTICE '📅 Calendrier: %', connection_record.calendar_name;
    RAISE NOTICE '🔄 Synchronisation: %', connection_record.sync_direction;
    RAISE NOTICE '✅ Activée: %', CASE WHEN connection_record.enabled THEN 'Oui' ELSE 'Non' END;
    
    IF connection_record.last_sync_at IS NOT NULL THEN
      RAISE NOTICE '🕐 Dernière sync: %', connection_record.last_sync_at;
    ELSE
      RAISE NOTICE '🕐 Dernière sync: Jamais';
    END IF;
    
    IF connection_record.expires_at IS NOT NULL THEN
      IF connection_record.expires_at::timestamp < now() THEN
        RAISE WARNING '⚠️  Le token a expiré le: %', connection_record.expires_at;
        RAISE NOTICE '💡 Reconnectez-vous pour renouveler le token';
      ELSE
        RAISE NOTICE '⏰ Token expire le: %', connection_record.expires_at;
      END IF;
    END IF;
    
    IF NOT connection_record.enabled THEN
      RAISE WARNING '⚠️  La connexion est désactivée';
      RAISE NOTICE '💡 Reconnectez-vous pour l''activer';
    END IF;
  END IF;
  
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  
END $$;
