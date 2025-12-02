#!/bin/bash

# Script pour tester un token GitHub

echo "🔍 Test de Token GitHub"
echo ""

read -p "📋 Collez votre token GitHub : " TOKEN

if [ -z "$TOKEN" ]; then
  echo "❌ Token vide, annulation."
  exit 1
fi

echo ""
echo "🧪 Test de connexion..."

# Tester avec curl
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: token $TOKEN" https://api.github.com/user)

if [ "$RESPONSE" = "200" ]; then
  echo "✅ Token valide !"
  echo ""
  
  # Tester les permissions
  echo "🔍 Vérification des permissions..."
  PERMS=$(curl -s -H "Authorization: token $TOKEN" https://api.github.com/user | grep -o '"type":"[^"]*"' | head -1)
  
  echo "✅ Connexion réussie"
  echo ""
  echo "📋 Test de push..."
  echo ""
  echo "Tentative de push..."
  git push https://$TOKEN@github.com/svbkhl/btp_smart_pro.git main
  
  if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Push réussi !"
  else
    echo ""
    echo "❌ Push échoué"
    echo ""
    echo "💡 Solutions possibles :"
    echo "1. Vérifiez que le dépôt existe : https://github.com/svbkhl/btp_smart_pro"
    echo "2. Vérifiez que le token a toutes les permissions 'repo'"
    echo "3. Consultez : FIX-ERREUR-403.md"
  fi
else
  echo "❌ Token invalide ou expiré (Code HTTP: $RESPONSE)"
  echo ""
  echo "💡 Créez un nouveau token : https://github.com/settings/tokens"
  echo "   Assurez-vous de cocher toutes les permissions 'repo'"
fi

