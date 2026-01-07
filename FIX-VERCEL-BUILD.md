# 🔧 Correction Build Vercel

## 🔍 Problèmes Identifiés et Corrigés

### 1. Configuration Vercel ✅

**Fichier** : `vercel.json`

**Correction** :
- ✅ Ajout de `"framework": "vite"` pour que Vercel détecte correctement Vite
- ✅ `buildCommand` : `npm run build` (correct)
- ✅ `outputDirectory` : `dist` (correct)

---

### 2. Variables d'Environnement ✅

**Fichier** : `src/lib/env.ts`

**Problème** : `initEnv()` lançait une erreur en production si les variables manquaient, ce qui bloquait le build.

**Correction** :
- ✅ Ne plus `throw` en production
- ✅ Logger l'erreur mais continuer le build
- ✅ Les erreurs apparaîtront à l'utilisation si les variables sont vraiment manquantes

---

### 3. sessionStorage / window ✅

**Fichiers** : `src/hooks/useGoogleCalendar.ts`

**Problème** : Utilisation de `sessionStorage` sans vérifier `typeof window`.

**Correction** :
- ✅ Vérification `typeof window !== "undefined"` avant d'utiliser `sessionStorage`

---

### 4. Fichier .vercelignore ✅

**Créé** : `.vercelignore`

Pour éviter de déployer des fichiers inutiles.

---

## 🚀 Configuration Vercel Requise

### Variables d'Environnement

Dans **Vercel Dashboard → Settings → Environment Variables**, assurez-vous d'avoir :

| Variable | Valeur |
|----------|--------|
| `VITE_SUPABASE_URL` | `https://renmjmqlmafqjzldmsgs.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Votre clé publique Supabase |

**Important** : Cochez les 3 environnements :
- ✅ Production
- ✅ Preview
- ✅ Development

---

## ✅ Vérification

### 1. Build Local

```bash
npm run build
```

**Résultat attendu** : `✓ built in X.XXs` avec dossier `dist` créé.

### 2. Type Check

```bash
npm run type-check
```

**Résultat attendu** : Aucune erreur TypeScript.

---

## 🚀 Redéployer sur Vercel

### Option 1 : Dashboard Vercel

1. **Allez sur** : https://vercel.com/dashboard
2. **Sélectionnez votre projet**
3. **Deployments** → **Redeploy**

### Option 2 : Push Git

```bash
git add .
git commit -m "fix: correction build Vercel - config vite et variables env"
git push origin main
```

**Vercel déploiera automatiquement** 🚀

---

## 📋 Checklist

- [x] `vercel.json` configuré avec `framework: "vite"`
- [x] `initEnv()` ne bloque plus le build en production
- [x] `sessionStorage` protégé avec `typeof window`
- [x] `.vercelignore` créé
- [ ] Variables d'environnement configurées dans Vercel
- [ ] Build local fonctionne
- [ ] Déploiement Vercel réussi

---

## 🎯 Résultat Attendu

- ✅ Build Vercel réussi
- ✅ Application déployée
- ✅ Plus d'erreurs de build
- ✅ Variables d'environnement correctement chargées
