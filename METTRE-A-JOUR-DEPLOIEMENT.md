# 🔄 Mettre à Jour le Déploiement Vercel

## 📋 Situation Actuelle

Vous avez déployé la première version depuis Git. Maintenant vous voulez mettre à jour avec toutes les dernières modifications.

## ✅ Étapes pour Mettre à Jour

### Option 1 : Si vous avez déjà un dépôt Git connecté à Vercel

1. **Ajouter tous les fichiers modifiés** :
   ```bash
   git add .
   ```

2. **Créer un commit** :
   ```bash
   git commit -m "feat: ajout du mode démo et améliorations design"
   ```

3. **Pousser vers GitHub/GitLab** :
   ```bash
   git push origin main
   # ou
   git push origin master
   # ou
   git push origin feature/dashboard-improvements
   ```

4. **Vercel redéploiera automatiquement** ! 🎉
   - Vercel détecte automatiquement les nouveaux commits
   - Le déploiement se lance en quelques secondes
   - Vous recevrez une notification une fois terminé

### Option 2 : Si vous n'avez pas encore de dépôt Git distant

#### Étape 1 : Créer un dépôt sur GitHub

1. Allez sur https://github.com/new
2. Créez un nouveau dépôt (ex: `edifice-opus-one`)
3. **Ne cochez PAS** "Initialize with README" (vous avez déjà des fichiers)
4. Cliquez sur "Create repository"

#### Étape 2 : Connecter votre projet local

```bash
# Ajouter tous les fichiers
git add .

# Créer un commit
git commit -m "feat: version complète avec mode démo"

# Ajouter le remote GitHub (remplacez par votre URL)
git remote add origin https://github.com/VOTRE-USERNAME/edifice-opus-one.git

# Pousser vers GitHub
git push -u origin main
# ou si votre branche s'appelle différemment :
git push -u origin feature/dashboard-improvements
```

#### Étape 3 : Connecter à Vercel

1. Allez sur https://vercel.com/dashboard
2. Cliquez sur votre projet
3. Allez dans **Settings** → **Git**
4. Si ce n'est pas déjà connecté, connectez votre dépôt GitHub
5. Vercel détectera automatiquement les nouveaux commits

### Option 3 : Déploiement manuel (sans Git)

Si vous ne voulez pas utiliser Git, vous pouvez :

1. **Rebuild localement** :
   ```bash
   npm run build
   ```

2. **Dans Vercel Dashboard** :
   - Allez sur votre projet
   - Cliquez sur **Deployments**
   - Cliquez sur **Redeploy** → **Use existing Build Cache**
   - Ou téléchargez le dossier `dist` et utilisez **Deploy** → **Upload**

## 🚀 Commandes Rapides (Copier-Coller)

Si vous avez déjà un remote configuré :

```bash
# Voir votre branche actuelle
git branch

# Ajouter tous les fichiers
git add .

# Créer un commit
git commit -m "feat: mise à jour avec mode démo et nouvelles fonctionnalités"

# Pousser (remplacez 'main' par votre branche si nécessaire)
git push origin main
```

## ⚠️ Important : Ne pas commiter le fichier .env

Assurez-vous que `.env` est dans `.gitignore` :

```bash
# Vérifier
cat .gitignore | grep .env

# Si ce n'est pas là, l'ajouter
echo ".env" >> .gitignore
```

Les variables d'environnement doivent être configurées dans Vercel, pas dans Git.

## ✅ Vérification

Après avoir poussé :

1. **Vérifiez sur GitHub/GitLab** que vos fichiers sont bien là
2. **Allez sur Vercel Dashboard** → **Deployments**
3. Vous devriez voir un nouveau déploiement en cours
4. Attendez 2-3 minutes
5. Votre site sera mis à jour automatiquement !

## 🎯 Résumé

**Méthode la plus simple** :
1. `git add .`
2. `git commit -m "mise à jour"`
3. `git push`
4. Vercel redéploie automatiquement ✨

**Temps estimé** : 2 minutes

