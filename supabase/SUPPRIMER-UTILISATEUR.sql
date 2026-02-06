-- =====================================================
-- SUPPRESSION DÉFINITIVE : sabbg.du73100@gmail.com
-- =====================================================
-- Supprime toutes les données (public + auth) pour ce compte.
-- Exécuter dans Supabase Dashboard → SQL Editor (une seule fois).
-- =====================================================

DO $$
DECLARE
  v_user_email TEXT := 'sabbg.du73100@gmail.com';
  v_user_id UUID;
  v_deleted_count INTEGER;
BEGIN
  -- Récupérer l'user_id depuis auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_user_email;
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE '❌ Utilisateur non trouvé avec l''email: %', v_user_email;
    RETURN;
  END IF;
  
  RAISE NOTICE '✅ Utilisateur trouvé: % (ID: %)', v_user_email, v_user_id;
  RAISE NOTICE '🗑️  Suppression des données associées...';
  
  -- company_invites : retirer accepted_by pour éviter FK avant suppression auth
  UPDATE public.company_invites SET accepted_by = NULL WHERE accepted_by = v_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  IF v_deleted_count > 0 THEN
    RAISE NOTICE '   - company_invites (accepted_by): % lignes mises à jour', v_deleted_count;
  END IF;
  
  -- Supprimer dans company_users
  DELETE FROM public.company_users WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RAISE NOTICE '   - company_users: % lignes supprimées', v_deleted_count;
  
  -- Supprimer dans invitations (en tant qu'invité)
  DELETE FROM public.invitations WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RAISE NOTICE '   - invitations (en tant qu''invité): % lignes supprimées', v_deleted_count;
  
  -- Supprimer dans invitations (en tant qu'inviteur) - mettre invited_by à NULL
  UPDATE public.invitations SET invited_by = NULL WHERE invited_by = v_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RAISE NOTICE '   - invitations (en tant qu''inviteur): % lignes mises à jour', v_deleted_count;
  
  -- Supprimer dans employees
  DELETE FROM public.employees WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RAISE NOTICE '   - employees: % lignes supprimées', v_deleted_count;
  
  -- Supprimer dans user_roles
  DELETE FROM public.user_roles WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RAISE NOTICE '   - user_roles: % lignes supprimées', v_deleted_count;
  
  -- Supprimer dans user_stats
  DELETE FROM public.user_stats WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RAISE NOTICE '   - user_stats: % lignes supprimées', v_deleted_count;
  
  -- Supprimer dans user_settings
  DELETE FROM public.user_settings WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RAISE NOTICE '   - user_settings: % lignes supprimées', v_deleted_count;
  
  -- Supprimer dans google_calendar_connections
  DELETE FROM public.google_calendar_connections WHERE owner_user_id = v_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RAISE NOTICE '   - google_calendar_connections: % lignes supprimées', v_deleted_count;
  
  -- Supprimer dans notifications
  DELETE FROM public.notifications WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RAISE NOTICE '   - notifications: % lignes supprimées', v_deleted_count;
  
  -- Supprimer dans email_queue
  DELETE FROM public.email_queue WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RAISE NOTICE '   - email_queue: % lignes supprimées', v_deleted_count;
  
  -- Supprimer dans events
  DELETE FROM public.events WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RAISE NOTICE '   - events: % lignes supprimées', v_deleted_count;
  
  -- Supprimer dans projects (si user_id existe)
  DELETE FROM public.projects WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  IF v_deleted_count > 0 THEN
    RAISE NOTICE '   - projects: % lignes supprimées', v_deleted_count;
  END IF;
  
  -- Supprimer dans clients (si user_id existe)
  DELETE FROM public.clients WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  IF v_deleted_count > 0 THEN
    RAISE NOTICE '   - clients: % lignes supprimées', v_deleted_count;
  END IF;
  
  -- Supprimer dans ai_quotes (si user_id existe)
  DELETE FROM public.ai_quotes WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  IF v_deleted_count > 0 THEN
    RAISE NOTICE '   - ai_quotes: % lignes supprimées', v_deleted_count;
  END IF;
  
  -- Supprimer dans invoices (si user_id existe)
  DELETE FROM public.invoices WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  IF v_deleted_count > 0 THEN
    RAISE NOTICE '   - invoices: % lignes supprimées', v_deleted_count;
  END IF;
  
  -- Supprimer dans payments (si user_id existe)
  DELETE FROM public.payments WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  IF v_deleted_count > 0 THEN
    RAISE NOTICE '   - payments: % lignes supprimées', v_deleted_count;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Nettoyage des données publiques terminé pour: %', v_user_email;
  RAISE NOTICE '🗑️  Suppression du compte Auth...';
  
  -- Suppression définitive dans auth.users (compte de connexion)
  DELETE FROM auth.users WHERE id = v_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  IF v_deleted_count > 0 THEN
    RAISE NOTICE '✅ Compte Auth supprimé définitivement: %', v_user_email;
  ELSE
    RAISE NOTICE '⚠️  auth.users non modifié (droits insuffisants). Supprimez manuellement:';
    RAISE NOTICE '   Dashboard → Authentication → Users → chercher % → Supprimer', v_user_email;
    RAISE NOTICE '   User ID: %', v_user_id;
  END IF;
  RAISE NOTICE '';
END $$;
