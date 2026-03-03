-- Rétablir le Process Commercial avec la vraie Étape 2 (R2 — Démo), pas "Suivi post-démo"
UPDATE public.closer_resources
SET content = '## Étape 1 : R1 — Qualification (10-15 min)
**Objectif** : Qualifier + poser le R2
**KPI cible** : Taux de R2 posé > 60%

Checklist R1 :
- [ ] Prénom / nom / entreprise
- [ ] Taille équipe
- [ ] Volume devis mensuel
- [ ] Logiciel actuel
- [ ] Douleur principale
- [ ] R2 daté dans l''agenda

## Étape 2 : R2 — Démo (30 min)
**Objectif** : Montrer la valeur + closer
**KPI cible** : Taux de closing > 30%

Checklist R2 :
- [ ] Rappeler le problème identifié en R1
- [ ] Démo patron (15 min)
- [ ] Démo employé si pertinent (5 min)
- [ ] Proposer le plan adapté
- [ ] Lancer l''essai en direct

- Appel de relance avant la fin de l''essai',
updated_at = now()
WHERE category = 'process'
  AND title = 'Process Commercial — R1 → R2 → Closing';
