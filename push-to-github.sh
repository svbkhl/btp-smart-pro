#!/bin/bash

# Script pour pousser le code vers GitHub avec un token

echo "🚀 Push vers GitHub"
echo ""

# Demander le token
read -p "📋 Collez votre token GitHub : " TOKEN

if [ -z "$TOKEN" ]; then
  echo "❌ Token vide, annulation."
  exit 1
fi

echo ""
echo "📦 Ajout des fichiers..."
git add .

echo "💾 Création du commit..."
git commit -m "feat: version complète prête pour production" || echo "⚠️ Pas de nouveaux changements"

echo "🚀 Push vers GitHub..."
git push https://$TOKEN@github.com/svbkhl/btp_smart_pro.git main

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Code poussé avec succès !"
  echo ""
  echo "📋 Prochaines étapes :"
  echo "1. Allez sur https://vercel.com/new"
  echo "2. Importez le dépôt svbkhl/btp_smart_pro"
  echo "3. Ajoutez les variables d'environnement"
  echo "4. Déployez !"
else
  echo ""
  echo "❌ Erreur lors du push"
  exit 1
fi

