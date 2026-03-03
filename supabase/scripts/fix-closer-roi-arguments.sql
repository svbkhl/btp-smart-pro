-- À exécuter dans Supabase → SQL Editor si la fiche produit affiche encore
-- "2 mois d'abonnement" ou "2h/semaine". Corrige les arguments ROI en base.
UPDATE public.closer_resources
SET content = replace(
  replace(
    replace(
      replace(
        replace(
          content,
          'Un seul devis récupéré rembourse 2 mois d''abonnement.',
          'Un devis à 2000 € rentabilise l''abonnement annuel.'
        ),
        '1 devis récupéré grâce aux relances auto = 2 mois d''abonnement remboursés',
        '1 devis à 2000 € = abonnement annuel rentabilisé'
      ),
      '1 devis récupéré grâce relances auto = 2 mois d''abonnement remboursés',
      '1 devis à 2000 € = abonnement annuel rentabilisé'
    ),
    '2h/semaine économisées sur la gestion administrative',
    'Jusqu''à 14 h/semaine économisées sur la gestion administrative'
  ),
  '2 h/semaine économisées sur la gestion administrative',
  'Jusqu''à 14 h/semaine économisées sur la gestion administrative'
),
updated_at = now()
WHERE category IN ('script_r2', 'fiche_produit')
  AND (
    content LIKE '%2 mois%abonnement%'
    OR content LIKE '%2h/semaine%'
    OR content LIKE '%2 h/semaine%'
  );
