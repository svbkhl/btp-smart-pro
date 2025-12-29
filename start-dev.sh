#!/bin/bash

# Script de démarrage automatique du serveur de développement
# Port fixe : 4000 (ne changera jamais)

cd "$(dirname "$0")"

# Tuer les processus Vite existants sur le port 4000
echo "🔄 Libération du port 4000..."
lsof -ti:4000 | xargs kill -9 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 1

# Nettoyer le cache si nécessaire
if [ "$1" == "--clean" ]; then
  echo "🧹 Nettoyage du cache..."
  rm -rf node_modules/.vite
  rm -rf dist
fi

# Démarrer le serveur
echo "🚀 Démarrage du serveur sur http://localhost:4000..."
npm run dev



















