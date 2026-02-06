# Guide : Paywall Stripe et choix de forfaits

Ce guide explique comment configurer le paywall Stripe pour les nouvelles entreprises et afficher plusieurs forfaits sur la page `/start`.

---

## 1. Vue d'ensemble du flux

| Étape | Description |
|-------|-------------|
| 1 | Utilisateur crée ou rejoint une **nouvelle entreprise** |
| 2 | À la première connexion → redirection vers `/start` (choix du forfait) |
| 3 | Utilisateur choisit un forfait (Pro, Business, etc.) |
| 4 | Redirection vers Stripe Checkout pour paiement / essai gratuit |
| 5 | Après souscription → accès à l'application |

**Entreprises existantes (avant migration)** : pas de paywall, comportement inchangé.

---

## 2. Migration base de données

### Exécuter la migration

Pour que les nouvelles entreprises soient obligées de choisir un forfait Stripe, la colonne `stripe_onboarding_required` doit exister.

**Option A – Supabase Dashboard (recommandé)**

1. Ouvrir [Supabase Dashboard](https://supabase.com/dashboard) → ton projet
2. Aller dans **SQL Editor**
3. Exécuter le contenu de `supabase/migrations/20260208000002_stripe_onboarding_required.sql` :

```sql
-- Ajouter la colonne
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS stripe_onboarding_required BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.companies.stripe_onboarding_required IS
  'Si true : première connexion impose choix forfait Stripe. Si false : entreprises legacy, pas de paywall.';

-- Anciennes entreprises → pas de paywall (legacy)
UPDATE public.companies
SET stripe_onboarding_required = false
WHERE stripe_onboarding_required = true;
```

**Option B – CLI Supabase**

```bash
supabase db push
# ou avec --include-all si des migrations sont en attente
```

---

## 3. Créer les offres dans Stripe

Si les offres SMART PRO ne sont pas encore dans ton compte Stripe, exécuter le script :

```bash
STRIPE_SECRET_KEY=sk_live_xxx npx tsx scripts/create-stripe-smart-pro-plans.ts
```

Ou avec npm :

```bash
STRIPE_SECRET_KEY=sk_live_xxx npm run stripe:create-plans
```

Le script crée :
- **SMART PRO – ANNUEL** : 1 788 € / an (30 jours d'essai)
- **SMART PRO – MENSUEL** : 199 € / mois (30 jours d'essai, engagement 12 mois)

En fin d'exécution, le script affiche les `price_id` à copier dans ton `.env`.

---

## 4. Configuration des forfaits Stripe

### Variables d'environnement

Dans `.env` (ou variables Vercel / Supabase Edge Functions), configurer :

#### A. Plusieurs forfaits (recommandé)

```env
VITE_STRIPE_PLANS=[{"label":"Pro Mensuel","price_id":"price_xxx","trial_days":14},{"label":"Pro Annuel","price_id":"price_yyy","trial_days":7},{"label":"Business","price_id":"price_zzz","trial_days":0}]
```

- `label` : nom affiché sur le bouton (ex. "Pro Mensuel", "Business")
- `price_id` : ID du prix Stripe (format `price_xxx`)
- `trial_days` : jours d’essai gratuit (0 = pas d’essai)

**Récupérer les `price_id`** : Stripe Dashboard → Produits → sélectionner un produit → copier l’ID du prix.

#### B. Un seul forfait

```env
VITE_STRIPE_PRICE_ID=price_xxx
```

Un plan « Pro » (14 jours d’essai) sera affiché par défaut.

#### C. Sans configuration

Sans `VITE_STRIPE_PLANS` ni `VITE_STRIPE_PRICE_ID`, seul le bouton « Démarrer l’essai gratuit » apparaît (plan par défaut si possible).

---

## 5. Tester le paywall

### Activer le paywall sur une entreprise existante (pour les tests)

Par défaut, les entreprises existantes ont `stripe_onboarding_required = false` (pas de paywall).

Pour tester avec ton entreprise actuelle :

```sql
UPDATE public.companies
SET stripe_onboarding_required = true
WHERE id IN (
  SELECT company_id FROM public.company_users
  WHERE user_id = (SELECT id FROM auth.users WHERE email = 'ton-email@exemple.com')
);
```

Remplace `ton-email@exemple.com` par ton email.

### Compte admin

Les comptes **admin système** (`is_system_admin = true` dans `user_metadata`) ne voient pas le paywall.

Pour tester le flux utilisateur normal, utiliser un compte non-admin.

---

## 6. Récapitulatif des fichiers

| Fichier | Rôle |
|---------|------|
| `supabase/migrations/20260208000002_stripe_onboarding_required.sql` | Ajout de la colonne et mise à jour des entreprises existantes |
| `src/hooks/useSubscription.ts` | Logique `isActive` : nouvelles entreprises → paywall si pas d’abo |
| `src/pages/Start.tsx` | Page de choix des forfaits et redirection Stripe |
| `src/config/stripePlans.ts` | Lecture de `VITE_STRIPE_PLANS` / `VITE_STRIPE_PRICE_ID` |
| `src/components/ProtectedRoute.tsx` | Redirection vers `/start` si pas d’abonnement actif |

---

## 7. Checklist de mise en service

- [ ] Offres créées dans Stripe (script `stripe:create-plans`)
- [ ] Migration SQL exécutée dans Supabase
- [ ] `VITE_STRIPE_PRICE_ID_ANNUEL` et `VITE_STRIPE_PRICE_ID_MENSUEL` dans `.env` (ou `VITE_STRIPE_PRICE_ID`)
- [ ] Variables Stripe configurées côté serveur (Edge Functions) : `STRIPE_SECRET_KEY`, `SITE_URL`
- [ ] Webhook Stripe configuré pour `stripe-billing-webhook`
- [ ] Test avec une entreprise de test (`stripe_onboarding_required = true`)
- [ ] Test avec un compte non-admin pour valider le flux complet

---

## 8. Exemple de `.env` complet

```env
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Stripe - Plans SMART PRO (après exécution du script create-stripe-smart-pro-plans)
VITE_STRIPE_PRICE_ID_ANNUEL=price_xxx
VITE_STRIPE_PRICE_ID_MENSUEL=price_yyy
```

---

## 9. Dépannage

| Problème | Solution |
|----------|----------|
| Page de paiement ne s'affiche pas | Vérifier que la migration est exécutée et que l’entreprise de test a `stripe_onboarding_required = true` |
| Un seul bouton "Démarrer l'essai gratuit" | Configurer `VITE_STRIPE_PLANS` ou `VITE_STRIPE_PRICE_ID` dans `.env` |
| Admin ne voit pas le paywall | Comportement normal : les admins système sont exclus |
| Erreur "column stripe_onboarding_required" | Exécuter la migration SQL dans Supabase |
| Redirection Stripe échoue | Vérifier `STRIPE_SECRET_KEY` et `SITE_URL` dans les secrets Supabase Edge Functions |
| Erreur CORS (localhost bloqué) | 1. Redéployer les Edge Functions : `supabase functions deploy stripe-billing-create-checkout` 2. Si `ALLOWED_ORIGINS` est défini dans Supabase, ajouter `http://localhost:4000` (ou ton port). La config par défaut autorise déjà localhost. |

---

## 10. Admin système (onglets Paramètres, guide)

Les onglets admin (Gestion Entreprises, Demandes de contact, Utilisateurs, Rôles, Config Entreprises, Mode démo) s’affichent pour les comptes admin. La détection repose sur :

1. **`is_system_admin`** dans les métadonnées JWT (`raw_user_meta_data`, `user_metadata`, `app_metadata`)
2. **Email dans la liste admin** (`sabri.khalfallah6@gmail.com` par défaut)

Pour rétablir les droits admin : exécuter `supabase/scripts/restore_admin_sabri.sql` dans le Supabase SQL Editor, puis se déconnecter/reconnecter.

Pour ajouter d’autres emails admin en production : configurer `VITE_ADMIN_EMAIL` ou `VITE_ADMIN_EMAILS` (séparés par des virgules) dans les variables d’environnement Vercel.

---

## 11. Case à cocher obligatoire et CGV

### Case à cocher avant checkout

Une case obligatoire est affichée avant les boutons de paiement :

> Je reconnais qu'à l'issue de la période d'essai, mon abonnement est engagé pour 12 mois et non résiliable avant échéance.

Sans cette case cochée → pas de checkout (boutons désactivés). Juridiquement solide pour l'engagement 12 mois.

### Clause CGV recommandée

Dans vos CGV, prévoir une clause du type :

> À l'issue de la période d'essai gratuite, toute souscription à l'offre mensuelle entraîne un engagement ferme de 12 mois. L'abonnement ne peut être résilié avant la fin de cette période, sauf manquement grave du service.
