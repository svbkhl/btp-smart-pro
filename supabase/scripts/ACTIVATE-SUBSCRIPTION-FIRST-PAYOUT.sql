-- =====================================================
-- ACTIVER L'ABONNEMENT POUR L'ENTREPRISE "first payout"
-- =====================================================
-- Met le statut d'abonnement en actif (comme si payé).
-- À exécuter dans Supabase Dashboard → SQL Editor
-- =====================================================

DO $$
DECLARE
  v_company_id UUID;
  v_updated INT;
BEGIN
  -- Trouver l'entreprise "first payout" (insensible à la casse)
  SELECT id INTO v_company_id
  FROM public.companies
  WHERE LOWER(TRIM(name)) = LOWER('first payout')
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE NOTICE 'Aucune entreprise "first payout" trouvée.';
    RETURN;
  END IF;

  -- 1 mois d'essai puis 12 mois payants : current_period_end = trial_end + 1 an
  UPDATE public.companies
  SET
    subscription_status = 'active',
    trial_end = (NOW() + INTERVAL '30 days')::timestamptz,
    current_period_end = (NOW() + INTERVAL '30 days' + INTERVAL '1 year')::timestamptz,
    cancel_at_period_end = false
  WHERE id = v_company_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated > 0 THEN
    RAISE NOTICE '✅ Abonnement activé pour l''entreprise "first payout" (company_id: %)', v_company_id;
  ELSE
    RAISE NOTICE 'Aucune ligne mise à jour.';
  END IF;
END $$;

-- Vérification
SELECT
  id,
  name,
  subscription_status,
  trial_end,
  current_period_end,
  cancel_at_period_end
FROM public.companies
WHERE LOWER(TRIM(name)) = LOWER('first payout');
