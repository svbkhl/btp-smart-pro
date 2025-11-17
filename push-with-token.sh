#!/bin/bash

echo "🚀 Push vers GitHub avec Token"
echo ""
read -p "Collez votre token GitHub : " TOKEN

if [ -z "$TOKEN" ]; then
    echo "❌ Token vide, annulé"
    exit 1
fi

echo ""
echo "📤 Poussage en cours..."

# Utiliser le token dans l'URL
git push https://${TOKEN}@github.com/svbkhl/btp_smart_pro.git feature/dashboard-improvements

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Succès ! Votre code a été poussé vers GitHub"
    echo "🚀 Vercel redéploiera automatiquement dans quelques instants"
    echo ""
    echo "✅ Vous pouvez maintenant :"
    echo "   - Voir votre code sur : https://github.com/svbkhl/btp_smart_pro"
    echo "   - Vérifier le déploiement sur Vercel Dashboard"
else
    echo ""
    echo "❌ Erreur lors du push. Vérifiez :"
    echo "   - Que le token est correct"
    echo "   - Que vous avez les droits sur le dépôt"
fi

