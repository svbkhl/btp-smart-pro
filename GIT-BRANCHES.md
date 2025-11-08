# Guide des Branches Git

## Structure des Branches

### Branche Principale
- **`main`** : Branche de production (code stable et déployé)

### Branche de Développement
- **`develop`** : Branche de développement principale (intégration des features)

### Branches de Fonctionnalités (Features)
- **`feature/ai-assistant`** : Développement de l'assistant IA
- **`feature/quotes`** : Gestion des devis
- **`feature/image-analysis`** : Analyse d'images
- **`feature/maintenance`** : Rappels de maintenance

### Branches de Corrections (Bugfix)
- **`bugfix/fixes`** : Corrections de bugs

## Workflow Git

### Créer une nouvelle branche de feature
```bash
git checkout develop
git pull origin develop
git checkout -b feature/nom-de-la-feature
```

### Travailler sur une branche
```bash
git add .
git commit -m "Description des changements"
git push origin feature/nom-de-la-feature
```

### Fusionner une feature dans develop
```bash
git checkout develop
git merge feature/nom-de-la-feature
git push origin develop
```

### Fusionner develop dans main (pour la production)
```bash
git checkout main
git merge develop
git push origin main
```

## Commandes Utiles

### Voir toutes les branches
```bash
git branch -a
```

### Changer de branche
```bash
git checkout nom-de-la-branche
```

### Supprimer une branche locale
```bash
git branch -d nom-de-la-branche
```

### Supprimer une branche distante
```bash
git push origin --delete nom-de-la-branche
```

## Installation

Pour initialiser Git et créer toutes les branches, exécutez :

```bash
./setup-git.sh
```

**Note** : Assurez-vous d'avoir installé les outils de développement Xcode avant d'exécuter le script.

