# 🚀 Guide de Déploiement - Lien de Présentation Client

## 📋 Options de Déploiement

### Option 1 : Déploiement Vercel (Recommandé - Gratuit et Rapide)

#### Étape 1 : Préparer l'application

1. **Construire l'application** :
   ```bash
   npm run build
   ```

2. **Vérifier que le build fonctionne** :
   ```bash
   npm run preview
   ```

#### Étape 2 : Déployer sur Vercel

**Méthode A : Via l'interface Vercel (Plus simple)**

1. **Allez sur** : https://vercel.com
2. **Créez un compte** (gratuit) ou connectez-vous
3. **Cliquez sur "Add New Project"**
4. **Importez votre projet** depuis GitHub/GitLab/Bitbucket
   - Si votre projet n'est pas sur Git, créez un dépôt d'abord
5. **Configurez le projet** :
   - **Framework Preset** : Vite
   - **Root Directory** : `./` (racine)
   - **Build Command** : `npm run build`
   - **Output Directory** : `dist`
6. **Ajoutez les variables d'environnement** :
   - `VITE_SUPABASE_URL` : votre URL Supabase
   - `VITE_SUPABASE_PUBLISHABLE_KEY` : votre clé publique
7. **Cliquez sur "Deploy"**
8. **Attendez 2-3 minutes** pour le déploiement
9. **Votre lien sera** : `https://votre-projet.vercel.app`

**Méthode B : Via Vercel CLI**

```bash
# Installer Vercel CLI
npm i -g vercel

# Se connecter
vercel login

# Déployer
vercel

# Pour la production
vercel --prod
```

#### Lien de présentation

Une fois déployé, vous obtiendrez un lien comme :
- **Production** : `https://votre-projet.vercel.app`
- **Prévisualisation** : `https://votre-projet-git-main.vercel.app`

---

### Option 2 : Déploiement Netlify (Alternative Gratuite)

1. **Allez sur** : https://netlify.com
2. **Créez un compte** (gratuit)
3. **Cliquez sur "Add new site" → "Import an existing project"**
4. **Connectez votre dépôt Git** ou **drag & drop** le dossier `dist` après `npm run build`
5. **Configurez** :
   - **Build command** : `npm run build`
   - **Publish directory** : `dist`
6. **Ajoutez les variables d'environnement** dans Settings → Environment variables
7. **Déployez**
8. **Votre lien sera** : `https://votre-projet.netlify.app`

---

### Option 3 : Lien Local Temporaire (Pour Test Rapide)

Si vous voulez juste montrer rapidement sans déployer :

#### Utiliser ngrok (Tunnel local)

1. **Installer ngrok** :
   ```bash
   # macOS
   brew install ngrok
   
   # Ou télécharger depuis https://ngrok.com
   ```

2. **Démarrer l'application** :
   ```bash
   npm run dev
   ```

3. **Dans un autre terminal, créer le tunnel** :
   ```bash
   ngrok http 5173
   ```

4. **Vous obtiendrez un lien** comme : `https://abc123.ngrok.io`
   - ⚠️ **Note** : Ce lien change à chaque redémarrage de ngrok
   - ⚠️ **Limite** : Version gratuite = 2 heures max

---

## 🎯 Lien de Démo Recommandé

Pour présenter à un client, je recommande d'utiliser la **page de démo** :

### Lien de démo (après déploiement)
```
https://votre-projet.vercel.app/demo
```

Cette page :
- ✅ Ne nécessite pas d'authentification
- ✅ Affiche des données fictives complètes
- ✅ Montre toutes les fonctionnalités
- ✅ Est en lecture seule (sécurisé pour la présentation)

### Lien de présentation (landing page)
```
https://votre-projet.vercel.app/
```

Cette page :
- ✅ Présente l'application
- ✅ Met en avant les fonctionnalités IA
- ✅ A un bouton "Voir la démo"
- ✅ A un bouton "Commencer maintenant"

---

## 📝 Checklist Avant de Partager le Lien

- [ ] L'application est déployée et accessible
- [ ] Les variables d'environnement sont configurées
- [ ] La page `/demo` fonctionne correctement
- [ ] Les images et assets se chargent correctement
- [ ] Le design est cohérent sur mobile et desktop
- [ ] Les animations fonctionnent correctement

---

## 🔗 Exemple de Message pour le Client

```
Bonjour [Nom du client],

Je vous partage le lien de présentation de notre application de gestion BTP :

🌐 Page de présentation : https://votre-projet.vercel.app
🎮 Démo interactive : https://votre-projet.vercel.app/demo

La page de démo vous permet de découvrir toutes les fonctionnalités 
avec des données fictives, sans avoir besoin de créer un compte.

N'hésitez pas à me faire vos retours !

Cordialement,
[Votre nom]
```

---

## 🆘 Problèmes Courants

### Erreur : "Environment variables not found"
**Solution** : Vérifiez que vous avez ajouté les variables dans Vercel/Netlify Settings → Environment Variables

### Erreur : "Build failed"
**Solution** : 
1. Vérifiez que `npm run build` fonctionne localement
2. Vérifiez les logs de build dans Vercel/Netlify
3. Assurez-vous que toutes les dépendances sont dans `package.json`

### L'application fonctionne mais Supabase ne répond pas
**Solution** : 
1. Vérifiez que les variables d'environnement sont correctes
2. Vérifiez que votre projet Supabase est actif
3. Vérifiez les règles RLS dans Supabase

---

## 💡 Astuce Pro

Pour un lien personnalisé et professionnel :
1. **Achetez un domaine** (ex: `btp-smart-pro.com`)
2. **Configurez-le dans Vercel/Netlify** :
   - Vercel : Settings → Domains → Add Domain
   - Netlify : Domain settings → Add custom domain
3. **Votre lien sera** : `https://btp-smart-pro.com`

---

## ✅ Résumé Rapide

**Pour déployer rapidement** :
1. `npm run build`
2. Créer un compte Vercel
3. Importer le projet
4. Ajouter les variables d'environnement
5. Déployer
6. Partager le lien : `https://votre-projet.vercel.app/demo`

**Temps estimé** : 10-15 minutes

