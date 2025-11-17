#!/bin/bash

echo "🚀 Push vers GitHub pour mettre à jour Vercel"
echo ""
echo "Votre dernier commit local :"
git log --oneline -1
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
    echo "🎉 Succès ! Votre code a été poussé vers GitHub"
    echo "🚀 Vercel va détecter automatiquement le nouveau commit"
    echo "⏱️  Attendez 1-2 minutes, puis vérifiez Vercel Dashboard"
    echo ""
    echo "✅ Votre nouveau commit :"
    git log --oneline -1
    echo ""
    echo "🌐 Vérifiez sur :"
    echo "   - GitHub : https://github.com/svbkhl/btp_smart_pro"
    echo "   - Vercel : https://vercel.com/dashboard"
else
    echo ""
    echo "❌ Erreur lors du push. Vérifiez :"
    echo "   - Que le token est correct"
    echo "   - Que vous avez les droits sur le dépôt"
fi

