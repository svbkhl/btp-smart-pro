# Stripe Billing B2B – Checklist & tests

## Modèle

- **1 company = 1 Stripe Customer = 1 Subscription**
- Essai gratuit : 14 jours (configurable)
- Accès app : paywall total (abonnement actif ou en essai requis)
- Rôles : **owner** et **member** uniquement (plus de rôle admin entreprise). Les owners invitent owners/members.

## Checklist Stripe Dashboard

### 1. Produit et prix

- [ ] Créer un produit (ex. « BTP Smart Pro »)
- [ ] Créer un prix récurrent (mensuel ou annuel) et noter l’ID (`price_xxx`)
- [ ] Définir la variable d’environnement **`VITE_STRIPE_PRICE_ID`** (frontend) avec ce `price_xxx`

### 2. Webhook Billing

- [ ] Stripe Dashboard → Developers → Webhooks → Add endpoint
- [ ] URL : `https://<PROJECT_REF>.supabase.co/functions/v1/stripe-billing-webhook`
- [ ] Événements à écouter :
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
- [ ] Récupérer le **Signing secret** (`whsec_xxx`)
- [ ] Définir **`STRIPE_BILLING_WEBHOOK_SECRET`** dans les secrets Supabase (Edge Functions)

### 3. Customer Portal

- [ ] Stripe Dashboard → Settings → Billing → Customer portal
- [ ] Activer le portail et configurer (gestion abonnement, factures, moyen de paiement, annulation en fin de période)

### 4. Variables d’environnement

**Supabase Edge Functions**

- `STRIPE_SECRET_KEY`
- `STRIPE_BILLING_WEBHOOK_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SITE_URL` (ex. `https://btpsmartpro.com`)

**Frontend (Vite)**

- `VITE_STRIPE_PRICE_ID` (ID du prix Stripe pour le checkout)
- `VITE_STRIPE_PLANS` (optionnel) : JSON array de plans pour les invitations, ex. `[{"label":"Pro Mensuel","price_id":"price_xxx","trial_days":14},{"label":"Pro Annuel","price_id":"price_yyy","trial_days":30}]`. Si absent, un seul plan est utilisé (label « Pro », `VITE_STRIPE_PRICE_ID`, 14 j. d’essai).

## Edge Functions

| Fonction | Rôle |
|----------|------|
| `stripe-billing-create-checkout` | Crée une session Stripe Checkout (abonnement + essai). Accepte `price_id`, `invitation_id` (optionnel, pour récupérer prix/essai depuis l’invitation), `trial_period_days` (optionnel). Réservé aux **owners**. |
| `stripe-billing-webhook` | Reçoit les webhooks Stripe, vérifie la signature, idempotence, met à jour `companies`. |
| `stripe-billing-portal` | Crée une session Customer Portal. Réservé aux **owners**. |

## Routes frontend

| Route | Description |
|------|-------------|
| `/start` | Paywall : souscription (owner) ou message « contacter le propriétaire » (member) / « rejoindre une entreprise » (sans company) |
| `/start/success` | Succès après checkout (lien dashboard + paramètres abonnement) |
| `/start/cancel` | Annulation checkout (lien /start et dashboard) |
| Paramètres → onglet **Abonnement** | Statut, essai, période, bouton « Gérer l’abonnement » (portail Stripe) |

## Comportement (tests manuels suggérés)

1. **Paywall**
   - Utilisateur connecté, company sans abonnement actif → redirection vers `/start`.
   - Sur `/start` : owner voit CTA « Démarrer l’essai gratuit », member voit « Contacter le propriétaire », sans company « Rejoignez une entreprise ».

2. **Checkout**
   - Owner clique « Démarrer l’essai gratuit » → appel `stripe-billing-create-checkout` avec `price_id` → redirection Stripe Checkout (essai 14j).
   - Après paiement → redirection `/start/success`.
   - Après annulation → redirection `/start/cancel`.

3. **Webhook**
   - Après `checkout.session.completed` (et événements subscription/invoice), `companies` doit avoir : `stripe_customer_id`, `stripe_subscription_id`, `subscription_status` (ex. `trialing` puis `active`), `trial_end`, `current_period_end`.

4. **Accès app**
   - Statut `trialing` ou `active` → accès normal (pas de redirection vers `/start`).
   - Statut `canceled` / `past_due` / etc. → redirection vers `/start` (sauf sur `/start`, `/start/success`, `/start/cancel`).

5. **Portail**
   - Paramètres → Abonnement → « Gérer l’abonnement » → appel `stripe-billing-portal` → redirection Stripe Customer Portal, return_url vers `?tab=billing`.

6. **Annulation en fin de période**
   - Dans Stripe (portail ou API), annulation en fin de période → webhook `customer.subscription.updated` avec `cancel_at_period_end: true` → `companies.cancel_at_period_end` à jour ; accès conservé jusqu’à `current_period_end`.

7. **Invitations avec offre / prix / essai**
   - Avant d’envoyer une invitation, l’owner choisit **l’offre** (plan), le **prix** et la **période d’essai** dans le dialogue « Inviter un employé » (liste des plans depuis `VITE_STRIPE_PLANS` ou défaut).
   - L’invitation est créée avec `stripe_price_id`, `trial_days`, `offer_label` (table `invitations`).
   - Après acceptation d’invitation : redirection vers `/start?invitation_id=xxx` (ou vers `/auth?invitation_id=xxx` puis après login vers `/start?invitation_id=xxx`).
   - Sur `/start`, si `invitation_id` est présent, le checkout utilise l’offre et la période d’essai de l’invitation (sans choisir à nouveau le plan).

## Résumé technique

- **Migrations** : `20260206000001_stripe_billing_and_roles.sql` (colonnes Stripe sur `companies`, `stripe_webhook_events`, rôles owner/member) ; `20260206000002_invitations_offer_price_trial.sql` (colonnes `stripe_price_id`, `trial_days`, `offer_label` sur `invitations`).
- **Gate** : `ProtectedRoute` + `useSubscription` ; si pas sur `/start` (ou success/cancel) et (pas de company ou abonnement inactif) → redirect `/start`.
- **Données abonnement** : hook `useSubscription` (lecture `companies.subscription_status`, `trial_end`, `current_period_end`, `cancel_at_period_end`, `stripe_customer_id`).
