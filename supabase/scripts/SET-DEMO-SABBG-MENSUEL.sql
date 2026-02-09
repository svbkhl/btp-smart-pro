-- =====================================================
-- PASSER LE COMPTE DÉMO sabbg.du73100@gmail.com EN MENSUEL
-- =====================================================
-- Met l'entreprise de cet utilisateur en abonnement actif
-- avec l'offre MENSUEL (engagement 1 an) pour tester la résiliation.
-- À exécuter dans Supabase Dashboard → SQL Editor
-- =====================================================
-- AVANT : Remplace la valeur ci-dessous par ton price_id Stripe MENSUEL
--         (même valeur que VITE_STRIPE_PRICE_ID_MENSUEL dans ton .env)
-- =====================================================

DO $$
DECLARE
  v_user_id UUID;
  v_company_id UUID;
  v_price_mensuel TEXT := 'REMPLACER_PAR_PRICE_ID_MENSUEL';  -- ← Remplace par ton price_xxx Stripe mensuel
  v_updated INT;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE LOWER(email) = LOWER('sabbg.du73100@gmail.com')
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur sabbg.du73100@gmail.com non trouvé.';
  END IF;

  -- Entreprise dont il est owner
  SELECT cu.company_id INTO v_company_id
  FROM public.company_users cu
  JOIN public.roles r ON r.id = cu.role_id
  WHERE cu.user_id = v_user_id
    AND r.slug = 'owner'
    AND cu.status = 'active'
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Aucune entreprise (owner) trouvée pour sabbg.du73100@gmail.com';
  END IF;

  IF v_price_mensuel = 'REMPLACER_PAR_PRICE_ID_MENSUEL' THEN
    RAISE NOTICE '⚠️ Remplace REMPLACER_PAR_PRICE_ID_MENSUEL par ton vrai price_id Stripe (ex: price_xxx) en tête du script, puis réexécute.';
    RETURN;
  END IF;

  -- Abo actif, 1 mois essai, fin de période = essai + 1 an (engagement mensuel)
  UPDATE public.companies
  SET
    subscription_status = 'active',
    trial_end = (NOW() + INTERVAL '30 days')::timestamptz,
    current_period_end = (NOW() + INTERVAL '30 days' + INTERVAL '1 year')::timestamptz,
    cancel_at_period_end = false,
    cancel_at = NULL,
    stripe_price_id = v_price_mensuel
  WHERE id = v_company_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated > 0 THEN
    RAISE NOTICE '✅ Compte démo passé en MENSUEL (company_id: %, stripe_price_id: %)', v_company_id, v_price_mensuel;
  ELSE
    RAISE NOTICE 'Aucune ligne mise à jour.';
  END IF;
END $$;

-- Vérification
SELECT
  c.id,
  c.name,
  c.subscription_status,
  c.trial_end,
  c.current_period_end,
  c.cancel_at,
  c.stripe_price_id
FROM public.companies c
WHERE c.id IN (
  SELECT cu.company_id
  FROM public.company_users cu
  JOIN public.roles r ON r.id = cu.role_id
  JOIN auth.users u ON u.id = cu.user_id
  WHERE LOWER(u.email) = LOWER('sabbg.du73100@gmail.com')
    AND r.slug = 'owner'
);
