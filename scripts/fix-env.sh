#!/bin/bash

# Script pour ajouter VITE_SUPABASE_ANON_KEY automatiquement dans .env
# Cela résout le problème des tests qui cherchent cette variable

echo "🔧 Vérification du fichier .env..."

if [ ! -f .env ]; then
    echo "❌ Fichier .env non trouvé !"
    echo "💡 Copiez .env.template vers .env d'abord"
    exit 1
fi

# Lire la valeur de VITE_SUPABASE_PUBLISHABLE_KEY
PUBLISHABLE_KEY=$(grep "^VITE_SUPABASE_PUBLISHABLE_KEY=" .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")

if [ -z "$PUBLISHABLE_KEY" ]; then
    echo "❌ VITE_SUPABASE_PUBLISHABLE_KEY non trouvée dans .env"
    exit 1
fi

# Vérifier si VITE_SUPABASE_ANON_KEY existe déjà
if grep -q "^VITE_SUPABASE_ANON_KEY=" .env; then
    echo "✅ VITE_SUPABASE_ANON_KEY existe déjà"
else
    echo "📝 Ajout de VITE_SUPABASE_ANON_KEY..."
    echo "" >> .env
    echo "# Alias pour les tests (même valeur que PUBLISHABLE_KEY)" >> .env
    echo "VITE_SUPABASE_ANON_KEY=\"$PUBLISHABLE_KEY\"" >> .env
    echo "✅ VITE_SUPABASE_ANON_KEY ajoutée avec succès !"
fi

echo ""
echo "🎉 Fichier .env mis à jour !"
echo ""
echo "Vous pouvez maintenant exécuter :"
echo "  npm run test:multi-tenant"
