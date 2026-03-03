-- Mise à jour des arguments ROI : un devis à 2000 € rentabilise l'abonnement annuel (pas 2 mois)
-- + jusqu'à 14 h/semaine économisées (au lieu de 2h/semaine)
UPDATE public.closer_resources
SET content = replace(
  replace(
    replace(
      content,
      'Un seul devis récupéré rembourse 2 mois d''abonnement.',
      'Un devis à 2000 € rentabilise l''abonnement annuel.'
    ),
    '1 devis récupéré grâce aux relances auto = 2 mois d''abonnement remboursés',
    '1 devis à 2000 € = abonnement annuel rentabilisé'
  ),
  '2h/semaine économisées sur la gestion administrative',
  'Jusqu''à 14 h/semaine économisées sur la gestion administrative'
),
updated_at = now()
WHERE category IN ('script_r2', 'fiche_produit')
  AND (
    content LIKE '%2 mois d''abonnement%'
    OR content LIKE '%2h/semaine économisées%'
  );
