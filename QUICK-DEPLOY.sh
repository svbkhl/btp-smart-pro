#!/bin/bash
# Script de déploiement rapide avec assistance

echo "🚀 Déploiement Rapide - BTP Smart Pro"
echo "======================================"
echo ""

# Vérifier Supabase CLI
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI non installé."
    echo "   Installez: npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI détecté"
echo ""

# Fonctions à déployer
FUNCTIONS=("create-signature-session" "create-payment-session" "send-email" "stripe-webhook")

# Vérifier la liaison
if [ ! -f ".supabase/config.toml" ]; then
    echo "⚠️  Projet non lié. Connexion requise."
    echo ""
    supabase login
    
    echo ""
    read -p "📋 Entrez votre Project Reference (Supabase → Settings → General): " PROJECT_REF
    
    if [ -z "$PROJECT_REF" ]; then
        echo "❌ Project Reference requis"
        exit 1
    fi
    
    echo "🔗 Liaison du projet..."
    supabase link --project-ref "$PROJECT_REF"
fi

echo ""
echo "📤 Déploiement des Edge Functions..."
echo ""

for func in "${FUNCTIONS[@]}"; do
    echo "→ Déploiement de $func..."
    supabase functions deploy "$func" --no-verify-jwt && echo "✅ $func OK" || echo "❌ $func ÉCHEC"
done

echo ""
echo "✅ Déploiement terminé !"
echo ""
echo "📝 Prochaines étapes:"
echo "   1. Configurer les secrets (voir CONFIG-SECRETS.md)"
echo "   2. Configurer le webhook Stripe (voir CONFIG-STRIPE-WEBHOOK.md)"
