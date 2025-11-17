#!/bin/bash

echo "🚀 Push vers main (branche de production Vercel)"
echo ""
read -p "Collez votre token GitHub : " TOKEN

if [ -z "$TOKEN" ]; then
    echo "❌ Token vide, annulé"
    exit 1
fi

echo ""
echo "📤 Poussage vers main en cours..."

# Pousser vers main
git push https://${TOKEN}@github.com/svbkhl/btp_smart_pro.git main

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Succès ! Votre code a été poussé vers main"
    echo "🚀 Vercel redéploiera automatiquement dans quelques instants"
    echo ""
    echo "✅ Vérifiez :"
    echo "   - GitHub : https://github.com/svbkhl/btp_smart_pro"
    echo "   - Vercel Dashboard : https://vercel.com/dashboard"
else
    echo ""
    echo "❌ Erreur lors du push. Vérifiez :"
    echo "   - Que le token est correct"
    echo "   - Que vous avez les droits sur le dépôt"
fi

