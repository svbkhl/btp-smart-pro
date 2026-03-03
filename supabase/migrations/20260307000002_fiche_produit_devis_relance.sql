-- Ajouter "Devis récupérés grâce à la relance" dans Problèmes résolus (fiche produit)
UPDATE public.closer_resources
SET content = replace(
  content,
  E'| Impayés qui s''accumulent | Relances automatiques par email |\n| Planning manuel sur papier |',
  E'| Impayés qui s''accumulent | Relances automatiques par email |\n| Devis oubliés ou non signés | Devis récupérés grâce à la relance automatique |\n| Planning manuel sur papier |'
),
updated_at = now()
WHERE category = 'fiche_produit'
  AND content LIKE '%Impayés qui s''accumulent%'
  AND content NOT LIKE '%Devis récupérés grâce à la relance%';
