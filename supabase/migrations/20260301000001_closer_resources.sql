-- Table pour les ressources partagées des closers (scripts, fiches, process)
CREATE TABLE IF NOT EXISTS public.closer_resources (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category text NOT NULL DEFAULT 'autre',
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.closer_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read closer_resources"
  ON public.closer_resources FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert closer_resources"
  ON public.closer_resources FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update closer_resources"
  ON public.closer_resources FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete closer_resources"
  ON public.closer_resources FOR DELETE TO authenticated USING (true);

-- Données initiales (idempotent)
INSERT INTO public.closer_resources (category, title, content, sort_order) VALUES
(
  'script_r1',
  'Script R1 — Premier appel',
  '## Objectif
Qualifier le prospect et décrocher un R2 démo.

## Accroche
"Bonjour [Prénom], je vous contacte car vous êtes dans le BTP et je voulais voir si BTP Smart Pro peut vous aider à gagner du temps sur vos devis et votre facturation."

## Questions de qualification
- Combien de personnes dans votre équipe ?
- Comment vous gérez vos devis actuellement ? (Excel, main, logiciel ?)
- Quel est votre volume de devis par mois ?
- Vous avez des problèmes de relances impayés ?

## Transition vers le R2
"Je vois que vous avez exactement le profil pour qui c''est fait. Je vous propose une démo de 30 minutes où je vous montre concrètement comment ça marche. Vous êtes dispo [proposer 2 créneaux] ?"

## Si objection "pas le temps"
"C''est justement fait pour ça — en 2 minutes vous générez un devis complet avec l''IA. Je vous montre ça en 30 min max."',
  0
),
(
  'script_r2',
  'Script R2 — Démo & Closing',
  '## Intro (2 min)
"Lors de notre dernier échange vous m''avez parlé de [problème principal]. Aujourd''hui je vais vous montrer exactement comment on règle ça."

## Plan de la démo (25 min)
1. **Dashboard Patron** — vue globale CA, chantiers, clients
2. **Devis IA** — taper une description, le devis se génère en 2 min
3. **Planning équipe** — affecter les ouvriers aux chantiers
4. **Facturation & relances auto** — plus besoin de courir après les paiements

## Closing (5 min)
"Vous commencez à voir comment ça peut changer votre quotidien ? Le plan Pro c''est 149€/mois, on vous offre 14 jours d''essai totalement gratuit. On démarre ensemble maintenant ?"

## Objections fréquentes
**"C''est trop cher"** → "Combien vous perdez par mois sur des devis qui ne sont pas relancés ? Un seul devis récupéré rembourse 2 mois d''abonnement."
**"Je dois en parler à mon associé"** → "Bien sûr, on peut planifier une démo avec les deux. Quand est-ce qu''il est dispo ?"
**"Je verrai plus tard"** → "Je comprends. L''offre d''essai 14j est disponible maintenant, après ce sera moins avantageux."',
  1
),
(
  'fiche_produit',
  'Fiche Produit — BTP Smart Pro',
  '## Qu''est-ce que c''est ?
Logiciel de gestion tout-en-un pensé pour les artisans et PME du BTP. Devis, facturation, planning, IA intégrée.

## Pour qui ?
- Artisans (maçon, plombier, électricien, charpentier, couvreur...)
- PME BTP de 1 à 50 salariés
- Patrons qui veulent digitaliser sans se compliquer la vie

## Problèmes résolus
| Problème | Solution BTP Smart Pro |
|---|---|
| Devis longs à faire | IA génère un devis en 2 min |
| Impayés qui s''accumulent | Relances automatiques par email |
| Planning manuel sur papier | Affectation ouvriers digitale |
| Compta en fin d''année | Export comptable intégré |

## Plans & Tarifs
- **Starter** : 79€/mois (annuel) — 99€/mois
- **Pro** : 149€/mois (annuel) — 199€/mois ⭐ Recommandé
- **Elite** : 229€/mois (annuel) — 299€/mois

## Arguments ROI
- 1 devis récupéré grâce aux relances auto = 2 mois d''abonnement remboursés
- 2h/semaine économisées sur la gestion administrative
- 14 jours d''essai offerts, résiliation possible pendant l''essai',
  2
),
(
  'process',
  'Process Commercial — R1 → R2 → Closing',
  '## Étape 1 : R1 — Qualification (10-15 min)
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

## Étape 3 : Suivi no-show
- J+1 : SMS + email de relance
- J+3 : Appel de rappel
- J+7 : Dernière tentative + email "porte ouverte"

## Étape 4 : Suivi post-démo sans closing
- J+2 : Email récap avantages
- J+7 : Appel de suivi
- J+14 : Email offre limitée',
  3
)
ON CONFLICT DO NOTHING;
