# 🚀 ACTION IMMÉDIATE - Stripe Connect OAuth

## ✅ Qu'est-ce qui a été fait ?

**Problème** : L'onglet Stripe affichait des champs pour copier/coller les clés API (sk_live_, pk_live_)

**Solution** : Remplacé par un bouton OAuth "Connecter mon compte Stripe" (email + mot de passe)

---

## 🔧 Modifications Effectuées

### Frontend
- ✅ `Settings.tsx` : Remplacé `PaymentProviderSettings` → `StripeSettings`
- ✅ Supprimé l'import inutile de `PaymentProviderSettings`

### Backend
- ✅ Edge Functions déjà en place :
  - `stripe-create-account-link` : Crée le lien OAuth Stripe
  - `stripe-connect-callback` : Vérifie le statut après connexion
- ✅ `StripeCallback.tsx` : Page de retour après OAuth

### Database
- ✅ Migration SQL créée : `add_stripe_connect_columns.sql`
  - Ajoute les colonnes Stripe à `user_settings`

---

## 🚀 Déployer Maintenant

### 1️⃣ Pousser le Code

```bash
git add .
git commit -m "feat: Implémenter Stripe Connect OAuth (email/mdp) au lieu de clés API"
git push origin main
```

✅ Vercel va automatiquement déployer.

---

### 2️⃣ Exécuter la Migration SQL

**Option A** : Via Supabase Dashboard (plus simple)

1. Aller sur https://supabase.com/dashboard
2. Sélectionner votre projet
3. **SQL Editor** (menu gauche)
4. Copier le contenu de `supabase/migrations/add_stripe_connect_columns.sql`
5. Cliquer sur **Run**

**Option B** : Via CLI

```bash
npx supabase db push
```

---

### 3️⃣ Configurer les Secrets

#### Supabase

```bash
# Se connecter
npx supabase login

# Lier le projet
npx supabase link --project-ref YOUR_PROJECT_REF

# Ajouter la clé Stripe (VOTRE compte principal)
npx supabase secrets set STRIPE_SECRET_KEY=sk_live_...

# Ajouter l'URL de l'app
npx supabase secrets set APP_URL=https://btpsmartpro.com
npx supabase secrets set PUBLIC_URL=https://btpsmartpro.com
```

#### Vercel (si pas déjà fait)

```bash
# Aller sur Vercel Dashboard → Settings → Environment Variables
# Ajouter :
STRIPE_SECRET_KEY=sk_live_...
APP_URL=https://btpsmartpro.com
PUBLIC_URL=https://btpsmartpro.com
```

---

### 4️⃣ Déployer les Edge Functions

```bash
# Déployer les 2 Edge Functions Stripe
npx supabase functions deploy stripe-create-account-link
npx supabase functions deploy stripe-connect-callback

# Vérifier que tout est OK
npx supabase functions list
```

---

### 5️⃣ Tester le Flow

1. ✅ Aller sur **https://btpsmartpro.com/settings**
2. ✅ Cliquer sur l'onglet **Stripe**
3. ✅ Vérifier que vous voyez un bouton **"Connecter mon compte Stripe"** (pas de champs input)
4. ✅ Cliquer dessus
5. ✅ Être redirigé vers **Stripe.com**
6. ✅ Se connecter avec email/mot de passe Stripe
7. ✅ Compléter l'onboarding
8. ✅ Être redirigé vers `/stripe-callback`
9. ✅ Voir le statut de connexion
10. ✅ Être redirigé vers `/settings`
11. ✅ Voir "Stripe Connect activé" avec l'ID du compte

---

## 🎯 Résumé Ultra-Rapide

```bash
# 1. Pousser
git add . && git commit -m "feat: Stripe OAuth" && git push origin main

# 2. Migration SQL (Dashboard Supabase)
# Copier/coller supabase/migrations/add_stripe_connect_columns.sql

# 3. Secrets Supabase
npx supabase secrets set STRIPE_SECRET_KEY=sk_live_...
npx supabase secrets set APP_URL=https://btpsmartpro.com

# 4. Déployer Edge Functions
npx supabase functions deploy stripe-create-account-link
npx supabase functions deploy stripe-connect-callback

# 5. Tester
# Aller sur btpsmartpro.com/settings → onglet Stripe
```

---

## ✅ Checklist

- [ ] Code poussé sur GitHub
- [ ] Vercel déployé automatiquement
- [ ] Migration SQL exécutée
- [ ] Secrets Supabase configurés
- [ ] Edge Functions déployées
- [ ] Test en production réussi

---

## 🐛 Si Problème

### Le bouton ne s'affiche pas

```bash
# Vérifier que le build Vercel a réussi
# Dashboard Vercel → Deployments → Dernier déploiement
```

### Erreur "STRIPE_SECRET_KEY not configured"

```bash
# Vérifier les secrets
npx supabase secrets list

# Si manquant
npx supabase secrets set STRIPE_SECRET_KEY=sk_live_...
```

### Redirect Loop

```bash
# Vérifier APP_URL dans Vercel et Supabase
# Doit être : https://btpsmartpro.com (sans trailing slash)
```

---

**Temps total** : ~10 minutes ⏱️

**Résultat** : OAuth Stripe fonctionnel, pas de clés API à gérer ✅
