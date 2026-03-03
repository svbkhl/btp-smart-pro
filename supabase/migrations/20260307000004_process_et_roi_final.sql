-- Process : enlever étapes 3 et 4, mettre uniquement "Appel de relance avant la fin de l'essai"
-- Fiche produit : Arguments ROI complets (50k, 728h/an, assistante 30k, vacances)

-- 1. Process
UPDATE public.closer_resources
SET content = replace(
  content,
  E'## Étape 3 : Suivi no-show\n- J+1 : SMS + email de relance\n- J+3 : Appel de rappel\n- J+7 : Dernière tentative + email "porte ouverte"\n\n## Étape 4 : Suivi post-démo sans closing\n- J+2 : Email récap avantages\n- J+7 : Appel de suivi\n- J+14 : Email offre limitée',
  E'- Appel de relance avant la fin de l''essai'
),
updated_at = now()
WHERE category = 'process'
  AND content LIKE '%Étape 3 : Suivi no-show%';

-- 2. Arguments ROI (fiche_produit) : remplacer l'ancien bloc par le nouveau
UPDATE public.closer_resources
SET content = replace(
  content,
  E'## Arguments ROI\n- 1 devis à 2000 € = abonnement annuel rentabilisé\n- Jusqu''à 14 h/semaine économisées sur la gestion administrative\n- 14 jours d''essai offerts, résiliation possible pendant l''essai',
  E'## Arguments ROI\n- 1 devis à 2000 € = abonnement annuel rentabilisé\n- Jusqu''à 50 000 € gagnés grâce aux relances auto devis & factures\n- 14 h/semaine = 728 h/an économisées (ou un outil pour ton assistante — poste à 30 k€/an en moins)\n- Avec cette économie temps + argent, tu peux même partir en vacances\n- 14 jours d''essai offerts, résiliation possible pendant l''essai'
),
updated_at = now()
WHERE category = 'fiche_produit'
  AND content LIKE '%Arguments ROI%'
  AND content LIKE '%14 h/semaine%';
