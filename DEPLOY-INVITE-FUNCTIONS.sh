#!/bin/bash
# Script de déploiement des Edge Functions pour les invitations

echo "🚀 Déploiement des Edge Functions d'invitation..."

# Vérifier que supabase CLI est installé
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI n'est pas installé. Installez-le avec: npm install -g supabase"
    exit 1
fi

# Déployer verify-invite
echo "📦 Déploiement de verify-invite..."
supabase functions deploy verify-invite

if [ $? -eq 0 ]; then
    echo "✅ verify-invite déployée avec succès"
else
    echo "❌ Erreur lors du déploiement de verify-invite"
    exit 1
fi

# Déployer accept-invite
echo "📦 Déploiement de accept-invite..."
supabase functions deploy accept-invite

if [ $? -eq 0 ]; then
    echo "✅ accept-invite déployée avec succès"
else
    echo "❌ Erreur lors du déploiement de accept-invite"
    exit 1
fi

# Déployer create-company-invite
echo "📦 Déploiement de create-company-invite..."
supabase functions deploy create-company-invite

if [ $? -eq 0 ]; then
    echo "✅ create-company-invite déployée avec succès"
else
    echo "❌ Erreur lors du déploiement de create-company-invite"
    exit 1
fi

echo "🎉 Toutes les Edge Functions d'invitation ont été déployées avec succès!"
