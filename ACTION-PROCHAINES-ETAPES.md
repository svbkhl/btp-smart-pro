# 🎯 Action - Prochaines Étapes

## ✅ Ce qui vient d'être fait

**Stripe Connect a été entièrement implémenté !**

- ✅ 2 Edge Functions créées (`stripe-create-account-link`, `stripe-connect-callback`)
- ✅ Frontend modifié (`ConnectWithStripe.tsx`)
- ✅ Page callback créée (`StripeCallback.tsx`)
- ✅ Route `/stripe-callback` ajoutée
- ✅ Build réussit
- ✅ 2 commits créés et prêts
- ✅ Documentation complète

---

## 🚀 Vos Actions (dans l'ordre)

### 1. Push Git (1 min)

```bash
cd "/Users/sabrikhalfallah/Downloads/BTP SMART PRO"
git push origin main
```

Cela va pousser 2 commits :
- `9e0b7ac` - Implémentation Stripe Connect
- `[nouveau]` - Documentation Stripe Connect

---

### 2. Configurer Stripe Dashboard (5 min)

**URL** : https://dashboard.stripe.com/settings/applications

**Actions** :
1. Cliquer "New application" (ou configurer existante)
2. **Type** : Sélectionner **"Express"** (recommandé)
3. **Redirect URI** : Ajouter `https://btpsmartpro.com/stripe-callback`
4. Sauvegarder

**Note** : Pour Express, pas besoin de CLIENT_ID/SECRET

---

### 3. Configurer Supabase Secrets (2 min)

**URL** : Supabase Dashboard → Project Settings → Edge Functions → Secrets

**Ajouter ces secrets** :

```bash
# Secret 1
Name: STRIPE_SECRET_KEY
Value: sk_test_xxxxx  # ou sk_live_ pour production

# Secret 2
Name: APP_URL
Value: https://btpsmartpro.com

# Secret 3 (si pas déjà fait)
Name: PUBLIC_URL
Value: https://btpsmartpro.com
```

**Où trouver STRIPE_SECRET_KEY** :
- https://dashboard.stripe.com/apikeys
- Utiliser `sk_test_` pour les tests d'abord
- Passer à `sk_live_` quand prêt pour production

---

### 4. Ajouter colonnes DB (1 min)

**URL** : Supabase Dashboard → SQL Editor

**Exécuter ce SQL** :

```sql
-- Ajouter les colonnes Stripe Connect si elles n'existent pas
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_connected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_details_submitted BOOLEAN DEFAULT false;

-- Vérifier que les colonnes ont été ajoutées
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_settings' 
AND column_name LIKE 'stripe%'
ORDER BY column_name;
```

**Résultat attendu** : 5 lignes affichées (stripe_account_id, stripe_charges_enabled, etc.)

---

### 5. Déployer Edge Functions (5 min)

**Terminal** :

```bash
cd "/Users/sabrikhalfallah/Downloads/BTP SMART PRO"

# Se connecter à Supabase (si pas déjà fait)
npx supabase login

# Lier le projet (si pas déjà fait)
npx supabase link --project-ref renmjmqlmafqjzldmsgs

# Déployer les 2 fonctions Stripe Connect
npx supabase functions deploy stripe-create-account-link
npx supabase functions deploy stripe-connect-callback
```

**Résultat attendu** : "Deployed Function" pour chaque fonction

---

### 6. Attendre Vercel (2-3 min)

Après le `git push`, Vercel va automatiquement :
1. Détecter le push
2. Lancer un nouveau build
3. Déployer en production

**Vérifier** : https://vercel.com → Votre projet → Deployments
**Status attendu** : "Ready" (vert)

---

### 7. Tester Stripe Connect (10 min)

#### Test 1 : Connexion

```
1. Aller sur https://btpsmartpro.com/settings
2. Section "Paiements"
3. Cliquer "Connecter mon compte Stripe"
4. Vérifier : redirection vers Stripe.com ✅
```

Si erreur "STRIPE_SECRET_KEY not configured" → Retour étape 3

#### Test 2 : Onboarding Stripe

```
Sur Stripe.com :
1. Se connecter avec email de test (ex: test@example.com)
   Ou créer un nouveau compte Stripe
2. Remplir les informations :
   - SIRET : 12345678900014 (test)
   - IBAN : FR1420041010050500013M02606 (test)
   - Adresse : n'importe quelle adresse
3. Valider le formulaire
4. Vérifier : redirect vers btpsmartpro.com/stripe-callback ✅
```

#### Test 3 : Page Callback

```
Sur /stripe-callback :
1. Vérifier : message "Votre compte Stripe est configuré" ✅
2. Vérifier : statut affiché (charges, payouts, details)
3. Attendre 3 secondes
4. Vérifier : redirect automatique vers /settings ✅
```

#### Test 4 : Vérifier DB

```sql
-- Dans Supabase SQL Editor
SELECT 
  user_id,
  stripe_account_id,
  stripe_connected,
  stripe_charges_enabled,
  stripe_payouts_enabled,
  stripe_details_submitted
FROM user_settings
WHERE stripe_account_id IS NOT NULL;
```

**Résultat attendu** : 1 ligne avec votre compte test

---

## 🎉 Si tous les tests passent

**Félicitations ! Stripe Connect est opérationnel.**

### Prochaines actions

1. **Tester avec plusieurs comptes** :
   - Créer 2-3 comptes test différents
   - Vérifier que chaque entreprise a son propre `stripe_account_id`

2. **Tester un paiement complet** :
   - Créer un devis
   - Le signer
   - Payer avec carte test (4242 4242 4242 4242)
   - Vérifier que l'argent va sur le bon compte Stripe

3. **Passer en production** :
   - Changer `STRIPE_SECRET_KEY` pour `sk_live_xxxxx`
   - Activer mode live dans Stripe Dashboard
   - Communiquer aux entreprises qu'elles peuvent connecter leur Stripe

---

## ⚠️ Dépannage

### Problème : "STRIPE_SECRET_KEY not configured"

**Solution** :
1. Vérifier Supabase Secrets (étape 3)
2. Attendre 1-2 minutes (propagation)
3. Réessayer

### Problème : "Missing authorization header"

**Solution** : Se déconnecter et se reconnecter

### Problème : Redirect vers localhost

**Solution** :
1. Vérifier `APP_URL=https://btpsmartpro.com` dans Supabase Secrets
2. Redéployer Edge Functions

### Problème : "Account link expired"

**Solution** : Normal si > 10 minutes. Recliquer sur "Connecter Stripe"

---

## 📚 Documentation

- **Guide complet** : `GUIDE-STRIPE-CONNECT-SETUP.md`
- **Résumé** : `STRIPE-CONNECT-SUMMARY.md`
- **Doc Stripe** : https://stripe.com/docs/connect/express-accounts

---

## ✅ Checklist Finale

### Avant Tests
- [ ] Git push effectué
- [ ] Vercel build "Ready"
- [ ] Application Stripe créée
- [ ] Redirect URI configuré
- [ ] Secrets Supabase configurés
- [ ] Colonnes DB ajoutées
- [ ] Edge Functions déployées

### Tests
- [ ] Connexion Stripe fonctionne
- [ ] Onboarding Stripe fonctionne
- [ ] Callback fonctionne
- [ ] DB mise à jour correctement

### Production (après tests OK)
- [ ] Mode live activé (`sk_live_`)
- [ ] Première entreprise réelle connectée
- [ ] Premier paiement réel traité

---

**🎯 Prochaine action immédiate : `git push origin main`**

Puis suivez les étapes 2-7 dans l'ordre.

Bonne chance ! 🚀
