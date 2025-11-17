# 🚀 Déploiement Vercel - Guide Complet de A à Z

## 📋 Étape 1 : Vérifier que le Build Fonctionne

```bash
npm run build
```

Si ça fonctionne, vous verrez "Build completed" et un dossier `dist` sera créé.

---

## 📋 Étape 2 : Créer/Connecter le Dépôt GitHub

### Si vous n'avez PAS encore de dépôt GitHub :

1. **Allez sur** : https://github.com/new
2. **Nom du dépôt** : `btp_smart_pro` (ou autre nom)
3. **Description** : "Application de gestion BTP avec IA"
4. **Visibilité** : Public ou Private
5. **⚠️ NE COCHEZ PAS** "Initialize with README"
6. **Cliquez sur "Create repository"**

### Si vous avez DÉJÀ un dépôt :

Votre dépôt : `https://github.com/svbkhl/btp_smart_pro.git`

---

## 📋 Étape 3 : Pousser le Code vers GitHub

### Option A : Si le dépôt est déjà connecté

```bash
# Vérifier que vous êtes sur main
git checkout main

# Ajouter tous les fichiers
git add .

# Créer un commit
git commit -m "feat: version complète avec toutes les fonctionnalités"

# Pousser (avec votre token)
git push https://VOTRE_TOKEN@github.com/svbkhl/btp_smart_pro.git main
```

### Option B : Si le dépôt n'est pas connecté

```bash
# Ajouter le remote
git remote add origin https://github.com/svbkhl/btp_smart_pro.git

# Ajouter tous les fichiers
git add .

# Créer un commit
git commit -m "feat: version complète"

# Pousser
git push -u origin main
```

**Pour obtenir un token GitHub** :
1. Allez sur : https://github.com/settings/tokens
2. "Generate new token (classic)"
3. Cochez `repo`
4. Copiez le token

---

## 📋 Étape 4 : Déployer sur Vercel

### Méthode 1 : Nouveau Projet (Recommandé)

1. **Allez sur** : https://vercel.com/new
2. **Cliquez sur "Import Git Repository"**
3. **Connectez votre compte GitHub** (si pas déjà fait)
4. **Sélectionnez** : `svbkhl/btp_smart_pro`
5. **Vercel détectera automatiquement** :
   - Framework : Vite ✅
   - Build Command : `npm run build` ✅
   - Output Directory : `dist` ✅
6. **Cliquez sur "Environment Variables"**
7. **Ajoutez les 2 variables** :

   **Variable 1** :
   - Name : `VITE_SUPABASE_URL`
   - Value : `https://renmjmqlmafqjzldmsgs.supabase.co`
   - ☑️ Production
   - ☑️ Preview
   - ☑️ Development

   **Variable 2** :
   - Name : `VITE_SUPABASE_PUBLISHABLE_KEY`
   - Value : `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlbm1qbXFsbWFmcWp6bGRtc2dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MTA0OTksImV4cCI6MjA3ODE4NjQ5OX0.aJoeIcBb9FiSL2n90vfGevlQQJApym8AVlMktSYOwss`
   - ☑️ Production
   - ☑️ Preview
   - ☑️ Development

8. **Cliquez sur "Deploy"**
9. **Attendez 2-3 minutes**
10. **Votre site sera en ligne !** 🎉

### Méthode 2 : Mettre à Jour un Projet Existant

1. **Allez sur** : https://vercel.com/dashboard
2. **Sélectionnez votre projet**
3. **Settings → Git**
4. **Si un autre dépôt est connecté** : Cliquez sur "Disconnect"
5. **Cliquez sur "Connect Git Repository"**
6. **Sélectionnez** : `svbkhl/btp_smart_pro`
7. **Branche** : `main`
8. **Vérifiez les variables d'environnement** dans Settings → Environment Variables
9. **Allez dans Deployments → "Redeploy"**

---

## ✅ Après le Déploiement

Votre site sera accessible sur :
- **Production** : `https://votre-projet.vercel.app`
- **Page de présentation** : `https://votre-projet.vercel.app/`
- **Démo** : `https://votre-projet.vercel.app/demo`

---

## 🔄 Mises à Jour Automatiques

Une fois connecté, **chaque `git push` vers `main` déclenchera automatiquement un nouveau déploiement** ! 🚀

---

## 📋 Checklist Complète

- [ ] Build fonctionne (`npm run build`)
- [ ] Dépôt GitHub créé/connecté
- [ ] Code poussé vers GitHub
- [ ] Projet créé sur Vercel
- [ ] Variables d'environnement ajoutées (les 2)
- [ ] Déploiement réussi
- [ ] Site accessible

---

**Temps total estimé : 10-15 minutes** ⏱️

