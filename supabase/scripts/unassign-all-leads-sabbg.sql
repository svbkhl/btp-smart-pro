-- Désassigner tous les leads de sabbg.du73100@gmail.com (on repart propre).
-- Les leads restent en base et redeviennent disponibles (NEW, sans owner).

UPDATE public.leads
SET owner_id = NULL
WHERE owner_id = (
  SELECT id FROM auth.users WHERE LOWER(email) = LOWER('sabbg.du73100@gmail.com') LIMIT 1
);

-- Optionnel : afficher le nombre de leads désassignés
-- SELECT COUNT(*) FROM public.leads WHERE owner_id IS NULL AND ... ;
