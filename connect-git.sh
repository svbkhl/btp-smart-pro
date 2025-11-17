#!/bin/bash

echo "🔗 Connexion du projet à GitHub"
echo ""

# Vérifier si un remote existe déjà
if git remote -v | grep -q "origin"; then
    echo "✅ Remote 'origin' existe déjà :"
    git remote -v
    echo ""
    read -p "Voulez-vous le remplacer ? (o/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Oo]$ ]]; then
        git remote remove origin
    else
        echo "❌ Annulé"
        exit 0
    fi
fi

echo "📋 Pour connecter votre projet, vous avez 2 options :"
echo ""
echo "Option 1 : Si vous avez DÉJÀ un dépôt GitHub"
echo "  → Donnez-moi l'URL (ex: https://github.com/username/repo.git)"
echo ""
echo "Option 2 : Créer un nouveau dépôt"
echo "  1. Allez sur https://github.com/new"
echo "  2. Créez un dépôt (ne cochez PAS 'Initialize with README')"
echo "  3. Copiez l'URL du dépôt"
echo ""

read -p "Entrez l'URL de votre dépôt GitHub : " REPO_URL

if [ -z "$REPO_URL" ]; then
    echo "❌ URL vide, annulé"
    exit 1
fi

echo ""
echo "🔗 Connexion au dépôt..."
git remote add origin "$REPO_URL"

if [ $? -eq 0 ]; then
    echo "✅ Remote ajouté avec succès !"
    echo ""
    echo "📤 Poussage des changements..."
    git push -u origin feature/dashboard-improvements
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "🎉 Succès ! Votre projet est maintenant connecté à GitHub"
        echo "🚀 Vercel redéploiera automatiquement dans quelques instants"
    else
        echo ""
        echo "⚠️  Erreur lors du push. Vérifiez :"
        echo "   - Que le dépôt existe bien"
        echo "   - Que vous avez les droits d'écriture"
        echo "   - Que vous êtes authentifié sur GitHub"
    fi
else
    echo "❌ Erreur lors de l'ajout du remote"
    exit 1
fi

