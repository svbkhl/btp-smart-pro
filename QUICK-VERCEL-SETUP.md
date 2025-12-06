# ⚡ Configuration Vercel - Guide Rapide

## 🎯 Étapes Rapides

### 1. Sur la page Vercel "New Project"

#### Build and Output Settings
- **Build Command** : `npm run build` ✅ (déjà configuré)
- **Output Directory** : `dist` ✅ (déjà configuré)
- **Install Command** : `npm install` ✅ (déjà configuré)

### 2. Environment Variables (CLIQUE ICI !)

Clique sur **"Environment Variables"** et ajoute ces 3 variables **minimum** :

```
VITE_SUPABASE_URL = https://renmjmqlmafqjzldmsgs.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY = (ta clé anon depuis Supabase)
PUBLIC_URL = https://btp-smart-pro-temp.vercel.app
PRODUCTION_URL = https://btp-smart-pro-temp.vercel.app
VITE_PUBLIC_URL = https://btp-smart-pro-temp.vercel.app
```

**⚠️ Note** : Pour `PUBLIC_URL`, mets une URL temporaire pour l'instant. Tu la mettras à jour après le déploiement avec la vraie URL.

### 3. Clique sur "Deploy"

### 4. Après le déploiement

1. **Copie l'URL** que Vercel te donne (ex: `https://btp-smart-pro-abc123.vercel.app`)
2. **Va dans Vercel Dashboard** → Ton projet → **Settings** → **Environment Variables**
3. **Mets à jour** les 3 variables `PUBLIC_URL`, `PRODUCTION_URL`, `VITE_PUBLIC_URL` avec la vraie URL
4. **Vercel redéploie automatiquement** 🎉

---

## 📋 Où trouver les valeurs Supabase ?

1. Va sur https://supabase.com/dashboard
2. Sélectionne ton projet
3. **Settings** → **API**
4. Copie :
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** → `VITE_SUPABASE_PUBLISHABLE_KEY`

---

## ✅ C'est tout !

Une fois déployé, tu peux ajouter les autres variables d'environnement progressivement selon tes besoins (Stripe, Email, etc.).

Voir `VERCEL-ENV-VARIABLES.md` pour la liste complète des variables.







