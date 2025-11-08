#!/bin/bash

# Script pour initialiser Git et créer les branches

echo "🚀 Initialisation du dépôt Git..."

# Initialiser Git
git init

# Configurer Git (remplacez par vos informations)
git config user.name "Votre Nom"
git config user.email "votre.email@example.com"

# Créer le commit initial
echo "📦 Création du commit initial..."
git add .
git commit -m "Initial commit: Application Edifice Opus One"

# Créer la branche main (si ce n'est pas déjà fait)
git branch -M main

# Créer les branches de développement
echo "🌿 Création des branches..."

# Branche de développement principale
git checkout -b develop

# Branches de fonctionnalités
git checkout -b feature/ai-assistant
git checkout develop

git checkout -b feature/quotes
git checkout develop

git checkout -b feature/image-analysis
git checkout develop

git checkout -b feature/maintenance
git checkout develop

# Branche pour les corrections de bugs
git checkout -b bugfix/fixes

# Retourner sur la branche main
git checkout main

echo "✅ Dépôt Git initialisé avec les branches suivantes:"
echo ""
git branch -a

echo ""
echo "📋 Branches créées:"
echo "  - main (branche principale)"
echo "  - develop (branche de développement)"
echo "  - feature/ai-assistant"
echo "  - feature/quotes"
echo "  - feature/image-analysis"
echo "  - feature/maintenance"
echo "  - bugfix/fixes"
echo ""
echo "🎉 Configuration terminée!"

