#!/bin/bash

# ============================================================================
# 🚀 Script de Redéploiement des Edge Functions Google Calendar
# ============================================================================

echo "═══════════════════════════════════════════════════════════════"
echo "🚀 Redéploiement des Edge Functions Google Calendar"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Vérifier que Supabase CLI est installé
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI n'est pas installé"
    echo "📦 Installation: npm install -g supabase"
    exit 1
fi

# Vérifier que le projet est lié
if [ ! -f ".supabase/config.toml" ]; then
    echo "⚠️  Projet Supabase non lié"
    echo "🔗 Lier le projet: supabase link --project-ref renmjmqlmafqjzldmsgs"
    exit 1
fi

echo "✅ Supabase CLI détecté"
echo ""

# Fonctions à redéployer
FUNCTIONS=(
    "google-calendar-oauth-entreprise-pkce"
    "google-calendar-sync-entreprise"
)

# Redéployer chaque fonction
for func in "${FUNCTIONS[@]}"; do
    echo "───────────────────────────────────────────────────────────────"
    echo "📦 Redéploiement de: $func"
    echo "───────────────────────────────────────────────────────────────"
    
    if supabase functions deploy "$func" --no-verify-jwt; then
        echo "✅ $func redéployée avec succès"
    else
        echo "❌ Erreur lors du redéploiement de $func"
        exit 1
    fi
    echo ""
done

echo "═══════════════════════════════════════════════════════════════"
echo "✅ Toutes les fonctions ont été redéployées avec succès !"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "📝 Prochaines étapes:"
echo "   1. Vérifiez les logs dans Supabase Dashboard"
echo "   2. Testez la connexion Google Calendar dans l'app"
echo ""

