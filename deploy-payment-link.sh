#!/bin/bash

# Script pour redéployer l'Edge Function create-payment-link
# Usage: ./deploy-payment-link.sh

echo "🚀 Déploiement de l'Edge Function create-payment-link..."
echo ""

# Vérifier si supabase CLI est installé
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI n'est pas installé."
    echo "📦 Installation: npm install -g supabase"
    exit 1
fi

# Vérifier si on est dans le bon répertoire
if [ ! -d "supabase/functions/create-payment-link" ]; then
    echo "❌ Répertoire supabase/functions/create-payment-link introuvable"
    echo "💡 Assurez-vous d'être à la racine du projet"
    exit 1
fi

echo "✅ Vérifications OK"
echo ""
echo "📤 Déploiement en cours..."

# Déployer la fonction
supabase functions deploy create-payment-link

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Déploiement réussi!"
    echo "🔗 La fonction est maintenant disponible sur Supabase"
else
    echo ""
    echo "❌ Erreur lors du déploiement"
    echo "💡 Vérifiez vos credentials Supabase avec: supabase login"
    exit 1
fi
