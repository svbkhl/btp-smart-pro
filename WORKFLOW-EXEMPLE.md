# Guide Pratique : Comment Travailler avec les Branches Git

## 🎯 Scénarios Pratiques pour Votre Projet

### 📝 Scénario 1 : Ajouter une nouvelle fonctionnalité à l'Assistant IA

```bash
# 1. Aller sur la branche develop
git checkout develop

# 2. Mettre à jour develop (si vous travaillez en équipe)
git pull origin develop

# 3. Créer une nouvelle branche pour votre fonctionnalité
git checkout -b feature/ai-chat-improvements

# 4. Faire vos modifications (par exemple dans src/components/ai/AIAssistant.tsx)
# ... faites vos changements ...

# 5. Vérifier ce qui a changé
git status

# 6. Ajouter les fichiers modifiés
git add src/components/ai/AIAssistant.tsx

# 7. Créer un commit avec un message descriptif
git commit -m "feat: amélioration de l'interface du chat IA"

# 8. Pousser votre branche vers le dépôt distant (si vous avez un remote)
git push origin feature/ai-chat-improvements

# 9. Fusionner dans develop
git checkout develop
git merge feature/ai-chat-improvements

# 10. Supprimer la branche locale (optionnel)
git branch -d feature/ai-chat-improvements
```

### 🐛 Scénario 2 : Corriger un bug dans les devis

```bash
# 1. Aller sur develop
git checkout develop

# 2. Créer une branche pour la correction
git checkout -b bugfix/quote-calculation-error

# 3. Corriger le bug (par exemple dans src/components/ai/AIQuoteGenerator.tsx)
# ... faites vos corrections ...

# 4. Commiter la correction
git add src/components/ai/AIQuoteGenerator.tsx
git commit -m "fix: correction du calcul des coûts dans les devis"

# 5. Fusionner dans develop
git checkout develop
git merge bugfix/quote-calculation-error
```

### 🚀 Scénario 3 : Préparer une version pour la production

```bash
# 1. S'assurer que develop est à jour et stable
git checkout develop
git pull origin develop

# 2. Fusionner develop dans main
git checkout main
git merge develop

# 3. Créer un tag pour la version
git tag -a v1.0.0 -m "Version 1.0.0 - Release initiale"
git push origin main --tags
```

## 📋 Commandes Essentielles

### Voir l'état actuel
```bash
# Voir sur quelle branche vous êtes
git branch

# Voir l'historique des commits
git log --oneline --graph --all

# Voir les fichiers modifiés
git status

# Voir les différences
git diff
```

### Gérer les branches
```bash
# Lister toutes les branches
git branch -a

# Créer une nouvelle branche
git checkout -b nom-de-la-branche

# Changer de branche
git checkout nom-de-la-branche

# Supprimer une branche locale
git branch -d nom-de-la-branche

# Supprimer une branche distante
git push origin --delete nom-de-la-branche
```

### Travailler avec les commits
```bash
# Ajouter tous les fichiers modifiés
git add .

# Ajouter un fichier spécifique
git add chemin/vers/fichier

# Créer un commit
git commit -m "Description des changements"

# Modifier le dernier commit (si vous avez oublié quelque chose)
git commit --amend

# Voir l'historique
git log
```

### Annuler des changements
```bash
# Annuler les modifications d'un fichier (non committé)
git checkout -- nom-du-fichier

# Annuler tous les changements non committés
git reset --hard HEAD

# Annuler le dernier commit (garder les changements)
git reset --soft HEAD~1
```

## 🏗️ Structure Recommandée des Messages de Commit

Utilisez des préfixes pour mieux organiser vos commits :

- `feat:` - Nouvelle fonctionnalité
- `fix:` - Correction de bug
- `docs:` - Documentation
- `style:` - Formatage, style (pas de changement de code)
- `refactor:` - Refactorisation du code
- `test:` - Ajout de tests
- `chore:` - Tâches de maintenance

Exemples :
```bash
git commit -m "feat: ajout de l'analyse d'images par IA"
git commit -m "fix: correction de l'affichage des devis"
git commit -m "docs: mise à jour du README"
git commit -m "refactor: optimisation du composant Dashboard"
```

## 🔄 Workflow Recommandé

1. **Développement quotidien** : Travaillez sur `develop`
2. **Nouvelles fonctionnalités** : Créez une branche `feature/nom-feature` depuis `develop`
3. **Corrections de bugs** : Créez une branche `bugfix/nom-bug` depuis `develop`
4. **Tests** : Testez sur `develop` avant de merger dans `main`
5. **Production** : Merguez `develop` dans `main` uniquement pour les releases

## 💡 Astuces

### Voir les différences entre branches
```bash
git diff develop..main
```

### Mettre à jour une branche avec les dernières modifications
```bash
git checkout votre-branche
git merge develop
```

### Créer une branche à partir d'un commit spécifique
```bash
git checkout -b nouvelle-branche commit-hash
```

### Sauvegarder temporairement vos changements (sans commit)
```bash
git stash
# ... faire autre chose ...
git stash pop  # récupérer vos changements
```

## 🎓 Exercices Pratiques

### Exercice 1 : Ajouter une fonctionnalité
1. Créez une branche `feature/dashboard-stats`
2. Modifiez `src/pages/Dashboard.tsx`
3. Commitez vos changements
4. Mergez dans `develop`

### Exercice 2 : Corriger un bug
1. Créez une branche `bugfix/sidebar-mobile`
2. Corrigez un problème dans `src/components/Sidebar.tsx`
3. Commitez la correction
4. Mergez dans `develop`

---

**Besoin d'aide ?** Consultez `GIT-BRANCHES.md` pour plus de détails sur la structure des branches.

