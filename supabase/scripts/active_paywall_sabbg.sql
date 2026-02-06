-- Activer le paywall (page /start) pour le compte sabbg.du73100@gmail.com
-- À exécuter dans Supabase Dashboard → SQL Editor

UPDATE public.companies
SET stripe_onboarding_required = true
WHERE id IN (
  SELECT company_id FROM public.company_users
  WHERE user_id = (SELECT id FROM auth.users WHERE email = 'sabbg.du73100@gmail.com')
);
