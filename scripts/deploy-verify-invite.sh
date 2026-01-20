#!/bin/bash
# Script pour redéployer verify-invite et accept-invite sans vérification JWT

echo "🚀 Redéploiement de verify-invite et accept-invite..."
echo ""

# Vérifier que Supabase CLI est installé
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI n'est pas installé."
    echo "   Installez-le avec: npm install -g supabase"
    exit 1
fi

# Vérifier que l'utilisateur est connecté
echo "📋 Vérification de la connexion Supabase..."
supabase login 2>/dev/null || {
    echo "⚠️  Connexion requise. Veuillez vous connecter:"
    supabase login
}

echo ""
echo "📤 Redéploiement de verify-invite (sans vérification JWT)..."
supabase functions deploy verify-invite --no-verify-jwt

echo ""
echo "📤 Redéploiement de accept-invite (sans vérification JWT)..."
supabase functions deploy accept-invite --no-verify-jwt

echo ""
echo "✅ Redéploiement terminé !"
echo ""
echo "💡 Les fonctions sont maintenant configurées pour ne pas vérifier le JWT."
echo "   Vous pouvez maintenant tester votre invitation."
