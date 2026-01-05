-- ============================================================================
-- 🗑️ SUPPRESSION COMPLÈTE DU COMPTE TEST
-- ============================================================================
-- Email: sabbg.du73100@gmail.com
-- Date: 2026-01-05
-- ============================================================================

DO $$
DECLARE
  v_user_id UUID;
  v_company_ids UUID[];
  v_company_id UUID;
BEGIN
  -- ============================================================================
  -- ÉTAPE 1 : Récupérer l'ID de l'utilisateur
  -- ============================================================================
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'sabbg.du73100@gmail.com';

  IF v_user_id IS NULL THEN
    RAISE NOTICE '❌ Utilisateur sabbg.du73100@gmail.com non trouvé';
    RETURN;
  END IF;

  RAISE NOTICE '✅ Utilisateur trouvé: %', v_user_id;

  -- ============================================================================
  -- ÉTAPE 2 : Récupérer les company_id de l'utilisateur
  -- ============================================================================
  SELECT ARRAY_AGG(DISTINCT company_id) INTO v_company_ids
  FROM public.company_users
  WHERE user_id = v_user_id;

  RAISE NOTICE '📋 Companies de l''utilisateur: %', v_company_ids;

  -- ============================================================================
  -- ÉTAPE 3 : Supprimer toutes les données business liées
  -- ============================================================================
  
  -- AI Messages (via conversations)
  DELETE FROM public.ai_messages
  WHERE conversation_id IN (
    SELECT id FROM public.ai_conversations WHERE user_id = v_user_id
  );
  RAISE NOTICE '✅ ai_messages supprimés';

  -- AI Conversations
  DELETE FROM public.ai_conversations WHERE user_id = v_user_id;
  RAISE NOTICE '✅ ai_conversations supprimés';

  -- Image Analysis
  DELETE FROM public.image_analysis WHERE user_id = v_user_id;
  RAISE NOTICE '✅ image_analysis supprimés';

  -- Maintenance Reminders
  DELETE FROM public.maintenance_reminders WHERE user_id = v_user_id;
  RAISE NOTICE '✅ maintenance_reminders supprimés';

  -- Notifications
  DELETE FROM public.notifications WHERE user_id = v_user_id;
  RAISE NOTICE '✅ notifications supprimées';

  -- Messages
  DELETE FROM public.messages WHERE user_id = v_user_id;
  RAISE NOTICE '✅ messages supprimés';

  -- Payments
  DELETE FROM public.payments WHERE user_id = v_user_id;
  RAISE NOTICE '✅ payments supprimés';

  -- Invoices
  DELETE FROM public.invoices WHERE user_id = v_user_id;
  RAISE NOTICE '✅ invoices supprimées';

  -- AI Quotes
  DELETE FROM public.ai_quotes WHERE user_id = v_user_id;
  RAISE NOTICE '✅ ai_quotes supprimés';

  -- Projects
  DELETE FROM public.projects WHERE user_id = v_user_id;
  RAISE NOTICE '✅ projects supprimés';

  -- Clients
  DELETE FROM public.clients WHERE user_id = v_user_id;
  RAISE NOTICE '✅ clients supprimés';

  -- User Stats
  DELETE FROM public.user_stats WHERE user_id = v_user_id;
  RAISE NOTICE '✅ user_stats supprimés';

  -- User Settings
  DELETE FROM public.user_settings WHERE user_id = v_user_id;
  RAISE NOTICE '✅ user_settings supprimés';

  -- User Roles
  DELETE FROM public.user_roles WHERE user_id = v_user_id;
  RAISE NOTICE '✅ user_roles supprimés';

  -- ============================================================================
  -- ÉTAPE 4 : Supprimer de company_users
  -- ============================================================================
  DELETE FROM public.company_users WHERE user_id = v_user_id;
  RAISE NOTICE '✅ company_users supprimés';

  -- ============================================================================
  -- ÉTAPE 5 : Supprimer les entreprises orphelines (si c'était le seul membre)
  -- ============================================================================
  IF v_company_ids IS NOT NULL THEN
    FOREACH v_company_id IN ARRAY v_company_ids
    LOOP
      -- Vérifier si l'entreprise a encore des membres
      IF NOT EXISTS (
        SELECT 1 FROM public.company_users WHERE company_id = v_company_id
      ) THEN
        -- Supprimer l'entreprise (cascade supprimera les invitations, etc.)
        DELETE FROM public.companies WHERE id = v_company_id;
        RAISE NOTICE '✅ Entreprise orpheline supprimée: %', v_company_id;
      END IF;
    END LOOP;
  END IF;

  -- ============================================================================
  -- ÉTAPE 6 : Supprimer l'utilisateur de auth.users (CASCADE)
  -- ============================================================================
  DELETE FROM auth.users WHERE id = v_user_id;
  RAISE NOTICE '✅ Utilisateur supprimé de auth.users';

  -- ============================================================================
  -- RAPPORT FINAL
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '🎉 COMPTE TEST COMPLÈTEMENT SUPPRIMÉ !';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE 'Email: sabbg.du73100@gmail.com';
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Toutes les données associées ont été supprimées';
  RAISE NOTICE '✅ Les entreprises orphelines ont été supprimées';
  RAISE NOTICE '✅ Le compte peut être recréé proprement';
  RAISE NOTICE '═══════════════════════════════════════════════════════';

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ ERREUR : %', SQLERRM;
    RAISE;
END $$;
