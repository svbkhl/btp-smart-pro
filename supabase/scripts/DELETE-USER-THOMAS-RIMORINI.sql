-- ============================================================================
-- Suppression : Thomas Rimorini (+ email contenant rimorini)
-- ============================================================================
-- À exécuter UNE FOIS dans Supabase Dashboard → SQL Editor (projet lié).
-- Recherche : email ILIKE %rimorini%, métadonnées auth, ou fiche employees.
-- ============================================================================

DO $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_deleted_count INTEGER;
BEGIN
  -- Cible principale : compte Auth
  SELECT id, email INTO v_user_id, v_user_email
  FROM auth.users
  WHERE email ILIKE '%rimorini%'
     OR COALESCE(raw_user_meta_data->>'full_name', '') ILIKE '%rimorini%'
     OR (
          COALESCE(raw_user_meta_data->>'first_name', '') ILIKE '%thomas%'
          AND COALESCE(raw_user_meta_data->>'last_name', '') ILIKE '%rimorini%'
        )
     OR (
          COALESCE(raw_user_meta_data->>'prenom', '') ILIKE '%thomas%'
          AND COALESCE(raw_user_meta_data->>'nom', '') ILIKE '%rimorini%'
        )
  ORDER BY created_at ASC
  LIMIT 1;

  -- Sinon : fiche employé
  IF v_user_id IS NULL THEN
    SELECT e.user_id INTO v_user_id
    FROM public.employees e
    WHERE (e.nom ILIKE '%rimorini%' AND e.prenom ILIKE '%thomas%')
       OR (e.prenom ILIKE '%rimorini%' AND e.nom ILIKE '%thomas%')
    LIMIT 1;
    IF v_user_id IS NOT NULL THEN
      SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
    END IF;
  END IF;

  -- Toujours retirer les invitations entreprise qui contiennent cet email
  DELETE FROM public.company_invites WHERE email ILIKE '%rimorini%';
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  IF v_deleted_count > 0 THEN
    RAISE NOTICE 'company_invites (email rimorini): % ligne(s) supprimée(s)', v_deleted_count;
  END IF;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Aucun utilisateur auth trouvé pour Thomas Rimorini / rimorini. Invitations company_invites nettoyées si présentes.';
    RETURN;
  END IF;

  RAISE NOTICE 'Cible: % (id: %)', COALESCE(v_user_email, '(sans email)'), v_user_id;

  UPDATE public.companies SET owner_id = NULL WHERE owner_id = v_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  IF v_deleted_count > 0 THEN
    RAISE NOTICE 'companies.owner_id mis à NULL: % ligne(s)', v_deleted_count;
  END IF;

  UPDATE public.company_invites SET accepted_by = NULL WHERE accepted_by = v_user_id;
  UPDATE public.company_invites SET invited_by = NULL WHERE invited_by = v_user_id;

  DELETE FROM public.company_users WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RAISE NOTICE 'company_users: %', v_deleted_count;

  DELETE FROM public.invitations WHERE user_id = v_user_id;
  UPDATE public.invitations SET invited_by = NULL WHERE invited_by = v_user_id;

  DELETE FROM public.employees WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RAISE NOTICE 'employees: %', v_deleted_count;

  DELETE FROM public.user_roles WHERE user_id = v_user_id;
  DELETE FROM public.user_stats WHERE user_id = v_user_id;
  DELETE FROM public.user_settings WHERE user_id = v_user_id;

  DELETE FROM public.google_calendar_connections WHERE owner_user_id = v_user_id;
  DELETE FROM public.notifications WHERE user_id = v_user_id;
  DELETE FROM public.email_queue WHERE user_id = v_user_id;
  DELETE FROM public.events WHERE user_id = v_user_id;

  DELETE FROM public.projects WHERE user_id = v_user_id;
  DELETE FROM public.clients WHERE user_id = v_user_id;
  DELETE FROM public.ai_quotes WHERE user_id = v_user_id;
  DELETE FROM public.invoices WHERE user_id = v_user_id;
  DELETE FROM public.payments WHERE user_id = v_user_id;

  DELETE FROM auth.users WHERE id = v_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  IF v_deleted_count > 0 THEN
    RAISE NOTICE 'auth.users supprimé OK.';
  ELSE
    RAISE NOTICE 'auth.users non supprimé (droits). Supprimez le compte dans Authentication → Users.';
  END IF;
END $$;
