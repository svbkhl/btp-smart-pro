#!/bin/bash

echo "🚀 DÉPLOIEMENT DE TOUTES LES FONCTIONS EMAIL"
echo "=============================================="
echo ""

# Vérifier si on est dans le bon dossier
if [ ! -d "supabase/functions" ]; then
    echo "❌ Erreur: Dossier supabase/functions introuvable"
    echo "   Assure-toi d'être dans le dossier du projet"
    exit 1
fi

echo "📦 Fonctions à déployer:"
echo "  1. send-email-from-user"
echo "  2. send-payment-link-email"
echo "  3. send-email"
echo ""

# Corriger les permissions npm
echo "1️⃣ Correction des permissions npm..."
sudo chown -R $(whoami) ~/.npm
if [ $? -ne 0 ]; then
    echo "❌ Erreur lors de la correction des permissions"
    echo "   Tu as peut-être annulé ou entré un mauvais mot de passe"
    exit 1
fi
echo "✅ Permissions corrigées"
echo ""

# Fonction de déploiement
deploy_function() {
    local func_name=$1
    echo "📤 Déploiement de $func_name..."
    npx supabase functions deploy "$func_name" --no-verify-jwt
    if [ $? -eq 0 ]; then
        echo "✅ $func_name déployée"
    else
        echo "❌ Erreur lors du déploiement de $func_name"
        return 1
    fi
    echo ""
}

# Déployer toutes les fonctions
echo "2️⃣ Déploiement des fonctions..."
echo ""

deploy_function "send-email-from-user"
deploy_function "send-payment-link-email"
deploy_function "send-email"

echo "3️⃣ Vérification..."
npx supabase functions list
echo ""

echo "=============================================="
echo "✅ DÉPLOIEMENT TERMINÉ !"
echo ""
echo "📧 Test recommandé:"
echo "1. Créer un nouveau devis"
echo "2. L'envoyer par email"
echo "3. Vérifier Messagerie → Envoyés"
echo ""
echo "4. Créer un lien de paiement"
echo "5. L'envoyer par email"
echo "6. Vérifier Messagerie → Envoyés"
echo ""
echo "Si l'email n'apparaît toujours pas:"
echo "- Ouvre en mode incognito (Cmd+Shift+N)"
echo "- Vérifie les logs Supabase"
echo "- Vérifie en SQL: SELECT * FROM email_messages"
echo "=============================================="
