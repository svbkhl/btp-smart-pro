#!/bin/bash

echo "🔧 Configuration des variables d'environnement"
echo ""

# Vérifier si .env existe déjà
if [ -f .env ]; then
    echo "⚠️  Le fichier .env existe déjà."
    read -p "Voulez-vous le remplacer ? (o/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[OoYy]$ ]]; then
        echo "Annulé."
        exit 1
    fi
fi

# Créer le fichier .env à partir de .env.example
if [ -f .env.example ]; then
    cp .env.example .env
    echo "✅ Fichier .env créé à partir de .env.example"
else
    # Créer un fichier .env vide
    cat > .env << 'ENVFILE'
# Variables d'environnement Supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
ENVFILE
    echo "✅ Fichier .env créé"
fi

echo ""
echo "📝 Éditez le fichier .env et ajoutez vos clés Supabase :"
echo "   1. VITE_SUPABASE_URL=votre_url_supabase"
echo "   2. VITE_SUPABASE_PUBLISHABLE_KEY=votre_clé_publique"
echo ""
echo "Pour trouver ces valeurs :"
echo "   1. Allez sur https://supabase.com"
echo "   2. Settings > API"
echo "   3. Copiez Project URL et anon public key"
echo ""
