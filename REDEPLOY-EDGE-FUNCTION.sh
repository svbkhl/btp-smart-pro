#!/bin/bash

# ============================================================================
# Script de redéploiement de l'Edge Function Google Calendar
# ============================================================================

echo "🚀 Redéploiement de l'Edge Function google-calendar-oauth-entreprise-pkce"
echo ""

# Vérifier si supabase CLI est installé
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI n'est pas installé"
    echo "💡 Installez-le avec: npm install -g supabase"
    exit 1
fi

# Vérifier si l'utilisateur est connecté
if ! supabase projects list &> /dev/null; then
    echo "❌ Vous n'êtes pas connecté à Supabase"
    echo "💡 Connectez-vous avec: supabase login"
    exit 1
fi

# Aller dans le répertoire du projet
cd "$(dirname "$0")"

echo "📦 Déploiement de l'Edge Function..."
supabase functions deploy google-calendar-oauth-entreprise-pkce

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Edge Function redéployée avec succès !"
    echo ""
    echo "🔍 Vérifiez les logs: https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/logs/edge-functions"
else
    echo ""
    echo "❌ Erreur lors du déploiement"
    echo "💡 Vérifiez que vous êtes connecté: supabase login"
    echo "💡 Vérifiez que le projet est lié: supabase link --project-ref renmjmqlmafqjzldmsgs"
fi
