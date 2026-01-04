#!/bin/bash

echo "🚀 Déploiement de la fonction send-email-from-user"
echo "=================================================="
echo ""

# Vérifier si on est dans le bon dossier
if [ ! -f "supabase/functions/send-email-from-user/index.ts" ]; then
    echo "❌ Erreur: Fichier send-email-from-user/index.ts introuvable"
    echo "   Assure-toi d'être dans le dossier du projet"
    exit 1
fi

echo "1️⃣ Correction des permissions npm..."
sudo chown -R $(whoami) ~/.npm
if [ $? -ne 0 ]; then
    echo "❌ Erreur lors de la correction des permissions"
    echo "   Tu as peut-être annulé ou entré un mauvais mot de passe"
    exit 1
fi
echo "✅ Permissions corrigées"
echo ""

echo "2️⃣ Déploiement de send-email-from-user..."
npx supabase functions deploy send-email-from-user --no-verify-jwt
if [ $? -ne 0 ]; then
    echo "❌ Erreur lors du déploiement"
    echo "   Vérifie que Supabase CLI est bien configuré"
    exit 1
fi
echo "✅ Fonction déployée avec succès"
echo ""

echo "3️⃣ Vérification..."
npx supabase functions list | grep send-email-from-user
if [ $? -eq 0 ]; then
    echo "✅ Fonction visible dans la liste"
else
    echo "⚠️ Fonction pas visible dans la liste (peut être normal)"
fi
echo ""

echo "=================================================="
echo "✅ DÉPLOIEMENT TERMINÉ !"
echo ""
echo "📧 Prochaines étapes:"
echo "1. Créer un nouveau devis"
echo "2. L'envoyer par email"
echo "3. Vérifier Messagerie → Envoyés"
echo ""
echo "Si l'email n'apparaît toujours pas:"
echo "- Vérifie les logs Supabase"
echo "- Essaie en mode incognito"
echo "=================================================="
