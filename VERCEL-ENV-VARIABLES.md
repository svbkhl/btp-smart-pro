# 🔐 Variables d'Environnement Vercel

## 📋 Copie-Colle cette liste dans Vercel

Quand tu es sur la page de déploiement Vercel, clique sur **"Environment Variables"** et ajoute **TOUTES** ces variables :

---

## ✅ Variables OBLIGATOIRES (Minimum pour que ça fonctionne)

### Supabase
```
VITE_SUPABASE_URL
```
**Valeur** : `https://ton-projet.supabase.co`  
**Où trouver** : Supabase Dashboard → Settings → API → Project URL

```
VITE_SUPABASE_PUBLISHABLE_KEY
```
**Valeur** : `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`  
**Où trouver** : Supabase Dashboard → Settings → API → anon public key

### URLs de Production
```
PUBLIC_URL
```
**Valeur** : `https://ton-domaine.vercel.app`  
**Note** : Remplace par l'URL que Vercel te donnera après le déploiement

```
PRODUCTION_URL
```
**Valeur** : `https://ton-domaine.vercel.app`  
**Note** : Même URL que PUBLIC_URL

```
VITE_PUBLIC_URL
```
**Valeur** : `https://ton-domaine.vercel.app`  
**Note** : Même URL que PUBLIC_URL

---

## 🔧 Variables SUPABASE EDGE FUNCTIONS (pour les fonctions serveur)

Ces variables sont automatiquement injectées par Vercel si tu connectes Supabase, mais tu peux les ajouter manuellement :

```
SUPABASE_URL
```
**Valeur** : Même que `VITE_SUPABASE_URL`

```
SUPABASE_ANON_KEY
```
**Valeur** : Même que `VITE_SUPABASE_PUBLISHABLE_KEY`

```
SUPABASE_SERVICE_ROLE_KEY
```
**Valeur** : `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (service_role)  
**Où trouver** : Supabase Dashboard → Settings → API → service_role key  
**⚠️ SECRET** : Ne partage jamais cette clé !

---

## 📧 Variables EMAIL (si tu utilises l'envoi d'emails)

```
RESEND_API_KEY
```
**Valeur** : `re_xxxxxxxxxxxxx`  
**Où trouver** : https://resend.com/api-keys

```
ADMIN_EMAIL
```
**Valeur** : `ton-email@example.com`  
**Note** : Email de l'administrateur pour recevoir les notifications

---

## 💳 Variables STRIPE (si tu utilises Stripe)

```
VITE_STRIPE_PUBLISHABLE_KEY
```
**Valeur** : `pk_live_xxxxxxxxxxxxx` ou `pk_test_xxxxxxxxxxxxx`  
**Où trouver** : https://dashboard.stripe.com/apikeys

```
STRIPE_SECRET_KEY
```
**Valeur** : `sk_live_xxxxxxxxxxxxx` ou `sk_test_xxxxxxxxxxxxx`  
**Où trouver** : https://dashboard.stripe.com/apikeys  
**⚠️ SECRET** : Ne partage jamais cette clé !

```
STRIPE_WEBHOOK_SECRET
```
**Valeur** : `whsec_xxxxxxxxxxxxx`  
**Où trouver** : https://dashboard.stripe.com/webhooks → Créer un webhook → Copier le Signing secret

---

## 🔐 Variables OAUTH (si tu utilises OAuth)

### GitHub
```
GITHUB_CLIENT_ID
```
**Valeur** : `Iv1.xxxxxxxxxxxxx`  
**Où trouver** : https://github.com/settings/developers

```
GITHUB_CLIENT_SECRET
```
**Valeur** : `xxxxxxxxxxxxx`  
**Où trouver** : https://github.com/settings/developers  
**⚠️ SECRET** : Ne partage jamais cette clé !

### Google
```
GOOGLE_CLIENT_ID
```
**Valeur** : `xxxxxxxxxxxxx.apps.googleusercontent.com`  
**Où trouver** : https://console.cloud.google.com/apis/credentials

```
GOOGLE_CLIENT_SECRET
```
**Valeur** : `xxxxxxxxxxxxx`  
**Où trouver** : https://console.cloud.google.com/apis/credentials  
**⚠️ SECRET** : Ne partage jamais cette clé !

---

## 🎭 Variables OPTIONNELLES

### Mode Démo
```
VITE_FAKE_DATA
```
**Valeur** : `false` (ou `true` pour activer le mode démo)  
**Note** : Laisse à `false` en production

```
VITE_APP_DEMO
```
**Valeur** : `false` (ou `true` pour activer le mode démo)  
**Note** : Laisse à `false` en production

### Node Environment
```
NODE_ENV
```
**Valeur** : `production`  
**Note** : Vercel le définit automatiquement, mais tu peux l'ajouter manuellement

---

## 📝 Instructions pour Ajouter dans Vercel

1. **Sur la page de déploiement**, clique sur **"Environment Variables"**
2. **Clique sur "Add"** pour chaque variable
3. **Nom** : Copie le nom exact (ex: `VITE_SUPABASE_URL`)
4. **Valeur** : Copie la valeur correspondante
5. **Environments** : Coche **Production**, **Preview**, et **Development**
6. **Clique sur "Save"**

---

## ✅ Checklist Minimum

Pour que l'application fonctionne, tu dois **au minimum** ajouter :

- [ ] `VITE_SUPABASE_URL`
- [ ] `VITE_SUPABASE_PUBLISHABLE_KEY`
- [ ] `PUBLIC_URL` (après le premier déploiement)
- [ ] `PRODUCTION_URL` (après le premier déploiement)
- [ ] `VITE_PUBLIC_URL` (après le premier déploiement)

**Note** : Pour `PUBLIC_URL`, `PRODUCTION_URL`, et `VITE_PUBLIC_URL`, tu peux d'abord mettre une URL temporaire, puis la mettre à jour après le premier déploiement avec l'URL réelle que Vercel te donnera.

---

## 🚀 Après le Déploiement

1. **Récupère l'URL** que Vercel te donne (ex: `https://btp-smart-pro-xxx.vercel.app`)
2. **Va dans Vercel Dashboard** → Ton projet → **Settings** → **Environment Variables**
3. **Mets à jour** `PUBLIC_URL`, `PRODUCTION_URL`, et `VITE_PUBLIC_URL` avec la vraie URL
4. **Redéploie** (Vercel redéploie automatiquement quand tu changes les variables)

---

## 💡 Astuce

Tu peux d'abord déployer avec **juste les 3 variables Supabase**, puis ajouter les autres progressivement selon tes besoins.

