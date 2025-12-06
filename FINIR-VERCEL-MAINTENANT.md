# 🚀 FINIR LA CONFIGURATION VERCEL - Guide Rapide

## ⚠️ Note Importante

**Avant de déployer sur Vercel**, assure-toi d'avoir exécuté le script SQL dans Supabase pour créer les tables. Sinon, l'application ne fonctionnera pas même sur Vercel.

---

## ✅ ÉTAPE 1 : Vérifier que le Code est sur GitHub

```bash
# Vérifier le statut
git status

# Si tu as des changements non commités
git add .
git commit -m "feat: préparation déploiement Vercel"
git push
```

---

## ✅ ÉTAPE 2 : Aller sur Vercel

1. **Va sur** : https://vercel.com/new
2. **Connecte-toi** avec GitHub (si pas déjà fait)
3. **Clique sur "Import Git Repository"**
4. **Sélectionne** : `svbkhl/btp_smart_pro` (ou ton repo)
5. **Clique sur "Import"**

---

## ✅ ÉTAPE 3 : Configurer le Projet

Vercel détectera automatiquement :
- ✅ Framework : **Vite**
- ✅ Build Command : `npm run build`
- ✅ Output Directory : `dist`

**⚠️ NE CHANGE RIEN**, clique directement sur **"Environment Variables"** (en bas)

---

## ✅ ÉTAPE 4 : Ajouter les Variables d'Environnement

### Variable 1 : VITE_SUPABASE_URL

1. Clique sur **"Add New"**
2. **Name** : `VITE_SUPABASE_URL`
3. **Value** : `https://renmjmqlmafqjzldmsgs.supabase.co`
4. **Coche les 3 cases** :
   - ☑️ Production
   - ☑️ Preview
   - ☑️ Development
5. Clique sur **"Save"**

### Variable 2 : VITE_SUPABASE_PUBLISHABLE_KEY

1. Clique sur **"Add New"**
2. **Name** : `VITE_SUPABASE_PUBLISHABLE_KEY`
3. **Value** : `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlbm1qbXFsbWFmcWp6bGRtc2dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MTA0OTksImV4cCI6MjA3ODE4NjQ5OX0.aJoeIcBb9FiSL2n90vfGevlQQJApym8AVlMktSYOwss`
4. **Coche les 3 cases** :
   - ☑️ Production
   - ☑️ Preview
   - ☑️ Development
5. Clique sur **"Save"**

### Variable 3 : PUBLIC_URL (Optionnel mais recommandé)

1. Clique sur **"Add New"**
2. **Name** : `PUBLIC_URL`
3. **Value** : Laisse vide pour l'instant (on le remplira après le déploiement)
4. **Coche les 3 cases**
5. Clique sur **"Save"**

---

## ✅ ÉTAPE 5 : Déployer

1. **Clique sur "Deploy"** (en bas à droite)
2. **Attends 2-3 minutes** pendant que Vercel build et déploie
3. **Tu verras** : "Building...", puis "Deploying...", puis "Ready"

---

## ✅ ÉTAPE 6 : Récupérer l'URL de Déploiement

Une fois le déploiement terminé :

1. **Tu verras** : "Congratulations! Your project has been deployed"
2. **Copie l'URL** : `https://ton-projet.vercel.app`
3. **Clique sur "Visit"** pour voir ton site en ligne

---

## ✅ ÉTAPE 7 : Mettre à Jour PUBLIC_URL (Important)

1. **Va dans** : Vercel Dashboard → Ton Projet → Settings → Environment Variables
2. **Trouve** `PUBLIC_URL`
3. **Clique sur "Edit"**
4. **Colle l'URL** : `https://ton-projet.vercel.app` (ou ton domaine personnalisé)
5. **Sauvegarde**
6. **Va dans** : Deployments → Clique sur les 3 points → "Redeploy"

---

## ✅ ÉTAPE 8 : Configurer le Domaine Personnalisé (amen.fr)

### Option A : Via Vercel (Recommandé)

1. **Va dans** : Vercel Dashboard → Ton Projet → Settings → Domains
2. **Clique sur "Add"**
3. **Entre** : `amen.fr` (ou `www.amen.fr`)
4. **Vercel te donnera** des instructions DNS à suivre

### Option B : Via amen.fr (Si tu as déjà acheté le domaine)

1. **Va sur** ton panneau de contrôle amen.fr
2. **Trouve** la section "DNS" ou "Zone DNS"
3. **Ajoute** les enregistrements que Vercel te donne :
   - Type : `A` ou `CNAME`
   - Nom : `@` ou `www`
   - Valeur : Ce que Vercel te donne

---

## 🎯 Résumé des Variables à Ajouter

| Name | Value | Environnements |
|------|-------|----------------|
| `VITE_SUPABASE_URL` | `https://renmjmqlmafqjzldmsgs.supabase.co` | ☑️ Production ☑️ Preview ☑️ Development |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | ☑️ Production ☑️ Preview ☑️ Development |
| `PUBLIC_URL` | `https://ton-projet.vercel.app` | ☑️ Production ☑️ Preview ☑️ Development |

---

## ⚠️ Erreurs Courantes

### Erreur : "Build failed"

**Solution** : Vérifie que `npm run build` fonctionne localement :
```bash
npm run build
```

### Erreur : "Environment Variable not found"

**Solution** : Vérifie que tu as bien ajouté les variables et coché les 3 environnements.

### Erreur : "404 Not Found" sur les routes

**Solution** : Vérifie que `vercel.json` existe et contient les rewrites (il est déjà là ✅).

---

## ✅ Checklist Finale

- [ ] Code poussé sur GitHub
- [ ] Projet créé sur Vercel
- [ ] Variables d'environnement ajoutées (3 variables)
- [ ] 3 environnements cochés pour chaque variable
- [ ] Déploiement réussi
- [ ] Site accessible sur `https://ton-projet.vercel.app`
- [ ] `PUBLIC_URL` mis à jour avec l'URL Vercel
- [ ] Domaine personnalisé configuré (si nécessaire)

---

## 🎉 C'est Fait !

Une fois tout configuré :
- ✅ Ton site sera en ligne
- ✅ Chaque `git push` déclenchera un nouveau déploiement automatique
- ✅ Tu auras une URL Vercel : `https://ton-projet.vercel.app`

**Besoin d'aide ? Dis-moi où tu bloques !** 🚀







