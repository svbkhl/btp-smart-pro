# 🚀 Déploiement Vercel - Guide Simple Étape par Étape

## ✅ ÉTAPE 1 : Vérifier que le Build Fonctionne

```bash
npm run build
```

**Résultat attendu** : `✓ built in X.XXs` avec un dossier `dist` créé.

---

## ✅ ÉTAPE 2 : Pousser le Code sur GitHub

### A. Obtenir un Token GitHub

1. Allez sur : https://github.com/settings/tokens
2. Cliquez sur **"Generate new token (classic)"**
3. Donnez un nom : `Vercel Deploy`
4. Cochez **`repo`** (toutes les cases)
5. Cliquez sur **"Generate token"**
6. **⚠️ COPIEZ LE TOKEN** (vous ne le reverrez plus !)

### B. Pousser le Code

```bash
# Ajouter tous les fichiers
git add .

# Créer un commit
git commit -m "feat: version complète prête pour production"

# Pousser vers GitHub (remplacez VOTRE_TOKEN par le token copié)
git push https://VOTRE_TOKEN@github.com/svbkhl/btp_smart_pro.git main
```

**Exemple** :
```bash
git push https://ghp_xxxxxxxxxxxxxxxxxxxx@github.com/svbkhl/btp_smart_pro.git main
```

---

## ✅ ÉTAPE 3 : Créer le Projet sur Vercel

### A. Aller sur Vercel

1. Allez sur : **https://vercel.com/new**
2. Si vous n'avez pas de compte, **créez-en un** (gratuit avec GitHub)

### B. Importer le Dépôt

1. Cliquez sur **"Import Git Repository"**
2. **Connectez votre compte GitHub** si demandé
3. **Sélectionnez** : `svbkhl/btp_smart_pro`
4. Cliquez sur **"Import"**

### C. Configurer le Projet

Vercel détectera automatiquement :
- ✅ Framework : **Vite**
- ✅ Build Command : `npm run build`
- ✅ Output Directory : `dist`

**⚠️ NE CHANGEZ RIEN** pour l'instant, cliquez sur **"Environment Variables"**

---

## ✅ ÉTAPE 4 : Ajouter les Variables d'Environnement

### Variable 1 : VITE_SUPABASE_URL

1. Cliquez sur **"Add New"**
2. **Name** : `VITE_SUPABASE_URL`
3. **Value** : `https://renmjmqlmafqjzldmsgs.supabase.co`
4. Cochez les 3 cases :
   - ☑️ Production
   - ☑️ Preview
   - ☑️ Development
5. Cliquez sur **"Save"**

### Variable 2 : VITE_SUPABASE_PUBLISHABLE_KEY

1. Cliquez sur **"Add New"**
2. **Name** : `VITE_SUPABASE_PUBLISHABLE_KEY`
3. **Value** : `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlbm1qbXFsbWFmcWp6bGRtc2dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MTA0OTksImV4cCI6MjA3ODE4NjQ5OX0.aJoeIcBb9FiSL2n90vfGevlQQJApym8AVlMktSYOwss`
4. Cochez les 3 cases :
   - ☑️ Production
   - ☑️ Preview
   - ☑️ Development
5. Cliquez sur **"Save"**

---

## ✅ ÉTAPE 5 : Déployer

1. Cliquez sur **"Deploy"**
2. **Attendez 2-3 minutes** ⏳
3. **C'est fait !** 🎉

---

## 🎯 Votre Site est en Ligne !

Vous recevrez un lien comme :
- **Production** : `https://btp-smart-pro.vercel.app`
- **Page d'accueil** : `https://btp-smart-pro.vercel.app/`
- **Démo** : `https://btp-smart-pro.vercel.app/demo`

---

## 🔄 Mises à Jour Automatiques

**Chaque fois que vous faites `git push` vers `main`, Vercel redéploiera automatiquement !** 🚀

---

## ❓ Problèmes Courants

### "Build failed"
- Vérifiez que `npm run build` fonctionne en local
- Vérifiez que les 2 variables d'environnement sont bien ajoutées

### "Site ne fonctionne pas"
- Vérifiez les variables d'environnement dans Vercel → Settings → Environment Variables
- Vérifiez que les valeurs sont correctes (sans espaces)

### "Ancienne version affichée"
- Allez dans Vercel → Deployments → Cliquez sur "..." → "Redeploy"

---

**Temps total : 10-15 minutes** ⏱️

